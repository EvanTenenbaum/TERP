# Wave 3: Integration, Testing & Deployment (Stability-Focused)

**Agent Role**: Lead Developer / DevOps  
**Duration**: 4-5 hours  
**Priority**: P0 - CRITICAL  
**Deadline**: Day 2 PM - Day 3 AM (Before Thursday)  
**Dependencies**: Wave 1A, 1B, 1C, 2A, 2B complete

---

## Stability Requirements (READ FIRST)

This wave is the FINAL GATE before user testing. MUST:
1. ✅ Verify ALL fixes from previous waves
2. ✅ Run full test suite
3. ✅ Test on staging before production
4. ✅ Have rollback plan ready
5. ✅ Monitor post-deployment

---

## Pre-Integration Checklist

Before starting, verify all waves are complete:

```markdown
## Wave Completion Status

### Wave 1A (Backend Critical)
- [ ] BUG-040 PR merged
- [ ] BUG-041 PR merged
- [ ] BUG-043 PR merged
- [ ] All tests pass

### Wave 1B (Frontend Critical)
- [ ] QA-049 PR merged
- [ ] QA-050 PR merged
- [ ] Root cause documented

### Wave 1C (Test Infrastructure)
- [ ] Smoke tests ready
- [ ] Verification checklist ready
- [ ] Deployment runbook ready

### Wave 2A (Search & Forms)
- [ ] BUG-042 PR merged
- [ ] BUG-045 PR merged
- [ ] BUG-046 PR merged
- [ ] BUG-048 PR merged
- [ ] Database migration ready

### Wave 2B (Navigation)
- [ ] BUG-070 resolved
- [ ] Navigation audit complete
- [ ] Regression tests added
```

---

## Task 1: Merge All Branches

**Time Estimate**: 1 hour

### Merge Order (IMPORTANT)

Merge in this order to avoid conflicts:

```bash
# 1. Start from clean main
git checkout main
git pull origin main

# 2. Merge Wave 1A (backend fixes)
git merge origin/fix/wave-1a-critical-stable --no-ff -m "Merge Wave 1A: Critical backend fixes"

# 3. Merge Wave 1B (frontend fixes)
git merge origin/fix/wave-1b-data-display-stable --no-ff -m "Merge Wave 1B: Data display fixes"

# 4. Merge Wave 1C (test infrastructure)
git merge origin/test/wave-1c-verification --no-ff -m "Merge Wave 1C: Test infrastructure"

# 5. Merge Wave 2A (search & forms)
git merge origin/fix/wave-2a-search-forms-stable --no-ff -m "Merge Wave 2A: Search and form fixes"

# 6. Merge Wave 2B (navigation)
git merge origin/fix/wave-2b-navigation-stable --no-ff -m "Merge Wave 2B: Navigation fixes"
```

### Conflict Resolution

If conflicts occur:

```bash
# See which files conflict
git status

# For each conflicting file:
# 1. Open the file
# 2. Look for <<<<<<< markers
# 3. Decide which version to keep (usually both)
# 4. Remove conflict markers
# 5. Test the file works

git add [resolved-files]
git commit -m "Resolve merge conflicts between Wave X and Wave Y"
```

---

## Task 2: Run Full Test Suite

**Time Estimate**: 30 minutes

```bash
# Run all unit tests
pnpm test

# Expected output:
# Test Suites: X passed, X total
# Tests: X passed, X total

# Run E2E tests
pnpm test:e2e

# Run smoke tests
pnpm test:smoke

# Run type checking
pnpm typecheck

# Run linting
pnpm lint
```

### If Tests Fail

```bash
# Identify failing test
pnpm test --verbose

# Check if it's a new failure or existing
git stash
pnpm test [failing-test-file]
git stash pop

# If new failure: Fix before proceeding
# If existing failure: Document and proceed (if not critical)
```

---

## Task 3: Database Migration

**Time Estimate**: 30 minutes

```bash
# Check for pending migrations
pnpm drizzle-kit check

# Generate migration if needed
pnpm drizzle-kit generate:pg

# Review migration file
cat drizzle/migrations/[latest].sql

# Apply to staging first
DATABASE_URL=$STAGING_DB_URL pnpm drizzle-kit push:pg

# Verify staging
psql $STAGING_DB_URL -c "SELECT indexname FROM pg_indexes WHERE indexname LIKE '%trgm%';"
```

---

## Task 4: Deploy to Staging

**Time Estimate**: 30 minutes

### If Staging Environment Exists

```bash
# Push to staging branch
git push origin main:staging

# Wait for deployment
# Monitor DigitalOcean dashboard

# Verify deployment
curl https://staging.terp-app.../api/health
```

### If No Staging (Deploy to Production with Caution)

```bash
# Note current deployment for rollback
CURRENT_DEPLOY=$(doctl apps list-deployments $APP_ID --format ID --no-header | head -1)
echo "Rollback ID: $CURRENT_DEPLOY"

# Deploy
git push origin main

# Monitor deployment
doctl apps logs $APP_ID --type=deploy -f
```

---

## Task 5: Run Verification Tests

**Time Estimate**: 1 hour

### Automated Smoke Tests

```bash
# Run against deployed environment
TEST_URL=https://terp-app-b9s35.ondigitalocean.app pnpm test:smoke
```

### Manual Verification (Use Checklist from Wave 1C)

