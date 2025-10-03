# Vercel Deployment Runbook – ERPv3

This document is a step-by-step guide to deploying ERPv3 to Vercel.

---

## 1. Prerequisites
- Vercel account with GitHub integration.
- Neon Postgres database created (with SSL).
- AWS S3 / Cloudflare R2 / MinIO bucket for attachments (S3-compatible).

## 2. Import Repo
- Push this repo to GitHub (branch `main`).
- Import into Vercel from GitHub.

## 3. Environment Variables
Set these in **Vercel → Project → Settings → Environment Variables**:

### Database
- `DATABASE_URL` → Neon Postgres connection string with `sslmode=require`
- `SHADOW_DATABASE_URL` (optional, used for migrations in CI)

### Auth / RBAC
- `AUTH_JWT_SECRET` → long random secret string
- `AUTH_COOKIE_NAME=auth_token` (optional)
- `REQUIRE_AUTH=true`
- `ALLOW_DEV_BYPASS=false` (prod)
- `DEV_LOGIN_ENABLED=false` (prod)

### Rate Limiting
- `RATE_LIMIT_TOKENS=100`
- `RATE_LIMIT_WINDOW_MS=60000`

### Sentry (optional)
- `SENTRY_DSN`
- `SENTRY_TRACES_SAMPLE_RATE=0.2`
- `SENTRY_DEBUG=false`

### Object Storage (S3-compatible)
- `OBJECT_STORAGE_ENDPOINT=https://s3.us-west-2.amazonaws.com` (or R2/MinIO endpoint)
- `OBJECT_STORAGE_BUCKET=erpv3-attachments`
- `OBJECT_STORAGE_REGION=us-west-2`
- `OBJECT_STORAGE_ACCESS_KEY=...`
- `OBJECT_STORAGE_SECRET=...`

### Misc
- `NODE_ENV=production` (set by Vercel automatically)

---

## 4. Migrations
Run before first deploy (locally or in CI):

```bash
bash scripts/apply_sql_migrations.sh
npx prisma generate
```

This applies SQL migrations (including the Attachment model) and generates the Prisma client.

---

## 5. Seed Data (Optional)
For dev/staging only:

```bash
bash scripts/seed.sh
```

Populates vendors, customers, products, pricebooks, inventory lots, a quote, an order, an invoice, and a payment.

---

## 6. Build & Deploy
Vercel automatically runs:
```bash
npm install
npm run build
```

Ensure `@prisma/client` is in dependencies (not devDependencies).

---

## 7. Post-Deploy Smoke Test
- Open `/login` (only if `DEV_LOGIN_ENABLED=true` in non-prod).
- Test API endpoints:
  - `/api/inventory/cycle-count/plan` (create plan)
  - `/api/quotes` (create/list)
  - `/api/finance/payments/apply`
- Verify RBAC enforcement (401/403 without valid auth cookie).

---

## 8. Notes
- Vercel’s FS is ephemeral → you **must** use S3-compatible storage, not local `.uploads`.
- Dev login/bypass must remain disabled in production.
- Always test migrations on a Neon branch before running on prod.

---
