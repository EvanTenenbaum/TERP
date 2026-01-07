# Thursday Deployment Runbook

A step-by-step guide for deploying the Wave 1 bug fixes and verifying functionality.

---

## Overview

**Target Fixes**:
- BUG-040: Handle empty pricing rules in Order Creator
- BUG-041: Prevent crash on undefined arrays in Batch Detail View
- BUG-042: Add product search fields for Global Search
- BUG-043: Handle empty permission arrays
- QA-049: Fix Products page data display
- QA-050: Fix Samples page data display

**Deployment Platform**: DigitalOcean App Platform
**Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

## Pre-Deployment (30 minutes before)

### 1. Verify All PRs Merged

```bash
# Fetch latest from main
git fetch origin main

# Check recent commits include all fixes
git log origin/main --oneline -20 | head -20

# Expected commits should include:
# - fix(BUG-040): Handle empty pricing rules
# - fix(BUG-041): Prevent crash on undefined arrays
# - fix(BUG-042): Add product search fields
# - fix(BUG-043): Handle empty permission arrays
# - fix(QA-049): Fix Products page data display
# - fix(QA-050): Fix Samples page data display
```

### 2. Run Full Test Suite

```bash
# Run all unit tests
pnpm test

# Run TypeScript check
pnpm check

# Run E2E tests locally (optional but recommended)
pnpm test:e2e --project=chromium
```

**Expected**: All tests pass with no failures.

### 3. Verify Database Migrations

```bash
# Check for pending migrations
pnpm drizzle-kit check

# Review migration history
ls -la drizzle/migrations/
```

**Expected**: No pending migrations, or migrations reviewed and approved.

### 4. Record Current Deployment

```bash
# If using DigitalOcean CLI (doctl)
doctl apps list --format ID,DefaultIngress

# Save the app ID for potential rollback
# APP_ID: _______________
```

### 5. Notify Team

- [ ] Posted deployment notice in Slack/Teams
- [ ] Confirmed no critical operations in progress
- [ ] Team members aware of potential brief disruption

---

## Deployment

### 1. Trigger Deployment

```bash
# Ensure you're on the main branch with all fixes
git checkout main
git pull origin main

# Push to trigger auto-deploy (if not already pushed)
git push origin main
```

**Note**: DigitalOcean auto-deploys from the main branch.

### 2. Monitor Deployment Progress

1. Open DigitalOcean Dashboard
2. Navigate to Apps > terp-app
3. Watch the "Activity" tab for build progress

**Expected Timeline**:
- Build: ~3-5 minutes
- Deploy: ~1-2 minutes
- Total: ~5-7 minutes

### 3. Watch Build Logs

Look for:
- [ ] `npm install` completes successfully
- [ ] `vite build` completes without errors
- [ ] `esbuild` server bundle created
- [ ] Container starts successfully

### 4. Verify Deployment Complete

```bash
# Check health endpoint (adjust URL as needed)
curl -s https://terp-app-b9s35.ondigitalocean.app/health/live | jq .

# Expected response:
# { "status": "ok", "version": "X.X.X" }
```

If no health endpoint exists, verify via browser that the app loads.

---

## Post-Deployment Verification (15 minutes)

### 1. Run Automated Smoke Tests

```bash
# Run smoke tests against production
pnpm test:smoke:prod

# Or with explicit URL
PLAYWRIGHT_BASE_URL=https://terp-app-b9s35.ondigitalocean.app pnpm test:smoke
```

**Expected**: All smoke tests pass.

### 2. Manual Spot Checks

Follow the abbreviated checklist:

- [ ] **Dashboard loads**: Navigate to /, verify KPIs display
- [ ] **Order Creator (BUG-040)**: Go to /orders/create, select a customer, verify inventory loads
- [ ] **Batch Detail (BUG-041)**: Go to /inventory, click View on a batch, verify drawer opens
- [ ] **Products page (QA-049)**: Go to /products, verify products display in table
- [ ] **Samples page (QA-050)**: Go to /samples, verify samples display
- [ ] **Search (BUG-042)**: Press Cmd+K, search for "OG", verify results appear

