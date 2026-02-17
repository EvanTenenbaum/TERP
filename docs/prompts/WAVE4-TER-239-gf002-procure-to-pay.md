# TER-239: Fix GF-002 Procure-to-Pay E2E Flow

**Classification**: Medium | **Mode**: STRICT | **Estimate**: 8h
**Linear**: TER-239 | **Wave**: 4

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a checkmark with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with GATE, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.
7. **STRICT MODE RULES.** This task modifies E2E test files that exercise real API endpoints. Do NOT add optimistic UI assertions — verify against actual application behavior.
8. **ONE THING AT A TIME.** Complete and verify each task before starting the next.
9. **SCOPE GUARD.** Only touch files listed in the "Files to Modify" section. If you discover a bug in a router or UI component, document it in your return report — do NOT fix it.

---

## Mission Brief

The GF-002 Procure-to-Pay golden flow test (`tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts`) is severely incomplete. It currently has only 70 lines covering PO page navigation and a fragile check for a receive button. The entire payment lifecycle — PO creation through bill payment — is untested.

This task rewrites the test to cover the full P2P lifecycle:

1. **Create PO**: Navigate to `/purchase-orders`, create a new PO with a supplier and at least one line item
2. **Submit PO**: Transition status DRAFT → SENT via the submit action
3. **Confirm PO**: Transition status SENT → CONFIRMED via the confirm action
4. **Receive Items**: Call `poReceiving.receiveGoodsWithBatch` via API (no receiving UI exists)
5. **Record Bill**: Create a vendor bill linked to the PO via `accounting.bills.create`
6. **Pay Bill**: Record full payment via `accounting.bills.recordPayment`

The companion oracle YAML (`tests-e2e/oracles/procurement/gf-002-procure-to-pay.oracle.yaml`) must be created with `expected_db` assertions for each step.

**Critical constraint**: PO receiving has no dedicated frontend UI. Steps 4–6 must use the tRPC API directly via `page.request` (not UI interactions). This is documented in the spec and is an expected limitation of the current implementation.

**Spec**: `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md` (880 lines — read it)

---

## Files to Modify

