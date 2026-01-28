# Golden Flow Database Remediation Plan

**Date**: 2026-01-28
**Purpose**: Prioritize database fixes based on Golden Flow impact
**Scope**: All 87+ database issues mapped to 8 Golden Flows
**Goal**: All Golden Workflows running perfectly

---

## Executive Summary

This document categorizes all identified database issues into three tiers:

| Tier | Description | Issues | Est. Hours |
|------|-------------|--------|------------|
| **TIER 1: MVP-BLOCKING** | Flows won't execute at all | 12 | 24h |
| **TIER 2: MVP-CRITICAL** | Flows work but produce incorrect data | 14 | 38h |
| **TIER 3: POST-MVP** | Technical debt, not blocking flows | 61+ | 75h+ |

**Current Status**: Golden Flows are **RED** - blocked by P0 issues.

---

## Golden Flow → Database Dependency Matrix

| Golden Flow | Critical Tables | Status | Primary Blockers |
|-------------|-----------------|--------|------------------|
| **GF-001** Direct Intake | batches, lots, products, brands, vendors/clients | 🔴 BLOCKED | BUG-112, schema drift |
| **GF-002** Procure-to-Pay | purchase_orders, po_items, bills, bill_line_items | 🔴 BLOCKED | BUG-114, schema drift |
| **GF-003** Order-to-Cash | orders, order_line_items, invoices, payments, batches | 🔴 BLOCKED | BUG-110, inventory SQL |
| **GF-004** Invoice & Payment | invoices, payments, ledger_entries, clients | 🟡 PARTIAL | BUG-113 (PDF timeout) |
| **GF-005** Pick & Pack | orders, order_bags, batches, inventory_movements | ⏸️ BLOCKED | Depends on GF-003 |
| **GF-006** Client Ledger | clients, invoices, payments, client_ledger_adjustments | 🟡 PARTIAL | BUG-116 (data mismatch) |
| **GF-007** Inventory Mgmt | batches, inventory_movements, batch_locations | 🔴 BLOCKED | BUG-110, zero results |
| **GF-008** Sample Request | sample_requests, sample_allocations, batches | 🔴 BLOCKED | BUG-115, broken selector |

---

## TIER 1: MVP-BLOCKING ISSUES

> **These MUST be fixed for Golden Flows to execute at all.**
> **Target: 24 hours of work**

### T1-001: Schema Drift - strainId Joins Causing SQL Failures
**Roadmap Tasks**: BUG-110, BUG-111, BUG-113, BUG-114
**Flows Blocked**: GF-001, GF-002, GF-003, GF-007, GF-008
**Root Cause**: Products table missing `strainId` column or strains table not populated

| File | Line | Status | Fix |
|------|------|--------|-----|
| `server/productsDb.ts` | 92, 179 | 🔴 Ready | Add try-catch with strainless fallback |
| `server/routers/search.ts` | 260 | 🔴 Ready | Add defensive pattern |
| `server/routers/photography.ts` | multiple | ✅ Done | Commit e6e47cdd |
| `server/services/catalogPublishingService.ts` | 310 | 🔴 Ready | Add strainless fallback |
| `server/services/strainMatchingService.ts` | 136, 234 | 🔴 Ready | Graceful degradation |

**Estimate**: 8h total
**Priority**: P0 - Fix first

---

### T1-002: Empty Array Crash in confirmDraftOrder
**Roadmap Task**: BUG-115
**Flows Blocked**: GF-003, GF-005
**Location**: `server/ordersDb.ts:1239`

**Issue**: Raw `inArray(batches.id, batchIds)` crashes when `batchIds = []`
**Impact**: Cannot confirm orders, blocking entire order-to-cash flow

**Fix**: Use `safeInArray()` utility:
```typescript
import { safeInArray } from "./utils/sqlSafety";
// Replace: inArray(batches.id, batchIds)
// With: safeInArray(batches.id, batchIds)
```

