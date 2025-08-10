import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
// We can't import bcryptjs yet because we might not have installed it fully or types issue? 
// No, I uninstalled it from frontend but installed it here? Wait.
// Let me check package.json for "bcryptjs".
// Actually I better use a simple hash or just plain text for now if bcrypt is not available, 
// BUT better to install bcryptjs.

// const db = new Database("dev.db"); // Not needed
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
    // 1. Clean up
    // await prisma.booking.deleteMany();
    // await prisma.review.deleteMany();
    // await prisma.room.deleteMany();
    // await prisma.category.deleteMany();
    // await prisma.user.deleteMany();

    // 2. Categories
    const categories = [
        { name: "Beachfront", icon: "FaUmbrellaBeach", description: "Right by the beach" },
        { name: "Cabins", icon: "GiWoodCabin", description: "Cozy wood cabins" },
        { name: "Trending", icon: "FaFire", description: "Highly rated places" },
        { name: "City", icon: "FaCity", description: "Urban apartments" },
        { name: "Countryside", icon: "FaMountain", description: "Peaceful countryside" },
    ];

    for (const cat of categories) {
        await prisma.category.upsert({
            where: { name: cat.name },
            update: {},
            create: cat,
        });
    }

    // 3. Admin User
    // Note: ideally password should be hashed. We will simulate "password123" 
    // and handle hashing in the auth logic later.

    const adminEmail = "admin@airbnb.com";
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            username: "admin",
            email: adminEmail,
            name: "Admin User",
            password: "password123", // Will be hashed in real app
            isAdmin: true,
            isHost: true,
            avatar: "https://avatars.githubusercontent.com/u/100000?v=4",
        },
    });

    console.log("Seeding completed.");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
