
import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { searchRooms } from "./ai.server"; // Reuse existing vector logic
import { Document } from "@langchain/core/documents";

// 1. Define State
// We need to pass the user query and potentially the retrieved context or final answer
interface AgentState {
    query: string;
    classification?: "GREETING" | "SEARCH";
    context?: string;
    answer?: string;
}

const apiKey = process.env.GOOGLE_API_KEY;

// 2. Define Nodes

// --- Node 1: Router (Supervisor) ---
// Decides if the user's input demands a DB search or just a chat.
async function routerNode(state: AgentState) {
    console.log("🚦 Router: Classifying intent...", state.query);
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey,
        temperature: 0, // Deterministic
    });

    const template = `
Classify the following user input into one of two categories:
1. "GREETING": Simple hellos, thankyous, or general small talk that DOES NOT require looking up specific room/travel information.
2. "SEARCH": Questions about rooms, travel, prices, locations, amenities, or specific recommendations.

Input: {query}

Output only the category name ("GREETING" or "SEARCH").
    `.trim();

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    try {
        const result = await chain.invoke({ query: state.query });
        const classification = result.trim().toUpperCase() as "GREETING" | "SEARCH";
        console.log("🚦 Classification:", classification);
        return { classification };
    } catch (e) {
        console.error("Router failed, defaulting to SEARCH", e);
        return { classification: "SEARCH" };
    }
}

// --- Node 2: Greeter (Fast Chat) ---
// Responds to simple greetings without any embedding/DB operations.
async function greeterNode(state: AgentState) {
    console.log("👋 Greeter: Responding directly...");
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey,
    });

    const template = `
You are a helpful Airbnb Concierge. 
The user said: "{query}"
Reply warmly and briefly. Offer to help them find a place to stay.
    `.trim();

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    // We return a stream for the main UI but here we just get text for the graph state.
    // Ideally, for streaming, the graph is a bit more complex, but let's stick to generating 
    // a readable stream wrapper at the end.
    // WAIT: The existing UI expects a stream. LangGraph .stream() returns chunks of state.
    // We need to return an AsyncGenerator that yields text tokens.
    // For now, let's just generate the full text and stream it out artificially 
    // to match the expected interface, OR correct the interface to use LangGraph's streaming.
    // To minimize UI breakage, I'll generate text and stream it.

    const response = await chain.invoke({ query: state.query });
    return { answer: response };
}

// --- Node 3: Searcher (RAG) ---
// Performs the embedding search and generates a detailed answer.
async function searcherNode(state: AgentState) {
    console.log("🔍 Searcher: Looking up rooms...");

    // 1. Search (Reuse existing logic)
    let context = "";
    try {
        const docs = await searchRooms(state.query);
        context = docs.map((d: Document) => d.pageContent).join("\n\n");
    } catch (e) {
        console.error("Search failed (Rate Limit?):", e);
        context = "System: Unable to retrieve listings due to high traffic using rate-limited API.";
    }

    // 2. Generate Answer
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey,
    });

    const template = `
You are an expert Airbnb Concierge.
Context (Listings):
{context}

User Question: {query}

Recommend specific rooms from the context. If no context, apologize and ask them to try again later.
    `.trim();

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    const response = await chain.invoke({ context, query: state.query });
    return { answer: response };
}


// 3. Build Graph
const workflow = new StateGraph<AgentState>({
    channels: {
        query: { reducer: (x: string, y: string) => y ?? x },
        classification: { reducer: (x: any, y: any) => y ?? x },
        context: { reducer: (x: any, y: any) => y ?? x },
        answer: { reducer: (x: any, y: any) => y ?? x },
    }
})
    .addNode("router", routerNode)
    .addNode("greeter", greeterNode)
    .addNode("searcher", searcherNode)
    .addEdge(START, "router")
    .addConditionalEdges(
        "router",
        (state) => state.classification === "GREETING" ? "greeter" : "searcher"
    )
    .addEdge("greeter", END)
    .addEdge("searcher", END);

export const graph = workflow.compile();

// 4. Export Streaming Wrapper
// This function mimics the signature of 'generateStreamingResponse' in ai.server.ts
export async function generateGraphResponse(query: string) {
    const stream = await graph.stream({ query });

    // LangGraph stream yields { nodeName: { stateUpdate... } }
    // We need to parse this and yield specific text chunks for the UI.
    // However, the current graph implementation invokes the model fully in the node.
    // So 'stream' here is streaming the *State updates*, not the token stream.
    // This will feel "blocking" until the node finishes.
    // To make it truly streaming, the nodes should return streams, but that's complex to pass through state.
    // 
    // Optimization: Since "Greeting" is fast, blocking is fine.
    // Since "Searcher" is slow (due to search), blocking on search is inevitable, 
    // but blocking on generation is sad.
    // 
    // Workaround for prototype:
    // Process the graph. Get the final 'answer' from the state. 
    // Then create a fake stream that yields the answer.
    // To the user, it will look like "Thinking..." then "Answer".

    // Create a ReadableStream that does the graph work
    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            try {
                // Run the graph to completion (conceptually) or stream updates
                let finalAnswer = "";

                for await (const chunk of stream) {
                    // chunk is { nodeName: { ... } }
                    // Iterate over values directly to avoid string indexing issues
                    const stateUpdates = Object.values(chunk);
                    for (const stateUpdate of stateUpdates) {
                        // Cast stateUpdate to AgentState (or partial)
                        const update = stateUpdate as Partial<AgentState>;
                        if (update.answer) {
                            finalAnswer = update.answer;
                        }
                    }
                }

                controller.enqueue(encoder.encode(finalAnswer));
                controller.close();
            } catch (err) {
                console.error("Graph error:", err);
                controller.error(err);
            }
        }
    });
}
