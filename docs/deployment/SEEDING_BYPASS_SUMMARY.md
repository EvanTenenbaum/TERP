# Seeding Bypass Implementation Summary

**Date**: 2025-12-04  
**Issue**: Seeding crashes app in Railway due to schema drift  
**Solution**: Added `SKIP_SEEDING` environment variable bypass

---

## ✅ Changes Made

### 1. Added SKIP_SEEDING Checks to All Seeding Functions

**Files Modified:**
- `server/services/seedDefaults.ts` - All 6 seeding functions
- `server/services/seedRBAC.ts` - RBAC seeding function

**Functions Updated:**
- ✅ `seedAllDefaults()` - Master seeding function
- ✅ `seedRBACDefaults()` - RBAC roles/permissions
- ✅ `seedDefaultLocations()` - Storage locations
- ✅ `seedDefaultCategories()` - Product categories
- ✅ `seedDefaultGrades()` - Product grades
- ✅ `seedDefaultExpenseCategories()` - Expense categories
- ✅ `seedDefaultChartOfAccounts()` - Chart of accounts

**Implementation:**
Each function now checks at the start:
```typescript
if (process.env.SKIP_SEEDING === "true" || process.env.SKIP_SEEDING === "1") {
  console.log("⏭️  SKIP_SEEDING is set - skipping [function name] seeding");
  return;
}
```

### 2. Updated Server Startup

**File Modified:** `server/_core/index.ts`

- Added logging when `SKIP_SEEDING` is detected
- Provides helpful message about how to re-enable seeding

### 3. Protected Manual Seed Endpoint

**File Modified:** `server/_core/simpleAuth.ts`

- `/api/auth/seed` endpoint now checks `SKIP_SEEDING`
- Returns 403 error if seeding is disabled

### 4. Created Documentation

**New Files:**
- `docs/deployment/RAILWAY_SEEDING_BYPASS.md` - Complete bypass guide
- `docs/deployment/SEEDING_BYPASS_SUMMARY.md` - This file

---

## 🚀 How to Use

### Quick Fix for Railway

```bash
# Set environment variable
railway variables set SKIP_SEEDING=true

# App will automatically redeploy and start without seeding
```

### Verify It Works

```bash
# Check logs - should see bypass messages
railway logs --tail 50 | grep -i "skip"

# Test health endpoint
curl https://terp-app-production.up.railway.app/health
```

---

## 📋 What Gets Bypassed

When `SKIP_SEEDING=true`:

- ✅ All default data seeding
- ✅ RBAC roles/permissions seeding
- ✅ Manual seed endpoint (`/api/auth/seed`)
- ❌ Admin user creation (still works via `INITIAL_ADMIN_USERNAME`)

---

## 🔄 Re-enabling Seeding

Once schema drift is fixed:

```bash
# Remove bypass
railway variables delete SKIP_SEEDING

# Or set to false
railway variables set SKIP_SEEDING=false

# Redeploy
railway up
```

---

## ✅ Testing Checklist

- [x] All seeding functions check `SKIP_SEEDING`
- [x] Server startup logs bypass message
- [x] Manual seed endpoint respects bypass
- [x] No TypeScript errors
- [x] No linting errors
- [x] Documentation created

---

## 📝 Notes

- Seeding is already commented out in startup (`server/_core/index.ts` line 57)
- This bypass provides an additional safety layer
- Useful when seeding is enabled but schema drift causes crashes
- Can be used temporarily while fixing schema issues

---

## 🎯 Next Steps

1. **Set `SKIP_SEEDING=true` in Railway** to get app online
2. **Fix schema drift** (run migrations or fix-schema-drift script)
3. **Re-enable seeding** once schema is fixed
4. **Test seeding** to ensure it works correctly

---

**Status**: ✅ Complete - Ready to deploy
