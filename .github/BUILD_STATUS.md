# Latest Build Status

**Last Updated:** 2025-11-25T18:06:07.236Z
**Commit:** `032a921ef80e3829acfaefba2f80fab589891ccf`
**Status:** ❌ FAILED

## ❌ Tests Failed

**Commit:** `032a921`
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
gh api repos/EvanTenenbaum/TERP/commits/032a921ef80e3829acfaefba2f80fab589891ccf/comments

# View the workflow run
gh run view 19679410545

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