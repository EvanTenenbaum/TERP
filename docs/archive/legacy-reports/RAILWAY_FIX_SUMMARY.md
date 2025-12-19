```markdown
# TERP Railway Deployment Fix: Technical Summary

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date:** October 26, 2023 (Example Date - Replace with Actual Date)

**Status:** DEPRECATED - Migrated back to DigitalOcean

**Objective:** (Historical) Resolve Railway deployment crash and ensure full application functionality.

## 1. Problem Statement

The TERP Railway deployment was crashing after database migrations, but before the server `server.listen()` call. The backend has been diagnosed and fixed, but Railway's aggressive caching of previous (diagnostic) builds is preventing the deployment of the corrected code.

## 2. Root Cause Analysis

The initial server crash was traced to a database connection issue. The `DATABASE_URL` was not being properly parsed, leading to a silent failure and subsequent crash.

## 3. Resolution Steps

### 3.1. Initial Crash Resolution

1.  **Diagnostic Approach:** A minimal server was created using Express and a basic database connection test to isolate the crash point.
2.  **Fix Implemented:**  Improved database connection error handling was implemented in `server/_core/index.ts` to properly parse the `DATABASE_URL` and handle potential connection errors.
3.  **Auto Migrations**: Added missing columns (statusId, deleted_at, photo_session_event_id) to the `server/autoMigrate.ts` to ensure proper database schema during migrations.
4.  **Seeding**: Temporarily disabled seeding by setting `SKIP_SEEDING=TRUE` to simplify the deployment process.

### 3.2. Addressing Railway Caching

After resolving the underlying server issue, Railway was still deploying the older, diagnostic build due to aggressive caching. The following attempts were made to address this, all unsuccessfully:

1.  **Multiple `railway up` deployments:** Repeated deployments were triggered, but Railway continued to use the cached build.
2.  **Cache-busting comment in package.json:** Adding a cache-busting comment to `package.json` was attempted but ultimately broke the JSON structure and failed.
3.  **`version.ts` file:** A `version.ts` file was created and updated to force a rebuild, but it had no effect.
4.  **Dockerfile cache-busting comment:**  A cache-busting comment was added to the `Dockerfile`, but the Railway deployment still used the cached build.
5.  **Waited between deployments:** Delaying deployments by 3+ minutes did not resolve the caching issue.

## 4. Technical Details

### 4.1. Original Issue

Server crashed after database migrations but before `server.listen()` due to a database connection failure.

### 4.2. Diagnostic Method

Server code was stripped down to the bare minimum required for an Express server and a database connection test.  This allowed for focused debugging and pinpointing the failure point.

### 4.3. Solution

Improved database connection error handling in `server/_core/index.ts`. This included ensuring the `DATABASE_URL` is correctly parsed and handled, and providing informative error messages in case of connection failures.  Also corrected schema in `server/autoMigrate.ts`.

### 4.4. Files Modified

*   **`server/_core/index.ts`**: Full server code with the database connection fix.
*   **`server/autoMigrate.ts`**: Added missing columns: `statusId`, `deleted_at`, `photo_session_event_id`.
*   **`scripts/seed-realistic-main.ts`**: Added `SKIP_SEEDING` check to prevent seeding during deployment.
*   **`Dockerfile`**:  Modified with a cache-busting comment (unsuccessful in preventing caching).

### 4.5. Backup Files

*   **`server/_core/index.BACKUP.ts`**: Original version of `server/_core/index.ts` for reference.
*   **`server/_core/index.FIXED.ts`**: Gemini-generated fix (identical to the current `server/_core/index.ts`).

### 4.6. Current Status

*   **Backend Status:** ✅ Server starts, database connects, `/health` endpoint works (verified locally).
*   **Frontend Status:** ❌ Shows "Cannot GET /" - Indicating that static assets are not being served properly. This is likely due to the cached diagnostic build and incorrect environment configuration.

## 5. Current Problem: Railway Caching

Railway is aggressively caching the diagnostic build despite multiple deployment attempts and cache-busting strategies. Logs continue to show diagnostic messages from the older code, indicating that the updated code is not being deployed.

## 6. Recommendations for Manual Intervention

The most effective way to address this appears to be manual intervention within the Railway platform:

1.  **Railway Dashboard:** Delete all existing deployments. This forces Railway to rebuild from scratch.
2.  **Railway Settings:** Look for an option to clear the build cache within the Railway project settings.
3.  **Nuclear Option:** If the above steps fail, consider deleting and recreating the Railway service. This will ensure a completely fresh environment.
4.  **Verify:** After each intervention, carefully examine the Railway build logs to confirm that the new code is being built and deployed. Look for the absence of the diagnostic messages from the older code.

## 7. Next Steps

1.  **[ACTION]** Manually clear Railway cache via the dashboard.
2.  **[ACTION]** Trigger a new deployment.
3.  **[ACTION]** Verify deployment logs show **NO** diagnostic messages related to the previous code. Specifically look for indications that the new `index.ts` and `autoMigrate.ts` code are being used.
4.  **[ACTION]** Test that the frontend loads correctly and the application is fully functional.
5.  **[ACTION]** Re-enable seeding (remove `SKIP_SEEDING=TRUE`) if needed after the deployment is stable and functional. Ensure adequate database resources are provisioned to handle seeding.
