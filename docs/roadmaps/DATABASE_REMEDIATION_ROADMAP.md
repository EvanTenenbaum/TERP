# Database Schema Remediation Roadmap

**Version:** 1.0
**Created:** 2026-01-28
**Status:** APPROVED
**Source:** GF-PHASE0-008, PR #331 Database Audit

---

## Executive Summary

This roadmap provides a prioritized plan to remediate **23 database schema issues** identified in the comprehensive audit (PR #331). The plan balances immediate needs with long-term system health.

| Priority | Issues | Effort | Phase | Status |
|----------|--------|--------|-------|--------|
| Priority 1 (Immediate) | 2 | 6h | Phase 0 | ADDRESSED |
| Priority 2 (Quick Wins) | 7 | 12h | Phase 6 | PLANNED |
| Priority 3 (Medium-term) | 7 | 16h | Phase 6 | PLANNED |
| Priority 4 (Deferred) | 7 | 56h | Post-Beta | DEFERRED |
| **Total** | **23** | **90h** | | |

**Recommended Phase 6 Scope:** 12-28 hours (Priority 2 + selected Priority 3)

---

## Priority Matrix

### Priority 1: Phase 0 (Immediate) - ADDRESSED

Issues that block Golden Flows and require immediate attention.

| Issue | Description | Status | Resolution |
|-------|-------------|--------|------------|
| #1 | Missing products.strainId | COMPLETE | Fallback queries (PR #318) |
| #3 | Missing product_images table | ADDRESSED | GF-PHASE0-006 |

**Total Effort:** 6h (already completed)

---

### Priority 2: Phase 6 Immediate (Quick Wins)

HIGH severity issues with low risk and high impact.

| Issue | Description | Effort | Risk | Impact |
|-------|-------------|--------|------|--------|
| #4 | FK: brands.vendorId | 1h | LOW | HIGH (data integrity) |
| #5 | FK: lots.vendorId | 1h | LOW | HIGH (data integrity) |
| #6 | FK: paymentHistory.vendorId | 1h | LOW | HIGH (data integrity) |
| #7 | FK: bills.vendorId | 1h | LOW | HIGH (data integrity) |
| #8 | FK: expenses.vendorId | 1h | LOW | HIGH (data integrity) |
| #9 | Rename: payments.vendorId | 2h | LOW | MEDIUM (clarity) |
| #11 | Deprecate: purchaseOrders.vendorId | 2h | LOW | MEDIUM (clarity) |
| | **INFRA-DB-001 + INFRA-DB-002** | **9h** | | |

**Bundled as:** INFRA-DB-001 (FK constraints: 5h) + INFRA-DB-002 (Renames: 4h)
**Total Effort:** 12h (with buffer)

---

### Priority 3: Phase 6 Medium-term

MEDIUM severity issues for standardization.

| Issue | Description | Effort | Risk | Impact |
|-------|-------------|--------|------|--------|
| #12 | Naming: camelCase/snake_case | 4h | MEDIUM | MEDIUM (consistency) |
| #13 | FK: products.brandId | 1h | LOW | MEDIUM (integrity) |
| #14 | FK: batches.productId/lotId | 2h | LOW | MEDIUM (integrity) |
| #15 | FK: billLineItems (3 cols) | 2h | LOW | MEDIUM (integrity) |
| #16 | FK: ledgerEntries (2 cols) | 2h | LOW | MEDIUM (integrity) |
| #17 | FK: expenses (3 cols) | 2h | LOW | MEDIUM (integrity) |
| #18 | FK: sales (2 cols) | 1h | LOW | MEDIUM (integrity) |
| | **INFRA-DB-001 extension** | **14h** | | |

**Bundled as:** INFRA-DB-001 extension (if time permits)
**Total Effort:** 16h (with buffer)

---

### Priority 4: Deferred (Post-Beta)

Large refactors or low-priority cleanup.

| Issue | Description | Effort | Risk | Rationale |
|-------|-------------|--------|------|-----------|
| #2 | Consolidate image tables | 16h | MEDIUM | Large refactor, workarounds exist |
| #10 | Vendors → clients migration | 24h | HIGH | Major data migration |
| #19 | Add missing indexes | 4h | LOW | Performance only |
| #20 | Schema documentation | 4h | LOW | Non-functional |
| #21-23 | Misc cleanup | 8h | LOW | Low impact |

**Bundled as:** INFRA-DB-003, INFRA-DB-004
**Total Effort:** 40h

---

## Phase 6 Task Definitions

### INFRA-DB-001: Add Missing FK Constraints

**Task ID:** INFRA-DB-001
**Source:** PR #331 Database Audit (Issues #4-8, #13-18)
**Status:** ready
**Priority:** HIGH
**Estimate:** 8h
**Mode:** RED
**Module:** Database migrations

**Problem:**
15+ tables have columns without FK constraints, risking data integrity:
- `brands.vendorId` → No FK
- `lots.vendorId` → No FK
- `paymentHistory.vendorId` → No FK
- `bills.vendorId` → No FK
- `expenses.vendorId` → No FK
- `products.brandId` → No FK
- `batches.productId`, `batches.lotId` → No FK
- `billLineItems.billId`, `productId`, `lotId` → No FK
- `ledgerEntries.accountId`, `fiscalPeriodId` → No FK
- `expenses.categoryId`, `bankAccountId`, `billId` → No FK
- `sales.batchId`, `productId` → No FK

**Pre-Requisites:**
- [ ] Verify no orphan records exist before adding constraints
- [ ] Create backup of affected tables
- [ ] Test migration in staging environment

**Agent Checklist:**
- [ ] Audit current FK constraints in production
- [ ] Check for orphaned records in each table
- [ ] Fix orphaned records (update to valid ID or set NULL)
- [ ] Create migration file: `drizzle/migrations/XXXX_add_fk_constraints.sql`
- [ ] Add FK constraints with appropriate ON DELETE rules
- [ ] Test migration locally
- [ ] Apply to staging environment
- [ ] Verify all constraints active
- [ ] Document FK relationships

**Migration SQL (Phase 1 - vendorId columns):**
```sql
-- Check for orphans first
SELECT COUNT(*) as orphan_count FROM brands
WHERE vendorId IS NOT NULL AND vendorId NOT IN (SELECT id FROM clients WHERE isSeller = 1);

-- Add FK constraints (assuming vendorId → clients.id per Party Model)
ALTER TABLE brands
  ADD CONSTRAINT fk_brands_vendor FOREIGN KEY (vendorId) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE bills
  ADD CONSTRAINT fk_bills_vendor FOREIGN KEY (vendorId) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_vendor FOREIGN KEY (vendorId) REFERENCES clients(id) ON DELETE RESTRICT;

ALTER TABLE paymentHistory
  ADD CONSTRAINT fk_payment_history_vendor FOREIGN KEY (vendorId) REFERENCES clients(id) ON DELETE RESTRICT;

-- Note: lots.vendorId is deprecated, skip constraint
```

**Migration SQL (Phase 2 - other FKs):**
```sql
-- Products
ALTER TABLE products
  ADD CONSTRAINT fk_products_brand FOREIGN KEY (brandId) REFERENCES brands(id) ON DELETE SET NULL;

-- Batches
ALTER TABLE batches
  ADD CONSTRAINT fk_batches_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_batches_lot FOREIGN KEY (lotId) REFERENCES lots(id) ON DELETE RESTRICT;

-- Bill Line Items
ALTER TABLE bill_line_items
  ADD CONSTRAINT fk_bill_items_bill FOREIGN KEY (billId) REFERENCES bills(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_bill_items_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_bill_items_lot FOREIGN KEY (lotId) REFERENCES lots(id) ON DELETE RESTRICT;

-- Ledger Entries
ALTER TABLE ledger_entries
  ADD CONSTRAINT fk_ledger_account FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ledger_period FOREIGN KEY (fiscalPeriodId) REFERENCES fiscal_periods(id) ON DELETE RESTRICT;

-- Sales
ALTER TABLE sales
  ADD CONSTRAINT fk_sales_batch FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_sales_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE RESTRICT;

-- Expenses (additional FKs from Issue #17)
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_category FOREIGN KEY (categoryId) REFERENCES expense_categories(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_expenses_bank FOREIGN KEY (bankAccountId) REFERENCES bank_accounts(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_expenses_bill FOREIGN KEY (billId) REFERENCES bills(id) ON DELETE SET NULL;
```

**Verification:**
```bash
# Check constraints exist
mysql -e "SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE CONSTRAINT_SCHEMA = 'defaultdb' AND REFERENCED_TABLE_NAME IS NOT NULL;"

# Check no orphan errors
mysql -e "SELECT 'brands', COUNT(*) FROM brands WHERE vendorId NOT IN (SELECT id FROM clients)
UNION SELECT 'bills', COUNT(*) FROM bills WHERE vendorId NOT IN (SELECT id FROM clients);"
```

**Rollback Plan:**
```sql
-- Remove FK constraints if issues
ALTER TABLE brands DROP FOREIGN KEY fk_brands_vendor;
ALTER TABLE bills DROP FOREIGN KEY fk_bills_vendor;
-- ... etc
```

**Acceptance Criteria:**
- [ ] All FK constraints added successfully
- [ ] No orphaned records remain
- [ ] Database integrity verified
- [ ] Application functions normally
- [ ] Documentation updated

---

### INFRA-DB-002: Rename Misleading vendorId Columns

**Task ID:** INFRA-DB-002
**Source:** PR #331 Database Audit (Issues #9, #11)
**Status:** ready
**Priority:** HIGH
**Estimate:** 4h
**Mode:** RED
**Module:** Database migrations, server code

**Problem:**
Columns named `vendorId` that reference `clients.id` cause confusion:
- `payments.vendorId` → references `clients.id` (suppliers)
- `purchaseOrders.vendorId` → deprecated, use `supplierClientId`

**Agent Checklist:**
- [ ] Identify all code references to affected columns
- [ ] Create migration to rename columns
- [ ] Update Drizzle schema definitions
- [ ] Update all server-side queries
- [ ] Update all client-side references
- [ ] Test all affected flows
- [ ] Run full test suite

**Migration SQL:**
```sql
-- Rename payments.vendorId to supplierClientId
ALTER TABLE payments CHANGE vendorId supplierClientId INT;

-- Add supplierClientId to purchaseOrders if missing
-- (already exists, mark vendorId as deprecated via documentation)
```

**Code Changes Required:**
```typescript
// server/db/schema.ts - Update column definition
// Before:
vendorId: int("vendorId").references(() => clients.id),
// After:
supplierClientId: int("supplierClientId").references(() => clients.id),

// All files using payments.vendorId must change to supplierClientId
// Search: grep -r "payments.*vendorId" server/
```

**Verification:**
```bash
# Ensure no code references old column name
grep -r "payments\.vendorId" server/ client/src/
# Should return 0 results after migration

# Run tests
pnpm check && pnpm test
```

**Acceptance Criteria:**
- [ ] Columns renamed in database
- [ ] Drizzle schema updated
- [ ] All code references updated
- [ ] All tests pass
- [ ] No runtime errors

---

### INFRA-DB-003: Consolidate Image Tables (DEFERRED)

**Task ID:** INFRA-DB-003
**Source:** PR #331 Database Audit (Issue #2)
**Status:** deferred
**Priority:** MEDIUM
**Estimate:** 16h
**Mode:** RED
**Module:** Database migrations, server code, client code
**Deferred To:** Post-Beta

**Problem:**
Two image tables exist with overlapping purposes:
- `productMedia` - Basic image storage
- `productImages` - Richer schema with status, uploadedBy, sortOrder

**Recommendation:**
Consolidate into `product_images` (richer schema) during post-beta cleanup.

**Why Deferred:**
- Large refactor (16h+)
- Current workarounds functional
- Risk of regression during beta
- Can be done during planned maintenance

**Future Work:**
1. Migrate all `productMedia` data to `productImages`
2. Update all code references
3. Drop `productMedia` table
4. Rename `product_images` if needed

---

### INFRA-DB-004: Complete Vendors → Clients Migration (DEFERRED)

**Task ID:** INFRA-DB-004
**Source:** PR #331 Database Audit (Issue #10)
**Status:** deferred
**Priority:** MEDIUM
**Estimate:** 24h
**Mode:** RED
**Module:** Database, server, client
**Deferred To:** Post-Beta

**Problem:**
The Party Model transition from `vendors` to `clients` is incomplete:
- `vendors` table still exists and is referenced
- Multiple tables have dual columns (vendorId AND supplierClientId)
- Data split between vendors and clients tables

**Why Deferred:**
- Major data migration (24h+)
- High risk during beta
- Current dual-table approach functional
- Requires coordinated multi-phase migration

**Future Migration Plan:**
1. Ensure all vendors have corresponding clients records with `isSeller=true`
2. Update all FK references from vendors to clients
3. Migrate all vendor-specific data (vendorNotes, etc.)
4. Drop deprecated vendorId columns
5. Archive or drop vendors table
6. Update all application code

---

## Timeline

### Phase 0 (Complete)
- GF-PHASE0-001b: Schema drift fallbacks (4h)
- GF-PHASE0-006: Create product_images table (2h)

### Phase 6: Database Standardization (Days 26-35)
**Total Recommended Effort: 12-28 hours**

| Week | Task | Effort | Priority |
|------|------|--------|----------|
| Day 26-27 | INFRA-DB-001 Phase 1 (vendorId FKs) | 5h | P2 |
| Day 28 | INFRA-DB-002 (Column renames) | 4h | P2 |
| Day 29-30 | INFRA-DB-001 Phase 2 (other FKs) | 8h | P3 |
| Day 31-32 | Naming standardization (if time) | 4h | P3 |
| Day 33-35 | Buffer + verification | 7h | - |

### Post-Beta (Deferred)
- INFRA-DB-003: Image table consolidation (16h)
- INFRA-DB-004: Vendors → clients migration (24h)
- Misc cleanup tasks (8h)

---

## Risk Assessment Summary

| Without Phase 6 | With Phase 6 |
|-----------------|--------------|
| Risk: MEDIUM | Risk: LOW |
| Data integrity concerns | Data integrity improved |
| Technical debt accumulates | Technical debt reduced |
| Future development harder | Future development easier |
| Potential orphan records | Referential integrity enforced |

---

## Recommendations

1. **Execute Priority 2 tasks in Phase 6** (12h effort)
   - Critical for data integrity
   - Low risk, high impact

2. **Execute Priority 3 tasks if time permits** (16h effort)
   - Improves consistency
   - Reduces technical debt

3. **Defer Priority 4 tasks to post-beta** (40h effort)
   - Large refactors need stability first
   - Can be done during planned maintenance

4. **Total Phase 6 recommended effort:** 12-28 hours

---

## Golden Flow Impact

| Golden Flow | Affected Issues | Phase 6 Impact |
|-------------|-----------------|----------------|
| GF-001 Direct Intake | #3, #14 | Batches integrity improved |
| GF-002 Procure-to-Pay | #4, #5, #7, #11 | PO/vendor integrity improved |
| GF-003 Order-to-Cash | #14, #18 | Order/sales integrity improved |
| GF-004 Invoice & Payment | #9, #16 | Payment/ledger integrity improved |
| GF-005 Pick & Pack | #14 | Batch allocation integrity |
| GF-006 Client Ledger | #9, #16 | Accurate ledger data |
| GF-007 Inventory Mgmt | #3, #14 | Batch tracking integrity |
| GF-008 Sample Request | N/A | No direct impact |

---

## Verification Plan

After each Phase 6 task:

```bash
# 1. Run database integrity checks
mysql -e "SELECT 'brands', COUNT(*) FROM brands WHERE vendorId NOT IN (SELECT id FROM clients)
UNION SELECT 'bills', COUNT(*) FROM bills WHERE vendorId NOT IN (SELECT id FROM clients);"

# 2. Run full test suite
pnpm check && pnpm lint && pnpm test && pnpm build

# 3. Verify deployment
./scripts/watch-deploy.sh

# 4. Check for errors
./scripts/terp-logs.sh run 100 | grep -i "error"

# 5. Manual verification of affected flows
```

---

## References

- **Database Audit:** `docs/audits/DATABASE_TABLE_AUDIT_2026-01-28.md`
- **Golden Flows Roadmap:** `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md`
- **CLAUDE.md Section 4:** Database standards
- **CLAUDE.md Section 9:** Deprecated systems

---

**Document Version:** 1.0
**Author:** Claude Code Agent
**Task:** GF-PHASE0-008
