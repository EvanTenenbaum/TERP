# Latest Build Status

**Last Updated:** 2025-11-25T19:41:19.221Z
**Commit:** `d2a00411b2eb7858ee635028a1e5717675dcdceb`
**Status:** ❌ FAILED

## ❌ Tests Failed

**Commit:** `d2a0041`
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
gh api repos/EvanTenenbaum/TERP/commits/d2a00411b2eb7858ee635028a1e5717675dcdceb/comments

# View the workflow run
gh run view 19681962104

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