```markdown
## Thursday Verification Results

**Tester**: ___________
**Date**: ___________
**Environment**: ___________

### Critical Path Tests

#### 1. Order Creation (BUG-040)
- [ ] Navigate to /orders/create
- [ ] Select customer
- [ ] Inventory loads (no error)
- [ ] Can add items to order
- [ ] Can submit order

**Result**: PASS / FAIL
**Notes**: ___________

#### 2. Batch Detail View (BUG-041)
- [ ] Navigate to /inventory
- [ ] Click View on any batch
- [ ] Drawer opens without crash
- [ ] Locations section visible
- [ ] Audit log section visible

**Result**: PASS / FAIL
**Notes**: ___________

#### 3. Products Page (QA-049)
- [ ] Navigate to /products
- [ ] Products are displayed
- [ ] Count shows 121+ products

**Result**: PASS / FAIL
**Notes**: ___________

#### 4. Samples Page (QA-050)
- [ ] Navigate to /samples
- [ ] Samples are displayed
- [ ] Tab counts are accurate

**Result**: PASS / FAIL
**Notes**: ___________

#### 5. Global Search (BUG-042)
- [ ] Click search icon
- [ ] Search for "OG Kush"
- [ ] Results include products

**Result**: PASS / FAIL
**Notes**: ___________

#### 6. Retry Buttons (BUG-045, BUG-048)
- [ ] Trigger an error (disconnect network)
- [ ] Click Retry
- [ ] Form data preserved
- [ ] Retry works

**Result**: PASS / FAIL
**Notes**: ___________

#### 7. Auth Errors (BUG-046)
- [ ] Access restricted page
- [ ] Error message is specific
- [ ] Not "Authentication required"

**Result**: PASS / FAIL
**Notes**: ___________

### Overall Status

- Total Tests: 7
- Passed: ___
- Failed: ___

**Ready for Thursday**: YES / NO
```

---

## Task 6: Post-Deployment Monitoring

**Time Estimate**: 30 minutes (ongoing)

### Set Up Monitoring

```bash
# Watch server logs
doctl apps logs $APP_ID --type=run -f

# Watch for errors
doctl apps logs $APP_ID --type=run -f | grep -i "error\|warn\|fail"
```

### Check Error Tracking

1. Open Sentry dashboard (if configured)
2. Filter to last 30 minutes
3. Check for new errors
4. Acceptable: 0 new errors related to fixes

### Check Performance

```bash
# Basic response time check
for i in {1..5}; do
  curl -s -o /dev/null -w "%{time_total}\n" https://terp-app-b9s35.ondigitalocean.app/
done

# Expected: < 2 seconds each
```

---

## Rollback Procedure

If critical issues found:

### Option 1: Quick Rollback (Preferred)

```bash
# Rollback to previous deployment
doctl apps create-deployment $APP_ID --deployment-id $CURRENT_DEPLOY

# Wait for rollback
doctl apps logs $APP_ID --type=deploy -f

# Verify
curl https://terp-app-b9s35.ondigitalocean.app/api/health
```

### Option 2: Git Revert

```bash
# Revert all wave merges
git revert HEAD~5..HEAD --no-commit
git commit -m "Rollback: Revert all Thursday fixes due to [issue]"
git push origin main
```

### Option 3: Selective Revert

```bash
# Find problematic commit
git log --oneline -20

# Revert specific commit
git revert [commit-hash]
git push origin main
```

---

## Communication Plan

### Before Deployment

```markdown
**To**: Team
**Subject**: Thursday Deployment Starting

Starting deployment of Thursday fixes:
- BUG-040: Order Creator
- BUG-041: Batch Detail View
- QA-049: Products Page
- QA-050: Samples Page
- BUG-042: Global Search
- BUG-045/048: Retry Buttons
- BUG-046: Auth Errors

ETA: [time]
Rollback plan: Ready
```

### After Successful Deployment

```markdown
**To**: Team
**Subject**: Thursday Deployment Complete ✅

Deployment successful. All fixes verified:
- ✅ Order Creator works
- ✅ Batch Detail View works
- ✅ Products Page shows data
- ✅ Samples Page shows data
- ✅ Search works
- ✅ Retry buttons work
- ✅ Auth errors are specific

Ready for user testing Thursday.
```

### If Rollback Needed

```markdown
**To**: Team
**Subject**: 🚨 Thursday Deployment Rolled Back

Rolled back due to: [issue]

Status: Production is stable on previous version
Next steps: [plan to fix and redeploy]
```

---

## Git Workflow

```bash
# After all merges and verification
git tag -a v1.0.0-thursday -m "Thursday release: Critical bug fixes"
git push origin v1.0.0-thursday

# Update roadmap
git add docs/roadmaps/MASTER_ROADMAP.md
git commit -m "docs: Mark Thursday fixes as complete"
git push origin main
```

---

## Success Criteria

- [ ] All wave branches merged
- [ ] All tests pass
- [ ] Database migration applied
- [ ] Deployed to production
- [ ] All 7 critical fixes verified
- [ ] No new errors in monitoring
- [ ] Rollback plan tested
- [ ] Team notified

---

## Final Checklist Before Thursday

```markdown
## Thursday Readiness Checklist

### Technical
- [ ] All fixes deployed
- [ ] All tests pass
- [ ] No console errors
- [ ] Performance acceptable

### Verification
- [ ] Order creation works
- [ ] Batch details work
- [ ] Products page works
- [ ] Samples page works
- [ ] Search works
- [ ] All navigation works

### Documentation
- [ ] Known issues documented
- [ ] Workarounds documented
- [ ] Support contacts listed

### Rollback
- [ ] Rollback procedure documented
- [ ] Rollback tested
- [ ] Previous deployment ID saved

**Sign-off**: ___________
**Date**: ___________
```
