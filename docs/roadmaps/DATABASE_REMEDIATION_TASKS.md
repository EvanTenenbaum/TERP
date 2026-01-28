# Database Remediation Tasks for MASTER_ROADMAP.md

> **Source:** QA Protocol v3.0 Database Audit (2026-01-28)
> **Integrate into:** `docs/roadmaps/MASTER_ROADMAP.md` under MVP: Bug Fixes section

---

## New Task Definitions

### Phase 0: Pre-Requisites (CRITICAL - Must complete first)

| Task | Description | Priority | Status | Estimate | Module |
|------|-------------|----------|--------|----------|--------|
| BUG-117 | Race condition in samplesDb.ts - missing transaction/lock | HIGH | ready | 1h | `server/samplesDb.ts:109-119` |
| BUG-118 | Empty array bug in referrals.ts creditIds check | HIGH | ready | 30m | `server/routers/referrals.ts:389-391` |
| BUG-119 | Missing validation in productCategories.ts bulk update | HIGH | ready | 30m | `server/routers/productCategories.ts:378` |
| BUG-120 | RBAC routes validate arrays after query (crash first) | HIGH | ready | 1h | `server/routers/rbac-roles.ts:541,617`, `rbac-users.ts:466,530` |
| SCHEMA-001 | Duplicate referralSettings table definition | HIGH | ready | 2h | `drizzle/schema.ts:6615`, `drizzle/schema-gamification.ts:730` |

---

### Phase 1: Critical Database Fixes

| Task | Description | Priority | Status | Estimate | Module |
|------|-------------|----------|--------|----------|--------|
| ST-056 | Add CHECK constraints on batch quantities | HIGH | ready | 2h | `drizzle/schema.ts` (batches table) |
| ST-057 | Add GL entry single-direction constraint | HIGH | ready | 1h | `drizzle/schema.ts` (ledger_entries table) |
| ST-058 | Migrate critical paths to safeInArray (P0 files) | HIGH | ready | 8h | ordersDb, inventoryDb, arApDb, samplesDb |

---

### Phase 2: Data Integrity Hardening

| Task | Description | Priority | Status | Estimate | Module |
|------|-------------|----------|--------|----------|--------|
| SCHEMA-002 | Add deletedAt columns to pricing/PO tables | MEDIUM | ready | 2h | pricingRules, purchaseOrders, purchaseOrderItems, vendorSupply |
| ST-059 | Convert hard deletes to soft deletes | MEDIUM | ready | 8h | inventoryDb, pricingEngine, purchaseOrders, vendorSupplyDb |
| ST-060 | Add deletedAt query filters (50+ queries) | MEDIUM | ready | 4h | pricingEngine, purchaseOrders, poReceiving, matchingEngine |
| SCHEMA-003 | Standardize COGS precision to decimal(15,4) | MEDIUM | ready | 4h | orders.totalCogs, orderLineItems, invoiceLineItems |
| ST-061 | Add payment over-allocation validation trigger | MEDIUM | ready | 2h | `drizzle/schema.ts` (invoice_payments) |

---

### Phase 3: Technical Debt (Post-MVP)

| Task | Description | Priority | Status | Estimate | Module |
|------|-------------|----------|--------|----------|--------|
| ST-062 | Complete safeInArray migration (remaining 38 files) | LOW | ready | 4h | Multiple files |
| SCHEMA-004 | Add client balance sync trigger | LOW | ready | 4h | `drizzle/schema.ts` (clients, invoices) |
| PARTY-005 | Migrate vendorId to supplierClientId (264 occurrences) | LOW | ready | 40h | Multiple files (dedicated sprint) |

---

## Detailed Task Specifications

### BUG-117: Race Condition in samplesDb.ts

**Location:** `server/samplesDb.ts:109-119`
**Issue:** Sample fulfillment updates batch quantities without transaction or row lock
**Impact:** Concurrent requests can corrupt sampleQty; blocks CHECK constraint deployment
**Golden Flows Affected:** GF-008 (Sample Request)

**Current Code (UNSAFE):**
```typescript
const quantityAfter = (parseFloat(batch.sampleQty) - parseFloat(product.quantity)).toString();
await db.update(batches).set({ sampleQty: quantityAfter })...
```

