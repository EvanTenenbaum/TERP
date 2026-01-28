# Remediation Impact Analysis

**Date**: 2026-01-28
**Purpose**: Comprehensive analysis of unintended consequences for each proposed fix
**Status**: Pre-implementation review

---

## Executive Summary

This document analyzes every proposed remediation from the QA Protocol v3.0 report and identifies all cascading changes required in the codebase to prevent breaking changes or unintended consequences.

| Fix Category | Direct Changes | Cascading Changes | Risk Level | Pre-requisites |
|--------------|----------------|-------------------|------------|----------------|
| P0-1: CHECK constraints | 1 migration | 2 files need error handling | MEDIUM | Fix samplesDb.ts first |
| P0-2: safeInArray migration | 45 file changes | 3 critical bugs to fix first | HIGH | Fix referrals.ts, productCategories.ts |
| P0-3: strainId LEFT JOINs | 0 (already correct) | N/A | NONE | Already implemented |
| P0-4: referralSettings duplicate | Schema consolidation | 2 routers need refactor | HIGH | Design decision required |
| P1-1: Soft delete conversion | 4 tables + 50+ queries | Schema migration + cascade logic | HIGH | Add deletedAt columns first |
| P1-2: GL balance constraint | 1 constraint | 27 insert locations | MEDIUM | All wrapped in transactions |
| P1-3: COGS precision | 3 columns to migrate | Recalculation for existing data | HIGH | Data migration plan required |
| P2-1: vendorId migration | 264 occurrences | FK changes + data migration | CRITICAL | Major refactor project |

---

## P0-1: CHECK Constraints on Batch Quantities

### Proposed Change
```sql
ALTER TABLE batches
  ADD CONSTRAINT chk_onHandQty_nonnegative CHECK (CAST(onHandQty AS DECIMAL) >= 0);
ALTER TABLE batches
  ADD CONSTRAINT chk_reservedQty_nonnegative CHECK (CAST(reservedQty AS DECIMAL) >= 0);
ALTER TABLE batches
  ADD CONSTRAINT chk_sampleQty_nonnegative CHECK (CAST(sampleQty AS DECIMAL) >= 0);
```

### Direct Impact
- **Files with quantity decrements**: 12 files, 35+ locations
- **Already protected by validation**: 85% of locations
- **Already protected by FOR UPDATE lock**: 90% of locations

### CRITICAL PRE-REQUISITE
**MUST FIX BEFORE adding constraints:**

#### 1. samplesDb.ts:109-119 - NO transaction, NO lock
```typescript
// CURRENT (UNSAFE):
const quantityAfter = (parseFloat(batch.sampleQty) - parseFloat(product.quantity)).toString();
await db.update(batches).set({ sampleQty: quantityAfter })...

// REQUIRED FIX:
await db.transaction(async tx => {
  const [batch] = await tx.select().from(batches).where(...).for("update");
  // validate sampleQty >= product.quantity
  // then update
});
```

### Error Handling Required
After adding constraints, these files need try-catch for MySQL constraint errors:

| File | Function | Line | Change Required |
|------|----------|------|-----------------|
| server/samplesDb.ts | fulfillSampleRequest | 109 | Add transaction + validation |
| server/ordersDb.ts | confirmDraftOrder | 1977 | Add post-lock validation |

### Rollback Plan
```sql
ALTER TABLE batches DROP CONSTRAINT chk_onHandQty_nonnegative;
ALTER TABLE batches DROP CONSTRAINT chk_reservedQty_nonnegative;
ALTER TABLE batches DROP CONSTRAINT chk_sampleQty_nonnegative;
```

---

## P0-2: safeInArray Migration

### Proposed Change
Replace 45+ files using raw `inArray()` with `safeInArray()` from `server/lib/sqlSafety.ts`

### CRITICAL PRE-REQUISITES
**MUST FIX BEFORE migrating:**

