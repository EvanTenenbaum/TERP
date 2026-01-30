# SCHEMA-016 Execution Plan

**Task:** Systematic strainId Schema Drift Fix
**Estimate:** 8h
**Created:** 2026-01-30
**Status:** in-progress (graceful degradation complete, migration pending)
**Priority:** P0 (Release Blocker)
**Blocks:** GF-001, GF-002, GF-003, GF-007

---

## 🎯 PROGRESS UPDATE (Jan 30, 2026)

**PR #356 Merged:** Graceful degradation and admin migration endpoints added.

### Completed Work:

| Commit    | Description                                                        | Files Modified                                                          |
| --------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `01e463c` | Graceful degradation + admin migration for strainId                | inventoryIntakeService.ts, strainService.ts, adminQuickFix.ts, adminSchemaPush.ts, analytics.ts |
| `89e18f5` | Remove overly broad strainId pattern from isSchemaError (QA fix)   | strainService.ts                                                        |

### What's Now Working:
- ✅ `strainService.ts`: 4 functions have `isSchemaError()` guards (suggestAlternatives, getProductsByFamily, getTopFamilies, getFamilyTrends)
- ✅ `inventoryIntakeService.ts`: strainId removed from INSERT operations
- ✅ `adminQuickFix.ts`: `addStrainIdToProducts` endpoint available for DB admins
- ✅ `adminSchemaPush.ts`: strainId included in batch schema push

### Remaining Work:
- 🔴 **Run the actual migration** on production (requires DB admin)
- ⚠️ Other files still need NULL placeholder pattern (see Files Requiring Fix below)
- 📋 See `docs/roadmaps/SCHEMA-016-migration-required.md` for migration instructions

---

## Problem Statement

The `products.strainId` column is defined in Drizzle ORM schema (`drizzle/schema.ts`) but **DOES NOT EXIST** in the production MySQL database. This causes `Unknown column 'products.strainId'` SQL errors in 27+ files at runtime.

### Root Cause Analysis

| Factor            | Details                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| Schema Definition | `drizzle/schema.ts` defines `strainId: int("strainId").references(() => strains.id)` |
| Production DB     | Column was never migrated to production MySQL                                        |
| Tests Pass        | Unit tests mock the database, so they don't detect the issue                         |
| Build Passes      | TypeScript compiles against Drizzle schema, not actual DB                            |
| Runtime Fails     | Real SQL queries fail with "Unknown column" error                                    |

### Why Previous Fixes Failed

5 separate fix attempts addressed individual symptoms rather than the systematic root cause:

