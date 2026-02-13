# TERP Golden Flow Closure — Forged Prompt v1

**Classification**: CRITICAL (18 issues, financial paths, auth, schema, E2E, deployment)
**Generated**: 2026-02-13
**Source commit**: `5f6708d09a5c7a5035d6b6f652112a12b9c28047`

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.

2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a check with evidence. Check the list. Actually check it.

3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass, if anything unexpected happens: STOP. Report the exact error. Do not work around it silently.

4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens. You MUST generate the minimum number of adversarial scenarios. You MUST show your findings.

5. **NO HAPPY-PATH-ONLY TESTING.** You must test failure cases, edge cases, and adversarial inputs. Testing only the success path = incomplete work.

6. **PROOF OF WORK.** At every verification gate marked with GATE, you must paste the actual terminal output. Screenshots of your reasoning don't count.

7. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.

8. **ONE THING AT A TIME.** Complete and verify each task before starting the next. Do not batch-implement and then batch-verify.

9. **NO ABANDONED WORK.** Every file you touch must be left in a state where `pnpm check && pnpm lint && pnpm test && pnpm build` passes. No partial implementations. No "I'll fix this later."

10. **FORBIDDEN PATTERNS.** These are enforced by CI — do not introduce them:
    - `ctx.user?.id || 1` or `ctx.user?.id ?? 1` (fallback user ID)
    - `input.createdBy` or `input.userId` (actor from input)
    - `any` types
    - Hard deletes (use soft delete with `deletedAt`)
    - Direct `vendors` table usage in new code (use `clients` with `isSeller=true`)

---

## MISSION BRIEF

You are closing out the TERP Golden Flows Beta backlog. 18 Linear issues (TER-93 through TER-243) remain open. Your job is to:

1. **Validate** each issue against the actual codebase at commit `5f6708d`
2. **Implement** fixes for all genuinely open issues
3. **Verify** every fix with `pnpm check && pnpm lint && pnpm test && pnpm build`
4. **Create PR(s)** with a ticket-to-commit matrix
5. **Produce** a final deliverable matrix and remaining-blockers list

**You are the last line of defense.** The system and users are relying on you. Leave nothing broken.

---

## CODEBASE STATE (PRE-VALIDATED — DO NOT RE-DISCOVER)

These findings are verified against commit `5f6708d`. Start from these facts:

### Confirmed DONE (skip these — verify only if something seems wrong downstream)
- **TER-100**: Navigation routing fixes — Done
- **TER-101**: Test stabilization — Done
- **TER-103**: Additional test fixes — Done

### Confirmed OPEN (these need work)

