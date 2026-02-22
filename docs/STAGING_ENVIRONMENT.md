# TERP Staging Environment

This document describes the TERP staging environment, how to access it, and how to manage it.

## Environment Details

| Property                     | Value                                           |
| ---------------------------- | ----------------------------------------------- |
| **Application URL**          | `https://terp-staging-yicld.ondigitalocean.app` |
| **DigitalOcean App ID**      | `62f2d9f8-3fb5-4576-9f7b-8dd91cf552a6`          |
| **DigitalOcean Database ID** | `e4ee02f2-7e5c-4dc9-bf39-10207bfdb616`          |
| **GitHub Branch**            | `staging`                                       |
| **Region**                   | NYC                                             |
| **App Size**                 | `apps-s-1vcpu-1gb` (1 instance, no autoscaling) |
| **Database Size**            | `db-s-1vcpu-1gb` (MySQL 8, 1 node)              |

## How It Works

The staging environment is a complete, isolated replica of the TERP production system. It has its own DigitalOcean App Platform service and its own managed MySQL database. It deploys automatically from the `staging` branch whenever new commits are pushed.

### Key Differences from Production

| Setting            | Production         | Staging                  |
| ------------------ | ------------------ | ------------------------ |
| Branch             | `main`             | `staging`                |
| `DEMO_MODE`        | `false`            | `true` (auto-login)      |
| `QA_AUTH_ENABLED`  | `false`            | `true`                   |
| `ENABLE_TEST_AUTH` | `false`            | `true`                   |
| `VITE_APP_TITLE`   | `TERP`             | `TERP [STAGING]`         |
| Instance Count     | 2 (autoscaled)     | 1 (fixed)                |
| Database           | Production cluster | Separate staging cluster |

## Access

### Application

Navigate to `https://terp-staging-yicld.ondigitalocean.app` in your browser. Because `DEMO_MODE=true`, you will be automatically logged in as a Super Admin user without needing to authenticate.

### QA Test Accounts

For role-specific testing, use the QA accounts below. All share the password `TerpQA2026!`.

| Email                       | Role              |
| --------------------------- | ----------------- |
| `qa.superadmin@terp.test`   | Super Admin       |
| `qa.salesmanager@terp.test` | Sales Manager     |
| `qa.salesrep@terp.test`     | Customer Service  |
| `qa.inventory@terp.test`    | Inventory Manager |
| `qa.fulfillment@terp.test`  | Warehouse Staff   |
| `qa.accounting@terp.test`   | Accountant        |
| `qa.auditor@terp.test`      | Read-Only Auditor |

### Database

Direct database access is available for debugging. Use a MySQL client with SSL enabled.

| Parameter | Value                                                                             |
| --------- | --------------------------------------------------------------------------------- | --- |
| Host      | `terp-staging-db-do-user-28175253-0.g.db.ondigitalocean.com`                      |
| Port      | `25060`                                                                           |
| User      | `doadmin`                                                                         |
| Password  | _(See DigitalOcean Dashboard → Databases → terp-staging-db → Connection Details)_ |     |
| Database  | `defaultdb`                                                                       |
| SSL       | Required                                                                          |

## Updating Staging

### Deploying New Code

To update the staging environment with the latest code from `main`:

```bash
git checkout staging
git merge main
git push origin staging
```

DigitalOcean will automatically build and deploy the new code within a few minutes.

### Deploying a Feature Branch for Testing

To test a specific feature branch before merging to `main`:

```bash
git checkout staging
git merge feature/my-feature-branch
git push origin staging
```

After testing, reset staging back to `main`:

```bash
git checkout staging
git reset --hard origin/main
git push --force origin staging
```

## Resetting Staging Data

To reset the staging database to a clean state with fresh seed data:

```bash
# 1. Push the schema (if schema has changed)
DATABASE_URL="$STAGING_DATABASE_URL" \
  npx drizzle-kit push

# 2. Run the main seeder
DATABASE_URL="$STAGING_DATABASE_URL?ssl-mode=REQUIRED" \
  npx tsx scripts/seed/seed-main.ts --force

# 3. Seed defaults (feature flags, gamification, scheduling, storage, leaderboard)
DATABASE_URL="$STAGING_DATABASE_URL?ssl-mode=REQUIRED" \
  npx tsx scripts/seed/seeders/seed-all-defaults.ts

# 4. Seed RBAC roles and permissions
DATABASE_URL="$STAGING_DATABASE_URL?ssl-mode=REQUIRED" \
  npx tsx scripts/seed-rbac.ts

# 5. Seed QA accounts
DATABASE_URL="$STAGING_DATABASE_URL?ssl-mode=REQUIRED" \
  npx tsx server/db/seed/qaAccounts.ts
```

## Checking Staging Logs

Update `.env.app-ids` with the staging app ID (see below), then use:

```bash
./scripts/terp-logs.sh run 100
```

## Health Checks

| Endpoint                 | Expected Response                                       |
| ------------------------ | ------------------------------------------------------- |
| `/health/live`           | `{"status":"ok"}`                                       |
| `/api/trpc/health.check` | `{"result":{"data":{"json":{"status":"healthy",...}}}}` |

## Monthly Cost

| Component                          | Cost           |
| ---------------------------------- | -------------- |
| App Platform (basic-s, 1 instance) | ~$5-12/mo      |
| Managed MySQL (db-s-1vcpu-1gb)     | ~$30/mo        |
| **Total**                          | **~$35-42/mo** |