| Attempt | Commit                 | Scope                     | Why Incomplete         |
| ------- | ---------------------- | ------------------------- | ---------------------- |
| 1       | `a81b697` (SCHEMA-015) | alerts.ts only            | 1 of 27+ files         |
| 2       | `8bb66f7` (BUG-131)    | Frontend only             | Backend still broken   |
| 3       | `20e8d14` (SEC-031)    | Security fix              | Unrelated to schema    |
| 4       | `3bd13b1` (PR #352)    | Linting/safeProductSelect | Partial, not all files |
| 5       | `e6e47cdd` (BUG-112)   | photography.ts only       | 1 of 27+ files         |

---

## Implementation Strategy

### The Fix Pattern

Replace all `products.strainId` column references with a NULL placeholder:

```typescript
// BEFORE: Joins non-existent strainId column (FAILS in production)
.leftJoin(strains, eq(products.strainId, strains.id))
// SELECT with strainId
product: {
  strainId: products.strainId,  // ❌ Column doesn't exist
}

// AFTER: Use NULL placeholder (WORKS in production)
// Remove the join entirely
// In select, use:
product: {
  strainId: sql<number | null>`NULL`.as("strainId"),  // ✅ Works
}
```

### For Services That Require Strains

Add graceful degradation with clear error handling:

```typescript
// Pattern for strain-dependent features
try {
  // Attempt strain-based query
  const result = await db
    .select()
    .from(products)
    .leftJoin(strains, eq(products.strainId, strains.id))
    .where(eq(strains.id, targetStrainId));
  return result;
} catch (error) {
  if (isSchemaError(error)) {
    // Graceful degradation - return empty or log warning
    logger.warn({
      operation: "strainQuery",
      message:
        "Strain features unavailable - strainId column not in production",
    });
    return []; // Or throw user-friendly error
  }
  throw error;
}
```

---

## Implementation Phases

### Phase 1: Critical Path (GF Blockers) - 2h

These files directly block Golden Flows:

| Step | File                                          | Change Required                                              | Est | Verification          |
| ---- | --------------------------------------------- | ------------------------------------------------------------ | --- | --------------------- |
| 1.1  | `server/routers/search.ts`                    | Remove strains join at L229,232; use NULL placeholder        | 20m | Global search works   |
| 1.2  | `server/productsDb.ts`                        | Verify fallback at L103,139,240 works; add missing fallbacks | 30m | Product queries work  |
| 1.3  | `server/services/catalogPublishingService.ts` | Remove strains join at L317; use NULL placeholder            | 15m | Catalog publish works |
| 1.4  | `server/inventoryIntakeService.ts`            | Make strainId optional at L41,142; default to null           | 15m | Batch intake works    |
| 1.5  | Verification                                  | Test GF-001, GF-002, GF-003 locally                          | 40m | All 3 flows pass      |

**Phase 1 Verification:**

```bash
pnpm check && pnpm test && pnpm build
# Manual: Test Orders, PO creation, Batch intake in browser
```

---

### Phase 2: Service Layer - 2h

Fix strain-related services with graceful degradation:

| Step | File                                       | Change Required                                             | Est | Verification                   |
| ---- | ------------------------------------------ | ----------------------------------------------------------- | --- | ------------------------------ |
| 2.1  | `server/services/strainService.ts`         | Add try-catch with isSchemaError() at L161,213,262,310      | 30m | Service doesn't crash          |
| 2.2  | `server/services/strainMatchingService.ts` | Verify BUG-114 fallback at L155,170,173,187,191             | 20m | Matching degrades gracefully   |
| 2.3  | `server/strainMatcher.ts`                  | Add graceful degradation at L360,367,378,388,415,474,480    | 30m | Matcher returns null           |
| 2.4  | `server/matchingEngineEnhanced.ts`         | Skip strain scoring when unavailable at L55,100,112,152-167 | 30m | Matching works without strains |
| 2.5  | `server/matchingEngine.ts`                 | Make strainId optional at L43                               | 10m | Engine works                   |

**Phase 2 Verification:**

```bash
pnpm check && pnpm test
# Test matching features - should work without strain data
```

---

### Phase 3: Router Layer - 2h

Fix all routers that reference strainId:

| Step | File                                    | Change Required                                                       | Est | Verification            |
| ---- | --------------------------------------- | --------------------------------------------------------------------- | --- | ----------------------- |
| 3.1  | `server/routers/productCatalogue.ts`    | Remove strainId from input schemas at L19,35; make optional in output | 30m | Catalogue API works     |
| 3.2  | `server/routers/matchingEnhanced.ts`    | Make strainId optional in schemas at L489,499,553,561                 | 20m | Enhanced matching works |
| 3.3  | `server/routers/strains.ts`             | Add graceful degradation at L44,47                                    | 15m | Strains router degrades |
| 3.4  | `server/routers/clientNeedsEnhanced.ts` | Make strainId optional at L22,69                                      | 15m | Client needs works      |
| 3.5  | `server/routers/admin*.ts`              | Review and fix any strainId references                                | 30m | Admin works             |
| 3.6  | Verification                            | Test all affected router endpoints                                    | 30m | All endpoints respond   |

**Phase 3 Verification:**

```bash
pnpm check && pnpm test
# API tests for each modified router
```

---

### Phase 4: Validation & Hardening - 2h

| Step | Task                             | Est | Verification                 |
| ---- | -------------------------------- | --- | ---------------------------- |
| 4.1  | Run full test suite              | 30m | All tests pass               |
| 4.2  | Run TypeScript check             | 10m | No errors                    |
| 4.3  | Run lint                         | 10m | Clean                        |
| 4.4  | Build verification               | 15m | Build succeeds               |
| 4.5  | strainId grep verification       | 10m | No unsafe references         |
| 4.6  | Add regression test              | 30m | Test prevents reintroduction |
| 4.7  | Update COLUMNS_PENDING_MIGRATION | 5m  | strainId documented          |
| 4.8  | Final verification checklist     | 10m | All green                    |

**Final Verification Command:**

```bash
# Must all pass
pnpm check
pnpm lint
pnpm test
pnpm build

# Must return 0 unsafe references
grep -r "products\.strainId" server/ --include="*.ts" | grep -v "NULL\|test\|\.d\.ts\|isSchemaError" | wc -l

# Must show strainId in pending list
grep "strainId" tests/integration/schema-verification.test.ts
```

---

## Rollback Plan

If deployment fails after fix:

1. **Immediate:** Revert the commit(s)

   ```bash
   git revert HEAD~N  # N = number of commits to revert
   git push origin main
   ```

2. **Monitor:** Check deployment logs

   ```bash
   ./scripts/terp-logs.sh run 100 | grep -i "error"
   ```

3. **Investigate:** Identify which file caused the regression

4. **Re-fix:** Apply fix to remaining file and redeploy

---

## Prevention Measures

### 1. Add CI Check for strainId References

Add to `.github/workflows/pre-merge.yml`:

```yaml
- name: Check for unsafe strainId references
  run: |
    UNSAFE=$(grep -r "products\.strainId" server/ --include="*.ts" | grep -v "NULL\|test\|\.d\.ts\|isSchemaError" | wc -l)
    if [ "$UNSAFE" -gt 0 ]; then
      echo "Found $UNSAFE unsafe strainId references"
      grep -r "products\.strainId" server/ --include="*.ts" | grep -v "NULL\|test\|\.d\.ts\|isSchemaError"
      exit 1
    fi
```

### 2. Add strainId to Pending Migration List

Update `tests/integration/schema-verification.test.ts`:

```typescript
const COLUMNS_PENDING_MIGRATION = [
  "products.strainId", // Add this
];
```

### 3. Feature Flag for Strain Features

When strainId migration is eventually run:

```typescript
// Before enabling strain features:
if (await featureFlags.isEnabled("STRAINS_FEATURE")) {
  // Use strainId queries
} else {
  // Use NULL placeholders
}
```

---

## Acceptance Criteria

- [ ] All 27 files updated with NULL placeholder or graceful degradation
- [ ] `pnpm check` passes with no strainId-related errors
- [ ] `pnpm test` passes (all tests)
- [ ] `pnpm build` succeeds
- [ ] `grep -r "products\.strainId" server/` returns only safe patterns
- [ ] GF-001 (Direct Intake) works in browser
- [ ] GF-002 (Procure-to-Pay) works in browser
- [ ] GF-003 (Order-to-Cash) works in browser
- [ ] GF-007 (Inventory Management) works in browser
- [ ] Regression test added to prevent reintroduction
- [ ] CI check added to block unsafe strainId references

---

## Files Summary

### Files to Modify (27 total)

**Critical Path (5 files):**

1. `server/routers/search.ts`
2. `server/productsDb.ts` (verify existing fallbacks)
3. `server/services/catalogPublishingService.ts`
4. `server/inventoryIntakeService.ts`
5. `server/salesSheetsDb.ts` (already fixed, verify)

**Service Layer (5 files):** 6. `server/services/strainService.ts` 7. `server/services/strainMatchingService.ts` 8. `server/strainMatcher.ts` 9. `server/matchingEngineEnhanced.ts` 10. `server/matchingEngine.ts`

**Router Layer (8 files):** 11. `server/routers/productCatalogue.ts` 12. `server/routers/matchingEnhanced.ts` 13. `server/routers/strains.ts` 14. `server/routers/clientNeedsEnhanced.ts` 15. `server/routers/admin.ts` 16. `server/routers/adminMigrations.ts` 17. `server/routers/adminQuickFix.ts` 18. `server/routers/adminSchemaPush.ts`

**Already Fixed (3 files - verify only):** 19. `server/routers/photography.ts` (has isSchemaError()) 20. `server/routers/alerts.ts` (SCHEMA-015) 21. `server/salesSheetsDb.ts` (SCHEMA-015)

**Test/Seed Files (6 files - update types only):** 22. `server/db/seed/productionSeed.ts` 23. `server/tests/data-anomalies.test.ts` 24. `server/tests/order-diversity.test.ts` 25. `server/_core/validation.ts` 26. `server/autoMigrate.ts` 27. `server/inventoryDb.ts` (already uses NULL)

---

## Blast Radius Analysis

### Executive Summary

**Overall Risk: LOW** - The fix is safe because:

- Frontend already handles null strainId (optional chaining, conditional rendering)
- Core business paths (orders, payments, COGS) don't use strainId
- Strain features degrade gracefully to no-ops, not crashes

### Impact by Layer

| Layer               | Risk Level | Notes                                                  |
| ------------------- | ---------- | ------------------------------------------------------ |
| Frontend            | ✅ LOW     | All components use `{product?.strainId && ...}` guards |
| API Contracts       | ✅ LOW     | All strainId inputs already optional in Zod schemas    |
| Core Business Logic | ✅ LOW     | Orders, invoicing, payments don't use strainId         |
| Strain Features     | ⚠️ MEDIUM  | Become no-ops (graceful degradation)                   |
| Matching Engine     | ⚠️ MEDIUM  | Falls back to text matching                            |

### Critical Functions Requiring Graceful Degradation

These `strainService.ts` functions will crash without guards:

| Function                | Query Pattern                      | Fix Required  |
| ----------------------- | ---------------------------------- | ------------- |
| `suggestAlternatives()` | `products.strainId IN (...)`       | Add try-catch |
| `getProductsByFamily()` | `INNER JOIN strains ON p.strainId` | Add try-catch |
| `getTopFamilies()`      | Same join pattern                  | Add try-catch |
| `getFamilyTrends()`     | Same join pattern                  | Add try-catch |

**Required Pattern:**

```typescript
try {
  // existing query
} catch (error) {
  if (isSchemaError(error)) {
    logger.warn({ msg: "Strain features disabled - strainId column missing" });
    return [];
  }
  throw error;
}
```

### Unaffected Critical Paths

| Domain               | Uses strainId? | Status  |
| -------------------- | -------------- | ------- |
| Orders (GF-003)      | ❌ No          | ✅ Safe |
| Invoicing (GF-004)   | ❌ No          | ✅ Safe |
| Payments             | ❌ No          | ✅ Safe |
| COGS/Valuation       | ❌ No          | ✅ Safe |
| Inventory Quantities | ❌ No          | ✅ Safe |
| VIP Portal           | ❌ No          | ✅ Safe |

### Recommended Execution Order (Updated)

1. **First:** Add isSchemaError() guards to `strainService.ts` (prevents crashes)
2. **Then:** Apply NULL placeholder pattern to critical path files
3. **Then:** Fix remaining service/router files
4. **Optional:** Add feature flag for clean disable/enable

---

## References

- **Diagnosis Report:** 5th-Failure Bug Diagnosis Protocol (2026-01-30)
- **Root Cause:** products.strainId defined in ORM but missing from production DB
- **Previous Fixes:** SCHEMA-015, BUG-112, BUG-131, SEC-031, PR #352
- **Pattern Reference:** `server/salesSheetsDb.ts` (working implementation)
- **Schema Verification:** `tests/integration/schema-verification.test.ts`
- **Blast Radius Analysis:** Added 2026-01-30
