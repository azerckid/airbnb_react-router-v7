
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import { searchRooms } from "./core.server";
import { searchFlights } from "./tools/flight.server";

// 1. Define State
export interface AgentState {
    query: string;
    classification?: "GREETING" | "SEARCH" | "FLIGHT";
    context?: string;
    answer?: string;
    logs?: string[];
}

const openAIKey = process.env.OPENAI_API_KEY;

// --- Node 1: Router (Supervisor) ---
export async function routerNode(state: AgentState) {
    console.log("🚦 Router: Classifying intent...", state.query);

    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
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

// --- Node 2: Flight Searcher ---
export async function flightNode(state: AgentState) {
    console.log("✈️ Flight Node: Processing...");
    const model = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        openAIApiKey: openAIKey,
        temperature: 0,
    });

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
        const cleanJson = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
        params = JSON.parse(cleanJson);
    } catch (e) {
        console.error("Flight param extraction failed", e);
        return { answer: "Sorry, I couldn't understand the flight details. Please provide origin, destination, and date." };
    }

    if (params.origin?.startsWith("MISSING") || params.destination?.startsWith("MISSING") || params.departureDate?.startsWith("MISSING")) {
        return { answer: `I need a bit more info to find flights. Please specify: ${[params.origin, params.destination, params.departureDate].filter((p: string) => p?.startsWith("MISSING")).map((p: string) => p.split(": ")[1]).join(", ")}.` };
    }

    const flightResults = await searchFlights(params.origin, params.destination, params.departureDate);

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

// --- Node 3: Greeter (Fast Chat) ---
export async function greeterNode(state: AgentState) {
    console.log("👋 Greeter: Responding directly...");
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

    const response = await chain.invoke({ query: state.query });
    return { answer: response };
}

// --- Node 4: Searcher (RAG) ---
export async function searcherNode(state: AgentState) {
    console.log("🔍 Searcher: Looking up rooms...");

    let context = "";
    let extraLogs: string[] = [];

    try {
        console.log("🔍 Searcher: Trying Gemini Search (Free)...");
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout (3000ms)")), 3000)
        );

        const docs = await Promise.race([
            searchRooms(state.query, 4, 'gemini'),
            timeout
        ]) as Document[];

        context = docs.map((d: Document) => d.pageContent).join("\n\n");
    } catch (e: any) {
        console.warn(`⚠️ Gemini Search failed, switching to OpenAI Search...`);
        extraLogs.push(`⚠️ Gemini Search failed, switching to OpenAI...`);

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
