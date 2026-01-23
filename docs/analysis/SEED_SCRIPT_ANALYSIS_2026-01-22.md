# Seed Script Deep Analysis - January 22, 2026

## Executive Summary

A comprehensive column-by-column analysis of `scripts/seed-comprehensive.ts` against the actual database schema reveals **6 CRITICAL bugs** that would cause the seed script to fail or produce invalid data.

---

## CRITICAL ISSUES (Blocking - Script Will Fail)

### CRITICAL-001: Products Table - Invalid Column `margin`

**Location**: `scripts/seed-comprehensive.ts:675-676`

**Problem**: The seed script attempts to insert a `margin` column into the `products` table, but this column does NOT exist in the schema.

**Seed Script (Line 675)**:

```sql
INSERT INTO products (brandId, strainId, nameCanonical, category, subcategory, uomSellable, description, margin, createdAt, updatedAt)
```

**Actual Schema** (`drizzle/schema.ts:414-426`):

```typescript
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  strainId: int("strainId"),
  nameCanonical: varchar("nameCanonical", { length: 500 }).notNull(),
  deletedAt: timestamp("deleted_at"),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  uomSellable: varchar("uomSellable", { length: 20 }).notNull().default("EA"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

**Fix Required**: Remove `margin` from the INSERT statement:

```typescript
await connection.query(
  `INSERT INTO products (brandId, strainId, nameCanonical, category, subcategory, uomSellable, description, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [brand, strain, name, category, subcategory, uom, description]
);
```

---

### CRITICAL-002: Pricing Defaults - Wrong Column Name

**Location**: `scripts/seed-comprehensive.ts:406-408`

**Problem**: Seed uses `category` but schema has `product_category`.

**Seed Script (Line 406)**:

```sql
INSERT INTO pricing_defaults (category, default_margin_percent, created_at, updated_at)
```

**Actual Schema** (`drizzle/schema.ts:4467-4482`):

```typescript
export const pricingDefaults = mysqlTable("pricing_defaults", {
  id: int("id").primaryKey().autoincrement(),
  productCategory: varchar("product_category", { length: 100 })
    .notNull()
    .unique(),
  defaultMarginPercent: decimal("default_margin_percent", {
    precision: 5,
    scale: 2,
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
```

**Fix Required**: Change `category` to `product_category`:

```sql
INSERT INTO pricing_defaults (product_category, default_margin_percent, created_at, updated_at)
```

---

### CRITICAL-003: Tags Table - Invalid ENUM Values

**Location**: `scripts/seed-comprehensive.ts:636-640`

**Problem**: Seed uses tag categories that don't match the ENUM values in the schema.

**Seed Script Values**:

- `'cultivation'`
- `'quality'`
- `'potency'`
- `'recognition'`
- `'status'`

**Actual ENUM** (`drizzle/schema.ts:475`):

```typescript
category: mysqlEnum("category", [
  "STATUS",
  "PRIORITY",
  "TYPE",
  "CUSTOM",
  "STRAIN",
  "FLAVOR",
  "EFFECT",
]).default("CUSTOM");
```

**Fix Required**: Map seed categories to valid ENUM values:

```typescript
const tagCategoryMapping: Record<string, string> = {
  cultivation: "CUSTOM",
  quality: "CUSTOM",
  potency: "EFFECT",
  recognition: "STATUS",
  status: "STATUS",
};
```

---

### CRITICAL-004: Inbox Items - Invalid Source Types

**Location**: `scripts/seed-comprehensive.ts:1232`

**Problem**: Seed uses source types that don't exist in the ENUM.

**Seed Script Values**:

```typescript
const sourceTypes = [
  "mention",
  "task_assignment",
  "task_update",
  "order_notification",
  "payment_received",
];
```

**Actual ENUM** (`drizzle/schema.ts:4822-4826`):

```typescript
sourceType: mysqlEnum("source_type", [
  "mention",
  "task_assignment",
  "task_update",
]).notNull();
```

**Invalid Values**: `'order_notification'` and `'payment_received'` DO NOT EXIST in the enum!

**Fix Required**: Only use valid enum values:

```typescript
const sourceTypes = ["mention", "task_assignment", "task_update"];
```

---

## HIGH PRIORITY ISSUES (Data May Be Missing/Incomplete)

### HIGH-001: Missing Feature Flags Seeding

**Problem**: The seed script does not seed the `feature_flags` table.

**Impact**: Many features may be disabled by default, causing UI elements to not appear.

**Fix Required**: Add call to existing seeder:

```typescript
import { seedFeatureFlags } from "../server/services/seedFeatureFlags";
// In main():
await seedFeatureFlags();
```

---

### HIGH-002: Missing Scheduling Tables Seeding

**Problem**: No seeders for `rooms`, `shift_templates`, `appointment_types`, `overtime_rules`.

**Impact**: Scheduling features won't have any preset data.

**Fix Required**: Add new seeder functions for these tables.

---

### HIGH-003: Missing Storage Tables Seeding

**Problem**: No seeders for `sites`, `storage_zones`.

**Impact**: Inventory location features won't work properly.

**Fix Required**: Add new seeder functions for these tables.

---

## MEDIUM PRIORITY ISSUES (May Cause Issues)

### MEDIUM-001: Client isSeller Percentage May Be Too Low

**Location**: `scripts/seed-comprehensive.ts:479, 503`

**Problem**: Only ~15-20% of clients are marked as sellers.

**Seed Script**:

```typescript
is_seller: Math.random() < 0.15 ? 1 : 0,  // Regular clients
is_seller: Math.random() < 0.2 ? 1 : 0,   // Whale clients
```

**Impact**: `intake_sessions` table references `clients.id` where `is_seller=true`. With low seller percentage, intake seeding may have limited data.

**Recommendation**: Increase seller percentage or ensure adequate seller clients exist.

---

### MEDIUM-002: Lots supplierClientId Not Being Set

**Location**: `scripts/seed-comprehensive.ts:702-711`

**Problem**: The `lots` table has both `vendorId` (deprecated) and `supplierClientId` (canonical). The seed only sets `vendorId`.

**Schema** (`drizzle/schema.ts:534-536`):

```typescript
supplierClientId: int("supplier_client_id").references(() => clients.id, { onDelete: "restrict" }),
// Vendor reference (DEPRECATED - use supplierClientId instead)
vendorId: int("vendorId").notNull(),
```

**Recommendation**: Also populate `supplierClientId` with the matching seller client ID for forward compatibility.

---

## VERIFICATION TABLES (Schema vs Seed Comparison)

### Tables Seeded Correctly

| Table                     | Status     | Notes                                         |
| ------------------------- | ---------- | --------------------------------------------- |
| users                     | ✅ OK      | All columns match                             |
| vendors                   | ✅ OK      | All columns match                             |
| clients                   | ✅ OK      | Uses boolean for is_buyer/is_seller correctly |
| brands                    | ✅ OK      | All columns match                             |
| strains                   | ✅ OK      | All columns match                             |
| locations                 | ✅ OK      | All columns match                             |
| batches                   | ✅ OK      | All columns match, ~65% LIVE status           |
| lots                      | ⚠️ PARTIAL | vendorId set, but supplierClientId not set    |
| orders                    | ✅ OK      | is_draft=0 correctly, all columns match       |
| invoices                  | ✅ OK      | All columns match                             |
| payments                  | ✅ OK      | All columns match                             |
| bills                     | ✅ OK      | All columns match                             |
| client_transactions       | ✅ OK      | ENUM values correct                           |
| batch_status_history      | ✅ OK      | All columns match                             |
| calendars                 | ✅ OK      | All columns match                             |
| calendar_events           | ✅ OK      | ENUM values match                             |
| todo_lists                | ✅ OK      | All columns match                             |
| todo_tasks                | ✅ OK      | ENUM values match                             |
| comments                  | ✅ OK      | All columns match                             |
| vip_tiers                 | ✅ OK      | All columns match                             |
| vip_portal_configurations | ✅ OK      | All columns match                             |
| vip_portal_auth           | ✅ OK      | All columns match                             |
| client_needs              | ✅ OK      | All columns match                             |
| vendor_supply             | ✅ OK      | All columns match                             |
| sampleRequests            | ✅ OK      | All columns match                             |
| intake_sessions           | ✅ OK      | Uses seller client IDs correctly              |
| recurring_orders          | ✅ OK      | ENUM values match                             |
| referral_credits          | ✅ OK      | All columns match                             |
| leaderboard_metric_cache  | ✅ OK      | All columns match                             |
| workflow_statuses         | ✅ OK      | All columns match                             |

### Tables with Issues

| Table            | Issue                                            | Severity |
| ---------------- | ------------------------------------------------ | -------- |
| products         | `margin` column doesn't exist                    | CRITICAL |
| pricing_defaults | Column name is `product_category` not `category` | CRITICAL |
| tags             | ENUM values mismatch                             | CRITICAL |
| inbox_items      | Invalid source_type values                       | CRITICAL |

### Tables Not Seeded (Missing Seeders)

| Table             | Impact                        |
| ----------------- | ----------------------------- |
| feature_flags     | Features may be disabled      |
| rooms             | Scheduling won't have rooms   |
| shift_templates   | No shift presets              |
| appointment_types | No appointment categories     |
| overtime_rules    | No overtime calculation rules |
| sites             | Inventory location incomplete |
| storage_zones     | Inventory zones incomplete    |
| achievements      | Gamification incomplete       |
| reward_catalog    | Gamification incomplete       |
| referral_settings | Referral program incomplete   |

---

## Inventory Display Issue Analysis

### Why Inventory May Not Be Showing

The inventory query (`server/inventoryDb.ts:838-886`) performs these JOINs:

```sql
batches → products → brands
batches → lots → vendors
```

**Potential Causes**:

1. **CRITICAL-001 (Products)**: If the products INSERT fails due to the invalid `margin` column, no products exist, and batches have nothing to link to.

2. **Query Dependencies**: The inventory display requires:
   - Products with valid `brandId`
   - Batches with valid `productId` and `lotId`
   - Lots with valid `vendorId`

**Fix**: Resolve CRITICAL-001 first, then verify the FK chain is intact.

---

## Recommended Fix Order

1. **CRITICAL-001**: Remove `margin` from products INSERT (immediate blocker)
2. **CRITICAL-002**: Fix `category` → `product_category` in pricing_defaults
3. **CRITICAL-003**: Fix tags category ENUM values
4. **CRITICAL-004**: Fix inbox_items source_type values
5. **HIGH-001**: Add feature flags seeding
6. **HIGH-002**: Add scheduling tables seeding
7. **HIGH-003**: Add storage tables seeding

---

## Session Information

- **Analysis Date**: 2026-01-22
- **Script Analyzed**: `scripts/seed-comprehensive.ts`
- **Schema Version**: Current (verified against drizzle/schema.ts)
- **Agent**: Claude Opus 4.5
