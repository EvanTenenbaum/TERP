# Master Database Remediation Plan

**Date**: 2026-01-28
**Purpose**: Single cohesive execution plan for all database issues
**Goal**: All 8 Golden Flows running perfectly in production
**Status**: APPROVED FOR EXECUTION

---

## Executive Summary

This plan consolidates findings from:
- Database Schema Review (87+ issues identified)
- Golden Flow Remediation Plan (Tier 1/2/3 prioritization)
- QA Protocol v3.0 Analysis (25 adversarial scenarios)
- Remediation Impact Analysis (pre-requisites and cascading changes)

### Current State
| Metric | Value |
|--------|-------|
| Schema Health Score | 4.5/10 |
| Golden Flows Blocked | 6 of 8 |
| Golden Flows Partial | 2 of 8 |
| Critical Issues | 19 |
| Exploitable Scenarios | 8 |

### Target State
| Metric | Value |
|--------|-------|
| Schema Health Score | 8.0/10 |
| Golden Flows Working | 8 of 8 |
| Critical Issues | 0 |
| Exploitable Scenarios | 0 |

---

## Phase 0: IMMEDIATE PRE-REQUISITES (Day 1)

> **These MUST be completed before ANY other work begins.**
> **Estimated: 4 hours**

### 0.1 Fix samplesDb.ts Race Condition
**File**: `server/samplesDb.ts:109-119`
**Issue**: No transaction, no row lock on sample fulfillment
**Impact**: CHECK constraints would fail; concurrent requests could corrupt data

```typescript
// CURRENT (UNSAFE):
const quantityAfter = (parseFloat(batch.sampleQty) - parseFloat(product.quantity)).toString();
await db.update(batches).set({ sampleQty: quantityAfter })...

// REQUIRED FIX:
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

**Estimate**: 1 hour

---

### 0.2 Fix referrals.ts Empty Array Bug
**File**: `server/routers/referrals.ts:389-391`
**Issue**: Empty array `[]` is truthy, causing inArray([]) crash
**Impact**: API crashes when creditIds is empty array

```typescript
// CURRENT (BUG):
input.creditIds ? inArray(referralCredits.id, input.creditIds) : undefined

// REQUIRED FIX:
input.creditIds?.length ? inArray(referralCredits.id, input.creditIds) : undefined
```

**Estimate**: 30 minutes

---

### 0.3 Fix productCategories.ts Validation
**File**: `server/routers/productCategories.ts:378`
**Issue**: No validation before inArray, crashes on empty array
**Impact**: Bulk product operations fail

```typescript
// CURRENT (BUG):
.where(inArray(products.id, input.productIds))

