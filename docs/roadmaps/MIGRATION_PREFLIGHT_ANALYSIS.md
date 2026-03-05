# Migration Pre-Flight Analysis

**Created:** 2026-02-17
**Purpose:** Exhaustive impact analysis for Wave 2-4 schema/migration tasks
**Pull up before executing:** TER-245, TER-248, TER-247, TER-235

---

## TER-245: Add `deletedAt` to `product_images` (RED Mode)

### Summary

Add soft-delete column `deleted_at` to the `product_images` table and convert all hard deletes to soft deletes.

### Migration SQL

```sql
ALTER TABLE product_images ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;
CREATE INDEX idx_product_images_deleted_at ON product_images(deleted_at);
```

### Rollback SQL

```sql
DROP INDEX idx_product_images_deleted_at ON product_images;
ALTER TABLE product_images DROP COLUMN deleted_at;
```

### Impact Analysis: 32 Queries Touch `product_images`

#### Hard Deletes to Convert (2 locations)

| File                             | Line  | Current Code                          | Fix                                                   |
| -------------------------------- | ----- | ------------------------------------- | ----------------------------------------------------- |
| `server/services/photography.ts` | ~599  | `db.delete(productImages).where(...)` | Convert to `.update().set({ deletedAt: new Date() })` |
| `server/services/photography.ts` | ~1326 | `db.delete(productImages).where(...)` | Convert to `.update().set({ deletedAt: new Date() })` |

#### Queries Needing `isNull(deletedAt)` Filter (8 patterns)

| Pattern             | Files                            | Description                                                                     |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| `groupWhere` helper | `server/services/photography.ts` | Used in 8+ queries — add `isNull(productImages.deletedAt)` to the helper itself |
| Direct `findMany`   | `server/routers/products.ts`     | Product detail queries with image joins                                         |
| Direct `findMany`   | `server/routers/inventory.ts`    | Inventory views with image data                                                 |
| Status filter       | 4 files                          | Any query filtering product images by status                                    |

#### Schema File Changes

| File                                            | Change                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `server/db/schema/productImages.ts`             | Add `deletedAt: timestamp('deleted_at')` column                                   |
| `server/services/photography.ts`                | Convert 2 hard deletes, update `groupWhere` helper                                |
| `tests/integration/schema-verification.test.ts` | Remove `product_images.deleted_at` from `COLUMNS_PENDING_MIGRATION` once deployed |

### Risk Assessment

- **Estimate:** ~4h
- **Risk:** MEDIUM — `groupWhere` helper centralizes most queries, so fixing it covers ~8 queries at once
- **Key concern:** If `groupWhere` is missed, soft-deleted images will appear in results
- **Verification:** Query `SELECT COUNT(*) FROM product_images WHERE deleted_at IS NOT NULL` should be 0 after migration (no data change)

---

## TER-248: Add `strains` + `referral_settings` Columns (RED Mode)

### Summary

Create the `strains` and `referral_settings` tables with columns already defined in Drizzle schema but missing from production MySQL.

### Columns Tracked in `COLUMNS_PENDING_MIGRATION`

#### `strains` table (2 columns)

| Column           | Type   | Defined In                    |
| ---------------- | ------ | ----------------------------- |
| `effects`        | `json` | `server/db/schema/strains.ts` |
| `flavor_profile` | `json` | `server/db/schema/strains.ts` |

#### `referral_settings` table (5 columns)

| Column                 | Type                        | Defined In                             |
| ---------------------- | --------------------------- | -------------------------------------- |
| `is_active`            | `boolean`                   | `server/db/schema/referralSettings.ts` |
| `referral_code_prefix` | `varchar(50)`               | `server/db/schema/referralSettings.ts` |
| `commission_type`      | `enum('percentage','flat')` | `server/db/schema/referralSettings.ts` |
| `commission_value`     | `decimal(10,2)`             | `server/db/schema/referralSettings.ts` |
| `min_order_amount`     | `decimal(10,2)`             | `server/db/schema/referralSettings.ts` |

