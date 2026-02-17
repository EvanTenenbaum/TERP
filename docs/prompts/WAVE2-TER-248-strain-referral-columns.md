# TER-248: Add Strain + referral_settings Columns (Remove Graceful-Degradation Stubs)

**Classification**: High | **Mode**: RED | **Estimate**: 8h
**Linear**: TER-248 | **Wave**: 2 (schema migrations, needs approval)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails: STOP. Report the exact error.
4. **NO QA SKIPPING.** Run all QA lenses below.
5. **PROOF OF WORK.** At every 🔒 gate, paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Read every file in full before modifying it.
7. **RED MODE RULES.** This touches production schema. Do NOT proceed without confirming the rollback plan below.
8. **ONE THING AT A TIME.** Complete and verify each task before starting the next.
9. **DO NOT REMOVE AUTOMATE BLOCKS.** The existing `autoMigrate.ts` blocks for strains/products/client_needs columns must stay. This task ADDS `referral_settings` blocks and REMOVES code-side stubs only.

---

## Mission Brief

Nine columns are defined in `drizzle/schema.ts` but do not yet exist in the production database.
As a result, various server files use graceful-degradation stubs — projecting `NULL` for
`strainId` instead of actually joining the `strains` table.

### The 9 pending columns

**`strains` table** (autoMigrate blocks already exist, but production DB hasn't run them):

- `strains.parentStrainId` INT NULL
- `strains.baseStrainName` VARCHAR(255) NULL

**`products` table** (autoMigrate blocks already exist):

- `products.strainId` INT NULL

**`client_needs` table** (autoMigrate blocks already exist):

- `client_needs.strainId` INT NULL

**`referral_settings` table** (NO autoMigrate blocks exist yet):

- `referral_settings.client_tier` VARCHAR(50) NULL
- `referral_settings.credit_percentage` DECIMAL(5,2) NOT NULL DEFAULT 10.00
- `referral_settings.min_order_amount` DECIMAL(12,2) NULL DEFAULT 0
- `referral_settings.max_credit_amount` DECIMAL(12,2) NULL
- `referral_settings.credit_expiry_days` INT NULL

### The graceful-degradation stubs to remove

Once the DB columns exist, these stubs must be replaced with real Drizzle column references:

1. **`server/inventoryDb.ts`** — `safeProductSelect` object projects `strainId: sql\`NULL\``instead of`strainId: products.strainId` (used in 3 query sites)
2. **`server/productsDb.ts`** — 3 functions use `strainId: sql\`NULL\`.as("strainId")`and`strainName: sql\`NULL\`.as("strainName")`instead of real joins to`strains`
3. **`tests/integration/schema-verification.test.ts`** — `COLUMNS_PENDING_MIGRATION` array
   lists 9 column names that should be removed once columns exist

**Scope**: 3 server files + 1 test file + `server/autoMigrate.ts`

- `server/autoMigrate.ts` — add `referral_settings` column blocks
- `server/inventoryDb.ts` — replace `safeProductSelect` with real column refs
- `server/productsDb.ts` — replace NULL stubs with real joins to `strains`
- `tests/integration/schema-verification.test.ts` — remove 9 entries from `COLUMNS_PENDING_MIGRATION`

---

## Pre-Flight: Rollback Plan (DOCUMENT BEFORE TOUCHING ANYTHING)

**Schema rollback** (only `referral_settings` needs rollback — other columns already in autoMigrate):

```sql
ALTER TABLE referral_settings DROP COLUMN client_tier;
ALTER TABLE referral_settings DROP COLUMN credit_percentage;
ALTER TABLE referral_settings DROP COLUMN min_order_amount;
ALTER TABLE referral_settings DROP COLUMN max_credit_amount;
ALTER TABLE referral_settings DROP COLUMN credit_expiry_days;
```

Note: These are additive changes to an existing table. Rollback is safe and data-preserving.

**Code rollback**:

```bash
git checkout -- server/inventoryDb.ts server/productsDb.ts tests/integration/schema-verification.test.ts server/autoMigrate.ts
```

**Risk**: MEDIUM. The code stubs are defensive patterns that hide the fact that `strainId`
queries silently return NULL. Removing them makes the code trusting of DB state. If the
migration hasn't run yet when the code lands, the app will get runtime errors on queries
that join `strains`. The autoMigrate blocks MUST run before or simultaneously with the
code stub removal.

---

## Pre-Work: Gather Context

Before writing any code:

1. Read `server/inventoryDb.ts` lines 1-60 to understand `safeProductSelect`
2. Read `server/productsDb.ts` lines 90-270 to understand the 3 stub functions
3. Read `tests/integration/schema-verification.test.ts` lines 44-58 to see `COLUMNS_PENDING_MIGRATION`
4. Read `server/autoMigrate.ts` lines 350-530 to understand the existing strains blocks
5. Search for all `safeProductSelect` usages:

```bash
grep -n "safeProductSelect" server/inventoryDb.ts
```

6. Search for all `strainId.*NULL\|NULL.*strainId` stubs:

```bash
grep -n "strainId.*NULL\|NULL.*strainId\|strainName.*NULL\|NULL.*strainName" server/productsDb.ts server/inventoryDb.ts
```

🔒 **GATE 0**: Before editing anything, document:

- How many places use `safeProductSelect` in `inventoryDb.ts`?
- What are the exact line numbers of the 3 NULL stubs in `productsDb.ts`?
- Do the `referral_settings` columns already have autoMigrate blocks? (Expected: NO)

---

## Task 1: Add referral_settings Column Blocks to autoMigrate.ts

**What**: Add `ALTER TABLE referral_settings ADD COLUMN ...` blocks for the 5 columns
that are defined in `drizzle/schema.ts` but have no migration yet.

**File**: `server/autoMigrate.ts`

**Where to insert**: At the end of the migration function, just before the `const duration = Date.now() - startTime;` line (currently around line 1882).

**Add the following block**:

```typescript
// ========================================================================
// REFERRAL_SETTINGS TABLE — Add pending columns (TER-248)
// Columns defined in drizzle/schema.ts but not yet in production DB.
// ========================================================================

// Add referral_settings.client_tier column
try {
  await db.execute(
    sql`ALTER TABLE referral_settings ADD COLUMN client_tier VARCHAR(50) NULL`
  );
  console.info("  ✅ Added client_tier column to referral_settings");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  referral_settings.client_tier already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "referral_settings.client_tier migration failed"
    );
  }
}

// Add referral_settings.credit_percentage column
try {
  await db.execute(
    sql`ALTER TABLE referral_settings ADD COLUMN credit_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00`
  );
  console.info("  ✅ Added credit_percentage column to referral_settings");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  referral_settings.credit_percentage already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "referral_settings.credit_percentage migration failed"
    );
  }
}

// Add referral_settings.min_order_amount column
try {
  await db.execute(
    sql`ALTER TABLE referral_settings ADD COLUMN min_order_amount DECIMAL(12,2) NULL DEFAULT 0`
  );
  console.info("  ✅ Added min_order_amount column to referral_settings");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  referral_settings.min_order_amount already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "referral_settings.min_order_amount migration failed"
    );
  }
}

// Add referral_settings.max_credit_amount column
try {
  await db.execute(
    sql`ALTER TABLE referral_settings ADD COLUMN max_credit_amount DECIMAL(12,2) NULL`
  );
  console.info("  ✅ Added max_credit_amount column to referral_settings");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  referral_settings.max_credit_amount already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "referral_settings.max_credit_amount migration failed"
    );
  }
}

// Add referral_settings.credit_expiry_days column
try {
  await db.execute(
    sql`ALTER TABLE referral_settings ADD COLUMN credit_expiry_days INT NULL`
  );
  console.info("  ✅ Added credit_expiry_days column to referral_settings");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  referral_settings.credit_expiry_days already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "referral_settings.credit_expiry_days migration failed"
    );
  }
}

// Add unique index on referral_settings.client_tier (matches Drizzle schema tierIdx)
try {
  await db.execute(
    sql`CREATE UNIQUE INDEX unique_tier ON referral_settings(client_tier)`
  );
  console.info("  ✅ Added unique_tier index on referral_settings.client_tier");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
    console.info("  ℹ️  unique_tier index already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "referral_settings unique_tier index migration failed"
    );
  }
}
```

**Acceptance Criteria**:

- [ ] All 5 column blocks are present
- [ ] Unique index block is present
- [ ] Each block uses `"Duplicate column"` / `"Duplicate"` / `"already exists"` for idempotency
- [ ] Each failure path calls `logger.error` (not just `console.info`)
- [ ] Blocks are inserted BEFORE `const duration = Date.now() - startTime;`

**Verification Command**:

```bash
grep -n "referral_settings" server/autoMigrate.ts
```

Expected: 10+ matches — one per column/index block.

---

## Task 2: Replace safeProductSelect in inventoryDb.ts

**What**: Replace the `safeProductSelect` stub object with one that uses the real
`products.strainId` column reference.

**File**: `server/inventoryDb.ts`

### 2a: Find and understand safeProductSelect

```bash
grep -n "safeProductSelect\|strainId.*NULL\|NULL.*strainId" server/inventoryDb.ts
```

The current definition (around lines 38-50) is:

```typescript
const safeProductSelect = {
  id: products.id,
  brandId: products.brandId,
  strainId: sql<number | null>`NULL`, // ← STUB: remove this
  nameCanonical: products.nameCanonical,
  deletedAt: products.deletedAt,
  category: products.category,
  subcategory: products.subcategory,
  uomSellable: products.uomSellable,
  description: products.description,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};
```

### 2b: Replace the stub

Change the `strainId` line from:

```typescript
  strainId: sql<number | null>`NULL`,
```

to:

```typescript
  strainId: products.strainId,
```

### 2c: Check if the `sql` import is still needed

After this change, check if `sql` is used elsewhere in `inventoryDb.ts`. If `sql` is
used in other places (it almost certainly is — this is a large file), the import stays.
Do NOT remove the import unless it's unused everywhere.

```bash
grep -n "\bsql\b" server/inventoryDb.ts | wc -l
```

**Acceptance Criteria**:

- [ ] `safeProductSelect.strainId` uses `products.strainId` (real column ref)
- [ ] No `sql\`NULL\``for strainId remains in`inventoryDb.ts`
- [ ] All 3 query sites that use `safeProductSelect` still compile correctly (TypeScript check)

🔒 **GATE 1**: Paste output of:

```bash
grep -n "strainId.*NULL\|NULL.*strainId\|safeProductSelect" server/inventoryDb.ts
```

Expected: `safeProductSelect` mentions for the definition and usage sites, but **zero** `NULL` stubs for strainId.

---

## Task 3: Replace NULL Stubs in productsDb.ts

**What**: The 3 public functions (`getProducts`, `getProductCount`, `getProductById`) in
`server/productsDb.ts` have SCHEMA-015 stubs that silently ignore `strainId` filtering
and project `NULL`. Replace these with real joins to the `strains` table.

**File**: `server/productsDb.ts`

### 3a: Identify all 3 stub sites

```bash
grep -n "strainId.*NULL\|NULL.*strainId\|strainName.*NULL\|NULL.*strainName\|SCHEMA-015" server/productsDb.ts
```

Expected: Multiple matches across 3 functions.

### 3b: Fix `getProducts` function

**Remove** the SCHEMA-015 comment block and `if (strainId) { logger.warn... }` guard.
**Replace** with a real filter condition:

```typescript
if (strainId) {
  baseConditions.push(eq(products.strainId, strainId));
}
```

**In the SELECT**, replace the NULL stubs with real joins:

```typescript
    // Before: strainId: sql<number | null>`NULL`.as("strainId"),
    // After:
    strainId: products.strainId,
    // Before: strainName: sql<string | null>`NULL`.as("strainName"),
    // After:
    strainName: strains.name,
```

**In the query**, add a `leftJoin` to `strains`:

```typescript
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(strains, eq(products.strainId, strains.id))   // ← ADD THIS
```

**Remove the try-catch fallback** in `getProducts` that was there purely for schema drift.
The fallback query also has NULL stubs — remove the entire fallback block. If there is
no schema error to catch anymore, the try-catch structure can simplify to a direct query.

**Check that `strains` is imported** from `../../drizzle/schema`. If not, add it.

### 3c: Fix `getProductCount` function

**Remove** the SCHEMA-015 comment block and the `if (strainId) { logger.warn... }` guard.
**Replace** with a real filter condition:

```typescript
if (strainId) {
  baseConditions.push(eq(products.strainId, strainId));
}
```

The count query only needs `from(products)` with conditions — it does not need a join
to `strains` unless count is filtered by strain. Since the filter is on `products.strainId`
(a column on `products`), no join is needed.

### 3d: Fix `getProductById` function

**Remove** the SCHEMA-015 comment block.
**Replace** the NULL stubs with real joins:

```typescript
    // Before:
    strainId: sql<number | null>`NULL`.as("strainId"),
    strainName: sql<string | null>`NULL`.as("strainName"),
    // After:
    strainId: products.strainId,
    strainName: strains.name,
```

**Add a `leftJoin` to `strains`**:

```typescript
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(strains, eq(products.strainId, strains.id))   // ← ADD THIS
```

### 3e: Verify imports

```bash
grep -n "^import\|strains" server/productsDb.ts | head -20
```

Ensure `strains` is imported from `../../drizzle/schema`.

**Acceptance Criteria**:

- [ ] Zero `sql\`NULL\`.as("strainId")`occurrences remain in`productsDb.ts`
- [ ] Zero `sql\`NULL\`.as("strainName")`occurrences remain in`productsDb.ts`
- [ ] Zero SCHEMA-015 comments remain
- [ ] `getProducts` applies real `strainId` filter when provided
- [ ] `getProducts` and `getProductById` join `strains` and return `strainName`
- [ ] `getProductCount` applies real `strainId` filter when provided
- [ ] `strains` is imported at the top of `productsDb.ts`

🔒 **GATE 2**: Paste output of:

```bash
grep -n "NULL.*strain\|strain.*NULL\|SCHEMA-015" server/productsDb.ts
```

Expected: Zero matches.

---

## Task 4: Remove Entries from COLUMNS_PENDING_MIGRATION

**What**: Remove the 9 column names from `COLUMNS_PENDING_MIGRATION` in
`tests/integration/schema-verification.test.ts`. Once the DB columns exist, the
schema-verification tests should PASS (not skip) for these columns.

**File**: `tests/integration/schema-verification.test.ts`

**Current state** (lines 45-58):

```typescript
const COLUMNS_PENDING_MIGRATION: string[] = [
  // strainId columns - pending migration (PR #351 workaround)
  "products.strainId",
  "client_needs.strainId",
  "strains.parentStrainId",
  "strains.baseStrainName",
  // referral_settings columns - defined in Drizzle schema but drizzle-kit push
  // may not create them in CI test DB. Pending production migration.
  "referral_settings.client_tier",
  "referral_settings.credit_percentage",
  "referral_settings.min_order_amount",
  "referral_settings.max_credit_amount",
  "referral_settings.credit_expiry_days",
];
```

**After**:

```typescript
const COLUMNS_PENDING_MIGRATION: string[] = [
  // All previously-pending columns have been migrated (TER-248)
];
```

Or simply an empty array:

```typescript
const COLUMNS_PENDING_MIGRATION: string[] = [];
```

**Acceptance Criteria**:

- [ ] `COLUMNS_PENDING_MIGRATION` is empty (or contains only a comment)
- [ ] The 9 column names are gone
- [ ] The comment block documenting the array purpose is preserved

**Verification Command**:

```bash
grep -n "PENDING_MIGRATION\|products.strainId\|strains.parentStrainId\|referral_settings" tests/integration/schema-verification.test.ts
```

Expected: No column names remain in the array.

---

## Task 5: Check for Any Other NULL Stubs

After fixing the main files, search the entire server for any remaining stubs:

```bash
grep -rn "strainId.*sql.*NULL\|sql.*NULL.*strainId" server/ --include="*.ts"
```

```bash
grep -rn "strainName.*sql.*NULL\|sql.*NULL.*strainName" server/ --include="*.ts"
```

If any other files have stubs, document them. Only fix them if they are in the **scope
of this task** (files directly related to TER-248). Document any remaining stubs in
the notes section — they may belong to a different task.

---

## Task 6: Full Verification Suite

🔒 **GATE 3**: Run ALL of these and paste output:

```bash
pnpm check 2>&1 | tail -30
```

```bash
pnpm lint 2>&1 | tail -20
```

```bash
pnpm test 2>&1 | tail -40
```

```bash
pnpm build 2>&1 | tail -20
```

All four must pass before the QA protocol.

**Known test outcome**: The `pnpm test` run will now attempt schema-verification tests
against the test DB. The previously-skipped columns will run. If the test DB does NOT
have the migration applied, these tests will FAIL. This is expected and correct behavior
— it means the migration needs to run. Document the outcome.

---

## QA Protocol (3-Lens for RED Mode)

### Lens 1: Stub Elimination Audit

```bash
# No NULL stubs for strainId remain
grep -rn "strainId.*sql.*NULL\|sql.*NULL.*strainId" server/ --include="*.ts"

# No NULL stubs for strainName remain
grep -rn "strainName.*sql.*NULL\|sql.*NULL.*strainName" server/ --include="*.ts"

# No SCHEMA-015 comments remain
grep -rn "SCHEMA-015" server/ --include="*.ts"

# COLUMNS_PENDING_MIGRATION is empty
grep -n "PENDING_MIGRATION" tests/integration/schema-verification.test.ts

# autoMigrate has referral_settings blocks
grep -n "referral_settings" server/autoMigrate.ts | wc -l
```

Expected for stubs: **zero matches**. Expected for autoMigrate: **10+ lines**.

### Lens 2: Type Safety Check

Verify that removing the stubs does not break TypeScript type compatibility:

```bash
pnpm check 2>&1 | grep -i "error\|strainId\|strainName\|productsDb\|inventoryDb"
```

The `strainId` column in `products` is `INT NULL` in the schema, so `products.strainId`
has type `number | null`. This matches the `sql<number | null>\`NULL\`` type that was
being projected before. TypeScript should accept this cleanly.

### Lens 3: Data Flow Impact Analysis

Verify the impact of enabling real `strainId` joins:

| Call Site                  | Before (stub)                            | After (real)                          | Impact                                     |
| -------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------------ |
| `getProducts`              | Returns `strainId: null`, ignores filter | Returns real strainId, applies filter | Catalog may now filter by strain correctly |
| `getProductById`           | Returns `strainId: null`, no strain name | Returns real strainId + strain name   | Product detail now shows strain            |
| `getProductCount`          | Ignores strainId filter                  | Applies filter                        | Count may differ when filtering by strain  |
| `inventoryDb` select sites | strainId always null                     | Real strainId value                   | Inventory records now carry strainId       |

For each change, verify that no downstream consumer DEPENDS on `strainId` being null.

```bash
grep -rn "strainId.*null\|strainId === null\|!.*strainId" client/src/ --include="*.tsx" --include="*.ts" | head -20
```

This confirms the frontend is handling nullable strainId correctly already.

---

## Fix Cycle

For each issue found by QA:

1. Fix the issue
2. Re-run the specific verification that failed
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report.

---

## Rollback Procedure

**Immediate code rollback**:

```bash
git revert HEAD
git push origin main
```

**DB rollback** (only for referral_settings — other columns may have existed for weeks):

```sql
ALTER TABLE referral_settings DROP COLUMN client_tier;
ALTER TABLE referral_settings DROP COLUMN credit_percentage;
ALTER TABLE referral_settings DROP COLUMN min_order_amount;
ALTER TABLE referral_settings DROP COLUMN max_credit_amount;
ALTER TABLE referral_settings DROP COLUMN credit_expiry_days;
DROP INDEX unique_tier ON referral_settings;
```

**Note**: Rolling back the strains/products/client_needs columns would be destructive
if any records have `strainId` values set. Do NOT roll back those columns.

---

## ✅ Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

- [ ] `server/autoMigrate.ts` — 5 `referral_settings` column blocks added
- [ ] `server/autoMigrate.ts` — unique index block for `referral_settings.client_tier` added
- [ ] `server/inventoryDb.ts` — `safeProductSelect.strainId` uses `products.strainId` (not `sql\`NULL\``)
- [ ] `server/inventoryDb.ts` — zero `sql\`NULL\`` stubs for strainId remain
- [ ] `server/productsDb.ts` — `getProducts` applies real strainId filter and joins strains
- [ ] `server/productsDb.ts` — `getProductCount` applies real strainId filter
- [ ] `server/productsDb.ts` — `getProductById` joins strains and returns real strainName
- [ ] `server/productsDb.ts` — zero SCHEMA-015 comments remain
- [ ] `server/productsDb.ts` — zero `sql\`NULL\`` stubs for strainId/strainName remain
- [ ] `tests/integration/schema-verification.test.ts` — `COLUMNS_PENDING_MIGRATION` is empty
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm lint` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] No `any` types introduced
- [ ] No TODO/FIXME/HACK comments introduced
- [ ] Rollback plan documented above is executable

---

## RULES REPEATED — READ AGAIN

1. **NO PHANTOM VERIFICATION.** Show actual command output.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **READ FILES BEFORE EDITING.** The stubs are subtle — misidentifying them will break things.
4. **RED MODE.** This is a schema migration. The autoMigrate blocks must be correct.
5. **SCOPE GUARD.** Only `server/autoMigrate.ts`, `server/inventoryDb.ts`, `server/productsDb.ts`, and `tests/integration/schema-verification.test.ts`.
6. **DO NOT REMOVE** the existing strains/products/client_needs autoMigrate blocks — those are needed for any deployments that haven't run them yet.
