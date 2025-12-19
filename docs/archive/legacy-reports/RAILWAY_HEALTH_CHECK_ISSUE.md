# Railway Health Check Deployment Issue - Status Report

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> This document describes issues we encountered during our brief Railway deployment.
> It is kept for historical reference only.
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date**: 2025-12-09  
**Status**: DEPRECATED - Migrated back to DigitalOcean  
**Platform**: Railway (MySQL database) - NO LONGER IN USE

---

## Current Situation

### What's Working ✅
1. **SKIP_SEEDING bypass is functional** - Logs confirm: "Seeding is disabled via SKIP_SEEDING environment variable"
2. **Database connection succeeds** - "Database connection established with connection pooling"
3. **Auto-migrations execute** - "Running auto-migrations to sync database schema"
4. **App starts up** - Initial startup sequence completes without errors
5. **Case-insensitive SKIP_SEEDING** - Fixed in commit `1172e96e` (all checks now use `.toLowerCase()`)

### What's Not Working ❌
1. **Railway health checks fail** - Repeated "service unavailable" (503) errors
2. **Deployments don't complete** - Health check timeout prevents successful deployment
3. **App becomes inaccessible** - Returns 502 "Application failed to respond"

---

## Technical Context

### Railway Configuration (`railway.json`)
```json
{
  "deploy": {
    "startCommand": "pnpm run start:production",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 600
  }
}
```

**Current behavior**: Railway polls `/health` endpoint every ~10 seconds for up to 600 seconds (10 minutes). If the endpoint doesn't return 200, deployment fails.

### Health Check Endpoints

The app provides three health check endpoints:

#### 1. `/health` (Currently Used)
**Location**: `server/_core/index.ts` lines 192-213  
**Behavior**: 
- Always returns HTTP 200 (even when unhealthy)
- Calls `performHealthCheck()` which checks database, memory, connection pool
- Returns JSON with status: "healthy", "degraded", or "unhealthy"
- Designed to never fail Railway deployments

**Code snippet**:
```typescript
app.get("/health", async (req, res) => {
  try {
    const health = await performHealthCheck();
    res.status(200).json(health);  // Always 200
  } catch (error) {
    res.status(200).json({ status: "degraded", ... });  // Still 200
  }
});
```

#### 2. `/health/ready` (Attempted, Failed)
**Location**: `server/_core/index.ts` lines 218-222  
**Behavior**:
- Returns 200 if database connected, 503 if not
- More accurate readiness indicator
- Was tried in commit `7a219491`, reverted in `2df03462`

**Why it failed**: Returned 503 during startup while auto-migrations were running, causing Railway to reject the deployment.

#### 3. `/health/live` (Not Used)
**Location**: `server/_core/index.ts` lines 214-216  
**Behavior**: Simple liveness check, always returns 200

### Startup Sequence

From logs, the startup happens in this order:

1. **Environment validation** (~0.1s)
   - JWT_SECRET check
   - SKIP_SEEDING check
   
2. **Auto-migrations** (~0.5-2s)
   - Database connection pool creation
   - RBAC table creation (if needed)
   - Column additions for schema drift fixes
   
3. **Seeding** (SKIPPED when SKIP_SEEDING=true)
   - Would normally seed default data
   - Would normally seed RBAC roles/permissions
   
4. **Server startup** (~0.1s)
   - Express server initialization
   - Route registration
   - Health check endpoints become available

**Total startup time**: ~1-3 seconds under normal conditions

### The Paradox

**Observation**: The `/health` endpoint is coded to always return 200, yet Railway reports 503 "service unavailable" during health checks.

**Possible explanations**:
1. **App crashes after startup** - Server starts, then crashes before health check completes
2. **Port binding issue** - App starts but doesn't bind to the port Railway expects
3. **Proxy/load balancer behavior** - Railway's infrastructure returns 503 before reaching the app
4. **Memory exhaustion** - Old deployment using 95% memory affects new deployment
5. **Auto-migration timeout** - Migrations take longer than expected, app not ready when health check starts
6. **Container networking** - Health check can't reach the container during startup

---

## What We've Tried

### Attempt 1: Switch to `/health/ready` endpoint
**Commit**: `7a219491`  
**Config**: `healthcheckPath: "/health/ready"`, `healthcheckTimeout: 600`  
**Result**: Failed - endpoint correctly returned 503 during startup, Railway rejected deployment  
**Reverted**: `2df03462`

### Attempt 2: Increase timeout to 600 seconds
**Commit**: `7a219491`  
**Config**: `healthcheckTimeout: 600` (from 300)  
**Result**: Failed - timeout not the issue, health checks still failing  
**Status**: Kept in rollback

### Attempt 3: Fix case-sensitive SKIP_SEEDING
**Commit**: `1172e96e`  
**Changes**: Made all SKIP_SEEDING checks case-insensitive using `.toLowerCase()`  
**Result**: Success - seeding now properly bypassed  
**Status**: Working

### Attempt 4: Remove health check entirely
**Commit**: `d6b414dd` (reverted in `b1e72746`)  
**Config**: Removed `healthcheckPath` and `healthcheckTimeout`  
**Result**: Failed - app became completely inaccessible (502 errors)  
**Reason**: Railway deployed immediately without waiting for app readiness, app crashed or wasn't ready  
**Status**: Reverted

