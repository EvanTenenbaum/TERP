# DigitalOcean Environment Variables Audit

**Date**: 2025-12-02  
**App**: TERP (ID: 1fd40be5-b9af-4e71-ab1d-3af0864a7da4)

## Critical Issues Found

### 1. DATABASE_URL Duplication ❌ CRITICAL

**Problem**: `DATABASE_URL` is defined twice in the live configuration:
- First: `RUN_AND_BUILD_TIME` scope (SECRET)
- Second: `RUN_TIME` scope (PLAIN)

**Impact**: 
- Potential runtime conflicts
- Security risk (PLAIN type exposes value)
- Build may use wrong database

**Fix**: Remove duplicate, keep only:
```yaml
- key: DATABASE_URL
  scope: RUN_AND_BUILD_TIME
  type: SECRET
```

### 2. Missing Clerk Authentication Variables ❌ HIGH

**Problem**: Clerk keys not present in live config

**Missing**:
- `VITE_CLERK_PUBLISHABLE_KEY` (scope: RUN_AND_BUILD_TIME)
- `CLERK_SECRET_KEY` (scope: RUN_TIME, type: SECRET)

**Impact**: Authentication will fail

**Fix**: Add both variables with correct scopes

### 3. Missing Vite Build Variables ❌ HIGH

**Problem**: Frontend build variables not configured

**Missing**:
- `VITE_APP_TITLE`
- `VITE_APP_LOGO`
- `VITE_APP_ID`

**Impact**: 
- Build may fail
- Frontend may not display correctly
- Branding missing

**Fix**: Add all three with `RUN_AND_BUILD_TIME` scope

### 4. Unexpected JWT_SECRET ⚠️ MEDIUM

**Problem**: `JWT_SECRET` exists in live config but not in `.do/app.yaml`

**Impact**: Configuration drift, unclear purpose

**Fix**: 
- If needed: Add to `.do/app.yaml`
- If not needed: Remove from DigitalOcean

## Current vs Expected Configuration

### Current Live Config (Issues Highlighted)

```
✅ NODE_ENV: RUN_AND_BUILD_TIME (PLAIN)
✅ RATE_LIMIT_GET: RUN_AND_BUILD_TIME (PLAIN)
✅ ENABLE_RBAC: RUN_AND_BUILD_TIME (PLAIN)
✅ ENABLE_QA_CRONS: RUN_AND_BUILD_TIME (PLAIN)
✅ UPLOAD_DIR: RUN_AND_BUILD_TIME (PLAIN)
❌ DATABASE_URL: RUN_AND_BUILD_TIME (SECRET) [DUPLICATE 1]
✅ NEXTAUTH_SECRET: RUN_TIME (SECRET)
✅ NEXTAUTH_URL: RUN_TIME (SECRET)
✅ SENTRY_DSN: RUN_TIME (SECRET)
✅ CRON_SECRET: RUN_TIME (SECRET)
✅ PAPERTRAIL_ENDPOINT: RUN_TIME (SECRET)
⚠️ JWT_SECRET: RUN_AND_BUILD_TIME (PLAIN) [UNEXPECTED]
❌ DATABASE_URL: RUN_TIME (PLAIN) [DUPLICATE 2 - SECURITY RISK]
❌ VITE_CLERK_PUBLISHABLE_KEY: MISSING
❌ CLERK_SECRET_KEY: MISSING
❌ VITE_APP_TITLE: MISSING
❌ VITE_APP_LOGO: MISSING
❌ VITE_APP_ID: MISSING
```

### Expected Config (from .do/app.yaml)

```yaml
# Basic Configuration
- NODE_ENV: production (RUN_AND_BUILD_TIME)
- RATE_LIMIT_GET: 1000 (RUN_AND_BUILD_TIME)
- ENABLE_RBAC: true (RUN_AND_BUILD_TIME)
- ENABLE_QA_CRONS: true (RUN_AND_BUILD_TIME)
- UPLOAD_DIR: /tmp/uploads (RUN_AND_BUILD_TIME)

# Vite Frontend (Build-time required)
- VITE_APP_TITLE: TERP (RUN_AND_BUILD_TIME)
- VITE_APP_LOGO: /logo.png (RUN_AND_BUILD_TIME)
- VITE_APP_ID: terp-app (RUN_AND_BUILD_TIME)

# Clerk Authentication
- VITE_CLERK_PUBLISHABLE_KEY: pk_test_... (RUN_AND_BUILD_TIME)
- CLERK_SECRET_KEY: [SECRET] (RUN_TIME)

# Database (SINGLE ENTRY ONLY)
- DATABASE_URL: [SECRET] (RUN_AND_BUILD_TIME)

# Auth & Security
- NEXTAUTH_SECRET: [SECRET] (RUN_TIME)
- NEXTAUTH_URL: [SECRET] (RUN_TIME)

# Monitoring
- SENTRY_DSN: [SECRET] (RUN_TIME)
- PAPERTRAIL_ENDPOINT: [SECRET] (RUN_TIME)

# Cron
- CRON_SECRET: [SECRET] (RUN_TIME)
```

