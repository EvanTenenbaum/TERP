# DigitalOcean Environment Variables - Fix Summary

**Date**: 2025-12-02  
**Status**: Ready to Apply  
**Priority**: HIGH

## What's Wrong

### 1. DATABASE_URL Duplication (CRITICAL)
- **Issue**: Two DATABASE_URL entries exist
  - Entry 1: Encrypted SECRET value (RUN_AND_BUILD_TIME)
  - Entry 2: Managed DB reference `${terp-mysql-db.DATABASE_URL}` (RUN_TIME)
- **Problem**: Conflicts, unclear which is used
- **Fix**: Keep only the managed DB reference with RUN_AND_BUILD_TIME scope

### 2. Missing Build Variables (HIGH)
- **Issue**: Frontend build will fail without these
- **Missing**:
  - `VITE_APP_TITLE`
  - `VITE_APP_LOGO`
  - `VITE_APP_ID`
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`

### 3. Unexpected Variable (MEDIUM)
- **Issue**: `JWT_SECRET` exists but not in `.do/app.yaml`
- **Fix**: Remove (not needed)

## The Fix

### Automated (Recommended)

```bash
# Run the fix script
./scripts/fix-do-env-vars.sh

# It will:
# 1. Backup current config
# 2. Show you exactly what will change
# 3. Ask for confirmation
# 4. Apply if you approve
# 5. Trigger deployment
```

### What the Script Does

**Removes**:
- Duplicate DATABASE_URL entries
- JWT_SECRET (not needed)

**Adds**:
- VITE_APP_TITLE: TERP
- VITE_APP_LOGO: /logo.png
- VITE_APP_ID: terp-app
- VITE_CLERK_PUBLISHABLE_KEY: pk_test_...
- CLERK_SECRET_KEY: sk_test_...

**Preserves**:
- All existing SECRET values
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- SENTRY_DSN
- CRON_SECRET
- PAPERTRAIL_ENDPOINT

**Updates**:
- DATABASE_URL: Uses managed database reference `${terp-mysql-db.DATABASE_URL}` with RUN_AND_BUILD_TIME scope

## Why This Matters

### Current State
- ❌ Builds may fail (missing Vite vars)
- ❌ Auth may fail (missing Clerk vars)
- ❌ Database connection unclear (duplicate URLs)
- ❌ Configuration drift from `.do/app.yaml`

### After Fix
- ✅ Clean, single DATABASE_URL reference
- ✅ All build variables present
- ✅ Authentication configured
- ✅ Matches `.do/app.yaml` specification
- ✅ Deployment will succeed

## Database URL Explanation

The app has a **managed MySQL database** attached:
- Name: `terp-mysql-db`
- Engine: MySQL 8
- Database: `defaultdb`
- User: `doadmin`

**Best Practice**: Use DigitalOcean's managed reference:
```
${terp-mysql-db.DATABASE_URL}
```

This automatically:
- Injects the correct connection string
- Handles SSL configuration
- Updates if database credentials change
- Works in both build and runtime

## Verification Steps

After applying the fix:

```bash
# 1. Monitor deployment
./scripts/watch-deploy.sh

# 2. Check environment variables
doctl apps spec get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --format json | \
  jq -r '.services[0].envs[] | "\(.key): \(.scope) (\(.type))"'

# 3. Verify no duplicates
doctl apps spec get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --format json | \
  jq -r '.services[0].envs[] | .key' | sort | uniq -d

# 4. Check build logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type build | tail -50

# 5. Test health endpoint
curl https://terp-app-b9s35.ondigitalocean.app/health

# 6. Test authentication
# Open browser and try to log in
```

## Rollback Plan

If something goes wrong:

```bash
# Restore from backup
BACKUP_FILE="/tmp/terp-spec-backup-YYYYMMDD-HHMMSS.json"
doctl apps update 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --spec "$BACKUP_FILE"
```

The script automatically creates a timestamped backup before making changes.

## Expected Deployment Time

- Configuration update: ~30 seconds
- Build: ~5-8 minutes
- Deploy: ~2-3 minutes
- **Total**: ~10-12 minutes

## Risk Assessment

**Risk Level**: Medium
- Configuration change triggers full rebuild
- Database reference change (but using managed reference is safer)
- Adding missing variables (should improve stability)

**Mitigation**:
- Backup created automatically
- Can rollback quickly
- Changes align with `.do/app.yaml` spec
- Preserves all existing secrets

## Next Steps

1. **Review** this summary and `DO_ENV_VARS_AUDIT.md`
2. **Choose timing** (recommend low-traffic period)
3. **Run** `./scripts/fix-do-env-vars.sh`
4. **Monitor** deployment with `./scripts/watch-deploy.sh`
5. **Verify** application works correctly
6. **Update** `.do/app.yaml` if needed (to document JWT_SECRET removal)

## Questions?

- **Q**: Will this break the database connection?
  - **A**: No, using managed reference is the recommended approach
  
- **Q**: What if the build fails?
  - **A**: Rollback using the automatic backup
  
- **Q**: Do I need to update secrets manually?
  - **A**: No, script preserves all existing SECRET values
  
- **Q**: Will this cause downtime?
  - **A**: Brief downtime during deployment (~1-2 minutes)

---

**Ready to proceed?** Run: `./scripts/fix-do-env-vars.sh`
