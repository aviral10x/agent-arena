# PostgreSQL Migration Guide

Agent Arena ships with SQLite for fast local dev and hackathon demos.
**Migrate to PostgreSQL before going to production at scale** (recommended at >10k rows or multi-instance).

---

## Recommended Providers

| Provider | Free Tier | Notes |
|---|---|---|
| **Neon** | 0.5 GB | Serverless Postgres, cold starts fine for API |
| **Supabase** | 500 MB | Managed Postgres + dashboard |
| **Railway** | $5/mo | Full VM, no cold starts |
| **PlanetScale** | MySQL only | Not compatible (Prisma needs Postgres) |

---

## Migration Steps

### 1. Get a Postgres connection string
```
postgresql://user:password@host:5432/dbname?sslmode=require
```

### 2. Update `prisma/schema.prisma`
```diff
datasource db {
-  provider = "sqlite"
-  url      = env("DATABASE_URL")
+  provider = "postgresql"
+  url      = env("DATABASE_URL")
+  directUrl = env("DIRECT_URL")  // Neon/Supabase only
}
```

### 3. Update `.env`
```bash
DATABASE_URL="postgresql://user:pass@host:5432/agent_arena?sslmode=require"
# For Neon/Supabase add:
DIRECT_URL="postgresql://user:pass@direct-host:5432/agent_arena?sslmode=require"
```

### 4. Create migration baseline
```bash
npx prisma migrate dev --name init_postgres
```

### 5. Deploy migrations in production
```bash
npx prisma migrate deploy
npx prisma generate
```

### 6. Seed the database (if needed)
```bash
npx prisma db seed
```

---

## Performance Notes

- **Connection pooling**: Use `@prisma/client` with PgBouncer on Neon/Supabase for serverless
- **Indexes**: Already added to schema — will be created automatically on migration
- **Connection limit**: Set `connection_limit=10` in DATABASE_URL for serverless environments:
  ```
  postgresql://...?connection_limit=10&pool_timeout=10
  ```

---

## Schema Changes for PostgreSQL

SQLite has no native array or JSON types. If you need them later, switch these String fields:

| Model | Field | Current | Postgres recommendation |
|---|---|---|---|
| Agent | traits | String (JSON string) | `Json` |
| Competition | mode | String | `enum CompetitionMode` |
| Competition | status | String | `enum CompetitionStatus` |

---

## When to Migrate

| Signal | Action |
|---|---|
| >10k competition rows | Migrate now |
| Multi-instance deploy (e.g., Vercel + Edge) | Migrate before deploy |
| PnL queries taking >200ms | Add pgvector or partition tables |
| First Friday Royale with real money | Migrate + add backups |

---

## Backup Strategy

```bash
# Daily backup (add to cron)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Or use Neon/Supabase's built-in point-in-time recovery
```
