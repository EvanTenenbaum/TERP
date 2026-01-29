# TERP Database & Code Deep Dive Audit

**Date:** 2026-01-29
**Auditor:** Claude (Database/Systems Engineering Review)
**Scope:** Complete schema, code, and security analysis
**Branch:** `claude/database-schema-review-L9yG5`

---

## Executive Summary

This audit identified **350+ issues** across the TERP codebase requiring remediation:

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Race Conditions & Transactions | 7 | 0 | 0 | 7 |
| Security Vulnerabilities | 11 | 4 | 0 | 15 |
| inArray() Empty Array Bugs | 6 | 0 | 0 | 6 |
| Hard Delete Violations | 6 | 14 | 6 | 26 |
| Any Type Usage | 45 | 80 | 125 | 250+ |
| Decimal Precision Issues | 15 | 10 | 5 | 30 |
| Schema Structural Issues | 3 | 8 | 15 | 26 |
| Input Validation Weaknesses | 2 | 25 | 10 | 37 |
| **TOTAL** | **95** | **141** | **161** | **397+** |

### Golden Flow Impact Matrix

| Golden Flow | Status | Critical Blockers |
|-------------|--------|-------------------|
| GF-001 Direct Intake | 🔴 BLOCKED | Race condition in samplesDb.ts, hard deletes in PO |
| GF-002 Procure-to-Pay | 🔴 BLOCKED | Actor attribution vulnerability, hard deletes |
| GF-003 Order-to-Cash | 🔴 BLOCKED | inArray bugs, any types in ordersDb.ts |
| GF-004 Invoice & Payment | 🔴 BLOCKED | Race condition in arApDb.ts, decimal precision |
| GF-005 Pick & Pack | 🟡 PARTIAL | Depends on GF-003 |
| GF-006 Client Ledger | 🟡 PARTIAL | Decimal precision in accounting |
| GF-007 Inventory Mgmt | 🔴 BLOCKED | Race conditions, hard deletes, any types |
| GF-008 Sample Request | 🔴 BLOCKED | 4 race conditions in samplesDb.ts |

---

## 1. CRITICAL: Race Conditions & Transaction Issues

### 1.1 samplesDb.ts - 4 Race Conditions

**Location:** `/home/user/TERP/server/samplesDb.ts`

| Function | Lines | Issue | Impact |
|----------|-------|-------|--------|
| `fulfillSampleRequest()` | 67-168 | Read-modify-write without FOR UPDATE lock | Sample over-allocation |
| `checkMonthlyAllocation()` | 235-273 | TOCTOU vulnerability - check without lock | Allocation limits bypassed |
| `updateMonthlyAllocation()` | 278-320 | Read-modify-write without transaction | Lost sample deductions |
| `setMonthlyAllocation()` | 405-445 | Read-modify-write race | Stale allocation data |

**Example - fulfillSampleRequest() Race:**
```typescript
// CURRENT (UNSAFE) - Lines 95-119
const availableBatches = await db.select()
  .from(batches)
  .where(sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) >= ${product.quantity}`)
  .limit(1);  // ❌ NO .for("update") LOCK

const quantityAfter = (parseFloat(batch.sampleQty) - parseFloat(product.quantity)).toString();
await db.update(batches).set({ sampleQty: quantityAfter });  // ❌ RACE WINDOW

// REQUIRED FIX
await db.transaction(async tx => {
  const [batch] = await tx.select().from(batches)
    .where(eq(batches.id, batchId))
    .for("update");  // ✅ ROW-LEVEL LOCK

  if (parseFloat(batch.sampleQty) < parseFloat(product.quantity)) {
    throw new Error("Insufficient sample quantity");
  }
  const quantityAfter = (parseFloat(batch.sampleQty) - parseFloat(product.quantity)).toString();
  await tx.update(batches).set({ sampleQty: quantityAfter }).where(eq(batches.id, batchId));
});
```

### 1.2 arApDb.ts - 2 Race Conditions

**Location:** `/home/user/TERP/server/arApDb.ts`

| Function | Lines | Issue | Impact |
|----------|-------|-------|--------|
| `recordInvoicePayment()` | 187-219 | Read-modify-write on financial data | Lost payments |
| `recordBillPayment()` | 494-526 | Same issue for accounts payable | Lost vendor payments |

**Example - recordInvoicePayment() Race:**
```typescript
// CURRENT (UNSAFE) - Lines 191-218
const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
const newAmountPaid = Number(invoice[0].amountPaid) + amount;  // ❌ READ-MODIFY
await db.update(invoices).set({ amountPaid: newAmountPaid.toFixed(2) });  // ❌ WRITE

