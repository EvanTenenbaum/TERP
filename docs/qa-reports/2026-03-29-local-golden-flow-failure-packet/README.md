# TERP Local Golden Flow Failure Packet

- Audit date: 2026-03-29
- Scope: `GF-002` through `GF-004`
- Environment: local TERP on `http://127.0.0.1:4317`
- Database: local `terp-test` on `127.0.0.1:3307`
- Playwright config: `.playwright-cli/terp-golden-flows.playwright.config.ts`
- Purpose: turn the earlier broad golden-flow red run into a handoff-ready packet with focused, reproducible failure evidence

## Executive Summary

The targeted reruns split into three different failure classes:

1. `GF-002` is failing on **UI contract drift**.
   The Purchase Orders workspace renders, but the tests are looking for an older page-title and primary-action contract.

2. `GF-003` and the main `GF-004` invoice-payment flow are failing on a **seed/data precondition blocker**.
   The business helper cannot find a `LIVE` batch with available stock, and a direct DB query confirmed the local test DB currently contains only `AWAITING_INTAKE` batches.

3. `GF-004` GL verification is failing on **accounting surface mismatch**.
   The accounting workspace renders, but the tests expect older heading/table hooks that are not present in the current tabbed UI.

## Environment And Commands

Local server launch used for the focused reruns:

```bash
DATABASE_URL='mysql://root:rootpassword@127.0.0.1:3307/terp-test' \
TEST_DATABASE_URL='mysql://root:rootpassword@127.0.0.1:3307/terp-test' \
JWT_SECRET='terp-local-e2e-jwt-secret-2026-000000000000' \
QA_AUTH_ENABLED=true \
DISABLE_RATE_LIMIT=true \
SKIP_LOCAL_DB_BOOTSTRAP=1 \
PORT=4317 \
NODE_ENV=development \
pnpm exec tsx server/_core/index.ts
```

Health proof before targeted reruns:

```bash
curl -sS --max-time 10 http://127.0.0.1:4317/health
```

Returned `200` with `status: "healthy"` on `2026-03-29T21:15:30.052Z`.

Targeted reruns:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4317 \
pnpm exec playwright test \
  --config .playwright-cli/terp-golden-flows.playwright.config.ts \
  tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts \
  --project=chromium \
  -g 'GF-002 P2P-01' \
  --output output/playwright/golden-flow-targeted/gf-002-p2p01

PLAYWRIGHT_BASE_URL=http://127.0.0.1:4317 \
pnpm exec playwright test \
  --config .playwright-cli/terp-golden-flows.playwright.config.ts \
  tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts \
  --project=chromium \
  -g 'GF-002 P2P-02' \
  --output output/playwright/golden-flow-targeted/gf-002-p2p02

PLAYWRIGHT_BASE_URL=http://127.0.0.1:4317 \
pnpm exec playwright test \
  --config .playwright-cli/terp-golden-flows.playwright.config.ts \
  tests-e2e/golden-flows/gf-003-order-to-cash.spec.ts \
  --project=chromium \
  -g 'creates order, generates invoice, records payment, and posts ledger evidence' \
  --output output/playwright/golden-flow-targeted/gf-003

PLAYWRIGHT_BASE_URL=http://127.0.0.1:4317 \
pnpm exec playwright test \
  --config .playwright-cli/terp-golden-flows.playwright.config.ts \
  tests-e2e/golden-flows/gf-004-invoice-payment.spec.ts \
  --project=chromium \
  -g 'marks invoice sent, records partial payment, then completes invoice payment' \
  --output output/playwright/golden-flow-targeted/gf-004-main

PLAYWRIGHT_BASE_URL=http://127.0.0.1:4317 \
pnpm exec playwright test \
  --config .playwright-cli/terp-golden-flows.playwright.config.ts \
  tests-e2e/golden-flows/gf-004-gl-entries.spec.ts \
  --project=chromium \
  --output output/playwright/golden-flow-targeted/gf-004-gl
