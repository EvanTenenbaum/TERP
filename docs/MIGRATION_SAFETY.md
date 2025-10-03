# Postgres Migration Safety Checklist – ERPv3 (Neon + Prisma)

## 1. Pre-Migration Prep
- ✅ **Back up database**
  - In Neon console: take a **point-in-time snapshot** (or branch from prod).
  - Verify snapshot exists and is restorable.

- ✅ **Check applied migrations**
  ```bash
  npx prisma migrate status
  ```

- ✅ **Validate schema drift**
  ```bash
  npx prisma migrate diff     --from-url "$DATABASE_URL"     --to-schema-datamodel ./prisma/schema.prisma
  ```

---

## 2. Safe Migration Execution
- ✅ **Run in staging first**
  - Create a Neon branch from production.
  - Run all pending migrations:
    ```bash
    npx prisma migrate deploy
    ```
  - Run smoke tests.

- ✅ **Review SQL**
  - Open `prisma/migrations/<timestamp>.../migration.sql`
  - Verify no destructive operations unless intentional.

- ✅ **Lock writes if needed**
  - For high-risk migrations, temporarily pause prod writes.

---

## 3. Rollout to Production
- ✅ **Run migrations**
  ```bash
  npx prisma migrate deploy
  ```

- ✅ **Check for errors**
  - If error: stop, restore snapshot, investigate.

- ✅ **Generate Prisma Client**
  ```bash
  npx prisma generate
  ```

---

## 4. Post-Migration Validation
- ✅ Run seed (staging only):
  ```bash
  bash scripts/seed.sh
  ```
- ✅ Run type checks and smoke tests:
  ```bash
  npm run typecheck
  npm run test:e2e
  ```
- ✅ Verify critical queries in prod.

---

## 5. Rollback Procedure
1. Repoint Neon to snapshot/branch taken before migration.
2. Restore `DATABASE_URL`.
3. Investigate failing migration locally.
4. Generate corrected migration with Prisma:
   ```bash
   npx prisma migrate dev --name fix_migration
   ```
5. Apply in staging → re-deploy in prod.

---

## 6. Best Practices
- Always review SQL migrations before applying.  
- Never run `prisma migrate dev` in production — only `migrate deploy`.  
- Keep schema changes atomic.  
- Test migrations in a Neon branch first.  
- Automate deploy but document manual restore steps.

---

⚠️ **Note:** Vercel builds do not apply migrations automatically. Run migrations via CI/CD or manual script before deploy.
