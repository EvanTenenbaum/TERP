# How to Create the PR - Step by Step

## On the GitHub Page You're Seeing:

### Step 1: Select Branches
1. **Base branch:** Should be `main` (already selected, likely)
2. **Compare branch:** Select `add-lockfile-sync-workflows` from the dropdown
   - Click the branch selector (probably says "main" or shows a branch icon)
   - Type or select: `add-lockfile-sync-workflows`

### Step 2: Review Changes
- You should see the files we added:
  - `.github/workflows/sync-lockfile.yml`
  - `.github/workflows/fix-lockfile-now.yml`
  - Documentation files
- Review to confirm these are the right changes

### Step 3: Click "Create pull request"
- Click the green **"Create pull request"** button in the yellow banner

### Step 4: Fill in PR Details
**Title:**
```
feat: Add GitHub Actions workflows to auto-sync pnpm-lock.yaml
```

**Description:**
```
## 🔴 CRITICAL FIX - Deployment Blocker

This PR adds GitHub Actions workflows to automatically sync `pnpm-lock.yaml` with `package.json`, resolving the `ERR_PNPM_OUTDATED_LOCKFILE` deployment error.

### Problem
- TERP deployment fails with lockfile out of sync error
- Heroku buildpack runs `pnpm install --frozen-lockfile` before our build command
- Environment variables don't override buildpack behavior
- Requires manual `pnpm install` on local machine (not always available)

### Solution
Two GitHub Actions workflows:

1. **`sync-lockfile.yml`** (Automatic):
   - Runs on `package.json` changes
   - Daily schedule (2 AM UTC) to catch drift
   - Manual trigger available
   - Tries direct push, creates PR if branch protection blocks

2. **`fix-lockfile-now.yml`** (Manual):
   - Manual trigger only
   - Always creates PR (safer)
   - For immediate fixes

### Features
- ✅ Works from anywhere (no local dependencies)
- ✅ Uses `pnpm install --lockfile-only` (efficient)
- ✅ Handles branch protection automatically
- ✅ Based on industry best practices
- ✅ Third-party research validated

### Next Steps After Merge
1. Go to Actions → "Fix Lockfile Now"
2. Run workflow to create PR with current lockfile fix
3. Merge that PR to fix current deployment blocker
4. Future: Automatic sync on `package.json` changes

### Files Added
- `.github/workflows/sync-lockfile.yml`
- `.github/workflows/fix-lockfile-now.yml`
- `LOCKFILE_SYNC_SOLUTION.md` (complete guide)
- `QUICK_START_FIX_LOCKFILE.md` (quick reference)

**This is a critical deployment blocker fix - please merge ASAP.**
```

### Step 5: Submit PR
- Click **"Create pull request"** button at the bottom

---

## After PR is Created:

1. **Wait for PR to be created** (should happen immediately)
2. **Merge the PR** (if you have permissions, or wait for review)
3. **Then run the workflow:**
   - Go to: Actions → "Fix Lockfile Now (Manual Trigger)"
   - Click "Run workflow"
   - This will create another PR to fix the current lockfile issue
   - Merge that PR to fix TERP deployment

---

**That's it! The workflows will handle everything automatically after this.**

