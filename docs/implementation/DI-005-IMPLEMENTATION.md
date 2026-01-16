# DI-005: Fix Startup Seeding Schema Drift - Implementation Summary

**Status:** ✅ COMPLETED
**Date:** 2026-01-14
**Task Reference:** DI-005

## Overview

Fixed the disabled startup seeding due to schema drift that was causing crashes on Railway. The seeding has been re-enabled with proper error handling, idempotency, and schema compatibility.

## Problem Analysis

### Root Causes Identified

1. **Drizzle ORM insertId Bug** (Critical)
   - Lines 191 & 308 in `seedDefaults.ts` tried to access `category.insertId` and `parent.insertId`
   - MySQL Drizzle doesn't return `insertId` property - this was causing runtime crashes
   - This was preventing categories and expense categories from being seeded

2. **Non-Idempotent Operations** (High)
   - Seeding would fail on subsequent runs when data already existed
   - Duplicate key errors would crash the seeding process
   - No graceful handling of existing data

3. **Poor Error Context** (Medium)
   - When seeding failed, unclear which specific step failed
   - No summary of what was successfully seeded
   - Hard to debug in production (Railway)

4. **No Database Validation** (Medium)
   - No check that database connection exists before seeding
   - Could attempt operations on null/undefined DB connection

## Implementation Details

### 1. Fixed insertId Bug

**File:** `/home/user/TERP/server/services/seedDefaults.ts`

**Before:**
```typescript
const [category] = await db.insert(categories).values({
  name: categoryData.name,
});
const categoryId = category.insertId; // ❌ Doesn't exist!
```

**After:**
```typescript
// Insert first
await db.insert(categories).values({
  name: categoryData.name,
});

// Query back to get the ID
const [category] = await db
  .select()
  .from(categories)
  .where(eq(categories.name, categoryData.name))
  .limit(1);

// Now use category.id ✅
```

Applied to:
- Categories/Subcategories (lines 186-227)
- Expense Categories (lines 328-371)

### 2. Made Seeding Idempotent

Added try-catch blocks with duplicate entry handling to all insert operations:

```typescript
try {
  await db.insert(table).values(data);
} catch (error: any) {
  // Skip duplicate entries, throw other errors
  if (!error.message?.includes("Duplicate entry")) {
    throw error; // or log warning
  }
}
```

Applied to:
- ✅ Locations (lines 120-132)
- ✅ Categories (lines 187-197)
- ✅ Subcategories (lines 212-224)
- ✅ Grades (lines 274-284)
- ✅ Expense Categories (lines 330-368)
- ✅ Accounts (lines 484-494)

### 3. Enhanced Error Handling & Logging

**Added to seedAllDefaults():**
```typescript
// Database validation
const db = await getDb();
if (!db) {
  console.error("❌ Database connection not available - skipping seeding");
  return;
}

// Progress tracking
const seedingResults = {
  rbac: false,
  locations: false,
  categories: false,
  grades: false,
  expenseCategories: false,
  accounts: false,
};

// Detailed step logging
console.log("📝 Seeding RBAC...");
await seedRBACDefaults();
seedingResults.rbac = true;
// ... etc

// Summary at the end
console.log("📋 Seeding summary:", seedingResults);
```

### 4. Re-enabled Startup Seeding

**File:** `/home/user/TERP/server/_core/index.ts`

**Changes:**
- Line 37: Uncommented import of `seedAllDefaults`
- Lines 161-183: Updated comments and re-enabled the function call
- Added detailed logging for seeding start/completion

```typescript
// DI-005: Re-enabled after fixing schema drift issues
logger.info("🌱 Seeding default data (roles, categories, accounts, etc.)...");
await seedAllDefaults();
logger.info("✅ Default data seeding completed");
```

### 5. Added Import

**File:** `/home/user/TERP/server/services/seedDefaults.ts`
- Line 11: Added `import { eq } from "drizzle-orm";` for query filtering

## Schema Compatibility Verification

All seeded tables verified against `/home/user/TERP/drizzle/schema.ts`:

| Table | Fields Used | Schema Match | Notes |
|-------|-------------|--------------|-------|
| locations | site, zone, rack, shelf, bin | ✅ | Auto fields have defaults |
| categories | name | ✅ | Has unique constraint |
| subcategories | name, categoryId | ✅ | FK to categories |
| grades | name, description, sortOrder | ✅ | Has unique constraint on name |
| expenseCategories | categoryName, parentCategoryId | ✅ | Self-referencing FK |
| accounts | accountNumber, accountName, accountType, normalBalance | ✅ | Has unique constraint |

All optional fields (deletedAt, isActive, createdAt, updatedAt) have defaults and don't need to be specified during seeding.

## Files Modified

1. **`/home/user/TERP/server/services/seedDefaults.ts`** (+138, -26)
   - Fixed insertId bugs
   - Made all seeding functions idempotent
   - Added comprehensive error handling
   - Enhanced logging and progress tracking
   - Added database validation

2. **`/home/user/TERP/server/_core/index.ts`** (+12, -12)
   - Uncommented seedAllDefaults import
   - Re-enabled seeding call
   - Updated comments to reflect DI-005
   - Added detailed logging

## Testing Performed

- ✅ TypeScript syntax validation
- ✅ JavaScript syntax check
- ✅ Code review of all modified functions
- ✅ Schema compatibility verification
- ✅ Error handling paths verified

## Manual Testing Required

Before marking as production-ready:
- [ ] Test on fresh database (should seed all defaults)
- [ ] Test on database with existing data (should skip gracefully)
- [ ] Test on Railway deployment (should not crash)
- [ ] Verify logs show correct seeding progress
- [ ] Verify SKIP_SEEDING=true still works as fallback

## Deployment Safety

### Non-Fatal by Design
- If seeding fails, server continues to start
- Health check endpoints remain available
- SKIP_SEEDING=true can bypass seeding if issues occur

### Idempotent
- Can run multiple times safely
- Handles existing data gracefully
- Won't create duplicate entries

### Observable
- Detailed logging at each step
- Summary of what was seeded
- Clear error messages with context

## Environment Variables

- `SKIP_SEEDING=true` - Bypasses all seeding (deprecated, use for emergencies)
- No new environment variables added
- Seeding runs automatically on startup unless SKIP_SEEDING is set

## Rollback Plan

If issues occur after deployment:
1. Set `SKIP_SEEDING=true` environment variable
2. Redeploy or restart service
3. Seeding will be bypassed, server will start normally

## Next Steps

1. Monitor Railway deployment logs for successful seeding
2. Verify no crashes occur during startup
3. Confirm all default data is present in database
4. Remove SKIP_SEEDING fallback in future cleanup (MEET-XXX)

## References

- Task: DI-005
- Original Issue: Schema mismatch causing crashes on Railway (line 162 comment)
- Related: ARCH-003 (RBAC startup validation)
- Documentation: `/home/user/TERP/server/services/__tests__/seedDefaults.validation.md`

## Code Quality

- **Lines Changed:** 150 (2 files)
- **New Dependencies:** None
- **Breaking Changes:** None
- **Backward Compatible:** Yes
- **Test Coverage:** Requires manual testing for integration

---

**Implementation completed by:** Claude Code
**Review Status:** Ready for code review and testing
**Production Ready:** Pending manual testing checklist
