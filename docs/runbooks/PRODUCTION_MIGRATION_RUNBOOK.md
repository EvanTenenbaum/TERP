# Production Migration Runbook: DigitalOcean Managed Infrastructure

**Last Updated**: 2026-02-18
**Source**: TER-235 deployment experience

---

## 1. Direct Database Access from External Environments Is Unreliable

The Manus sandbox (and any ephemeral CI/CD environment) cannot reliably connect to a DigitalOcean Managed MySQL database. The outbound IP address rotates unpredictably across multiple IPs. Even after adding IPs to the database firewall:

- Firewall rule propagation takes 2-5 minutes on DigitalOcean
- By the time the rule propagates, the outbound IP may have changed
- TCP connections succeed at the socket level (port 25060 is open), but the MySQL handshake is rejected by the firewall layer -- so `telnet` works but `mysql` does not

**Bottom line**: Do not waste time trying to connect directly. Use the job-based approach below.

---

## 2. The Proven Pattern: Temporary App Platform Job Components

The correct way to run one-off scripts (migrations, backfills, data fixes) against a DigitalOcean Managed Database is to add a **temporary job component** to the App Platform app spec.

Jobs run inside the VPC and have direct database access through the `${db-component-name.DATABASE_URL}` binding.

### How it works:

1. Call `apps-update` via the DigitalOcean MCP with a modified app spec that includes a `jobs` array
2. The job builds from the same Dockerfile and repo as the web service
3. It runs your script via the `run_command` field
4. After the job succeeds, update the spec again to **remove the job** so it doesn't re-run on future deployments

---

## 3. Critical MCP Tool Quirks

### Parameter naming is inconsistent across tools:

| Tool | ID Parameter Name |
|------|-------------------|
| `apps-get-deployment-status` | `AppID` |
| `apps-update` | `app_id` (nested inside `update.app_id`) |
| `apps-get-logs` | `AppID` |
| `db-cluster-update-firewall-rules` | `id` |
| `db-cluster-list` | `{}` (no params) |

Always run `manus-mcp-cli tool get <tool-name> --server digitalocean` to check exact parameter names before calling a tool.

### The `apps-update` payload structure is deeply nested:

```json
{
  "update": {
    "app_id": "...",
    "request": {
      "spec": { "...full app spec..." }
    }
  }
}
```

**You must include the entire app spec** (services, databases, ingress, region) -- not just the changes. Omitting a section (like `databases`) will cause the update to remove that component.

---

## 4. Auto-Rollback Behavior

If a job exits with a non-zero code, DigitalOcean automatically **rolls back the entire deployment** -- including the web service -- to the previous working state. This means:

- The web service reverts to the old code
- The job's `run_command` reverts to whatever it was in the previous spec
- You must fix the script, push to `main`, and trigger a new deployment

This is actually a safety feature, but it can be confusing if you don't expect it. Always verify your scripts will exit cleanly before deploying them as jobs.

---

## 5. Chained Commands in `run_command` Are Unreliable

When using `&&` to chain two scripts (`script1.ts && script2.ts`), only the first script's output appeared in deploy logs. The job reported success (exit code 0), but the second script's output was absent.

**Recommendation**: Run each script as a separate job deployment. It takes an extra build cycle (~5 minutes) but gives you clear, isolated logs and failure signals.

---

## 6. `deploy_on_push` Interaction with Jobs

If the web service has `deploy_on_push: true` (which TERP does), every push to `main` triggers a new deployment. If a job component is still in the spec, it will re-run on every push.

**Always clean up the job immediately after it succeeds.**

---

## 7. Log Retrieval

Job logs are available via `apps-get-logs` with `LogType: "DEPLOY"` and the specific Component name. The MCP returns a pre-signed S3 URL to the log file. Runtime logs (`LogType: "RUN"`) are for long-running services, not jobs.

---

## 8. Database Firewall Management

The firewall rules use a `type` field that can be `app`, `ip_addr`, `droplet`, or `tag`. For production, the safest configuration is:

```json
{"type": "app", "value": "<app-id>"}
```

This allows only the App Platform app to connect. If you add IP addresses for debugging, **always restore to app-only access afterward**.

---

## 9. Deployment Timing

Typical deployment cycle for TERP on DigitalOcean App Platform:

| Phase | Duration |
|-------|----------|
| Build (Docker) | 4-5 minutes |
| Deploy (health check) | 3-5 minutes |
| Job execution | 1-2 minutes |
| **Total** | **8-12 minutes** |

The health check has `initial_delay_seconds: 120` configured, which accounts for most of the deploy phase duration.

