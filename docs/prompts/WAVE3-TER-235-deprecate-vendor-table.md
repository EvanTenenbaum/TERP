# TER-235: Deprecate Vendor Table — Phase 2 (supplierClientId Migration)

**Classification**: High | **Mode**: RED | **Estimate**: 16h (2 sub-waves recommended)
**Linear**: TER-235 | **Wave**: 3

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a checkmark with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with GATE, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.
7. **RED MODE RULES.** This task touches production schema (adding columns) and runs data backfill. Do NOT proceed without confirming the rollback plan is documented and understood.
8. **ONE PHASE AT A TIME.** Complete and fully verify Phase 1 before starting Phase 2.
9. **NEVER USE `db.delete(`.** TERP convention is soft deletes with `deletedAt`. Hard deletes are CI-blocked.
10. **NEVER USE `any` TYPE.** TypeScript strict mode is enforced. Use proper types or `unknown` with type guards.
11. **DEPENDENCY GATE.** TER-247 must be COMPLETE before this task begins. Verify this explicitly before writing a single line of code.
12. **NO VENDOR TABLE QUERIES IN NEW CODE.** All new code must use `clients` with `isSeller=true` and `supplierClientId`. Never write `db.query.vendors.findMany()` or `.from(vendors)` in new code paths.
13. **SCOPE GUARD.** Do not fix unrelated issues you discover. Note them in your return report and move on.

---

## Mission Brief

Phase 1 of the vendor migration (TER-247) rewrote `from(vendors)` queries to use the canonical `clients` table. This task is **Phase 2**: add `supplierClientId` columns to the tables that still only have `vendorId`, backfill those columns using the existing `supplierProfiles.legacyVendorId` mapping, then update all code to prefer `supplierClientId` over `vendorId`.

The end state: every table that stores a supplier reference has a `supplierClientId INT NULL` column pointing to `clients.id`, fully backfilled, with `vendorId` remaining as a read-only deprecated column (not dropped — that is Phase 3).

**Two sub-waves are recommended:**

- **Sub-wave A (Phase 1)**: Schema additions + backfill script + autoMigrate blocks
- **Sub-wave B (Phase 2)**: Code update to prefer `supplierClientId`, deprecation comments in schema

---

## Pre-Flight: Rollback Plan (DOCUMENT BEFORE TOUCHING ANYTHING)

This section must be read and understood before any changes are made.

### Why this is low-risk for data

We are **only adding nullable columns**. No existing data is modified, dropped, or renamed in Phase 1. The backfill in Phase 1 writes to newly-added `supplierClientId` columns; `vendorId` columns remain untouched as a fallback.

Phase 2 (code changes) is pure TypeScript; it has no DB footprint beyond what was added in Phase 1.

### Schema rollback (Phase 1)

If Phase 1 must be rolled back after migration ran:

```sql
-- purchaseOrderItems table
ALTER TABLE purchaseOrderItems DROP COLUMN supplier_client_id;
DROP INDEX IF EXISTS idx_poi_supplier_client_id ON purchaseOrderItems;

-- products table
ALTER TABLE products DROP COLUMN supplier_client_id;
DROP INDEX IF EXISTS idx_products_supplier_client_id ON products;

-- vendorNotes table (if clientId column was added)
ALTER TABLE vendorNotes DROP COLUMN client_id;
DROP INDEX IF EXISTS idx_vendor_notes_client_id ON vendorNotes;
```

Note: `purchaseOrders.supplier_client_id` and `lots.supplier_client_id` already exist — do NOT include them in rollback.

### Code rollback (Phase 2)

```bash
git revert HEAD
git push origin main
```

The `vendorId` columns remain in schema and DB throughout both phases, so a code revert restores full functionality immediately.

### Risk assessment

| Change                                      | Risk   | Reason                                                   |
| ------------------------------------------- | ------ | -------------------------------------------------------- |
| ADD COLUMN supplier_client_id (nullable)    | LOW    | Additive, non-breaking                                   |
| Backfill UPDATE statements                  | LOW    | Sets new column, does not touch vendorId                 |
| Code: prefer supplierClientId over vendorId | MEDIUM | Must verify all read paths; fallback to vendorId if NULL |
| Schema deprecation comments                 | LOW    | Comments only, no runtime effect                         |

---

## Pre-Work: Context Gathering

Before writing any code, read all relevant files and run all audit commands. Document findings at each gate.

