import { PrismaClient } from "@prisma/client";
import "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: boolean;
};

function createPrismaClient(): PrismaClient {
  const tursoUrl   = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // Turso path — only when env vars are actually present at runtime
  if (tursoUrl && tursoToken) {
    // Dynamic requires so bundler doesn't try to evaluate at build time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client/web");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require("@prisma/adapter-libsql");

    const libsql  = createClient({ url: tursoUrl, authToken: tursoToken });
    const adapter = new PrismaLibSql(libsql);

    return new PrismaClient({
      adapter,
      log: ["error"],
    } as any);
  }

  // Local SQLite fallback
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: process.env.DATABASE_URL,
  });

  // WAL mode for local SQLite performance
  if (!globalForPrisma.dbReady) {
    globalForPrisma.dbReady = true;
    void (async () => {
      await client.$queryRawUnsafe("PRAGMA journal_mode=WAL").catch(() => {});
      await client.$queryRawUnsafe("PRAGMA busy_timeout=5000").catch(() => {});
      await client.$queryRawUnsafe("PRAGMA synchronous=NORMAL").catch(() => {});
      await client.$queryRawUnsafe("PRAGMA cache_size=-32000").catch(() => {});
      await client.$queryRawUnsafe("PRAGMA temp_store=MEMORY").catch(() => {});
    })();
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
