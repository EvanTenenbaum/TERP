# Fix TERP Deployment (Docker Workflow)

## Problem

DigitalOcean App Platform originally built TERP with the Heroku buildpack, which
always ran `pnpm install --frozen-lockfile` before our custom build command. Any
lockfile drift caused immediate `ERR_PNPM_OUTDATED_LOCKFILE` failures.

## Root Cause

The buildpack behavior cannot be disabled. Even when we tried to run
`pnpm install --no-frozen-lockfile` later, the build had already failed.
Production deploys were therefore blocked whenever `pnpm-lock.yaml` lagged
behind `package.json`.

## Solution

We now deploy TERP via Docker:

- Root-level `Dockerfile` installs pnpm, installs deps (with a fallback for
  frozen lockfile errors), runs `pnpm run build:production`, and exposes port
  3000.
- `.do/app.yaml` points App Platform at that Dockerfile using
  `dockerfile_path: Dockerfile`.
- Because we control the image, the build no longer relies on the Heroku
  buildpack.

Lockfile hygiene is still important, but the Docker workflow prevents hard
failures when the lockfile needs regeneration.

## Deployment Steps

1. **Verify Docker assets**
   - `Dockerfile` present in repo root
   - `.do/app.yaml` contains `dockerfile_path: Dockerfile`

2. **Commit & push code**
   ```bash
   cd /Users/evan/spec-erp-docker/TERP/TERP
   git status
   git add <files>
   git commit -m "feat: …"
   git push origin main
   ```

3. **Apply spec changes when needed**
   ```bash
   TERP_APP_ID="1fd40be5-b9af-4e71-ab1d-3af0864a7da4"
   doctl apps update $TERP_APP_ID --spec .do/app.yaml
   ```

4. **Monitor deployment**
   ```bash
   doctl apps list-deployments $TERP_APP_ID --format ID,Phase,Created --no-header | head -1
   ```
   Deployment is successful when the latest ID shows `ACTIVE`. You can also
   verify https://terp-app-b9s35.ondigitalocean.app loads.

## Prevention

Two GitHub Actions keep the lockfile tidy even though Docker no longer forces
`--frozen-lockfile`:

- `.github/workflows/sync-lockfile.yml` – auto-updates the lockfile whenever
  `package.json` changes.
- `.github/workflows/fix-lockfile-now.yml` – manual workflow you can trigger to
  regenerate the lockfile in CI on demand.

