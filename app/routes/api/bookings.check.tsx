// import type { Route } from "./+types/api.bookings.check";
import type { ActionFunctionArgs } from "react-router";

import { prisma } from "~/db.server";

export async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const roomId = formData.get("roomId") as string;
    const checkInDate = formData.get("checkIn") as string;
    const checkOutDate = formData.get("checkOut") as string;

    if (!roomId || !checkInDate || !checkOutDate) {
        return { error: "Missing required fields" };
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Check for overlapping bookings
    const existingBooking = await prisma.booking.findFirst({
        where: {
            roomId,
            OR: [
                {
                    checkIn: { lte: checkIn },
                    checkOut: { gte: checkIn }
                },
                {
                    checkIn: { lte: checkOut },
                    checkOut: { gte: checkOut }
                },
                {
                    checkIn: { gte: checkIn },
                    checkOut: { lte: checkOut }
                }
            ]
        }
    });

    if (existingBooking) {
        return { ok: false, message: "Dates are already booked" };
    }

    return { ok: true, message: "Dates are available" };
}
