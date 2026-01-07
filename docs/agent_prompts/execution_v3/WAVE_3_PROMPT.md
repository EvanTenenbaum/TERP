# Wave 3: Integration & Deploy

**Agent Role**: Lead Developer  
**Duration**: 4-5 hours  
**Priority**: P0 - Thursday Deadline  
**Timeline**: Thursday PM - Friday AM  
**Dependencies**: Waves 1-2 complete

---

## Overview

Merge all Wave 1-2 work, run comprehensive tests, deploy to production, and verify all fixes are working on the live site.

---

## Pre-Flight Checklist

Before starting, verify:

- [ ] Wave 1A PR merged (BUG-040, 041, 043)
- [ ] Wave 1B PR ready (QA-049, QA-050)
- [ ] Wave 1C tests written
- [ ] Wave 2A PR ready (BUG-042, 045, 046, 048)
- [ ] Wave 2B PR ready (BUG-070, navigation fixes)

---

## Task 1: Merge All PRs (30 minutes)

### Merge Order (Critical)

```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Check open PRs
gh pr list --state open

# 3. Merge in dependency order
# Wave 1B (frontend data display)
gh pr merge [PR_NUMBER] --merge --delete-branch

# Wave 1C (test infrastructure)
gh pr merge [PR_NUMBER] --merge --delete-branch

# Wave 2A (search & forms)
gh pr merge [PR_NUMBER] --merge --delete-branch

# Wave 2B (navigation)
gh pr merge [PR_NUMBER] --merge --delete-branch

# 4. Pull merged changes
git pull origin main
```

### Conflict Resolution

If conflicts occur:

```bash
# Checkout the PR branch
git checkout fix/wave-2a-search

# Rebase onto latest main
git fetch origin main
git rebase origin/main

# Resolve conflicts, then
git add .
git rebase --continue

# Force push the rebased branch
git push origin fix/wave-2a-search --force

# Then merge via GH CLI
gh pr merge [PR_NUMBER] --merge --delete-branch
```

---

## Task 2: Run Full Test Suite (30 minutes)

### Local Test Execution

```bash
cd /home/ubuntu/TERP

# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit          # Unit tests
pnpm test:integration   # Integration tests
pnpm test:e2e          # E2E tests (if configured)

# Check TypeScript
pnpm typecheck

# Check linting
pnpm lint
```

### Expected Results

```
✓ pricingEngine.test.ts (all passing)
✓ permissionService.test.ts (all passing)
✓ BatchDetailDrawer.test.tsx (all passing)
✓ ProductsPage.test.tsx (all passing)
✓ SampleManagement.test.tsx (all passing)
✓ smoke.spec.ts (all passing)
```

### If Tests Fail

1. Identify failing test
2. Check if it's a real bug or test issue
3. If real bug: create hotfix branch, fix, PR, merge
4. If test issue: fix test, commit directly to main
5. Re-run full suite

---

## Task 3: Deploy to Staging (30 minutes)

### DigitalOcean App Platform

```bash
# Check current deployment status
doctl apps list

# Get app ID
APP_ID=$(doctl apps list --format ID --no-header)

# Trigger deployment
doctl apps create-deployment $APP_ID

# Monitor deployment
doctl apps get-deployment $APP_ID [DEPLOYMENT_ID]
```

### Alternative: Git Push Deploy

If auto-deploy is configured:

```bash
# Push to main triggers deploy
git push origin main

# Monitor in DO dashboard
# https://cloud.digitalocean.com/apps
```

### Verify Staging

```bash
# Check staging URL
STAGING_URL="https://terp-app-staging-xxxxx.ondigitalocean.app"

# Quick health check
curl -s "$STAGING_URL/api/health" | jq .
```

---

## Task 4: Execute Smoke Tests on Staging (45 minutes)

### Automated Smoke Tests

```bash
# Run Playwright smoke tests against staging
STAGING_URL="https://terp-app-staging-xxxxx.ondigitalocean.app" pnpm test:smoke
```

### Manual Verification Checklist

Use the verification checklist at `tests/manual/THURSDAY_VERIFICATION_CHECKLIST.md`:

#### Critical Path Tests

| Test | Steps | Expected | Pass? |
|------|-------|----------|-------|
| **Order Creator** | 1. Go to /orders/create<br>2. Select customer<br>3. Wait for inventory | Inventory loads, no error | ⬜ |
| **Batch Detail** | 1. Go to /inventory<br>2. Click View on any batch | Drawer opens, no crash | ⬜ |
| **Products Page** | 1. Go to /products | Products display (not empty) | ⬜ |
| **Samples Page** | 1. Go to /samples | Samples display (not empty) | ⬜ |
| **Global Search** | 1. Search for "OG Kush" | Results found | ⬜ |
| **Retry Buttons** | 1. Trigger error<br>2. Click Retry | Retries without page reload | ⬜ |

### If Smoke Tests Fail

1. Identify the failure
2. Check server logs: `doctl apps logs $APP_ID --type run`
3. If critical: DO NOT proceed to production
4. Create hotfix, merge, redeploy staging
5. Re-run smoke tests

