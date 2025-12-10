
import { StateGraph, END, START } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai"; // Import OpenAI
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { searchRooms } from "./ai.server"; // Reuse existing vector logic
import { searchFlights } from "./flight.server";
import { Document } from "@langchain/core/documents";

// 1. Define State
// We need to pass the user query and potentially the retrieved context or final answer
interface AgentState {
    query: string;
    classification?: "GREETING" | "SEARCH" | "FLIGHT";
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
Classify the following user input into one of three categories:
1. "GREETING": Simple hellos, thankyous, or general small talk that DOES NOT require looking up specific information.
2. "FLIGHT": Questions about flights, airplane tickets, airline routes, or searching for flights (e.g., "flight to Tokyo", "ticket price").
3. "SEARCH": Questions about rooms, accommodation, travel tips, amenities, or specific property recommendations.

Input: {query}

Output only the category name ("GREETING", "FLIGHT", or "SEARCH").
    `.trim();

    const prompt = ChatPromptTemplate.fromTemplate(template);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    try {
        const result = await chain.invoke({ query: state.query });
        const classification = result.trim().toUpperCase() as "GREETING" | "SEARCH" | "FLIGHT";
        console.log("🚦 Classification:", classification);
        return { classification };
    } catch (e) {
        console.error("Router failed, defaulting to SEARCH", e);
        return { classification: "SEARCH" };
    }
}

// --- Node 1.5: Flight Searcher ---
async function flightNode(state: AgentState) {
    console.log("✈️ Flight Node: Processing...");
    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        openAIApiKey: openAIKey,
        temperature: 0,
    });

    // Step 1: Extract Parameters
    const extractionTemplate = `
You are a flight search assistant. Extract the following parameters from the user query:
- origin (IATA code, e.g., ICN, JFK. If city name is given, convert to IATA. Default to ICN if implied as starting point from Korea)
- destination (IATA code)
- departureDate (YYYY-MM-DD format. If "next Monday" etc., calculate based on today: ${new Date().toISOString().split('T')[0]})

Return ONLY a JSON object:
{{
  "origin": "IATA",
  "destination": "IATA",
  "departureDate": "YYYY-MM-DD"
}}
If any information is missing and cannot be reasonably inferred, return "MISSING: <missing_field_name>" in that field.
Query: {query}
    `.trim();

    const extractionChain = ChatPromptTemplate.fromTemplate(extractionTemplate)
        .pipe(model)
        .pipe(new StringOutputParser());

    let params: any = {};
    try {
        const jsonStr = await extractionChain.invoke({ query: state.query });
        // Clean markdown code blocks if present
        const cleanJson = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
        params = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Flight param extraction failed", e);
        return { answer: "Sorry, I couldn't understand the flight details. Please provide origin, destination, and date." };
    }

    if (params.origin?.startsWith("MISSING") || params.destination?.startsWith("MISSING") || params.departureDate?.startsWith("MISSING")) {
        return { answer: `I need a bit more info to find flights. Please specify: ${[params.origin, params.destination, params.departureDate].filter(p => p?.startsWith("MISSING")).map(p => p.split(": ")[1]).join(", ")}.` };
    }

    // Step 2: Search Flights
    const flightResults = await searchFlights(params.origin, params.destination, params.departureDate);

    // Step 3: Generate Response
    if (typeof flightResults === "string") {
        return { answer: flightResults, logs: [`✈️ Search result: ${flightResults}`] };
    }

    const context = JSON.stringify(flightResults, null, 2);
    const responseTemplate = `
You are a travel agent. Here are the flight offers found:
{context}

User Query: {query}

Summarize these flights for the user. Mention airline, price, and duration.
    `.trim();

    const responseChain = ChatPromptTemplate.fromTemplate(responseTemplate)
        .pipe(model)
        .pipe(new StringOutputParser());

    const answer = await responseChain.invoke({ context, query: state.query });

    return {
        answer,
        logs: [`✈️ Found ${flightResults.length} flights from ${params.origin} to ${params.destination}.`]
    };
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
    .addNode("flight", flightNode as any)
    .addEdge(START, "router")
    .addConditionalEdges(
        "router",
        (state: any) => {
            if (state.classification === "FLIGHT") return "flight";
            return state.classification === "GREETING" ? "greeter" : "searcher";
        }
    )
    .addEdge("greeter", END)
    .addEdge("searcher", END)
    .addEdge("flight", END);

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
                            } else if (stateUpdate.classification === "FLIGHT") {
                                sendLog("✈️ Flight Agent: Extracting details & Searching Amadeus...");
                            }
                        }
                    } else if (nodeName === "searcher") {
                        if (stateUpdate.logs && Array.isArray(stateUpdate.logs)) {
                            stateUpdate.logs.forEach(log => sendLog(log));
                        }
                        sendLog("📝 Generating detailed response...");
                    } else if (nodeName === "flight") {
                        if (stateUpdate.logs && Array.isArray(stateUpdate.logs)) {
                            stateUpdate.logs.forEach(log => sendLog(log));
                        }
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