### Step 0a: Verify TER-247 is complete

TER-247 must be merged and deployed before this task begins. Verify it:

```bash
# Check git log for TER-247 completion commit
git log --oneline --all | grep -i "TER-247\|ter-247\|247"

# Verify no remaining from(vendors) in new routers (excluding legacy files)
grep -rn "\.from(vendors)" /home/user/TERP/server/routers/ --include="*.ts" | grep -v "vendors\.ts\|adminSchemaPush\|audit\.ts"
```

GATE 0a: If `from(vendors)` queries appear in non-legacy routers, STOP. TER-247 is not complete. Do not proceed.

### Step 0b: Audit current column state for each target table

Run these commands to establish the exact current state of every table before touching anything:

```bash
# Which tables have supplierClientId already in schema?
grep -n "supplierClientId\|supplier_client_id" /home/user/TERP/drizzle/schema.ts | grep -v "//\|comment"

# Which tables have vendorId still in schema?
grep -n "vendorId\|vendor_id" /home/user/TERP/drizzle/schema.ts | grep -v "//\|suppliers\|comment\|brand\|legacyVendorId\|legacy_vendor"
```

GATE 0b: Before editing schema, document:

- Which tables already have `supplierClientId` (expected: `purchaseOrders`, `lots`, `payments`)
- Which tables need `supplierClientId` added (expected: `purchaseOrderItems`, `products`)
- Which tables need `clientId` added (expected: `vendorNotes`)
- Confirm `batches` does NOT need a column (supplier accessed via lot relationship)
- Exact line numbers for each target table definition in `drizzle/schema.ts`

### Step 0c: Read every target file before editing

Read these files in full before writing any code:

1. `drizzle/schema.ts` — relevant table definitions (see GATE 0b line numbers)
2. `server/autoMigrate.ts` — find the lots/purchaseOrders migration blocks to understand the exact pattern
3. `server/services/vendorMappingService.ts` — understand `getClientIdForVendor()` function signature
4. `scripts/backfill-supplier-client-ids.ts` — existing backfill script for lots; use as the template for the new one

```bash
# Confirm the backfill pattern used for lots (already-working reference)
grep -n "supplier_client_id\|legacy_vendor_id" /home/user/TERP/scripts/backfill-supplier-client-ids.ts
```

GATE 0c: Confirm you have read and understand the backfill pattern from the existing script before writing the new backfill script.

---

## Phase 1 — Schema Additions + Backfill

### Task 1: Add `supplierClientId` to `batches` in schema

**File**: `drizzle/schema.ts`

The `batches` table (around line 589) currently has NO `supplierClientId` column. Its `vendorId` column does not exist at all — batches track the vendor relationship through their parent `lots` table.

Before editing, re-read the exact current `batches` table definition:

```bash
grep -n "export const batches" /home/user/TERP/drizzle/schema.ts
```

Then read from that line for 90 lines to see the full table definition.

Confirmed finding: The `batches` table (around line 589–677) does NOT have a `vendorId` column and does NOT have a `supplierClientId` column. Supplier attribution flows through `batches.lotId -> lots.supplierClientId`.

**ACTION**: No schema change needed for `batches` itself. The supplier is found via the lot. Document this in your findings and skip to Task 2.

GATE 1: Paste output of:

```bash
grep -n "vendorId\|supplierClientId" /home/user/TERP/drizzle/schema.ts | grep -A0 "batches"
```