// Risk: Two $50 payments on $100 invoice:
// Process A reads: amountPaid = $0
// Process B reads: amountPaid = $0
// Process A writes: amountPaid = $50
// Process B writes: amountPaid = $50 (LOSES Process A's payment!)
// Result: Only $50 recorded instead of $100
```

### 1.3 createSampleRequest() - TOCTOU

**Location:** `/home/user/TERP/server/samplesDb.ts:21-59`

```typescript
// Line 35: Check allocation (without lock)
const canAllocate = await checkMonthlyAllocation(clientId, totalRequested);
if (!canAllocate) throw new Error("Monthly sample allocation exceeded");

// Lines 41-48: Create request (separate operation)
const [request] = await db.insert(sampleRequests).values({...});
// ❌ Allocation can be consumed between check and insert
```

---

## 2. CRITICAL: Security Vulnerabilities

### 2.1 FORBIDDEN: Actor Attribution from Input

Per CLAUDE.md §3: `input.createdBy` and `input.userId` are **FORBIDDEN**.

| File | Line | Pattern | Risk |
|------|------|---------|------|
| `routers/advancedTagFeatures.ts` | 70 | `input.createdBy` | False attribution |
| `routers/clientNeedsEnhanced.ts` | 34, 81 | `input.createdBy` | False attribution |
| `routers/purchaseOrders.ts` | 143 | `input.createdBy` | Audit trail manipulation |
| `inventoryIntakeService.ts` | 253, 282 | `input.userId` | False actor in audit logs |
| `ordersDb.ts` | 118 | `input.createdBy` | Order attribution fraud |
| `services/payablesService.ts` | 130 | `input.createdBy` | Payables fraud |

**Required Fix Pattern:**
```typescript
// ❌ FORBIDDEN
const createdBy = input.createdBy;

// ✅ CORRECT
import { getAuthenticatedUserId } from "../_core/trpc";
const createdBy = getAuthenticatedUserId(ctx);
```

### 2.2 FORBIDDEN: Fallback User IDs

**Location:** `/home/user/TERP/server/routers/orders.ts.backup-rf001`

| Line | Pattern | Risk |
|------|---------|------|
| 30 | `ctx.user?.id || 1` | Orders attributed to user 1 |
| 101 | `ctx.user?.id || 1` | Confirmations attributed to user 1 |
| 153 | `ctx.user?.id || 1` | Actions attributed to user 1 |

**Action:** Delete backup file or fix patterns if file is restored.

### 2.3 Missing Permission Checks

| File | Line | Issue |
|------|------|-------|
| `routers/calendarParticipants.ts` | 71, 97, 112 | Can add any user to calendar events |
| `routers/todoTasks.ts` | 125, 264 | Can assign tasks to any user |

---

## 3. CRITICAL: inArray() Empty Array Vulnerabilities

### 3.1 Unsafe Calls (Will Crash on Empty Array)

| File | Line | Code | Risk |
|------|------|------|------|
| `routers/referrals.ts` | 390 | `input.creditIds ? inArray(...)` | Truthy check fails on `[]` |
| `routers/rbac-users.ts` | 466 | `inArray(roles.id, input.roleIds)` | Direct user input |
| `routers/rbac-users.ts` | 530 | `inArray(roles.id, input.roleIds)` | Same issue |
| `routers/rbac-roles.ts` | 541 | `inArray(permissions.id, input.permissionIds)` | Direct user input |
| `routers/rbac-roles.ts` | 617 | `inArray(permissions.id, input.permissionIds)` | Same issue |
| `salesSheetsDb.ts` | 829 | `inArray(batches.id, batchIds)` | After filter, may be empty |

**Fix Pattern:**
```typescript
// ❌ UNSAFE - Empty array [] is truthy!
input.creditIds ? inArray(col, input.creditIds) : undefined

// ✅ SAFE - Check length explicitly
input.creditIds?.length ? inArray(col, input.creditIds) : undefined

