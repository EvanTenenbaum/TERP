# Pre-Existing Issues Found During QA Review

**Date:** 2026-01-24
**Session:** Session-20260124-ROADMAP-EXEC-a9ec3a
**Reviewer:** Claude (Opus 4.5)

## Summary

During comprehensive QA review, the following pre-existing issues were identified that were NOT introduced by this session's changes but require attention.

---

## CRITICAL Issues

### 1. Property Test Edge Cases (Pre-existing)

**File:** `tests/property/vip-portal/pii-masking.property.test.ts`
**Line:** 29

**Issue:** PII masking fails for short email addresses like `a.a@a.aa`
- The masking reveals more than 2 characters of the local part
- Counterexample: `["a.a@a.aa"]`

**Recommendation:** Update piiMasker.email() to handle edge cases where local part is ≤3 characters.

---

### 2. Property Test - Inventory Validation (Pre-existing)

**File:** `tests/property/inventory/calculations.property.test.ts`
**Line:** 143

**Issue:** `validateQuantityConsistency` fails for edge case batches
- Counterexample: `{"onHandQty":"0.02","reservedQty":"0.01","quarantineQty":"0.01","holdQty":"0.01"}`
- Sum of reserved+quarantine+hold (0.03) exceeds onHand (0.02)

**Recommendation:** Either fix the validation logic or update the test generator to only create consistent batches.

---

## HIGH Issues

### 3. `any` Types in accountingHooks.ts (Pre-existing)

**File:** `server/accountingHooks.ts`
**Lines:** 131, 221, 287, 353, 418, 483, 579, 580

**Issue:** 8 instances of `any` type usage
- `Promise<any[]>` return types on GL posting functions
- `as any` casts in seedStandardAccounts

**Recommendation:** Create proper TypeScript interfaces:
```typescript
interface JournalEntryResult {
  account: number;
  debit: number;
  credit: number;
}
```

---

### 4. `any` Type in ordersDb.ts (Pre-existing)

**File:** `server/ordersDb.ts`
**Lines:** 1703-1704

**Issue:** `tx: any` parameter in decrementInventoryForOrder function

**Recommendation:** Use proper Drizzle transaction type:
```typescript
tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
```

---

## MEDIUM Issues

### 5. Seed Tests Require DATABASE_URL (Infrastructure)

**Files:** 9 test files in `scripts/seed/seeders/*.test.ts`

**Issue:** Tests fail when DATABASE_URL environment variable is not set
- seed-batches.test.ts
- seed-orders.test.ts
- seed-payments.test.ts
- seed-purchase-orders.test.ts
- seed-vendor-bills.test.ts
- And 4 others

**Recommendation:** Configure test database or skip these tests in CI when no database is available.

---

### 6. EventFormDialog Test Mock Issue (Pre-existing)

**File:** `client/src/components/calendar/EventFormDialog.test.tsx`
**Line:** 36

**Issue:** `Cannot access 'mockCreateMutation' before initialization`
- Mock variable hoisting issue

**Recommendation:** Move mock definition before vi.mock() call or use factory function.

---

### 7. Console Methods Lint Warnings (Pre-existing)

**File:** `client/src/hooks/work-surface/usePerformanceMonitor.ts`

**Issue:** ESLint warnings about console methods
- `no-console` rule violations for performance logging
- `no-undef` for `performance` and `PerformanceObserver` browser globals

**Recommendation:** Add ESLint overrides for browser environment or use window.performance.

---

## LOW Issues

### 8. Large Bundle Size Warning

**Issue:** Some chunks exceed 800 kB after minification
- react-vendor: 903 kB
- index: 1,529 kB
- vendor: 1,820 kB

**Recommendation:** Implement code splitting with dynamic imports.

---

### 9. Reversal Atomicity in accountingHooks.ts

**File:** `server/accountingHooks.ts`
**Lines:** 512-526

**Issue:** Reversal entries in `reverseGLEntries` are created sequentially
- If one fails, previous reversals remain, potentially unbalancing GL

**Recommendation:** Wrap all reversals in a single transaction.

---

## Issues Fixed This Session

The following issues were fixed during this QA session:

| Issue | File | Fix Applied |
|-------|------|-------------|
| `?? 1` pattern | ordersDb.ts | Made parameters required, added validation |
| Hard deletes | ordersDb.ts | Converted to soft deletes with deletedAt |
| Missing transaction | accountingHooks.ts | Added transaction wrapper for journal entries |
| console.debug (forbidden) | usePerformanceMonitor.ts | Removed/replaced with silent catch |
| Permission cache TTL | permissionService.ts | Reduced from 5min to 60sec |
| Negative inventory | inventoryDb.ts, inventory.ts | Added validation at 3 layers |

---

## Tracking

These pre-existing issues should be added to the roadmap as separate tasks:

| Issue | Suggested Task ID | Priority |
|-------|-------------------|----------|
| PII masking edge case | BUG-XXX | MEDIUM |
| Inventory validation test | BUG-XXX | LOW |
| accountingHooks any types | TECH-DEBT-XXX | MEDIUM |
| ordersDb any types | TECH-DEBT-XXX | LOW |
| Seed test infrastructure | TEST-INFRA-02 | MEDIUM |
| EventFormDialog mock | BUG-XXX | LOW |
| Bundle size optimization | PERF-XXX | LOW |
| Reversal atomicity | FIN-XXX | MEDIUM |
