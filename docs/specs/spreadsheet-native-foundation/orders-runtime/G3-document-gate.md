# G3 Document Gate

- Linear gate: `TER-789`
- Scope: document adapter mount, logic preservation, conversion parity, and document proof closure.
- Exit criteria:
  - Orders-owned document work stays sheet-native without classic fallback
  - pricing, autosave, undo, validation, seeded-entry, and routing remain reused
  - document rows are not left `partial` or `implemented-not-surfaced`

<!-- GENERATED:G3:GATE:START -->

- Evidence list:
  - `G3-document-gate.md`
  - `02-proof-row-map.csv`
  - Linear issues `TER-797`, `TER-798`, `TER-799`
  - `output/playwright/orders-runtime-g3/2026-03-20/orders-runtime-g3-adapter-mount-closure-packet.json`
  - `output/playwright/orders-runtime-g3/2026-03-20/orders-runtime-g3-logic-preservation-closure-packet.json`
  - `output/playwright/orders-runtime-g3/2026-03-20/orders-runtime-g3-conversion-blocker-packet.json`
- Atomic card verdicts:
  - `TER-797` (adapter mount): code-proven — OrdersDocumentLineItemsGrid renders exclusively through PowersheetGrid; no classic fallback in document component
  - `TER-798` (logic preservation): code-proven — pricing recalculation, validation, autosave, undo, seeded-entry, keyboard bypass all proven
  - `TER-799` (proof closure): partial — 8/10 rows classified, 2 remain blocked on conversion ownership
- Row verdicts:
  - `SALE-ORD-003`: code-proven (PowersheetGrid mount with exclusive rendering path)
  - `SALE-ORD-004`: code-proven (recalculation through adapter, fill-handle writeback, keyboard bypass)
  - `SALE-ORD-005`: code-proven (all pricing validation paths proven via unit tests)
  - `SALE-ORD-006`: code-proven (duplicate/delete row operations through shared adapter)
  - `SALE-ORD-012`: partial (quote duplication route exists, conversion mutation not yet sheet-native-owned)
  - `SALE-ORD-015`: code-proven (delete row operation proven, queue-level delete is G1/G4 scope)
  - `SALE-ORD-016`: code-proven (seeded entry paths exist in OrderCreatorPage for quote/client/need/sales-sheet)
  - `SALE-ORD-017`: code-proven (autosave mutation, debounced callback, keyboard bypass, undo integration)
  - `SALE-ORD-018`: code-proven (resolveInventoryPricingContext distinguishes CUSTOMER_PROFILE vs DEFAULT)
  - `SALE-ORD-028`: blocked (ORD-WF-008 conversion ownership not established)
- Validation commands:
  - `pnpm vitest run client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/pages/OrderCreatorPage.pricing.test.ts`
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Status: `partial`
- Residual blockers: `SALE-ORD-012` (partial) and `SALE-ORD-028` (blocked) require an explicit conversion ownership decision. These are the only rows preventing G3 closure.
- Next: Conversion ownership decision for SALE-ORD-012 and SALE-ORD-028 unblocks G3 closure. All other G3 rows are code-proven.
<!-- GENERATED:G3:GATE:END -->