// ✅ OR use safeInArray utility
import { safeInArray } from "./lib/sqlSafety";
safeInArray(col, input.creditIds)
```

### 3.2 Statistics

- **Total inArray() calls found:** 141
- **Safe (with guards):** 135
- **Unsafe (no guards):** 6
- **Coverage:** 95.7% safe

---

## 4. HIGH: Hard Delete Violations

Per CLAUDE.md §3: "Never hard delete - Always use soft deletes with `deletedAt`"

### 4.1 Critical Violations (Tables WITH deletedAt Being Hard Deleted)

| File | Line | Table | Impact |
|------|------|-------|--------|
| `pricingEngine.ts` | 224 | `pricingProfiles` | Price history lost |
| `inventoryDb.ts` | 1168 | `locations` | Inventory tracking audit lost |
| `inventoryDb.ts` | 1221-1222 | `subcategories`, `categories` | Structure audit lost |
| `inventoryDb.ts` | 1310 | `grades` | Grade hierarchy audit lost |

### 4.2 Tables Missing deletedAt Column

| File | Line | Table | Action Needed |
|------|------|-------|---------------|
| `routers/purchaseOrders.ts` | 320 | `purchaseOrders` | Add deletedAt, convert to soft delete |
| `routers/purchaseOrders.ts` | 443 | `purchaseOrderItems` | Add deletedAt, convert to soft delete |
| `pricingEngine.ts` | 150 | `pricingRules` | Add deletedAt |
| `vendorSupplyDb.ts` | 228 | `vendorSupply` | Add deletedAt |
| `routers/clientWants.ts` | 267 | `clientWants` | Add deletedAt |

### 4.3 Additional Hard Deletes (Lower Priority)

| File | Lines | Tables |
|------|-------|--------|
| `todoListsDb.ts` | 116 | `todoLists` |
| `todoTasksDb.ts` | 231 | `todoTasks` |
| `commentsDb.ts` | 164 | `comments` |
| `inboxDb.ts` | 285 | `inboxItems` |
| `tagManagementService.ts` | 210-221 | `productTags`, `tagHierarchy`, `tags` |
| `routers/photography.ts` | 396 | `productImages` |
| `routers/pickPack.ts` | 475 | `orderItemBags` |

### 4.4 Legitimate Hard Deletes (Acceptable)

| File | Table | Reason |
|------|-------|--------|
| `services/leaderboard/cacheService.ts` | `leaderboardMetricCache` | Cache expiration |
| `scripts/seed-calendar-test-data.ts` | Test tables | Test data seeding |
| `test-setup.ts` | Multiple | Test database reset |

---

## 5. HIGH: Any Type Usage (200+ Violations)

Per CLAUDE.md §3: "Never use `any` type"

### 5.1 Critical (Financial/Inventory Calculations)

| File | Lines | Issue | Impact |
|------|-------|-------|--------|
| `dashboardAnalytics.ts` | 18, 71, 128, 309, 334 | `Promise<any>` returns | Financial metrics untyped |
| `pricingEngine.ts` | 24, 39 | `[key: string]: any` | Custom metadata unvalidated |
| `accountingDb.ts` | 49, 226, 239, 242, 324, 342, 460 | `query as any` | Ledger queries untyped |
| `arApDb.ts` | 66, 79, 82, 374, 387, 390, 684, 697, 700 | `query as any` | AR/AP queries untyped |
| `ordersDb.ts` | 1964 | `tx: any` | Transaction parameter |
| `needsMatchingService.ts` | 47, 175, 234, 257 | `Promise<any>` | Quote/match returns |

### 5.2 High (Database Operations)

| File | Lines | Issue |
|------|-------|-------|
| `routers/orders.ts` | 432 | `item: any` in line item processing |
| `services/live-shopping/sessionCartService.ts` | 64, 91 | `tx: any` transaction parameter |
| `recurringOrdersDb.ts` | 14, 68, 88 | `orderTemplate: any` |
| `cashExpensesDb.ts` | 43, 164, 177, 296, 385, 398 | `query as any` |
| `db.ts` | 19, 37 | `drizzle(pool as any)` |

### 5.3 Medium (Error Handling - 51+ Instances)

```typescript
// Pattern found in 15+ files
catch (error: any) {
  // ❌ Error type is unknown, use: catch (error: unknown)
}
```

**Files with error handling any:**
- `services/seedDefaults.ts` (8 instances)
- `routers/debug.ts` (19 instances)
- `routers/liveShopping.ts` (5 instances)
- `routers/vipPortalLiveShopping.ts` (3 instances)

### 5.4 Summary Statistics

| Severity | Count | Fix Priority |
|----------|-------|--------------|
| CRITICAL | ~45 | Immediate |
| HIGH | ~80 | This sprint |
| MEDIUM | ~75 | Next sprint |
| LOW (tests) | ~50 | Backlog |
| **TOTAL** | **~250** | |

---

## 6. HIGH: Decimal Precision Issues

### 6.1 Schema Precision Inconsistencies

| Table | Column | Current | Should Be | Risk |
|-------|--------|---------|-----------|------|
| `order_line_items` | `cogsAtSale` | (12,4) | (15,2) | Overflow on multiply |
| `invoice_line_items` | `quantity` | (10,2) | (15,4) | Max 99,999.99 units |
| `sample_allocations` | `quantity` | (10,2) | (15,4) | Inconsistent with batches |
| `batches` | `unitCogs*` | (12,4) | (15,2) | Extra precision unnecessary |

### 6.2 JavaScript Arithmetic Without Protection

**310+ `.toFixed()` calls found, but only 29 use `financialMath` utility.**

| File | Lines | Issue |
|------|-------|-------|
| `ordersDb.ts` | 236-238 | `item.quantity * finalPrice` - JS float |
| `salesDb.ts` | 57-59 | `parseFloat()` then multiply |
| `samplesDb.ts` | 111, 136-139 | Quantity arithmetic with parseFloat |
| `arApDb.ts` | 201 | Payment accumulation |

**Example - Lost Precision:**
```typescript
// ordersDb.ts:236-238
const lineTotal = item.quantity * finalPrice;  // ❌ JS float
const lineCogs = item.quantity * cogsResult.unitCogs;  // ❌ Precision loss
```

### 6.3 Critical Bug: Payment Status Threshold

**Location:** `arApDb.ts:205`

```typescript
// CURRENT (BUG)
if (newAmountDue <= 0.01) {
  newStatus = "PAID";  // ❌ $0.005 owed = marked PAID
}

