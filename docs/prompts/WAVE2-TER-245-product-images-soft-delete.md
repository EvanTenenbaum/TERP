# TER-245: Add deletedAt to product_images + Soft Delete Photography

**Classification**: High | **Mode**: RED | **Estimate**: 4h
**Linear**: TER-245 | **Wave**: 2 (schema migrations, needs approval)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with 🔒, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.
7. **RED MODE RULES.** This is a database schema migration. It touches production data structures. Do NOT proceed without confirming the rollback plan is documented below.
8. **ONE THING AT A TIME.** Complete and verify each task before starting the next.
9. **NEVER USE `db.delete(`.** The TERP convention is soft deletes with `deletedAt`. A hard `db.delete(` is CI-blocked.

---

## Mission Brief

The `product_images` table has NO `deleted_at` column. When the photography router calls
`db.delete(productImages)...`, it performs a **hard delete** — violating TERP's soft-delete
convention and leaving no audit trail.

This task has two parts:

1. **Schema**: Add `deleted_at TIMESTAMP NULL` to the `product_images` table (both in
   `drizzle/schema.ts` and via `autoMigrate.ts`).
2. **Code**: Replace all hard `db.delete(productImages)` calls in `server/routers/photography.ts`
   with soft-delete (`UPDATE ... SET deleted_at = NOW()`). Update all read queries to
   exclude soft-deleted rows.

**Scope**: Two files only.

- `drizzle/schema.ts` — add `deletedAt` column to `productImages` table definition
- `server/routers/photography.ts` — replace hard deletes with soft deletes; filter `deletedAt IS NULL` in reads
- `server/autoMigrate.ts` — add `ALTER TABLE` block for `deleted_at` column

---

## Pre-Flight: Rollback Plan (DOCUMENT BEFORE TOUCHING ANYTHING)

The rollback for this task is straightforward because we are only ADDING a nullable column
and changing TypeScript code. No existing data is modified.

**Schema rollback**:

```sql
ALTER TABLE product_images DROP COLUMN deleted_at;
```

**Code rollback**:

```bash
git checkout -- drizzle/schema.ts server/routers/photography.ts server/autoMigrate.ts
```

**Risk level**: LOW for schema (nullable column add, no data loss).
MEDIUM for code (changing delete behavior — must verify all read paths filter correctly).

---

## Pre-Work: Gather Context

Before writing any code:

1. Read the full photography router: `server/routers/photography.ts`
2. Read the `productImages` table definition in `drizzle/schema.ts` (search for `product_images`)
3. Read the `autoMigrate.ts` section that creates the `product_images` table (search for `PRODUCT_IMAGES TABLE`)
4. Run the audit command to find ALL hard-delete calls on `productImages`:

```bash
grep -n "db.delete\|database.delete" server/routers/photography.ts
```

🔒 **GATE 0**: Before editing anything, document:

- How many hard `db.delete(productImages)` calls exist and on what lines?
- What is the current `productImages` schema definition (what columns exist)?
- Does `autoMigrate.ts` already have a `deleted_at` block for `product_images`?

---

## Task 1: Add `deletedAt` Column to Schema

**What**: Add `deletedAt: timestamp("deleted_at")` to the `productImages` table definition in `drizzle/schema.ts`.

**File**: `drizzle/schema.ts`

**Find** the `productImages` table definition (around line 6770). It currently ends with:

```typescript
  uploadedAt: timestamp("uploaded_at").defaultNow(),
```

**Add** the `deletedAt` column after `uploadedAt`:

```typescript
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
```

**Acceptance Criteria**:

- [ ] `deletedAt: timestamp("deleted_at")` is present in the `productImages` table definition
- [ ] The column is nullable (no `.notNull()`)
- [ ] The column uses `"deleted_at"` (snake_case DB name — this is critical for mysqlEnum naming alignment)
- [ ] The inferred types `ProductImage` and `InsertProductImage` are updated automatically (they use `$inferSelect`/`$inferInsert`, so no manual change needed)

**Verification Command**:

