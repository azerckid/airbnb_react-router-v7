import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let prisma: PrismaClient;

// Force reload comment
declare global {
    var __db__: PrismaClient;
}

// Singleton pattern for Prisma with Adapter
if (process.env.NODE_ENV === "production") {
    // Hardcode the path to prisma/dev.db to ensure consistency with the project structure
    // better-sqlite3 requires a file path, not a connection URL
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

    // Ensure directory exists (optional safety check)
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const adapter = new PrismaBetterSqlite3({ url: dbPath });
    prisma = new PrismaClient({ adapter });
} else {
    if (!global.__db__) {
        const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
        const adapter = new PrismaBetterSqlite3({ url: dbPath });
        global.__db__ = new PrismaClient({ adapter });
    }
    prisma = global.__db__;
    prisma.$connect();
}

export { prisma };