Expected: zero matches for batches (confirming no vendorId on batches, and the task spec's list was based on a count that includes the lot→batch relationship).

### Task 2: Add `supplierClientId` to `purchaseOrderItems` in schema

**File**: `drizzle/schema.ts`

The `purchaseOrderItems` table (around line 311) currently has NO `supplierClientId` column, even though its parent `purchaseOrders` already has one. Purchase order items inherit the supplier from the PO, so adding `supplierClientId` here is denormalized but useful for direct queries.

Before editing, read the current `purchaseOrderItems` definition:

```bash
grep -n "export const purchaseOrderItems" /home/user/TERP/drizzle/schema.ts
```

Read from that line for 45 lines to see the full definition, then make the following change.

**Add** after the `notes: text("notes"),` line and before `deletedAt`:

```typescript
// Supplier reference (canonical - uses clients table)
// Denormalized from parent PO for direct querying (TER-235)
supplierClientId: int("supplier_client_id").references(() => clients.id, {
  onDelete: "restrict",
}),

// Vendor reference (DEPRECATED - use supplierClientId instead)
// Retained for backward compatibility during migration
vendorId: int("vendorId"),
```

Also add the index to the `table =>` block:

```typescript
supplierClientIdIdx: index("idx_poi_supplier_client_id").on(table.supplierClientId),
```

**Acceptance Criteria**:

- [ ] `supplierClientId: int("supplier_client_id")` is present in `purchaseOrderItems`
- [ ] References `clients.id` with `onDelete: "restrict"`
- [ ] `vendorId` column added as nullable (for backfill target) if not already present
- [ ] Index added for `supplier_client_id`

GATE 2: Paste output of:

```bash
grep -n "supplierClientId\|supplier_client_id\|vendorId" /home/user/TERP/drizzle/schema.ts | grep -A0 -B0 "poi\|purchaseOrderItem"
```

### Task 3: Add `supplierClientId` to `products` in schema

**File**: `drizzle/schema.ts`

The `products` table (around line 420) currently has NO `vendorId` column and NO `supplierClientId` column. Add both columns to track the primary supplier for each product.

Before editing, read the exact current `products` table definition:

```bash
grep -n "export const products" /home/user/TERP/drizzle/schema.ts
```

Read 20 lines from that point to confirm current columns (id, brandId, strainId, nameCanonical, deletedAt, category, subcategory, uomSellable, description, createdAt, updatedAt).

**Add** after the `brandId` line:

```typescript
// Supplier reference (canonical - uses clients table)
// Primary supplier for this product (TER-235)
supplierClientId: int("supplier_client_id").references(() => clients.id, {
  onDelete: "set null",
}),

// Vendor reference (DEPRECATED - use supplierClientId instead)
// Added alongside supplierClientId for backward compatibility during migration
vendorId: int("vendorId"),
```

Add an index. The `products` table definition uses inline `mysqlTable("products", {...})` without a second argument for indexes. Add a second argument:

```typescript
export const products = mysqlTable(
  "products",
  {
    // ... existing columns ...
    supplierClientId: int("supplier_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    vendorId: int("vendorId"), // DEPRECATED - use supplierClientId
    // ... rest of columns ...
  },
  table => ({
    supplierClientIdIdx: index("idx_products_supplier_client_id").on(
      table.supplierClientId
    ),
  })
);
```

**Acceptance Criteria**:

- [ ] `supplierClientId: int("supplier_client_id")` is present in `products`
- [ ] References `clients.id` with `onDelete: "set null"` (products may outlive a supplier)
- [ ] `vendorId` has a deprecation comment
- [ ] Index added for `supplier_client_id`

GATE 3: Paste output of:

```bash
grep -n "supplierClientId\|supplier_client_id\|vendorId" /home/user/TERP/drizzle/schema.ts | grep -A0 -B0 "products"
```

### Task 4: Handle `vendorNotes` — Add `clientId` column

**File**: `drizzle/schema.ts`

The `vendorNotes` table (line 189) has `vendorId` pointing to `vendors.id`. The long-term replacement is a `client_notes` table or notes attached to the `supplierProfiles` table, but the prompt spec calls for adding `clientId` as the migration step (keeping `vendorNotes` table itself in place for now).

Before editing, read the exact current definition:

```bash
sed -n '185,205p' /home/user/TERP/drizzle/schema.ts
```

**Add** `clientId` column after `id`:

```typescript
export const vendorNotes = mysqlTable(
  "vendorNotes",
  {
    id: int("id").autoincrement().primaryKey(),
    // Canonical client reference (TER-235 - replaces vendorId)
    clientId: int("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    // DEPRECATED: points to vendors.id — use clientId instead
    vendorId: int("vendorId")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id),
    note: text("note").notNull(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_vendor_notes_client_id").on(table.clientId),
  })
);
```

Note: `vendorId` is kept as `.notNull()` for now because the backfill writes to `clientId` without removing the old constraint. The `.notNull()` is a legacy constraint from the old table — do not remove it yet.

**Acceptance Criteria**:

- [ ] `clientId: int("client_id")` is present in `vendorNotes`
- [ ] References `clients.id` with `onDelete: "cascade"`
- [ ] `clientId` is nullable (to allow gradual backfill; old rows still have `vendorId`)
- [ ] Index added for `client_id`
- [ ] `vendorId` retained with deprecation comment

GATE 4: Paste output of:

```bash
grep -n "clientId\|client_id\|vendorId" /home/user/TERP/drizzle/schema.ts | grep -A0 -B0 "vendorNotes"
```

### Task 5: Add autoMigrate blocks for new columns

**File**: `server/autoMigrate.ts`

Four new columns need autoMigrate blocks. Use the exact pattern from the existing `lots.supplier_client_id` migration (around line 1822). Read that section first:

```bash
sed -n '1820,1870p' /home/user/TERP/server/autoMigrate.ts
```

Find the end of the existing migrations section and add the following four blocks, one after another. Search for the `lots.supplier_client_id FK constraint` block end, then append after it.

#### Block A: purchaseOrderItems.supplier_client_id

```typescript
// Add purchaseOrderItems.supplier_client_id column (TER-235 vendor deprecation)
try {
  await db.execute(
    sql`ALTER TABLE purchaseOrderItems ADD COLUMN supplier_client_id INT NULL`
  );
  console.info("  ✅ Added supplier_client_id column to purchaseOrderItems");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  purchaseOrderItems.supplier_client_id already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "purchaseOrderItems.supplier_client_id migration failed"
    );
  }
}

try {
  await db.execute(
    sql`CREATE INDEX idx_poi_supplier_client_id ON purchaseOrderItems (supplier_client_id)`
  );
  console.info("  ✅ Added idx_poi_supplier_client_id index");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate")) {
    console.info("  ℹ️  idx_poi_supplier_client_id already exists");
  }
}
```

#### Block B: products.supplier_client_id

```typescript
// Add products.supplier_client_id column (TER-235 vendor deprecation)
try {
  await db.execute(
    sql`ALTER TABLE products ADD COLUMN supplier_client_id INT NULL`
  );
  console.info("  ✅ Added supplier_client_id column to products");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  products.supplier_client_id already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "products.supplier_client_id migration failed"
    );
  }
}

try {
  await db.execute(
    sql`CREATE INDEX idx_products_supplier_client_id ON products (supplier_client_id)`
  );
  console.info("  ✅ Added idx_products_supplier_client_id index");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate")) {
    console.info("  ℹ️  idx_products_supplier_client_id already exists");
  }
}
```

#### Block C: vendorNotes.client_id

```typescript
// Add vendorNotes.client_id column (TER-235 vendor deprecation)
try {
  await db.execute(sql`ALTER TABLE vendorNotes ADD COLUMN client_id INT NULL`);
  console.info("  ✅ Added client_id column to vendorNotes");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  vendorNotes.client_id already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "vendorNotes.client_id migration failed"
    );
  }
}

try {
  await db.execute(
    sql`CREATE INDEX idx_vendor_notes_client_id ON vendorNotes (client_id)`
  );
  console.info("  ✅ Added idx_vendor_notes_client_id index");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate")) {
    console.info("  ℹ️  idx_vendor_notes_client_id already exists");
  }
}
```

**Acceptance Criteria**:

- [ ] All three `ALTER TABLE ... ADD COLUMN` blocks present in `autoMigrate.ts`
- [ ] All three index creation blocks present
- [ ] All use `"Duplicate column"` check for idempotency
- [ ] All use `logger.error` (not just `console.warn`) on unexpected errors

GATE 5: Paste output of:

```bash
grep -n "supplier_client_id\|client_id" /home/user/TERP/server/autoMigrate.ts | grep -i "purchaseOrder\|products\|vendorNotes"
```

### Task 6: Write the backfill script

**File**: `scripts/backfill-ter235-supplier-client-ids.ts` (NEW FILE)

Create a new backfill script modeled on `scripts/backfill-supplier-client-ids.ts`. This script will:

1. Load the `supplierProfiles.legacyVendorId → clientId` mapping from the DB
2. For each table needing backfill, update `supplierClientId` (or `clientId` for vendorNotes) where the mapping exists
3. Report counts: total rows, updated rows, rows with no mapping found

The script must support `--dry-run` mode and require `--confirm-production` for real execution.

**Tables to backfill and their join logic**:

| Table                | Column to write      | Source column                      | Join path                                                                                             |
| -------------------- | -------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `purchaseOrderItems` | `supplier_client_id` | `vendorId` (from parent PO)        | `JOIN purchaseOrders po ON poi.purchaseOrderId = po.id`, then use `sp.legacy_vendor_id = po.vendorId` |
| `products`           | `supplier_client_id` | `vendorId` (newly added in Task 3) | Direct: `sp.legacy_vendor_id = products.vendorId` (only rows with vendorId set by other processes)    |
| `vendorNotes`        | `client_id`          | `vendorId`                         | Direct: `sp.legacy_vendor_id = vendorNotes.vendorId`                                                  |

**Script structure** (use this as the template):

```typescript
#!/usr/bin/env npx tsx
/**
 * TER-235: Backfill supplier_client_id columns
 *
 * Populates the new supplierClientId / clientId columns using the
 * supplierProfiles.legacyVendorId → clientId mapping.
 *
 * Usage:
 *   npx tsx scripts/backfill-ter235-supplier-client-ids.ts --dry-run
 *   npx tsx scripts/backfill-ter235-supplier-client-ids.ts --confirm-production
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

config({ path: ".env.production" });

const DATABASE_URL = process.env.DATABASE_URL ?? "";

interface VendorMapping {
  legacyVendorId: number;
  clientId: number;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirmProduction = args.includes("--confirm-production");

  if (!dryRun && !confirmProduction) {
    console.error("ERROR: Must specify --dry-run or --confirm-production");
    process.exit(1);
  }

  console.log("TER-235: Backfill supplier_client_id columns");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "PRODUCTION"}\n`);

  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Load vendor → client mapping
    const [rows] = (await connection.query(
      "SELECT legacy_vendor_id AS legacyVendorId, client_id AS clientId FROM supplier_profiles WHERE legacy_vendor_id IS NOT NULL"
    )) as [VendorMapping[], unknown];

    const mappingMap = new Map<number, number>(
      rows.map(r => [r.legacyVendorId, r.clientId])
    );
    console.log(`Loaded ${mappingMap.size} vendor-to-client mappings`);

    // --- Table 1: purchaseOrderItems ---
    await backfillPurchaseOrderItems(connection, mappingMap, dryRun);

    // --- Table 2: products ---
    await backfillProducts(connection, mappingMap, dryRun);

    // --- Table 3: vendorNotes ---
    await backfillVendorNotes(connection, mappingMap, dryRun);

    // --- Verification report ---
    await printVerificationReport(connection);

    console.log("\nBackfill complete.");
  } finally {
    await connection.end();
  }
}