| Ticket | Title | Current Code State | Key File(s) |
|--------|-------|--------------------|-------------|
| TER-93 | Production migration drift | Schema has `COLUMNS_PENDING_MIGRATION` for `strainId`, referral_settings columns. Migration SQL files exist in `/drizzle/migrations/` but drift may not be reconciled with production DB | `tests/integration/schema-verification.test.ts:45-58`, `drizzle/schema.ts` |
| TER-117 | Seed needs source placeholder images | `seed-product-images.ts` needs verification that it handles missing source/placeholder uploads | `scripts/seed/seeders/seed-product-images.ts`, `scripts/seed/seed-main.ts` |
| TER-234 | Test coverage for DirectIntakeWorkSurface | No unit/integration tests exist for this component | `client/src/components/work-surface/DirectIntakeWorkSurface.tsx` |
| TER-235 | Migrate DirectIntakeWorkSurface from vendors.getAll | **LINE 759 still uses `trpc.vendors.getAll.useQuery()`** — deprecated API. Must migrate to `clients` with `isSeller=true` | `client/src/components/work-surface/DirectIntakeWorkSurface.tsx:759` |
| TER-236 | Transaction wrapper for productCatalogue.create | **No transaction wrapper** around duplicate check + create at lines 108-146. Race condition possible between check and insert | `server/routers/productCatalogue.ts:108-146` |
| TER-237 | Wire lot allocation policy into allocation flows | `inventoryDb.ts` and `ordersDb.ts` need FIFO/lot-allocation policy wiring | `server/inventoryDb.ts`, `server/ordersDb.ts` |
| TER-238 | GF-001 brittle row count assertion | **LINE 75: `await expect(rows).toHaveCount(2)`** — hardcoded count that fails when pre-existing data exists. Must use relative count (count before + 1) | `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts:75` |
| TER-239 | GF-002 doesn't enter PO creation data | Test only navigates to creation URL and checks for product selector visibility. Does not actually fill PO form fields or submit. Test is structurally incomplete | `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts:25-44` |
| TER-240 | GF-005 invalid locator syntax | Uses `[data-testid="order-queue-row"]`, `[data-testid="pick-pack-search-input"]`, `[data-testid="order-queue"]` — must verify these data-testid attributes exist in the actual PickPackWorkSurface component. If not, selectors need updating | `tests-e2e/golden-flows/gf-005-pick-pack-complete.spec.ts` |
| TER-241 | GF-006 ledger header not found | Complex fallback chain: clicks row → looks for Ledger tab → falls back to Open button → falls back to `/client-ledger` route. Selectors likely don't match actual ClientsWorkSurface/ClientProfilePage UI | `tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts:21-63` |
| TER-242 | GF-007 duplicate strict mode | Simple test — clicks inventory row and looks for Adjust/Edit/Update Qty button. "Duplicate strict mode" suggests the test file may be registered twice or has conflicting describe blocks | `tests-e2e/golden-flows/gf-007-inventory-management.spec.ts` |
| TER-243 | Pick-pack Cmd+K search focus | **LINES 64-69**: Uses `Meta+k`/`Control+k` to focus search input, but Cmd+K palette may not exist or may not focus `input[placeholder*="Search"]`. Must verify PickPackWorkSurface actually implements this keyboard shortcut | `tests-e2e/golden-flows/pick-pack-fulfillment.spec.ts:64-69` |

### Partially Done (need evidence of closure)

| Ticket | Title | Code Evidence | What's Missing |
|--------|-------|---------------|----------------|
| TER-96 | Intake location site schema mismatch | `validation.ts:64-72` has `siteCode` validator (`/^[A-Za-z0-9\s_-]+$/`). `locationCode` at line 157 uses `/^[A-Z0-9-]+$/`. DirectIntakeWorkSurface UI label may say "Location" but API validates as "Site" | Need to verify UI label matches API field name, and that the regex accepts all values the UI dropdown offers |
| TER-97 | PO create vendor mapping 500 | `purchaseOrders.ts:127-177` has proper `supplierClientId` + `vendorId` fallback with `getSupplierByLegacyVendorId`. Mapping logic exists. | Need to verify: (a) the mapping actually resolves for all existing vendor IDs, (b) error handling returns helpful message not 500, (c) test coverage exists |
| TER-98 | samples.createRequest 500 on insert | `samplesDb.ts:21-59` creates request. `products` field stored as JSON array. `sampleRequests` table must accept `products` as JSON column | Need to verify schema column type matches insert shape. The `sampleRequestStatus` enum first arg must match DB column name |
| TER-99 | Client → ledger navigation | `ClientsWorkSurface.tsx` and `ClientProfilePage.tsx` exist. Need "View Ledger" link/button to be discoverable | Need to verify navigation path actually works: clients list → click client → see ledger button/tab |
| TER-166 | Media follow-up edge cases | `photography.ts` and `liveCatalogService.ts` have media handling. Seed scripts exist | Need to close specific edge case gaps identified in TER-108 QA |

---

## EXECUTION ORDER (MANDATORY — DO NOT REORDER)

### Phase 1: Infrastructure & Seed Parity (TER-93, TER-117)

#### Task 1.1: TER-93 — Validate Production Migration Drift

**What**: Verify schema.ts aligns with what `COLUMNS_PENDING_MIGRATION` documents, and that no additional drift exists.
**Files to read first**:
- `tests/integration/schema-verification.test.ts`
- `drizzle/schema.ts` (enum definitions section)
- `drizzle/migrations/` directory listing

