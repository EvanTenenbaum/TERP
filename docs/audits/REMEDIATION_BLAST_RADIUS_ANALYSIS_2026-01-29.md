# Remediation Blast Radius & Impact Analysis

**Date:** 2026-01-29
**Auditor:** Claude (Systems Engineering Review)
**Source:** DATABASE_SCHEMA_DEEP_DIVE_2026-01-29.md
**Purpose:** QA analysis of remediation plan - identify cascading changes and unintended consequences

---

## Executive Summary

This analysis identifies **127 cascading changes** required across **48 files** to safely implement the remediation plan from the deep dive audit. Key risks:

| Category | Files Impacted | Breaking Changes | Risk Level |
|----------|---------------|------------------|------------|
| Race Condition Fixes | 12 | 3 (deadlock scenarios) | 🔴 HIGH |
| Security Fixes (Actor Attribution) | 9 | 6 (API contract changes) | 🔴 HIGH |
| Hard Delete → Soft Delete | 18 | 4 (unique constraints) | 🟡 MEDIUM |
| inArray() Fixes | 6 | 0 | 🟢 LOW |
| Any Type Elimination | 25+ | 0 | 🟢 LOW |
| Decimal Precision | 8 | 2 (calculation changes) | 🟡 MEDIUM |

**Critical Discovery:** Several fixes have interdependencies that require specific execution order to avoid breaking the system.

---

## 1. RACE CONDITION FIXES - Blast Radius

### 1.1 samplesDb.ts (5 Functions)

**Functions Being Fixed:**
- `fulfillSampleRequest()` - Lines 67-168
- `createSampleRequest()` - Lines 21-59
- `checkMonthlyAllocation()` - Lines 235-273
- `updateMonthlyAllocation()` - Lines 278-320
- `setMonthlyAllocation()` - Lines 405-445

**Direct Callers:**

| Caller | File | Line | Impact |
|--------|------|------|--------|
| `samples.fulfill` | `server/routers/samples.ts` | 119 | Must handle new deadlock errors |
| `samples.createRequest` | `server/routers/samples.ts` | 104 | Error type changes |
| `samples.checkAllocation` | `server/routers/samples.ts` | 207 | Return value unchanged |
| `samples.setAllocation` | `server/routers/samples.ts` | 191 | Error type changes |

**UI Components Affected:**

| Component | File | Impact |
|-----------|------|--------|
| SampleManagement.tsx | `client/src/pages/` | Error toast messages may change |
| SampleForm.tsx | `client/src/components/` | No code change, error handling exists |
| SampleList.tsx | `client/src/components/` | No change |
| SampleReturnDialog.tsx | `client/src/components/` | No change |

**Database Tables Locked:**
- `sampleRequests` - FOR UPDATE on request row
- `sampleAllocations` - FOR UPDATE on allocation row
- `batches` - FOR UPDATE on batch.sampleQty

**New Error Types Introduced:**
```typescript
// Callers must handle:
- "Deadlock found when trying to get lock; try restarting transaction"
- "Lock wait timeout exceeded; try restarting transaction"
- "Serialization failure"
```

**Deadlock Scenarios:**
None identified - functions don't call each other with different lock orders.

---

### 1.2 arApDb.ts (2 Functions)

**Functions Being Fixed:**
- `recordInvoicePayment()` - Lines 187-219
- `recordBillPayment()` - Lines 494-526

**Direct Callers:**

| Caller | File | Line | Impact |
|--------|------|------|--------|
| `invoices.recordPayment` | `server/routers/accounting.ts` | 884 | 🔴 DEADLOCK RISK |
| `bills.recordPayment` | `server/routers/accounting.ts` | 1068 | Low risk |
| `quickActions.payVendor` | `server/routers/accounting.ts` | 1753 | 🟡 Orphan risk |

**🔴 CRITICAL: Deadlock Scenario in accounting.ts:884-890**

```typescript
// CURRENT CODE (WILL DEADLOCK)
const result = await arApDb.recordInvoicePayment(input.invoiceId, input.amount);
// ↑ Acquires FOR UPDATE lock on invoice row

const invoice = await arApDb.getInvoiceById(input.invoiceId);
// ↑ Tries to read same row - DEADLOCK if getInvoiceById uses own transaction
```

**Required Cascading Change:**
```typescript
// MUST REFACTOR TO:
const invoice = await arApDb.recordInvoicePayment(input.invoiceId, input.amount);
// ↑ Return invoice data from within transaction, eliminate separate call
```

