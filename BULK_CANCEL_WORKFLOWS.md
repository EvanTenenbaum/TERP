# Bulk Cancel Queued Workflows - Quick Guide

**Problem:** Too many workflows queued after pushing branch.

**Fastest Solution:** Cancel them in bulk via GitHub UI or API.

---

## 🚀 Quick Fix (GitHub UI)

### Method 1: Cancel All Queued (Fastest)
1. Go to: https://github.com/EvanTenenbaum/TERP/actions
2. Click "All workflows" dropdown (top left)
3. Filter by status: **"Queued"**
4. For each workflow:
   - Click on it
   - Click **"Cancel workflow"** button (top right)
   - Confirm

### Method 2: Cancel by Workflow Type
Focus on canceling these (they shouldn't have triggered):
- **"Sync pnpm-lock.yaml"** - Only needed for package.json changes
- **"Update Lockfile on Package.json Changes"** - Redundant with sync-lockfile.yml
- **"Deploy Watchdog"** - Only needed for actual code changes

**Keep these running:**
- **"Pre-Merge Quality Gate"** - Needed for PRs
- **"Main Branch CI/CD"** - Needed for main branch

---

## 🔧 Using GitHub CLI (If Available)

```bash
# Cancel all queued runs
gh run list --status=queued --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run cancel {}

# Or cancel specific workflows
gh run list --workflow="Sync pnpm-lock.yaml" --status=queued --json databaseId --jq '.[].databaseId' | \
  xargs -I {} gh run cancel {}
```

---

## 🗑️ Disable Redundant Workflow

The `update-lockfile.yml` workflow is **redundant** with our new `sync-lockfile.yml`. 

**Option:** Delete or disable `update-lockfile.yml` to prevent future conflicts.

**To disable:**
1. Rename: `.github/workflows/update-lockfile.yml` → `.github/workflows/update-lockfile.yml.disabled`
2. Or delete it entirely (we have `sync-lockfile.yml` now)

---

## ✅ What I Fixed

I've updated workflows to prevent unnecessary triggers:
- ✅ `sync-lockfile.yml` - Only triggers on `package.json` changes
- ✅ `update-lockfile.yml` - Ignores workflow file paths
- ✅ `deploy-watchdog.yml` - Ignores workflow files and docs

**Future pushes won't trigger these unnecessarily.**

---

## 📊 Current Situation

**Queued workflows are likely:**
- From the initial push of workflow files
- Will skip/fail quickly (no package.json changed)
- Can be safely canceled

**Recommendation:** Cancel the queued `sync-lockfile` and `update-lockfile` workflows - they don't need to run.

---

**After canceling, the PR is ready to merge:**
https://github.com/EvanTenenbaum/TERP/compare/main...fix-lockfile-workflows-clean