## Scope Explanation

### RUN_AND_BUILD_TIME
- Available during build AND runtime
- Required for: Vite variables, DATABASE_URL (for migrations during build)

### RUN_TIME
- Only available at runtime
- Use for: Secrets not needed during build

### Type: SECRET vs PLAIN
- SECRET: Encrypted, not visible in logs
- PLAIN: Visible in app spec

## Fix Procedure

### Option 1: Automated Fix (Recommended)

```bash
# Run the fix script
./scripts/fix-do-env-vars.sh

# This will:
# 1. Backup current config
# 2. Generate corrected spec
# 3. Show you the changes
# 4. Ask for confirmation
# 5. Apply if you approve
```

### Option 2: Manual Fix via DigitalOcean Console

1. Go to: https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/settings
2. Navigate to "Environment Variables"
3. **Remove duplicate DATABASE_URL** (keep RUN_AND_BUILD_TIME SECRET version)
4. **Add missing variables**:
   - VITE_CLERK_PUBLISHABLE_KEY
   - CLERK_SECRET_KEY (as SECRET)
   - VITE_APP_TITLE
   - VITE_APP_LOGO
   - VITE_APP_ID
5. **Review JWT_SECRET** - remove if not needed
6. Save changes (will trigger deployment)

### Option 3: Update via doctl CLI

```bash
# Get current spec
doctl apps spec get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --format json > spec.json

# Edit spec.json manually
# Remove duplicate DATABASE_URL
# Add missing variables

# Apply updated spec
doctl apps update 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --spec spec.json
```

## Post-Fix Verification

After applying fixes:

```bash
# 1. Monitor deployment
./scripts/watch-deploy.sh

# 2. Verify environment variables
doctl apps spec get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --format json | \
  jq -r '.services[0].envs[] | "\(.key): \(.scope) (\(.type))"'

# 3. Check build logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type build

# 4. Test authentication
curl https://terp-app-b9s35.ondigitalocean.app/health

# 5. Verify frontend loads
# Open browser: https://terp-app-b9s35.ondigitalocean.app
```

## Additional Recommendations

### 1. Update .do/app.yaml to Match Reality

If JWT_SECRET is needed, add it to `.do/app.yaml`:

```yaml
- key: JWT_SECRET
  scope: RUN_AND_BUILD_TIME
  type: SECRET
```

### 2. Use Production Clerk Keys

Current keys are test keys (`pk_test_...`). For production:

```yaml
- key: VITE_CLERK_PUBLISHABLE_KEY
  value: pk_live_...  # Get from Clerk dashboard
  scope: RUN_AND_BUILD_TIME

- key: CLERK_SECRET_KEY
  scope: RUN_TIME
  type: SECRET  # Set actual value in DO console
```

### 3. Validate DATABASE_URL Format

Ensure DATABASE_URL follows this format:

```
mysql://username:password@host:port/database?ssl-mode=REQUIRED
```

### 4. Document Secret Values

Keep a secure record (1Password, etc.) of:
- DATABASE_URL
- CLERK_SECRET_KEY
- NEXTAUTH_SECRET
- CRON_SECRET
- All other SECRET values

## Impact Assessment

### If Not Fixed

**Immediate**:
- Authentication failures (missing Clerk keys)
- Potential database connection issues (duplicate DATABASE_URL)
- Frontend build failures (missing Vite vars)

**Long-term**:
- Configuration drift
- Difficult debugging
- Security vulnerabilities

### After Fix

**Immediate**:
- Clean, consistent configuration
- Successful builds
- Working authentication

**Long-term**:
- Easier maintenance
- Clear documentation
- Reduced deployment issues

## Next Steps

1. **Review this audit** with team
2. **Choose fix method** (automated script recommended)
3. **Apply fixes** during low-traffic period
4. **Monitor deployment** closely
5. **Verify all features** work post-deployment
6. **Update documentation** if needed

---

**Priority**: HIGH  
**Estimated Time**: 15-30 minutes  
**Risk**: Medium (deployment required)  
**Recommended Window**: Next maintenance window