```

Direct DB query used to confirm the inventory precondition:

```bash
node --input-type=module - <<'EOF'
import mysql from 'mysql2/promise';
const conn = await mysql.createConnection({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'rootpassword',
  database: 'terp-test',
});
const [rows] = await conn.query(`
  SELECT
    batchStatus,
    COUNT(*) AS count,
    SUM(COALESCE(onHandQty,0)) AS onHandQty,
    SUM(COALESCE(reservedQty,0)) AS reservedQty
  FROM batches
  WHERE deleted_at IS NULL
  GROUP BY batchStatus
  ORDER BY count DESC
`);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
EOF
```

Result:

```json
[
  {
    "batchStatus": "AWAITING_INTAKE",
    "count": 14,
    "onHandQty": "2651.0000",
    "reservedQty": "0.0000"
  }
]
```

## Findings

### GF-002: Procure-to-Pay

Source specs:

- `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts:145`
- `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts:205`

#### GF-002 P2P-01

- Result: failed in `18.3s`
- Failure type: UI contract drift
- Assertion: expected purchase-order title heuristic to resolve `true`, received `false`

What the page actually rendered in the Playwright snapshot:

- Top workspace heading: `Procurement`
- Secondary section heading: `Purchase Orders`
- Primary action: `+ New PO`
- Queue content: visible purchase-order grid with 10 rows

Interpretation:

- The page is not blank and the queue is not missing.
- The test is failing because its title heuristic is no longer aligned with the current workspace structure.

Artifacts:

- `output/playwright/golden-flow-targeted/gf-002-p2p01/gf-002-procure-to-pay-GF-0-24ad7-oads-and-displays-correctly-chromium/error-context.md`
- `output/playwright/golden-flow-targeted/gf-002-p2p01/gf-002-procure-to-pay-GF-0-24ad7-oads-and-displays-correctly-chromium/test-failed-1.png`
- `output/playwright/golden-flow-targeted/gf-002-p2p01/gf-002-procure-to-pay-GF-0-24ad7-oads-and-displays-correctly-chromium/trace.zip`

#### GF-002 P2P-02

- Result: failed in `90.0s`
- Failure type: primary-action selector drift
- Assertion: timed out waiting to click `getByRole('button', { name: 'Create PO' }).first()`

What the page actually rendered in the Playwright snapshot:

- The visible button label is `+ New PO`
- The Purchase Orders queue is already visible and populated
- No button with accessible name `Create PO` is present in the captured DOM

Interpretation:

- This is not a queue-load failure.
- The current UI contract appears to have changed from `Create PO` to `+ New PO`.

Artifacts:

- `output/playwright/golden-flow-targeted/gf-002-p2p02/gf-002-procure-to-pay-GF-0-4a1eb-ith-supplier-and-line-items-chromium/error-context.md`
- `output/playwright/golden-flow-targeted/gf-002-p2p02/gf-002-procure-to-pay-GF-0-4a1eb-ith-supplier-and-line-items-chromium/test-failed-1.png`
- `output/playwright/golden-flow-targeted/gf-002-p2p02/gf-002-procure-to-pay-GF-0-4a1eb-ith-supplier-and-line-items-chromium/trace.zip`

### GF-003: Order-to-Cash

Source spec:

- `tests-e2e/golden-flows/gf-003-order-to-cash.spec.ts:49`

Result:

- failed in `3.5s`
- failure type: test-data / fixture precondition blocker

The failing helper:

- `tests-e2e/utils/e2e-business-helpers.ts:98`
- `tests-e2e/utils/e2e-business-helpers.ts:137`

The helper requires:

- `batchStatus === "LIVE"`
- `onHandQty > 0`
- `availableQty > 0`

Observed failure:

- `No LIVE inventory batch with available stock found. Seed sellable inventory before running this flow.`

Direct DB evidence:

- local `batches` inventory only showed `AWAITING_INTAKE`
- no `LIVE` rows were present in the targeted query

Interpretation:

- This run does **not** prove the order-to-cash business logic is broken.
- It proves the local golden-flow seed state is currently insufficient for this flow.

Artifacts:

- `output/playwright/golden-flow-targeted/gf-003/gf-003-order-to-cash-GF-00-8d8c7-t-and-posts-ledger-evidence-chromium/error-context.md`
- `output/playwright/golden-flow-targeted/gf-003/gf-003-order-to-cash-GF-00-8d8c7-t-and-posts-ledger-evidence-chromium/test-failed-1.png`
- `output/playwright/golden-flow-targeted/gf-003/gf-003-order-to-cash-GF-00-8d8c7-t-and-posts-ledger-evidence-chromium/trace.zip`

### GF-004: Invoice And Payment

Source specs:

- `tests-e2e/golden-flows/gf-004-invoice-payment.spec.ts:41`
- `tests-e2e/golden-flows/gf-004-gl-entries.spec.ts:9`
- `tests-e2e/golden-flows/gf-004-gl-entries.spec.ts:27`

#### GF-004 main invoice-payment flow

- Result: failed in `3.0s`
- Failure type: shared seed/data precondition blocker

Observed failure:

- same `findBatchWithStock()` failure as GF-003
- same requirement for a `LIVE` batch with available stock

Interpretation:

- This main flow is blocked by the same upstream inventory precondition.
- Treat it as a local seed blocker first, not an accounting regression.

Artifacts:

- `output/playwright/golden-flow-targeted/gf-004-main/gf-004-invoice-payment-Gol-f84b1-n-completes-invoice-payment-chromium/error-context.md`
- `output/playwright/golden-flow-targeted/gf-004-main/gf-004-invoice-payment-Gol-f84b1-n-completes-invoice-payment-chromium/test-failed-1.png`
- `output/playwright/golden-flow-targeted/gf-004-main/gf-004-invoice-payment-Gol-f84b1-n-completes-invoice-payment-chromium/trace.zip`

#### GF-004 GL entry verification

Observed surface state from Playwright snapshots:

- `/accounting` renders a tabbed finance workspace
- Invoices tab shows `50 visible` invoices and a populated grid
- General Ledger tab renders `General Ledger` as generic UI text and shows `No ledger entries`

##### GL test 1: invoice creation generates GL entries

- Result: failed in `20.7s`
- Failure type: selector / surface mismatch
- Assertion:
  - expected `data-testid="invoices-table"` or a heading matching `/invoices/i`
  - neither locator resolved visible

Interpretation:

- The invoices workspace is present and populated.
- The current UI does not expose the test’s expected table test id or heading-role hook.

Artifacts:

- `output/playwright/golden-flow-targeted/gf-004-gl/gf-004-gl-entries-GF-004-G-303b7-eation-generates-GL-entries-chromium/error-context.md`
- `output/playwright/golden-flow-targeted/gf-004-gl/gf-004-gl-entries-GF-004-G-303b7-eation-generates-GL-entries-chromium/test-failed-1.png`
- `output/playwright/golden-flow-targeted/gf-004-gl/gf-004-gl-entries-GF-004-G-303b7-eation-generates-GL-entries-chromium/trace.zip`

##### GL test 2: payment recording generates GL entries

- Result: failed in `22.0s`
- Failure type: selector expectation plus empty-state mismatch
- Assertion:
  - expected a heading matching `/general ledger/i` or a visible table
  - neither locator resolved visible within `15s`

What the page actually rendered:

- General Ledger tab selected
- `No ledger entries` empty state
- action toolbar present
- no visible ledger table

Interpretation:

- This is not a route crash.
- Either the ledger fixtures are absent for local QA data, or the test’s expected table/heading contract is stale relative to the current workspace shell.

Artifacts:

- `output/playwright/golden-flow-targeted/gf-004-gl/gf-004-gl-entries-GF-004-G-76524-ording-generates-GL-entries-chromium/error-context.md`
- `output/playwright/golden-flow-targeted/gf-004-gl/gf-004-gl-entries-GF-004-G-76524-ording-generates-GL-entries-chromium/test-failed-1.png`
- `output/playwright/golden-flow-targeted/gf-004-gl/gf-004-gl-entries-GF-004-G-76524-ording-generates-GL-entries-chromium/trace.zip`

## Recommended Next Moves

1. Resolve `GF-002` as a UI contract decision.
   If the current workspace labels are intentional, update the procurement golden-flow selectors and copy expectations to `Procurement` / `+ New PO`.
   If the older contract is still the intended user-facing contract, restore those labels/hooks in the page.

2. Unblock `GF-003` and the main `GF-004` flow by fixing local sellable inventory seed state.
   The minimum proof target is at least one `LIVE` batch with `onHandQty > reservedQty`.

3. Re-run `GF-003` and `GF-004` main only after inventory seed is fixed.
   Right now their failures are not high-signal product verdicts.

4. Resolve `GF-004` GL expectations against the current accounting workspace.
   The tests currently assume older heading/test-id/table contracts that do not match the tabbed finance shell captured in the local snapshots.

## Handoff Notes

- This packet intentionally does **not** claim all failures are product regressions.
- `GF-002` looks like selector/copy drift against a real rendered page.
- `GF-003` and `GF-004` main are blocked by local seed prerequisites.
- `GF-004` GL likely needs either fixture enrichment or selector updates, and possibly both.
