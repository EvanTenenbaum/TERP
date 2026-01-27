# Phase 0 Schema Drift Fixes - QA Audit Report

**Date**: 2026-01-27
**Auditor**: Claude (Third-Party QA Protocol v3.0)
**Scope**: BUG-110 to BUG-115 fixes
**Branch**: `claude/debug-inventory-flow-nsPLI`

---

## Executive Summary

| Metric           | Value                  |
| ---------------- | ---------------------- |
| QA Complete      | YES                    |
| Initial Verdict  | SHIP WITH CONDITIONS   |
| Issues Found     | 0 P0, 2 P1, 1 P2, 1 P3 |
| Lenses Completed | All 5                  |
| Confidence       | MEDIUM                 |

---

## Scope of Changes Audited

### Files Modified

| File                                          | Bug     | Change Description                                         |
| --------------------------------------------- | ------- | ---------------------------------------------------------- |
| `server/productsDb.ts`                        | BUG-110 | Try-catch fallback for `getProducts()`, `getProductById()` |
| `server/routers/search.ts`                    | BUG-111 | Try-catch fallback for global search batch query           |
| `server/routers/photography.ts`               | BUG-112 | Try-catch fallback for `getAwaitingPhotography()`          |
| `server/services/catalogPublishingService.ts` | BUG-113 | Try-catch fallback for `getPublishedCatalog()`             |
| `server/services/strainMatchingService.ts`    | BUG-114 | Try-catch fallback for strain matching functions           |
| `server/ordersDb.ts`                          | BUG-115 | safeInArray usage + empty order validation                 |

### Blast Radius

```
[Changed Code]
├── productsDb.ts → productCatalogue router → Product Catalogue UI
├── search.ts → Global Search Bar (all pages)
├── photography.ts → Photography Queue page
├── catalogPublishingService.ts → Published Catalog, B2B/E-commerce
├── strainMatchingService.ts → Product recommendations
└── ordersDb.ts → Orders, Quotes, Dashboard, Sales Portal
```

---

## Issues Found

### QA-001 [P1 MAJOR] - getProducts fallback fails with strainId filter

**Location**: `server/productsDb.ts` lines 69-70, 107-128

**Problem**: When `getProducts({ strainId: 5 })` is called and the strainId column doesn't exist:

1. Condition `eq(products.strainId, 5)` is added to conditions array
2. Primary query fails (Unknown column)
3. Fallback query runs with SAME conditions array
4. Fallback ALSO fails (still references non-existent column)

**Evidence**:

```typescript
// Line 69-70: strainId filter added to conditions
if (strainId) {
  conditions.push(eq(products.strainId, strainId));
}

// Line 125: Fallback uses same conditions - FAILS!
.where(conditions.length > 0 ? and(...conditions) : undefined)
```

**Impact**: Product Catalogue page shows error when filtering by strain on systems without strainId column.

**Fix Required**: Build separate fallback conditions that exclude strainId filter.

---

### QA-002 [P1 MAJOR] - getProductCount missing fallback entirely

**Location**: `server/productsDb.ts` lines 175-184

**Problem**: `getProductCount()` uses `products.strainId` in conditions but has NO try-catch fallback.

**Evidence**:

```typescript
// Lines 175-176: Uses products.strainId with no fallback
if (strainId) {
  conditions.push(eq(products.strainId, strainId));
}

// Lines 179-184: Query with no try-catch
const result = await db
  .select({ count: sql<number>`count(*)` })
  .from(products)
  .where(conditions.length > 0 ? and(...conditions) : undefined);
```

**Impact**: Even if `getProducts` uses fallback, `getProductCount` crashes, breaking pagination.

**Fix Required**: Add same try-catch fallback pattern to `getProductCount()`.

---

### QA-003 [P2 MINOR] - Try-catch catches ALL errors

**Location**: All try-catch fallback blocks

**Problem**: The catch blocks catch ALL errors, not just schema-related "Unknown column" errors. This means:

