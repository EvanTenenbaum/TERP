# Wave 7: PR #404 Regression Re-implementation

**Classification**: Complex (cross-module, schema changes, financial paths)
**Mode**: RED for TER-97/TER-98 (schema changes), STRICT for TER-96/TER-99
**Estimate**: 8h total
**Unblocks**: GF-001, GF-002, GF-006, GF-008

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y"
   without showing the ACTUAL COMMAND and its ACTUAL OUTPUT.

2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item
   in the completion checklist has a ✅ with evidence.

3. **NO SILENT ERROR HANDLING.** If any command fails, STOP. Report the exact
   error. Do not work around it silently.

4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every
   lens.

5. **NO HAPPY-PATH-ONLY TESTING.** You must test failure cases, edge cases, and
   adversarial inputs.

6. **PROOF OF WORK.** At every verification gate marked with 🔒, paste actual
   terminal output.

7. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it
   first.

8. **ONE THING AT A TIME.** Complete and verify each task before starting the
   next. Do not batch-implement and then batch-verify.

---

## MISSION BRIEF

PR #404 was merged then its branch deleted before the fixes landed on `main`. These 4 tasks need re-implementation from scratch. Each blocks a golden flow.

**IMPORTANT CONTEXT**: TERP uses `autoMigrate.ts` which runs raw SQL on startup to sync schema. For schema changes, add the migration SQL to `autoMigrate.ts` (following existing patterns) AND update `drizzle/schema.ts`. Do NOT use `drizzle-kit push` or create migration files — TERP's deploy pipeline uses autoMigrate.

---

## Task 1: TER-99 — Restore Client Ledger Navigation (STRICT)

**What**: Add a sidebar navigation entry for Client Ledger. The route `/client-ledger` already exists in `App.tsx` and works. The component `ClientLedgerWorkSurface` renders correctly. The only problem is there's no nav item pointing to it.

**Files**:
- `client/src/config/navigation.ts` — add nav item + import `BookOpen`

**Acceptance Criteria**:
- [ ] `BookOpen` icon imported from `lucide-react`
- [ ] New `NavigationItem` added in the `finance` group after the Credits entry (around line 183)
- [ ] Nav item points to `/client-ledger` (the generic route with client picker)
- [ ] Name is "Client Ledger", has `ariaLabel`
- [ ] No other files changed

**Implementation**:

Add to the lucide-react import:
```typescript
BookOpen, // TER-99: Client Ledger navigation
```

Add after the Credits entry (line 183), before Reports:
```typescript
// TER-99: Client Ledger — direct access to client transaction history
{
  name: "Client Ledger",
  path: "/client-ledger",
  icon: BookOpen,
  group: "finance",
  ariaLabel: "View client transaction history and balance",
},
```

**Verification**:
```bash
pnpm check 2>&1 | tail -5
# Must show no errors
```

🔒 **GATE 1**: Paste `pnpm check` output before proceeding to Task 2.

---

## Task 2: TER-96 — Fix IntakeGrid Site Field Sync (STRICT)

**What**: When a user selects a location in the IntakeGrid dropdown, the `site` field in React state stays empty (`""`), causing the row to be silently excluded from submit. The server-side regex fix already landed (commit `e334e292`). This is a client-side React state sync bug.

**Root Cause**: In `handleCellValueChanged` (line 443-470 of `IntakeGrid.tsx`), the AG Grid `setDataValue("site", location.site)` call updates the grid node, but `event.data` (used in the `setRows` call at line 464-468) still has the OLD value. The `setRows` spread `{ ...row, ...event.data }` overwrites `site` back to `""`.

**Files**:
- `client/src/components/spreadsheet/IntakeGrid.tsx` — fix `handleCellValueChanged`

**Acceptance Criteria**:
- [ ] When `event.colDef.field === "locationName"`, the `setRows` call explicitly includes `site: location.site` and `locationId: location.id`
- [ ] Same pattern applied for `strainId` sync when `event.colDef.field === "item"` (also has same bug)
- [ ] Early return after location/strain handlers to skip the generic `setRows` at line 464

**Implementation**:

