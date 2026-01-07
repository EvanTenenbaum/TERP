# Wave 3: Final Integration & Deploy

**Agent Role**: Lead Developer  
**Duration**: 3-4 hours  
**Priority**: P0 - CRITICAL  
**Deadline**: Day 2 PM - Day 3 AM (Deploy by Thursday morning)  
**Dependencies**: Waves 1A, 1B, 2A, 2B ALL complete

---

## Context

You are the integration lead responsible for merging all Wave 1-2 fixes, running final tests, fixing any remaining issues, and deploying to production before Thursday's user testing deadline.

---

## Prerequisites

Before starting, verify all waves are complete:

- [ ] Wave 1A: BUG-040, BUG-041, BUG-043 fixed
- [ ] Wave 1B: QA-049, QA-050 fixed
- [ ] Wave 2A: BUG-042, BUG-045, BUG-046, BUG-048 fixed
- [ ] Wave 2B: BUG-070 fixed, all navigation verified

---

## Tasks

### Task 1: MERGE-001 - Merge All Wave Branches

**Time Estimate**: 30 minutes

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Merge Wave 1A
git merge fix/wave-1a-critical-crashes --no-ff -m "Merge Wave 1A: Critical crash fixes"

# Merge Wave 1B
git merge fix/wave-1b-data-display --no-ff -m "Merge Wave 1B: Data display fixes"

# Merge Wave 2A
git merge fix/wave-2a-search-forms --no-ff -m "Merge Wave 2A: Search and form fixes"

# Merge Wave 2B
git merge fix/wave-2b-navigation --no-ff -m "Merge Wave 2B: Navigation fixes"

# Resolve any conflicts
# If conflicts, carefully review each file
# Prefer the wave branch changes unless they conflict with each other

# Push merged main
git push origin main
```

**Conflict Resolution Priority**:
1. Wave 1A fixes (critical crashes) take precedence
2. Wave 1B fixes (data display) 
3. Wave 2A fixes (search/forms)
4. Wave 2B fixes (navigation)

---

### Task 2: TEST-001 - Full Regression Test

**Time Estimate**: 1-2 hours

Run through the complete Thursday verification checklist:

#### Critical Path Tests

| Test | Steps | Expected | Pass? |
|------|-------|----------|-------|
| **Order Creation** | Orders → New Order → Select Customer | Inventory loads | ☐ |
| **Order Creation** | Add products, create order | Order created | ☐ |
| **Batch View** | Inventory → Click View on any batch | Drawer opens, no crash | ☐ |
| **Products Display** | Products page | Shows 121 products | ☐ |
| **Samples Display** | Samples page | Shows 6 samples | ☐ |
| **Global Search** | Search "OG Kush" | Finds products | ☐ |
| **Search Clients** | Search client name | Finds clients | ☐ |

#### Navigation Tests

| Link | Works? |
|------|--------|
| Dashboard | ☐ |
| Clients | ☐ |
| Orders | ☐ |
| Invoices | ☐ |
| Products | ☐ |
| Batches/Inventory | ☐ |
| Samples | ☐ |
| Purchase Orders | ☐ |
| Spreadsheet View | ☐ |
| AR/AP | ☐ |
| Credits | ☐ |
| Reports | ☐ |
| Users | ☐ |
| Settings | ☐ |
| Calendar | ☐ |

#### Error Handling Tests

| Test | Expected | Pass? |
|------|----------|-------|
| Retry button (Order Creator) | Preserves form data | ☐ |
| Settings → Users (as demo user) | Shows "permission denied" not "login required" | ☐ |
| No console errors on any page | Clean console | ☐ |

---

### Task 3: FIX-001 - Fix Any Issues Found

**Time Estimate**: 1-2 hours (buffer)

For any issues found during testing:

1. **Assess Severity**:
   - P0: Blocks user testing → Must fix now
   - P1: Degrades experience → Fix if time permits
   - P2: Minor issue → Document for post-Thursday

2. **Quick Fix Process**:
```bash
# Create hotfix branch
git checkout -b hotfix/[issue-description]

# Make fix
# ... edit files ...

