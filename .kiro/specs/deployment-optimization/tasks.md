# Deployment Optimization Tasks (Revised)

## Summary

| Phase | Task                                 | Effort     | Status          |
| ----- | ------------------------------------ | ---------- | --------------- |
| 1     | Fix vite dynamic import              | ✅ DONE    | Complete        |
| 1     | Test dev mode locally                | ✅ DONE    | Complete        |
| 1     | Test prod build locally              | ✅ DONE    | Complete        |
| 1     | Test `pnpm install --prod`           | ⚠️ BLOCKED | See notes       |
| 2     | Create multi-stage Dockerfile        | ✅ DONE    | Complete        |
| 2     | Test Docker build locally            | ✅ DONE    | Complete        |
| 2     | Test container runtime               | ✅ DONE    | Complete        |
| 2     | Deploy Phase 2 and verify            | 🔄 READY   | Ready to deploy |
| 3     | Record baseline build times          | 5 min      | Not Started     |
| 3     | Create DO Container Registry         | 10 min     | Not Started     |
| 3     | **CRITICAL**: Disable DO auto-deploy | 5 min      | Not Started     |
| 3     | Create GitHub Action workflow        | 30 min     | Not Started     |
| 3     | Configure GitHub secrets             | 10 min     | Not Started     |
| 3     | Update DO app.yaml for image deploy  | 15 min     | Not Started     |
| 3     | Test full pipeline                   | 20 min     | Not Started     |
| 3     | Add failure notifications            | 15 min     | Not Started     |

**Phase 1 & 2 Complete** - Ready to deploy multi-stage Dockerfile
**Phase 3** - Optional GitHub Actions pipeline (~2-3 hours additional work)

## Implementation Notes

### Phase 1: Vite Dynamic Import - COMPLETE ✅

**Changes Made:**

1. `server/_core/vite.ts` - Converted static vite imports to dynamic imports
2. `server/_core/index.ts` - Made `setupVite` import dynamic (only in dev mode)
3. `vite.config.ts` - Made dev-only plugins (`jsxLocPlugin`, `vitePluginManusRuntime`) load dynamically

**Limitation Discovered:**

- `pnpm install --prod` still doesn't work because `vite.config.ts` imports `@tailwindcss/vite` and `@vitejs/plugin-react` at the top level
- These are required for the vite build step, so they can't be made fully dynamic
- The multi-stage Dockerfile works around this by copying node_modules from the deps stage

### Phase 2: Multi-Stage Dockerfile - COMPLETE ✅

**New Dockerfile Structure:**

```
Stage 1: base     - Node 20.19-slim + system deps + pnpm
Stage 2: deps     - Install all dependencies (cached layer)
Stage 3: builder  - Build production assets
Stage 4: runner   - Copy node_modules + dist (production runtime)
```

**Benefits:**

- Layer caching: deps layer cached between builds (faster rebuilds)
- Cleaner separation of build vs runtime
- Easier to debug build issues

**Image Size:** ~1.08GB (similar to before, but with better caching)

**Tested:**

- ✅ Docker build succeeds
- ✅ Container starts and serves requests
- ✅ Health endpoints work
- ✅ Dev mode still works locally

---

## Phase 1: Fix Vite Dynamic Import (35 min)

### Task 1.1: Update vite.ts to use dynamic imports ✅ COMPLETE

**File**: `server/_core/vite.ts`
**Status**: ✅ Already implemented

The fix converts static imports to dynamic imports:

```typescript
// BEFORE (static - requires vite at bundle time)
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

// AFTER (dynamic - only loaded when setupVite() is called)
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import("vite");
  const viteConfigModule = await import("../../vite.config.js");
  const viteConfig = viteConfigModule.default;
  // ...
}
```

### Task 1.2: Test development mode

**Effort**: 10 min

```bash
# Start dev server
pnpm dev

# Verify in browser:
# - [ ] Server starts without errors
# - [ ] Hot reload works (edit a component, see change)
# - [ ] Frontend loads correctly
# - [ ] No console errors
```