// ... implement backfillPurchaseOrderItems, backfillProducts, backfillVendorNotes, printVerificationReport
```

Each backfill function must:

- SELECT all rows where the target column IS NULL and the source vendorId IS NOT NULL
- Iterate and apply the mapping
- COUNT and report: updated, no-mapping-found (warning), skipped (already set)

The `printVerificationReport` must run these queries and print the results:

```sql
-- purchaseOrderItems backfill coverage
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN supplier_client_id IS NOT NULL THEN 1 ELSE 0 END) AS with_supplier_client_id,
  SUM(CASE WHEN supplier_client_id IS NULL AND purchaseOrderId IN (
    SELECT id FROM purchaseOrders WHERE vendorId IS NOT NULL
  ) THEN 1 ELSE 0 END) AS still_missing
FROM purchaseOrderItems;

-- products backfill coverage
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN supplier_client_id IS NOT NULL THEN 1 ELSE 0 END) AS with_supplier_client_id,
  SUM(CASE WHEN supplier_client_id IS NULL AND vendorId IS NOT NULL THEN 1 ELSE 0 END) AS still_missing
FROM products;

-- vendorNotes backfill coverage
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END) AS with_client_id,
  SUM(CASE WHEN client_id IS NULL THEN 1 ELSE 0 END) AS still_missing