**Acceptance Criteria**:
- [ ] `COLUMNS_PENDING_MIGRATION` array is accurate and complete
- [ ] All mysqlEnum first-arguments match their DB column names (cross-reference schema.ts enums against table column definitions)
- [ ] Schema verification test passes: `pnpm test -- --grep "schema"`
- [ ] Document any remaining drift items with exact column/table references

**Verification Command**:
```bash
pnpm test -- --grep "schema" 2>&1 | tail -20
```

**GATE 1A**: Paste schema test output before proceeding.

#### Task 1.2: TER-117 — Verify Seed Source Placeholder Completeness

**What**: Ensure `seed-product-images.ts` handles missing source images gracefully (placeholder/fallback).
**Files to read first**:
- `scripts/seed/seeders/seed-product-images.ts`
- `scripts/seed/seed-main.ts`
- `server/routers/photography.ts` (upload path)

**Acceptance Criteria**:
- [ ] Seed script either ships a placeholder image or handles missing images without throwing
- [ ] `pnpm seed:all-defaults` (or equivalent) doesn't crash on missing images
- [ ] If placeholder is needed, it exists in the repo or is generated at seed time

**Verification Command**:
```bash
grep -n "placeholder\|fallback\|default.*image\|source.*url" scripts/seed/seeders/seed-product-images.ts
```

**GATE 1B**: Show seed script evidence before proceeding.

---

### Phase 2: Backend Contract Closure (TER-97, TER-98, TER-99, TER-96)

#### Task 2.1: TER-97 — PO Create Vendor Mapping

**What**: Verify the vendor→client mapping in `purchaseOrders.create` handles all cases without 500 errors.
**Files to read first**:
- `server/routers/purchaseOrders.ts:127-200` (full create mutation)
- `server/inventoryDb.ts` (find `getSupplierByLegacyVendorId`)

**Acceptance Criteria**:
- [ ] When `supplierClientId` provided: validates it's a seller client, returns 400 (not 500) if not
- [ ] When only `vendorId` provided: maps via `getSupplierByLegacyVendorId`, returns clear error if unmapped
- [ ] When neither provided: Zod refine rejects with helpful message
- [ ] Existing test covers all three paths (add tests if missing)

**Verification Commands**:
```bash
# Check existing test coverage
grep -rn "purchaseOrders.*create\|create.*purchaseOrder" tests/ server/routers/*.test.ts 2>/dev/null
# Run PO-related tests
pnpm test -- --grep "purchaseOrder" 2>&1 | tail -20
```

**GATE 2A**: Show test results for PO create.

#### Task 2.2: TER-98 — Samples CreateRequest Insert Fix

**What**: Verify `samplesDb.createSampleRequest` insert doesn't 500.
**Files to read first**:
- `server/samplesDb.ts:21-59`
- `drizzle/schema.ts` — find `sampleRequests` table definition
- `server/routers/samples.ts:142-165`

**Acceptance Criteria**:
- [ ] `sampleRequests` table has a `products` column that accepts JSON (verify column type)
- [ ] `sampleRequestStatus` mysqlEnum first-arg matches the actual DB column name
- [ ] `requestedBy` is derived from `getAuthenticatedUserId(ctx)`, not from input
- [ ] Add/verify test that calls `createRequest` with valid data and succeeds

**Verification Commands**:
```bash
# Find sampleRequests table definition
grep -n "sampleRequests\|sample_requests" drizzle/schema.ts | head -20
# Check enum naming
grep -n "mysqlEnum.*sample\|mysqlEnum.*request" drizzle/schema.ts
# Run samples tests
pnpm test -- --grep "sample" 2>&1 | tail -20
```

**GATE 2B**: Show schema column match + test results.

#### Task 2.3: TER-99 — Client → Ledger Navigation

**What**: Ensure discoverable navigation from clients list to client ledger.
**Files to read first**:
- `client/src/components/work-surface/ClientsWorkSurface.tsx`
- `client/src/pages/ClientProfilePage.tsx`
- `client/src/App.tsx` (routing)

