# TERP Deployment Fix - Complete Instructions

**Date:** 2025-11-25  
**Status:** Ready for Execution  
**Priority:** 🔴 CRITICAL

---

## 🚨 Problem

TERP app deployment is failing with lockfile error:
```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because 
pnpm-lock.yaml is not up to date with package.json
```

**Root Cause:** Heroku buildpack runs `pnpm install --frozen-lockfile` BEFORE our `build_command` executes.

---

## ✅ Solution

Update `pnpm-lock.yaml` to match `package.json`.

---

## 📋 Execution Steps

### Step 1: Navigate to TERP Directory

```bash
cd /Users/evan/spec-erp-docker/TERP/TERP
```

### Step 2: Install/Update pnpm (if needed)

```bash
# Option A: Using corepack (Node.js 16.9+)
corepack enable
corepack prepare pnpm@latest --activate

# Option B: Using npm
npm install -g pnpm

# Verify
pnpm --version
```

### Step 3: Update Lockfile

```bash
pnpm install
```

This will:
- Read `package.json`
- Resolve all dependencies
- Update `pnpm-lock.yaml` to match

### Step 4: Verify Lockfile Updated

```bash
git status
# Should show: modified: pnpm-lock.yaml
```

### Step 5: Commit and Push

```bash
git add pnpm-lock.yaml
git commit -m "fix: Sync pnpm-lock.yaml with package.json

Resolves ERR_PNPM_OUTDATED_LOCKFILE deployment error.
Heroku buildpack requires lockfile to be in sync with package.json."
git push origin main
```

### Step 6: Monitor Deployment

```bash
TERP_APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"

# Check deployment status
doctl apps list-deployments $TERP_APP_ID --format ID,Phase,Created --no-header | head -1

# Watch for ACTIVE status (takes 2-5 minutes)
# If ERROR, check logs:
LATEST_DEPLOY=$(doctl apps list-deployments $TERP_APP_ID --format ID --no-header | head -1)
doctl apps logs $TERP_APP_ID --type=build --deployment=$LATEST_DEPLOY | tail -30
```

---

## ✅ Success Criteria

- [ ] `pnpm install` completes without errors
- [ ] `pnpm-lock.yaml` is updated (git shows it as modified)
- [ ] Changes committed and pushed to main
- [ ] New deployment triggered automatically
- [ ] Deployment shows `ACTIVE` status (not `ERROR`)
- [ ] TERP app is accessible and functional

---

## 🔍 Verification

After deployment succeeds:

```bash
# Check app is running
TERP_APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
doctl apps get $TERP_APP_ID --format ActiveDeployment.Phase

# Check runtime logs
doctl apps logs $TERP_APP_ID --type=run | tail -20
```

---

## 📝 Notes

- **Why this happens:** Heroku buildpack auto-detects `pnpm-lock.yaml` and runs `pnpm install --frozen-lockfile` before our custom `build_command`
- **Prevention:** The GitHub Action `.github/workflows/update-lockfile.yml` will auto-update lockfile when `package.json` changes
- **Future:** Consider adding pre-commit hook to validate lockfile sync

---

## 🆘 Troubleshooting

### "pnpm: command not found"
- Install pnpm: `npm install -g pnpm` or use corepack

### "Lockfile still out of sync after pnpm install"
- Delete `pnpm-lock.yaml` and `node_modules/`
- Run `pnpm install` again

### "Deployment still fails after lockfile update"
- Check build logs for other errors
- Verify `package.json` is valid JSON
- Ensure all dependencies in `package.json` are valid

---

**This fix is required for TERP app to deploy successfully.**

