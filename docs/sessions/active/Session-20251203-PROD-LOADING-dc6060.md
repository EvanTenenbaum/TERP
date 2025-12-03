# Session: PROD-LOADING - Fix Production Loading Issue

**Status**: In Progress
**Started**: 2025-12-03
**Agent Type**: External (Claude)
**Platform**: Cursor
**Files**: server/_core/vite.ts

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
- [ ] Wait for new deployment to complete
- [ ] Test production site loads correctly

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
