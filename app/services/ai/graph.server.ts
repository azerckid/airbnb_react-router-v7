import { StateGraph, END, START } from "@langchain/langgraph";
import { type AgentState, routerNode, greeterNode, searcherNode, flightNode, emergencyNode, budgetNode, autoRecommendationNode } from "./nodes";

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
    .addNode("autoPlan", autoRecommendationNode as any)
    .addEdge(START, "router")
    .addConditionalEdges(
        "router",
        (state: any) => {
            switch (state.classification) {
                case "EMERGENCY": return "emergency";
                case "BUDGET": return "budget";
                case "AUTO_PLAN": return "autoPlan";
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
    .addEdge("budget", END)
    .addEdge("autoPlan", END);

export const graph = workflow.compile();

// Streaming Wrapper
export async function generateGraphResponse(query: string, ip: string = "127.0.0.1") {
    const stream = await graph.streamEvents({ query, ip }, { version: "v2" });

    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendLog = (msg: string) => controller.enqueue(encoder.encode(`__LOG__ ${msg}\n`));

            try {
                sendLog("🚦 Router: Classifying intent...");

                for await (const event of stream) {
                    // 1. Handle LLM Token Streaming
                    if (event.event === "on_chat_model_stream") {
                        const chunk = event.data.chunk;
                        if (chunk && chunk.content) {
                            controller.enqueue(encoder.encode(chunk.content));
                        }
                    }

                    // 2. Handle Node State Updates (Logs)
                    // When a node finishes, it typically emits 'on_chain_end' with the output state.
                    // We check for specific nodes.
                    if (event.event === "on_chain_end" && event.metadata && event.metadata.langgraph_node) {
                        const nodeName = event.metadata.langgraph_node;
                        const output = event.data.output;

                        if (["searcher", "flight", "emergency", "budget", "autoPlan"].includes(nodeName)) {
                            // Logic to extract NEW logs?
                            // State updates might be cumulative or partial.
                            // Simplified: If output has 'logs', strictly strictly speaking we might reprint logs if we aren't careful.
                            // But 'output' of the node function usually contains the *delta* or the *full return value* depending on implementation.
                            // In nodes.ts, we return { logs: [...] }.
                            // We should check if these logs have been sent?
                            // Since we don't track history here easily, we might reprint. 
                            // BUT, for now, let's just send them.
                            if (output && output.logs && Array.isArray(output.logs)) {
                                output.logs.forEach((log: string) => sendLog(log));
                            }
                        }

                        if (nodeName === "router" && output && output.classification) {
                            sendLog(`🚦 Classification: ${output.classification}`);
                        }
                    }
                }

                controller.close();
            } catch (err) {
                console.error("Graph error:", err);
                controller.error(err);
            }
        }
    });
}
