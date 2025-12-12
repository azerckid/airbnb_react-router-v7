import { prisma } from "../../../db.server";

export interface RoomSearchParams {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
}

export interface RoomListing {
    id: string;
    title: string;
    price: number;
    city: string;
    category?: string;
    images?: string[];
}

export async function searchStructuredRooms(params: RoomSearchParams): Promise<RoomListing[]> {
    console.log("🏙️ Structured Search:", params);

    const { location, minPrice, maxPrice, limit = 5 } = params;

    const where: any = {};

    // 1. Location Filter (Fuzzy)
    if (location) {
        where.OR = [
            { city: { contains: location } }, // SQLite is case-insensitive by default roughly, but Prisma specific
            { country: { contains: location } },
            // If address field exists, add it here
        ];
    }

    // 2. Price Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    try {
        const rooms = await prisma.room.findMany({
            where,
            take: limit,
            select: {
                id: true,
                title: true,
                price: true,
                city: true,
                country: true,
                category: {
                    select: { name: true }
                },
                // We might want images later
            },
            orderBy: {
                price: 'asc' // Default to cheapest for budget planning
            }
        });

        return rooms.map(r => ({
            id: r.id,
            title: r.title,
            price: r.price,
            city: r.city || "Unknown City",
            category: r.category?.name
        }));

    } catch (e) {
        console.error("❌ Structured Search Failed:", e);
        return [];
    }
}
