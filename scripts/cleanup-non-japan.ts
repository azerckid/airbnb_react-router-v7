import { prisma } from "../app/db.server";

async function cleanDatabase() {
    console.log("🧹 Starting database cleanup...");

    try {
        // 1. Delete Rooms not in Japan
        const deletedRooms = await prisma.room.deleteMany({
            where: {
                country: {
                    not: "Japan",
                },
            },
        });
        console.log(`✅ Deleted ${deletedRooms.count} rooms (Non-Japan).`);

        // 2. Delete Experiences not in Japan
        const deletedExperiences = await prisma.experience.deleteMany({
            where: {
                country: {
                    not: "Japan",
                },
            },
        });
        console.log(`✅ Deleted ${deletedExperiences.count} experiences (Non-Japan).`);

        console.log("🎉 Cleanup completed successfully.");
    } catch (error) {
        console.error("❌ Cleanup failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase();
