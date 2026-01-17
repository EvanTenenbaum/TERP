# MVP TypeScript Error Execution Plan

## Executive Summary

**Version:** 1.0
**Created:** 2026-01-17
**Status:** Ready for Execution
**Total TypeScript Errors:** 23
**Affected Files:** 4
**Estimated Fix Time:** 2-3 hours

---

## Discovery Summary

During MVP completion verification, **23 TypeScript compilation errors** were discovered across 4 files. These errors indicate schema-code drift where the TypeScript service files reference properties that either don't exist in the schema or have different names/types.

**Root Cause Categories:**
1. **Property Naming Mismatch** - Code uses properties that don't exist in schema
2. **Enum Value Mismatch** - Code uses invalid enum values
3. **Type Mismatch** - Code passes incorrect types
4. **API Return Type Mismatch** - Code expects different structure than function returns

---

## Error Breakdown by File

### 1. `server/services/strainMatchingService.ts` (12 errors)

| Line | Error | Issue | Fix |
|------|-------|-------|-----|
| 77, 84-85, 109-110, 161, 304-305 | TS2339: Property 'children' does not exist | `getStrainFamily()` returns `{ parent, variants, variantCount }` not `children` | Replace `children` with `variants` |
| 174, 257 | TS2339: Property 'name' does not exist | `products` table uses `nameCanonical` not `name` | Replace `product.name` with `product.nameCanonical` |
| 85, 110, 161 | TS7006: Parameter 'c' implicitly has any type | Missing type annotation | Add `: { id: number }` type |

**Priority:** P1 (breaks all strain matching functionality)

---

### 2. `server/services/vipCreditService.ts` (2 errors)

| Line | Error | Issue | Fix |
|------|-------|-------|-----|
| 53 | TS2339: Property 'currentBalance' does not exist | `clients` table doesn't have `currentBalance` | Remove unused select or use existing `totalOwed` |
| 97 | TS2769: 'UNPAID' not assignable | Valid values: 'PAID', 'PENDING', 'OVERDUE', 'PARTIAL' | Replace `"UNPAID"` with `"PENDING"` or use `or(eq(..., "PENDING"), eq(..., "OVERDUE"))` |

**Priority:** P0 (blocks credit display feature)

---

### 3. `server/services/vipDebtAgingService.ts` (8 errors)

| Line | Error | Issue | Fix |
|------|-------|-------|-----|
| 183 | TS2339: Property 'companyName' does not exist | `clients` table uses `name` | Replace `clients.companyName` with `clients.name` |
| 185, 330 | TS2339: Property 'referenceNumber' does not exist | `clientTransactions` uses `transactionNumber` | Replace `referenceNumber` with `transactionNumber` |
| 187, 201, 332 | TS2339: Property 'dueDate' does not exist | `clientTransactions` doesn't have `dueDate` | Calculate from `transactionDate` + `paymentTerms` or remove select |
| 199, 340 | TS2769: 'UNPAID' not assignable | Valid values: 'PAID', 'PENDING', 'OVERDUE', 'PARTIAL' | Replace with valid enum values |
| 260 | TS2322: Type 'alert' not assignable to NotificationType | Invalid notification type | Replace 'alert' with valid NotificationType |

**Priority:** P0 (blocks debt aging notifications)

---

### 4. `server/services/vipPortalAdminService.ts` (1 error)

| Line | Error | Issue | Fix |
|------|-------|-------|-----|
| 495 | TS2345: Type number not assignable | `minSpendYtd` is `decimal` in schema (returns string) | Convert number to string: `String(minSpendYtd)` |

**Priority:** P1 (blocks VIP tier updates)

---

## Execution Order

Execute fixes in this order to minimize dependencies:

```
Wave 1: Schema Reference Fixes (Independent, can run in parallel)
├── Fix 1: strainMatchingService.ts (12 errors)
├── Fix 2: vipCreditService.ts (2 errors)
├── Fix 3: vipDebtAgingService.ts (8 errors)
└── Fix 4: vipPortalAdminService.ts (1 error)

Wave 2: Verification
├── Run TypeScript check (pnpm run check)
├── Run test suite (pnpm test)
└── Verify no new errors introduced
```

---

## Detailed Fix Instructions

### Fix 1: strainMatchingService.ts

**Changes Required:**

1. **Lines 77, 84-85** - Replace `family.children` with `family.variants`:
```typescript
// Before:
if (family?.children) {
  targetStrainIds.push(...family.children.map(c => c.id));

// After:
if (family?.variants) {
  targetStrainIds.push(...family.variants.map((c: { id: number }) => c.id));
```