// REQUIRED FIX:
if (!input.productIds?.length) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "productIds required" });
}
.where(inArray(products.id, input.productIds))
```

**Estimate**: 30 minutes

---

### 0.4 Fix RBAC Empty Array Bugs
**Files**:
- `server/routers/rbac-roles.ts:541, 617`
- `server/routers/rbac-users.ts:466, 530`

**Issue**: Validation happens AFTER inArray query (crashes first)

```typescript
// ADD before each inArray call:
if (!input.permissionIds?.length || !input.roleIds?.length) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "IDs required" });
}
```

**Estimate**: 1 hour

---

### 0.5 Resolve referralSettings Duplicate Table
**Files**:
- `drizzle/schema.ts:6615-6636` (version A: creditPercentage, clientTier)
- `drizzle/schema-gamification.ts:730-767` (version B: couchTax, points)

**Issue**: Two DIFFERENT schemas with SAME table name

**DECISION REQUIRED**:

| Option | Description | Recommendation |
|--------|-------------|----------------|
| A | Merge into single table | Not recommended - bloated |
| B | Rename to separate tables | **RECOMMENDED** |
| C | Deprecate one version | Loses functionality |

**If Option B (Recommended)**:
1. Rename `schema.ts` version to `referralCreditSettings`
2. Rename `schema-gamification.ts` version to `referralGamificationSettings`
3. Create migration to rename actual database tables
4. Update imports in `referrals.ts` and `gamification.ts`

**Estimate**: 2 hours

---

## Phase 1: CRITICAL PATH FIXES (Days 2-3)

> **Unblocks all 8 Golden Flows**
> **Estimated: 16 hours**

### 1.1 Migrate to safeInArray (Critical Paths Only)
**Scope**: 46 files use raw inArray; prioritize Golden Flow paths first

**Priority Order**:
| File | Occurrences | Golden Flows | Priority |
|------|-------------|--------------|----------|
| server/ordersDb.ts | 15 | GF-003, GF-005 | P0 |
| server/inventoryDb.ts | 12 | GF-001, GF-007 | P0 |
| server/arApDb.ts | 5 | GF-004, GF-006 | P0 |
| server/routers/orders.ts | 6 | GF-003 | P0 |
| server/routers/inventory.ts | 8 | GF-007 | P0 |
| server/samplesDb.ts | 2 | GF-008 | P0 |
| server/routers/payments.ts | 3 | GF-004 | P1 |
| server/routers/clientLedger.ts | 2 | GF-006 | P1 |
| (remaining 38 files) | ~80 | Non-critical | P2 |

**Migration Pattern**:
```typescript
// Add import:
import { safeInArray } from "./lib/sqlSafety";