**🟡 MEDIUM: Orphan Payment Risk in quickActions.payVendor**

```typescript
// CURRENT CODE (DATA CONSISTENCY RISK)
const paymentResult = await db.insert(payments).values({...});  // Step 1: Create payment
if (input.billId) {
  await arApDb.recordBillPayment(input.billId, input.amount);   // Step 2: Update bill
}
// If Step 2 fails, payment record exists but bill not updated = ORPHAN
```

**Required Cascading Change:**
```typescript
// MUST WRAP IN SINGLE TRANSACTION:
await db.transaction(async (tx) => {
  const paymentResult = await tx.insert(payments).values({...});
  if (input.billId) {
    await recordBillPaymentWithTx(tx, input.billId, input.amount);
  }
});
```

**Dashboard Query Impact:**

| Query | File | Line | Impact |
|-------|------|------|--------|
| `getKpis()` | `routers/dashboard.ts` | 175-266 | May timeout waiting for lock |
| `getSalesByClient()` | `routers/dashboard.ts` | 386-444 | May timeout |
| `getCashCollected()` | `routers/dashboard.ts` | 447-503 | May timeout |
| `getClientDebt()` | `routers/dashboard.ts` | 506-564 | May timeout |

**Mitigation:** Add `SKIP LOCKED` to dashboard queries or use shorter transaction timeouts.

---

## 2. SECURITY FIXES (Actor Attribution) - Blast Radius

### 2.1 Files with FORBIDDEN Patterns

| File | Line | Pattern | Fix Required |
|------|------|---------|--------------|
| `routers/advancedTagFeatures.ts` | 70 | `input.createdBy` | Remove from schema, use `ctx.user.id` |
| `routers/clientNeedsEnhanced.ts` | 34, 81 | `input.createdBy` | Remove from schema, use `ctx.user.id` |
| `routers/purchaseOrders.ts` | 143 | `input.createdBy` | Remove from schema, use `ctx.user.id` |
| `inventoryIntakeService.ts` | 253, 282 | `input.userId` | Change signature to accept from router |
| `ordersDb.ts` | 118 | `input.createdBy` | Change signature to accept from router |
| `services/payablesService.ts` | 130 | `input.createdBy` | Change interface, accept from caller |

### 2.2 API Contract Breaking Changes

**Input Schema Changes:**

```typescript
// BEFORE (routers/advancedTagFeatures.ts:63)
.input(z.object({
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  createdBy: z.number()  // ❌ REMOVE THIS
}))

// AFTER
.input(z.object({
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  // createdBy removed - will use ctx.user.id
}))
```

**Service Function Signature Changes:**

| Service | Function | Before | After |
|---------|----------|--------|-------|
| `tagManagementService.ts` | `createTagGroup()` | `(name, desc, color, createdBy)` | `(name, desc, color, actorId)` |
| `payablesService.ts` | `createPayable()` | `CreatePayableInput` with `createdBy` | Remove `createdBy` from interface |
| `inventoryIntakeService.ts` | `processIntake()` | `IntakeInput` with `userId` | Remove `userId`, add parameter |

### 2.3 Test Files Requiring Updates

| Test File | Changes Required |
|-----------|-----------------|
| `server/routers/orders.test.ts` | Remove `createdBy` from mock inputs (lines 79, 94, 121, 153, 183) |
| Integration tests for PO creation | Remove `createdBy` from test data |
| Integration tests for inventory intake | Update to not pass `userId` |

### 2.4 Frontend Impact

**Good News:** Frontend does NOT currently send `createdBy`/`userId`:
- `client/src/components/orders/OrderPreview.tsx` - Already correct
- `client/src/components/inventory/PurchaseModal.tsx` - Already correct
- `client/src/components/work-surface/DirectIntakeWorkSurface.tsx` - Already correct

**No frontend changes required.**

---

## 3. HARD DELETE → SOFT DELETE - Blast Radius

### 3.1 Schema Migrations Required

| Table | Column Status | Migration |
|-------|--------------|-----------|
| `purchaseOrders` | **MISSING** deletedAt | `ALTER TABLE ADD COLUMN deletedAt TIMESTAMP NULL` |
| `purchaseOrderItems` | **MISSING** deletedAt | `ALTER TABLE ADD COLUMN deletedAt TIMESTAMP NULL` |
| `pricingRules` | **MISSING** deletedAt | `ALTER TABLE ADD COLUMN deletedAt TIMESTAMP NULL` |
| `vendorSupply` | **MISSING** deletedAt | `ALTER TABLE ADD COLUMN deletedAt TIMESTAMP NULL` |
| `locations` | **HAS** deletedAt | No migration, but uses `isActive` instead! |
| `grades` | **HAS** deletedAt | No migration, but NOT USING IT |
| `pricingProfiles` | **HAS** deletedAt | No migration, but NOT FILTERING IT |

