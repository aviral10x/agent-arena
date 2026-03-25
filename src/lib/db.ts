import { PrismaClient } from "@prisma/client";
// Validate environment variables at startup
import "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: boolean;
};

const databaseUrl = process.env.DATABASE_URL ?? "";
const isSQLite = databaseUrl.startsWith("file:") || databaseUrl.endsWith(".db");
const isTurso = !!process.env.TURSO_DATABASE_URL;

function createPrismaClient(): PrismaClient {
  // Turso (cloud SQLite) — used in production/Vercel
  if (isTurso) {
    const { createClient } = require("@libsql/client");
    const { PrismaLibSQL } = require("@prisma/adapter-libsql");

    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  // Local SQLite — used in dev
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Enable WAL mode + busy timeout on first init for local SQLite only
if (isSQLite && !isTurso && !globalForPrisma.dbReady) {
  globalForPrisma.dbReady = true;
  void (async () => {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA cache_size=-32000").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA temp_store=MEMORY").catch(() => {});
  })();
}
