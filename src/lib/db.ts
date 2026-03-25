import { PrismaClient } from "@prisma/client";
import "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: boolean;
};

const databaseUrl = process.env.DATABASE_URL ?? "";
const isSQLite = databaseUrl.startsWith("file:") || databaseUrl.endsWith(".db");

function createPrismaClient(): PrismaClient {
  const tursoUrl   = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // Turso path — only when env vars are present at runtime.
  // Dynamic requires prevent the bundler from evaluating these at build time.
  if (tursoUrl && tursoToken) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client/web");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require("@prisma/adapter-libsql");

    const libsql  = createClient({ url: tursoUrl, authToken: tursoToken });
    const adapter = new PrismaLibSql(libsql);

    return new PrismaClient({ adapter, log: ["error"] } as any);
  }

  // Local SQLite fallback
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: databaseUrl,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// WAL mode for local SQLite performance — run once on first init
if (isSQLite && !process.env.TURSO_DATABASE_URL && !globalForPrisma.dbReady) {
  globalForPrisma.dbReady = true;
  void (async () => {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA synchronous=NORMAL").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA cache_size=-32000").catch(() => {});
    await prisma.$queryRawUnsafe("PRAGMA temp_store=MEMORY").catch(() => {});
  })();
}
