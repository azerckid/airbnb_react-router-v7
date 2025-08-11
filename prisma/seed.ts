import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

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
        update: {
            password: await bcrypt.hash("password123", 10),
        },
        create: {
            email: adminEmail,
            username: "admin",
            name: "Admin User",
            password: bcrypt.hashSync("password123", 10),
            isAdmin: true,
            isHost: true,
            avatar: "https://github.com/shadcn.png",
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
