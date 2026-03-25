/**
 * Environment validation — fails fast on bad config.
 * Import this at the top of src/lib/db.ts to catch misconfigs at startup.
 */

// Simple validation without zod to avoid adding dependencies
interface EnvConfig {
  DATABASE_URL: string;
  OPENAI_API_KEY: string;
  CRON_SECRET: string;
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: string;
  NEXT_PUBLIC_BASE_URL: string;
  OKX_API_KEY: string;
  OKX_SECRET_KEY: string;
  OKX_PASSPHRASE: string;
}

const REQUIRED = [
  'OPENAI_API_KEY',
  'CRON_SECRET',
] as const;

const OPTIONAL_DEFAULTS: Record<string, string> = {
  NEXT_PUBLIC_BASE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: '0ca407866485bb159d3a29329ac34ff0',
};

function validateEnv(): Partial<EnvConfig> {
  const missing: string[] = [];

  for (const key of REQUIRED) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Require either DATABASE_URL (local SQLite) or TURSO_DATABASE_URL (cloud)
  if (!process.env.DATABASE_URL && !process.env.TURSO_DATABASE_URL) {
    missing.push('DATABASE_URL (or TURSO_DATABASE_URL)');
  }

  // NEXT_PHASE is set during `next build` — skip hard failure at build time
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  if (missing.length > 0 && process.env.NODE_ENV === 'production' && !isBuildPhase) {
    throw new Error(
      `[env] Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nCheck your .env file or deployment config.`
    );
  }

  if (missing.length > 0) {
    console.warn(
      `[env] Missing env vars (ok in dev):\n${missing.map((k) => `  - ${k}`).join('\n')}`
    );
  }

  // Apply defaults for optional vars
  for (const [key, defaultVal] of Object.entries(OPTIONAL_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = defaultVal;
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
    CRON_SECRET: process.env.CRON_SECRET ?? '',
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? OPTIONAL_DEFAULTS.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ?? OPTIONAL_DEFAULTS.NEXT_PUBLIC_BASE_URL,
    OKX_API_KEY: process.env.OKX_API_KEY ?? '',
    OKX_SECRET_KEY: process.env.OKX_SECRET_KEY ?? '',
    OKX_PASSPHRASE: process.env.OKX_PASSPHRASE ?? '',
  };
}

// Singleton — runs once at module load
export const env = validateEnv();
