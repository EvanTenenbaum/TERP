# TER-247: Rewrite Vendor Queries → Client Queries

**Classification**: Medium | **Mode**: STRICT | **Estimate**: 8h
**Linear**: TER-247 | **Wave**: 3 (vendor migration phase 1)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with 🔒, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.
7. **STRICT MODE RULES.** This touches multiple server-side query paths and two frontend components. Full verification is required at each step.
8. **ONE THING AT A TIME.** Complete and verify each file before starting the next.
9. **NEVER IMPORT FROM `vendors` TABLE.** After this task, no server file outside the approved exceptions may reference `from(vendors)`. This is the whole point of the task.
10. **USE `getAuthenticatedUserId(ctx)`.** Never use `ctx.user?.id || 1` or `ctx.user?.id ?? 1`. Never use `input.createdBy` or `input.userId` as actor.

---

## Mission Brief

The `vendors` table is **DEPRECATED**. TERP's canonical model stores all business entities
in the `clients` table: suppliers have `isSeller = true`, customers have `isBuyer = true`.
A `supplier_profiles` table holds extended supplier data (license, payment terms, contact info)
linked 1:1 via `clientId`.

Despite this, multiple server files still query `from(vendors)` directly — bypassing the
canonical model, emitting no deprecation warnings, and making TER-235 (drop the vendors table)
impossible.

This task rewrites every remaining `from(vendors)` query in the server codebase to use
`from(clients).where(eq(clients.isSeller, true))` with `supplierProfile` joins where needed,
and updates two frontend components that call the deprecated `trpc.vendors.getAll` endpoint.

**After this task, the ONLY files allowed to reference `from(vendors)` are:**

- `server/routers/vendors.ts` — the facade that wraps clients (emits deprecation warnings)
- `server/services/vendorMappingService.ts` — legacy ID mapping during transition
- `server/db/seed/` — seed files only

**Scope — exactly these files:**

- `server/dataCardMetricsDb.ts`
- `server/inventoryDb.ts`
- `server/routers/audit.ts`
- `server/routers/debug.ts`
- `server/routers/purchaseOrders.ts`
- `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`
- `client/src/components/intake/IntakeGrid.tsx`

---

## Pre-Flight: Rollback Plan (DOCUMENT BEFORE TOUCHING ANYTHING)

This task makes no schema changes. All changes are TypeScript/query rewrites.
The rollback is a single git command:

```bash
git checkout -- \
  server/dataCardMetricsDb.ts \
  server/inventoryDb.ts \
  server/routers/audit.ts \
  server/routers/debug.ts \
  server/routers/purchaseOrders.ts \
  client/src/components/work-surface/DirectIntakeWorkSurface.tsx \
  client/src/components/intake/IntakeGrid.tsx
```

**Risk level**: MEDIUM. These files handle supplier lookups used across PO creation, inventory
intake, audit trail display, and debug tooling. A wrong `where` clause could cause empty
dropdowns or missing data in production. The rollback above instantly restores all seven files
to their pre-task state with no data impact.

---

## Pre-Work: Gather Context

Before writing any code, execute ALL of the following and read the output:

### 1. Establish the current blast radius

```bash
grep -rn "from(vendors)" server/ --include="*.ts" | grep -v "vendors.ts" | grep -v "vendorMappingService" | grep -v "seed/"
```

🔒 **GATE 0a**: Paste the full output. These are the exact lines you must rewrite. Document the count.

### 2. Confirm the clients / supplierProfiles schema

Read the canonical schema sections:

```bash
grep -n "isSeller\|isBuyer\|supplierProfile\|supplier_profiles\|legacyVendorId" drizzle/schema.ts | head -40
```

Also read the `vendors` table definition so you understand the column mapping:

```bash
grep -n "export const vendors\|paymentTerms\|licenseNumber\|contactName\|contactEmail\|contactPhone" drizzle/schema.ts | head -30
```

### 3. Read the vendor router facade and mapping service

Read these files fully before touching anything — they show the canonical query pattern
already working in production:

