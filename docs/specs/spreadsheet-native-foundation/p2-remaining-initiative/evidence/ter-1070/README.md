# TER-1070 Evidence Index

## Scope

- Tranche: `TER-1070`
- Child seam: `TER-1076` consignment payout narrative and out-of-range settlement reporting
- Canonical repo home: `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/`

## Product Outcome

- Receiving drafts now preserve the originating purchase order's expected-delivery date instead of dropping that context when the operator launches receiving.
- The receiving draft grid now exposes a visible `PO Reference` column so operators can see the source PO and expected-delivery context alongside the intake line.
- The receiving draft header now includes a `Show Purchase Order` action that returns directly to the receiving queue.
- The relationship workspace now has refreshed proof for hybrid money summary, supplier payables, below-range settlement exceptions, and purchase-order continuity using the same supplier story.

## Verification Bundle

- `pnpm exec vitest run client/src/lib/calendarDates.test.ts client/src/lib/productIntakeDrafts.test.ts client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx`
  - Pass, `31` tests
- `pnpm exec eslint client/src/lib/calendarDates.ts client/src/lib/calendarDates.test.ts client/src/lib/productIntakeDrafts.ts client/src/lib/productIntakeDrafts.test.ts client/src/components/spreadsheet-native/PurchaseOrderSurface.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx client/src/components/uiux-slice/ProductIntakeSlicePage.tsx`
  - Pass
- `pnpm check`
  - Pass
- `pnpm build`
  - Pass
- Browser/runtime proof:
  - [summary.md](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/summary.md)
  - [summary.json](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/summary.json)
  - [receiving-queue-expected-today.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/receiving-queue-expected-today.png)
  - [receiving-draft-po-reference.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/receiving-draft-po-reference.png)
  - [receiving-return-to-po.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/receiving-return-to-po.png)
  - [relationship-money-hybrid.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/relationship-money-hybrid.png)
  - [relationship-supply-settlement.png](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/output/playwright/ter-1070-ops-continuity-2026-04-08/relationship-supply-settlement.png)
- Claude adversarial review:
  - [2026-04-08-ter-1070-adversarial-review.md](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/reviews/2026-04-08-ter-1070-adversarial-review.md)

## Harness Notes

- The risk-verifier classification for this diff returned `recommended_bundle: ui`, which matched the executed bundle: touched-file tests, targeted eslint, `pnpm check`, `pnpm build`, runtime proof, and a required hostile review.
- The seeded local proof DB contained zero `purchaseOrders` and zero `vendor_payables`, so this tranche used a small idempotent local fixture rooted at hybrid supplier client `10700`.
- The fixture inserted one hybrid client, one supplier profile, one legacy vendor row, one live consignment batch, one confirmed purchase order due on `2026-04-08`, one partial supplier payable, and one below-range sale tied to that supplier batch.
- Those rows exist only in the local `terp-test` proof environment. They are not merged product fixtures and should not be cited as seed coverage on `main`.
- The first packaged `claude-qa-review` wrapper run blocked because the Claude Messages API exhausted its output token budget. The accepted hostile pass came from the narrower direct Claude API fallback recorded in the review doc above.

## User-Verifiable Deliverables

- Opening `/inventory?tab=receiving` in the proof environment now shows `Expected Today (1)` and `PO-TER1070` in the queue.
- Opening that queue row now creates a receiving draft whose context strip includes `PO PO-TER1070` and `Expected 4/8/2026 · Today`.
- The receiving draft grid now shows a `PO Reference` column instead of leaving the source purchase-order context implicit.
- Clicking `Show Purchase Order` from the receiving draft now returns to the receiving queue with the proof PO visible.
- Opening `/clients/10700?section=money` now shows a hybrid money summary with `Payable Due $360.00`, `Net Position -$360.00`, and ledger continuity from `PO-TER1070`.
- Opening `/clients/10700?section=supply-inventory` now shows the supplier settlement context, the below-range exception note, the live supplier batch, and the proof PO in purchase-order history.
