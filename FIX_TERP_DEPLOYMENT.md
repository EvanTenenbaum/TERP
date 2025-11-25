# Fix TERP Deployment - Lockfile Issue

## Problem

TERP app deployment is failing with:
```
ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because 
pnpm-lock.yaml is not up to date with package.json
```

## Root Cause

Heroku buildpack runs `pnpm install --frozen-lockfile` BEFORE our `build_command` executes. The lockfile is out of sync with `package.json`.

## Solution

Update `pnpm-lock.yaml` to match `package.json`.

## Steps

1. **Update lockfile:**
   ```bash
   cd /Users/evan/spec-erp-docker/TERP/TERP
   pnpm install
   ```

2. **Commit and push:**
   ```bash
   git add pnpm-lock.yaml
   git commit -m "fix: Sync pnpm-lock.yaml with package.json"
   git push origin main
   ```

3. **Monitor deployment:**
   ```bash
   TERP_APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
   doctl apps list-deployments $TERP_APP_ID --format ID,Phase,Created --no-header | head -1
   ```

## Verification

After pushing, check deployment status. Should show `ACTIVE` instead of `ERROR`.

## Prevention

The GitHub Action `.github/workflows/update-lockfile.yml` will automatically create a PR to update the lockfile when `package.json` changes.