**Acceptance Criteria**:
- [ ] ClientsWorkSurface has a way to navigate to individual client (row click or button)
- [ ] ClientProfilePage has a visible "View Ledger" or "Ledger" tab/button
- [ ] Route `/client-ledger/:id` or equivalent exists in App.tsx
- [ ] TypeScript compiles: `pnpm check` passes

**Verification Command**:
```bash
grep -n "ledger\|Ledger" client/src/pages/ClientProfilePage.tsx client/src/components/work-surface/ClientsWorkSurface.tsx client/src/App.tsx 2>/dev/null
```

**GATE 2C**: Show navigation path evidence.

#### Task 2.4: TER-96 — Intake Location/Site Schema Mismatch

**What**: Ensure UI labels, dropdown values, and API validation all align for the "site" field in direct intake.
**Files to read first**:
- `server/_core/validation.ts:64-72` (siteCode validator)
- `client/src/components/work-surface/DirectIntakeWorkSurface.tsx` (site dropdown)
- `drizzle/schema.ts` — find `locations` table and `site` column

**Acceptance Criteria**:
- [ ] UI dropdown label says "Site" (not "Location" if the API field is `site`)
- [ ] All dropdown options pass the siteCode regex (`/^[A-Za-z0-9\s_-]+$/`)
- [ ] API validation error messages reference the correct field name
- [ ] If there's a mismatch, fix it (prefer API naming, update UI label)

**Verification Command**:
```bash
grep -n "site\|location\|Site\|Location" client/src/components/work-surface/DirectIntakeWorkSurface.tsx | head -20
grep -n "siteCode\|site_code\|locationCode" server/_core/validation.ts
```

**GATE 2D**: Show label/validator alignment evidence.

---

### Phase 3: E2E Test Fixes (TER-238 through TER-243)

