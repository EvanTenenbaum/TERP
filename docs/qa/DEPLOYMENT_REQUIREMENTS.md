# Deployment Requirements for Merged PRs

**Date:** 2026-01-26
**Context:** 6 Team PRs merged to main (#308, #309, #310, #311, #312, #313)

## Executive Summary

The merged PRs introduce database migrations, new cron jobs, and optional environment variables. Most changes are **automatically applied** during deployment via the existing CI/CD pipeline. However, there are specific items that require attention.

---

## 1. Database Migrations (REQUIRED)

### New Migration Files

| Migration | Description | Team | Auto-Applied |
|-----------|-------------|------|--------------|
| `0053_fix_dashboard_preferences_index.sql` | Drops legacy indexes on userDashboardPreferences | E | ✅ Yes |
| `0054_fix_long_constraint_names.sql` | Verification only (no-op SELECT 1) | E | ✅ Yes |
| `0055_add_bills_fk_constraints.sql` | Adds FK constraints to bills table | E | ✅ Yes |
| `0056_migrate_lots_supplier_client_id.sql` | Populates lots.supplierClientId from vendor mapping | E | ✅ Yes |
| `0059_add_cron_leader_lock.sql` | Creates cron_leader_lock table for multi-instance coordination | E | ✅ Yes |

### Migration Execution

Migrations are **automatically executed** during deployment via:
- **Dockerfile**: Runs `pnpm drizzle-kit push --yes` before starting server
- **Post-deploy script**: `scripts/post-deploy-migrate.sh`

### Manual Verification (Recommended)

After deployment, verify migrations applied correctly:

```sql
-- Check cron_leader_lock table exists
SHOW TABLES LIKE 'cron_leader_lock';

-- Check lots.supplierClientId population
SELECT 
  COUNT(*) as total_lots,
  SUM(CASE WHEN supplier_client_id IS NOT NULL AND supplier_client_id > 0 THEN 1 ELSE 0 END) as with_client_id,
  SUM(CASE WHEN supplier_client_id IS NULL OR supplier_client_id = 0 THEN 1 ELSE 0 END) as without_client_id
FROM lots WHERE deleted_at IS NULL;

-- Check bills FK constraints
SHOW CREATE TABLE bills;
```

---

## 2. Cron Jobs (AUTO-ENABLED)

### New Cron Jobs Added (Team E)

| Cron Job | Schedule | Purpose | Task ID |
|----------|----------|---------|---------|
| `glBalanceCheck` | `0 6 * * *` (6 AM daily) | Verify GL debits = credits | OBS-001 |
| `arReconciliationCheck` | `0 7 * * *` (7 AM daily) | Verify AR balance integrity | OBS-002 |

### Cron Leader Election

The new cron jobs use **leader election** to prevent duplicate execution in multi-instance deployments:
- Uses `cron_leader_lock` table
- Only one instance executes cron jobs at a time
- Automatic failover if leader becomes unavailable

### Verification

```bash
# Check cron job registration in logs
docker logs <container-id> | grep -E "cron|schedule"

# Check leader lock status
SELECT * FROM cron_leader_lock;
```

---

## 3. Environment Variables

### New Optional Variables

| Variable | Default | Purpose | Team |
|----------|---------|---------|------|
| `ENABLE_DEBUG_ENDPOINTS` | `false` | Enable debug endpoints in production (NOT recommended) | A |
| `ENABLE_DEFAULT_READ_PERMISSIONS` | `false` | Fallback read permissions for users without RBAC roles (NOT recommended) | A |
| `ADMIN_SETUP_KEY` | (none) | Secret key for admin setup endpoint (REQUIRED in production if using admin setup) | A |

### Existing Variables (No Changes Required)

All existing environment variables remain unchanged. The deployment uses values from:
- `.do/app.yaml` (DigitalOcean App Platform)
- DigitalOcean control panel secrets

---

## 4. Manual Tasks

### Required Before Deployment

| Task | Status | Notes |
|------|--------|-------|
| Merge PRs to main | ✅ Complete | All 6 PRs merged |
| Push to GitHub | ✅ Complete | Auto-deploys via DigitalOcean |

### Required After Deployment

| Task | Priority | Description |
|------|----------|-------------|
| Verify health endpoint | HIGH | `curl https://terp-app-b9s35.ondigitalocean.app/health` |
| Check migration logs | HIGH | Verify all migrations applied successfully |
| Verify GL balance | MEDIUM | Run `checkGLBalance()` or wait for 6 AM cron |
| Verify AR reconciliation | MEDIUM | Run `checkARReconciliation()` or wait for 7 AM cron |
| Review unmapped lots | LOW | Check for lots without supplierClientId |

### Optional Tasks

| Task | Priority | Description |
|------|----------|-------------|
| Run QA data seeding | LOW | `pnpm seed:qa-data` (creates QA-prefixed test entities) |
| Clean up backup files | LOW | Remove `server/routers/orders.ts.backup-rf001` |
| Update session docs | LOW | Mark Team sessions as complete |

---

## 5. Rollback Procedures

### If Migration Fails

```bash
# For 0056 (lots supplier_client_id):
UPDATE lots SET supplier_client_id = NULL;

# For 0055 (bills FK):
# FK constraints are additive, no rollback needed unless causing issues

# For 0053/0054:
# Index drops are safe, no rollback needed
```

### If Cron Jobs Cause Issues

```bash
# Disable cron jobs via environment variable
ENABLE_QA_CRONS=false  # Already in app.yaml, set to false to disable
```

---

## 6. Feature Flags

### New Features Enabled by Default

| Feature | Default | Control |
|---------|---------|---------|
| Order State Machine (ARCH-003) | Enabled | Code-level (no flag) |
| GL Reversals (ACC-002/003) | Enabled | Code-level (no flag) |
| COGS GL Entries (ACC-004) | Enabled | Code-level (no flag) |
| Bill Status State Machine (ARCH-004) | Enabled | Code-level (no flag) |
| Fiscal Period Validation (ACC-005) | Enabled | Code-level (no flag) |

### Existing Feature Flags (Unchanged)

| Flag | Current Value | Notes |
|------|---------------|-------|
| `ENABLE_RBAC` | `true` | Set in app.yaml |
| `ENABLE_QA_CRONS` | `true` | Set in app.yaml |

---

## 7. Deployment Timeline

### Automatic (No Action Required)

1. **Build Phase** (~2-3 min)
   - Install dependencies
   - Build frontend (Vite)
   - Build backend (esbuild)

2. **Deploy Phase** (~1-2 min)
   - Push Docker image
   - Run migrations (`drizzle-kit push`)
   - Start server

3. **Health Check** (~1 min)
   - Wait 60 seconds initial delay
   - Probe `/health/live` endpoint
   - Mark deployment successful

### Total Expected Time: 4-6 minutes

---

## 8. Verification Checklist

### Immediate (Within 5 minutes of deployment)

- [ ] Health endpoint returns 200: `curl https://terp-app-b9s35.ondigitalocean.app/health`
- [ ] Dashboard loads with data
- [ ] No console errors in browser
- [ ] Orders page accessible
- [ ] Inventory page accessible

### Short-term (Within 24 hours)

- [ ] GL Balance cron runs at 6 AM (check logs)
- [ ] AR Reconciliation cron runs at 7 AM (check logs)
- [ ] No GL imbalance alerts
- [ ] No AR mismatch alerts

### Long-term (Within 1 week)

- [ ] Review lots without supplierClientId
- [ ] Clean up deprecated backup files
- [ ] Update ACTIVE_SESSIONS.md to mark teams complete

---

## 9. Support Contacts

| Issue | Contact |
|-------|---------|
| Deployment failures | Check DigitalOcean App Platform logs |
| Database issues | Review migration files in `drizzle/` |
| Cron job issues | Check `server/cron/` and `server/utils/cronLeaderElection.ts` |

---

## Summary

**Deployment Status:** Ready for automatic deployment

**Manual Steps Required:** None (all migrations auto-applied)

**Recommended Post-Deployment:** Verify health endpoint and check migration logs

**Risk Level:** LOW - All changes are additive and non-breaking