- `server/routers/vendors.ts`
- `server/services/vendorMappingService.ts`

### 4. Confirm pre-conditions (Wave 2 merge)

```bash
git log --oneline -20 | grep -i "TER-245\|TER-248"
```

🔒 **GATE 0b**: Wave 2 tasks (TER-245, TER-248) must appear in git history before proceeding.
If they are not merged, STOP and report a blocker.

### 5. Read each target file fully

Before editing any file, read the ENTIRE file. Do not skip this step:

```
server/dataCardMetricsDb.ts
server/inventoryDb.ts
server/routers/audit.ts
server/routers/debug.ts
server/routers/purchaseOrders.ts
client/src/components/work-surface/DirectIntakeWorkSurface.tsx
client/src/components/intake/IntakeGrid.tsx
```

---

## Column Mapping Reference

Use this table throughout all rewrites. Do not guess column names.

| vendors column (DEPRECATED) | clients / supplierProfiles replacement |
| --------------------------- | -------------------------------------- |
| `vendors.id`                | `clients.id`                           |
| `vendors.name`              | `clients.name`                         |
| `vendors.deletedAt`         | `clients.deletedAt`                    |
| `vendors.contactName`       | `supplierProfiles.contactName`         |
| `vendors.contactEmail`      | `supplierProfiles.contactEmail`        |
| `vendors.contactPhone`      | `supplierProfiles.contactPhone`        |
| `vendors.paymentTerms`      | `supplierProfiles.paymentTerms`        |
| `vendors.licenseNumber`     | `supplierProfiles.licenseNumber`       |
| `vendors.notes`             | `clients.notes` (if column exists)     |

**Standard supplier query pattern** (reference this for every rewrite):

```typescript
// ✅ CANONICAL — copy this pattern
const suppliers = await db.query.clients.findMany({
  where: and(eq(clients.isSeller, true), isNull(clients.deletedAt)),
  with: { supplierProfile: true },
});
```

Or using the select builder:

```typescript
const suppliers = await db
  .select({
    id: clients.id,
    name: clients.name,
    paymentTerms: supplierProfiles.paymentTerms,
    licenseNumber: supplierProfiles.licenseNumber,
  })
  .from(clients)
  .leftJoin(supplierProfiles, eq(supplierProfiles.clientId, clients.id))
  .where(and(eq(clients.isSeller, true), isNull(clients.deletedAt)));
```

---

## Task 1: server/dataCardMetricsDb.ts

**What**: Replace `from(vendors)` supplier metric queries with `from(clients)` equivalents.

**Step 1a**: Read the full file. Locate all `vendors` imports and query sites:

```bash
grep -n "vendors\|from(vendors)" server/dataCardMetricsDb.ts
```

**Step 1b**: Remove `vendors` from the import line (around line 18). Add `clients`,
`supplierProfiles` (if not already imported). Add `and`, `isNull` to the drizzle-orm
imports if not present.

**Step 1c**: For each `from(vendors)` query (approximately line 710 and nearby):

- Replace `from(vendors)` with `from(clients)`
- Add `.where(and(eq(clients.isSeller, true), isNull(clients.deletedAt)))` (or extend existing `where`)
- If the query selects `vendors.name`, change to `clients.name`
- If the query selects `vendors.paymentTerms` or `vendors.licenseNumber`, add a
  `leftJoin(supplierProfiles, eq(supplierProfiles.clientId, clients.id))` and select
  from `supplierProfiles` instead

**Acceptance Criteria**:

- [ ] `vendors` import removed from `dataCardMetricsDb.ts`
- [ ] Zero `from(vendors)` calls remain in this file
- [ ] All replaced queries use `eq(clients.isSeller, true)` and `isNull(clients.deletedAt)`

**Verification**:

```bash
grep -n "from(vendors)\|vendors\." server/dataCardMetricsDb.ts
```

Expected: zero matches.

---

## Task 2: server/inventoryDb.ts

