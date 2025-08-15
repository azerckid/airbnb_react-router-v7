import type { Route } from "./+types/api.wishlist";
import { data } from "react-router";
import { prisma } from "~/db.server";
import { requireUser } from "~/services/auth.server";

export async function action({ request }: Route.ActionArgs) {
    const user = await requireUser(request);
    const formData = await request.formData();
    const roomId = formData.get("roomId");
    const intent = formData.get("intent"); // "toggle"

    if (typeof roomId !== "string") {
        return data({ error: "Invalid Room ID" }, { status: 400 });
    }

    // 1. Find or Create "Favorites" Wishlist
    let wishlist = await prisma.wishlist.findFirst({
        where: {
            userId: user.id,
            name: "Favorites" // Default list
        },
        include: {
            rooms: {
                where: { id: roomId } // Check if this room is already inside
            }
        }
    });

    if (!wishlist) {
        wishlist = await prisma.wishlist.create({
            data: {
                name: "Favorites",
                userId: user.id,
            },
            include: {
                rooms: { where: { id: roomId } }
            }
        });
    }

    // 2. Check if room is in wishlist
    const isLiked = wishlist.rooms.length > 0;

    // 3. Toggle
    if (isLiked) {
        // Remove
        await prisma.wishlist.update({
            where: { id: wishlist.id },
            data: {
                rooms: {
                    disconnect: { id: roomId }
                }
            }
        });
        return data({ liked: false });
    } else {
        // Add
        await prisma.wishlist.update({
            where: { id: wishlist.id },
            data: {
                rooms: {
                    connect: { id: roomId }
                }
            }
        });
        return data({ liked: true });
    }
}