2. **Lines 109-110, 161** - Same pattern replacement

3. **Lines 174, 257** - Replace `product.name` with `product.nameCanonical`:
```typescript
// Before:
productName: product.name

// After:
productName: product.nameCanonical
```

4. **Lines 304-305** - Same children->variants replacement

---

### Fix 2: vipCreditService.ts

**Changes Required:**

1. **Line 53** - Remove unused `currentBalance` from select (field doesn't exist):
```typescript
// Before:
currentBalance: clients.currentBalance,

// After:
// Remove this line entirely - use computed values instead
```

2. **Line 97** - Fix enum value:
```typescript
// Before:
eq(clientTransactions.paymentStatus, "UNPAID")

// After:
or(
  eq(clientTransactions.paymentStatus, "PENDING"),
  eq(clientTransactions.paymentStatus, "OVERDUE")
)
```

---

### Fix 3: vipDebtAgingService.ts

**Changes Required:**

1. **Line 183** - Fix client name property:
```typescript
// Before:
clientName: clients.companyName,

// After:
clientName: clients.name,
```

2. **Lines 185, 330** - Fix transaction number property:
```typescript
// Before:
invoiceNumber: clientTransactions.referenceNumber,

// After:
invoiceNumber: clientTransactions.transactionNumber,
```

3. **Lines 187, 201, 332** - Handle missing dueDate:
```typescript
// Before:
dueDate: clientTransactions.dueDate,
lt(clientTransactions.dueDate, sevenDaysAgo)

// After:
// Option A: Use transactionDate as base
transactionDate: clientTransactions.transactionDate,
// Then calculate due date in application logic

// Option B: Remove dueDate from select and compute from transactionDate
```

4. **Lines 199, 340** - Fix enum values:
```typescript
// Before:
eq(clientTransactions.paymentStatus, "UNPAID")

// After:
or(
  eq(clientTransactions.paymentStatus, "PENDING"),
  eq(clientTransactions.paymentStatus, "OVERDUE")
)
```

5. **Line 260** - Fix notification type:
```typescript
// Before:
type: daysOverdue > 30 ? "alert" : daysOverdue > 14 ? "warning" : "info"

// After (check valid NotificationTypes):
type: daysOverdue > 30 ? "urgent" : daysOverdue > 14 ? "warning" : "info"
// Or use whatever valid types exist in NotificationType
```

---

### Fix 4: vipPortalAdminService.ts

**Changes Required:**

1. **Line 495** - Convert numbers to strings for decimal fields:
```typescript
// Before:
await db.update(vipTiers).set(updateData).where(eq(vipTiers.id, id));

// After:
const convertedData = {
  ...updateData,
  minSpendYtd: updateData.minSpendYtd !== undefined
    ? String(updateData.minSpendYtd)
    : undefined,
  minPaymentOnTimeRate: updateData.minPaymentOnTimeRate !== undefined
    ? String(updateData.minPaymentOnTimeRate)
    : undefined,
  // Add other decimal fields as needed
};
await db.update(vipTiers).set(convertedData).where(eq(vipTiers.id, id));
```

---

## Verification Steps

After all fixes are applied:

1. **TypeScript Check:**
   ```bash
   pnpm run check
   # Expected: 0 errors
   ```

2. **Test Suite:**
   ```bash
   pnpm test
   # Expected: All tests pass (may have pre-existing failures unrelated to these fixes)
   ```

3. **Build Verification:**
   ```bash
   pnpm build
   # Expected: Successful build
   ```

---

## Rollback Plan

If issues are discovered after fixes:

1. **Immediate Revert:**
   ```bash
   git checkout -- server/services/strainMatchingService.ts
   git checkout -- server/services/vipCreditService.ts
   git checkout -- server/services/vipDebtAgingService.ts
   git checkout -- server/services/vipPortalAdminService.ts
   ```

2. **Individual File Rollback:**
   Each file can be reverted independently as fixes are isolated.

---

## Success Criteria

- [ ] TypeScript compilation passes with 0 errors
- [ ] All existing tests continue to pass
- [ ] No new runtime errors introduced
- [ ] Build completes successfully
- [ ] Changes committed with descriptive message

---

## References

- **Schema Files:**
  - `drizzle/schema.ts` (clients, clientTransactions, products)
  - `drizzle/schema-vip-portal.ts` (vipTiers)
- **Service Files:**
  - `server/services/strainService.ts` (getStrainFamily return type)
- **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`

---

**Status:** Ready for RedHat QA Review
