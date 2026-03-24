import { PrismaClient } from "@prisma/client";
// Validate environment variables at startup
import "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Enable WAL mode + busy timeout on first init for SQLite
// WAL allows concurrent reads while a write is in progress (critical for load)
if (!globalForPrisma.dbReady) {
  globalForPrisma.dbReady = true;
  prisma.$executeRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
  prisma.$executeRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {}); // 5s wait on lock
  prisma.$executeRawUnsafe("PRAGMA synchronous=NORMAL").catch(() => {}); // faster writes, safe with WAL
  prisma.$executeRawUnsafe("PRAGMA cache_size=-32000").catch(() => {}); // 32MB page cache
  prisma.$executeRawUnsafe("PRAGMA temp_store=MEMORY").catch(() => {}); // temp tables in RAM
}
