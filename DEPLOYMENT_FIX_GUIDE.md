# DigitalOcean Deployment Fix Guide

## Problem Summary

The seed database button fix (commit 30fc864b) is not deploying to production because:

1. **Build cache corruption** - DigitalOcean is caching old dependencies
2. **Import path was wrong** - Fixed in commit 30fc864b (`../trpc` → `../_core/trpc`)
3. **Force rebuild without cache clear** - Previous manual deployment didn't clear cache

## Research-Backed Solution

Based on official DigitalOcean documentation and tRPC GitHub issues, here's the fix:

### Step 1: Force Rebuild WITH Cache Clear ✅

**Critical:** You MUST check the "clear build cache" option!

1. Go to DigitalOcean → Apps → terp-app
2. Click **Actions** → **Force Rebuild and Deploy**
3. **✅ CHECK the box: "Clear build cache"** (THIS IS CRITICAL!)
4. Click **Force Rebuild and Deploy**

**Why this works:**
- Clears corrupted cached dependencies
- Forces fresh `pnpm install`
- Rebuilds with latest code (commit 30fc864b with correct import path)

### Step 2: Monitor Build Logs

Watch the build logs for:
- ✅ `pnpm install` completes successfully
- ✅ No "Missing trpc export" error
- ✅ Build completes without errors
- ✅ Deployment succeeds

### Step 3: Test Seed Button

Once deployed:
1. Navigate to https://terp-app-b9s35.ondigitalocean.app/settings
2. Click Database tab
3. Click "Seed Database"
4. Confirm
5. **Expected:** Success toast, no 500 errors

## Alternative Solutions (If Step 1 Fails)

### Option A: Use DigitalOcean CLI

```bash
# Install doctl if not already installed
brew install doctl  # macOS
# or
snap install doctl  # Linux

# Authenticate
doctl auth init

# Get app ID
doctl apps list

# Force rebuild with cache clear
doctl apps create-deployment <app-id> --force-rebuild
```

### Option B: Use DigitalOcean API

```bash
# Get your app ID from the dashboard
APP_ID="your-app-id"

# Create deployment with force rebuild
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  "https://api.digitalocean.com/v2/apps/${APP_ID}/deployments" \
  -d '{"force_build": true}'
```

### Option C: Switch to Dockerfile (Last Resort)

If buildpack continues to fail, create a `Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start
CMD ["pnpm", "start"]
```

Then update `.do/app.yaml` to use Dockerfile instead of buildpack.

## Technical Background

### Why the Import Path Matters

The error "Missing trpc export" occurred because:

```typescript
// ❌ WRONG (old code)
import { router, publicProcedure } from "../trpc";
// Looks for: server/trpc.ts (doesn't exist)

// ✅ CORRECT (commit 30fc864b)
import { router, publicProcedure } from "../_core/trpc";
// Looks for: server/_core/trpc.ts (exists!)
```

### Why Cache Clearing Is Critical

DigitalOcean App Platform caches:
- `node_modules/` directory
- Build artifacts
- Dependency resolution results

If the cache contains:
- Old broken code
- Corrupted dependencies  
- Wrong import paths

...then even correct new code won't fix it!

**Solution:** Clear the cache to force fresh build from scratch.

## Expected Timeline

- **Cache clear + rebuild:** 5-10 minutes
- **Deployment:** 2-3 minutes
- **Total:** ~15 minutes max

## Success Criteria

✅ Build logs show no errors  
✅ Deployment completes successfully  
✅ Seed button works (no 500 errors)  
✅ Database seeding executes  
✅ Success toast appears  

## Verification Commands

After deployment, verify the fix worked:

```bash
# Check if the endpoint responds
curl -X POST https://terp-app-b9s35.ondigitalocean.app/api/trpc/settings.seedDatabase \
  -H "Content-Type: application/json" \
  -d '{"scenario":"light"}'

# Should return success, not 500 error
```

## References

- [DigitalOcean: Force Rebuild Docs](https://docs.digitalocean.com/products/app-platform/how-to/restart-rebuild-app/)
- [tRPC Bundling Issue #1375](https://github.com/trpc/trpc/issues/1375)
- [pnpm on DigitalOcean Issues](https://github.com/pnpm/pnpm/issues/9233)

---

**Next Action:** Force rebuild WITH cache clear checkbox enabled!