Replace the `handleCellValueChanged` body (lines 443-470) with:

```typescript
// Update location ID and site when location name changes
if (event.colDef.field === "locationName") {
  const location = locations.find(l => l.site === event.newValue);
  if (location) {
    event.node.setDataValue("locationId", location.id);
    event.node.setDataValue("site", location.site);
    // Explicitly include resolved values in React state — event.data
    // still has the old values when setDataValue was called above
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === event.data?.id
          ? { ...row, ...event.data, site: location.site, locationId: location.id }
          : row
      )
    );
    return; // Skip generic setRows below
  }
}

// Update strainId when item/product changes
if (event.colDef.field === "item") {
  const strain = strains.find(
    s =>
      s.standardizedName === event.newValue || s.name === event.newValue
  );
  if (strain) {
    event.node.setDataValue("strainId", strain.id);
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === event.data?.id
          ? { ...row, ...event.data, strainId: strain.id }
          : row
      )
    );
    return; // Skip generic setRows below
  }
}

// Generic: update rows state for all other field changes
setRows(prevRows =>
  prevRows.map(row =>
    row.id === event.data?.id ? { ...row, ...event.data } : row
  )
);
```

**Verification**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 2**: Paste `pnpm check` output.

---

## Task 3: TER-97 — Fix purchaseOrders.create Vendor Mapping 500 (RED)

**What**: `purchaseOrders.create` throws 500 when called with `supplierClientId` because `resolveOrCreateLegacyVendorId()` can fail (unique constraint violations, missing supplier profile). The schema requires `vendorId NOT NULL`, forcing the legacy mapping.

**Root Cause**: `purchaseOrders.vendorId` is `NOT NULL` in `drizzle/schema.ts:598`, forcing every PO create to resolve a legacy vendor ID even when `supplierClientId` is provided. The bridge function `resolveOrCreateLegacyVendorId()` has multiple failure paths (race on vendors.name unique index, missing supplierProfile, clientId unique constraint on supplierProfiles).

**Files**:
- `drizzle/schema.ts` — make `purchaseOrders.vendorId` nullable
- `server/autoMigrate.ts` — add migration block to make the column nullable in DB
- `server/routers/purchaseOrders.ts` — remove hard-fail when vendorId can't be resolved; wrap in try/catch
- `server/services/vendorMappingService.ts` — harden `resolveOrCreateLegacyVendorId()` to never throw

**Acceptance Criteria**:
- [ ] `purchaseOrders.vendorId` changed from `.notNull()` to nullable in `drizzle/schema.ts`
- [ ] `autoMigrate.ts` has a new block: `ALTER TABLE purchaseOrders MODIFY COLUMN vendorId INT NULL`
- [ ] Router wraps `resolveOrCreateLegacyVendorId()` in try/catch, logs warning, proceeds with null vendorId
- [ ] Hard-fail block (lines 210-217 of purchaseOrders.ts) changed to only throw if BOTH vendorId AND supplierClientId are missing
- [ ] `resolveOrCreateLegacyVendorId()` returns `null` instead of throwing on failure
- [ ] Existing PO creation with vendorId still works (backward compat)
- [ ] PO creation with only supplierClientId works even if vendor mapping fails

**Implementation Guide for purchaseOrders.ts** (lines 203-217):
```typescript
// If only supplierClientId provided, try to resolve vendorId for backward compat
if (resolvedSupplierClientId && !resolvedVendorId) {
  try {
    resolvedVendorId = await resolveOrCreateLegacyVendorId(
      resolvedSupplierClientId
    );
  } catch (e) {
    // Legacy vendor mapping is best-effort during deprecation period
    logger.warn(
      { supplierClientId: resolvedSupplierClientId, error: e },
      "[PO] Could not resolve legacy vendorId — proceeding with supplierClientId only"
    );
    resolvedVendorId = undefined;
  }
}

// Only fail if NEITHER identifier is available
if (!resolvedVendorId && !resolvedSupplierClientId) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message:
      "A supplier must be specified. Provide supplierClientId or vendorId.",
  });
}
```

