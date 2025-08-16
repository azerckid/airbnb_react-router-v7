
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

const adapter = new PrismaBetterSqlite3(new Database("prisma/dev.db"));
const prisma = new PrismaClient({ adapter });

async function main() {
    const count = await prisma.room.count();
    const nyCount = await prisma.room.count({
        where: {
            OR: [
                { city: { contains: "New York" } },
                { address: { contains: "New York" } }
            ]
        }
    });

    console.log(`Total Rooms: ${count}`);
    console.log(`New York Rooms: ${nyCount}`);

    const sample = await prisma.room.findFirst({
        where: { city: { contains: "New York" } },
        select: { title: true, city: true }
    });
    console.log("Sample NY Room:", sample);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