**Required Fix:**
```typescript
await db.transaction(async tx => {
  const [batch] = await tx.select().from(batches)
    .where(eq(batches.id, batchId))
    .for("update");

  if (parseFloat(batch.sampleQty) < parseFloat(product.quantity)) {
    throw new Error("Insufficient sample quantity");
  }

  const quantityAfter = (parseFloat(batch.sampleQty) - parseFloat(product.quantity)).toString();
  await tx.update(batches).set({ sampleQty: quantityAfter }).where(eq(batches.id, batchId));
});
```

**Dependencies:** None
**Blocks:** ST-056 (CHECK constraints)

---

### BUG-118: Empty Array Bug in referrals.ts

**Location:** `server/routers/referrals.ts:389-391`
**Issue:** Empty array `[]` is truthy, so `inArray([])` crashes with SQL error
**Impact:** API crashes when creditIds is empty array
**Golden Flows Affected:** Gamification/Referrals

**Current Code (BUG):**
```typescript
input.creditIds ? inArray(referralCredits.id, input.creditIds) : undefined
```

**Required Fix:**
```typescript
input.creditIds?.length ? inArray(referralCredits.id, input.creditIds) : undefined
```

**Dependencies:** None
**Blocks:** ST-058 (safeInArray migration)

---

### BUG-119: Missing Validation in productCategories.ts

**Location:** `server/routers/productCategories.ts:378`
**Issue:** No validation before inArray, crashes on empty array
**Impact:** Bulk product category operations fail
**Golden Flows Affected:** GF-001 (Direct Intake), GF-007 (Inventory)

**Current Code (BUG):**
```typescript
.where(inArray(products.id, input.productIds))
```

**Required Fix:**
```typescript
if (!input.productIds?.length) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "productIds required" });
}
.where(inArray(products.id, input.productIds))
```

**Dependencies:** None
**Blocks:** ST-058 (safeInArray migration)

---

### BUG-120: RBAC Empty Array Validation Order

**Location:** `server/routers/rbac-roles.ts:541,617` and `server/routers/rbac-users.ts:466,530`
**Issue:** Validation happens AFTER inArray query, so crash occurs before validation
**Impact:** RBAC permission/role assignment crashes on empty arrays
**Golden Flows Affected:** All flows (RBAC-dependent)

**Required Fix:** Add length check before inArray calls:
```typescript
if (!input.permissionIds?.length) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "permissionIds required" });
}
// then inArray call
```

**Dependencies:** None
**Blocks:** ST-058 (safeInArray migration)

---

### SCHEMA-001: Duplicate referralSettings Table

**Location:** `drizzle/schema.ts:6615-6636` and `drizzle/schema-gamification.ts:730-767`
**Issue:** Two DIFFERENT schemas with SAME table name "referral_settings"
**Impact:** Migration conflicts, unpredictable behavior, type mismatches

**Schema A (schema.ts):** clientTier, creditPercentage, minOrderAmount, maxCreditAmount
**Schema B (schema-gamification.ts):** defaultCouchTaxPercent, pointsPerReferral, maxPayoutPerMonth

**Required Fix (Option B - Recommended):**
1. Rename schema.ts version to `referralCreditSettings`
2. Rename schema-gamification.ts version to `referralGamificationSettings`
3. Create migration to rename database tables
4. Update imports in `referrals.ts` and `gamification.ts`

**Dependencies:** None
**Blocks:** Any gamification/referral work

---

### ST-056: Batch Quantity CHECK Constraints

**Location:** `drizzle/schema.ts` (batches table)
**Issue:** No database-level enforcement of non-negative quantities
**Impact:** Application bugs can corrupt inventory with negative values
**Golden Flows Affected:** All inventory-related flows

**Migration SQL:**
```sql
ALTER TABLE batches
  ADD CONSTRAINT chk_onHandQty_nonnegative CHECK (CAST(onHandQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_reservedQty_nonnegative CHECK (CAST(reservedQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_sampleQty_nonnegative CHECK (CAST(sampleQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_quarantineQty_nonnegative CHECK (CAST(quarantineQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_holdQty_nonnegative CHECK (CAST(holdQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_defectiveQty_nonnegative CHECK (CAST(defectiveQty AS DECIMAL(15,4)) >= 0);
```

**Dependencies:** BUG-117 (samplesDb fix MUST be complete first)

---

### ST-057: GL Entry Single-Direction Constraint