FROM vendorNotes WHERE deleted_at IS NULL;
```

**Acceptance Criteria**:

- [ ] Script file exists at `scripts/backfill-ter235-supplier-client-ids.ts`
- [ ] `--dry-run` mode reports without writing
- [ ] `--confirm-production` mode writes changes
- [ ] Missing-mapping rows are warned, not errored (some products may have no vendor)
- [ ] Verification report shows 0 `still_missing` rows for rows that had a mapped vendorId
- [ ] No `any` types in the script

GATE 6: Paste the dry-run output showing counts for each table:

```bash
npx tsx /home/user/TERP/scripts/backfill-ter235-supplier-client-ids.ts --dry-run 2>&1 | head -50
```

### Task 7: Run full verification (Phase 1)

GATE 7: Paste output of ALL four commands:

```bash
pnpm check 2>&1 | tail -30
```

```bash
pnpm lint 2>&1 | tail -20
```

```bash
pnpm test 2>&1 | tail -30
```

```bash
pnpm build 2>&1 | tail -20
```

All four must pass before proceeding to Phase 2.

---

## Phase 2 — Code Update + Deprecation Comments

Phase 2 begins only after Phase 1 passes all verification gates and is committed.

### Task 8: Audit all code that reads `vendorId` from target tables

Run these commands and document every file and line number that reads `vendorId` from the tables being migrated:

```bash
# purchaseOrderItems.vendorId usage
grep -rn "purchaseOrderItems\.vendorId\|poi\.vendorId\|item\.vendorId" /home/user/TERP/server/ --include="*.ts" | grep -v "test\|spec"