```bash
grep -n "deletedAt\|deleted_at" drizzle/schema.ts | grep -A2 -B2 "product_images" | head -20
```

---

## Task 2: Add `deleted_at` Migration to autoMigrate.ts

**What**: Add an `ALTER TABLE` block so the column is created on existing deployments.

**File**: `server/autoMigrate.ts`

**Find** the `PRODUCT_IMAGES TABLE` section (search for `"Created product_images table"`). After that block, add a new block following the existing pattern:

```typescript
// Add deleted_at column to product_images table (TER-245 soft delete)
try {
  await db.execute(
    sql`ALTER TABLE product_images ADD COLUMN deleted_at TIMESTAMP NULL`
  );
  console.info("  ✅ Added deleted_at column to product_images");
} catch (error) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (errMsg.includes("Duplicate column")) {
    console.info("  ℹ️  product_images.deleted_at already exists");
  } else {
    logger.error(
      { error: errMsg, fullError: error },
      "product_images.deleted_at migration failed"
    );
  }
}
```

**Acceptance Criteria**:

- [ ] Block appears immediately after the `CREATE TABLE IF NOT EXISTS product_images` block
- [ ] Uses `"Duplicate column"` to detect idempotency (matches existing pattern in file)
- [ ] Logs an error (not just a warning) on unexpected failures

**Verification Command**:

```bash
grep -n "product_images.*deleted_at\|deleted_at.*product_images" server/autoMigrate.ts
```

---

## Task 3: Replace Hard Deletes with Soft Deletes in photography.ts

**What**: Find every `db.delete(productImages)` and `database.delete(productImages)` call
and replace them with a soft delete (`UPDATE ... SET deleted_at = NOW()`).

**File**: `server/routers/photography.ts`

### 3a: Find all hard delete sites

```bash
grep -n "\.delete(" server/routers/photography.ts
```

Expected: Two sites — `delete` procedure (line ~599) and `deletePhoto` procedure (line ~1327).

### 3b: Replace `delete` procedure (hard delete in `.delete` mutation)

**Current code** (around line 599):

```typescript
await db.delete(productImages).where(eq(productImages.id, input.imageId));
```

**Replacement**:

```typescript
await db
  .update(productImages)
  .set({ deletedAt: new Date() })
  .where(eq(productImages.id, input.imageId));
```

### 3c: Replace `deletePhoto` procedure (hard delete in `.deletePhoto` mutation)

**Current code** (around line 1327):

```typescript
await database.delete(productImages).where(eq(productImages.id, input.photoId));
```

**Replacement**:

```typescript
await database
  .update(productImages)
  .set({ deletedAt: new Date() })
  .where(eq(productImages.id, input.photoId));
```

**Acceptance Criteria**:

- [ ] Zero `db.delete(productImages)` calls remain in `photography.ts`
- [ ] Zero `database.delete(productImages)` calls remain in `photography.ts`
- [ ] Both replacement `update` calls set `deletedAt: new Date()`

🔒 **GATE 1**: Paste output of:

```bash
grep -n "\.delete(" server/routers/photography.ts
```

Expected: Zero matches for `productImages` deletes. Only non-`productImages` deletes are acceptable (there should be none — this is the only table deleted in this file).

---

## Task 4: Filter Soft-Deleted Rows from All Read Queries

**What**: Every query that reads from `productImages` must now exclude rows where
`deleted_at IS NOT NULL`. This is the most important step — missing a filter means
deleted photos reappear.

**File**: `server/routers/photography.ts`

### 4a: Audit all read sites

```bash
grep -n "from(productImages)\|\.from(productImages)" server/routers/photography.ts
```

Also check queries where `productImages` is joined:

```bash
grep -n "productImages," server/routers/photography.ts
```

### 4b: For each query reading from productImages directly

Add `isNull(productImages.deletedAt)` to the `where` clause. The `isNull` import already exists in the file.

Key procedures to update (verify against actual line numbers after reading the file):

