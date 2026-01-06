# Agent 6B: Infrastructure & Monitoring

**Estimated Time**: 8-14 hours  
**Priority**: HIGH - Production reliability  
**Dependencies**: None (can start immediately)

---

## Mission

Implement critical infrastructure for production: database backups and health checks.

---

## Context

TERP needs production-grade infrastructure:

- Automated database backups (REL-002)
- Health check endpoint (INFRA-004)

Sentry is already implemented for error tracking (ST-008 complete).

**NOTE**: Datadog (ST-009) has been intentionally skipped - Sentry provides sufficient monitoring.

---

## Prompt

````
You are working on the TERP cannabis ERP project.

## Setup
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install

## Your Mission: Infrastructure & Monitoring

### Task 1: Database Backup Script (REL-002) - 4-8h

#### 1.1 Create Backup Script
Create scripts/backup-database.ts:

```typescript
import { execSync } from 'child_process';
import { createReadStream, unlinkSync } from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { format } from 'date-fns';

const DATABASE_URL = process.env.DATABASE_URL;
const S3_BUCKET = process.env.BACKUP_S3_BUCKET;
const S3_REGION = process.env.BACKUP_S3_REGION || 'us-east-1';
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('🗄️  TERP Database Backup Script');
  console.log('================================');

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `terp-backup-${timestamp}.sql.gz`;
  const localPath = `/tmp/${filename}`;

  // Parse DATABASE_URL
  const url = new URL(DATABASE_URL);
  const isMySQL = url.protocol === 'mysql:';
  const host = url.hostname;
  const port = url.port || (isMySQL ? '3306' : '5432');
  const user = url.username;
  const password = url.password;
  const database = url.pathname.slice(1);

  console.log(`📊 Database: ${database} @ ${host}`);
  console.log(`📁 Output: ${filename}`);

  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No actual backup will be created');
    return;
  }

  // Create dump
  try {
    if (isMySQL) {
      execSync(
        `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} | gzip > ${localPath}`,
        { stdio: 'inherit' }
      );
    } else {
      execSync(
        `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${user} ${database} | gzip > ${localPath}`,
        { stdio: 'inherit' }
      );
    }
    console.log('✅ Database dump created');
  } catch (error) {
    console.error('❌ Failed to create dump:', error);
    process.exit(1);
  }

  // Upload to S3 if configured
  if (S3_BUCKET) {
    console.log(`☁️  Uploading to S3: ${S3_BUCKET}`);

    const s3 = new S3Client({ region: S3_REGION });
    const fileStream = createReadStream(localPath);

    try {
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: `backups/${filename}`,
        Body: fileStream,
        ContentType: 'application/gzip',
      }));
      console.log('✅ Uploaded to S3');

      // Clean up local file
      unlinkSync(localPath);
      console.log('🧹 Local file cleaned up');
    } catch (error) {
      console.error('❌ S3 upload failed:', error);
      console.log(`📁 Local backup saved at: ${localPath}`);
    }
  } else {
    console.log(`📁 No S3 configured. Backup saved at: ${localPath}`);
  }

  console.log('✅ Backup complete!');
}

main().catch(console.error);
````

#### 1.2 Install AWS SDK

pnpm add @aws-sdk/client-s3

#### 1.3 Add to package.json scripts

```json
"backup:db": "tsx scripts/backup-database.ts",
"backup:db:dry": "tsx scripts/backup-database.ts --dry-run"
```

#### 1.4 Update .env.example

```bash
# Database Backup Configuration
# S3 bucket for storing backups (optional - if not set, backups stay local)
BACKUP_S3_BUCKET=
BACKUP_S3_REGION=us-east-1
```

### Task 2: Health Check Endpoint (INFRA-004) - 4-6h

#### 2.1 Create Health Router

Create server/routers/health.ts:

```typescript
import { router, publicProcedure } from "../_core/trpc";
import { db } from "../db";
import { sql } from "drizzle-orm";

const startTime = Date.now();

export const healthRouter = router({
  check: publicProcedure.query(async () => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);

    // Check database connectivity
    let dbStatus = "unknown";
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - dbStart;
      dbStatus = "connected";
    } catch (error) {
      dbStatus = "disconnected";
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    return {
      status: dbStatus === "connected" ? "healthy" : "degraded",
      version: process.env.npm_package_version || "1.0.0",
      uptime,
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      memory: {
        usedMB: memoryMB,
        limitMB: 512, // DigitalOcean basic-xs limit
      },
    };
  }),
});
```

#### 2.2 Register Router

**IMPORTANT**: Router registration is in `server/routers.ts` (NOT server/routers/index.ts)

In server/routers.ts, add import at top:

```typescript
import { healthRouter } from "./routers/health";
```

Then add to the appRouter object (around line 115):

```typescript
health: healthRouter,
```

**NOTE**: There's already a `monitoringRouter` at server/routers/monitoring.ts that tracks performance metrics. The health router is different - it's for basic health checks.

#### 2.3 Verify Endpoint Works

After starting dev server, test:
curl http://localhost:5000/api/trpc/health.check

### Task 3: Verify Everything Works

1. pnpm check (must pass)
2. pnpm build (must complete)
3. Start dev server and test:
   - Health endpoint returns valid JSON
   - Backup script runs with --dry-run

### Task 4: Create PR

git checkout -b feat/infrastructure-backups-health
git add -A
git commit -m "feat(infra): add database backups and health endpoint

REL-002: Automated database backup script

- Support MySQL and PostgreSQL
- Optional S3 upload for cloud storage
- Dry-run mode for testing

INFRA-004: Health check endpoint

- Database connectivity check
- Memory usage monitoring
- Uptime tracking"

git push origin feat/infrastructure-backups-health
gh pr create --title "feat(infra): add backup script and health endpoint" --body "..."

```

---

## Success Criteria

- [ ] Backup script runs with --dry-run
- [ ] Health endpoint returns valid JSON
- [ ] All new env vars documented in .env.example
- [ ] pnpm check passes
- [ ] pnpm build passes

---

## Files Created/Modified

| File | Change |
|------|--------|
| scripts/backup-database.ts | NEW - Backup script |
| server/routers/health.ts | NEW - Health endpoint |
| server/routers.ts | Register health router |
| package.json | Add backup scripts, AWS SDK |
| .env.example | Add backup vars |

---

## Merge Priority

**Merge FOURTH** - After cleanup PRs, as this adds new functionality.
```
