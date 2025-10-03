# Migration Runbook

## Prereqs
- `DATABASE_URL` is set and points to Neon Postgres.
- `psql` available locally or via CI.

## Apply SQL migrations (raw)
```bash
# Apply all migration.sql files in timestamp order
for m in prisma/migrations/*/migration.sql; do
  echo "Applying $m"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$m"
done
```

## Prisma client generation
```bash
npm run db:generate
```

## Rollback
- If a migration fails, use a transaction wrapper or revert the specific changes manually.
- Keep backups (Neon branch/snapshot) before applying migrations.
