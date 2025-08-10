import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

let prisma: PrismaClient;

declare global {
    var __db__: PrismaClient;
}

// Singleton pattern for Prisma with Adapter
if (process.env.NODE_ENV === "production") {
    const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
    prisma = new PrismaClient({ adapter });
} else {
    if (!global.__db__) {
        const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
        global.__db__ = new PrismaClient({ adapter });
    }
    prisma = global.__db__;
    prisma.$connect();
}

export { prisma };
