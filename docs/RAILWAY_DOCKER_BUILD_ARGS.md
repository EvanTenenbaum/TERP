# Railway Docker Build Arguments Configuration

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> This document is kept for historical reference only.
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Status**: DEPRECATED - No longer using Railway  
**Last Updated**: 2025-12-03  
**Priority**: N/A (Historical)

## Problem

Vite requires environment variables prefixed with `VITE_` to be available **during the build process** to embed them into the client-side JavaScript bundle. Railway's standard environment variables are only available at runtime, not during Docker build.

## Solution

Configure Railway to pass VITE environment variables as Docker build arguments.

---

## Required Build Arguments

The following environment variables must be passed as build arguments:

| Variable                     | Purpose                             | Required |
| ---------------------------- | ----------------------------------- | -------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk authentication (client-side)  | Yes      |
| `VITE_APP_TITLE`             | Application title                   | Yes      |
| `VITE_APP_LOGO`              | Application logo URL                | No       |
| `VITE_APP_ID`                | Application identifier              | Yes      |
| `VITE_SENTRY_DSN`            | Sentry error tracking (client-side) | No       |

---

## Railway Configuration

### Option 1: Railway Dashboard (Recommended)

1. Go to your Railway project
2. Click on your service
3. Navigate to **Settings** → **Build**
4. Under **Docker Build Arguments**, add each variable:

```
VITE_CLERK_PUBLISHABLE_KEY=${{VITE_CLERK_PUBLISHABLE_KEY}}
VITE_APP_TITLE=${{VITE_APP_TITLE}}
VITE_APP_LOGO=${{VITE_APP_LOGO}}
VITE_APP_ID=${{VITE_APP_ID}}
VITE_SENTRY_DSN=${{VITE_SENTRY_DSN}}
```

**Note**: The `${{VAR_NAME}}` syntax tells Railway to use the environment variable value.

### Option 2: railway.json Configuration

Create or update `railway.json` in the project root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
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
  },
  "deploy": {
    "startCommand": "pnpm run start:production",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Environment Variables Setup

Ensure these environment variables are set in Railway:

### Required Variables

```bash
# Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx

# Application Identity
VITE_APP_TITLE=TERP
VITE_APP_ID=terp-app

# Database
DATABASE_URL=mysql://user:pass@host:port/db

# Security
JWT_SECRET=your_32_char_secret_here
```

### Optional Variables

```bash
# Branding
VITE_APP_LOGO=https://your-cdn.com/logo.png

# Monitoring
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_AUTH_TOKEN=xxxxx

# Feature Flags
FEATURE_LIVE_CATALOG=false
```

---

## How It Works

### Build Process Flow

```
1. Railway starts Docker build
   ↓
2. Dockerfile declares ARG for each VITE variable
   ↓
3. Railway passes environment variables as build args
   ↓
4. Dockerfile converts ARG to ENV
   ↓
5. Vite build reads ENV variables
   ↓
6. Variables are embedded in client bundle
   ↓
7. Production build complete
```

### Dockerfile Implementation

```dockerfile
# Accept build arguments
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO
ARG VITE_APP_ID
ARG VITE_SENTRY_DSN

# Convert to environment variables for build
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Build with variables available
RUN pnpm run build:production
```

---

## Verification

### 1. Check Build Logs

After deployment, check Railway build logs for:

```
✓ building client + server bundles...
✓ built in XXXms
```

### 2. Test Frontend

```bash
# Check if frontend loads
curl https://your-app.railway.app/

# Should return HTML, not 502 error
```

### 3. Verify Variables in Browser

Open browser console and check:

```javascript
// These should be defined (not undefined)
console.log(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
console.log(import.meta.env.VITE_APP_TITLE);
```

---

## Troubleshooting

### Build Fails with "VITE\_\* is not defined"

**Cause**: Build arguments not configured in Railway

**Solution**:

1. Add build arguments in Railway dashboard
2. Or create `railway.json` with buildArgs
3. Redeploy

### Frontend Returns 502

**Cause**: Build succeeded but variables are undefined/empty

**Solution**:

1. Verify environment variables are set in Railway
2. Check build args use `${{VAR_NAME}}` syntax
3. Ensure variables are not empty strings

### Variables Show as "undefined" in Browser

**Cause**: Variables not embedded during build

**Solution**:

1. Verify Dockerfile has ARG declarations
2. Verify Dockerfile converts ARG to ENV
3. Check build logs for variable values (they should be masked)
4. Rebuild from scratch

---

## Security Notes

### ⚠️ Important

- **VITE\_\* variables are PUBLIC**: They're embedded in client JavaScript
- **Never put secrets in VITE\_\* variables**: Use server-side env vars instead
- **Clerk publishable key is safe**: It's designed to be public
- **Sentry DSN is safe**: It's designed to be public

### Safe for VITE\_\*

- ✅ Clerk publishable key (pk\_\*)
- ✅ App title, logo, ID
- ✅ Sentry DSN
- ✅ Feature flags
- ✅ API endpoints (if public)

### Never Use VITE\_\* For

- ❌ Database credentials
- ❌ API secrets/keys
- ❌ JWT secrets
- ❌ Clerk secret key (sk\_\*)
- ❌ Any sensitive data

---

## Related Documentation

- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Railway Docker Builds](https://docs.railway.app/deploy/builds)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [TERP Railway Migration Guide](./RAILWAY_MIGRATION_GUIDE.md)

---

## Quick Reference

```bash
# Test build locally with args
docker build \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx \
  --build-arg VITE_APP_TITLE=TERP \
  --build-arg VITE_APP_ID=terp-app \
  -t terp-test .

# Run locally
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://... \
  -e JWT_SECRET=xxx \
  -e CLERK_SECRET_KEY=sk_xxx \
  terp-test
```

---

**Status**: This configuration is required for Railway deployment. Without it, the frontend build will fail or return 502 errors.
