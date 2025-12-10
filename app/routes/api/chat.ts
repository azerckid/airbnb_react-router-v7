import { type ActionFunctionArgs } from "react-router";
import { generateGraphResponse } from "../../services/ai/graph.server";
import { getUser } from "~/services/auth.server";
import { prisma } from "~/db.server";

export async function action({ request }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const user = await getUser(request);
        const formData = await request.formData();
        const message = formData.get("message");
        const conversationId = formData.get("conversationId")?.toString();

        if (!message || typeof message !== "string") {
            return new Response("Message is required", { status: 400 });
        }

        let targetConversationId = conversationId;

        // DB Persistence: User Message
        if (user) {
            try {
                if (!targetConversationId) {
                    const newConv = await prisma.aiConversation.create({
                        data: {
                            userId: user.id,
                            title: message.slice(0, 40) + (message.length > 40 ? "..." : ""),
                            messages: {
                                create: { role: "user", content: message }
                            }
                        }
                    });
                    targetConversationId = newConv.id;
                } else {
                    // Verify ownership? Assuming ID is UUID/CUID, collision unlikely, but good practice.
                    const exists = await prisma.aiConversation.findFirst({
                        where: { id: targetConversationId, userId: user.id }
                    });

                    if (exists) {
                        await prisma.aiMessage.create({
                            data: {
                                aiConversationId: targetConversationId,
                                role: "user",
                                content: message
                            }
                        });
                    } else {
                        // Fallback to new chat if ID invalid/not owned
                        const newConv = await prisma.aiConversation.create({
                            data: {
                                userId: user.id,
                                title: message.slice(0, 40) + "...",
                                messages: { create: { role: "user", content: message } }
                            }
                        });
                        targetConversationId = newConv.id;
                    }
                }
            } catch (dbError) {
                console.error("Database persistence failed:", dbError);
            }
        }

        console.log(`🤖 AI Request: ${message.substring(0, 50)}...`);

        const stream = await generateGraphResponse(message);

        const readable = new ReadableStream({
            async start(controller) {
                const chunks: Uint8Array[] = [];

                try {
                    const reader = stream.getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (value) {
                            chunks.push(value);
                            controller.enqueue(value);
                        }
                    }
                    controller.close();

                    // DB Persistence: AI Response
                    if (user && targetConversationId) {
                        // Combine chunks
                        const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
                        const fullBuffer = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const chunk of chunks) {
                            fullBuffer.set(chunk, offset);
                            offset += chunk.length;
                        }

                        const fullText = new TextDecoder().decode(fullBuffer);

                        // Parse out logs if needed, but saving everything is fine or filtering.
                        // Let's filter __LOG__ for the DB content to keep it clean for history display?
                        // Or keep them for debugging? 
                        // User wants "Chat History like Gemini". Usually that means just the clean text.
                        const cleanContent = fullText
                            .split("\n")
                            .filter(line => !line.trim().startsWith("__LOG__"))
                            .join("\n")
                            .trim();

                        if (cleanContent) {
                            await prisma.aiMessage.create({
                                data: {
                                    aiConversationId: targetConversationId,
                                    role: "assistant", // Using 'assistant' to match typical LLM role names
                                    content: cleanContent
                                }
                            });
                        }
                    }

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
                "X-Conversation-Id": targetConversationId || "",
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
