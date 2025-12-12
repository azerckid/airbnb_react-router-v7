import { StateGraph, END, START } from "@langchain/langgraph";
import { type AgentState, routerNode, greeterNode, searcherNode, flightNode, emergencyNode, budgetNode } from "./nodes";

// Build Graph
const workflow = new StateGraph<any>({
    channels: {
        query: { reducer: (x: string, y: string) => y ?? x },
        ip: { reducer: (x: string, y: string) => y ?? x },
        classification: { reducer: (x: any, y: any) => y ?? x },
        context: { reducer: (x: any, y: any) => y ?? x },
        answer: { reducer: (x: any, y: any) => y ?? x },
        logs: { reducer: (x: string[], y: string[]) => y ? [...(x || []), ...y] : x },
        params: { reducer: (x: any, y: any) => y ?? x },
        foundFlights: { reducer: (x: any, y: any) => y ?? x },
        foundRooms: { reducer: (x: any, y: any) => y ?? x },
    }
})
    .addNode("router", routerNode as any)
    .addNode("greeter", greeterNode as any)
    .addNode("searcher", searcherNode as any)
    .addNode("flight", flightNode as any)
    .addNode("emergency", emergencyNode as any)
    .addNode("budget", budgetNode as any)
    .addEdge(START, "router")
    .addConditionalEdges(
        "router",
        (state: any) => {
            switch (state.classification) {
                case "EMERGENCY": return "emergency";
                case "BUDGET": return "budget";
                case "FLIGHT": return "flight";
                case "GREETING": return "greeter";
                default: return "searcher";
            }
        }
    )
    .addEdge("greeter", END)
    .addEdge("searcher", END)
    .addEdge("flight", END)
    .addEdge("emergency", END)
    .addEdge("budget", END);

export const graph = workflow.compile();

// Streaming Wrapper
export async function generateGraphResponse(query: string, ip: string = "127.0.0.1") {
    const stream = await graph.stream({ query, ip });

    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendLog = (msg: string) => controller.enqueue(encoder.encode(`__LOG__ ${msg}\n`));

            try {
                sendLog("🚦 Router: Classifying intent...");

                let finalAnswer = "";

                for await (const chunk of stream) {
                    const nodeName = Object.keys(chunk)[0];
                    // safe casting
                    const stateUpdate = (chunk as any)[nodeName] as Partial<AgentState>;

                    // Debug Log
                    // console.log(`Node ${nodeName} finished`, stateUpdate);

                    if (nodeName === "router") {
                        if (stateUpdate.classification) {
                            sendLog(`🚦 Classification: ${stateUpdate.classification}`);
                            // Specific logs based on intent
                            if (stateUpdate.classification === "EMERGENCY") sendLog("🚨 Activating Emergency Flight Protocol...");
                            else if (stateUpdate.classification === "BUDGET") sendLog("💰 Activating Budget Planner...");
                            else if (stateUpdate.classification === "SEARCH") sendLog("🔍 Searcher: Looking up rooms...");
                            else if (stateUpdate.classification === "FLIGHT") sendLog("✈️ Flight Agent: Extracting details...");
                        }
                    } else if (["searcher", "flight", "emergency", "budget"].includes(nodeName)) {
                        if (stateUpdate.logs && Array.isArray(stateUpdate.logs)) {
                            stateUpdate.logs.forEach(log => sendLog(log));
                        }
                        if (nodeName === "budget") sendLog("📝 Compiling Budget Itinerary...");
                        if (nodeName === "emergency") sendLog("📝 Listing Immediate Departures...");
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
