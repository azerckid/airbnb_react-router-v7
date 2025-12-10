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
