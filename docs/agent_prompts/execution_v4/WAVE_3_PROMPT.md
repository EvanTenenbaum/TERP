# Wave 3: Integration & Deploy

**Agent Role**: Lead Developer  
**Duration**: 3-4 hours  
**Priority**: P0 - Thursday Deadline  
**Dependencies**: Waves 1A, 1B, 2A, 2B complete

---

## Overview

Merge all Wave 1 and Wave 2 PRs, run integration tests, deploy to production, and verify all critical fixes are working.

---

## Pre-Flight Checklist

```bash
cd /home/ubuntu/TERP
git checkout main
git pull origin main

# Check PR status
gh pr list --state open
```

---

## Task 1: Merge Wave PRs (1.5 hours)

### Merge Order (Important!)

1. **Wave 1A** (Backend fixes) - No dependencies
2. **Wave 1B** (Frontend fixes) - No dependencies  
3. **Wave 2A** (Search fixes) - Depends on 1A
4. **Wave 2B** (Navigation fixes) - No dependencies

### For Each PR

```bash
# Review the PR
gh pr view <PR_NUMBER>
gh pr diff <PR_NUMBER>

# Check CI status
gh pr checks <PR_NUMBER>

# If all checks pass, merge
gh pr merge <PR_NUMBER> --squash --delete-branch

# Pull latest
git pull origin main
```

### Conflict Resolution

If conflicts occur:
```bash
git checkout main
git pull origin main
git checkout <branch-name>
git rebase main

# Fix conflicts in each file
# Then:
git add .
git rebase --continue
git push --force-with-lease
```

---

## Task 2: Run Full Test Suite (30 min)

```bash
# Install dependencies if needed
pnpm install

# Run all tests
pnpm test

# Run type checking
pnpm typecheck

# Run linting
pnpm lint
```

### If Tests Fail

1. Identify failing test
2. Check if it's a real bug or test needs update
3. Fix and commit:
```bash
git add .
git commit -m "fix: Resolve test failures from merge"
git push origin main
```

---

## Task 3: Deploy to Staging (30 min)

### Check DigitalOcean App Status

```bash
# Using MCP
manus-mcp-cli tool call get-deployment --server digitalocean --input '{"app_id": "terp-app-b9s35"}'
```

### Trigger Deployment

Push to main triggers auto-deploy. Monitor:

```bash
# Check deployment logs
manus-mcp-cli tool call get-deployment-logs --server digitalocean --input '{"app_id": "terp-app-b9s35"}'
```

### Wait for Deployment

- Build: ~3-5 minutes
- Deploy: ~2-3 minutes
- Total: ~5-8 minutes

---

## Task 4: Smoke Test All Fixed Flows (45 min)

### Test Checklist

Open https://terp-app-b9s35.ondigitalocean.app and verify:

#### BUG-040: Order Creator Inventory Loading
- [ ] Navigate to Orders → New Order
- [ ] Select a customer
- [ ] Verify inventory loads (no "Failed to load" error)
- [ ] Verify products display with prices

#### BUG-041: Batch Detail View
- [ ] Navigate to Inventory
- [ ] Click "View" on any batch
- [ ] Verify drawer opens without crash
- [ ] Verify locations and audit logs display

#### BUG-042: Global Search
- [ ] Click search icon in header
- [ ] Search for "OG Kush" (or known product name)
- [ ] Verify results include products by name
- [ ] Verify clicking result navigates correctly

#### QA-049: Products Page
- [ ] Navigate to Products
- [ ] Verify products list displays (not empty)
- [ ] Verify count matches database

#### QA-050: Samples Page
- [ ] Navigate to Samples
- [ ] Verify samples list displays (not empty)
- [ ] Verify count matches database

#### BUG-045: Retry Button
- [ ] If any page shows error, click Retry
- [ ] Verify it retries without full page reload
- [ ] Verify form data is preserved

#### Navigation
- [ ] All sidebar links work (no 404s)
- [ ] All modals open and close
- [ ] Dark mode toggle works

---

## Task 5: Production Deployment (30 min)

### If All Smoke Tests Pass

Production deploys automatically from main. Verify:

1. Check deployment status in DigitalOcean
2. Wait for healthy status
3. Run smoke tests on production URL

### Rollback Plan

If critical issues found:

```bash
# Find last known good commit
git log --oneline -10

# Revert to previous commit
git revert HEAD
git push origin main

# Or revert specific PR
git revert -m 1 <merge-commit-hash>
git push origin main
```

---

## Task 6: Post-Deployment Verification (15 min)

### Monitor for Errors

1. Check browser console for JavaScript errors
2. Check network tab for failed API calls
3. Check DigitalOcean logs for server errors

### Document Any Issues

If issues found, create GitHub issue:

```bash
gh issue create --title "Post-deploy issue: <description>" --body "
## Description
<what's wrong>

## Steps to Reproduce
1. ...

## Expected Behavior
...

## Actual Behavior
...

## Priority
P0/P1/P2
"
```

---

## Success Criteria

- [ ] All 4 PRs merged to main
- [ ] All tests passing
- [ ] Deployment successful
- [ ] BUG-040 fixed (Order Creator works)
- [ ] BUG-041 fixed (Batch Detail works)
- [ ] BUG-042 fixed (Search works)
- [ ] QA-049 fixed (Products show)
- [ ] QA-050 fixed (Samples show)
- [ ] No new errors in console
- [ ] No new 404s

---

## Handoff

After Wave 3 completion:

1. Update MASTER_ROADMAP.md to mark bugs as DONE
2. Notify team that Thursday build is ready
3. Document any known issues for user training
4. Prepare for Wave 4 (Stability) to begin

```bash
# Update roadmap
git add docs/roadmaps/MASTER_ROADMAP.md
git commit -m "docs: Mark Wave 1-3 bugs as complete"
git push origin main
```

**Next**: Wave 4A/4B/4C/4D (4 parallel agents for Stability)
