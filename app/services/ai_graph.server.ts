
import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai"; // Import OpenAI
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
    logs?: string[]; // Add logs array to state
}

const apiKey = process.env.GOOGLE_API_KEY;
const openAIKey = process.env.OPENAI_API_KEY; // Get OpenAI Key

// 2. Define Nodes

// --- Node 1: Router (Supervisor) ---
// Decides if the user's input demands a DB search or just a chat.
async function routerNode(state: AgentState) {
    console.log("🚦 Router: Classifying intent...", state.query);

    // Gemini (Commented out)
    /*
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey,
        temperature: 0, // Deterministic
    });
    */

    // OpenAI
    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini", // Use fast model for routing
        openAIApiKey: openAIKey,
        temperature: 0,
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

    // Gemini (Commented out)
    /*
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey,
    });
    */

    // OpenAI
    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        openAIApiKey: openAIKey,
        temperature: 0.7,
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

    // 1. Search (Smart Failover)
    let context = "";
    let extraLogs: string[] = [];

    try {
        console.log("🔍 Searcher: Trying Gemini Search (Free)...");

        // 3-second timeout promise
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout (3000ms)")), 3000)
        );

        // Race actual search against timeout
        const docs = await Promise.race([
            searchRooms(state.query, 4, 'gemini'),
            timeout
        ]) as Document[];

        context = docs.map((d: Document) => d.pageContent).join("\n\n");
    } catch (e: any) {
        console.warn(`⚠️ Gemini Search failed (${e.message || "Unknown"}), switching to OpenAI Search...`);
        extraLogs.push(`⚠️ Gemini Search failed (${e.message}), switching to OpenAI...`);

        try {
            const docs = await searchRooms(state.query, 4, 'openai');
            context = docs.map((d: Document) => d.pageContent).join("\n\n");
            extraLogs.push("✅ OpenAI Search successful.");
        } catch (e2) {
            console.error("❌ OpenAI Search also failed:", e2);
            context = "System: Unable to retrieve listings due to high traffic.";
            extraLogs.push("❌ OpenAI Search also failed.");
        }
    }

    // Add log to state
    // Add log to state
    // const provider = context.includes("System:") ? "failed" : "success"; 
    // return { context, logs: [`🔍 Searcher: Context retrieved (${context.length} chars).`, ...extraLogs] };

    // 2. Generate Answer
    // OpenAI (Using gpt-4o-mini for reliable and fast response)
    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        openAIApiKey: openAIKey,
        temperature: 0.7,
    });

    const template = `
You are an expert Airbnb Concierge.
Context (Listings):
{context}

User Question: {query}

Recommend specific rooms from the context. If no context, apologize and ask them to try again later.
Use clean Markdown.
    `.trim();

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    const response = await chain.invoke({ context, query: state.query });

    return {
        answer: response,
        context,
        logs: [`🔍 Searcher: Context retrieved (${context.length} chars).`, ...extraLogs]
    };

}


// 3. Build Graph
// 3. Build Graph
const workflow = new StateGraph<any>({
    channels: {
        query: { reducer: (x: string, y: string) => y ?? x },
        classification: { reducer: (x: any, y: any) => y ?? x },
        context: { reducer: (x: any, y: any) => y ?? x },
        answer: { reducer: (x: any, y: any) => y ?? x },
        logs: { reducer: (x: string[], y: string[]) => y ? [...(x || []), ...y] : x },
    }
})
    .addNode("router", routerNode as any)
    .addNode("greeter", greeterNode as any)
    .addNode("searcher", searcherNode as any)
    .addEdge(START, "router")
    .addConditionalEdges(
        "router",
        (state: any) => state.classification === "GREETING" ? "greeter" : "searcher"
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
            const sendLog = (msg: string) => controller.enqueue(encoder.encode(`__LOG__ ${msg}\n`));

            try {
                // Initial log
                sendLog("🚦 Router: Classifying intent...");

                let finalAnswer = "";

                for await (const chunk of stream) {
                    // chunk is { nodeName: { ... } }
                    const nodeName = Object.keys(chunk)[0];
                    const stateUpdate = (chunk as any)[nodeName] as Partial<AgentState>;

                    if (nodeName === "router") {
                        if (stateUpdate.classification) {
                            sendLog(`🚦 Classification: ${stateUpdate.classification}`);
                            if (stateUpdate.classification === "SEARCH") {
                                sendLog("🔍 Searcher: Looking up rooms...");
                            }
                        }
                    } else if (nodeName === "searcher") {
                        if (stateUpdate.logs) {
                            // Internal search logs could be passed here if we refined the node to return them incrementally
                            // For now, we just simulate the "Trying..." messages based on node execution
                            // actually, searcherNode is atomic, so we get the result after it's done.
                            // So we might want to emit logs *before* invoking graph? No, we can't.
                            // We can only react to node completions.
                            // But the user request specifically asked for "Trying Gemini..." etc.
                            // To do that *accurately* we'd need the node to stream updates or use a callback.
                            // For this prototype, passing logs in state is a good middle ground.
                            if (Array.isArray(stateUpdate.logs)) {
                                stateUpdate.logs.forEach(log => sendLog(log));
                            }
                        }
                        sendLog("📝 Generating detailed response...");
                    }

                    if (stateUpdate.answer) {
                        finalAnswer = stateUpdate.answer;
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