// Replace all occurrences:
// Before: inArray(table.column, array)
// After: safeInArray(table.column, array)
```

**Estimate**: 8 hours (P0 + P1), 4 hours (P2)

---

### 1.2 Add CHECK Constraints on Batch Quantities
**Table**: `batches`
**Pre-requisite**: Phase 0.1 (samplesDb fix) MUST be complete

**Migration**:
```sql
-- drizzle/migrations/XXXX_add_batch_quantity_checks.sql
ALTER TABLE batches
  ADD CONSTRAINT chk_onHandQty_nonnegative
    CHECK (CAST(onHandQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_reservedQty_nonnegative
    CHECK (CAST(reservedQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_sampleQty_nonnegative
    CHECK (CAST(sampleQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_quarantineQty_nonnegative
    CHECK (CAST(quarantineQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_holdQty_nonnegative
    CHECK (CAST(holdQty AS DECIMAL(15,4)) >= 0),
  ADD CONSTRAINT chk_defectiveQty_nonnegative
    CHECK (CAST(defectiveQty AS DECIMAL(15,4)) >= 0);
```

**Rollback**:
```sql
ALTER TABLE batches
  DROP CONSTRAINT chk_onHandQty_nonnegative,
  DROP CONSTRAINT chk_reservedQty_nonnegative,
  DROP CONSTRAINT chk_sampleQty_nonnegative,
  DROP CONSTRAINT chk_quarantineQty_nonnegative,
  DROP CONSTRAINT chk_holdQty_nonnegative,
  DROP CONSTRAINT chk_defectiveQty_nonnegative;
```

**Estimate**: 2 hours

---

### 1.3 Add GL Entry Constraint
**Table**: `ledger_entries`
**Pre-requisite**: None (all inserts already transaction-wrapped)

**Migration**:
```sql
-- drizzle/migrations/XXXX_add_gl_entry_constraint.sql
ALTER TABLE ledger_entries
  ADD CONSTRAINT chk_single_direction
    CHECK (
      (CAST(debit AS DECIMAL(12,2)) = 0 AND CAST(credit AS DECIMAL(12,2)) >= 0) OR
      (CAST(credit AS DECIMAL(12,2)) = 0 AND CAST(debit AS DECIMAL(12,2)) >= 0)
    );
```

**Impact**: 27 insert locations - all already create proper paired entries
**Estimate**: 1 hour

---

### 1.4 Verify strainId LEFT JOINs (Verification Only)
**Status**: Already implemented correctly

**Files using LEFT JOIN (correct)**:
- server/productsDb.ts:117, 281
- server/salesSheetsDb.ts:129
- server/services/strainMatchingService.ts:170, 292
- server/services/catalogPublishingService.ts:352
- server/routers/photography.ts:254, 507, 967
- server/routers/search.ts:276

**Action**: Verify in testing, no code changes needed
**Estimate**: 1 hour (testing only)

---

## Phase 2: DATA INTEGRITY HARDENING (Days 4-5)

> **Prevents incorrect data in production**
> **Estimated: 20 hours**

### 2.1 Convert Hard Deletes to Soft Deletes

**Tables needing deletedAt column added**:
| Table | File Location | Has deletedAt? |
|-------|---------------|----------------|
| pricingRules | schema.ts | NO - add |
| purchaseOrders | schema.ts | NO - add |
| purchaseOrderItems | schema.ts | NO - add |
| vendorSupply | schema.ts | NO - add |

**Tables with deletedAt but using hard delete**:
| Table | Delete Location | Fix |
|-------|-----------------|-----|
| locations | inventoryDb.ts:1168 | Use softDelete() |
| categories | inventoryDb.ts:1221 | Use softDelete() |
| subcategories | inventoryDb.ts:1263 | Use softDelete() |
| grades | inventoryDb.ts:1310 | Use softDelete() |

**Schema Migration**:
```sql
-- drizzle/migrations/XXXX_add_deletedAt_columns.sql
ALTER TABLE pricing_rules ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE purchase_orders ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE purchase_order_items ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE vendor_supply ADD COLUMN deleted_at TIMESTAMP NULL;

CREATE INDEX idx_pricing_rules_deleted ON pricing_rules(deleted_at);
CREATE INDEX idx_purchase_orders_deleted ON purchase_orders(deleted_at);
CREATE INDEX idx_purchase_order_items_deleted ON purchase_order_items(deleted_at);
CREATE INDEX idx_vendor_supply_deleted ON vendor_supply(deleted_at);
```

**Code Changes Required**:
| File | Changes |
|------|---------|
| server/inventoryDb.ts | 4 deletes → softDelete() |
| server/pricingEngine.ts | 2 deletes → softDelete() + 9 query filters |
| server/routers/purchaseOrders.ts | 2 deletes → softDelete() + 10 query filters |
| server/vendorSupplyDb.ts | 1 delete → softDelete() + 6 query filters |
| server/routers/poReceiving.ts | Add 8 query filters |
| server/matchingEngine.ts | Add 2 query filters |

**Estimate**: 12 hours

---

### 2.2 Standardize COGS Precision

**Current State**:
| Column | Current | Target |
|--------|---------|--------|
| batches.unitCogs | decimal(12,4) | Keep |
| batches.unitCogsMin | decimal(12,4) | Keep |
| batches.unitCogsMax | decimal(12,4) | Keep |
| orders.totalCogs | decimal(15,2) | → decimal(15,4) |
| orderLineItems.cogsPerUnit | decimal(10,2) | → decimal(15,4) |
| invoiceLineItems.cogsPerUnit | decimal(10,2) | → decimal(15,4) |

**Migration**:
```sql
-- drizzle/migrations/XXXX_standardize_cogs_precision.sql
ALTER TABLE orders MODIFY COLUMN total_cogs DECIMAL(15,4);
ALTER TABLE order_line_items MODIFY COLUMN cogs_per_unit DECIMAL(15,4);
ALTER TABLE invoice_line_items MODIFY COLUMN cogs_per_unit DECIMAL(15,4);
```

**Code Changes**:
| File | Change |
|------|--------|
| server/cogsCalculator.ts | Verify 4-decimal handling |
| server/services/orderPricingService.ts | Update toFixed(2) → toFixed(4) for calcs |
| server/services/orderAccountingService.ts | Keep toFixed(2) for GL (display only) |

**Estimate**: 4 hours

---

### 2.3 Fix Payment Over-Allocation Risk

**Issue**: Payment can exceed invoice amountDue after invoice modification
**Location**: Invoice payment application logic

**Add Validation Trigger**:
```sql
-- drizzle/migrations/XXXX_payment_allocation_validation.sql
DELIMITER //
CREATE TRIGGER trg_validate_payment_allocation
BEFORE INSERT ON invoice_payments
FOR EACH ROW
BEGIN
  DECLARE inv_amount_due DECIMAL(15,2);
  SELECT amount_due INTO inv_amount_due FROM invoices WHERE id = NEW.invoice_id;
  IF NEW.allocated_amount > inv_amount_due + 0.01 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Payment allocation exceeds invoice amount due';
  END IF;
END//
DELIMITER ;
```

**Estimate**: 2 hours

---

## Phase 3: TECHNICAL DEBT (Week 2+)

> **Post-MVP improvements**
> **Estimated: 40+ hours**

### 3.1 vendorId to supplierClientId Migration
**Scope**: 264 occurrences across 45 files
**Status**: Major refactor project - defer to dedicated sprint

**High-Level Steps**:
1. Add supplierClientId columns to all tables (keep vendorId)
2. Migrate data using vendor_client_mapping table
3. Update all 264 code occurrences
4. Deprecate and remove vendorId columns

**Estimate**: 40 hours (dedicated sprint)

---

### 3.2 Remaining safeInArray Migration
**Scope**: 38 files not in critical path
**Status**: Complete after Phase 1

**Estimate**: 4 hours

---

### 3.3 Client Balance Computed Column
**Issue**: clients.totalOwed can drift from invoice totals
**Solution**: Make computed column or use trigger

```sql
-- Option: Trigger-based sync
CREATE TRIGGER trg_sync_client_balance
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
  UPDATE clients SET total_owed = (
    SELECT COALESCE(SUM(CAST(amount_due AS DECIMAL(15,2))), 0)
    FROM invoices
    WHERE customer_id = NEW.customer_id
      AND status NOT IN ('PAID', 'VOID')
      AND deleted_at IS NULL
  )
  WHERE id = NEW.customer_id;
END;
```

**Estimate**: 4 hours

---

## Execution Timeline

```
Week 1:
├── Day 1 (4h): Phase 0 - Pre-requisites
│   ├── 0.1 Fix samplesDb.ts (1h)
│   ├── 0.2 Fix referrals.ts (0.5h)
│   ├── 0.3 Fix productCategories.ts (0.5h)
│   ├── 0.4 Fix RBAC bugs (1h)
│   └── 0.5 Resolve referralSettings (2h) - MAY EXTEND
│
├── Day 2-3 (16h): Phase 1 - Critical Fixes
│   ├── 1.1 safeInArray migration (12h)
│   ├── 1.2 Batch CHECK constraints (2h)
│   ├── 1.3 GL entry constraint (1h)
│   └── 1.4 Verify strainId (1h)
│
├── Day 4-5 (20h): Phase 2 - Data Integrity
│   ├── 2.1 Soft delete conversion (12h)
│   ├── 2.2 COGS precision (4h)
│   └── 2.3 Payment validation (2h)
│
Week 2+:
├── Phase 3 - Technical Debt (40h+)
│   ├── 3.1 vendorId migration (40h) - DEDICATED SPRINT
│   ├── 3.2 Remaining safeInArray (4h)
│   └── 3.3 Client balance trigger (4h)
```

---

## Verification Checklist

### After Phase 0
- [ ] samplesDb.ts uses transaction + FOR UPDATE
- [ ] referrals.ts handles empty creditIds
- [ ] productCategories.ts validates productIds
- [ ] RBAC routes validate array lengths
- [ ] referralSettings has single definition

### After Phase 1
- [ ] All Golden Flow critical paths use safeInArray
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Batch quantity CHECK constraints active
- [ ] GL entry constraint active
- [ ] Manual test: Create order with empty batches (should not crash)

### After Phase 2
- [ ] All hard deletes converted to soft deletes
- [ ] All queries filter by deletedAt IS NULL
- [ ] COGS columns use decimal(15,4)
- [ ] Payment over-allocation prevented by trigger
- [ ] `pnpm gate:invariants` passes
- [ ] `pnpm mega:qa:invariants` passes

### Golden Flow Verification
- [ ] GF-001 Direct Intake: End-to-end test
- [ ] GF-002 Procure-to-Pay: End-to-end test
- [ ] GF-003 Order-to-Cash: End-to-end test
- [ ] GF-004 Invoice & Payment: End-to-end test
- [ ] GF-005 Pick & Pack: End-to-end test
- [ ] GF-006 Client Ledger: End-to-end test
- [ ] GF-007 Inventory Mgmt: End-to-end test
- [ ] GF-008 Sample Request: End-to-end test

---

## Risk Mitigation

### Rollback Procedures

**Phase 1 Rollback**:
```sql
-- Remove CHECK constraints
ALTER TABLE batches DROP CONSTRAINT chk_onHandQty_nonnegative;
ALTER TABLE batches DROP CONSTRAINT chk_reservedQty_nonnegative;
-- ... etc

-- Remove GL constraint
ALTER TABLE ledger_entries DROP CONSTRAINT chk_single_direction;
```

**Phase 2 Rollback**:
```sql
-- Remove deletedAt columns (DATA LOSS WARNING)
ALTER TABLE pricing_rules DROP COLUMN deleted_at;
-- ... etc

-- Revert COGS precision (may truncate data)
ALTER TABLE orders MODIFY COLUMN total_cogs DECIMAL(15,2);
-- ... etc
```

### Testing Strategy

1. **Unit Tests**: Run `pnpm test` after each phase
2. **Integration Tests**: Run `pnpm test:integration` after Phase 1
3. **Golden Flow Tests**: Manual end-to-end after Phase 2
4. **Invariant Checks**: Run `pnpm gate:invariants` before deployment

---

## Success Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| Golden Flows Working | 8/8 | E2E test pass |
| Critical Issues | 0 | QA audit |
| Exploitable Scenarios | 0 | Adversarial testing |
| Schema Health Score | 8.0+ | Re-audit |
| Build Status | Pass | CI/CD |
| Test Coverage | >80% | Coverage report |

---

## Appendix: File Reference

### Files Modified in Each Phase

**Phase 0** (5 files):
- server/samplesDb.ts
- server/routers/referrals.ts
- server/routers/productCategories.ts
- server/routers/rbac-roles.ts
- server/routers/rbac-users.ts

**Phase 1** (15 files):
- server/ordersDb.ts
- server/inventoryDb.ts
- server/arApDb.ts
- server/samplesDb.ts
- server/routers/orders.ts
- server/routers/inventory.ts
- server/routers/payments.ts
- server/routers/clientLedger.ts
- drizzle/migrations/XXXX_add_batch_quantity_checks.sql
- drizzle/migrations/XXXX_add_gl_entry_constraint.sql

**Phase 2** (20+ files):
- drizzle/schema.ts (add deletedAt columns)
- drizzle/migrations/XXXX_add_deletedAt_columns.sql
- drizzle/migrations/XXXX_standardize_cogs_precision.sql
- drizzle/migrations/XXXX_payment_allocation_validation.sql
- server/inventoryDb.ts
- server/pricingEngine.ts
- server/routers/purchaseOrders.ts
- server/vendorSupplyDb.ts
- server/routers/poReceiving.ts
- server/matchingEngine.ts
- server/cogsCalculator.ts
- server/services/orderPricingService.ts
- server/services/orderAccountingService.ts
- (additional query filter files)

---

*Master Plan created: 2026-01-28*
*Consolidates: DATABASE_SCHEMA_REVIEW, GOLDEN_FLOW_REMEDIATION_PLAN, QA_PROTOCOL_v3_REPORT, REMEDIATION_IMPACT_ANALYSIS*
*Session: claude/database-schema-review-L9yG5*