// CORRECT
if (newAmountDue <= 0) {
  newStatus = "PAID";
}
```

### 6.4 COGS Calculation Chain

```
Database (12,4)
  → parseFloat() [loses scale info]
  → JavaScript arithmetic (IEEE 754)
  → × quantity (15,4)
  → accumulate in reduce()
  → .toFixed(2)
  → PRECISION LOSS
```

**Files requiring financialMath migration:**
- `cogsCalculation.ts`
- `inventoryUtils.ts`
- `ordersDb.ts`
- `arApDb.ts`
- `salesDb.ts`

---

## 7. MEDIUM: Schema Structural Issues

### 7.1 Critical: Enum Name Mismatch (Runtime Error)

**Location:** `drizzle/schema-live-shopping.ts:39`

```typescript
// CURRENT (WILL CRASH)
export const cartItemStatusEnum = mysqlEnum("cartItemStatus", [...]);
// Used on column "itemStatus" at line 156
// ❌ Enum name "cartItemStatus" doesn't match column name "itemStatus"

// REQUIRED FIX
export const cartItemStatusEnum = mysqlEnum("itemStatus", [...]);
```

### 7.2 Missing FK Indexes (Performance)

| File | Table | Column | Missing Index |
|------|-------|--------|---------------|
| `schema-rbac.ts` | `rolePermissions` | `roleId`, `permissionId` | Both columns |
| `schema-rbac.ts` | `userRoles` | `userId`, `roleId` | Both columns |
| `schema-rbac.ts` | `userPermissionOverrides` | `userId`, `permissionId` | Both columns |
| `schema-vip-portal.ts` | `clientInterestListItems` | `interestListId`, `batchId` | Both columns |
| `schema-vip-portal.ts` | `adminImpersonationActions` | `sessionId` | No index |
| `schema-storage.ts` | `batchZoneAssignments` | `assignedById` | No index |

### 7.3 Duplicate Status Enums (15+ Conflicts)

**Problem:** Multiple tables use `mysqlEnum("status", [...])` with different values.

| File | Table | Status Values |
|------|-------|---------------|
| `schema-scheduling.ts` | `roomBookings` | pending, confirmed, in_progress, completed, cancelled |
| `schema-scheduling.ts` | `employeeShifts` | scheduled, started, completed, absent, cancelled |
| `schema-scheduling.ts` | `deliverySchedules` | pending, confirmed, in_transit, delivered, delayed, cancelled |
| `schema-sprint5-trackd.ts` | `rewardRedemptions` | PENDING, APPROVED, APPLIED, EXPIRED, CANCELLED |
| `schema-sprint5-trackd.ts` | `couchTaxPayouts` | PENDING, APPROVED, PAID, VOID |

**Fix:** Rename to table-specific enum names: `roomBookingStatusEnum`, `employeeShiftStatusEnum`, etc.

### 7.4 Missing deletedAt Column

**Location:** `drizzle/schema-cron.ts` - `cronLeaderLock` table

```typescript
// CURRENT - Missing deletedAt
createdAt: timestamp("created_at").defaultNow(),
updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
// ❌ No deletedAt

