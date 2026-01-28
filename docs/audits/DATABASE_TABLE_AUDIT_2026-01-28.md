# Database Schema Audit Report

**Date:** 2026-01-28
**Auditor:** Claude Code Agent (GF-PHASE0-008)
**Source:** Drizzle schema analysis (7,822 lines)
**Status:** COMPLETE
**Reference:** PR #331, BUG-112 Investigation

---

## Executive Summary

This audit identifies **23 database schema issues** across 4 severity levels affecting the TERP ERP system. The issues were discovered during the BUG-112 investigation and comprehensive schema review.

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 3 | 2 addressed (Phase 0), 1 deferred (Phase 6) |
| HIGH | 8 | Planned for Phase 6 |
| MEDIUM | 7 | Planned for Phase 6 |
| LOW | 5 | Deferred post-beta |

**Key Findings:**
- Production schema drift causing runtime failures
- Missing `product_images` table blocking photography module
- Deprecated `vendors` table still in use (Party Model incomplete)
- Inconsistent FK constraints across 30+ tables
- Naming convention violations (vendorId → clients)

---

## CRITICAL Issues (3)

### Issue #1: Schema Drift - products.strainId Column

**Severity:** CRITICAL
**Location:** `drizzle/schema.ts:418`
**Status:** ADDRESSED (GF-PHASE0-001b)

**Problem:**
The `products.strainId` column exists in Drizzle schema but may not exist in production database. Queries joining on strains fail with `ER_BAD_FIELD_ERROR`.

**Impact:**
- Photography queue fails completely
- Product listings with strain info fail
- Affects GF-001, GF-002, GF-003, GF-007

**Schema Definition:**
```typescript
// drizzle/schema.ts:418
strainId: int("strainId"),  // May not exist in production
```

**Resolution:**
Fallback queries implemented in PR #318 that catch schema errors and retry without strains join.

**Affected Files:**
- `server/productsDb.ts` - getProducts, getProductById
- `server/routers/photography.ts` - getAwaitingPhotography
- `server/routers/search.ts` - global search
- `server/services/catalogPublishingService.ts`
- `server/services/strainMatchingService.ts`

**Verification:**
```sql
-- Check if column exists
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'strainId';
```

---

### Issue #2: Dual Image Tables Conflict

**Severity:** CRITICAL
**Location:** `drizzle/schema.ts:451`, `drizzle/schema.ts:6740`
**Status:** DEFERRED (Phase 6 - INFRA-DB-003)

**Problem:**
Two image tables exist in schema with overlapping purposes:

**Table 1: productMedia (line 451)**
```typescript
export const productMedia = mysqlTable("productMedia", {
  id: serial("id").primaryKey(),
  productId: int("productId"),
  mediaType: mysqlEnum("mediaType", ["IMAGE", "VIDEO", "DOCUMENT"]),
  url: varchar("url", { length: 500 }),
  isPrimary: boolean("isPrimary").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

**Table 2: productImages (line 6740)**
```typescript
export const productImages = mysqlTable("product_images", {
  id: serial("id").primaryKey(),
  batchId: int("batch_id").references(() => batches.id),
  productId: int("product_id").references(() => products.id),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  caption: varchar("caption", { length: 255 }),
  isPrimary: boolean("is_primary").default(false),
  sortOrder: int("sort_order").default(0),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED", "ARCHIVED"]),
  uploadedBy: int("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});
```

**Impact:**
- Developer confusion about canonical source
- Duplicate data storage potential
- Code references both tables inconsistently

**Recommendation:**
Consolidate into single table with all required fields (productImages preferred due to richer schema).

---

### Issue #3: Missing product_images Table in Production

**Severity:** CRITICAL (P0)
**Location:** `drizzle/schema.ts:6740`, Migration `0016_add_ws007_010_tables.sql`
**Status:** ADDRESSED (GF-PHASE0-006)

**Problem:**
The `product_images` table exists in Drizzle schema but was never created in production database. Migration file exists but was never executed.

**Root Cause:**
Migration system gap - formal migrations in `drizzle/migrations/` are not executed during deployment. The auto-migration system only adds columns, not tables.

**Impact:**
- Photography module completely broken
- Error: `ER_NO_SUCH_TABLE: Table 'defaultdb.product_images' doesn't exist`
- Blocks GF-001, GF-007

**Migration SQL:**
```sql
CREATE TABLE IF NOT EXISTS product_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT REFERENCES batches(id),
  product_id INT REFERENCES products(id),
  image_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED') DEFAULT 'APPROVED',
  uploaded_by INT REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_batch_images (batch_id),
  INDEX idx_product_images (product_id)
);
```

**Verification:**
```sql
SHOW TABLES LIKE 'product_images';
DESCRIBE product_images;
SHOW INDEX FROM product_images;
```

---

## HIGH Priority Issues (8)

### Issue #4: Missing FK Constraint - brands.vendorId

**Severity:** HIGH
**Location:** `drizzle/schema.ts:375`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
`brands.vendorId` column has no FK constraint, allowing orphan records.

```typescript
vendorId: int("vendorId"),  // No .references(() => vendors.id)
```

**Risk:** Can insert brand with non-existent vendorId, breaking joins.

**Fix:**
```sql
ALTER TABLE brands ADD CONSTRAINT fk_brands_vendor
  FOREIGN KEY (vendorId) REFERENCES clients(id) ON DELETE RESTRICT;
```

---

### Issue #5: Missing FK Constraint - lots.vendorId (Deprecated)

**Severity:** HIGH
**Location:** `drizzle/schema.ts:548`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
`lots.vendorId` has no FK constraint AND is deprecated (use `supplierClientId`).

```typescript
supplierClientId: int("supplier_client_id").references(() => clients.id),  // CANONICAL
vendorId: int("vendorId"),  // DEPRECATED - no FK
```

**Risk:** Dual columns with inconsistent data, no referential integrity on vendorId.

**Note:** This column should be deprecated in favor of `supplierClientId`.

---

### Issue #6: Missing FK Constraint - paymentHistory.vendorId

**Severity:** HIGH
**Location:** `drizzle/schema.ts:669`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
`paymentHistory.vendorId` has no FK constraint.

```typescript
vendorId: int("vendorId"),  // No reference
```

---

### Issue #7: Missing FK Constraint - bills.vendorId

**Severity:** HIGH
**Location:** `drizzle/schema.ts:1178`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
`bills.vendorId` has no FK constraint.

```typescript
vendorId: int("vendorId"),  // No reference
```

---

### Issue #8: Missing FK Constraint - expenses.vendorId

**Severity:** HIGH
**Location:** `drizzle/schema.ts:1421`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
`expenses.vendorId` has no FK constraint.

```typescript
vendorId: int("vendorId"),  // No reference
```

---

### Issue #9: Misleading payments.vendorId Naming

**Severity:** HIGH
**Location:** `drizzle/schema.ts:1279`
**Status:** Ready (Phase 6 - INFRA-DB-002)

**Problem:**
Column named `vendorId` but references `clients.id`, not `vendors.id`.

```typescript
// NOTE: This references clients.id (as supplier), NOT vendors.id
vendorId: int("vendorId").references(() => clients.id),
```

**Impact:** Confusing naming causes developer mistakes.

**Fix:**
Rename to `supplierClientId` for clarity.

```sql
ALTER TABLE payments CHANGE vendorId supplierClientId INT;
```

---

### Issue #10: Deprecated vendors Table Still in Use

**Severity:** HIGH
**Location:** `drizzle/schema.ts:167`
**Status:** deferred (Post-Beta - INFRA-DB-004)

**Problem:**
The `vendors` table is deprecated per Party Model, but multiple tables still reference it:

| Table | Column | FK Constraint |
|-------|--------|---------------|
| purchaseOrders | vendorId | YES (vendors.id) |
| vendorNotes | vendorId | YES (vendors.id) |
| calendarEvents | vendorId | YES (vendors.id) |
| vendorReturns | vendorId | YES (vendors.id) |

**Canonical Model:**
All vendor references should use `clients` table with `isSeller=true`.

**Migration Required:**
1. Create `supplierClientId` columns where missing
2. Migrate data from vendors to clients with isSeller=true
3. Update FKs to point to clients
4. Deprecate vendors table

---

### Issue #11: Dual Vendor Columns in purchaseOrders

**Severity:** HIGH
**Location:** `drizzle/schema.ts:231, 237`
**Status:** Ready (Phase 6 - INFRA-DB-002)

**Problem:**
`purchaseOrders` has both canonical and deprecated columns:

```typescript
supplierClientId: int("supplier_client_id").references(() => clients.id),  // CANONICAL
vendorId: int("vendorId").references(() => vendors.id),  // DEPRECATED
```

**Risk:** Data inconsistency if both populated differently.

**Note:** Kept for backward compatibility during Party Model migration.

---

## MEDIUM Priority Issues (7)

### Issue #12: Naming Inconsistency - camelCase vs snake_case

**Severity:** MEDIUM
**Location:** Multiple files
**Status:** Ready (Phase 6 - INFRA-DB-003)

**Problem:**
Inconsistent column naming patterns:

**Pattern A: camelCase key → camelCase DB column**
```typescript
vendorId: int("vendorId")  // Same name
```

**Pattern B: camelCase key → snake_case DB column**
```typescript
pricingProfileId: int("pricing_profile_id")  // Different
```

**Impact:** Cognitive overhead, potential bugs in raw SQL.

**Recommendation:** Standardize on snake_case for DB columns per CLAUDE.md Section 4.

---

### Issue #13: Missing FK - products.brandId

**Severity:** MEDIUM
**Location:** `drizzle/schema.ts:417`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
```typescript
brandId: int("brandId"),  // No .references(() => brands.id)
```

---

### Issue #14: Missing FK - batches.productId, batches.lotId

**Severity:** MEDIUM
**Location:** `drizzle/schema.ts:592-593`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
```typescript
productId: int("productId"),  // No FK
lotId: int("lotId"),  // No FK
```

---

### Issue #15: Missing FK - billLineItems (billId, productId, lotId)

**Severity:** MEDIUM
**Location:** `drizzle/schema.ts:1222-1224`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
```typescript
billId: int("billId"),  // No FK
productId: int("productId"),  // No FK
lotId: int("lotId"),  // No FK
```

---

### Issue #16: Missing FK - ledgerEntries (accountId, fiscalPeriodId)

**Severity:** MEDIUM
**Location:** `drizzle/schema.ts:997, 1007`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
```typescript
accountId: int("accountId"),  // No FK
fiscalPeriodId: int("fiscalPeriodId"),  // No FK
```

---

### Issue #17: Missing FK - expenses (categoryId, bankAccountId, billId)

**Severity:** MEDIUM
**Location:** `drizzle/schema.ts:1420, 1435, 1438`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
```typescript
categoryId: int("categoryId"),  // No FK
bankAccountId: int("bankAccountId"),  // No FK
billId: int("billId"),  // No FK
```

---

### Issue #18: Missing FK - sales (batchId, productId)

**Severity:** MEDIUM
**Location:** `drizzle/schema.ts:712-713`
**Status:** Ready (Phase 6 - INFRA-DB-001)

**Problem:**
```typescript
batchId: int("batchId"),  // No FK
productId: int("productId"),  // No FK
```

---

## LOW Priority Issues (5)

### Issue #19: Missing Indexes on FK Columns

**Severity:** LOW
**Location:** Multiple tables
**Status:** Deferred (Post-Beta)

**Problem:**
Many FK columns lack corresponding indexes, impacting query performance.

**Tables Needing Indexes:**
- `batches(productId, lotId)`
- `billLineItems(billId, productId, lotId)`
- `sales(batchId, productId)`
- `ledgerEntries(accountId, fiscalPeriodId)`

---

### Issue #20: Schema Documentation Gaps

**Severity:** LOW
**Location:** N/A
**Status:** Deferred (Post-Beta)

**Problem:**
- No ER diagrams in codebase
- No FK constraint matrix documentation
- Complex relationships not documented
- No column naming convention guide

---

### Issue #21: Soft Delete Consistency

**Severity:** LOW
**Location:** Multiple queries
**Status:** Deferred (Post-Beta)

**Problem:**
Not all queries consistently filter `deletedAt IS NULL`, risking return of "deleted" records.

---

### Issue #22: auditLogs.actorId Missing FK

**Severity:** LOW
**Location:** `drizzle/schema.ts:779`
**Status:** Deferred (Post-Beta)

**Problem:**
`auditLogs.actorId` has no FK to users table.

```typescript
actorId: int("actorId"),  // No .references(() => users.id)
```

**Note:** May be intentional for flexibility (system actions, etc.)

---

### Issue #23: Self-Referential FK - accounts.parentAccountId

**Severity:** LOW
**Location:** `drizzle/schema.ts:974`
**Status:** Deferred (Post-Beta)

**Problem:**
`accounts.parentAccountId` has no self-referential FK constraint.

```typescript
parentAccountId: int("parentAccountId"),  // No .references(() => accounts.id)
```

---

## Summary by Table

| Table | Issues | Severity | Status |
|-------|--------|----------|--------|
| products | #1, #13 | CRITICAL, MEDIUM | Addressed, Planned |
| product_images | #3 | CRITICAL | Addressed |
| productMedia | #2 | CRITICAL | Deferred |
| brands | #4 | HIGH | Planned |
| lots | #5 | HIGH | Planned |
| paymentHistory | #6 | HIGH | Planned |
| bills | #7 | HIGH | Planned |
| expenses | #8, #17 | HIGH, MEDIUM | Planned |
| payments | #9 | HIGH | Planned |
| vendors | #10 | HIGH | Planned |
| purchaseOrders | #11 | HIGH | Planned |
| batches | #14 | MEDIUM | Planned |
| billLineItems | #15 | MEDIUM | Planned |
| ledgerEntries | #16 | MEDIUM | Planned |
| sales | #18 | MEDIUM | Planned |
| Multiple | #12 | MEDIUM | Planned |
| Multiple | #19-23 | LOW | Deferred |

---

## Remediation Timeline

### Phase 0 (Immediate) - ADDRESSED
- Issue #1: strainId schema drift → Fallback queries (PR #318)
- Issue #3: product_images table → Create table (GF-PHASE0-006)

### Phase 6 (Database Standardization) - PLANNED
- Issues #4-8: Add missing FK constraints (INFRA-DB-001)
- Issues #9, #11: Rename misleading columns (INFRA-DB-002)
- Issues #2, #12: Consolidate/standardize (INFRA-DB-003)
- Issue #10: Complete vendors → clients migration (INFRA-DB-004)

### Post-Beta (Deferred)
- Issues #19-23: Documentation, indexes, cleanup

---

## Verification Commands

```bash
# Check for orphan vendorId records
SELECT COUNT(*) FROM brands WHERE vendorId NOT IN (SELECT id FROM clients);
SELECT COUNT(*) FROM bills WHERE vendorId NOT IN (SELECT id FROM clients);
SELECT COUNT(*) FROM expenses WHERE vendorId NOT IN (SELECT id FROM clients);

# Check FK constraints
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'defaultdb' AND REFERENCED_TABLE_NAME IS NOT NULL;

# Check for missing product_images table
SHOW TABLES LIKE 'product_images';

# Check strainId column existence
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'strainId';
```

---

## References

- **BUG-112:** Photography module investigation
- **PR #318:** Schema drift fallback implementation
- **GF-PHASE0-006:** Create product_images table
- **GF-PHASE0-007:** Fix migration infrastructure
- **CLAUDE.md Section 4:** Database standards
- **CLAUDE.md Section 9:** Deprecated systems (vendors table)

---

**Document Version:** 1.0
**Author:** Claude Code Agent
**Task:** GF-PHASE0-008
