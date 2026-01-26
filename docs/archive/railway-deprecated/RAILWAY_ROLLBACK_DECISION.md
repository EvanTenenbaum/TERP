# Railway Deployment Rollback Decision

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
>
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
>
> This document describes issues that led to our decision to migrate back to DigitalOcean.
>
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date:** 2025-12-08  
**Session:** External Agent (Manus)  
**Decision:** Rollback to commit f705e123 (Nov 26, 2025)

## Problem Summary

Railway deployment has been failing since November 29 due to:

1. Seeding script issues causing crashes
2. Schema drift with missing columns
3. Complex startup sequence failures
4. Multiple failed fix attempts over 4+ hours

## Root Cause Analysis

The issues started when seeding functionality was added/modified around November 29-30:

- `feat: Add database seeding functionality to settings` (f59858a2)
- Multiple seed-related fixes followed
- Cascading failures in startup sequence
- Silent crashes after migrations complete

## Rollback Target

**Commit:** `f705e123` (November 26, 2025)  
**Title:** "Claude/audit mock data 012aiv2y xcn aif fd px9bke f2 (#57)"  
**Why:** Last known stable commit before seeding issues started

### Verification of Rollback Target

✅ Has Dockerfile for Railway deployment  
✅ Has DATABASE_URL handling in connectionPool.ts  
✅ Has JWT_SECRET validation in env.ts  
✅ Has proper error handling and logging  
✅ No seeding-related crashes

## Rollback Strategy

1. Create branch `railway-stable-rollback` from f705e123
2. Test build locally to verify compatibility
3. Deploy to Railway "main" environment
4. Verify backend and frontend work
5. Document what features are lost (if any)
6. Create plan to re-add features incrementally

## What We're Losing (Temporarily)

- Database seeding UI button (can be re-added later)
- Recent seeding script improvements
- Any features added after November 26

## What We're Keeping

- All core TERP functionality
- Database schema and migrations
- Authentication system
- Railway deployment configuration
- Performance optimizations from before Nov 26

## Next Steps After Rollback

1. Get app stable and running on Railway
2. Review what features need to be re-added
3. Add features back incrementally with testing
4. Fix seeding properly in a controlled way

## Lessons Learned

- Don't try to fix cascading failures for hours
- Rollback to known-good state faster
- Test seeding changes in isolation before deploying
- Keep Railway deployments simple

---

**Status:** Ready to execute rollback  
**Approved By:** User (Evan)  
**Execution:** In progress
