# TER-1070 Runtime Proof Summary

- Date: `2026-04-08`
- Base URL: `http://127.0.0.1:3016`
- Proof fixture: local `terp-test` records rooted at hybrid supplier client `10700`

## Checks

1. Receiving queue shows `Expected Today (1)` and the confirmed proof PO `PO-TER1070`.
2. Opening that queue row creates a receiving draft that preserves `PO-TER1070`, the expected-delivery label, and the new `Show Purchase Order` return action.
3. The receiving draft links back to the purchase-order queue without losing the proof PO context.
4. The hybrid relationship money section shows `Payable Due`, `Net Position`, and ledger continuity from the confirmed PO.
5. The supplier `Supply & Inventory` section shows payable totals, below-range reporting, the latest settlement exception, live batch continuity, and purchase-order history.

## Artifacts

- `receiving-queue-expected-today.png`
- `receiving-draft-po-reference.png`
- `receiving-return-to-po.png`
- `relationship-money-hybrid.png`
- `relationship-supply-settlement.png`
- `summary.json`

## Harness Notes

- The seeded local proof DB did not contain any `purchaseOrders` or `vendor_payables`, so this proof used a minimal idempotent TER-1070 fixture inserted directly into the local `terp-test` database.
- The fixture created one hybrid supplier/client, one live consignment batch, one confirmed PO due today, one partial supplier payable, and one below-range sale tied to the same supplier batch.
- This was a proof harness action only. No product code depends on those specific IDs or rows.
