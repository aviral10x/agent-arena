import { PrismaClient } from "@prisma/client";
// Validate environment variables at startup
import "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: boolean;
};
const databaseUrl = process.env.DATABASE_URL ?? "";
const isSQLite = databaseUrl.startsWith("file:") || databaseUrl.endsWith(".db");

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Enable WAL mode + busy timeout on first init for SQLite
// WAL allows concurrent reads while a write is in progress (critical for load)
if (isSQLite && !globalForPrisma.dbReady) {
  globalForPrisma.dbReady = true;
  void (async () => {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {}); // 5s wait on lock
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL").catch(() => {}); // faster writes, safe with WAL
    await prisma.$queryRawUnsafe("PRAGMA cache_size=-32000").catch(() => {}); // 32MB page cache
    await prisma.$queryRawUnsafe("PRAGMA temp_store=MEMORY").catch(() => {}); // temp tables in RAM
  })();
}
