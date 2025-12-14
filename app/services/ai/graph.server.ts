
import { StateGraph, END, START } from "@langchain/langgraph";
import { type AgentState, routerNode, greeterNode, searcherNode, flightNode, emergencyNode, budgetNode, initAutoPlanNode, batchAutoPlanNode, finalizeAutoPlanNode } from "./nodes";

// Build Graph
const workflow = new StateGraph<any>({
    channels: {
        query: { reducer: (x: string, y: string) => y ?? x },
        ip: { reducer: (x: string, y: string) => y ?? x },
        classification: { reducer: (x: any, y: any) => y ?? x },
        context: { reducer: (x: any, y: any) => y ?? x },
        answer: { reducer: (x: any, y: any) => y ?? x },
        logs: { reducer: (x: string[], y: string[]) => y ?? x },
        params: { reducer: (x: any, y: any) => y ?? x },
        foundFlights: { reducer: (x: any, y: any) => y ?? x },
        foundRooms: { reducer: (x: any, y: any) => y ?? x },
        // New State Fields
        combinations: { reducer: (x: any, y: any) => y ?? x },
        batchIndex: { reducer: (x: any, y: any) => y ?? x },
        searchResults: { reducer: (x: any, y: any) => y ?? x },
    }
})
    .addNode("router", routerNode as any)
    .addNode("greeter", greeterNode as any)
    .addNode("searcher", searcherNode as any)
    .addNode("flight", flightNode as any)
    .addNode("emergency", emergencyNode as any)
    .addNode("budget", budgetNode as any)
    // New Nodes
    .addNode("initAuto", initAutoPlanNode as any)
    .addNode("batchAuto", batchAutoPlanNode as any)
    .addNode("finalizeAuto", finalizeAutoPlanNode as any)

    .addEdge(START, "router")
    .addConditionalEdges(
        "router",
        (state: any) => {
            switch (state.classification) {
                case "EMERGENCY": return "emergency";
                case "BUDGET": return "budget";
                case "AUTO_PLAN": return "initAuto"; // Route to Init
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
    // Auto Plan Workflow
    .addEdge("initAuto", "batchAuto")
    .addConditionalEdges(
        "batchAuto",
        (state: AgentState) => {
            const total = state.combinations?.length || 0;
            const current = state.batchIndex || 0;
            // If we have processed less than total, loop back
            if (current < total) {
                return "batchAuto";
            }
            return "finalizeAuto";
        }
    )
    .addEdge("finalizeAuto", END);

export const graph = workflow.compile();

// Streaming Wrapper
export async function generateGraphResponse(query: string, ip: string = "127.0.0.1") {
    const stream = await graph.streamEvents(
        { query, ip },
        {
            version: "v2",
            recursionLimit: 150 // Increase limit for batch processing
        }
    );

    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendLog = (msg: string) => controller.enqueue(encoder.encode(`__LOG__ ${msg}\n`));

            try {
                sendLog("🚦 Router: Classifying intent...");

                // let sentLogCount = 0; // Removed unused variable

                for await (const event of stream) {
                    // Debug Log
                    // console.log("Event:", event.event, event.metadata?.langgraph_node, event.data?.output ? "Has Output" : "No Output");

                    // 1. Handle LLM Token Streaming
                    if (event.event === "on_chat_model_stream") {
                        // Do NOT stream tokens from the 'router' node (it outputs internal classification like "AUTO_PLAN")
                        if (event.metadata?.langgraph_node === "router") {
                            continue;
                        }

                        const chunk = event.data.chunk;
                        if (chunk && chunk.content) {
                            controller.enqueue(encoder.encode(chunk.content));
                        }
                    }

                    // 2. Handle Node State Updates (Logs)
                    if (event.event === "on_chain_end" && event.metadata && event.metadata.langgraph_node) {
                        const nodeName = event.metadata.langgraph_node;
                        const output = event.data.output;

                        if (["searcher", "flight", "emergency", "budget", "initAuto", "batchAuto", "finalizeAuto"].includes(nodeName)) {
                            if (output && output.logs && Array.isArray(output.logs)) {
                                console.log(`[Graph] Node ${nodeName} emitted ${output.logs.length} logs.`); // Debug
                                output.logs.forEach((log: string) => sendLog(log));
                            }
                        }

                        if (nodeName === "router" && output && output.classification) {
                            sendLog(`🚦 Classification: ${output.classification}`);
                        }

                        // 3. Handle Map Data (from finalizeAuto)
                        if (nodeName === "finalizeAuto" && output && output.mapData) {
                            const mapPayload = JSON.stringify(output.mapData);
                            controller.enqueue(encoder.encode(`\n__MAP__ ${mapPayload}\n`));
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
