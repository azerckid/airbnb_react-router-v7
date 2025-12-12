import { type LoaderFunctionArgs } from "react-router";
import { getUser } from "~/services/auth.server";
import { prisma } from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await getUser(request);
    if (!user) {
        return Response.json({ conversations: [] });
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get("id");

    if (conversationId) {
        // Fetch specific conversation messages
        const conversation = await prisma.aiConversation.findFirst({
            where: { id: conversationId, userId: user.id },
            include: { messages: { orderBy: { createdAt: "asc" } } }
        });

        if (!conversation) {
            return Response.json({ error: "Conversation not found" }, { status: 404 });
        }

        return Response.json({ conversation });
    } else {
        // Fetch list of conversations
        const conversations = await prisma.aiConversation.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: "desc" },
            take: 50,
            select: {
                id: true,
                title: true,
                updatedAt: true
            }
        });

        return Response.json({ conversations });
    }
}

export async function action({ request }: LoaderFunctionArgs) {
    const user = await getUser(request);
    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "DELETE") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const formData = await request.formData();
    const conversationId = formData.get("conversationId") as string;

    if (!conversationId) {
        return Response.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    try {
        await prisma.aiConversation.delete({
            where: { id: conversationId, userId: user.id }
        });
        return Response.json({ success: true });
    } catch (error) {
        console.error("Failed to delete conversation", error);
        return Response.json({ error: "Failed to delete conversation" }, { status: 500 });
    }
}