#### 1. referrals.ts:389-391 - Empty array causes crash
```typescript
// CURRENT (BUG):
input.creditIds ? inArray(referralCredits.id, input.creditIds) : undefined
// Empty array [] is truthy, so inArray([]) crashes

// REQUIRED FIX:
input.creditIds?.length ? inArray(referralCredits.id, input.creditIds) : undefined
```

#### 2. productCategories.ts:378 - No validation before inArray
```typescript
// CURRENT (BUG):
.where(inArray(products.id, input.productIds))

// REQUIRED FIX:
if (!input.productIds?.length) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "productIds required" });
}
.where(inArray(products.id, input.productIds))
```

#### 3. rbac-roles.ts:541, 617 and rbac-users.ts:466, 530 - Validation after query
```typescript
// CURRENT (PROBLEMATIC):
.where(inArray(permissions.id, input.permissionIds))
// ... later validation that count matches

// REQUIRED FIX:
if (!input.permissionIds?.length) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "permissionIds required" });
}
```

### Behavioral Change After Migration
| Scenario | Before (raw inArray) | After (safeInArray) |
|----------|---------------------|---------------------|
| Empty array | SQL ERROR crash | Returns empty results |
| Null/undefined | Crash | Returns empty results |
| Valid array | Normal query | Normal query (no change) |

### Files Requiring Updates (45 total)
**Priority 1 - Golden Flow Critical:**
- server/ordersDb.ts (uses safeInArray in some places)
- server/inventoryDb.ts
- server/arApDb.ts
- server/routers/orders.ts
- server/routers/inventory.ts

**Priority 2 - RBAC/Permissions:**
- server/routers/rbac-users.ts
- server/routers/rbac-roles.ts
- server/routers/rbac-permissions.ts
- server/services/permissionService.ts

**Priority 3 - All Others:**
- See full list in QA Protocol report

### Migration Script
```bash
# Find all files importing raw inArray
grep -rn "import.*inArray.*from \"drizzle-orm\"" server/ --include="*.ts"

# For each file:
# 1. Add: import { safeInArray } from "./lib/sqlSafety";
# 2. Replace: inArray( → safeInArray(
# 3. Verify behavior with empty array test
```

---

## P0-3: strainId LEFT JOIN Fixes

### Analysis Result: NO CHANGES NEEDED

All 10 occurrences already use `leftJoin`:
- server/productsDb.ts:117, 281
- server/salesSheetsDb.ts:129
- server/services/strainMatchingService.ts:170, 292
- server/services/catalogPublishingService.ts:352
- server/routers/photography.ts:254, 507, 967
- server/routers/search.ts:276

### Verification
```typescript
// All use pattern:
.leftJoin(strains, eq(products.strainId, strains.id))
// NOT:
.innerJoin(strains, eq(products.strainId, strains.id))
```

LEFT JOIN returns NULL for missing strains - query continues to work.

---

## P0-4: Duplicate referralSettings Table

### The Problem
Two different tables with same name, different schemas:

**schema.ts (lines 6615-6636):**
```typescript
referralSettings = mysqlTable("referral_settings", {
  clientTier, creditPercentage, minOrderAmount, maxCreditAmount, creditExpiryDays
});
```

**schema-gamification.ts (lines 730-767):**
```typescript
referralSettings = mysqlTable("referral_settings", {
  defaultCouchTaxPercent, pointsPerReferral, pointsPerReferralOrder, maxPayoutPerMonth
});
```

### Current Usage
| File | Imports From | Uses Columns |
|------|--------------|--------------|
| server/routers/referrals.ts | schema.ts | clientTier, creditPercentage |
| server/routers/gamification.ts | schema-gamification.ts | defaultCouchTaxPercent, pointsPerReferral |
| server/services/seedGamification.ts | schema.ts | (seeding) |

### REQUIRED DECISION
**Option A: Merge into single table**
- Combine all columns into one table
- Update both routers to use same import
- Risk: Table becomes bloated