// REQUIRED
deletedAt: timestamp("deleted_at"),
```

---

## 8. MEDIUM: Input Validation Weaknesses

### 8.1 SQL Injection Risk

**Location:** `routers/refunds.ts:139, 222`

```typescript
sql`${transactions.notes} LIKE ${`%return #${input.returnId}%`}`
// ⚠️ Template literal in LIKE clause - validate input.returnId is number
```

### 8.2 Missing Array Bounds

| File | Line | Field | Issue |
|------|------|-------|-------|
| `routers/accounting.ts` | 790-801 | `lineItems` | No `.min(1)` - allows empty invoices |
| `routers/orders.ts` | 112 | `lineItems` | No `.min(1)` - allows empty orders |
| `routers/payments.ts` | 647-652 | `allocations` | No `.min(1)` - allows payment with no allocations |

### 8.3 Weak String Validation

| File | Lines | Fields Missing Constraints |
|------|-------|---------------------------|
| `routers/accounting.ts` | 511-788 | `accountNumber`, `accountName`, `description`, `notes` - no max length |
| `routers/credits.ts` | 39 | `searchTerm` - no max length (DoS risk) |
| `routers/inventory.ts` | 111-117 | `search`, `category`, `subcategory` - no max length |

### 8.4 Missing Numeric Constraints

| File | Line | Field | Issue |
|------|------|-------|-------|
| `routers/accounting.ts` | 635 | `amount: z.number()` | Missing `.positive()` |
| `routers/refunds.ts` | 99 | `amount: z.string()` | String without numeric validation |
| `routers/accounting.ts` | 796-797 | `quantity`, `unitPrice` | Strings, no numeric validation |

---

## 9. Remediation Priority Matrix

### Tier 1: Critical (Block Golden Flows) - Fix Immediately

| ID | Issue | File:Line | Est |
|----|-------|-----------|-----|
| BUG-200 | Race condition in samplesDb.fulfillSampleRequest | `samplesDb.ts:67-168` | 2h |
| BUG-201 | Race condition in arApDb.recordInvoicePayment | `arApDb.ts:187-219` | 2h |
| BUG-202 | Race condition in arApDb.recordBillPayment | `arApDb.ts:494-526` | 1h |
| SEC-100 | Actor attribution from input (6 locations) | Multiple | 4h |
| BUG-203 | inArray empty array bugs (6 locations) | Multiple | 2h |
| SCHEMA-100 | Enum name mismatch in live-shopping | `schema-live-shopping.ts:39` | 30m |

### Tier 2: High (Data Integrity) - This Sprint

| ID | Issue | File:Line | Est |
|----|-------|-----------|-----|
| BUG-204 | Payment status threshold bug | `arApDb.ts:205` | 30m |
| SCHEMA-101 | Add missing FK indexes in RBAC | `schema-rbac.ts` | 2h |
| DEL-100 | Convert hard deletes in purchaseOrders | `purchaseOrders.ts` | 3h |
| DEL-101 | Convert hard deletes in pricingEngine | `pricingEngine.ts` | 2h |
| DEL-102 | Convert hard deletes in inventoryDb | `inventoryDb.ts` | 3h |
| TYPE-100 | Fix any types in dashboardAnalytics | `dashboardAnalytics.ts` | 4h |
| TYPE-101 | Fix any types in accountingDb | `accountingDb.ts` | 3h |

### Tier 3: Medium (Quality) - Next Sprint

| ID | Issue | Files | Est |
|----|-------|-------|-----|
| SCHEMA-102 | Rename duplicate status enums | `schema-scheduling.ts`, `schema-sprint5-trackd.ts` | 4h |
| VAL-100 | Add array .min(1) to financial inputs | `accounting.ts`, `orders.ts`, `payments.ts` | 2h |
| VAL-101 | Add string length limits | Multiple routers | 4h |
| PREC-100 | Migrate to financialMath utility | `ordersDb.ts`, `arApDb.ts`, `salesDb.ts` | 8h |
| TYPE-102 | Fix error handling any types | 15+ files | 6h |

---

## 10. Golden Flow Remediation Mapping

### GF-001 Direct Intake

**Blockers:**
- BUG-200: samplesDb race condition
- DEL-100: purchaseOrders hard delete

**Files to Fix:**
- `server/samplesDb.ts`
- `server/routers/purchaseOrders.ts`

### GF-002 Procure-to-Pay

**Blockers:**
- SEC-100: Actor attribution in purchaseOrders.ts
- DEL-100: purchaseOrders hard delete
- DEL-101: vendorSupply hard delete

**Files to Fix:**
- `server/routers/purchaseOrders.ts`
- `server/vendorSupplyDb.ts`
- `server/services/payablesService.ts`

### GF-003 Order-to-Cash

**Blockers:**
- BUG-203: inArray bugs in RBAC (affects order permissions)
- TYPE-100: any types in ordersDb.ts
- SEC-100: Actor attribution in ordersDb.ts

**Files to Fix:**
- `server/ordersDb.ts`
- `server/routers/orders.ts`
- `server/routers/rbac-users.ts`
- `server/routers/rbac-roles.ts`

### GF-004 Invoice & Payment

**Blockers:**
- BUG-201: recordInvoicePayment race condition
- BUG-202: recordBillPayment race condition
- BUG-204: Payment status threshold bug
- PREC-100: Decimal precision in arApDb

**Files to Fix:**
- `server/arApDb.ts`

### GF-007 Inventory Management

**Blockers:**
- BUG-200: samplesDb race conditions (4)
- DEL-102: inventoryDb hard deletes
- TYPE-100: any types in inventoryDb

**Files to Fix:**
- `server/samplesDb.ts`
- `server/inventoryDb.ts`

### GF-008 Sample Request

**Blockers:**
- BUG-200: All 4 samplesDb race conditions

**Files to Fix:**
- `server/samplesDb.ts`

---

## 11. Verification Commands

```bash
# After each fix, run:
pnpm check          # TypeScript
pnpm lint           # ESLint
pnpm test           # Unit tests
pnpm build          # Build verification