### 3.2 🔴 CRITICAL: Unique Constraint Conflicts

**Problem: purchaseOrders.poNumber unique constraint**

```sql
-- Current constraint
UNIQUE KEY `uk_po_number` (poNumber)

-- After soft delete:
-- User deletes PO-2025-0001
-- User creates new PO → Gets PO-2025-0001 → FAILS! (soft deleted record still has that number)
```

**Required Migration:**
```sql
-- Option A: Composite unique index
ALTER TABLE purchaseOrders DROP INDEX uk_po_number;
ALTER TABLE purchaseOrders ADD UNIQUE KEY uk_po_number_active (poNumber, (deletedAt IS NULL));

-- Option B: Rename deleted records
UPDATE purchaseOrders
SET poNumber = CONCAT(poNumber, '_DELETED_', DATE_FORMAT(deletedAt, '%Y%m%d%H%i%s'))
WHERE deletedAt IS NOT NULL;
```

### 3.3 Query Updates Required (50+ Queries)

**purchaseOrders.ts (8 queries):**

| Function | Line | Current | Required Change |
|----------|------|---------|-----------------|
| `list()` | 45 | No filter | Add `WHERE deletedAt IS NULL` |
| `getAll()` | 54-55 | No filter | Add filter |
| `getById()` | 231-233 | No filter | Add filter |
| `getBySupplier()` | 460-462 | No filter | Add filter |
| `getByVendor()` | 475 | No filter | Add filter |
| `getByProduct()` | 485-499 | No filter | Add filter to JOIN |
| `submit()` | 513-516 | No filter | Add filter |
| `confirm()` | 557-560 | No filter | Add filter |

**pricingEngine.ts (7 functions):**

| Function | Line | Status | Required Change |
|----------|------|--------|-----------------|
| `getPricingRules()` | 60-65 | Uses `isActive` only | Add `deletedAt IS NULL` |
| `getPricingRuleById()` | 67-77 | No filter | Add filter |
| `getPricingProfiles()` | 157-165 | **HAS deletedAt but NOT USING IT** | Add filter |
| `getPricingProfileById()` | 167-177 | No filter | Add filter |
| `getClientPricingRules()` | 457-461 | No filter | Filter before inArray |
| `deletePricingRule()` | - | Hard delete | Change to `SET deletedAt = NOW()` |
| `deletePricingProfile()` | 224 | Hard delete | Change to `SET deletedAt = NOW()` |

**inventoryDb.ts (4 functions):**

| Function | Line | Status | Required Change |
|----------|------|--------|-----------------|
| `getAllGrades()` | 1271 | No filter | Add `WHERE deletedAt IS NULL` |
| `updateGrade()` | 1290-1292 | No filter | Add filter |
| `deleteGrade()` | 1310 | Hard delete | Change to soft delete |
| Location queries | Various | Use `isActive` | Migrate to `deletedAt` pattern |

**vendorSupplyDb.ts (3 functions):**

| Function | Line | Required Change |
|----------|------|-----------------|
| `getVendorSupplyById()` | 47-50 | Add `WHERE deletedAt IS NULL` |
| `getVendorSupply()` | 76 | Add filter |
| `getAvailableVendorSupply()` | 125 | Add filter |

### 3.4 🟡 MEDIUM: Dual Deletion Mechanism in locations

**Current State:**
- Table HAS `deletedAt` column
- Code uses `isActive = 0` for deletion
- Both mechanisms exist, causing confusion

**Required Changes:**
```typescript
// CURRENT (locations.ts:180)
await db.update(locations).set({ isActive: 0 }).where(eq(locations.id, id));

// REQUIRED
await db.update(locations).set({ deletedAt: new Date() }).where(eq(locations.id, id));
```

**Migration to sync existing data:**
```sql
UPDATE locations SET deletedAt = NOW() WHERE isActive = 0 AND deletedAt IS NULL;
```

### 3.5 UI Components Requiring Updates