**Location:** `drizzle/schema.ts` (ledger_entries table)
**Issue:** No database-level enforcement that entries are debit-only or credit-only
**Impact:** Application bugs can create invalid GL entries
**Golden Flows Affected:** GF-004 (Invoice & Payment), GF-006 (Client Ledger)

**Migration SQL:**
```sql
ALTER TABLE ledger_entries
  ADD CONSTRAINT chk_single_direction CHECK (
    (CAST(debit AS DECIMAL(12,2)) = 0 AND CAST(credit AS DECIMAL(12,2)) >= 0) OR
    (CAST(credit AS DECIMAL(12,2)) = 0 AND CAST(debit AS DECIMAL(12,2)) >= 0)
  );
```

**Dependencies:** None (all existing inserts already create proper paired entries)

---

### ST-058: Critical Path safeInArray Migration

**Scope:** Replace raw `inArray()` with `safeInArray()` in Golden Flow critical paths
**Files (Priority Order):**
1. `server/ordersDb.ts` (15 occurrences) - GF-003, GF-005
2. `server/inventoryDb.ts` (12 occurrences) - GF-001, GF-007
3. `server/arApDb.ts` (5 occurrences) - GF-004, GF-006
4. `server/samplesDb.ts` (2 occurrences) - GF-008
5. `server/routers/orders.ts` (6 occurrences) - GF-003
6. `server/routers/inventory.ts` (8 occurrences) - GF-007

**Pattern:**
```typescript
// Add import
import { safeInArray } from "./lib/sqlSafety";

// Replace all occurrences
// Before: inArray(table.column, array)
// After: safeInArray(table.column, array)
```

**Dependencies:** BUG-117, BUG-118, BUG-119, BUG-120 (pre-requisite bugs must be fixed first)

---

## Integration Instructions

### For MASTER_ROADMAP.md

Add under `## 🐛 MVP: Bug Fixes` section, after existing BUG-116 entry:

```markdown
#### Database Integrity Issues (P0) - Jan 28, 2026

> **Source:** QA Protocol v3.0 Database Audit
> **Reference:** `docs/audits/MASTER_DATABASE_REMEDIATION_PLAN.md`

| Task | Description | Priority | Status | Estimate | Module |
|------|-------------|----------|--------|----------|--------|
| BUG-117 | Race condition in samplesDb.ts - missing transaction/lock | HIGH | ready | 1h | `server/samplesDb.ts:109-119` |
| BUG-118 | Empty array bug in referrals.ts creditIds check | HIGH | ready | 30m | `server/routers/referrals.ts:389-391` |
| BUG-119 | Missing validation in productCategories.ts bulk update | HIGH | ready | 30m | `server/routers/productCategories.ts:378` |
| BUG-120 | RBAC routes validate arrays after query (crash first) | HIGH | ready | 1h | `server/routers/rbac-roles.ts`, `rbac-users.ts` |
| SCHEMA-001 | Duplicate referralSettings table definition | HIGH | ready | 2h | `drizzle/schema.ts`, `schema-gamification.ts` |
| ST-056 | Add CHECK constraints on batch quantities | HIGH | ready | 2h | `drizzle/schema.ts` |
| ST-057 | Add GL entry single-direction constraint | HIGH | ready | 1h | `drizzle/schema.ts` |
| ST-058 | Migrate critical paths to safeInArray | HIGH | ready | 8h | ordersDb, inventoryDb, arApDb |
```

Add under `## 🛡️ MVP: Stability & Reliability` section:

```markdown
#### Data Integrity Hardening - Jan 28, 2026

> **Source:** QA Protocol v3.0 Database Audit

| Task | Description | Priority | Status | Estimate | Module |
|------|-------------|----------|--------|----------|--------|
| SCHEMA-002 | Add deletedAt columns to pricing/PO tables | MEDIUM | ready | 2h | Schema migration |
| ST-059 | Convert hard deletes to soft deletes | MEDIUM | ready | 8h | inventoryDb, pricingEngine, purchaseOrders |
| ST-060 | Add deletedAt query filters | MEDIUM | ready | 4h | 50+ queries across codebase |
| SCHEMA-003 | Standardize COGS precision to decimal(15,4) | MEDIUM | ready | 4h | orders, orderLineItems, invoiceLineItems |
| ST-061 | Add payment over-allocation validation | MEDIUM | ready | 2h | invoice_payments trigger |
```

---

*Tasks formatted per CLAUDE.md roadmap specification*
*Session: claude/database-schema-review-L9yG5*