| File                                                              | Action  | Notes                                                      |
| ----------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts`            | Rewrite | Replace 70-line stub with full lifecycle test              |
| `tests-e2e/oracles/procurement/gf-002-procure-to-pay.oracle.yaml` | Create  | New oracle YAML file — create the `procurement/` directory |

Do NOT modify any router, schema, or UI component file. Document any issues found in your return report.

---

## Pre-Work: Gather Context

Before writing any code, read these files in full:

1. **Read the full GF-002 spec**: `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md`
2. **Read the existing test**: `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts`
3. **Read the auth fixtures**: `tests-e2e/fixtures/auth.ts` (understand `loginAsAdmin`, `loginAsInventoryManager`)
4. **Read an existing oracle YAML for format**: `tests-e2e/oracles/inventory/create-batch.oracle.yaml`
5. **Read a payment oracle for format**: `tests-e2e/oracles/crm/transactions-record-payment.oracle.yaml`
6. **Read a complete golden flow test for structure patterns**: `tests-e2e/golden-flows/gf-005-pick-pack-complete.spec.ts`

Run the audit command to understand what data-testids exist on the PO page:

```bash
grep -rn "data-testid" client/src/pages/PurchaseOrdersPage.tsx client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx 2>/dev/null | head -60
```

Also find the tRPC router to understand actual endpoint shapes:

```bash
grep -n "submit\|confirm\|create\|status" server/routers/purchaseOrders.ts | head -40
grep -n "receiveGoodsWithBatch\|receive\b" server/routers/poReceiving.ts | head -30
grep -n "bills\.create\|recordPayment\|bills\.update" server/routers/accounting.ts | head -30
```

GATE 0: Before writing any test code, document:

- What `data-testid` attributes exist on the PO creation dialog and table rows?
- What is the exact input schema for `purchaseOrders.create` (what fields are required)?
- What is the exact input schema for `poReceiving.receiveGoodsWithBatch`?
- What is the exact input schema for `accounting.bills.create`?
- Does a `tests-e2e/oracles/procurement/` directory already exist?

---

## Architecture Decision: API-Backed Test Strategy

Because receiving, bill creation, and payment have no dedicated UI, the test uses a **hybrid approach**:

- **UI steps** (PO creation, status updates): Use Playwright browser interactions
- **API steps** (receiving, bills, payment): Use `page.request.post` to call tRPC endpoints directly

This is the correct approach for testing APIs without a UI. It mirrors what a real user would do — the API IS the interface until the UI is built.

The tRPC HTTP endpoint pattern for mutations is:

```
POST /api/trpc/<router>.<procedure>
Content-Type: application/json
Body: { "json": <input-object> }
```

For nested routers (e.g., `accounting.bills.create`):

```
POST /api/trpc/accounting.bills.create
```

Always verify the response status and check that the JSON contains no `error` field before proceeding.

---

## Task 1: Rewrite `gf-002-procure-to-pay.spec.ts`

**File**: `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts`

**What**: Replace the existing 70-line stub with a structured test suite covering the complete P2P lifecycle.

### Test Structure

Organize the file into these `test.describe` blocks:

```
GF-002: Procure-to-Pay Golden Flow (tagged: tier1)
  ├── "GF-002 P2P-01: PO page loads and displays correctly"  [UI]
  ├── "GF-002 P2P-02: Create PO with supplier and line items"  [UI]
  ├── "GF-002 P2P-03: Submit PO (DRAFT → SENT)"  [UI + API fallback]
  ├── "GF-002 P2P-04: Confirm PO (SENT → CONFIRMED)"  [API]
  ├── "GF-002 P2P-05: Receive goods against confirmed PO"  [API]
  ├── "GF-002 P2P-06: Record bill from PO"  [API]
  └── "GF-002 P2P-07: Full P2P lifecycle (happy path)"  [API orchestration]