**IMPORTANT**: For each test fix, you MUST:
1. Read the test file first
2. Read the component it tests to understand actual selectors/DOM structure
3. Fix the test to match reality (don't change the component to match the test)
4. Run `pnpm check` after changes

#### Task 3.1: TER-238 — GF-001 Brittle Row Count

**What**: Fix `gf-001-direct-intake.spec.ts` line 75 hardcoded `toHaveCount(2)`.
**File**: `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`

**The Fix**: Capture row count BEFORE clicking "Add Row", then assert count increased by 1.

**Acceptance Criteria**:
- [ ] No hardcoded row count — uses relative assertion (before + 1)
- [ ] Test handles case where grid starts empty (0 rows → 1 row)
- [ ] `pnpm check` passes after change

**Implementation Pattern**:
```typescript
// BEFORE (broken):
await expect(rows).toHaveCount(2);
// AFTER (resilient):
const countBefore = await rows.count();
await addRowButton.click();
await expect(rows).toHaveCount(countBefore + 1);
const rowIndex = countBefore; // use last row
```

#### Task 3.2: TER-239 — GF-002 Procure-to-Pay Incomplete

**What**: Fix `gf-002-procure-to-pay.spec.ts` to actually test PO creation, not just navigation.
**File**: `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts`

**Read first**: The actual PurchaseOrdersWorkSurface/create page to understand form fields and selectors.

**Acceptance Criteria**:
- [ ] Test fills at least: supplier, product, quantity, unit cost
- [ ] Test submits the PO (or verifies form validation feedback)
- [ ] Test handles graceful skip if PO creation UI isn't available
- [ ] Test doesn't leave stale test data (cleanup in afterEach)

#### Task 3.3: TER-240 — GF-005 Invalid Locator Syntax

**What**: Fix selectors in `gf-005-pick-pack-complete.spec.ts`.
**File**: `tests-e2e/golden-flows/gf-005-pick-pack-complete.spec.ts`

**Read first**: `client/src/components/work-surface/PickPackWorkSurface.tsx` to find actual data-testid attributes and DOM structure.

**Acceptance Criteria**:
- [ ] All `data-testid` selectors match actual component attributes
- [ ] If component lacks data-testid, add them to the component OR use role/text selectors
- [ ] Empty state selector works (test verifies "No orders" or similar message)
- [ ] `pnpm check` passes

#### Task 3.4: TER-241 — GF-006 Ledger Header Not Found

**What**: Fix `gf-006-client-ledger-review.spec.ts` selector chain.
**File**: `tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts`

**Read first**:
- `client/src/components/work-surface/ClientsWorkSurface.tsx` — how does row click work?
- `client/src/pages/ClientProfilePage.tsx` — where is the ledger tab?
- `client/src/App.tsx` — what routes exist for client-ledger?

**Acceptance Criteria**:
- [ ] Selector chain matches actual UI navigation flow
- [ ] If clients list uses ag-grid, use ag-grid-aware selectors
- [ ] Ledger header selector matches actual component heading text
- [ ] Graceful skip if ledger feature isn't deployed (not a test crash)

#### Task 3.5: TER-242 — GF-007 Duplicate Strict Mode

**What**: Fix `gf-007-inventory-management.spec.ts` duplicate describe block or strict-mode failure.
**File**: `tests-e2e/golden-flows/gf-007-inventory-management.spec.ts`

**Read first**: Check if this test file is registered/imported multiple times in playwright config.

**Acceptance Criteria**:
- [ ] No duplicate test describe blocks
- [ ] No duplicate imports/registrations in playwright config
- [ ] Test uses resilient selectors matching actual InventoryWorkSurface
- [ ] `pnpm check` passes

#### Task 3.6: TER-243 — Pick-Pack Cmd+K Focus

**What**: Fix `pick-pack-fulfillment.spec.ts` search focus test.
**File**: `tests-e2e/golden-flows/pick-pack-fulfillment.spec.ts`

**Read first**: `client/src/components/work-surface/PickPackWorkSurface.tsx` — does it implement Cmd+K?

**Acceptance Criteria**:
- [ ] If Cmd+K exists in component: fix selector to match actual search input
- [ ] If Cmd+K does NOT exist: either add it to the component OR change test to use direct input focus
- [ ] Test works on both Mac (`Meta+k`) and Linux (`Control+k`)
- [ ] `pnpm check` passes

**GATE 3**: After ALL Phase 3 tasks, run full verification:
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```
Paste complete output.

---

### Phase 4: Technical Debt Closure (TER-234, TER-235, TER-236, TER-237)

#### Task 4.1: TER-235 — Migrate DirectIntakeWorkSurface from vendors.getAll

**What**: Replace `trpc.vendors.getAll.useQuery()` at line 759 with the clients API (`isSeller=true`).
**File**: `client/src/components/work-surface/DirectIntakeWorkSurface.tsx`

**CRITICAL**: This is a deprecated API removal. You must:
1. Find ALL references to `vendors` in this file (lines 329, 347, 353, 759, 761, 872-873, 1030)
2. Replace with clients/suppliers API call
3. Update the `vendors` variable name to `suppliers`
4. Update all downstream references

**Acceptance Criteria**:
- [ ] Zero references to `trpc.vendors` in this file
- [ ] Uses `trpc.clients.list` (with `isSeller: true` filter) or equivalent suppliers endpoint
- [ ] Dropdown still shows supplier names correctly
- [ ] `vendorId` field on row data maps to `clientId` or `supplierClientId`
- [ ] `pnpm check` passes (no type errors)

#### Task 4.2: TER-234 — Test Coverage for DirectIntakeWorkSurface

**What**: Add unit/integration tests for the DirectIntakeWorkSurface component.
**File**: Create `client/src/components/work-surface/__tests__/DirectIntakeWorkSurface.test.tsx` or similar

**Acceptance Criteria**:
- [ ] Tests cover: render, add row, submit, validation errors
- [ ] Tests mock tRPC calls appropriately
- [ ] At least 3 test cases
- [ ] `pnpm test` passes including new tests

**NOTE**: Do Task 4.1 (TER-235) BEFORE this task, since the API migration changes what needs testing.

#### Task 4.3: TER-236 — Transaction Wrapper for productCatalogue.create

**What**: Wrap the duplicate check + create in `productCatalogue.ts:108-146` in a database transaction.
**File**: `server/routers/productCatalogue.ts`

**Implementation Pattern** (from existing codebase):
```typescript
// Current (no transaction):
const duplicate = await productsDb.findDuplicateProduct(...);
if (duplicate) throw ...;
const result = await productsDb.createProduct({...});

// Fixed (with transaction):
const db = await getDb();
const result = await db.transaction(async (tx) => {
  const duplicate = await productsDb.findDuplicateProduct(..., tx);
  if (duplicate) throw new TRPCError({...});
  return await productsDb.createProduct({...}, tx);
});
```

**Acceptance Criteria**:
- [ ] Duplicate check and create are in same transaction
- [ ] `productsDb.findDuplicateProduct` and `createProduct` accept optional `tx` parameter
- [ ] Existing tests still pass
- [ ] `pnpm check && pnpm test` passes

#### Task 4.4: TER-237 — Wire Lot Allocation Policy

**What**: Verify or implement FIFO lot allocation in inventory allocation flows.
**Files to read first**:
- `server/inventoryDb.ts` (find allocation functions)
- `server/ordersDb.ts` (find order fulfillment allocation)
- Look for any `allocationPolicy` or `fifo` references

**Acceptance Criteria**:
- [ ] Allocation uses FIFO ordering (oldest lots first) by default
- [ ] Policy is configurable or documented if hardcoded
- [ ] Allocation function is used in order fulfillment path
- [ ] Test exists verifying FIFO ordering

**GATE 4**: After ALL Phase 4 tasks:
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```
Paste complete output.

---

### Phase 5: Media Follow-up (TER-166)

#### Task 5.1: TER-166 — Close Media Edge Case Gaps

**What**: Verify and close edge cases from TER-108 QA in photography/media paths.
**Files to read first**:
- `server/routers/photography.ts`
- `server/services/liveCatalogService.ts`

**Acceptance Criteria**:
- [ ] Upload handles: missing file, wrong format, oversized file
- [ ] Live catalog service handles: product with no images, deleted product images
- [ ] Demo-mode DB fallback works (see commit `726d4de`)
- [ ] `pnpm check && pnpm test` passes

**GATE 5**: Show verification output.

---

### Phase 6: Linear Sync & Final Deliverables

#### Task 6.1: Build Ticket-to-Commit Matrix

After all implementation, produce this exact table:

```
| Ticket  | Linear Status (Before) | Code Truth | Evidence (file:line or commit) | Action Taken |
|---------|----------------------|------------|-------------------------------|--------------|
| TER-93  | ...                  | ...        | ...                           | ...          |
| TER-96  | ...                  | ...        | ...                           | ...          |
| ...     | ...                  | ...        | ...                           | ...          |
```

Every row must have concrete evidence — a file path with line number, or a commit hash.

#### Task 6.2: Create PR(s)

- One PR per logical group (backend fixes, E2E fixes, tech debt)
- Each PR description includes the ticket-to-commit matrix for its scope
- All PRs target `main`

#### Task 6.3: Remaining Blockers List

Produce a final list:

```
## Remaining Blockers to MVP-Ready Golden Flows

[Only items that are TRULY still open after this work]

1. [ticket] - [what's still blocking and why]
2. ...

If empty: "All Golden Flow issues closed. Zero blockers remain."
```

---

## VERIFICATION GATES SUMMARY

| Gate | When | Command | Required Output |
|------|------|---------|-----------------|
| 1A | After Phase 1 Task 1 | `pnpm test -- --grep "schema"` | Test results showing pass/fail |
| 1B | After Phase 1 Task 2 | Seed script grep | Placeholder/fallback evidence |
| 2A | After Task 2.1 | `pnpm test -- --grep "purchaseOrder"` | PO test results |
| 2B | After Task 2.2 | Schema grep + `pnpm test -- --grep "sample"` | Column match + test results |
| 2C | After Task 2.3 | Navigation grep | Route/button evidence |
| 2D | After Task 2.4 | Label/validator grep | Alignment evidence |
| 3 | After ALL Phase 3 | `pnpm check && pnpm lint && pnpm test && pnpm build` | Full pass |
| 4 | After ALL Phase 4 | `pnpm check && pnpm lint && pnpm test && pnpm build` | Full pass |
| 5 | After Phase 5 | `pnpm check && pnpm test` | Pass |
| FINAL | End | `pnpm check && pnpm lint && pnpm test && pnpm build` | Full pass, zero errors |

---

## QA PROTOCOL (5-LENS) — MANDATORY AFTER ALL IMPLEMENTATION

Run this AFTER Phase 5, BEFORE Phase 6.

### Lens 1: Static Pattern Scan
```bash
git diff HEAD --unified=0 | grep -E "(any|\.id \|\| 1|\.id \?\? 1|input\.createdBy|input\.userId|db\.delete\()"
```
Expected: ZERO matches. Any match = P0 reject.

### Lens 2: Execution Path Tracing
For every function you modified, trace:
- All entry points (router procedures, component renders)
- All branches (if/else, switch, try/catch)
- Implicit else paths (what happens when condition is false?)
- Document at least 3 modified functions' full paths

### Lens 3: Data Flow Analysis
For every mutation you modified (PO create, sample create, product create):
- INPUT: What Zod schema validates
- TRANSFORMS: What mappings/lookups happen
- OUTPUT: What gets inserted/returned
- NULL HANDLING: What happens with nullable fields?

### Lens 4: Adversarial Scenarios (Minimum 10)
Generate test scenarios that try to break your changes:
1. PO create with vendorId that has no supplier_profile mapping
2. PO create with supplierClientId where client.isSeller = false
3. Sample create with empty products array
4. Sample create with product that doesn't exist
5. Product create with exact duplicate name+brand (race condition)
6. Direct intake with site value containing special characters
7. Client ledger navigation when client has zero transactions
8. Pick-pack search with Cmd+K when no orders exist
9. Inventory adjustment on a CLOSED batch
10. Media upload with 0-byte file

### Lens 5: Integration & Blast Radius
For every file you changed, list:
- What imports this file?
- What does this file import?
- Could your change break any downstream consumer?

---

## FIX CYCLE

For each issue found by QA:

1. Fix the issue
2. Re-run the specific verification that failed
3. Paste the new output showing it passes
4. If fixing this issue could affect other tasks, re-run those verification gates too

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report:
- What was fixed
- What still fails
- Your analysis of why it's still failing
- Suggested approach for resolution

Do NOT enter an infinite fix loop.

---

## COMPLETION CHECKLIST

Do NOT declare this work complete until every box is checked with evidence:

- [ ] All 6 phases completed
- [ ] All verification gates passed (with pasted output)
- [ ] `pnpm check` passes (zero TypeScript errors)
- [ ] `pnpm lint` passes (zero lint errors)
- [ ] `pnpm test` passes (all tests)
- [ ] `pnpm build` succeeds
- [ ] QA 5-lens protocol completed (all 5 lenses documented)
- [ ] All QA findings addressed or explicitly documented
- [ ] No TODO/FIXME/HACK comments introduced
- [ ] No console.log statements left in production code (console.info/warn OK for existing patterns)
- [ ] No `any` types introduced
- [ ] No fallback user IDs introduced
- [ ] No hard deletes introduced
- [ ] No new vendors table references introduced
- [ ] Ticket-to-commit matrix produced
- [ ] PR(s) created with descriptions
- [ ] Remaining blockers list produced (may be empty)

---

## MANDATORY RULES REPEATED (Context Window Protection)

1. **NO PHANTOM VERIFICATION.** Prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Check every box above.
3. **NO SILENT ERROR HANDLING.** STOP and report errors.
4. **NO QA SKIPPING.** All 5 lenses are mandatory.
5. **NO HAPPY-PATH-ONLY TESTING.** Test failure cases.
6. **PROOF OF WORK.** Every GATE needs pasted output.
7. **READ BEFORE EDIT.** Always.
8. **ONE THING AT A TIME.** Verify each task before the next.
9. **NO ABANDONED WORK.** Everything you touch must compile and pass.
10. **FORBIDDEN PATTERNS.** No `any`, no fallback IDs, no hard deletes, no vendors table in new code.
