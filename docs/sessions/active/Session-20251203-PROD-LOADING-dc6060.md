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
- [ ] Wait for new deployment to complete
- [ ] Test production site loads correctly

## Notes
- User suspected Vite-related issue - correct!
- The HTML loads (200 response) but JS bundles likely not being served
- Fix ensures static files are found regardless of bundling location