```

Tests P2P-01 through P2P-06 test individual steps in isolation. P2P-07 is the orchestrated end-to-end happy path that runs the entire lifecycle as a single flow.

### Authentication

Use `loginAsAdmin` from `../fixtures/auth` for all tests. The Super Admin role has all permissions required (`authenticated`, `accounting:create`, `accounting:update`, `accounting:read`).

### Helper: `callTrpc`

Define a helper at the top of the file for direct API calls:

```typescript
async function callTrpc<T>(
  page: Page,
  endpoint: string,
  input: Record<string, unknown>
): Promise<T> {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
  const response = await page.request.post(`${baseUrl}/api/trpc/${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    data: { json: input },
  });

  if (!response.ok()) {
    throw new Error(
      `tRPC call to ${endpoint} failed: ${response.status()} ${await response.text()}`
    );
  }

  const body = (await response.json()) as {
    result?: { data?: { json?: T } };
    error?: unknown;
  };
  if (body.error) {
    throw new Error(
      `tRPC error from ${endpoint}: ${JSON.stringify(body.error)}`
    );
  }

  return body.result?.data?.json as T;
}
```

### Helper: `findFirstSupplierId`

The test needs a valid `supplierClientId` (a client with `isSeller=true`). Add a helper that fetches one:

```typescript
async function findFirstSupplierId(page: Page): Promise<number> {
  const result = await callTrpc<{ items: Array<{ id: number }> }>(
    page,
    "clients.list",
    { clientTypes: ["seller"], limit: 1 }
  );
  if (!result?.items?.length) {
    throw new Error(
      "No suppliers found — seed data required (run pnpm seed:all-defaults)"
    );
  }
  return result.items[0].id;
}
```

### Helper: `findFirstProductId`

```typescript
async function findFirstProductId(page: Page): Promise<number> {
  const result = await callTrpc<{ items: Array<{ id: number }> }>(
    page,
    "inventory.list",
    { limit: 1 }
  );
  if (!result?.items?.length) {
    throw new Error(
      "No products found — seed data required (run pnpm seed:all-defaults)"
    );
  }
  return result.items[0].id;
}
```

**Note**: If `inventory.list` does not exist or returns a different shape, check the actual router and adjust. Document the discrepancy.

### P2P-01: Page Load

Navigate to `/purchase-orders`. Assert:

- No JavaScript console errors
- Page heading contains "Purchase Order" (case-insensitive)
- Either a table, list, or "no purchase orders" empty state is visible

Use `page.on("pageerror", ...)` to capture JS errors. Fail if any are recorded.

### P2P-02: Create PO via UI

```typescript
test("GF-002 P2P-02: Create PO with supplier and line items", async ({
  page,
}) => {
  await loginAsAdmin(page);
  const supplierId = await findFirstSupplierId(page);

  // Navigate to PO page
  await page.goto("/purchase-orders");
  await page.waitForLoadState("networkidle");

  // Click the create button
  const createBtn = page
    .locator(
      '[data-testid="create-po-btn"], button:has-text("New Purchase Order"), button:has-text("Create PO"), button:has-text("New PO")'
    )
    .first();
  await expect(createBtn).toBeVisible({ timeout: 10000 });
  await createBtn.click();

  // Wait for the dialog/form
  await page.waitForSelector(
    '[data-testid="po-create-dialog"], [role="dialog"], .po-form',
    { timeout: 10000 }
  );

  // If a supplier select exists, the test documents that UI path
  // If the supplier dropdown is pre-populated via tRPC, look for it
  const supplierSelect = page
    .locator(
      '[data-testid="po-supplier-select"], select[name*="supplier"], [data-testid="supplier-select"]'
    )
    .first();

  if (await supplierSelect.isVisible().catch(() => false)) {
    // UI: select the supplier
    await supplierSelect.selectOption({ index: 1 });
  }
  // If no UI supplier select, the PO must be created via API — fall through to P2P-07

  // Take screenshot as evidence
  await page.screenshot({
    path: "test-results/gf-002-p2p-02-create-dialog.png",
  });

  // Close dialog (Escape)
  await page.keyboard.press("Escape");
});
```

### P2P-04 through P2P-06: API-backed Tests

Each of these tests creates a full PO via the API as setup, then tests one specific step.

For P2P-04 (Confirm PO):

```typescript
// Create PO via API
const po = await callTrpc<{ id: number; poNumber: string }>(
  page,
  "purchaseOrders.create",
  {
    supplierClientId: supplierId,
    items: [{ productId, quantityOrdered: 10, unitCost: 50 }],
  }
);
// Submit it (DRAFT → SENT)
await callTrpc(page, "purchaseOrders.submit", { id: po.id });
// Confirm it (SENT → CONFIRMED)
await callTrpc(page, "purchaseOrders.confirm", { id: po.id });
// Verify via getById
const confirmed = await callTrpc<{ purchaseOrderStatus: string }>(
  page,
  "purchaseOrders.getById",
  { id: po.id }
);
expect(confirmed.purchaseOrderStatus).toBe("CONFIRMED");
```

For P2P-05 (Receive goods): Use `poReceiving.receiveGoodsWithBatch` after confirming the PO. Verify batch is created by calling `poReceiving.getReceivingHistory`.

For P2P-06 (Record bill): Use `accounting.bills.create` with `referenceType: "PURCHASE_ORDER"` and `referenceId: po.id`. Then call `accounting.bills.recordPayment` for the full amount. Verify bill status becomes `PAID`.

### P2P-07: Full Lifecycle Happy Path

This is the most important test. It runs the complete flow in sequence:

```typescript
test("GF-002 P2P-07: Full P2P lifecycle (happy path)", async ({ page }) => {
  await loginAsAdmin(page);
  const supplierId = await findFirstSupplierId(page);
  const productId = await findFirstProductId(page);

  // Step 1: Create PO
  // Step 2: Submit PO
  // Step 3: Confirm PO
  // Step 4: Receive goods
  // Step 5: Record bill
  // Step 6: Pay bill

  // Assert final state:
  // - PO status is RECEIVED
  // - At least one batch was created with INTAKE movement
  // - Bill status is PAID
  // - Bill amountDue is 0 (or <= 0.01 for float rounding)
});
```

Each step should include an `expect` assertion before moving to the next. If a step fails, the test should fail with a descriptive error message.

### Resilience Guidelines

- Use `data-testid` selectors wherever possible; fall back to text-content selectors
- Add `{ timeout: 10000 }` to all `waitFor` and `isVisible` calls
- For conditional UI elements (e.g., the supplier select might not render if the API call is slow), use `.catch(() => false)` pattern
- Avoid `page.waitForTimeout` — prefer `waitForLoadState("networkidle")` or `waitForSelector`
- Tag the describe block with `@tier1` via `test.describe.configure({ tag: "@tier1" })`

### File Header

```typescript
/**
 * Golden Flow Test: GF-002 Procure-to-Pay
 *
 * Full lifecycle: PO creation → submit → confirm → receive → bill → payment
 *
 * Architecture note: PO receiving, bill creation, and payment have no dedicated UI.
 * Steps 4–6 use the tRPC API directly via page.request.post (hybrid approach).
 * This is intentional — see GF-002 spec section "Not Yet Implemented".
 *
 * Spec: docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md
 * Linear: TER-239
 */
```

**Acceptance Criteria**:

- [ ] File has no `import ... from "any"` or `: any` type usage
- [ ] All 7 tests are present and properly named with `GF-002` prefix
- [ ] `callTrpc` helper has explicit return type parameter usage
- [ ] P2P-07 covers all 6 lifecycle steps with `expect` assertions after each
- [ ] Tests use `loginAsAdmin` (not `loginAsInventoryManager` — accounting permissions required)
- [ ] No `page.waitForTimeout` calls (use `waitForLoadState` or `waitForSelector` instead)

GATE 1: After writing the test file, run TypeScript check:

```bash
pnpm check 2>&1 | tail -30
```

Expected: Zero TypeScript errors. Fix any before proceeding.

---

## Task 2: Create Oracle YAML

**File**: `tests-e2e/oracles/procurement/gf-002-procure-to-pay.oracle.yaml`

**What**: Create a new oracle YAML that asserts the full P2P database state after a complete lifecycle run.

First, create the directory:

```bash
mkdir -p tests-e2e/oracles/procurement
```

### Oracle Structure

The oracle follows the same format as existing oracles (see `tests-e2e/oracles/inventory/create-batch.oracle.yaml` and `tests-e2e/oracles/crm/transactions-record-payment.oracle.yaml`).

```yaml
# Oracle: P2P.GF002.FullLifecycle
# GF-002: Complete Procure-to-Pay golden flow DB assertions
# Linear: TER-239

flow_id: "P2P.GF002.FullLifecycle"
description: "Verify DB state after complete Procure-to-Pay lifecycle: PO creation, submission, confirmation, receiving, bill recording, and full payment"
role: "SuperAdmin"
seed_profile: "basic_sales"
tags:
  - tier1
  - procurement
  - golden-flow
  - mutation
  - financial
timeout: 90000
```

### Preconditions

```yaml
preconditions:
  ensure:
    - entity: "user"
      ref: "seed:user.super_admin"
      where:
        email: "qa.superadmin@terp.test"
        status: "active"
    - entity: "client"
      ref: "seed:client.test_supplier"
      where:
        deleted_at_null: true
        is_seller: true
  create:
    - entity: "product"
      ref: "temp:test_product"
      data:
        name: "GF-002 Test Product {{timestamp}}"
```

### Steps

The oracle steps exercise the full lifecycle using API actions. Follow the `steps` pattern from existing oracles, using `action: navigate` and `action: wait` for UI, and `action: api_call` (or the equivalent pattern in the oracle executor — check `tests-e2e/oracles/executor.ts` for supported action types) for API steps.

If the oracle executor does not support `action: api_call`, use UI navigation steps to the PO page, and document in the oracle file that receiving/billing assertions are DB-only (precondition data created via seed).

### `expected_db` Block

This is the most important part. Assert the following after the full lifecycle:

```yaml
expected_db:
  # 1. PO exists and is in RECEIVED status
  purchase_orders:
    - where:
        purchaseOrderStatus: "RECEIVED"
        supplierClientId_not_null: true
      expect:
        poNumber_not_null: true
        total_gte: 0
        createdBy_not_null: true
      count_gte: 1

  # 2. PO items exist with received quantities
  purchase_order_items:
    - where:
        quantityReceived_gt: 0
      expect:
        quantityOrdered_gt: 0
        unitCost_gte: 0
        totalCost_not_null: true
      count_gte: 1

  # 3. Batch created from receiving
  batches:
    - where:
        deletedAt_null: true
      expect:
        onHandQty_gte: 0
        unitCogs_not_null: true
        productId_not_null: true
        lotId_not_null: true
      count_gte: 1

  # 4. Lot created during receiving session
  lots:
    - where:
        deletedAt_null: true
        supplierClientId_not_null: true
      expect:
        code_not_null: true
      count_gte: 1

  # 5. Inventory movement of type INTAKE created
  inventory_movements:
    - where:
        inventoryMovementType: "INTAKE"
        referenceType: "PO_RECEIPT"
      expect:
        quantityChange_gt: 0
        batchId_not_null: true
        performedBy_not_null: true
      count_gte: 1

  # 6. Bill created and linked to PO
  bills:
    - where:
        referenceType: "PURCHASE_ORDER"
        deletedAt_null: true
      expect:
        billNumber_not_null: true
        vendorId_not_null: true
        totalAmount_gt: 0
        createdBy_not_null: true
      count_gte: 1

  # 7. Bill is fully paid
  bills:
    - where:
        referenceType: "PURCHASE_ORDER"
        status: "PAID"
        deletedAt_null: true
      expect:
        amountPaid_gt: 0
        amountDue_lte: 0
      count_gte: 1

  invariants:
    - name: "PO total matches sum of line item totals"
      query: |
        SELECT po.total, SUM(poi.total_cost) AS items_total
        FROM purchase_orders po
        JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
        WHERE po.purchase_order_status = 'RECEIVED'
        GROUP BY po.id
        HAVING ABS(po.total - items_total) <= 0.01
      assert: "count >= 1"

    - name: "Bill amountDue = totalAmount - amountPaid"
      query: |
        SELECT ABS(amount_due - (total_amount - amount_paid)) AS diff
        FROM bills
        WHERE reference_type = 'PURCHASE_ORDER' AND status = 'PAID'
          AND deleted_at IS NULL
      assert: "diff <= 0.01"

    - name: "Inventory movement quantityAfter consistency"
      query: |
        SELECT COUNT(*) AS consistent
        FROM inventory_movements
        WHERE inventory_movement_type = 'INTAKE'
          AND reference_type = 'PO_RECEIPT'
          AND ABS(quantity_after - (quantity_before + quantity_change)) <= 0.0001
      assert: "consistent >= 1"
```

**Acceptance Criteria**:

- [ ] Oracle `flow_id` is `"P2P.GF002.FullLifecycle"`
- [ ] Tags include `tier1`, `procurement`, `golden-flow`
- [ ] `expected_db` covers all 7 tables: `purchase_orders`, `purchase_order_items`, `batches`, `lots`, `inventory_movements`, `bills` (existence), `bills` (paid status)
- [ ] All 3 invariants are present
- [ ] YAML is valid (no syntax errors)

GATE 2: Validate YAML syntax:

```bash
python3 -c "import yaml; yaml.safe_load(open('tests-e2e/oracles/procurement/gf-002-procure-to-pay.oracle.yaml'))" && echo "YAML valid"
```

Expected: `YAML valid`. Fix any syntax errors before proceeding.

---

## Task 3: Verify Oracle is Discoverable

The oracle runner loads oracles from directories. Check how the index loads them:

```bash
grep -n "procurement\|loadTier1\|glob\|readdir" tests-e2e/oracles/index.ts | head -30
```

If the oracle index loads all `.oracle.yaml` files recursively, no changes are needed. If it loads specific directories, add `procurement` to the list.

GATE 3: Verify the oracle is discovered:

```bash
node -e "
const { loadTier1Oracles } = require('./tests-e2e/oracles/index.ts');
const oracles = loadTier1Oracles();
const found = oracles.find(o => o.flow_id === 'P2P.GF002.FullLifecycle');
console.log(found ? 'FOUND: ' + found.flow_id : 'NOT FOUND');
" 2>&1 || echo "Node direct run may require ts-node — check by running pnpm test with grep"
```

If the above doesn't work cleanly, verify by checking the index manually:

```bash
grep -rn "oracle.yaml\|oracles\/" tests-e2e/oracles/index.ts | head -20
```

Document the discovery mechanism. If changes to `index.ts` are required to register the new `procurement/` directory, make that change and add it to the "Files Modified" list.

---

## Task 4: Full Verification Suite

GATE 4: Run ALL four verification commands and paste the full output:

```bash
pnpm check 2>&1 | tail -40
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

All four must pass with zero errors before proceeding to QA.

---

## QA Protocol (3-Lens for STRICT Mode)

### Lens 1: Forbidden Pattern Scan

```bash
# No `any` types in new test file
grep -n ": any\b" tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts

# No vendor table references (use clients with isSeller)
grep -n "vendor\b" tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts

# No fallback user IDs
grep -n "|| 1\|?? 1\|input\.userId\|input\.createdBy" tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts

# Confirm tier1 tag is present
grep -n "tier1\|@tier1" tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts

# Confirm oracle has tier1 tag
grep -n "tier1" tests-e2e/oracles/procurement/gf-002-procure-to-pay.oracle.yaml
```

Expected for `any` types: **zero matches**.
Expected for fallback IDs: **zero matches**.
Expected for tier1: **at least one match in each file**.

### Lens 2: Lifecycle Coverage Audit

Manually verify each step in P2P-07 has an `expect` assertion:

| Step           | What is asserted                                        | Selector/Value            |
| -------------- | ------------------------------------------------------- | ------------------------- |
| PO created     | `po.id` is a number, `po.poNumber` matches `PO-` prefix | API response              |
| PO submitted   | `status === "SENT"`                                     | Via `getById`             |
| PO confirmed   | `status === "CONFIRMED"`                                | Via `getById`             |
| Goods received | `receivingHistory.length >= 1` OR batch created         | Via `getReceivingHistory` |
| Bill created   | `bill.id` is a number                                   | API response              |
| Bill paid      | `bill.status === "PAID"` AND `bill.amountDue <= 0.01`   | Via `getById`             |

### Lens 3: Oracle DB Coverage Audit

Verify the oracle `expected_db` block covers all cross-flow touchpoints from the spec:

| Table                  | Assertion Present                             | Cross-Flow       |
| ---------------------- | --------------------------------------------- | ---------------- |
| `purchase_orders`      | `purchaseOrderStatus = "RECEIVED"`            | Core P2P         |
| `purchase_order_items` | `quantityReceived > 0`                        | Core P2P         |
| `batches`              | `onHandQty >= 0`, `unitCogs not null`         | GF-007 inventory |
| `lots`                 | `code not null`, `supplierClientId not null`  | GF-007 inventory |
| `inventory_movements`  | `type = INTAKE`, `referenceType = PO_RECEIPT` | GF-007 inventory |
| `bills` (exists)       | `referenceType = PURCHASE_ORDER`              | GF-006 AP        |
| `bills` (paid)         | `status = PAID`, `amountDue <= 0`             | GF-006 AP        |

All rows must be present. If any is missing, the oracle is incomplete.

---

## Fix Cycle

For each issue found by QA:

1. Fix the issue
2. Re-run the specific verification command that failed
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report with full error output.

---

## Known Issues to Document (Do NOT Fix)

The GF-002 spec documents these known issues. If you encounter them, note them in your return report but do NOT fix them:

1. **`purchaseOrders.create` accepts `createdBy` from input** — Security violation noted in spec (line 548–561). The test should use the API as-is and document the issue.
2. **PO receiving has no UI** — By design. Use API approach documented in Task 1.
3. **Duplicate inventory movements in `receiveGoodsWithBatch`** — Spec line 850. The test should pass even if two movements are created per item; use `count_gte: 1` in the oracle, not `count: 1`.
4. **`vendorId` still required in schema** — If the API requires a `vendorId` alongside `supplierClientId`, pass a valid vendor ID or skip the `vendorId` and document whether the API accepts `supplierClientId` alone.
5. **Hard delete on POs** — If you need to clean up test data between tests, note that `purchaseOrders.delete` is a hard delete. Do not add cleanup logic — use unique test data per test run.

---

## Rollback Plan

This task only modifies test files and adds a new oracle YAML. There is no schema change and no production code change.

**Rollback if test file breaks CI**:

```bash
git checkout -- tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts
```

**Rollback oracle**:

```bash
rm tests-e2e/oracles/procurement/gf-002-procure-to-pay.oracle.yaml
rmdir tests-e2e/oracles/procurement 2>/dev/null || true
```

**Risk level**: LOW. Only test infrastructure changes. No production code is touched.

---

## Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

- [ ] `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts` fully rewritten with 7 named tests
- [ ] `tests-e2e/oracles/procurement/gf-002-procure-to-pay.oracle.yaml` created
- [ ] Oracle YAML passes Python syntax check (GATE 2 output pasted)
- [ ] Oracle is discoverable by the oracle runner (GATE 3 documented)
- [ ] `callTrpc` helper has proper TypeScript generics (no `: any`)
- [ ] P2P-07 covers all 6 lifecycle steps with `expect` assertions after each step
- [ ] Tests use `loginAsAdmin` (not `loginAsInventoryManager`)
- [ ] Oracle has `tier1` tag and `expected_db` covers all 7 tables
- [ ] `pnpm check` passes — paste output
- [ ] `pnpm lint` passes — paste output
- [ ] `pnpm test` passes — paste output (or documents which tests are data-dependent and skip correctly)
- [ ] `pnpm build` passes — paste output
- [ ] Lens 1 forbidden pattern scan shows zero `any` types and zero fallback IDs
- [ ] Lens 2 lifecycle coverage verified for all 6 P2P steps
- [ ] Lens 3 oracle DB coverage verified for all 7 tables
- [ ] Known issues (5 items above) documented in return report if encountered
- [ ] No TODO/FIXME/HACK comments left in committed code

---

## RULES REPEATED — READ AGAIN

1. **NO PHANTOM VERIFICATION.** Show actual terminal output, not claims.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **SCOPE GUARD.** Only `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts` and `tests-e2e/oracles/procurement/gf-002-procure-to-pay.oracle.yaml`. No router fixes. No UI changes.
4. **STRICT MODE.** Read every file before modifying it. Do not assume API shapes — verify them.
5. **API HYBRID APPROACH IS INTENTIONAL.** The receiving, bill, and payment steps have no UI. Use `page.request.post` to call tRPC directly. This is correct and documented.