| Component | Change Required |
|-----------|-----------------|
| PurchaseOrdersPage.tsx | Filter out `deletedAt IS NOT NULL` records |
| PurchaseOrdersWorkSurface.tsx | Add soft delete handling |
| LocationsPage.tsx (if exists) | Switch from `isActive` to `deletedAt` display |
| PricingProfilesPage.tsx (if exists) | Handle soft deleted records |

### 3.6 Admin Features Required (New)

| Feature | Purpose |
|---------|---------|
| View Deleted Records | Toggle to show soft-deleted items |
| Restore Functionality | Un-delete soft-deleted records |
| Audit Log | Track who deleted and when |

---

## 4. inArray() FIXES - Blast Radius

### 4.1 Isolated Fixes (Low Risk)

| File | Line | Fix | Dependencies |
|------|------|-----|--------------|
| `routers/referrals.ts` | 390 | Change `?` to `?.length` | None |
| `routers/rbac-users.ts` | 466 | Add early return for empty array | None |
| `routers/rbac-users.ts` | 530 | Add early return for empty array | None |
| `routers/rbac-roles.ts` | 541 | Add early return for empty array | None |
| `routers/rbac-roles.ts` | 617 | Add early return for empty array | None |
| `salesSheetsDb.ts` | 829 | Add length check after filter | None |

### 4.2 Pattern to Apply

```typescript
// BEFORE
input.creditIds ? inArray(col, input.creditIds) : undefined

// AFTER
input.creditIds?.length ? inArray(col, input.creditIds) : undefined
```

**No cascading changes required.** These are self-contained fixes.

---

## 5. ANY TYPE ELIMINATION - Blast Radius

### 5.1 High-Impact Files (Require Type Definitions)

| File | Functions | New Types Required |
|------|-----------|-------------------|
| `dashboardAnalytics.ts` | 5 functions | `DashboardKPI`, `RevenueMetrics`, `InventoryMetrics` |
| `accountingDb.ts` | 7 functions | `LedgerQueryResult`, `JournalEntryRow` |
| `arApDb.ts` | 9 functions | `InvoiceQueryResult`, `PaymentQueryResult` |
| `ordersDb.ts` | 1 function | `TransactionContext` |
| `needsMatchingService.ts` | 4 functions | `MatchResult`, `QuoteResponse` |

### 5.2 New Type Definitions to Create

**File: `server/types/dashboard.ts` (new)**
```typescript
export interface DashboardKPIResult {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  // ... define all fields
}
```

**File: `server/types/accounting.ts` (new)**
```typescript
export interface LedgerQueryResult {
  id: number;
  date: Date;
  description: string;
  debit: string;
  credit: string;
  // ... define all fields
}
```

### 5.3 Error Handling any → unknown

**51+ instances of `catch (error: any)` need:**

```typescript
// BEFORE
catch (error: any) {
  console.error(error.message);
}

// AFTER
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(message);
}
```

**Low risk - behavior unchanged, just type-safer.**

---

## 6. DECIMAL PRECISION FIXES - Blast Radius

### 6.1 Payment Status Threshold Bug (arApDb.ts:205)

**Current (BUG):**
```typescript
if (newAmountDue <= 0.01) {
  newStatus = "PAID";  // $0.005 owed = marked PAID
}
```

**Fix:**
```typescript
if (newAmountDue <= 0) {
  newStatus = "PAID";
}
```

**Impact:** Some invoices previously marked PAID may not be with stricter threshold.

**Data Migration Consideration:**
```sql
-- Check for invoices that may be affected:
SELECT * FROM invoices
WHERE status = 'PAID'
AND CAST(amountDue AS DECIMAL(15,2)) > 0
AND CAST(amountDue AS DECIMAL(15,2)) <= 0.01;
```

### 6.2 JavaScript Arithmetic Migration

**Files requiring `financialMath` utility:**

| File | Lines | Current | Required |
|------|-------|---------|----------|
| `ordersDb.ts` | 236-238 | `item.quantity * finalPrice` | `financialMath.multiply()` |
| `salesDb.ts` | 57-59 | `parseFloat()` then multiply | `financialMath.multiply()` |
| `samplesDb.ts` | 111, 136-139 | Quantity arithmetic | `financialMath.subtract()` |
| `arApDb.ts` | 201 | Payment accumulation | `financialMath.add()` |

**New Import Required:**
```typescript
import { financialMath } from '../_core/financialMath';
```

### 6.3 Schema Precision Standardization

**Recommended Changes:**

| Table | Column | Current | Proposed |
|-------|--------|---------|----------|
| `order_line_items` | `cogsAtSale` | decimal(12,4) | decimal(15,4) |
| `invoice_line_items` | `quantity` | decimal(10,2) | decimal(15,4) |
| `sample_allocations` | `quantity` | decimal(10,2) | decimal(15,4) |