**Option B: Rename to separate tables**
- `referral_credit_settings` (tier-based credits)
- `referral_gamification_settings` (couch tax, points)
- Requires schema migration
- Cleaner separation of concerns

**Option C: Keep gamification version, deprecate schema.ts version**
- referrals.ts would need refactor
- Less disruption to gamification feature

### Recommended Approach: Option B
```sql
-- Migration:
RENAME TABLE referral_settings TO referral_credit_settings;
CREATE TABLE referral_gamification_settings (...);
-- Migrate data from old table
```

### Files Requiring Changes
| File | Current Import | New Import |
|------|----------------|------------|
| server/routers/referrals.ts | schema.ts | schema.ts (renamed export) |
| server/routers/gamification.ts | schema-gamification.ts | schema-gamification.ts (renamed) |
| server/services/seedGamification.ts | schema.ts | schema.ts (renamed) |
| scripts/seed/seeders/seed-gamification-defaults.ts | schema-gamification.ts | schema-gamification.ts (renamed) |

---

## P1-1: Hard Delete to Soft Delete Conversion

### Tables Requiring deletedAt Column Addition
| Table | File | Has deletedAt? |
|-------|------|----------------|
| pricingRules | drizzle/schema.ts | NO - needs adding |
| purchaseOrders | drizzle/schema.ts | NO - needs adding |
| purchaseOrderItems | drizzle/schema.ts | NO - needs adding |
| vendorSupply | drizzle/schema.ts | NO - needs adding |
| locations | drizzle/schema.ts | YES - already has |
| categories | drizzle/schema.ts | YES - already has |
| subcategories | drizzle/schema.ts | YES - already has |
| grades | drizzle/schema.ts | YES - already has |

### Migration Required
```sql
-- Add deletedAt to tables missing it
ALTER TABLE pricing_rules ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE purchase_orders ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE purchase_order_items ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE vendor_supply ADD COLUMN deleted_at TIMESTAMP NULL;
```

### Query Updates Required (50+ locations)
All `db.select().from(TABLE)` queries need:
```typescript
.where(isNull(TABLE.deletedAt))
```

**Files requiring query updates:**
| File | Queries to Update |
|------|------------------|
| server/pricingEngine.ts | 9 queries |
| server/routers/purchaseOrders.ts | 10+ queries |
| server/routers/poReceiving.ts | 8+ queries |
| server/vendorSupplyDb.ts | 6+ queries |
| server/matchingEngine.ts | 2+ queries |
| server/matchingEngineEnhanced.ts | 2+ queries |

### Delete Logic Conversion
```typescript
// BEFORE:
await db.delete(locations).where(eq(locations.id, id));

// AFTER:
import { softDelete } from "./utils/softDelete";
await softDelete(locations, id);
```

### Cascade Behavior Change
**Current (Hard Delete):**
- Delete parent → Child records cascade delete
- No recovery possible

**After (Soft Delete):**
- Delete parent → Parent marked deleted
- Child records NOT automatically soft-deleted
- May need explicit cascade soft delete logic

---

## P1-2: GL Balance Constraint

### Proposed Change
```sql
-- Option A: CHECK per entry
ALTER TABLE ledger_entries
  ADD CONSTRAINT chk_single_direction
  CHECK (debit = 0 OR credit = 0);

-- Option B: Trigger-based validation
-- Validate sum(debit) = sum(credit) per journal entry number
```

### Impact on 27 Insert Locations
All ledgerEntries inserts are already:
1. Creating paired entries (debit + credit)
2. Within transactions
3. Using same entry number prefix

### Files with ledgerEntries inserts:
| File | Insert Count | Transaction Wrapped? |
|------|--------------|---------------------|
| server/services/orderAccountingService.ts | 6 | YES |
| server/routers/payments.ts | 6 | YES |
| server/services/orderOrchestrator.ts | 5 | YES |
| server/accountingHooks.ts | 3 | YES |
| server/accountingDb.ts | 3 | YES |
| server/badDebtDb.ts | 4 | YES |