- Connection timeouts trigger fallback (which also times out)
- Permission errors trigger fallback (which also fails)
- Logs misleadingly say "schema drift" for non-schema errors

**Evidence**:

```typescript
} catch (queryError) {
  // This catches ANY error, not just "Unknown column"
  logger.warn({ error: queryError }, "...schema drift...");
  // Fallback runs even for timeouts, connection errors, etc.
```

**Impact**: Minor - logs may be misleading, but functionality still works.

**Fix Recommended**: Check error message before deciding to fallback vs re-throw.

---

### QA-004 [P3 NIT] - Redundant safeInArray after empty check

**Location**: `server/ordersDb.ts` lines 1253-1264

**Problem**: After checking `batchIds.length === 0` and throwing, the safeInArray call can never receive an empty array.

**Evidence**:

```typescript
if (batchIds.length === 0) {
  throw new Error("Cannot confirm order with no line items");
}
// safeInArray is now redundant - can never be empty
.where(safeInArray(batches.id, batchIds))
```

**Impact**: None - defense-in-depth is acceptable.

**Fix Optional**: Could use regular `inArray` with a comment, but current code is safe.

---

## Verification Results

| Check      | Result                                         |
| ---------- | ---------------------------------------------- |
| TypeScript | PASS                                           |
| Lint       | Pre-existing errors (not in changed files)     |
| Tests      | Pre-existing failures (not related to changes) |
| Build      | PASS                                           |

---

## Adversarial Scenarios Tested

| #     | Scenario                                                 | Result                         |
| ----- | -------------------------------------------------------- | ------------------------------ |
| 1-5   | Null/Empty inputs                                        | Handled correctly              |
| 6     | getProducts without strainId filter + missing column     | PASS - Fallback works          |
| 7     | getProducts WITH strainId filter + missing column        | **FAIL - QA-001**              |
| 8-10  | Other functions without strainId filter + missing column | PASS                           |
| 11-14 | Boundary cases (limit, offset, duplicates)               | Handled by Zod/Set             |
| 15-17 | Error handling edge cases                                | **QA-003 found**               |
| 18-20 | Concurrency                                              | PASS - Read-only or FOR UPDATE |
| 21-24 | Data integrity scenarios                                 | PASS                           |

---

## Recommendations

### Before Production Deploy

1. **Fix QA-001**: Modify `getProducts()` fallback to exclude strainId condition
2. **Fix QA-002**: Add try-catch fallback to `getProductCount()`

### Optional Improvements

3. **Consider QA-003**: Make try-catch more specific to schema errors
4. **Ignore QA-004**: Defense-in-depth is acceptable

---

## Fix Implementation Plan

### Step 1: Create helper to filter out strainId conditions

```typescript
// Helper to check if a condition references strainId
function isStrainIdCondition(condition: SQL): boolean {
  // Check if the SQL string contains strain_id reference
  return condition.toString().includes("strain_id");
}
```

### Step 2: Modify getProducts fallback

```typescript
// In fallback, filter out strainId-related conditions
const fallbackConditions = conditions.filter(c => !isStrainIdCondition(c));
```

### Step 3: Add getProductCount fallback

Apply same try-catch pattern used in `getProducts()`.

### Step 4: Make catch blocks more specific (optional)

```typescript
} catch (queryError) {
  if (queryError instanceof Error &&
      queryError.message.includes('Unknown column')) {
    // Schema drift - use fallback
    logger.warn(...);
    // ... fallback query
  } else {
    // Non-schema error - re-throw
    throw queryError;
  }
}
```

---

## Audit Trail

| Commit    | Description                                                                          |
| --------- | ------------------------------------------------------------------------------------ |
| `14f9fb3` | fix(inventory): Add try-catch fallback queries for schema drift (BUG-110 to BUG-114) |
| `a7ebad4` | fix(orders): Use safeInArray and add empty order validation (BUG-115)                |
| `26c64a6` | chore: Update version.json with build metadata                                       |

---

_Report generated by Third-Party QA Protocol v3.0_
