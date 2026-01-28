# Database Table Audit Report

**Date:** 2026-01-28
**Auditor:** Claude Code Agent
**Scope:** Identify all cases where the codebase expects or needs a table to exist but it doesn't, or exists in a way that cannot be correctly used

---

## Executive Summary

This audit identified **23 issues** across the codebase where database table/column expectations don't match reality:

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 3 | Tables/columns referenced that don't exist in production DB |
| **HIGH** | 8 | Missing FK constraints or deprecated table references |
| **MEDIUM** | 7 | Naming inconsistencies that could cause confusion |
| **LOW** | 5 | Documentation/cleanup items |

---

## CRITICAL Issues

### 1. `products.strainId` Column - Does Not Exist in Production DB

**Location:** `drizzle/schema.ts:418`

```typescript
export const products = mysqlTable("products", {
  // ...
  strainId: int("strainId"), // Link to strain library - NO FK CONSTRAINT
  // ...
});
```

**Problem:**
- The column is defined in the Drizzle schema but **does not exist in the production database**
- 21+ queries across 8 files attempt to JOIN via `products.strainId` → `strains.id`
- Fails at runtime with: `Unknown column 'products.strainId' in 'on clause'`

**Files Affected:**
| File | Lines |
|------|-------|
| `server/productsDb.ts` | 5 occurrences |
| `server/routers/photography.ts` | Lines 253-255, 506-508, 967-968 |
| `server/routers/search.ts` | Line 298 |
| `server/salesSheetsDb.ts` | 2 occurrences |
| `server/services/catalogPublishingService.ts` | 1 occurrence |
| `server/services/strainMatchingService.ts` | 2 occurrences |
| `server/services/strainService.ts` | 1 occurrence |

**Current Mitigation:** BUG-112 added `isSchemaError()` function with try-catch fallbacks (photography.ts:27-100)

**Fix Required:** Either:
1. Add the `strainId` column to the production database via migration
2. OR remove all `strainId` references from queries and schema

---

### 2. Dual Image Tables - Conflicting Usage

**Problem:** Two separate tables exist for product/batch images with overlapping purposes:

| Table | DB Name | Purpose | Used By |
|-------|---------|---------|---------|
| `productMedia` | `productMedia` | Product-level images | `liveCatalogService.ts:370-380` |
| `productImages` | `product_images` | Batch-level photos | `photography.ts`, `catalogPublishingService.ts` |

**Specific Issues:**
1. `productMedia` uses **camelCase** DB column names (`productId`, `uploadedBy`)
2. `productImages` uses **snake_case** DB column names (`product_id`, `uploaded_by`)
3. No clear documentation on which table to use for which purpose
4. Both tables can store the same image data, leading to duplication

**Files with Conflicting Usage:**
- `server/services/liveCatalogService.ts:368-387` - Uses `productMedia`
- `server/services/catalogPublishingService.ts:276-280` - Uses `productImages`
- `server/routers/photography.ts` - Uses `productImages` exclusively

---

### 3. Missing `product_images` Table in Some Environments

**Location:** `drizzle/migrations/0016_add_ws007_010_tables.sql:27-41`

**Problem:** The migration creates the table conditionally with `CREATE TABLE IF NOT EXISTS`, but:
- Some production databases may not have run this migration
- Code assumes table exists (no try-catch in some paths)
- Fallback queries in photography.ts remove image-based filtering when table is missing

**Evidence:** The `isSchemaError()` function specifically handles `ER_NO_SUCH_TABLE` (errno 1146)

---

## HIGH Severity Issues

### 4. Missing FK Constraints on `vendorId` Columns

Multiple tables have `vendorId` columns with **no FK constraint**, meaning:
- No referential integrity enforcement
- Orphaned records possible if vendors are deleted
- No clarity on which table `vendorId` should reference (`vendors` or `clients`)

