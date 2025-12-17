# Railway Seeding Bypass Guide

> ⚠️ **DEPRECATED - HISTORICAL REFERENCE ONLY**
> 
> **TERP is NO LONGER deployed on Railway. We use DigitalOcean App Platform.**
> 
> **Current Platform**: DigitalOcean App Platform
> **Production URL**: https://terp-app-b9s35.ondigitalocean.app

---

**Date**: 2025-12-04  
**Purpose**: (Historical) Bypass database seeding on Railway  
**Status**: DEPRECATED - Migrated back to DigitalOcean

---

## Problem

The application crashes during startup when trying to seed default data due to schema drift (missing database columns). This prevents the app from starting and blocks testing.

## Solution: SKIP_SEEDING Environment Variable

All seeding functions now respect the `SKIP_SEEDING` environment variable. When set to `true` or `1`, all seeding operations are bypassed, allowing the app to start without seeding.

---

## Quick Fix for Railway

### Step 1: Set SKIP_SEEDING Environment Variable

**Via Railway CLI:**
```bash
railway variables set SKIP_SEEDING=true
```

**Via Railway Dashboard:**
1. Go to your Railway project: https://railway.app/project/[your-project]
2. Click "Variables" tab
3. Add new variable:
   - **Key**: `SKIP_SEEDING`
   - **Value**: `true`
4. Click "Add"

### Step 2: Redeploy

Railway will automatically redeploy when you set the variable. Or trigger manually:

```bash
railway up
```

### Step 3: Verify App Starts

```bash
# Check logs
railway logs --tail 50

# Test health endpoint
curl https://terp-app-production.up.railway.app/health

# Should see:
# - "⏭️ SKIP_SEEDING is set - skipping..." messages
# - Server starts successfully
# - Health check returns 200
```

---

## What Gets Bypassed

When `SKIP_SEEDING=true`, the following seeding operations are skipped:

- ✅ RBAC roles and permissions seeding
- ✅ Default storage locations seeding
- ✅ Product categories and subcategories seeding
- ✅ Product grades seeding
- ✅ Expense categories seeding
- ✅ Chart of accounts seeding
- ✅ Manual seed endpoint (`/api/auth/seed`)

**Note**: Admin user creation (via `INITIAL_ADMIN_USERNAME`/`INITIAL_ADMIN_PASSWORD`) is **NOT** bypassed and will still work.

---

## When to Use This

### ✅ Use SKIP_SEEDING When:

- Schema drift prevents seeding (missing columns)
- You need to get the app online quickly for testing
- Database is already seeded from a previous run
- You'll seed manually later via scripts
- You're debugging deployment issues

### ❌ Don't Use SKIP_SEEDING When:

- First-time deployment (you need default data)
- Database is completely empty
- You need RBAC roles/permissions for testing
- You need default categories/locations for functionality

---

## Re-enabling Seeding

Once schema drift is fixed:

### Step 1: Remove or Set SKIP_SEEDING to false

```bash
railway variables delete SKIP_SEEDING
# OR
railway variables set SKIP_SEEDING=false
```

### Step 2: Fix Schema Drift

```bash
# Run migrations
railway run pnpm db:migrate

# Or use schema drift fix script
railway run tsx scripts/fix-schema-drift.ts
```

### Step 3: Re-enable Seeding

```bash
# Remove the bypass
railway variables delete SKIP_SEEDING

# Redeploy
railway up

# Or trigger seeding manually via API
curl -X POST https://terp-app-production.up.railway.app/api/auth/seed
```

---

## Manual Seeding After Bypass

If you bypassed seeding but need default data:

### Option 1: Use Manual Seed Endpoint

```bash
# First, disable SKIP_SEEDING temporarily
railway variables set SKIP_SEEDING=false

# Trigger seeding via API
curl -X POST https://terp-app-production.up.railway.app/api/auth/seed

# Re-enable bypass if needed
railway variables set SKIP_SEEDING=true
```

### Option 2: Use Seed Scripts

```bash
# Connect to Railway database
railway connect mysql

# Run seed scripts
railway run pnpm seed:light
# OR
railway run pnpm seed:realistic
```

---

## Technical Details

### Environment Variable Values

The following values enable the bypass:
- `SKIP_SEEDING=true` (recommended)
- `SKIP_SEEDING=1`
- `SKIP_SEEDING=TRUE` (case-insensitive check)

Any other value (including unset) will allow seeding to proceed normally.

### Functions That Respect SKIP_SEEDING

All seeding functions check for `SKIP_SEEDING` at the start:

- `seedAllDefaults()` - Master seeding function
- `seedRBACDefaults()` - RBAC roles/permissions
- `seedDefaultLocations()` - Storage locations
- `seedDefaultCategories()` - Product categories
- `seedDefaultGrades()` - Product grades
- `seedDefaultExpenseCategories()` - Expense categories
- `seedDefaultChartOfAccounts()` - Chart of accounts

### Log Messages

When seeding is bypassed, you'll see:
```
⏭️  SKIP_SEEDING is set - skipping all default data seeding
```

Or for individual functions:
```
⏭️  SKIP_SEEDING is set - skipping RBAC seeding
⏭️  SKIP_SEEDING is set - skipping location seeding
```

---

## Troubleshooting

### App Still Crashes After Setting SKIP_SEEDING

1. **Verify variable is set:**
   ```bash
   railway variables | grep SKIP_SEEDING
   ```

2. **Check logs for seeding attempts:**
   ```bash
   railway logs --tail 100 | grep -i seed
   ```

3. **Ensure variable is set before deployment:**
   - Set variable first
   - Then trigger deployment
   - Or set variable and wait for auto-redeploy

### Seeding Still Runs Despite SKIP_SEEDING

1. **Check variable value:**
   ```bash
   railway variables | grep SKIP_SEEDING
   # Should show: SKIP_SEEDING=true
   ```

2. **Verify code has latest changes:**
   - Ensure `SKIP_SEEDING` checks are in the code
   - Pull latest code: `git pull origin main`
   - Redeploy: `railway up`

### Need to Seed After Bypass

See "Manual Seeding After Bypass" section above.

---

## Related Documentation

- [Railway Deployment Status](./RAILWAY_DEPLOYMENT_STATUS.md) - Current deployment status
- [Railway Migration Guide](../RAILWAY_MIGRATION_GUIDE.md) - Complete migration guide
- [Schema Drift Fix](../../scripts/fix-schema-drift.ts) - Script to fix schema drift

---

## Summary

**Quick Command:**
```bash
railway variables set SKIP_SEEDING=true
```

This bypasses all seeding operations, allowing the app to start even when schema drift prevents seeding. Perfect for getting the app online quickly for testing while you fix schema issues separately.