**What**: Replace `getAllSuppliers` and related functions that query `from(vendors)`.
The functions at lines 88, 108, 126, and 1105 use `from(vendors)` directly.

**Step 2a**: Read the full file. Map all `vendors` references:

```bash
grep -n "vendors\|from(vendors)\|getAllSuppliers" server/inventoryDb.ts
```

**Step 2b**: Remove `vendors` from imports. Add `clients`, `supplierProfiles`, `and`,
`isNull` if not present.

**Step 2c**: For each `from(vendors)` query:

- Replace with `from(clients).where(and(eq(clients.isSeller, true), isNull(clients.deletedAt)))`
- Add `leftJoin(supplierProfiles, eq(supplierProfiles.clientId, clients.id))` for any
  query that selects `paymentTerms`, `licenseNumber`, or contact fields
- Update column references per the mapping table above

**Step 2d**: Verify the return type of `getAllSuppliers` and any related exported
functions still match what callers expect. If the function previously returned
`{ id: number; name: string; ... }`, the replacement query must return the same shape.
Check call sites:

```bash
grep -rn "getAllSuppliers\|getSupplier" server/ --include="*.ts" | grep -v "inventoryDb.ts"
```

Update the return type annotations if the shape changes (no `any` types — use an
explicit interface or `typeof` inference).

**Acceptance Criteria**:

- [ ] `vendors` import removed from `inventoryDb.ts`
- [ ] Zero `from(vendors)` calls remain in this file
- [ ] `getAllSuppliers` return type is explicit (not `any`)
- [ ] All call sites of `getAllSuppliers` still compile without errors

🔒 **GATE 1**: Run `pnpm check 2>&1 | grep inventoryDb` and paste output. Zero errors expected.

---

## Task 3: server/routers/audit.ts

**What**: Replace vendor references in audit trail lookups (import around line 18, query
around line 398).

**Step 3a**: Read the full file:

```bash
grep -n "vendors\|from(vendors)" server/routers/audit.ts
```

**Step 3b**: The audit router likely looks up vendor names to display in audit log entries.
Understand what the query returns and what the caller uses:

- If it fetches `vendors.name` for display, replace with `clients.name` from the
  `clients` table where `isSeller = true`
- If the audit log stores a `vendorId` as a legacy FK, use `vendorMappingService.ts`
  (`getClientIdForVendor`) to resolve the client record during the transition period

**Step 3c**: Update the import and query following the canonical pattern. The entity
type in the audit log should map `"vendor"` references to `"client"` in display
if the schema supports it — but do NOT change the stored audit trail data structure;
only change the lookup query.

**Acceptance Criteria**:

- [ ] `vendors` import removed from `audit.ts`
- [ ] Zero `from(vendors)` calls remain in this file
- [ ] Audit log vendor lookups resolve correctly via `clients` table

---

## Task 4: server/routers/debug.ts

**What**: Replace `db.select().from(vendors)` debug endpoints (import around line 10,
queries around lines 499 and 564).

**Step 4a**: Read the full file:

```bash
grep -n "vendors\|from(vendors)" server/routers/debug.ts
```

**Step 4b**: Debug endpoints often dump raw table contents. Replace the `from(vendors)`
queries with `from(clients).where(eq(clients.isSeller, true))`. Include a
`leftJoin(supplierProfiles, ...)` if the debug endpoint exposes supplier profile fields.

**Step 4c**: If the debug endpoint's response shape is typed, update the type to
reflect `clients` columns (e.g., `id`, `name`, `isSeller`) plus any `supplierProfiles`
fields. Do not use `any`.

**Acceptance Criteria**:

- [ ] `vendors` import removed from `debug.ts`
- [ ] Zero `from(vendors)` calls remain in this file
- [ ] Response types are explicit (no `any`)

---

## Task 5: server/routers/purchaseOrders.ts

**What**: Replace vendor lookups in PO creation/update flows (import around line 14,
queries around lines 872 and 893).

**Step 5a**: Read the full file, paying close attention to the PO schema:

```bash
grep -n "vendors\|from(vendors)\|supplierClientId\|vendorId" server/routers/purchaseOrders.ts
```

**Step 5b**: The `purchaseOrders` table already has a `supplierClientId` column
(not `vendorId`). This means PO queries that look up the supplier should join
`clients` via `supplierClientId`, NOT via a legacy `vendorId` lookup.

For vendor lookups used to populate dropdowns or validate PO input:

```typescript
// ✅ Use this pattern for PO supplier lookups
const supplier = await db.query.clients.findFirst({
  where: and(
    eq(clients.id, input.supplierClientId),
    eq(clients.isSeller, true)
  ),
  with: { supplierProfile: true },
});
```

For listing available suppliers on PO create:

```typescript
const suppliers = await db.query.clients.findMany({
  where: and(eq(clients.isSeller, true), isNull(clients.deletedAt)),
  with: { supplierProfile: true },
});
```

**Step 5c**: If any existing code passes `vendorId` from input to look up the supplier,
replace it with `supplierClientId` from input (since the PO table uses that column).
Do NOT use `input.userId` or `input.createdBy` for actor attribution — use
`getAuthenticatedUserId(ctx)`.

**Acceptance Criteria**:

- [ ] `vendors` import removed from `purchaseOrders.ts`
- [ ] Zero `from(vendors)` calls remain in this file
- [ ] PO supplier lookups use `supplierClientId` (not `vendorId`)
- [ ] No `input.createdBy` or `input.userId` used as actor

🔒 **GATE 2**: Run `pnpm check 2>&1 | grep purchaseOrders` and paste output. Zero errors expected.

---

## Task 6: client/src/components/work-surface/DirectIntakeWorkSurface.tsx

**What**: Replace `trpc.vendors.getAll.useQuery()` with `trpc.clients.list.useQuery({ clientTypes: ['seller'] })`.

**Step 6a**: Read the full file. Find the vendor query and every reference to its result:

```bash
grep -n "vendors\|getAll\|supplier\|vendor" client/src/components/work-surface/DirectIntakeWorkSurface.tsx
```

**Step 6b**: Replace the query hook:

```typescript
// ❌ DEPRECATED — remove this
const { data: vendors } = trpc.vendors.getAll.useQuery();

// ✅ CANONICAL — use this
const { data: suppliers } = trpc.clients.list.useQuery({
  clientTypes: ["seller"],
});
```

**Step 6c**: Update all downstream references in this component from `vendors` to
`suppliers`. The data shape from `trpc.clients.list` returns `clients` records with
`id` and `name` — verify the component only uses fields available on `clients`
(or `supplierProfile` if joined). If the component uses `vendor.licenseNumber` or
`vendor.paymentTerms`, check whether `trpc.clients.list` returns those fields; if not,
use `trpc.clients.getById` with a `supplierProfile` include, or extend the `list`
endpoint to include `supplierProfile`.

**Step 6d**: Confirm the variable rename does not break JSX (e.g., `vendors.map(...)` →
`suppliers.map(...)`). Check for loading/error states that reference the old variable name.

**Acceptance Criteria**:

- [ ] `trpc.vendors.getAll` removed from this file
- [ ] `trpc.clients.list` used with `clientTypes: ['seller']` filter
- [ ] All downstream references updated (no stale `vendors` variable)
- [ ] Component renders without TypeScript errors

---

## Task 7: client/src/components/intake/IntakeGrid.tsx

**What**: Same pattern as Task 6 — replace `trpc.vendors.getAll.useQuery()`.

**Step 7a**: Read the full file:

```bash
grep -n "vendors\|getAll\|supplier\|vendor" client/src/components/intake/IntakeGrid.tsx
```

**Step 7b**: Apply the same replacement as Task 6:

```typescript
// ❌ DEPRECATED
const { data: vendors } = trpc.vendors.getAll.useQuery();

// ✅ CANONICAL
const { data: suppliers } = trpc.clients.list.useQuery({
  clientTypes: ["seller"],
});
```