# products.vendorId usage
grep -rn "products\.vendorId\|product\.vendorId" /home/user/TERP/server/ --include="*.ts" | grep -v "test\|spec"

# vendorNotes.vendorId usage
grep -rn "vendorNotes\.vendorId\|note\.vendorId" /home/user/TERP/server/ --include="*.ts" | grep -v "test\|spec"

# Inserts that write vendorId to these tables
grep -rn "vendorId:" /home/user/TERP/server/ --include="*.ts" | grep -v "test\|spec\|//\|schema\|autoMigrate"
```

GATE 8: Before changing any code, document:

- Every file + line number that reads `vendorId` from the migrated tables
- Every file + line number that inserts a `vendorId` into the migrated tables
- Confirm none of these are in `drizzle/schema.ts` or `server/autoMigrate.ts` (those are Phase 1 files)

### Task 9: Update queries to prefer `supplierClientId`

For each code site found in GATE 8, update queries to prefer `supplierClientId` while keeping `vendorId` as a fallback. The canonical pattern:

```typescript
// BEFORE (legacy)
.where(eq(purchaseOrderItems.vendorId, input.vendorId))

// AFTER (preferred supplierClientId with legacy fallback)
.where(
  or(
    eq(purchaseOrderItems.supplierClientId, input.clientId),
    and(
      isNull(purchaseOrderItems.supplierClientId),
      eq(purchaseOrderItems.vendorId, input.vendorId)
    )
  )
)
```

For **insert** operations, write BOTH columns if the value is available:

```typescript
// BEFORE
await db.insert(purchaseOrderItems).values({
  vendorId: resolvedVendorId,
  // ...
});

// AFTER
await db.insert(purchaseOrderItems).values({
  supplierClientId: resolvedClientId ?? null,
  vendorId: resolvedVendorId, // Keep for backward compatibility
  // ...
});
```

For `vendorNotes`, use `clientId` instead of `supplierClientId`:

```typescript
// BEFORE
await db.insert(vendorNotes).values({
  vendorId: input.vendorId,
  // ...
});

// AFTER
await db.insert(vendorNotes).values({
  clientId: resolvedClientId ?? null,
  vendorId: input.vendorId, // Keep for backward compatibility
  // ...
});
```

**Acceptance Criteria**:

- [ ] All reads of `vendorId` from migrated tables use `or(supplierClientId eq, vendorId eq fallback)` pattern OR are deprecated with a comment
- [ ] All inserts write `supplierClientId` alongside `vendorId`
- [ ] `vendorNotes` inserts write `clientId` alongside `vendorId`
- [ ] No new code uses only `vendorId` without also writing `supplierClientId`

GATE 9: Paste output of:

```bash
grep -rn "vendorId:" /home/user/TERP/server/ --include="*.ts" | grep -v "test\|spec\|//\|schema\|autoMigrate\|vendorMappingService" | grep -v "supplierClientId\|clientId"
```

Expected: zero or very few matches, all of which should be in migration/backfill contexts that are explicitly excluding the canonical field.

### Task 10: Add deprecation comments to `vendorId` column definitions in schema

For each table in `drizzle/schema.ts` that still has `vendorId`, add a standardized deprecation comment:

```typescript
// DEPRECATED (TER-235): Use supplierClientId instead.
// This column will be dropped in Phase 3 (after TER-248 completes).
vendorId: int("vendorId").notNull(), // keep .notNull() until Phase 3 removes the constraint
```

Tables requiring this comment:

- `purchaseOrders.vendorId` (around line 238)
- `lots.vendorId` (around line 553)
- `purchaseOrderItems.vendorId` (newly added in Task 2)
- `products.vendorId` (around line 380)
- `vendorNotes.vendorId` (around line 191)
- `paymentHistory.vendorId` (around line 689) — note: `paymentHistory` already points to `clients.id` per the spec
- `bills.vendorId` (around line 1198) — note: this is accounting scope, add comment only, do not change the query logic

**Acceptance Criteria**:

- [ ] All `vendorId` columns in target tables have `// DEPRECATED (TER-235):` comment
- [ ] Comments accurately describe what to use instead