### Task 1.3: Test production build locally

**Effort**: 10 min

```bash
# Build production
pnpm build

# Start production server
NODE_ENV=production SKIP_SEEDING=true node dist/index.js

# Verify:
# - [ ] Server starts without "Cannot find module 'vite'" error
# - [ ] Static files served correctly
# - [ ] curl http://localhost:3000/health/live returns {"status":"ok"}
# - [ ] curl http://localhost:3000/api/version-check returns version info
```

### Task 1.4: Test `pnpm install --prod`

**Effort**: 5 min

```bash
# Clean install with prod only
rm -rf node_modules
pnpm install --prod

# This should succeed without errors
# Vite should NOT be installed

# Verify vite is not present
ls node_modules/vite 2>/dev/null && echo "FAIL: vite installed" || echo "PASS: vite not installed"

# Restore full deps for development
pnpm install
```

---

## Phase 2: Multi-Stage Dockerfile (1 hour)

### Task 2.1: Create optimized Dockerfile

**File**: `Dockerfile`
**Effort**: 20 min

**Backup current Dockerfile first:**

```bash
cp Dockerfile Dockerfile.backup
```

**Replace with optimized version:**

```dockerfile
# ============================================
# TERP Optimized Multi-Stage Dockerfile
# Version: 2.0 - Enables --prod builds
# ============================================

# ============================================
# Stage 1: Base image with system deps
# ============================================
FROM node:20.19-slim AS base

LABEL build.version="2025-12-17-OPTIMIZED-V2"

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential ca-certificates git openssl pkg-config \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# ============================================
# Stage 2: Dependencies (cached layer)
# ============================================
FROM base AS deps

# Copy ONLY dependency files (maximizes cache hits)
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install ALL dependencies (need devDeps for build)
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# ============================================
# Stage 3: Build
# ============================================
FROM deps AS builder

# Copy source code
COPY . .

# VITE build args
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO
ARG VITE_APP_ID
ARG VITE_SENTRY_DSN

ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Create build version file
RUN echo "BUILD_VERSION=v$(date -u +%Y%m%d-%H%M%S)-$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)" > .build-version && cat .build-version

# Build production assets
RUN pnpm run build:production

# ============================================
# Stage 4: Production runtime (minimal)
# ============================================
FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

# Copy package files for prod install
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install PRODUCTION dependencies only (vite not needed!)
RUN pnpm install --frozen-lockfile --prod || pnpm install --no-frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.build-version ./

# Copy drizzle schema (needed for migrations)
COPY --from=builder /app/drizzle ./drizzle

# Copy only essential scripts (not entire folder)
COPY --from=builder /app/scripts/generate-version.cjs ./scripts/

EXPOSE 3000

CMD ["node", "--max-old-space-size=896", "dist/index.js"]
```

### Task 2.2: Test Docker build locally

**Effort**: 15 min

```bash
# Build with test args
docker build -t terp-optimized \
  --build-arg VITE_APP_TITLE=TERP \
  --build-arg VITE_APP_LOGO=/logo.png \
  --build-arg VITE_APP_ID=terp-app \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_placeholder \
  .

# Check image size (target: < 900MB)
docker images terp-optimized --format "{{.Size}}"

# Verify layers are cached on rebuild (should be fast)
docker build -t terp-optimized \
  --build-arg VITE_APP_TITLE=TERP \
  --build-arg VITE_APP_LOGO=/logo.png \
  --build-arg VITE_APP_ID=terp-app \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_placeholder \
  .
```

### Task 2.3: Test container runtime

**Effort**: 10 min

```bash
# Run container
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e SKIP_SEEDING=true \
  --name terp-test \
  terp-optimized

# Wait for startup
sleep 10

# Test endpoints
curl -s http://localhost:3000/health/live
# Expected: {"status":"ok"}

curl -s http://localhost:3000/api/version-check
# Expected: {"version":"...","build":"BUILD_VERSION=v..."}

# Check logs for errors
docker logs terp-test 2>&1 | grep -i error

# Cleanup
docker stop terp-test && docker rm terp-test
```