### 3. Check Error Monitoring

- [ ] Open Sentry dashboard (if configured)
- [ ] Check for new errors in the last 15 minutes
- [ ] Acceptable: 0 new unique errors related to deployed fixes

### 4. Check Application Logs

```bash
# If using doctl
doctl apps logs <APP_ID> --type run --tail 100

# Look for:
# - No repeated error messages
# - Successful API responses
# - No database connection errors
```

---

## Rollback Procedures

### When to Rollback

| Condition | Action |
|-----------|--------|
| Smoke tests failing on critical path | Rollback |
| Multiple users reporting same issue | Rollback |
| Data corruption detected | Immediate rollback + DB restore |
| Single minor feature broken | Document and monitor |

### Option 1: Git Revert

```bash
# Revert the merge commit
git revert HEAD -m 1
git push origin main

# Wait for auto-deploy
```

### Option 2: DigitalOcean Rollback

```bash
# List recent deployments
doctl apps list-deployments <APP_ID> --format ID,Phase,CreatedAt

# Rollback to previous deployment
doctl apps create-deployment <APP_ID> --force-rebuild
```

### Option 3: Force Previous Deployment

If you saved the previous deployment ID:

```bash
doctl apps create-deployment <APP_ID> --deployment-id <PREVIOUS_DEPLOYMENT_ID>
```

### Post-Rollback Steps

1. [ ] Notify team of rollback
2. [ ] Document the issue that caused rollback
3. [ ] Create bug ticket with details
4. [ ] Plan fix and re-deployment

---

## Database Backup (If Needed)

Before any data-related changes:

```bash
# Create manual backup
pnpm backup:db

# Or using doctl with managed database
doctl databases backups create <DATABASE_ID>
```

---

## Communication Templates

### Deployment Start

```
:rocket: Starting TERP deployment
- Wave 1 bug fixes (BUG-040, 041, 042, 043, QA-049, QA-050)
- Expected duration: ~10 minutes
- Brief service interruption possible
```

### Deployment Complete

```
:white_check_mark: TERP deployment complete
- All smoke tests passing
- No new errors detected
- Full verification checklist passed
```

### Rollback Notice

```
:warning: TERP deployment rolled back
- Issue: [describe issue]
- Current status: Running previous version
- Next steps: [describe plan]
```

---

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Dev Lead | | |
| Backend Developer | | |
| Frontend Developer | | |
| DevOps/Platform | | |
| Product Owner | | |

---

## Post-Deployment Checklist

- [ ] All smoke tests pass
- [ ] Manual verification complete
- [ ] No new errors in monitoring
- [ ] Team notified of success
- [ ] Documentation updated
- [ ] Rollback plan tested (optional)

---

## Appendix: Quick Commands

```bash
# Run smoke tests locally
pnpm test:smoke

# Run smoke tests against staging
PLAYWRIGHT_BASE_URL=https://staging-url pnpm test:smoke

# Run smoke tests against production
pnpm test:smoke:prod

# Run full E2E suite
pnpm test:e2e

# Check TypeScript
pnpm check

# Run all unit tests
pnpm test

# View deployment logs
doctl apps logs <APP_ID> --type run

# Create database backup
pnpm backup:db
```

---

## Post-Deployment Report Template

```
## Deployment Report

**Date**: ___________
**Time**: ___________
**Deployed By**: ___________

### Commits Deployed
- commit1
- commit2
- ...

### Verification Results
- Smoke Tests: PASS / FAIL
- Manual Testing: PASS / FAIL
- Error Rate: Normal / Elevated

### Issues Found
- None / [List issues]

### Rollback Required
- No / Yes (reason: ___________)

### Sign-off
- QA: ___________
- Dev Lead: ___________
```

---

*Last Updated: January 2026*
*Version: 1.0*
