# Session: PROD-LOADING - Fix Production Loading Issue

**Status**: Complete
**Started**: 2025-12-03
**Completed**: 2025-12-12
**Agent Type**: External (Claude)
**Platform**: Cursor
**Files**: server/\_core/vite.ts, vite.config.ts, client/src/components/\*\*, server/\_core/index.ts

## Problem

Production site stuck showing "TERP loading" with spinning wheel. Root page returns 200 but app never loads.

## Root Cause

The `serveStatic` function in `server/_core/vite.ts` uses `path.resolve(__dirname, "public")` in production mode. When the server code is bundled with esbuild to `dist/index.js`, `__dirname` resolution may be unreliable, causing the static files (JS bundles) to not be found or served correctly.

## Solution

Changed production path resolution to use `process.cwd()` instead of `__dirname` for more reliable path resolution:

- Before: `path.resolve(__dirname, "public")`
- After: `path.resolve(process.cwd(), "dist", "public")`

Also added better logging to help diagnose path resolution issues.

## Progress

- [x] Identified root cause (path resolution issue)
- [x] Fixed serveStatic function to use process.cwd()
- [x] Added better error logging
- [x] Commit and push fix
- [x] Verify JS bundles are accessible (confirmed - 200 response)
- [x] Investigated top 3 potential issues from research
- [x] Fixed Issue #1: Safe React mount with error handling
- [x] Fixed Issue #2: Sentry init wrapped in try-catch
- [x] Verified Issue #3: Module resolution is correct (imports use relative paths)
- [x] Wait for new deployment to complete (monitoring in progress)
- [x] Test production site loads correctly (confirmed - React app renders)

## Current Status (Last Check: 2025-12-03 08:02 UTC)

**Deployment Status**: ⏳ In Progress

- **Current Build**: v20251201-195842-kyt0ybzn (old build from Dec 1)
- **Expected**: New build with date 20251203
- **Commits Pushed**: All fixes have been pushed to main branch
- **Site Status**: ⚠️ Still showing loading spinner (old build active)

**Fixes Applied**:

1. ✅ Static file path resolution fixed
2. ✅ Safe React mounting implemented
3. ✅ Sentry made non-blocking
4. ✅ Logger error handling added

**Next Steps**:

- Wait for DigitalOcean to complete build and deployment
- Once new build deploys (build version will show 20251203), verify site loads correctly
- Test that loading spinner disappears and React app mounts successfully

## Deployment Monitoring Status

**Current Status**: Deployment in progress

- **Old Build**: v20251201-195842-kyt0ybzn (still active)
- **Health Endpoint**: ✅ Working (returns JSON)
- **JS Bundles**: ✅ Accessible (200 responses)
- **Site Status**: ⚠️ Still showing loading spinner (old build)

**Commits Pushed**:

1. `9434c9f0` - Fix static file path resolution
2. `c39abc6c` - Add error handling to logger calls
3. `f379a36a` - Add error handling for React mount and Sentry init
4. `187db1e0` - Make Sentry initialization non-blocking (conditional dynamic import)

**Sentry Fix**: Changed Sentry from blocking top-level import to conditional dynamic import AFTER regular imports. This ensures Sentry cannot block app startup even if there are issues with the Sentry module itself.

**ATOMIC ROOT CAUSE IDENTIFIED**: Top-level conditional code or imports BEFORE regular imports can block execution. Moved Sentry import to AFTER all regular imports to ensure React and core app code always execute first.

**Next Steps**:

- Continue monitoring for new build version (should show 20251203 date)
- Once new build deploys, verify site loads correctly
- Test that loading spinner disappears and React app mounts

## Top 3 Issues Investigated & Fixed

### Issue #1: JavaScript execution errors preventing React mount ✅ FIXED

**Root Cause**: Non-null assertion (`!`) on `getElementById("root")` could fail silently, and loading spinner content wasn't cleared before React mount.

**Fix**:

- Added explicit null check for root element
- Clear loading spinner HTML before mounting React
- Throw descriptive error if root element missing

**Files Changed**: `client/src/main.tsx`

### Issue #2: Sentry initialization blocking app startup ✅ FIXED

**Root Cause**: If Sentry.init() throws an error, it would prevent the rest of the code from executing.

**Fix**: Wrapped Sentry.init() in try-catch to prevent blocking app startup.

**Files Changed**: `sentry.client.config.ts`

### Issue #3: Module resolution/import errors ✅ VERIFIED OK

**Investigation**: Checked bundled JS - all imports use relative paths (`./react-vendor-*.js`) which are correct. Vite alias resolution works correctly in production build.

**Status**: No issues found - module resolution is working correctly.

## Notes

- User suspected Vite-related issue - correct!
- The HTML loads (200 response) but JS bundles likely not being served
- Fix ensures static files are found regardless of bundling location

---

## Dec 12 Follow-Up: Root Cause Was a Frontend Bundle Crash (Not Static Serving)

After the original `serveStatic`/path-resolution fixes, production still presented as "stuck on spinner" because the **React bundle crashed immediately**, preventing the app from mounting.

### Symptoms (Production Browser)

- Spinner remained visible (HTML loaded, but React never mounted)
- Console error(s):
  - `ReferenceError: jsx is not defined`
  - `ReferenceError: javascript is not defined`

### Root Cause

Multiple `.tsx` files contained stray top-of-file tokens (literally the words `jsx` / `javascript` as the first line). These compile into standalone statements in the production bundle (e.g. `jsx;`), which then throw at runtime because those identifiers are not defined.

Additionally, a Manus-specific runtime plugin was being included in production builds, contributing to the `jsx` runtime mismatch on DigitalOcean.

### Fix (What Changed)

1. **Removed stray top-of-file tokens** from affected `.tsx` files
2. **Gated dev-only runtime plugins** in `vite.config.ts` to avoid production runtime injection
3. **Hardened Express proxy config** to avoid `express-rate-limit` trust proxy validation errors (`trust proxy: 1`)

### Verification

- DigitalOcean deployment became **ACTIVE**
- Production homepage renders dashboard UI (spinner removed)
- Browser console no longer shows fatal `ReferenceError` crashes

### Key Commits

- `41de73e8` - Fix: production build crash (disable Manus runtime) + trust proxy
- `450261e2` - Fix: remove stray jsx tokens causing production crash
- `0a8087b7` - Fix: remove stray 'javascript' tokens causing frontend crash