### Task 2.4: Deploy Phase 2 and verify

**Effort**: 15 min

```bash
# Commit the new Dockerfile
git add Dockerfile
git commit -m "perf: optimize Dockerfile with multi-stage build

- Convert to multi-stage build (deps → build → runner)
- Enable --prod install in runner stage (~200MB smaller)
- Cache dependency layer for faster rebuilds
- Pin node version to 20.19-slim
- Copy only essential scripts to runner"

git push origin main

# Monitor deployment
./scripts/watch-deploy.sh

# Verify production
curl https://terp-app-b9s35.ondigitalocean.app/health
curl https://terp-app-b9s35.ondigitalocean.app/api/version-check
```

---

## Phase 3: GitHub Actions Build Pipeline (2-3 hours)

### ⚠️ CRITICAL SEQUENCING

**To avoid double deployments, follow this EXACT order:**

1. Record baseline (Task 3.1)
2. Create registry (Task 3.2)
3. **DISABLE DO auto-deploy FIRST** (Task 3.3)
4. Create GHA workflow (Task 3.4)
5. Configure secrets (Task 3.5)
6. Update app.yaml (Task 3.6)
7. Test pipeline (Task 3.7)

### Task 3.1: Record baseline build times

**Effort**: 5 min

```bash
# Check recent deployment times in DO console
# Or use doctl:
doctl apps list-deployments <APP_ID> --format ID,Phase,Progress,CreatedAt

# Record:
# - Current average build time: ___ minutes
# - Current image size: ___ MB
# - Date: ___
```

### Task 3.2: Create DO Container Registry

**Effort**: 10 min

```bash
# Create registry (Starter tier = $5/mo, 500MB storage)
doctl registry create terp-registry --region nyc3

# Get registry info
doctl registry get

# Note the registry URL: registry.digitalocean.com/terp-registry
```

### Task 3.3: ⚠️ CRITICAL - Disable DO auto-deploy

**Effort**: 5 min

**DO THIS BEFORE ENABLING GITHUB ACTIONS!**

Update `.do/app.yaml`:

```yaml
services:
  - name: web
    github:
      repo: EvanTenenbaum/TERP
      branch: main
      deploy_on_push: false # <-- CHANGE THIS TO FALSE
    dockerfile_path: Dockerfile
    # ... rest unchanged
```

```bash
git add .do/app.yaml
git commit -m "chore: disable DO auto-deploy (preparing for GHA pipeline)"
git push origin main
```

### Task 3.4: Create GitHub Action workflow

**File**: `.github/workflows/build-and-deploy.yml`
**Effort**: 30 min

```yaml
name: Build and Deploy to DigitalOcean

on:
  push:
    branches: [main]
    paths-ignore:
      - "docs/**"
      - "*.md"
      - ".kiro/**"
      - "agent-prompts/**"
      - "product-management/**"

env:
  REGISTRY: registry.digitalocean.com
  IMAGE_NAME: terp-registry/terp-app

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to DigitalOcean Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
          password: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:buildcache,mode=max
          build-args: |
            VITE_APP_TITLE=TERP
            VITE_APP_LOGO=/logo.png
            VITE_APP_ID=terp-app
            VITE_CLERK_PUBLISHABLE_KEY=${{ secrets.VITE_CLERK_PUBLISHABLE_KEY }}

      - name: Trigger DigitalOcean deployment
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}" \
            -H "Content-Type: application/json" \
            "https://api.digitalocean.com/v2/apps/${{ secrets.DO_APP_ID }}/deployments"

      - name: Notify on failure
        if: failure()
        run: |
          echo "Build failed! Check GitHub Actions logs."
          # TODO: Add Slack webhook notification here
```

### Task 3.5: Configure GitHub secrets

**Effort**: 10 min

Go to GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

- `DIGITALOCEAN_ACCESS_TOKEN` - DO API token (from DO console → API → Tokens)
- `DO_APP_ID` - App Platform app ID (from `doctl apps list`)
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key

