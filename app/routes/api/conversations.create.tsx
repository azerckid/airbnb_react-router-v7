import type { Route } from "./+types/conversations.create";
import { redirect } from "react-router";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    const formData = await request.formData();
    const recipientId = formData.get("recipientId") as string;

    if (!recipientId) return redirect("/messages");

    // Check for existing conversation with these exact two users
    // Complex query: find conversation where users includes user.id AND users includes recipientId
    // Prisma doesn't support easy "contains exactly these two" for many-to-many easily in one go without raw query or filtering in app
    // Hack: find conversations for user, then filter in memory (efficient enough for small scale)

    const existingConversations = await prisma.conversation.findMany({
        where: {
            users: {
                some: { id: user.id }
            }
        },
        include: {
            users: true
        }
    });

    const match = existingConversations.find(c =>
        c.users.length === 2 && c.users.some(u => u.id === recipientId)
    );

    if (match) {
        return redirect(`/messages/${match.id}`);
    }

    // Create new
    const newConversation = await prisma.conversation.create({
        data: {
            users: {
                connect: [
                    { id: user.id },
                    { id: recipientId }
                ]
            }
        }
    });

    return redirect(`/messages/${newConversation.id}`);
}