GATE 10: Paste output of:

```bash
grep -n "vendorId" /home/user/TERP/drizzle/schema.ts | grep -v "DEPRECATED\|//\|legacyVendorId\|vendorIdIdx\|idx_\|references\|.on(table" | grep -v "vendor_id\|vendorNotes\|harvest\|payable\|supply\|calendar\|return" | head -20
```

Expected: only schema column definitions remain without `DEPRECATED` comment if they are out of scope for this task (e.g., accounting tables that will be addressed separately).

### Task 11: Final verification suite (Phase 2)

GATE 11: Run ALL four commands and paste output:

```bash
pnpm check 2>&1 | tail -30
```

```bash
pnpm lint 2>&1 | tail -20
```

```bash
pnpm test 2>&1 | tail -30
```

```bash
pnpm build 2>&1 | tail -20
```

---

## QA Protocol (3-Lens for RED Mode)

### Lens 1: Forbidden Pattern Scan

```bash
# No new code queries vendors table (outside legacy routers)
grep -rn "from(vendors)\|\.from(vendors)" /home/user/TERP/server/routers/ --include="*.ts" | grep -v "vendors\.ts\|adminSchemaPush\|audit\.ts"

# No fallback user IDs introduced
grep -rn "ctx\.user?.id \|\| 1\|ctx\.user?.id ?? 1" /home/user/TERP/server/ --include="*.ts"

# No `any` types introduced in modified files
grep -rn ": any\b" /home/user/TERP/drizzle/schema.ts /home/user/TERP/server/autoMigrate.ts /home/user/TERP/scripts/backfill-ter235-supplier-client-ids.ts

# No hard deletes introduced
grep -rn "db\.delete(\|database\.delete(" /home/user/TERP/server/routers/ --include="*.ts" | grep -v "//.*db\.delete"

# Confirm new columns in schema
grep -n "supplier_client_id\|client_id" /home/user/TERP/drizzle/schema.ts | grep "purchaseOrderItems\|products\|vendorNotes"
```

Expected for `from(vendors)` in routers: zero matches outside legacy files.
Expected for fallback user IDs: zero matches.
Expected for `any` types: zero matches.
Expected for hard deletes: zero matches.

### Lens 2: Backfill Completeness Audit

After the migration has run (on a staging environment or after deployment), verify backfill coverage:

```bash
# Run dry-run again to confirm 0 still-missing rows
npx tsx /home/user/TERP/scripts/backfill-ter235-supplier-client-ids.ts --dry-run 2>&1
```

The verification report must show `still_missing: 0` for all three tables for any row that has a matching `legacyVendorId` in `supplier_profiles`.

If rows show `no mapping found` (vendor exists but no `supplierProfiles` entry), those are pre-existing data issues from incomplete Phase 1 migration and must be noted in the return report — they are NOT a blocker for this task.

### Lens 3: Schema Consistency Audit

Verify that the schema file and autoMigrate are internally consistent:

```bash
# Every column in schema has a corresponding autoMigrate block
grep -n "supplier_client_id\|client_id" /home/user/TERP/drizzle/schema.ts | grep "int(" | grep -v "//\|DEPRECATED" | sort

grep -n "supplier_client_id\|client_id" /home/user/TERP/server/autoMigrate.ts | grep "ALTER TABLE\|ADD COLUMN" | sort
```

For every `int("supplier_client_id")` or `int("client_id")` column added in Task 2–4, there must be a corresponding `ALTER TABLE ... ADD COLUMN` block in `autoMigrate.ts`.

Confirm the mapping:
| Table | Schema column | autoMigrate block present? |
|-------|--------------|--------------------------|
| purchaseOrderItems | supplier_client_id | Must be YES |
| products | supplier_client_id | Must be YES |
| vendorNotes | client_id | Must be YES |

---

## Fix Cycle