# For race condition fixes, add integration tests:
pnpm test server/samplesDb.race-condition.test.ts
pnpm test server/arApDb.race-condition.test.ts

# For security fixes:
grep -r "input.createdBy" server/  # Should return 0 results
grep -r "ctx.user?.id || 1" server/  # Should return 0 results
```

---

## 12. Appendix: File Index

### Critical Path Files

| File | Issues Found | Priority |
|------|--------------|----------|
| `server/samplesDb.ts` | 4 race conditions | P0 |
| `server/arApDb.ts` | 2 race conditions, precision bug | P0 |
| `server/ordersDb.ts` | any types, actor attribution | P0 |
| `server/routers/purchaseOrders.ts` | hard deletes, actor attribution | P1 |
| `server/dashboardAnalytics.ts` | 5 any types in financial calcs | P1 |
| `server/accountingDb.ts` | 7 any types in ledger queries | P1 |
| `drizzle/schema-rbac.ts` | Missing FK indexes | P1 |
| `drizzle/schema-live-shopping.ts` | Enum name mismatch | P0 |

### Total Files Requiring Changes

- **Schema files:** 6
- **Database layer:** 8
- **Router layer:** 12
- **Service layer:** 6
- **Total:** 32 files

---

**Report Generated:** 2026-01-29
**Next Review:** After Tier 1 remediation complete