### Task 3.6: Update DO app.yaml for image-based deployment

**File**: `.do/app.yaml`
**Effort**: 15 min

```yaml
name: terp
region: nyc

databases:
  - name: terp-mysql-db
    engine: MYSQL
    production: true
    cluster_name: terp-mysql-db

services:
  - name: web
    # Changed from github/dockerfile to image-based deployment
    image:
      registry_type: DOCR
      repository: terp-app
      tag: latest

    instance_count: 1
    instance_size_slug: basic-xs

    health_check:
      http_path: /health/live
      initial_delay_seconds: 180
      period_seconds: 10
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 5

    http_port: 3000

    routes:
      - path: /

    envs:
      # ... keep all existing env vars ...
```

### Task 3.7: Test full pipeline

**Effort**: 20 min

```bash
# Make a small change to trigger build
echo "# Build test $(date)" >> README.md
git add README.md
git commit -m "test: trigger GHA build pipeline"
git push origin main

# Watch GitHub Actions
# Go to: https://github.com/EvanTenenbaum/TERP/actions

# Verify:
# - [ ] GHA workflow starts
# - [ ] Docker build succeeds
# - [ ] Image pushed to DO registry
# - [ ] DO deployment triggered
# - [ ] Production health check passes

# Check build time improvement
# Compare to baseline from Task 3.1
```

### Task 3.8: Add failure notifications (Optional)

**Effort**: 15 min

Add Slack webhook for build failures:

```yaml
# In .github/workflows/build-and-deploy.yml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1.24.0
  with:
    payload: |
      {
        "text": "🚨 TERP Build Failed!",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Build Failed* for `${{ github.ref_name }}`\n<${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|View Logs>"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Verification Checklist

### After Phase 1

- [ ] `pnpm dev` works (hot reload functional)
- [ ] `pnpm build && NODE_ENV=production node dist/index.js` works
- [ ] `pnpm install --prod` succeeds (vite not installed)
- [ ] No TypeScript errors (`pnpm typecheck`)

### After Phase 2

- [ ] Docker build succeeds locally
- [ ] Image size < 900MB
- [ ] Container starts and serves requests
- [ ] Health endpoints work
- [ ] Production deployment succeeds on DO

### After Phase 3

- [ ] GitHub Action runs on push to main
- [ ] Image pushed to DO Container Registry
- [ ] DO App Platform deploys from registry
- [ ] Build time < 3 minutes (vs ~8 min baseline)
- [ ] Cache hits on subsequent builds
- [ ] No double deployments

---

## Rollback Commands

```bash
# Phase 1: Revert vite.ts (if dev mode breaks)
git checkout HEAD~1 -- server/_core/vite.ts

# Phase 2: Revert Dockerfile
cp Dockerfile.backup Dockerfile
git add Dockerfile
git commit -m "revert: restore original Dockerfile"
git push origin main

# Phase 3: Revert to DO-based builds
# 1. Update .do/app.yaml to use dockerfile_path instead of image
# 2. Set deploy_on_push: true
# 3. Delete or disable the GHA workflow
git checkout HEAD~1 -- .do/app.yaml
rm .github/workflows/build-and-deploy.yml
git add .
git commit -m "revert: restore DO-based builds"
git push origin main
```

---

## Cost Impact

| Item                            | Cost                  |
| ------------------------------- | --------------------- |
| DO Container Registry (Starter) | $5/month              |
| GitHub Actions                  | Free (2000 min/month) |
| **Total additional cost**       | **$5/month**          |

## Expected Results

| Metric             | Before | After   | Improvement          |
| ------------------ | ------ | ------- | -------------------- |
| Build time         | ~8 min | < 3 min | 60%+ faster          |
| Image size         | ~1.1GB | < 800MB | ~300MB smaller       |
| Cache hit rate     | ~0%    | > 80%   | Much faster rebuilds |
| Deploy reliability | Good   | Better  | GHA more reliable    |