- `getBatchImages` — queries `from(productImages).where(eq(productImages.batchId, ...))`
- `getProductImages` — queries `from(productImages).where(eq(productImages.productId, ...))`
- `update` procedure — selects existing image before updating
- `delete` procedure — selects existing image before soft-deleting
- `markComplete` — selects `from(productImages).where(eq(productImages.batchId, ...))`
- `completeSession` — selects `from(productImages).where(eq(productImages.batchId, ...))`
- `uploadPhoto` — queries existing photos for sort order
- `deletePhoto` — selects photo before deleting
- `reorder` — selects images to validate; must exclude deleted ones

### 4c: For each query where productImages is JOINED

The join condition already uses `visibleImageStatusWhere`. Extend those conditions to also
exclude `deletedAt IS NOT NULL`, OR add `isNull(productImages.deletedAt)` to the overall
`WHERE` clause.

For example, in `getBatchesNeedingPhotos`, the `leftJoin` on `productImages` uses
`and(eq(batches.id, productImages.batchId), visibleImageStatusWhere)`. The join condition
should become:

```typescript
and(
  eq(batches.id, productImages.batchId),
  visibleImageStatusWhere,
  isNull(productImages.deletedAt)
);
```

Apply the same change to `getQueue`, `getStats`, and `getAwaitingPhotography`.

### 4d: Update `ensureExactlyOneVisiblePrimaryForGroup`

This helper function queries visible images. It currently uses `visibleImageStatusWhere`.
Add `isNull(productImages.deletedAt)` to its `where` clause so deleted images are not
considered when selecting the new primary.

**Acceptance Criteria**:

- [ ] Every direct read from `productImages` has `isNull(productImages.deletedAt)` in its filter
- [ ] Every join involving `productImages` excludes soft-deleted rows
- [ ] `ensureExactlyOneVisiblePrimaryForGroup` excludes soft-deleted rows

🔒 **GATE 2**: Run the following and verify zero unfiltered reads remain:

```bash
grep -n "from(productImages)\|productImages)" server/routers/photography.ts | grep -v "deletedAt\|deleted_at"
```

All matches should either have a corresponding `isNull(productImages.deletedAt)` in the
same query block, or be a write (`insert`, `update`) rather than a read.

---

## Task 5: Update Schema Verification Test

**What**: The `COLUMNS_PENDING_MIGRATION` list in `tests/integration/schema-verification.test.ts`
does NOT currently list `product_images.deleted_at` as pending (because the column doesn't
exist yet in the test DB). After running the migration, it SHOULD be present and passing.
No change needed to the test file for this task — but verify the logic is correct.

**Verification Command**:

```bash
grep -n "product_images" tests/integration/schema-verification.test.ts
```

Expected: No mention (the column is not in any pending list, and after migration it will pass automatically).

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
pnpm test 2>&1 | tail -30
```

```bash
pnpm build 2>&1 | tail -20
```

All four must pass before proceeding to the QA protocol.

---

## QA Protocol (3-Lens for RED Mode)

### Lens 1: Forbidden Pattern Scan

```bash
# No hard deletes on productImages remain
grep -n "db\.delete\|database\.delete" server/routers/photography.ts

# No `any` types introduced
grep -n ": any\b" server/routers/photography.ts

# Confirm deletedAt column in schema
grep -n "deletedAt.*timestamp\|timestamp.*deleted_at" drizzle/schema.ts | grep -i "product_image"