---

## Task 5: Deploy to Production (30 minutes)

### Pre-Production Checklist

- [ ] All staging smoke tests pass
- [ ] No errors in staging logs
- [ ] Team notified of deployment
- [ ] Rollback plan ready

### Production Deployment

```bash
# Production app ID
PROD_APP_ID="your-production-app-id"

# Create deployment
doctl apps create-deployment $PROD_APP_ID

# Monitor
watch -n 5 "doctl apps get-deployment $PROD_APP_ID [DEPLOYMENT_ID] --format Phase"
```

### Deployment Phases

1. **PENDING_BUILD** - Building container
2. **BUILDING** - Build in progress
3. **PENDING_DEPLOY** - Ready to deploy
4. **DEPLOYING** - Rolling out
5. **ACTIVE** - Deployment complete

---

## Task 6: Verify Production (1 hour)

### Immediate Verification

```bash
PROD_URL="https://terp-app-b9s35.ondigitalocean.app"

# Health check
curl -s "$PROD_URL/api/health" | jq .

# Check for errors in logs
doctl apps logs $PROD_APP_ID --type run --tail 100
```

### Full Verification Checklist

| Bug ID | Test | Steps | Status |
|--------|------|-------|--------|
| BUG-040 | Order Creator | Select customer, verify inventory loads | ⬜ |
| BUG-041 | Batch Detail | Click View on batch, verify no crash | ⬜ |
| BUG-042 | Global Search | Search "OG Kush", verify results | ⬜ |
| BUG-043 | Permissions | (Verified via tests) | ⬜ |
| BUG-045 | Order Retry | Trigger error, click Retry | ⬜ |
| BUG-046 | Auth Errors | Check Settings > Users error message | ⬜ |
| BUG-048 | Clients Retry | Trigger error, click Retry | ⬜ |
| BUG-070 | Spreadsheet | Navigate to /spreadsheet | ⬜ |
| QA-049 | Products | Verify products display | ⬜ |
| QA-050 | Samples | Verify samples display | ⬜ |

### Monitor for 30 Minutes

```bash
# Watch error logs
doctl apps logs $PROD_APP_ID --type run -f | grep -i error

# Check application metrics in DO dashboard
```

---

## Task 7: Update Documentation (30 minutes)

### Update MASTER_ROADMAP.md

```bash
cd /home/ubuntu/TERP

# Update bug statuses
sed -i 's/BUG-040.*🔴 OPEN/BUG-040 | Order Creator inventory | ✅ FIXED/' docs/roadmaps/MASTER_ROADMAP.md
sed -i 's/BUG-041.*🔴 OPEN/BUG-041 | Batch Detail View | ✅ FIXED/' docs/roadmaps/MASTER_ROADMAP.md
# ... repeat for all fixed bugs

# Commit
git add docs/roadmaps/MASTER_ROADMAP.md
git commit -m "docs: Mark Wave 1-2 bugs as fixed after production deploy"
git push origin main
```

### Create Deployment Record

```bash
cat > docs/deployments/$(date +%Y-%m-%d)_wave3_deploy.md << 'EOF'
# Wave 3 Deployment Record

**Date**: $(date)
**Deployer**: [Agent Name]
**Version**: [Git SHA]

## Changes Deployed

- BUG-040: Order Creator inventory loading
- BUG-041: Batch Detail View crash
- BUG-042: Global Search
- BUG-043: Permission Service SQL
- BUG-045: Order retry button
- BUG-046: Auth error messages
- BUG-048: Clients retry button
- BUG-070: Spreadsheet View
- QA-049: Products page
- QA-050: Samples page

## Verification

All smoke tests passed ✅

## Issues

None

## Rollback

Not required
EOF

git add docs/deployments/
git commit -m "docs: Add Wave 3 deployment record"
git push origin main
```

---

## Rollback Procedure

If critical issues are found in production:

### Quick Rollback

```bash
# Get previous deployment ID
doctl apps list-deployments $PROD_APP_ID

# Rollback to previous
doctl apps create-deployment $PROD_APP_ID --wait --force-rebuild=false

# Or via git
git revert HEAD
git push origin main
```

### Notify Team

```
Subject: [TERP] Production Rollback - Wave 3

Issue: [Description]
Action: Rolled back to previous deployment
Status: Investigating
ETA: [Time]
```

---

## Success Criteria

- [ ] All Wave 1-2 PRs merged
- [ ] All tests passing
- [ ] Staging verified
- [ ] Production deployed
- [ ] All 10 fixes verified on production
- [ ] No new errors in logs
- [ ] Documentation updated
- [ ] Team notified

---

## Handoff

After Wave 3 completion:

1. Update Slack/Discord with deployment status
2. Share verification results
3. Flag any issues for Wave 4
4. Confirm Thursday deadline met

**Next**: Wave 4A (SQL Safety), Wave 4B (Empty States), Wave 4C (Silent Errors) - can run in parallel