**Implementation Guide for vendorMappingService.ts** — `resolveOrCreateLegacyVendorId()`:
- Wrap the entire function body in try/catch
- Return `null` from the catch block instead of throwing
- Log a warning with the specific failure reason

**Implementation Guide for autoMigrate.ts**:
Add a new migration block following existing patterns (check-then-alter):
```typescript
// TER-97: Make purchaseOrders.vendorId nullable for supplierClientId-only PO creation
const [poVendorIdCol] = await db.execute(sql`
  SELECT IS_NULLABLE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'purchaseOrders'
    AND COLUMN_NAME = 'vendorId'
`);
if (poVendorIdCol && (poVendorIdCol as Record<string, string>).IS_NULLABLE === 'NO') {
  await db.execute(sql`ALTER TABLE purchaseOrders MODIFY COLUMN vendorId INT NULL`);
  logger.info("[autoMigrate] TER-97: Made purchaseOrders.vendorId nullable");
}
```

**Verification**:
```bash
pnpm check 2>&1 | tail -5
pnpm test -- --grep "purchaseOrder" 2>&1 | tail -20
```

🔒 **GATE 3**: Paste both command outputs.

---

## Task 4: TER-98 — Fix samples.createRequest 500 on Insert (RED)

**What**: `samples.createRequest` throws 500 because `drizzle/schema.ts` defines columns and enum values on `sampleRequests` that don't exist in the DB. The schema was extended for SAMPLE-006 through SAMPLE-009 (return workflow, location tracking) but no migration was ever created or run.

**Root Cause**: Schema drift. `drizzle/schema.ts` has:
- `sampleRequestStatusEnum` with 9 values, but DB only has 3 (`PENDING`, `FULFILLED`, `CANCELLED`)
- `sampleLocationEnum` defined but the `location` column doesn't exist in DB
- Return workflow columns (`returnRequestedDate`, etc.) defined but not in DB
- `sampleLocationHistory` table defined but doesn't exist in DB
- `sampleAllocations` columns defined as `decimal(15,4)` but DB has `varchar(20)`