**Estimate**: 1h
**Priority**: P0

---

### T1-003: Systemic inArray() Crashes (127 occurrences)
**Roadmap Task**: BUG-116, ST-055
**Flows Blocked**: All 8 Golden Flows
**Scope**: 127 unsafe `inArray()` calls across codebase

**Priority Fixes** (Golden Flow critical paths):
| File | Occurrences | Golden Flow Impact |
|------|-------------|-------------------|
| `server/ordersDb.ts` | 15 | GF-003, GF-005 |
| `server/inventoryDb.ts` | 12 | GF-001, GF-007 |
| `server/routers/inventory.ts` | 8 | GF-007 |
| `server/routers/orders.ts` | 6 | GF-003 |
| `server/arApDb.ts` | 5 | GF-004, GF-006 |

**Estimate**: 8h (critical paths), 16h (full codebase)
**Priority**: P0 for critical paths, P1 for remainder

---

### T1-004: Dashboard/Inventory Data Mismatch
**Roadmap Task**: DATA-026
**Flows Blocked**: GF-007, indirectly GF-003
**Location**: `server/routers/dashboard.ts`, `server/routers/inventory.ts`

**Issue**: Dashboard shows $62.3M inventory but table shows 0 items
**Root Cause**: Different data sources - dashboard uses cached stats, inventory uses failing query

**Fix**: Align data sources, fix inventory query
**Estimate**: 4h
**Priority**: P0

---

### T1-005: Duplicate `referralSettings` Table Definition
**Issue ID**: INT-001
**Location**: `schema.ts:6615` AND `schema-gamification.ts:730`
**Flows Blocked**: Potentially all (schema conflicts on migration)

**Issue**: Two different table definitions with different columns
**Impact**: Migration failures, unpredictable behavior

**Fix**: Consolidate to single definition in `schema.ts`
**Estimate**: 2h
**Priority**: P0 (prevents deployments)

---

### T1-006: RBAC User ID Type Mismatch
**Issue ID**: SCHEMA-001
**Location**: `schema-rbac.ts:84,105`
**Flows Blocked**: All flows requiring role-based access

**Issue**: RBAC uses `varchar(255)` for userId (Clerk ID), all other tables use `int`
**Impact**: Cannot join RBAC tables with user tables, permission checks fail

**Fix Options**:
1. Short-term: Keep varchar, resolve via Clerk ID → user ID lookup
2. Long-term: Migrate to `int` with FK to `users.id`

**Estimate**: 4h (short-term), 8h (long-term)
**Priority**: P1

---

## TIER 2: MVP-CRITICAL ISSUES

> **These cause incorrect data but don't block flow execution.**
> **Target: 38 hours of work**
> **Fix AFTER Tier 1, BEFORE going to production**

### T2-001: Race Condition in Inventory Deduction
**Issue ID**: RACE-002
**Flows Affected**: GF-003, GF-005, GF-007
**Location**: `server/ordersDb.ts`, `server/inventoryDb.ts`

**Issue**: No row locking when confirming orders
```
Thread A: reads onHandQty=10, validates 6 available ✓
Thread B: reads onHandQty=10, validates 6 available ✓
Result: onHandQty = 10 - 6 - 6 = -2 (WRONG!)
```

**Business Impact**: Overselling, negative inventory, customer disputes

**Fix**: Add `FOR UPDATE` locks:
```sql
SELECT onHandQty FROM batches WHERE id = ? FOR UPDATE;
```

**Estimate**: 6h
**Priority**: P1 - Required before production

---

### T2-002: No CHECK Constraint on Negative Inventory
**Issue ID**: FIN-002
**Flows Affected**: GF-003, GF-005, GF-007, GF-008
**Location**: `batches` table

**Issue**: `onHandQty`, `sampleQty`, `reservedQty` can go negative
**Impact**: Invalid inventory states, audit failures