**Step 7c**: Update all downstream `vendors` references to `suppliers` within this file.
Verify the intake grid column definitions, filter logic, and row rendering all use the
correct field names from `clients` (not `vendors`).

**Acceptance Criteria**:

- [ ] `trpc.vendors.getAll` removed from `IntakeGrid.tsx`
- [ ] `trpc.clients.list` used with `clientTypes: ['seller']` filter
- [ ] All downstream references updated
- [ ] Component renders without TypeScript errors

---

## Task 8: Full Verification Suite

🔒 **GATE 3**: Run ALL of these in sequence and paste the full output for each:

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

## QA Protocol (3-Lens for STRICT Mode)

### Lens 1: Forbidden Pattern Scan

Run the primary verification command for this task. **This must return EMPTY output.**

```bash
grep -rn "from(vendors)" server/ --include="*.ts" \
  | grep -v "vendors\.ts" \
  | grep -v "vendorMappingService" \
  | grep -v "seed/"
```

Also check frontend:

```bash
grep -rn "trpc\.vendors\.getAll" client/src/ --include="*.tsx"
```

Also check for forbidden patterns introduced during the rewrite:

```bash
# No fallback user IDs
grep -rn "ctx\.user?.id || 1\|ctx\.user?.id ?? 1" server/ --include="*.ts"

# No actor from input
grep -rn "input\.createdBy\|input\.userId" server/ --include="*.ts"

# No any types in modified files
grep -n ": any\b" \
  server/dataCardMetricsDb.ts \
  server/inventoryDb.ts \
  server/routers/audit.ts \
  server/routers/debug.ts \
  server/routers/purchaseOrders.ts

# No hard deletes introduced
grep -rn "db\.delete(" server/ --include="*.ts" \
  | grep -v "vendors\.ts" \
  | grep -v "vendorMappingService"
```

Expected for the primary scan: **zero matches**.
Expected for all forbidden patterns: **zero matches**.

### Lens 2: Query Correctness Audit

Verify each rewritten query follows the canonical pattern. For every file modified,
confirm the following:

| File                   | Pattern Required               | Must Include                                               |
| ---------------------- | ------------------------------ | ---------------------------------------------------------- |
| `dataCardMetricsDb.ts` | `from(clients)`                | `eq(clients.isSeller, true)` + `isNull(clients.deletedAt)` |
| `inventoryDb.ts`       | `from(clients)`                | `eq(clients.isSeller, true)` + `isNull(clients.deletedAt)` |
| `audit.ts`             | `from(clients)`                | `eq(clients.isSeller, true)`                               |
| `debug.ts`             | `from(clients)`                | `eq(clients.isSeller, true)`                               |
| `purchaseOrders.ts`    | `from(clients)` or `findFirst` | `eq(clients.isSeller, true)`                               |

Run this to confirm all rewritten server files use the canonical `isSeller` filter:

```bash
grep -n "isSeller" \
  server/dataCardMetricsDb.ts \
  server/inventoryDb.ts \
  server/routers/audit.ts \
  server/routers/debug.ts \
  server/routers/purchaseOrders.ts
```

Expected: one or more matches per file (each file must reference `isSeller`).

### Lens 3: Import Cleanliness

Confirm `vendors` is no longer imported in any of the rewritten files:

```bash
grep -n "import.*vendors\|from.*vendors" \
  server/dataCardMetricsDb.ts \
  server/inventoryDb.ts \
  server/routers/audit.ts \
  server/routers/debug.ts \
  server/routers/purchaseOrders.ts
```

Expected: **zero matches** (only `vendors.ts` and `vendorMappingService.ts` may import from vendors).

Also confirm frontend files no longer reference the deprecated query:

```bash
grep -n "vendors" \
  client/src/components/work-surface/DirectIntakeWorkSurface.tsx \
  client/src/components/intake/IntakeGrid.tsx
```

Expected: zero matches (or only incidental comment/display text — no query calls).

---

## Fix Cycle

For each issue found by QA:

1. Fix the issue
2. Re-run the specific verification command that failed
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report with the
exact error and the steps already attempted.