**Approach**: Add the missing columns/tables/enum-values to the DB via `autoMigrate.ts`. The schema.ts is already correct (it's "ahead" of the DB). We just need the DB to catch up.

**Files**:
- `server/autoMigrate.ts` — add migration blocks for all missing sample schema elements

**Acceptance Criteria**:
- [ ] `autoMigrate.ts` adds the expanded enum values to `sampleRequestStatus` column
- [ ] `autoMigrate.ts` adds the `location` column with `sampleLocation` enum type
- [ ] `autoMigrate.ts` adds all return workflow columns to `sampleRequests`
- [ ] `autoMigrate.ts` creates `sampleLocationHistory` table if it doesn't exist
- [ ] `autoMigrate.ts` modifies `sampleAllocations` varchar columns to decimal
- [ ] Each migration block checks before altering (idempotent, like existing patterns)
- [ ] `drizzle/schema.ts` is NOT modified (it's already correct)
- [ ] Basic createRequest insert works after migration

**Implementation Guide for autoMigrate.ts**:

Add a section `// === TER-98: Sample Schema Migrations ===` with these blocks:

1. Alter `sampleRequestStatus` enum:
```sql
ALTER TABLE sampleRequests
  MODIFY COLUMN sampleRequestStatus
  ENUM('PENDING','FULFILLED','CANCELLED','RETURN_REQUESTED','RETURN_APPROVED',
       'RETURNED','VENDOR_RETURN_REQUESTED','SHIPPED_TO_VENDOR','VENDOR_CONFIRMED')
  NOT NULL DEFAULT 'PENDING';
```

2. Add `location` column:
```sql
ALTER TABLE sampleRequests
  ADD COLUMN location ENUM('WAREHOUSE','WITH_CLIENT','WITH_SALES_REP','RETURNED','LOST')
  DEFAULT 'WAREHOUSE';
```

3. Add return workflow columns (all nullable timestamps/text/varchar):
```sql
ALTER TABLE sampleRequests
  ADD COLUMN returnRequestedDate TIMESTAMP NULL,
  ADD COLUMN returnRequestedBy INT NULL,
  -- ... etc for all return columns
```

4. Create `sampleLocationHistory` table.

5. Modify `sampleAllocations` column types from varchar to decimal.

Each block must be idempotent — check `information_schema.COLUMNS` or `information_schema.TABLES` before altering.

**Verification**:
```bash
pnpm check 2>&1 | tail -5
pnpm test -- --grep "sample" 2>&1 | tail -20
```

🔒 **GATE 4**: Paste both command outputs.

---

## VERIFICATION GATES (Final)

After ALL 4 tasks are complete:

```bash
# Gate 5: Full verification suite
pnpm check 2>&1 | tail -5
pnpm lint 2>&1 | tail -10
pnpm test 2>&1 | tail -15
pnpm build 2>&1 | tail -5
```

🔒 **GATE 5**: Paste ALL four command outputs.

---

## QA PROTOCOL (5-Lens — Required for Complex)

After all tasks pass Gate 5, run the adversarial QA:

### Lens 1: Static Pattern Scan
```bash
git diff HEAD~1..HEAD | grep -E "(ctx\.user\?\.(id|name)\s*\|\|)|(\.delete\()|(: any[^_])|(input\.userId)|(input\.createdBy)"
```
Must find ZERO matches (P0 auto-reject patterns).

### Lens 2: Execution Path Tracing
Trace these functions through all branches:
- `purchaseOrders.create` — vendorId provided, supplierClientId provided, neither provided, both provided
- `handleCellValueChanged` — locationName change, item change, other field change
- `createSampleRequest` — allocation passes, allocation fails, insert succeeds, insert fails

### Lens 3: Data Flow Analysis
Map INPUT → TRANSFORMS → OUTPUT for:
- `resolveOrCreateLegacyVendorId()` — client → supplierProfile → vendors → vendorId (or null)
- `handleCellValueChanged` → `setRows` — AG Grid event → React state (site, locationId, strainId)

### Lens 4: Adversarial Scenarios (minimum 10)
Test at minimum:
1. PO create with supplierClientId that has NO supplierProfile
2. PO create with supplierClientId that has supplierProfile but NO legacyVendorId
3. PO create with vendorId only (backward compat)
4. PO create with NEITHER vendorId nor supplierClientId
5. IntakeGrid: select location → verify site in React state is populated
6. IntakeGrid: select location → change to different location → verify site updates
7. IntakeGrid: select item → verify strainId in React state
8. Sample create with basic required fields only
9. Sample create when monthly allocation is exceeded
10. Navigation: Client Ledger appears in sidebar under Finance group

### Lens 5: Integration & Blast Radius
Map what other code calls each modified function/endpoint and verify no regressions.

---

## Fix Cycle

For each issue found by QA:
1. Fix the issue
2. Re-run the specific verification that failed
3. Paste the new output showing it passes
4. If fixing could affect other tasks, re-run those verification gates too

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report.

---

## ✅ Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

- [ ] Task 1 (TER-99): Client Ledger nav item added
- [ ] Task 2 (TER-96): IntakeGrid site field sync fixed
- [ ] Task 3 (TER-97): PO create works with supplierClientId only (no 500)
- [ ] Task 4 (TER-98): Sample createRequest insert works (no 500)
- [ ] Gate 5 passed: TypeScript ✅, Lint ✅, Tests ✅, Build ✅
- [ ] QA 5-lens protocol completed
- [ ] All QA findings addressed or documented as known issues
- [ ] No `console.log` statements left in production code
- [ ] No `any` types introduced
- [ ] Git committed with conventional format

---

## MANDATORY RULES (REPEATED — DO NOT SKIP)

1. NO PHANTOM VERIFICATION — show actual command output
2. NO PREMATURE COMPLETION — check every box with evidence
3. NO SILENT ERROR HANDLING — STOP and report failures
4. NO QA SKIPPING — all 5 lenses required
5. NO HAPPY-PATH-ONLY TESTING — adversarial scenarios mandatory
6. PROOF OF WORK at every 🔒 gate
7. READ FILES BEFORE EDITING
8. ONE THING AT A TIME