**Fix**:
```sql
ALTER TABLE batches ADD CONSTRAINT chk_onHandQty CHECK (CAST(onHandQty AS DECIMAL) >= 0);
ALTER TABLE batches ADD CONSTRAINT chk_sampleQty CHECK (CAST(sampleQty AS DECIMAL) >= 0);
ALTER TABLE batches ADD CONSTRAINT chk_reservedQty CHECK (CAST(reservedQty AS DECIMAL) >= 0);
```

**Estimate**: 2h
**Priority**: P1

---

### T2-003: COGS Decimal Precision Mismatch
**Issue ID**: FIN-001
**Flows Affected**: GF-001, GF-002, GF-003
**Location**: Multiple tables

**Issue**:
- `batches.unitCogs`: `decimal(12, 4)`
- `orders.totalCogs`: `decimal(15, 2)` ← loses precision
- `orderLineItems.cogsPerUnit`: `decimal(10, 2)` ← loses precision

**Business Impact**: $12+ loss per 1000-unit order due to rounding

**Fix**: Standardize to `decimal(15, 4)` for all COGS fields
**Estimate**: 4h (migration + application updates)
**Priority**: P1

---

### T2-004: clients.totalOwed Sync Failures
**Issue ID**: FIN-004
**Flows Affected**: GF-003, GF-004, GF-006
**Location**: `clients.totalOwed`, `invoices.amountDue`

**Issue**: `totalOwed` updated via delta, then synced - creates race window
**Impact**: AR aging reports show wrong balances

**Fix Options**:
1. Make `totalOwed` computed column (best)
2. Use trigger to auto-sync
3. Always compute on read

**Estimate**: 6h
**Priority**: P1

---

### T2-005: Payment Over-Allocation Possible
**Issue ID**: FIN-005
**Flows Affected**: GF-004
**Location**: `invoice_payments` junction table

**Issue**: If invoice modified after payment, allocation becomes invalid
**Impact**: Payments exceed invoice totals

**Fix**: Add trigger or CHECK constraint:
```sql
CREATE TRIGGER trg_validate_allocation BEFORE INSERT ON invoice_payments
FOR EACH ROW
  IF NEW.allocated_amount > (SELECT amount_due FROM invoices WHERE id = NEW.invoice_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Over-allocation';
  END IF;
```

**Estimate**: 3h
**Priority**: P1

---

### T2-006: No GL Debit/Credit Balance Enforcement
**Issue ID**: FIN-003
**Flows Affected**: GF-004
**Location**: `ledger_entries` table

**Issue**: Both `debit` AND `credit` can be non-zero simultaneously
**Impact**: Corrupted trial balance

**Fix**:
```sql
ALTER TABLE ledger_entries ADD CONSTRAINT chk_debit_credit
  CHECK ((debit = 0 AND credit >= 0) OR (credit = 0 AND debit >= 0));
```

**Estimate**: 1h
**Priority**: P1

---

### T2-007: Invoice Line Items Modifiable After Posting
**Issue ID**: ACCT-001
**Flows Affected**: GF-004
**Location**: `invoice_line_items` table

**Issue**: No immutability after invoice status = SENT/PAID
**Impact**: Totals can change after customer receives invoice

**Fix**: Add status check before allowing updates
```typescript
if (invoice.status !== 'DRAFT') {
  throw new Error('Cannot modify sent/paid invoices');
}
```

**Estimate**: 3h
**Priority**: P1

---

### T2-008: Missing FK Constraints on paymentHistory
**Issue ID**: INT-005
**Flows Affected**: GF-002 (vendor payments)
**Location**: `paymentHistory` table

**Issue**: `batchId`, `vendorId`, `recordedBy` have no FK constraints
**Impact**: Orphaned records, no referential integrity

**Fix**: Add FK constraints with appropriate cascade rules
**Estimate**: 2h
**Priority**: P1

---