---

## Rollback Procedure

If anything fails after deployment:

**Immediate code rollback**:

```bash
git revert HEAD
git push origin main
```

**File-level rollback** (if reverting a specific file is safer than reverting the commit):

```bash
git checkout -- \
  server/dataCardMetricsDb.ts \
  server/inventoryDb.ts \
  server/routers/audit.ts \
  server/routers/debug.ts \
  server/routers/purchaseOrders.ts \
  client/src/components/work-surface/DirectIntakeWorkSurface.tsx \
  client/src/components/intake/IntakeGrid.tsx
```

**Note**: There are no schema changes in this task. Rollback is purely code. No DB
operations are needed.

---

## Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

**server/dataCardMetricsDb.ts**

- [ ] `vendors` import removed
- [ ] Zero `from(vendors)` calls remain
- [ ] Replacement queries use `eq(clients.isSeller, true)` and `isNull(clients.deletedAt)`

**server/inventoryDb.ts**

- [ ] `vendors` import removed
- [ ] Zero `from(vendors)` calls remain (lines 88, 108, 126, 1105 area all addressed)
- [ ] `getAllSuppliers` return type is explicit (not `any`)
- [ ] Replacement queries use `eq(clients.isSeller, true)` and `isNull(clients.deletedAt)`

**server/routers/audit.ts**

- [ ] `vendors` import removed
- [ ] Zero `from(vendors)` calls remain
- [ ] Audit trail vendor lookups resolve via `clients` table

**server/routers/debug.ts**

- [ ] `vendors` import removed
- [ ] Zero `from(vendors)` calls remain (lines 499 and 564 area addressed)
- [ ] Response types are explicit (no `any`)

**server/routers/purchaseOrders.ts**

- [ ] `vendors` import removed
- [ ] Zero `from(vendors)` calls remain (lines 872 and 893 area addressed)
- [ ] PO supplier lookups use `supplierClientId` (not `vendorId`)
- [ ] No `input.createdBy` or `input.userId` used as actor

**client/src/components/work-surface/DirectIntakeWorkSurface.tsx**

- [ ] `trpc.vendors.getAll` removed
- [ ] `trpc.clients.list` used with `clientTypes: ['seller']`
- [ ] All downstream `vendors` variable references updated

**client/src/components/intake/IntakeGrid.tsx**

- [ ] `trpc.vendors.getAll` removed
- [ ] `trpc.clients.list` used with `clientTypes: ['seller']`
- [ ] All downstream `vendors` variable references updated

**Global verification gates**

- [ ] Primary scan empty: `grep -rn "from(vendors)" server/ --include="*.ts" | grep -v "vendors.ts" | grep -v "vendorMappingService" | grep -v "seed/"` returns zero lines
- [ ] Frontend scan empty: `grep -rn "trpc.vendors.getAll" client/src/ --include="*.tsx"` returns zero lines
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm lint` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] No `any` types introduced in any modified file
- [ ] No `ctx.user?.id || 1` or `ctx.user?.id ?? 1` introduced
- [ ] No `input.createdBy` or `input.userId` used as actor
- [ ] No `db.delete(` introduced (hard deletes forbidden)
- [ ] No TODO/FIXME/HACK comments introduced
- [ ] Rollback plan documented above is executable

---

## RULES REPEATED — READ AGAIN

1. **NO PHANTOM VERIFICATION.** Show actual command output, not claims.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **PRIMARY SUCCESS CRITERION**: `grep -rn "from(vendors)" server/ --include="*.ts" | grep -v "vendors.ts" | grep -v "vendorMappingService" | grep -v "seed/"` returns **EMPTY**. If it does not, the task is not done.
4. **STRICT MODE.** Read every file before touching it. Full verification at each gate.
5. **SCOPE GUARD.** Only the seven files listed in the Mission Brief. Do not modify any other file without documenting why.
6. **COLUMN MAPPING IS LAW.** Use the mapping table above. Do not guess vendor→client field correspondences.
