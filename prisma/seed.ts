import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

// const db = new Database("dev.db"); // Not needed
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

    // 4. Create Rooms
    // Need to fetch categories first to link
    const dbCategories = await prisma.category.findMany();

    // Create random rooms
    const roomTitles = [
        "Cozy Beachfront Cottage",
        "Modern City Apartment",
        "Rustic Wood Cabin",
        "Luxury Seaside Villa",
        "Downtown Loft",
    ];

    for (let i = 0; i < 10; i++) {
        const randomCat = dbCategories[Math.floor(Math.random() * dbCategories.length)];
        const title = roomTitles[i % roomTitles.length] + ` ${i + 1}`;

        await prisma.room.create({
            data: {
                title,
                country: "South Korea",
                city: "Seoul",
                price: 100 + (i * 20),
                owner: { connect: { id: admin.id } },
                category: { connect: { id: randomCat.id } },
                description: `This is a wonderful ${randomCat.name.toLowerCase()} place to stay.`,
                address: `123 Gangnam-gu, Street ${i}`,
                photo: `https://loremflickr.com/640/480/house,room?random=${i}`,
            }
        });
    }

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