### T2-009: orders.items JSON Drifts from orderLineItems
**Issue ID**: RACE-003
**Flows Affected**: GF-003, GF-005
**Location**: `orders.items` vs `order_line_items` table

**Issue**: JSON blob and normalized table can diverge
**Impact**: Order totals mismatch, picking errors

**Fix**: Make JSON read-only, always compute from line items
**Estimate**: 4h
**Priority**: P1

---

### T2-010: Missing version Columns on Critical Tables
**Issue ID**: RACE-001
**Flows Affected**: All
**Tables Missing Version**:
- `paymentHistory` - GF-002
- `cogsHistory` - GF-001, GF-003
- `clientTransactions` - GF-006
- `bankTransactions` - GF-004
- `inventoryMovements` - GF-007

**Fix**: Add `version: int("version").notNull().default(1)` to each
**Estimate**: 3h
**Priority**: P2 (flows work, but concurrent edits may lose data)

---

### T2-011: Negative Payment Amounts Not Prevented
**Issue ID**: FIN-006
**Flows Affected**: GF-004
**Location**: `payments.amount`

**Issue**: No CHECK constraint, can insert negative payments
**Impact**: Hidden credits, corrupted AR

**Fix**:
```sql
ALTER TABLE payments ADD CONSTRAINT chk_payment_amount CHECK (amount > 0);
```

**Estimate**: 0.5h
**Priority**: P1

---

## TIER 3: POST-MVP (Technical Debt)

> **These are important but won't block MVP functionality.**
> **Target: 75+ hours, address in sprints after MVP**

### Soft Delete Coverage
**Issue ID**: SOFT-001
**Scope**: 161 tables (69%) missing `deletedAt`
**Estimate**: 16h
**Priority**: P3

**High Priority Tables** (add first):
- users
- accounts
- fiscalPeriods
- categories/subcategories
- brands/strains

---

### Naming Convention Standardization
**Issue ID**: SCHEMA-002, SCHEMA-003
**Scope**: Mixed camelCase/snake_case, legacy customerId/vendorId
**Estimate**: 14h
**Priority**: P3

---

### vendors Table Deprecation
**Issue ID**: INT-002
**Scope**: 7 FK references, 10+ server files
**Estimate**: 16h
**Priority**: P3

**Migration Plan**:
1. Add `supplierClientId` columns
2. Migrate data from vendorId
3. Update all code to use clients table
4. Drop deprecated FK constraints

---

### Missing Indexes
**Issue ID**: IDX-001, IDX-002
**Scope**: paymentHistory, cogsHistory, composite indexes
**Estimate**: 4h
**Priority**: P3

---

### Boolean Type Standardization
**Issue ID**: INT-004
**Scope**: 20+ columns using `int` instead of `boolean`
**Estimate**: 4h
**Priority**: P4

---

### Missing Unique Constraints
**Issue ID**: UNIQUE-001
**Tables**: productSynonyms, productTags, cogsHistory
**Estimate**: 2h
**Priority**: P4

---

### Accounting Workflow Improvements
**Issue ID**: ACCT-002, ACCT-003, ACCT-004
**Scope**: GL posting workflow, updatedBy fields, payment terms
**Estimate**: 15h
**Priority**: P3

---

## Execution Roadmap

### Week 1: Unblock Golden Flows (Tier 1)
| Day | Task | Hours | Unblocks |
|-----|------|-------|----------|
| 1-2 | T1-001: Schema drift fixes | 8h | GF-001,002,003,007,008 |
| 2 | T1-002: Empty array crash | 1h | GF-003,005 |
| 2-3 | T1-003: Critical inArray fixes | 8h | All |
| 3 | T1-004: Dashboard/inventory mismatch | 4h | GF-007 |
| 4 | T1-005: Duplicate referralSettings | 2h | Deployments |
| 4 | T1-006: RBAC user ID (short-term) | 4h | Auth flows |

**Week 1 Total**: 27h
**Expected Result**: All 8 Golden Flows UNBLOCKED (can execute)

