# How to Cancel Queued Workflows

**Problem:** Tons of workflows are queued after pushing the branch.

**Solution:** Cancel unnecessary workflows in GitHub Actions.

---

## Quick Fix

### Option 1: Cancel All Queued (Fastest)
1. Go to: https://github.com/EvanTenenbaum/TERP/actions
2. Click on any queued workflow run
3. Click "Cancel workflow" (top right)
4. Repeat for other queued workflows

### Option 2: Cancel Specific Workflows
1. Go to: https://github.com/EvanTenenbaum/TERP/actions
2. Filter by workflow name (e.g., "Sync pnpm-lock.yaml")
3. Cancel all queued runs for that workflow

### Option 3: Wait It Out
- Workflows will process in queue order
- Most will fail or skip (no package.json changes)
- Not ideal but will clear eventually

---

## What I Fixed

I've updated the workflows to **not trigger on workflow file changes**:

1. ✅ `sync-lockfile.yml` - Only triggers on `package.json` changes
2. ✅ `update-lockfile.yml` - Ignores `.github/workflows/**` paths
3. ✅ `deploy-watchdog.yml` - Ignores workflow files and docs

**Future pushes won't trigger these unnecessarily.**

---

## Why This Happened

When we pushed the workflow files, several workflows triggered:
- `sync-lockfile.yml` (shouldn't have - now fixed)
- `update-lockfile.yml` (shouldn't have - now fixed)
- `merge.yml` (runs on all main pushes - expected)
- `deploy-watchdog.yml` (shouldn't have - now fixed)

The fixes are pushed, so future pushes won't have this issue.

---

**Recommendation:** Cancel the queued `sync-lockfile` and `update-lockfile` workflows since they don't need to run (no package.json changed).

