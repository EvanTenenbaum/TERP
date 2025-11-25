# Latest Build Status

**Last Updated:** 2025-11-25T22:14:59.530Z
**Commit:** `270d2d2571ca02cc43e6114fbea768ec2785fc3e`
**Status:** ❌ FAILED

## ❌ Tests Failed

**Commit:** `270d2d2`
**Branch:** `main`

---

**Database Schema:** ❌ Failed
**Database Seed:** ❌ Failed
**Integration Tests:** ❌ Failed
**E2E Tests:** ❌ Failed
---

## 🚨 Action Required

The main branch build has failed. **All agents must stop work immediately** and check this status.

**How to check this via GitHub CLI:**
```bash
# View this commit's status
gh api repos/EvanTenenbaum/TERP/commits/270d2d2571ca02cc43e6114fbea768ec2785fc3e/comments

# View the workflow run
gh run view 19685684362

# View recent workflow runs
gh run list --limit 5
```

**What to do:**
1. Read the error details in the dropdowns above
2. Pull the latest changes: `git pull origin main`
3. Run the failing tests locally
4. Fix the issues
5. Create a PR with the fix

**Do not push more changes to main until this is fixed.**