### Migration SQL

```sql
-- strains table additions
ALTER TABLE strains ADD COLUMN effects JSON NULL;
ALTER TABLE strains ADD COLUMN flavor_profile JSON NULL;

-- referral_settings table additions
ALTER TABLE referral_settings ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE referral_settings ADD COLUMN referral_code_prefix VARCHAR(50) NULL;
ALTER TABLE referral_settings ADD COLUMN commission_type ENUM('percentage', 'flat') NOT NULL DEFAULT 'percentage';
ALTER TABLE referral_settings ADD COLUMN commission_value DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE referral_settings ADD COLUMN min_order_amount DECIMAL(10,2) NULL;
```

### Rollback SQL

```sql
ALTER TABLE strains DROP COLUMN effects;
ALTER TABLE strains DROP COLUMN flavor_profile;
ALTER TABLE referral_settings DROP COLUMN is_active;
ALTER TABLE referral_settings DROP COLUMN referral_code_prefix;
ALTER TABLE referral_settings DROP COLUMN commission_type;
ALTER TABLE referral_settings DROP COLUMN commission_value;
ALTER TABLE referral_settings DROP COLUMN min_order_amount;
```

### Graceful Degradation Already Active

The codebase already handles missing columns gracefully:

| File                               | Mechanism                                                         |
| ---------------------------------- | ----------------------------------------------------------------- |
| `server/services/strainService.ts` | Returns `null` for effects/flavor_profile if column doesn't exist |
| `server/services/strainMatcher.ts` | Skips strain matching when columns unavailable                    |
| `server/db/inventoryDb.ts`         | Uses try/catch around strain joins                                |

### Post-Migration Cleanup

After deploying the migration:

1. Remove graceful degradation stubs from `strainService.ts`, `strainMatcher.ts`, `inventoryDb.ts`
2. Remove columns from `COLUMNS_PENDING_MIGRATION` array in `tests/integration/schema-verification.test.ts`
3. Enable full strain matching features

### Risk Assessment

- **Estimate:** ~4h (including stub cleanup)
- **Risk:** LOW — All columns are additive (NULL or have defaults), existing code already handles their absence
- **Key concern:** Ensure `ENUM` values in SQL match Drizzle schema exactly
- **Verification:** `pnpm test:schema` should pass with 0 pending columns after migration

---

## TER-247: Rewrite Supplier Queries → Client Queries (STRICT Mode)

### Summary

Replace all remaining `suppliers` table queries with `clients` table queries using `isSeller=true` filter.

### Prerequisite

TER-247 MUST be completed before TER-235 (supplier table deprecation). TER-247 rewrites queries; TER-235 removes the table.

### Supplier Query Inventory (9 total)

#### Already Migrated (4 queries — no action needed)

| File                                 | Status                            |
| ------------------------------------ | --------------------------------- |
| `server/db/inventoryDb.ts` (query 1) | ✅ Uses `clients` with `isSeller` |
| `server/db/inventoryDb.ts` (query 2) | ✅ Uses `clients` with `isSeller` |
| `server/db/inventoryDb.ts` (query 3) | ✅ Uses `clients` with `isSeller` |
| `server/db/inventoryDb.ts` (query 4) | ✅ Uses `clients` with `isSeller` |

#### Need Rewriting (5 queries)

| #   | File                               | Line | Current                     | Target                                                        |
| --- | ---------------------------------- | ---- | --------------------------- | ------------------------------------------------------------- |
| 1   | `server/db/dataCardMetricsDb.ts`   | ~45  | `from(vendors)`             | `from(clients).where(eq(clients.isSeller, true))`             |
| 2   | `server/db/dataCardMetricsDb.ts`   | ~78  | `from(vendors)` join        | `from(clients).where(...)` with supplier_profiles join        |
| 3   | `server/routers/audit.ts`          | ~120 | `vendors` in audit trail    | Map to `clients` entity                                       |
| 4   | `server/routers/debug.ts`          | ~55  | `db.select().from(vendors)` | `db.select().from(clients).where(eq(clients.isSeller, true))` |
| 5   | `server/routers/purchaseOrders.ts` | ~200 | vendor lookup               | `clients` with `supplierProfile` relation                     |