---

### Week 2: Financial Integrity (Tier 2)
| Day | Task | Hours | Risk Reduced |
|-----|------|-------|--------------|
| 1 | T2-001: Inventory row locking | 6h | Overselling |
| 1-2 | T2-002: Negative inventory CHECK | 2h | Invalid states |
| 2 | T2-003: COGS precision | 4h | Calculation errors |
| 3 | T2-004: totalOwed sync | 6h | AR inaccuracy |
| 3-4 | T2-005: Payment over-allocation | 3h | Payment errors |
| 4 | T2-006: GL balance enforcement | 1h | Trial balance |
| 4 | T2-007: Invoice immutability | 3h | Post-send edits |

**Week 2 Total**: 25h
**Expected Result**: Golden Flows produce CORRECT DATA

---

### Week 3: Remaining Critical (Tier 2 cont.)
| Day | Task | Hours | Risk Reduced |
|-----|------|-------|--------------|
| 1 | T2-008: paymentHistory FKs | 2h | Orphaned records |
| 1-2 | T2-009: JSON/table sync | 4h | Order mismatches |
| 2 | T2-010: Version columns | 3h | Concurrent edit safety |
| 2 | T2-011: Negative payment CHECK | 0.5h | Invalid payments |

**Week 3 Total**: 9.5h
**Expected Result**: PRODUCTION-READY Golden Flows

---

### Post-MVP: Technical Debt (Tier 3)
| Sprint | Focus | Hours |
|--------|-------|-------|
| Sprint N+1 | Soft delete coverage | 16h |
| Sprint N+2 | vendors deprecation | 16h |
| Sprint N+3 | Naming standardization | 14h |
| Sprint N+4 | Indexes, accounting | 19h |
| Sprint N+5 | Boolean types, unique constraints | 6h |

**Post-MVP Total**: 75h+

---

## Verification Queries

Run these to validate fixes:

```sql
-- Check for negative inventory (should return 0 rows)
SELECT id, onHandQty FROM batches WHERE CAST(onHandQty AS DECIMAL) < 0;

-- Check for client balance mismatches
SELECT c.id, c.name, c.totalOwed,
  COALESCE(SUM(i.amountDue), 0) as calculated
FROM clients c
LEFT JOIN invoices i ON i.customerId = c.id
  AND i.status NOT IN ('PAID', 'VOID') AND i.deletedAt IS NULL
GROUP BY c.id
HAVING ABS(CAST(c.totalOwed AS DECIMAL) - calculated) > 0.01;

-- Check for over-allocated payments
SELECT p.id, p.amount as payment_amount,
  SUM(ip.allocatedAmount) as total_allocated
FROM payments p
JOIN invoice_payments ip ON ip.paymentId = p.id
GROUP BY p.id
HAVING SUM(ip.allocatedAmount) > p.amount + 0.01;

-- Check for unbalanced GL entries
SELECT referenceType, referenceId,
  SUM(CAST(debit AS DECIMAL)) as total_debit,
  SUM(CAST(credit AS DECIMAL)) as total_credit
FROM ledger_entries
WHERE deletedAt IS NULL
GROUP BY referenceType, referenceId
HAVING ABS(SUM(CAST(debit AS DECIMAL)) - SUM(CAST(credit AS DECIMAL))) > 0.01;
```

---

## Summary

| Phase | Duration | Outcome |
|-------|----------|---------|
| **Week 1** | 27h | Golden Flows UNBLOCKED |
| **Week 2** | 25h | Data INTEGRITY assured |
| **Week 3** | 9.5h | PRODUCTION ready |
| **Post-MVP** | 75h+ | Technical debt cleared |

**Total MVP Work**: ~62 hours
**Total Including Tech Debt**: 137+ hours

---

*This plan prioritizes getting Golden Flows working correctly over achieving schema perfection. Technical debt can be addressed incrementally after MVP.*