---

## Quick Reference: Running a Migration

```bash
# 1. Get current app spec
doctl apps get <app-id> --format json > /tmp/current-spec.json

# 2. Add job to spec (see Section 2)
# 3. Deploy via apps-update
# 4. Monitor: apps-get-logs with LogType: "DEPLOY"
# 5. Verify: curl https://terp-app-b9s35.ondigitalocean.app/api/health
# 6. Clean up: Remove job from spec, re-deploy
# 7. Restore firewall: app-only access
```
# TERP Production Migration Runbook

## Overview

This runbook documents the process for running manual database migrations and backfill scripts against the TERP production database on DigitalOcean App Platform. It was created based on the TER-235 migration experience (PR #428, February 2026).

## Architecture Context

The TERP production stack consists of three components on DigitalOcean App Platform:

| Component | Type | Name | Details |
|-----------|------|------|---------|
| Web Service | `service` | `web` | Node.js app built from `Dockerfile` on `main` branch |
| Database | `database` | `terp-mysql-db` | DigitalOcean Managed MySQL cluster |
| App ID | — | `1fd40be5-b9af-4e71-ab1d-3af0864a7da4` | Used in all MCP API calls |
| DB Cluster ID | — | `03cd0216-a4df-42c6-9bff-d9dc7dadec83` | Used for firewall rule management |

## Why Direct Database Access Does Not Work

The Manus sandbox cannot connect directly to the DigitalOcean Managed MySQL database because the sandbox's outbound IP address rotates unpredictably across multiple IPs (observed: `45.169.209.73`, `174.129.133.203`, `179.93.227.56`). Even after adding all known IPs to the database firewall, connections fail because the IP may change between the firewall rule propagation window and the actual connection attempt. DigitalOcean firewall rules also take 2-5 minutes to propagate, compounding the issue.

**The proven approach is to use DigitalOcean App Platform "job" components**, which run inside the VPC and have direct database access through the `${terp-mysql-db.DATABASE_URL}` binding.

## Step-by-Step: Running a Migration via App Platform Job

### Step 1: Get the Current App Spec

```bash
manus-mcp-cli tool call apps-get-info --server digitalocean --input '{
  "AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
}'
```

Save the returned spec to a file for reference. You need to preserve the existing `services`, `databases`, `ingress`, and `region` fields when updating.

### Step 2: Add a Temporary Job Component

Build an update payload that includes the original spec plus a new `jobs` array. The job should:

- Use the same `github.repo` and `branch` as the web service (`EvanTenenbaum/TERP`, `main`)
- Use the same `dockerfile_path` (`Dockerfile`)
- Set `deploy_on_push: false` to prevent auto-triggering
- Set `kind: POST_DEPLOY` so it runs after the web service is healthy
- Include `DATABASE_URL` env var bound to `${terp-mysql-db.DATABASE_URL}`
- Set `NODE_ENV` to `production`

Example job spec:

```json
{
  "name": "migration-job",
  "github": {
    "repo": "EvanTenenbaum/TERP",
    "branch": "main",
    "deploy_on_push": false
  },
  "dockerfile_path": "Dockerfile",
  "run_command": "npx tsx scripts/your-migration-script.ts --confirm-production",
  "envs": [
    {"key": "DATABASE_URL", "value": "${terp-mysql-db.DATABASE_URL}", "scope": "RUN_AND_BUILD_TIME"},
    {"key": "NODE_ENV", "value": "production", "scope": "RUN_AND_BUILD_TIME"}
  ],
  "instance_size_slug": "apps-s-1vcpu-0.5gb",
  "kind": "POST_DEPLOY"
}
```

### Step 3: Deploy the Update

```bash
manus-mcp-cli tool call apps-update --server digitalocean --input '{
  "update": {
    "app_id": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4",
    "request": {
      "spec": { ... full spec with jobs array ... }
    }
  }
}'
```

This triggers a full rebuild and deployment. The build takes approximately 4-5 minutes, and the deploy (including health check) takes another 3-5 minutes.

### Step 4: Monitor the Deployment

```bash
manus-mcp-cli tool call apps-get-deployment-status --server digitalocean --input '{
  "AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
}'
```

Watch for `Phase: ACTIVE` with all steps showing `SUCCESS`. If the job fails, the deployment will `AUTO_ROLLBACK` to the previous working state.

### Step 5: Verify Job Output

```bash
manus-mcp-cli tool call apps-get-logs --server digitalocean --input '{
  "AppID": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4",
  "Component": "migration-job",
  "DeploymentID": "<deployment-id>",
  "LogType": "DEPLOY",
  "TailLines": 500
}'
```

The returned URL contains the full job output. Open it in a browser to verify the migration results.

### Step 6: Clean Up — Remove the Job

After the migration succeeds, update the app spec again **without** the `jobs` array to remove the temporary job component. This prevents it from running on future deployments.

### Step 7: Restore Database Firewall (if modified)

If you added any IP addresses to the database firewall during troubleshooting, restore it to app-only access:

```bash
manus-mcp-cli tool call db-cluster-update-firewall-rules --server digitalocean --input '{
  "id": "03cd0216-a4df-42c6-9bff-d9dc7dadec83",
  "rules": [
    {"type": "app", "value": "1fd40be5-b9af-4e71-ab1d-3af0864a7da4"}
  ]
}'
```

## Common Pitfalls

### 1. Auto-Rollback on Job Failure

If the migration script exits with a non-zero code, DigitalOcean automatically rolls back the entire deployment (including the web service) to the previous working state. This means:

- The web service reverts to the old code
- The job component may revert to the old `run_command`
- You need to fix the script, push to main, and redeploy

**Always test migration scripts locally or in dry-run mode before running in production.**

### 2. Column References in SQL Scripts

Production database columns may not match the Drizzle schema exactly. The `autoMigrate.ts` system uses a fingerprint-based approach that may skip migrations if the schema is "close enough." Always verify column existence before referencing them in SQL queries.

Example from TER-235: The backfill script referenced `poi.deletedAt` but this column did not exist in production (it was an ST-059 pattern column not yet migrated). The fix was to remove the filter entirely.

### 3. Chained Commands in run_command

When using `&&` to chain multiple scripts in `run_command`, only the first script's output may appear in the deploy logs. If the first script succeeds but the second fails, the job will show as failed but you may not see the second script's output. Consider running scripts separately in individual job deployments.

### 4. autoMigrate Fingerprint Skipping

The `server/autoMigrate.ts` system checks a schema fingerprint on startup. If the fingerprint matches (7/7 canary checks pass), it skips all migrations — even new ones. This means columns defined in `autoMigrate.ts` may not be created if the fingerprint check passes. The standalone migration scripts (`scripts/apply-ter235-column-migrations.ts`) serve as a backup for this scenario.

### 5. deploy_on_push Behavior

If the web service has `deploy_on_push: true` (which it does), any push to `main` triggers a new deployment. This includes the job component if it's still in the spec. Be mindful of this when pushing fixes — the job will re-run on every deployment until removed.

## TER-235 Specific Reference

The TER-235 migration involved two concerns:

**Automatic (via autoMigrate on startup):**
- `purchaseOrders.supplier_client_id`
- `purchaseOrderItems.supplier_client_id`
- `lots.supplier_client_id`
- `products.supplier_client_id`
- `vendorNotes.client_id`

**Manual (via scripts):**
- `scripts/apply-ter235-column-migrations.ts` — Creates `purchaseOrderItems.supplier_client_id` and `vendorNotes.client_id` with indexes and FK constraints (redundant with autoMigrate but useful as standalone verification)
- `scripts/backfill-ter235-supplier-client-ids.ts` — Reads `supplier_profiles.legacy_vendor_id → client_id` mapping and backfills the new columns

**Runtime fallback:**
- `server/services/vendorMappingService.ts` resolves vendor IDs to client IDs at query time, so queries work even before the backfill runs.

## Deployment Timeline (TER-235)

| Time (UTC) | Event |
|------------|-------|
| 2026-02-18 00:00 | PR #428 merged to main |
| 2026-02-18 00:10 | Auto-deploy triggered, build started |
| 2026-02-18 00:25 | Deployment ACTIVE, health OK, autoMigrate ran |
| 2026-02-18 00:35 | First migration job deployed (column creation + backfill) |
| 2026-02-18 00:44 | Column migration succeeded, backfill not visible in logs |
| 2026-02-18 00:50 | Second attempt (backfill only) — failed: `Unknown column 'poi.deletedAt'` |
| 2026-02-18 00:50 | Auto-rollback triggered |
| 2026-02-18 01:00 | Fix pushed to main (removed deletedAt filter) |
| 2026-02-18 01:01 | Third attempt auto-triggered by push |
| 2026-02-18 01:11 | Backfill completed successfully (0 rows to backfill — tables empty) |
| 2026-02-18 01:15 | Cleanup: removed job, restored firewall |
| 2026-02-18 01:22 | Final verification: health OK, no jobs, app-only firewall |