#### Client Components to Update (2)

| File                                                             | Line | Current               | Target                                     |
| ---------------------------------------------------------------- | ---- | --------------------- | ------------------------------------------ |
| `client/src/components/intake/IntakeGrid.tsx`                    | ~151 | `trpc.vendors.getAll` | `trpc.clients.list` with `isSeller` filter |
| `client/src/components/work-surface/DirectIntakeWorkSurface.tsx` | ~759 | `trpc.vendors.getAll` | `trpc.clients.list` with `isSeller` filter |

### FK Dependencies (Out of Scope for TER-247)

These 7 foreign keys reference `vendors.id` and will be addressed in TER-235:

1. `batches.vendorId`
2. `inventory.vendorId`
3. `purchase_orders.vendorId`
4. `purchase_order_items.vendorId`
5. `products.vendorId`
6. `intake_rows.vendorId`
7. `vendor_payments.vendorId`

### Migration Pattern

```typescript
// BEFORE (vendor query)
const suppliers = await db.select().from(vendors);

// AFTER (client query)
const suppliers = await db.query.clients.findMany({
  where: and(eq(clients.isSeller, true), isNull(clients.deletedAt)),
  with: { supplierProfile: true },
});
```

### Risk Assessment

- **Estimate:** ~6h
- **Risk:** MEDIUM — Query results must be equivalent (same columns exposed to UI)
- **Key concern:** `suppliers` table has different column names than `clients` — need mapping layer
- **Column mapping needed:**
  - `vendors.name` → `clients.name` (same)
  - `vendors.company` → `clients.company` (same)
  - `vendors.licenseNumber` → `supplierProfiles.licenseNumber`
  - `vendors.paymentTerms` → `supplierProfiles.paymentTerms`
- **Verification:** Compare query results before/after for row count and key fields

---

## TER-235: Deprecate Supplier Table (RED Mode)

### Summary

Final removal of the `suppliers` table after all queries are migrated (TER-247).

### Prerequisites

- ✅ TER-247 completed (all queries migrated)
- All 7 FK constraints dropped or redirected to `clients.id`

### This is a multi-phase task:

1. **Phase 1:** Add `supplierClientId` column to tables with `vendorId` FK
2. **Phase 2:** Backfill `supplierClientId` from supplier→client mapping
3. **Phase 3:** Update all code to use `supplierClientId`
4. **Phase 4:** Drop `vendorId` columns and `vendors` table

### Risk Assessment

- **Estimate:** ~10h (2 waves recommended)
- **Risk:** HIGH — FK changes affect 7 tables, data migration required
- **Key concern:** Must maintain data integrity during backfill
- **Verification:** Row counts, FK integrity checks, full E2E test suite

---

## Execution Order

```
Wave 2 (can run in parallel):
├── TER-245: product_images.deletedAt  ──────────── RED
└── TER-248: strains + referral_settings columns ── RED

Wave 3 (sequential, depends on nothing above):
├── TER-247: Rewrite vendor queries ─────────────── STRICT
└── TER-235: Deprecate vendor table ─────────────── RED (after TER-247)

Wave 4 (after Wave 2-3):
└── E2E assertion rigor tasks
```

---

## Checklist Before Running Each Task

- [ ] Read this document for the specific task
- [ ] Verify production DB state matches assumptions (`SHOW CREATE TABLE`)
- [ ] Back up affected tables before migration
- [ ] Run `pnpm test:schema` to confirm current pending columns
- [ ] Have rollback SQL ready
- [ ] Run in RED mode with user approval
- [ ] Verify deployment after push