---

## Environment Variables

**Current Railway configuration**:
```bash
SKIP_SEEDING=true                    # Lowercase, working
DATABASE_URL=mysql://root:***@mysql.railway.internal:3306/railway
NODE_ENV=production
JWT_SECRET=***
# ... other vars
```

**Key finding**: SKIP_SEEDING was originally set to `TRUE` (uppercase), which didn't match the case-sensitive check `=== "true"`. Fixed by making checks case-insensitive.

---

## Database State

**RBAC Tables**: Should be created by auto-migration (`server/autoMigrate.ts` lines 400-500)

Tables that should exist:
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `user_permission_overrides`

**Unknown**: Whether these tables actually exist in Railway's database. Auto-migration logs show it runs, but we haven't confirmed table creation succeeded.

**Migration file**: `drizzle/0022_create_rbac_tables.sql` - contains the SQL to create these tables

---

## Logs Analysis

**From most recent deployment attempt** (commit `1172e96e`):

```
✅ Using JWT_SECRET for authentication
⚠️  Seeding is disabled via SKIP_SEEDING environment variable
   To enable seeding, remove SKIP_SEEDING or set it to false
ℹ Monitoring disabled (Sentry removed for troubleshooting)
[INFO] 🔄 Running auto-migrations to sync database schema...
[INFO] DATABASE_URL found hasSSLParam=false length=86 protocol="mysql"
[INFO] Creating MySQL connection pool config={"connectionLimit":10,...}
[INFO] Database connection established with connection pooling
[INFO] ✅ Seeding completed successfully
```

**What's missing from logs**:
- No "Server running on http://localhost:8080/" message
- No "Health check available at..." message
- No indication of Express server actually starting
- Logs cut off after "Seeding completed successfully"

**This suggests**: The app may be crashing or hanging after auto-migrations complete but before the Express server starts.

---

## Commit History (Recent)

```
b1e72746 - Revert "fix: remove health check to allow app to start" (current)
d6b414dd - fix: remove health check to allow app to start (reverted)
1172e96e - fix: make SKIP_SEEDING check case-insensitive
2df03462 - fix: revert to /health endpoint
7a219491 - infra: improve Railway health checks and documentation
```

---

## Questions for Investigation

1. **Why does `/health` return 503 when it's coded to always return 200?**
   - Is the app actually starting the Express server?
   - Is there middleware intercepting the response?
   - Is Railway's proxy/load balancer returning 503 before reaching the app?

2. **Why do logs stop after "Seeding completed successfully"?**
   - Does the app crash after this point?
   - Is there an unhandled exception?
   - Is the Express server failing to start?

3. **What's the actual state of the Railway database?**
   - Do the RBAC tables exist?
   - Did auto-migrations succeed?
   - Is there schema drift causing issues?

4. **Why does removing health checks cause 502 errors?**
   - Does Railway need health checks to know when to route traffic?
   - Is the app crashing without health check validation?
   - Is there a timing issue with traffic routing?

5. **What's the memory situation?**
   - Old deployment showed 95% memory usage
   - Is this affecting new deployments?
   - Should we scale up the Railway instance?

---

## Files to Examine

### Configuration
- `railway.json` - Health check configuration
- `Dockerfile` - Container build process
- `package.json` - Start scripts

### Server Code
- `server/_core/index.ts` - Main server file, startup sequence (lines 60-95), health endpoints (lines 190-225)
- `server/_core/healthCheck.ts` - Health check implementation
- `server/autoMigrate.ts` - Auto-migration logic, RBAC table creation (lines 400-500)
- `server/services/seedDefaults.ts` - Seeding functions with SKIP_SEEDING checks
- `server/services/seedRBAC.ts` - RBAC seeding with SKIP_SEEDING check

### Database
- `drizzle/0022_create_rbac_tables.sql` - RBAC table creation SQL
- `server/db/schema.ts` - Database schema definition

---

## Potential Solutions (Not Prescriptive)

These are areas to explore, not recommendations:

1. **Investigate why Express server isn't starting**
   - Add more logging after auto-migrations
   - Check for unhandled promise rejections
   - Verify port binding

2. **Verify RBAC tables exist**
   - Connect to Railway MySQL directly
   - Check if tables were created
   - Run migration manually if needed

3. **Adjust health check timing**
   - Add startup delay before health checks
   - Use different health check strategy
   - Implement readiness vs liveness separation

4. **Memory/resource investigation**
   - Check if memory pressure is causing issues
   - Consider scaling Railway instance
   - Monitor resource usage during deployment

5. **Simplify startup sequence**
   - Move auto-migrations to separate step
   - Reduce startup complexity
   - Add better error handling

---

## How to Reproduce

1. Push any code change to `main` branch
2. Railway automatically triggers deployment
3. Watch health check attempts in Railway dashboard
4. Observe repeated "service unavailable" errors
5. Deployment eventually fails or times out

---

## Success Criteria

A successful deployment would show:
1. ✅ Build completes
2. ✅ Container starts
3. ✅ Auto-migrations run successfully
4. ✅ Express server starts and binds to port
5. ✅ `/health` endpoint returns 200
6. ✅ Railway marks deployment as successful
7. ✅ Traffic routes to new deployment
8. ✅ App is accessible at https://terp-app-production.up.railway.app/

Currently stuck at step 5-6.