# Confirm autoMigrate block added
grep -n "product_images.*deleted_at\|deleted_at.*product_images" server/autoMigrate.ts
```

Expected for hard deletes: **zero matches**.

### Lens 2: Read Path Audit (Critical)

Trace every read of `productImages` and verify `isNull(productImages.deletedAt)` is applied:

| Procedure                                | Where Filter                               | Expected `deletedAt` Guard          |
| ---------------------------------------- | ------------------------------------------ | ----------------------------------- |
| `getBatchImages`                         | `where(eq(batchId, ...))`                  | + `isNull(productImages.deletedAt)` |
| `getProductImages`                       | `where(eq(productId, ...))`                | + `isNull(productImages.deletedAt)` |
| `update` (lookup)                        | `where(eq(id, imageId))`                   | + `isNull(productImages.deletedAt)` |
| `delete` (lookup)                        | `where(eq(id, imageId))`                   | + `isNull(productImages.deletedAt)` |
| `markComplete` (lookup)                  | `where(eq(batchId, ...))`                  | + `isNull(productImages.deletedAt)` |
| `completeSession` (lookup)               | `where(eq(batchId, ...))`                  | + `isNull(productImages.deletedAt)` |
| `uploadPhoto` (sort order)               | `where(eq(batchId, ...))`                  | + `isNull(productImages.deletedAt)` |
| `deletePhoto` (lookup)                   | `where(eq(id, photoId))`                   | + `isNull(productImages.deletedAt)` |
| `reorder` (validate)                     | `IN (imageIds)`                            | + `isNull(productImages.deletedAt)` |
| `ensureExactlyOneVisiblePrimaryForGroup` | `and(groupWhere, visibleImageStatusWhere)` | + `isNull(productImages.deletedAt)` |
| `getBatchesNeedingPhotos` join           | join condition                             | + `isNull(productImages.deletedAt)` |
| `getQueue` join                          | join condition                             | + `isNull(productImages.deletedAt)` |
| `getStats` join                          | join condition                             | + `isNull(productImages.deletedAt)` |
| `getAwaitingPhotography` join            | join condition                             | + `isNull(productImages.deletedAt)` |

Manually verify each row in the table against the actual file content.

### Lens 3: Data Integrity Check

Verify that a soft-deleted image:

1. Does NOT appear in `getBatchImages` or `getProductImages` results
2. Does NOT count as a "has photo" in `getStats` or `getQueue`
3. Does NOT block a batch from appearing in `getBatchesNeedingPhotos`
4. Is NOT selected as the primary image in `ensureExactlyOneVisiblePrimaryForGroup`

This can be verified by reading the code paths — no DB access needed.

---

## Fix Cycle

For each issue found by QA:

1. Fix the issue
2. Re-run the specific verification command that failed
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report.

---

## Rollback Procedure

If anything fails after deployment:

**Immediate code rollback**:

```bash
git revert HEAD
git push origin main
```

**DB rollback** (if needed — removes the nullable column, safe operation):

```sql
ALTER TABLE product_images DROP COLUMN deleted_at;
```

**Note**: The DB rollback is only needed if the column was already added via autoMigrate
and the code rollback alone doesn't resolve the issue. A nullable column add is always
safe to drop.

---

## ✅ Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

- [ ] `drizzle/schema.ts` — `deletedAt: timestamp("deleted_at")` added to `productImages` table
- [ ] `server/autoMigrate.ts` — `ALTER TABLE product_images ADD COLUMN deleted_at` block added
- [ ] `server/routers/photography.ts` — zero `db.delete(productImages)` or `database.delete(productImages)` calls
- [ ] `server/routers/photography.ts` — both delete procedures use `update(...).set({ deletedAt: new Date() })`
- [ ] `server/routers/photography.ts` — ALL direct reads from `productImages` filter `isNull(productImages.deletedAt)`
- [ ] `server/routers/photography.ts` — ALL join conditions on `productImages` exclude soft-deleted rows
- [ ] `server/routers/photography.ts` — `ensureExactlyOneVisiblePrimaryForGroup` excludes soft-deleted rows
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm lint` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] No `any` types introduced
- [ ] No TODO/FIXME/HACK comments introduced
- [ ] Rollback plan documented above is executable

---

## RULES REPEATED — READ AGAIN

1. **NO PHANTOM VERIFICATION.** Show actual command output, not claims.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **NEVER USE `db.delete(` on productImages.** This is the whole point of the task.
4. **RED MODE.** This is a schema migration. Read every file before touching it.
5. **SCOPE GUARD.** Only `drizzle/schema.ts`, `server/routers/photography.ts`, and `server/autoMigrate.ts`.