### Rollback Plan
```sql
ALTER TABLE ledger_entries DROP CONSTRAINT chk_single_direction;
```

---

## P1-3: COGS Precision Standardization

### Current State
| Column | Location | Precision | Scale |
|--------|----------|-----------|-------|
| batches.unitCogs | schema.ts:603 | 12 | 4 |
| batches.unitCogsMin | schema.ts:604 | 12 | 4 |
| batches.unitCogsMax | schema.ts:605 | 12 | 4 |
| orders.totalCogs | schema.ts:2693 | 15 | 2 |
| orderLineItems.cogsPerUnit | schema.ts:4488 | 10 | 2 |
| invoiceLineItems.cogsPerUnit | schema.ts:7268 | 10 | 2 |

### Proposed Change
Standardize to `decimal(15, 4)` for all COGS columns.

### Migration Required
```sql
ALTER TABLE orders MODIFY COLUMN total_cogs DECIMAL(15, 4);
ALTER TABLE order_line_items MODIFY COLUMN cogs_per_unit DECIMAL(15, 4);
ALTER TABLE invoice_line_items MODIFY COLUMN cogs_per_unit DECIMAL(15, 4);
```

### Data Recalculation
Existing data may need recalculation if:
- Original COGS values were truncated
- New precision reveals rounding errors

**Impact Assessment:**
- Orders with `totalCogs`: May show $0.01 differences
- Historical invoices: No change (already finalized)
- Future orders: More accurate COGS

### Code Changes Required
| File | Change |
|------|--------|
| server/cogsCalculator.ts | Verify calculation handles 4 decimals |
| server/services/orderPricingService.ts | Update toFixed(2) to toFixed(4) for intermediate calcs |
| server/services/orderAccountingService.ts | Keep toFixed(2) for GL entries (display precision) |

---

## P2-1: vendorId to supplierClientId Migration

### Scope: 264 occurrences across 45 files

### This is a MAJOR refactor project - NOT a quick fix

### Phase 1: Add supplierClientId columns
```sql
-- Add new FK columns
ALTER TABLE lots ADD COLUMN supplier_client_id INT REFERENCES clients(id);
ALTER TABLE batches ADD COLUMN supplier_client_id INT REFERENCES clients(id);
ALTER TABLE purchase_orders ADD COLUMN supplier_client_id INT REFERENCES clients(id);
-- ... more tables
```

### Phase 2: Data migration
```sql
-- Migrate data from vendorId to supplierClientId via vendor_client_mapping
UPDATE lots l
JOIN vendor_client_mapping m ON l.vendor_id = m.legacy_vendor_id
SET l.supplier_client_id = m.client_id;
```

### Phase 3: Code migration
- Update all 264 occurrences
- Update Drizzle relations
- Update API contracts

### Phase 4: Deprecation
- Mark vendorId columns as deprecated
- Eventually remove after migration verified

### Estimated Effort: 40+ hours

---

## Summary: Order of Operations

### Before ANY changes:
1. Fix samplesDb.ts transaction/locking (P0-1 pre-req)
2. Fix referrals.ts empty array bug (P0-2 pre-req)
3. Fix productCategories.ts validation (P0-2 pre-req)
4. Decide on referralSettings resolution (P0-4)

### Safe to proceed immediately:
- P0-3: Already done (LEFT JOINs in place)

### After pre-reqs complete:
1. P0-1: Add CHECK constraints
2. P0-2: Migrate to safeInArray
3. P0-4: Rename/merge referralSettings tables
4. P1-2: Add GL constraint (low risk)

### Requires planning/project:
- P1-1: Soft delete conversion (multi-day)
- P1-3: COGS precision migration (with data recalc)
- P2-1: vendorId migration (multi-week project)

---

*Document created as part of QA Protocol v3.0 compliance*
*Session: claude/database-schema-review-L9yG5*