**Migration Required:**
```sql
ALTER TABLE order_line_items MODIFY cogsAtSale DECIMAL(15,4);
ALTER TABLE invoice_line_items MODIFY quantity DECIMAL(15,4);
ALTER TABLE sample_allocations MODIFY quantity DECIMAL(15,4);
```

---

## 7. EXECUTION ORDER DEPENDENCIES

### 7.1 Required Sequence

```
Phase 0: Schema Migrations (MUST BE FIRST)
├── Add deletedAt columns to 4 tables
├── Add filtered unique indexes
├── Modify decimal precision columns
└── No code deploys until migrations complete

Phase 1: Non-Breaking Code Changes
├── inArray() fixes (6 files, isolated)
├── Any type elimination (25+ files, isolated)
└── Decimal precision utility migration (8 files)

Phase 2: Breaking API Changes (Deploy Together)
├── Security fixes - remove createdBy/userId from inputs
├── Update service function signatures
└── Update tests

Phase 3: Transaction Additions (Deploy Together)
├── samplesDb.ts transaction wrapping
├── arApDb.ts transaction wrapping
├── accounting.ts caller refactoring (deadlock prevention)
└── dashboard.ts SKIP LOCKED additions

Phase 4: Soft Delete Query Updates (Deploy Together)
├── All query filter additions (50+ queries)
├── Delete operation conversions
└── UI component updates
```

### 7.2 Rollback Points

| Phase | Rollback Strategy | Data Impact |
|-------|-------------------|-------------|
| Phase 0 | Reverse migrations | None (additive) |
| Phase 1 | Revert code | None |
| Phase 2 | Revert code + re-add input fields | None |
| Phase 3 | Remove transaction wrappers | None (execution only) |
| Phase 4 | Remove filters, restore hard deletes | Soft-deleted records become visible |

---

## 8. RISK MATRIX

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Deadlock in payment recording | HIGH | HIGH | Refactor accounting.ts:884-890 FIRST |
| PO number uniqueness failure | HIGH | MEDIUM | Add composite unique index |
| Dashboard timeout under load | MEDIUM | MEDIUM | Add SKIP LOCKED to queries |
| Orphan payments in quickActions | MEDIUM | HIGH | Wrap in transaction |
| Test failures from API changes | HIGH | LOW | Update tests in same PR |
| Soft-deleted records appearing | LOW | MEDIUM | Deploy query filters atomically |

---

## 9. VERIFICATION CHECKLIST

### Pre-Deployment

- [ ] All schema migrations applied to staging
- [ ] All tests updated for API contract changes
- [ ] Transaction retry logic tested with simulated deadlocks
- [ ] Soft delete filters verified with test data
- [ ] Dashboard queries tested under concurrent payment load

### Post-Deployment

- [ ] Monitor for deadlock errors in logs
- [ ] Verify no soft-deleted records appearing in lists
- [ ] Check PO number generation with deleted POs
- [ ] Validate payment recording under concurrency
- [ ] Run AR/AP reconciliation check

### Rollback Triggers

- [ ] > 5 deadlock errors per minute
- [ ] Dashboard response time > 5 seconds
- [ ] Any data inconsistency detected
- [ ] Invoice status calculation errors

---

## 10. SUMMARY: Files Requiring Changes

### By Priority

**P0 - Fix Before Deployment (Blocking Issues):**
1. `server/routers/accounting.ts` - Deadlock prevention (lines 884-890, 1698-1764)
2. Schema migrations for deletedAt columns
3. PO number unique constraint fix

**P1 - Core Remediation:**
1. `server/samplesDb.ts` - Transaction wrapping (5 functions)
2. `server/arApDb.ts` - Transaction wrapping (2 functions)
3. 6 security vulnerability files - Actor attribution
4. 6 inArray() bug files

**P2 - Query Updates:**
1. `server/routers/purchaseOrders.ts` - 8 queries
2. `server/pricingEngine.ts` - 7 functions
3. `server/inventoryDb.ts` - 4 functions
4. `server/vendorSupplyDb.ts` - 3 functions
5. `server/routers/locations.ts` - 5 queries

**P3 - Type Safety:**
1. 25+ files with any types
2. 15+ files with error handling any

### Total File Count: 48 files

---

**Report Generated:** 2026-01-29
**Review Required By:** Before remediation begins
