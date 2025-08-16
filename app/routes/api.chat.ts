import { type ActionFunctionArgs } from "react-router";
import { generateGraphResponse } from "../services/ai_graph.server";
// import { generateStreamingResponse } from "../services/ai.server";

export async function action({ request }: ActionFunctionArgs) {
    // Allow POST only
    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const formData = await request.formData();
        const message = formData.get("message");

        if (!message || typeof message !== "string") {
            return new Response("Message is required", { status: 400 });
        }

        console.log(`🤖 AI Request: ${message.substring(0, 50)}...`);

        // Get the stream from our AI service (Graph-based)
        // const stream = await generateStreamingResponse(message);
        const stream = await generateGraphResponse(message);

        // Create a Web Standard ReadableStream
        const readable = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    const reader = stream.getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value) {
                            controller.enqueue(value); // Value is already strict Uint8Array from encoder in graph service?
                            // Wait, generateGraphResponse encodes it?
                            // In ai_graph.server.ts: controller.enqueue(encoder.encode(finalAnswer));
                            // So 'stream' yields Uint8Array.
                        }
                    }
                    // for await (const chunk of stream) {
                    //     if (chunk) {
                    //         controller.enqueue(encoder.encode(chunk));
                    //     }
                    // }
                    controller.close();
                } catch (err) {
                    console.error("Streaming error:", err);
                    controller.error(err);
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error) {
        console.error("AI Action Error:", error);
        return new Response(JSON.stringify({ error: "Failed to process request" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