| Table | Line | Column | FK Status |
|-------|------|--------|-----------|
| `bills` | 1178 | `vendorId: int("vendorId").notNull()` | **NO FK** |
| `expenses` | 1421 | `vendorId: int("vendorId")` | **NO FK** |
| `brands` | 375 | `vendorId: int("vendorId")` | **NO FK** |
| `paymentHistory` | 669 | `vendorId: int("vendorId").notNull()` | **NO FK** |
| `lots` | 548 | `vendorId: int("vendorId").notNull()` | **NO FK** (has `supplierClientId` with FK) |

---

### 5. `payments.vendorId` References `clients.id` (Misleading Name)

**Location:** `drizzle/schema.ts:1279`

```typescript
vendorId: int("vendorId").references(() => clients.id, {
  onDelete: "restrict",
}),
```

**Problem:**
- Column named `vendorId` but references `clients.id`, not `vendors.id`
- Causes confusion: developers expect FK to `vendors` table
- Comment in schema says "NOTE: This references clients.id (as supplier), NOT vendors.id"
- Should be renamed to `supplierClientId` for clarity

---

### 6. Tables Using Deprecated `vendors` Table

Per CLAUDE.md, the `vendors` table is **DEPRECATED** - should use `clients` with `isSeller=true`. However, these tables still reference `vendors.id`:

| Table | Line | FK Target | Migration Status |
|-------|------|-----------|------------------|
| `vendorNotes` | 192 | `vendors.id` | Not migrated |
| `purchaseOrders` | 239 | `vendors.id` | Has dual FK (vendorId + supplierClientId) |
| `calendarEvents` | 5056 | `vendors.id` | Not migrated |
| `vendorHarvestReminders` | 6810 | `vendors.id` | Not migrated |
| `vendorSupply` | 4134 | `vendors.id` | Not migrated |
| `lots` | 548 | (no FK but uses vendorId) | Partial - has supplierClientId |

---

### 7. `lots.vendorId` vs `lots.supplierClientId` - Dual Column Confusion

**Location:** `drizzle/schema.ts:548-560`

```typescript
vendorId: int("vendorId").notNull(),  // No FK - deprecated
supplierClientId: int("supplier_client_id").references(() => clients.id, {...}),  // Canonical
```

**Problem:**
- Both columns exist and are used
- Code in `inventoryDb.ts` joins on BOTH (lines 886, 949)
- Creates maintenance burden and potential data inconsistency

---

### 8. `purchaseOrders` Has Dual Vendor References

**Location:** `drizzle/schema.ts:231-239`

```typescript
// Supplier relationship (canonical - uses clients table)
supplierClientId: int("supplier_client_id").references(() => clients.id, {...}),

// Vendor relationship (DEPRECATED - use supplierClientId instead)
vendorId: int("vendorId").notNull().references(() => vendors.id, {...}),
```

**Problem:**
- Both FKs required (vendorId is NOT NULL)
- Migration to single `supplierClientId` incomplete
- Queries must handle both columns

---

## MEDIUM Severity Issues

### 9. camelCase vs snake_case Column Naming Inconsistency

The schema uses **inconsistent** DB column naming:

**Tables using camelCase DB columns (problematic):**
- `productMedia` - `productId`, `uploadedBy`
- `productSynonyms` - `productId`
- `productTags` - `productId`, `tagId`
- `billLineItems` - `productId`
- `freeformNotes` - `createdBy`
- `strains` - `parentStrainId`, `baseStrainName`

**Tables using snake_case DB columns (correct pattern):**
- `productImages` - `product_id`, `batch_id`, `uploaded_by`
- `clientNeeds` - `client_id`, `strain_id`
- `calendarEvents` - `vendor_id`, `client_id`

**Impact:** Inconsistent naming makes it harder to:
- Write correct raw SQL queries
- Debug database issues
- Maintain coding standards

---

### 10. Missing FK on `products.strainId`

**Location:** `drizzle/schema.ts:418`

Even if the column existed, it has **no FK constraint**:

```typescript
strainId: int("strainId"), // No .references() call
```

Compare to `clientNeeds.strainId` which does have proper FK (line 4064):
```typescript
strainId: int("strainId").references(() => strains.id, { onDelete: "set null" }),
```