For each issue found by QA:

1. Fix the specific issue
2. Re-run the specific verification command that failed
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report to Evan with full error context.

---

## Rollback Procedure

### If Phase 1 schema migration causes production issues

```bash
# Immediate code rollback
git revert HEAD
git push origin main

# If columns need to be dropped (only if autoMigrate already ran):
# Connect to production DB and run:
# ALTER TABLE purchaseOrderItems DROP COLUMN supplier_client_id;
# ALTER TABLE products DROP COLUMN supplier_client_id;
# ALTER TABLE vendorNotes DROP COLUMN client_id;
```

Note: Column drops are SAFE because these are newly added nullable columns with no existing data dependency in production code. The old code paths use only `vendorId`, which is untouched.

### If Phase 2 code changes cause issues

```bash
# Revert code changes only (Phase 1 schema stays in place — it's additive)
git revert HEAD
git push origin main
```

The `vendorId` columns remain intact, so reverting the code immediately restores all functionality.

---

## Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

**Phase 1 — Schema + Backfill**

- [ ] `drizzle/schema.ts` — `purchaseOrderItems` has `supplierClientId` column with `references(() => clients.id)` and index
- [ ] `drizzle/schema.ts` — `products` has `supplierClientId` column with `references(() => clients.id)` and index
- [ ] `drizzle/schema.ts` — `vendorNotes` has `clientId` column with `references(() => clients.id)` and index
- [ ] `drizzle/schema.ts` — `batches` confirmed as NOT needing `supplierClientId` (supplier via lot) — documented
- [ ] `server/autoMigrate.ts` — `purchaseOrderItems.supplier_client_id` ALTER TABLE block added
- [ ] `server/autoMigrate.ts` — `products.supplier_client_id` ALTER TABLE block added
- [ ] `server/autoMigrate.ts` — `vendorNotes.client_id` ALTER TABLE block added
- [ ] `scripts/backfill-ter235-supplier-client-ids.ts` — script created and dry-run tested
- [ ] Backfill dry-run shows correct row counts and 0 unexpected errors
- [ ] `pnpm check` passes Phase 1 (paste output)
- [ ] `pnpm lint` passes Phase 1 (paste output)
- [ ] `pnpm test` passes Phase 1 (paste output)
- [ ] `pnpm build` passes Phase 1 (paste output)

**Phase 2 — Code Update + Deprecation**

- [ ] All reads of `vendorId` from migrated tables updated to prefer `supplierClientId`
- [ ] All inserts to migrated tables write both `supplierClientId` and `vendorId`
- [ ] `vendorNotes` inserts write both `clientId` and `vendorId`
- [ ] All `vendorId` columns in migrated tables have `// DEPRECATED (TER-235):` comment in schema
- [ ] Zero `from(vendors)` queries in non-legacy routers (excluding `vendors.ts`, `adminSchemaPush.ts`, `audit.ts`)
- [ ] Zero `any` types introduced
- [ ] Zero hard deletes introduced
- [ ] `pnpm check` passes Phase 2 (paste output)
- [ ] `pnpm lint` passes Phase 2 (paste output)
- [ ] `pnpm test` passes Phase 2 (paste output)
- [ ] `pnpm build` passes Phase 2 (paste output)

**Out of scope (note for next wave)**

- [ ] Dropping `vendorId` columns — deferred to Phase 3 (TER-248)
- [ ] Migrating `bills.vendorId` and `payments.vendorId` — accounting scope, separate task
- [ ] Migrating `vendorSupply.vendorId`, `vendorHarvestReminders.vendorId` — out of scope for this wave
- [ ] Dropping `vendorNotes` table and replacing with `supplierProfile.notes` — deferred to Phase 3

---

## RULES REPEATED — READ AGAIN

1. **NO PHANTOM VERIFICATION.** Show actual command output, not claims.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **TER-247 MUST BE COMPLETE FIRST.** Do not proceed without verifying GATE 0a.
4. **RED MODE.** These are additive schema migrations but they touch production tables. Read every file before touching it.
5. **SCOPE GUARD.** You will find other `vendorId` usages throughout the codebase. Do not fix them. Note them. Return.
6. **PHASE GATE.** Do not start Phase 2 until Phase 1 passes `pnpm check && pnpm lint && pnpm test && pnpm build`.
7. **NO DROPPING COLUMNS.** `vendorId` columns stay in place. This task adds and backfills only.
