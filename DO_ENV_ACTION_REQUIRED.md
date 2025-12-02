# ⚠️ ACTION REQUIRED: DigitalOcean Environment Variables

**Status**: Issues Found - Fix Ready  
**Priority**: HIGH  
**Estimated Time**: 15 minutes + deployment time

## Summary

I audited the DigitalOcean environment variables and found **critical configuration issues** that need to be fixed.

## Critical Issues

### 1. DATABASE_URL Duplication ❌

- **Two entries** for DATABASE_URL exist (causing conflicts)
- One encrypted SECRET, one managed DB reference
- **Risk**: Unclear which is used, potential connection failures

### 2. Missing Build Variables ❌

- Frontend build requires these Vite variables:
  - `VITE_APP_TITLE`
  - `VITE_APP_LOGO`
  - `VITE_APP_ID`
- **Risk**: Build failures, missing branding

### 3. Missing Authentication Variables ❌

- Clerk authentication not configured:
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
- **Risk**: Authentication will fail

### 4. Unexpected Variable ⚠️

- `JWT_SECRET` exists but not in `.do/app.yaml`
- **Risk**: Configuration drift

## What I Created

### 1. Automated Fix Script

**File**: `scripts/fix-do-env-vars.sh`

This script will:

- ✅ Remove duplicate DATABASE_URL entries
- ✅ Use managed database reference: `${terp-mysql-db.DATABASE_URL}`
- ✅ Add all missing Vite variables
- ✅ Add missing Clerk variables
- ✅ Remove JWT_SECRET
- ✅ Preserve all existing SECRET values
- ✅ Create automatic backup before changes

### 2. Detailed Audit Report

**File**: `DO_ENV_VARS_AUDIT.md`

Complete analysis of:

- Current vs expected configuration
- Impact assessment
- Scope explanations
- Security considerations

### 3. Quick Fix Guide

**File**: `DO_ENV_FIX_SUMMARY.md`

Step-by-step instructions for:

- Running the automated fix
- Manual fixes via console
- Verification steps
- Rollback procedures

## How to Fix

### Option 1: Automated (Recommended)

```bash
# Run the fix script
./scripts/fix-do-env-vars.sh

# It will:
# 1. Show you exactly what will change
# 2. Ask for confirmation
# 3. Apply changes if you approve
# 4. Trigger deployment automatically
```

### Option 2: Manual via DigitalOcean Console

1. Go to: https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/settings
2. Navigate to "Environment Variables"
3. Fix the issues listed above
4. Save (triggers deployment)

## After Applying Fix

```bash
# Monitor deployment
./scripts/watch-deploy.sh

# Verify configuration
doctl apps spec get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --format json | \
  jq -r '.services[0].envs[] | "\(.key): \(.scope) (\(.type))"'

# Check for duplicates (should be empty)
doctl apps spec get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --format json | \
  jq -r '.services[0].envs[] | .key' | sort | uniq -d

# Test health
curl https://terp-app-b9s35.ondigitalocean.app/health
```

## Impact if Not Fixed

**Current State**:

- ❌ Potential database connection issues
- ❌ Frontend build may fail
- ❌ Authentication won't work
- ❌ Configuration drift from spec

**After Fix**:

- ✅ Clean, consistent configuration
- ✅ Successful builds
- ✅ Working authentication
- ✅ Matches `.do/app.yaml` specification

## Next Steps

1. **Review** the audit files:
   - `DO_ENV_VARS_AUDIT.md` (detailed analysis)
   - `DO_ENV_FIX_SUMMARY.md` (quick guide)

2. **Choose timing** (recommend low-traffic period)

3. **Run fix**: `./scripts/fix-do-env-vars.sh`

4. **Monitor**: `./scripts/watch-deploy.sh`

5. **Verify**: Test authentication and features

## Questions?

- **Will this break anything?** No, we're fixing existing issues
- **Will there be downtime?** Brief (~1-2 minutes during deployment)
- **Can I rollback?** Yes, automatic backup is created
- **Do I need to update secrets?** No, all existing secrets are preserved

---

**Ready to proceed?** Run: `./scripts/fix-do-env-vars.sh`

**Need more details?** Read: `DO_ENV_VARS_AUDIT.md`