---

### 11. Missing FK on `productMedia.productId`

**Location:** `drizzle/schema.ts:453`

```typescript
productId: int("productId").notNull(),  // No FK to products.id
```

Should be:
```typescript
productId: int("productId").notNull().references(() => products.id, { onDelete: "cascade" }),
```

---

### 12. Missing FK on `billLineItems` Columns

**Location:** `drizzle/schema.ts:1220-1224`

```typescript
billId: int("billId").notNull(),  // No FK to bills.id
productId: int("productId"),       // No FK to products.id
lotId: int("lotId"),               // No FK to lots.id
```

All three should have `.references()` constraints.

---

### 13. `intakeSessions` - vendorId Naming Ambiguity

**Issue:** Some `vendorId` columns reference `clients.id` (suppliers) while others reference `vendors.id`. The naming doesn't distinguish between these.

Per `.kiro/specs/canonical-model-unification/design.md:890`:
> `vendorId` is context-dependent: If in `intakeSessions` → `clients.id`; else → `vendors.id` (deprecated)

---

### 14. Missing Table Documentation

The `productMedia` table is marked as "UNUSED" in some QA reports but is actively used:
- `server/services/liveCatalogService.ts` queries it
- Unclear if it should be deprecated in favor of `productImages`

---

### 15. mysqlEnum First Argument Naming

Some enums may have first argument mismatches with actual DB column names:

```typescript
// Line 110 - uses camelCase
export const batchStatusEnum = mysqlEnum("batchStatus", [...]);

// Line 144 - uses snake_case
export const ownershipTypeEnum = mysqlEnum("ownership_type", [...]);
```

The enum name MUST match the DB column name or runtime "Unknown column" errors occur.

---

## LOW Severity Issues

### 16-20. Documentation & Cleanup Items

| Issue | Location | Description |
|-------|----------|-------------|
| Deprecated vendors table still in schema | `drizzle/schema.ts:167` | Should be removed after full migration |
| Legacy seeder references | `verify-all-data.ts:28` | Uses `db.select().from(vendors)` |
| Inconsistent image table usage docs | N/A | No clear guidance on productMedia vs productImages |
| Orphan FK references in comments | Various | Comments reference tables that may not exist |
| Missing index on new columns | `products.strainId` | If column is added, needs index |

---

## Recommendations

### Immediate (Before Next Deploy)

1. **Add migration for `products.strainId`** OR **remove all strainId query references**
2. **Verify `product_images` table exists** in production before removing fallback queries
3. **Document** when to use `productMedia` vs `productImages`

### Short-Term (This Sprint)

4. Add FK constraints to `bills.vendorId`, `expenses.vendorId`, `brands.vendorId`
5. Rename `payments.vendorId` to `payments.supplierClientId` with migration
6. Standardize on snake_case DB column names for new tables

### Medium-Term (Next Quarter)

7. Complete `vendors` → `clients` migration for all tables
8. Remove dual `vendorId`/`supplierClientId` columns once migration complete
9. Consolidate image tables to single `productImages` pattern
10. Add missing FK constraints to all `productId`, `billId`, `lotId` columns

---

## Verification Commands

```bash
# Check for "Unknown column" errors in logs
./scripts/terp-logs.sh run 500 | grep -i "unknown column"

# Verify tables exist in production
mysql -e "SHOW TABLES LIKE '%images%';"
mysql -e "DESCRIBE products;" | grep strainId

# Find all vendorId usages without FK
grep -rn "vendorId.*int(" drizzle/schema.ts | grep -v "references"

# Find all strainId JOIN queries
grep -rn "strainId.*strains\|strains.*strainId" server/
```

---

## References

- BUG-112: Schema drift fallback implementation
- CLAUDE.md Section 4: Database standards
- `.kiro/steering/07-deprecated-systems.md`: Deprecated vendors table guidance
- `docs/jan-26-checkpoint/INVENTORY_FLOW_ANALYSIS.md`: Previous strainId analysis
