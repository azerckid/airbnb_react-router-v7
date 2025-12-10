
import { StateGraph, END, START } from "@langchain/langgraph";
import { type AgentState, routerNode, greeterNode, searcherNode, flightNode } from "./nodes";

// Build Graph
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

// Streaming Wrapper
export async function generateGraphResponse(query: string) {
    const stream = await graph.stream({ query });

    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendLog = (msg: string) => controller.enqueue(encoder.encode(`__LOG__ ${msg}\n`));

            try {
                sendLog("🚦 Router: Classifying intent...");

                let finalAnswer = "";

                for await (const chunk of stream) {
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
