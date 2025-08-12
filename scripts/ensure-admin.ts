import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
    const email = "admin@example.com";
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
        where: { email },
        update: {
            isAdmin: true,
            password: hashedPassword, // Ensure password is known
        },
        create: {
            email,
            username: "admin",
            name: "Admin User",
            password: hashedPassword,
            isAdmin: true,
            isHost: true,
        },
    });

    console.log(`Admin user ready: ${admin.email} / ${password}`);
    console.log(`Visit /login and use these credentials.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
