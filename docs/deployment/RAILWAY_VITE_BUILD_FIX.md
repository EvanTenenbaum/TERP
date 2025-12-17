# Railway VITE Build Fix - Summary

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date**: 2025-12-03  
**Issue**: (Historical) VITE variables not available during Railway Docker build  
**Status**: DEPRECATED - Migrated back to DigitalOcean

---

## What Was Changed

### 1. Updated Dockerfile

Added build arguments and environment variables for VITE:

```dockerfile
# Accept VITE environment variables as build arguments
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO
ARG VITE_APP_ID
ARG VITE_SENTRY_DSN

# Make VITE variables available as environment variables during build
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
```

### 2. Created railway.json

Configured Railway to pass environment variables as build arguments:

```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile",
    "buildArgs": {
      "VITE_CLERK_PUBLISHABLE_KEY": "${{VITE_CLERK_PUBLISHABLE_KEY}}",
      "VITE_APP_TITLE": "${{VITE_APP_TITLE}}",
      "VITE_APP_LOGO": "${{VITE_APP_LOGO}}",
      "VITE_APP_ID": "${{VITE_APP_ID}}",
      "VITE_SENTRY_DSN": "${{VITE_SENTRY_DSN}}"
    }
  }
}
```

### 3. Created Documentation

- `docs/RAILWAY_DOCKER_BUILD_ARGS.md` - Comprehensive guide
- Updated `docs/RAILWAY_MIGRATION_GUIDE.md` - Added critical step

---

## Why This Was Needed

### The Problem

1. Vite embeds environment variables into the client JavaScript bundle **during build**
2. Railway's environment variables are only available at **runtime** by default
3. Without build args, Vite sees `undefined` for all `VITE_*` variables
4. Frontend builds but doesn't work (502 errors or broken functionality)

### The Solution

1. Dockerfile declares `ARG` for each VITE variable
2. Railway passes env vars as build arguments via `railway.json`
3. Dockerfile converts `ARG` to `ENV` for the build process
4. Vite reads `ENV` variables and embeds them in bundle
5. Frontend works correctly

---

## What You Need to Do

### 1. Commit These Changes

```bash
git add Dockerfile railway.json docs/
git commit -m "fix: configure Railway Docker build args for VITE variables"
git push origin main
```

### 2. Ensure Environment Variables Are Set in Railway

Make sure these are configured in Railway dashboard:

**Required**:

- `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
- `VITE_APP_TITLE` - "TERP"
- `VITE_APP_ID` - "terp-app"

**Optional**:

- `VITE_APP_LOGO` - Logo URL (or leave empty)
- `VITE_SENTRY_DSN` - Sentry DSN (or leave empty)

### 3. Redeploy

```bash
# Trigger new deployment
railway up

# Or push to trigger auto-deploy
git push origin main
```

### 4. Verify

```bash
# Check if frontend loads
curl https://your-app.up.railway.app/

# Should return HTML, not 502
```

---

## Files Changed

- ✅ `Dockerfile` - Added ARG and ENV for VITE variables
- ✅ `railway.json` - New file with build args configuration
- ✅ `docs/RAILWAY_DOCKER_BUILD_ARGS.md` - New comprehensive guide
- ✅ `docs/RAILWAY_MIGRATION_GUIDE.md` - Updated with critical step
- ✅ `RAILWAY_VITE_BUILD_FIX.md` - This summary

---

## Testing Locally

You can test the Docker build locally with build args:

```bash
docker build \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx \
  --build-arg VITE_APP_TITLE=TERP \
  --build-arg VITE_APP_ID=terp-app \
  -t terp-test .

docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://... \
  -e JWT_SECRET=xxx \
  -e CLERK_SECRET_KEY=sk_xxx \
  terp-test
```

---

## Security Note

**VITE\_\* variables are PUBLIC** - they're embedded in client JavaScript and visible to anyone.

**Safe to use**:

- ✅ Clerk publishable key (pk\_\*)
- ✅ App title, logo, ID
- ✅ Sentry DSN
- ✅ Public API endpoints

**Never use VITE\_\* for**:

- ❌ Database credentials
- ❌ API secrets
- ❌ JWT secrets
- ❌ Clerk secret key (sk\_\*)

---

## Next Steps

1. Commit and push changes
2. Verify Railway environment variables are set
3. Deploy to Railway
4. Test frontend loads correctly
5. Move on to schema drift fixes

---

**Status**: Ready to deploy. This fix is required for Railway deployment to work.
