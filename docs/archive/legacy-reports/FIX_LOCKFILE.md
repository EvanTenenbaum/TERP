# Fix TERP Lockfile - Required for Deployment

## Problem

The Heroku buildpack runs `pnpm install --frozen-lockfile` before our build command, and the lockfile is out of sync with `package.json`.

## Solution

Update `pnpm-lock.yaml` to match `package.json`.

## Quick Fix

```bash
cd /Users/evan/spec-erp-docker/TERP/TERP

# Install pnpm if needed
npm install -g pnpm

# Update lockfile
pnpm install

# Commit and push
git add pnpm-lock.yaml
git commit -m "fix: Sync pnpm-lock.yaml with package.json"
git push origin main
```

## Alternative: Use Script

```bash
cd /Users/evan/spec-erp-docker/TERP/TERP
./scripts/update-lockfile-and-deploy.sh
```

## Verify Fix

After pushing, check DigitalOcean deployment:
```bash
doctl apps list-deployments 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --format ID,Phase --no-header | head -1
```

The deployment should show `ACTIVE` instead of `ERROR`.

## Prevention

The GitHub Action `.github/workflows/update-lockfile.yml` will automatically create a PR to update the lockfile when `package.json` changes.