# Commit and merge
git add .
git commit -m "hotfix: [description]"
git checkout main
git merge hotfix/[issue-description] --no-ff
git push origin main
```

3. **Document Any Deferred Issues**:
```markdown
## Issues Deferred to Post-Thursday

| Issue | Severity | Reason Deferred |
|-------|----------|-----------------|
| [Description] | P2 | Not blocking user testing |
```

---

### Task 4: DEPLOY-001 - Deploy to Production

**Time Estimate**: 30 minutes

#### Pre-Deploy Checklist

- [ ] All tests pass
- [ ] No P0 issues remaining
- [ ] Main branch is up to date
- [ ] Build succeeds locally

#### Deploy Process

**Option A: DigitalOcean Auto-Deploy (if configured)**
```bash
# Push to main triggers auto-deploy
git push origin main

# Monitor deployment
# Go to DigitalOcean App Platform dashboard
# Watch for successful deployment
```

**Option B: Manual Deploy**
```bash
# SSH to server or use DigitalOcean console
# Pull latest code
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm build

# Restart server
pm2 restart terp
# or
systemctl restart terp
```

#### Post-Deploy Verification

1. **Wait for deployment to complete** (2-5 minutes)

2. **Verify live site**:
   - Go to https://terp-app-b9s35.ondigitalocean.app
   - Run quick smoke test:
     - [ ] Homepage loads
     - [ ] Can navigate to Orders
     - [ ] Can create order (inventory loads)
     - [ ] Can view batch details
     - [ ] Products page shows data
     - [ ] Search works

3. **Check for errors**:
   - Browser console: No errors
   - Server logs: No crashes

4. **Rollback if needed**:
```bash
# If critical issues, rollback to previous deployment
# In DigitalOcean: Deployments → Select previous → Rollback

# Or manually:
git revert HEAD
git push origin main
```

---

## Final Report

Create `docs/qa/THURSDAY_DEPLOY_REPORT.md`:

```markdown
# Thursday Deployment Report

**Date**: January 9, 2026
**Deployed By**: [Name]
**Deployment Time**: [Time]

## Waves Merged
- [x] Wave 1A: Critical crash fixes
- [x] Wave 1B: Data display fixes
- [x] Wave 2A: Search and form fixes
- [x] Wave 2B: Navigation fixes

## Fixes Included
| Bug ID | Description | Status |
|--------|-------------|--------|
| BUG-040 | Order Creator inventory | ✅ Fixed |
| BUG-041 | Batch Detail crash | ✅ Fixed |
| BUG-042 | Global Search | ✅ Fixed |
| BUG-043 | Permission SQL | ✅ Fixed |
| BUG-045 | Retry button | ✅ Fixed |
| BUG-046 | Auth error message | ✅ Fixed |
| BUG-048 | Clients Retry | ✅ Fixed |
| BUG-070 | Spreadsheet 404 | ✅ Fixed |
| QA-049 | Products empty | ✅ Fixed |
| QA-050 | Samples empty | ✅ Fixed |

## Post-Deploy Verification
- [x] Homepage loads
- [x] Order creation works
- [x] Batch viewing works
- [x] Products display
- [x] Samples display
- [x] Search works
- [x] All navigation works

## Known Issues (Deferred)
| Issue | Severity | Notes |
|-------|----------|-------|
| [Any deferred issues] | P2 | [Reason] |

## Ready for User Testing: ✅ YES

## Rollback Plan
If critical issues found during user testing:
1. Go to DigitalOcean App Platform
2. Select previous deployment
3. Click Rollback
```

---

## Success Criteria

- [ ] All wave branches merged successfully
- [ ] All regression tests pass
- [ ] Production deployment successful
- [ ] Live site verified working
- [ ] Deployment report created

---

## Communication

After successful deployment, notify stakeholders:

```
Subject: TERP Ready for User Testing

Hi team,

TERP has been deployed with all critical fixes for Thursday's user testing session.

Key fixes included:
- Order creation now works (inventory loads correctly)
- Batch details view no longer crashes
- Products and Samples pages now display data
- Global search finds products by name
- All navigation links work

The system is ready for user testing at:
https://terp-app-b9s35.ondigitalocean.app

Please report any issues immediately.

Thanks,
[Name]
```
