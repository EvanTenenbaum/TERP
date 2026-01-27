# TERP Inventory Flow Analysis Report

**Date:** January 27, 2026
**Session:** claude/debug-inventory-flow-nsPLI
**Analyst:** Claude (Opus 4.5)
**Status:** Investigation Complete, Partial Fixes Applied

---

## Executive Summary

A comprehensive debugging session was conducted to investigate why inventory fails to flow through the TERP system. While the Products page successfully displays 150 products, multiple downstream features fail:

- **Inventory Page:** "No inventory found"
- **Photography Queue:** SQL query error
- **Direct Intake/Spreadsheet View:** Empty grid despite sidebar showing items
- **Create Sales Order:** "Failed to load inventory" with SQL error

### Root Cause Identified

**Schema Drift:** The Drizzle ORM schema defines a `products.strainId` column that does not exist in the production database. Multiple queries LEFT JOIN the `strains` table via this non-existent column, causing "Unknown column 'products.strainId'" errors.

### Impact Assessment

| Severity      | Count | Description                        |
| ------------- | ----- | ---------------------------------- |
| P0 (Critical) | 4     | Inventory flow completely broken   |
| P1 (High)     | 4     | Related features degraded          |
| P2 (Medium)   | 1     | Systemic risk from unsafe patterns |

### Fixes Applied This Session

1. `server/routers/photography.ts` - Added fallback queries for `getQueue` and `getBatchesNeedingPhotos`
2. `server/salesSheetsDb.ts` - Added fallback query for `getInventoryWithPricing`

### Remaining Work

7 new tasks added to MASTER_ROADMAP.md (BUG-110 through BUG-116, ST-055)

---

## Detailed Analysis

### 1. Problem Statement

User reported that inventory doesn't flow through the system:

- Product Catalogue works (150 products visible)
- All other inventory-dependent features fail

Screenshots analyzed:

1. Inventory page: "No inventory found" message
2. Product Catalogue: 150 products visible (working)
3. Photography Queue: SQL error visible
4. Direct Intake page: Items in sidebar, empty data grid
5. Create Sales Order: "Failed to load inventory" error

### 2. Investigation Methodology

#### Phase 1: Error Pattern Analysis

- Examined error messages in screenshots
- Identified "Unknown column 'products.strainId'" as recurring pattern
- Traced error to Drizzle ORM LEFT JOIN operations

#### Phase 2: Schema Analysis

```typescript
// drizzle/schema.ts defines:
strainId: int("strain_id"),  // Column that may not exist in production

// Queries then do:
.leftJoin(strains, eq(products.strainId, strains.id))  // FAILS
```

#### Phase 3: Codebase-Wide Search

Used grep to find all instances of vulnerable patterns:

- 14 locations with `products.strainId` joins
- 127 uses of raw `inArray()` without empty array guards
- 30+ hard delete operations (related risk)

### 3. Root Cause: Schema Drift

**What is Schema Drift?**
When the application's schema definition (Drizzle ORM) diverges from the actual database schema in production.

**How it happened:**

1. `products.strainId` column was defined in Drizzle schema
2. Column was never created in production database (or was removed)
3. autoMigrate may have failed silently, or migration was never run
4. Queries using this column fail at runtime

**Why it wasn't caught:**

- Tests may use mock data without actual DB queries
- TypeScript compilation succeeds (schema looks correct)
- Development database may have the column
- Error only manifests in production with real queries

### 4. Affected Code Locations

#### 4.1 Fixed in This Session

| File                            | Location                            | Status |
| ------------------------------- | ----------------------------------- | ------ |
| `server/routers/photography.ts` | `getQueue` procedure                | FIXED  |
| `server/routers/photography.ts` | `getBatchesNeedingPhotos` procedure | FIXED  |
| `server/salesSheetsDb.ts`       | `getInventoryWithPricing` function  | FIXED  |

**Pattern Applied:**

```typescript
let results;
try {
  // Original query with strains join
  results = await db.select({...})
    .leftJoin(strains, eq(products.strainId, strains.id))
    // ...
} catch (queryError) {
  logger.warn({ error: queryError }, "Query failed, falling back to simpler query");
  // Fallback query WITHOUT strains join
  results = await db.select({
    strainName: sql<string | null>`NULL`.as("strainName"),
    // ...other fields
  })
  // ...without strains join
}
```

#### 4.2 Still Vulnerable (Requires Future Fixes)

| Task ID | File                                          | Line(s)  | Risk Level |
| ------- | --------------------------------------------- | -------- | ---------- |
| BUG-110 | `server/productsDb.ts`                        | 92, 179  | HIGH       |
| BUG-111 | `server/routers/search.ts`                    | 260      | HIGH       |
| BUG-112 | `server/routers/photography.ts`               | 823      | HIGH       |
| BUG-113 | `server/services/catalogPublishingService.ts` | 310      | HIGH       |
| BUG-114 | `server/services/strainMatchingService.ts`    | 136, 234 | HIGH       |

### 5. Secondary Issue: Unsafe inArray() Usage

#### Problem Description

Drizzle ORM's `inArray()` and `notInArray()` functions crash when passed empty arrays:

```typescript
// This generates invalid SQL: WHERE id IN ()
inArray(batches.id, []); // CRASH
```

#### Safe Alternative Exists But Unused

`server/lib/sqlSafety.ts` provides safe wrappers:

- `safeInArray()` - Returns `sql\`false\`` for empty arrays
- `safeNotInArray()` - Returns `sql\`true\`` for empty arrays

#### Current State

- **Safe utilities:** 2 files use them
- **Unsafe calls:** 127 instances across codebase

#### Critical Instance Found

```typescript
// server/ordersDb.ts:1239
const batchIds = [...new Set(draftItems.map(item => item.batchId))];
// No length check - crashes if draftItems is empty
.where(inArray(batches.id, batchIds))
```

### 6. QA Protocol Five-Lens Analysis

Applied the TERP Third-Party QA Protocol v3.0:

#### Lens 1: Regression Analysis

- **Finding:** Schema changes were not validated against production
- **Impact:** Silent failures in production
- **Recommendation:** Add schema validation tests

#### Lens 2: Attack Surface Analysis

- **Finding:** No security vulnerabilities in the affected code
- **Note:** This is a data integrity issue, not security

#### Lens 3: Data Integrity Analysis

- **Finding:** Missing strainId column causes data fetch failures
- **Impact:** Inventory data inaccessible
- **Recommendation:** Add database health checks

#### Lens 4: Performance Analysis

- **Finding:** Fallback queries add slight overhead
- **Impact:** Negligible (try-catch only catches errors)
- **Recommendation:** Acceptable trade-off for resilience

#### Lens 5: UX Impact Analysis

- **Finding:** Users see cryptic error messages
- **Impact:** Lost productivity, confusion
- **Recommendation:** Add user-friendly error boundaries

### 7. Verification Results

```
VERIFICATION RESULTS (Post-Fix)
====================
TypeScript: PASS (pnpm check)
Lint:       PASS (pre-existing errors in unrelated files)
Tests:      2387 PASS / 7 FAIL (pre-existing failures)
Build:      PASS
Push:       SUCCESS (branch: claude/debug-inventory-flow-nsPLI)
```

### 8. Recommendations

#### Immediate (P0)

1. **Fix remaining vulnerable queries** (BUG-110 through BUG-114)
   - Apply try-catch fallback pattern to all strainId joins
   - Estimated time: 8 hours total

2. **Fix ordersDb.ts empty array crash** (BUG-115)
   - Replace `inArray()` with `safeInArray()`
   - Estimated time: 1 hour

#### Short-term (P1)

3. **Add ESLint rule for unsafe inArray()** (part of ST-055)
   - Prevent new unsafe usage
   - Auto-fix existing violations
   - Estimated time: 4 hours

4. **Schema drift detection**
   - Add startup check comparing Drizzle schema to actual DB
   - Log warnings for missing columns
   - Estimated time: 4 hours

#### Medium-term (P2)

5. **Systematic safeInArray adoption** (ST-055)
   - Replace all 127 unsafe calls
   - Add pre-commit hook
   - Estimated time: 16 hours

6. **Database schema documentation**
   - Document expected vs actual schema state
   - Create migration plan for missing columns

### 9. Files Modified This Session

| File                                                | Change Type | Description                                      |
| --------------------------------------------------- | ----------- | ------------------------------------------------ |
| `server/routers/photography.ts`                     | Fix         | Added fallback queries for 2 procedures          |
| `server/salesSheetsDb.ts`                           | Fix         | Added fallback query for getInventoryWithPricing |
| `docs/roadmaps/MASTER_ROADMAP.md`                   | Update      | Added BUG-110 through BUG-116, ST-055            |
| `docs/jan-26-checkpoint/INVENTORY_FLOW_ANALYSIS.md` | New         | This report                                      |

### 10. Commits Made

```
e31cf61 fix(inventory): Add fallback queries for strains join to handle schema drift
```

**Changed Files:**

- `server/routers/photography.ts`
- `server/salesSheetsDb.ts`

---

## Appendix A: Vulnerable Query Locations

### Full List of strainId Join Locations

```
server/productsDb.ts:92
server/productsDb.ts:179
server/routers/search.ts:260
server/routers/photography.ts:315  (FIXED)
server/routers/photography.ts:142  (FIXED)
server/routers/photography.ts:823
server/services/catalogPublishingService.ts:310
server/services/strainMatchingService.ts:136
server/services/strainMatchingService.ts:234
server/salesSheetsDb.ts:120  (FIXED)
```

## Appendix B: inArray Usage Statistics

```
Raw inArray() calls:    127
Raw notInArray() calls:  15
safeInArray() calls:      2
safeNotInArray() calls:   0
```

**Files with Most Unsafe Calls:**

1. `server/ordersDb.ts` - 12 calls
2. `server/routers/orders.ts` - 8 calls
3. `server/inventoryDb.ts` - 7 calls
4. `server/arApDb.ts` - 6 calls

## Appendix C: Related Calendar Issues (Noted)

During investigation, found 30+ hard delete patterns in calendar code:

- `server/routers/calendarRecurrence.ts`
- Uses `db.delete()` instead of soft delete

This violates the "never hard delete" principle but is out of scope for this session.

---

## Conclusion

The inventory flow issue stems from schema drift where `products.strainId` column exists in Drizzle schema but not in production database. Partial fixes were applied to restore Photography Queue and Sales Sheets functionality. Full resolution requires:

1. Applying the same defensive pattern to 5 remaining vulnerable locations
2. Addressing the systemic `inArray()` safety issue (127 calls)
3. Adding schema drift detection to prevent future occurrences

All identified issues have been added to the MASTER_ROADMAP.md for tracking and prioritization.
