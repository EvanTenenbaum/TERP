# G4 Cross-Surface Gate

- Linear gate: `TER-790`
- Scope: queue parity, support-grid consistency, and workflow target clarity.
- Exit criteria:
  - queue, document, and support surfaces share one spreadsheet grammar
  - workflow actions stay visibly unambiguous before finalize or handoff
  - cross-surface rows stop drifting between separate implementations

<!-- GENERATED:G4:GATE:START -->

- Evidence list:
  - `G4-cross-surface-gate.md`
  - `02-proof-row-map.csv`
  - Linear issues `TER-776`, `TER-777`
  - `output/playwright/orders-runtime-g4/2026-03-20/orders-runtime-g4-workflow-targeting-closure-packet.json`
  - `output/playwright/orders-runtime-g4/2026-03-20/orders-runtime-g4-cross-surface-consistency-closure-packet.json`
  - `output/playwright/orders-runtime-g4/2026-03-20/orders-runtime-g4-queue-return-closure-packet.json`
- Atomic card verdicts:
  - `TER-776` (queue return): code-proven — confirmed-order context, accounting handoff, and shipping handoff proven via unit tests
  - `TER-777` (cross-surface consistency + workflow targeting): code-proven — shared PowersheetGrid contract and workflow targeting disambiguation proven via unit tests
- Row verdicts:
  - `SALE-ORD-001`: live-proven (queue browse/filter from G2 packet)
  - `SALE-ORD-002`: live-proven (inspector and support-grid sync from G2 packet)
  - `SALE-ORD-007`: code-proven (confirmed-order queue context, accounting/shipping handoff enablement)
  - `SALE-ORD-023`: code-proven (queue, support, and document all share PowersheetGrid with identical selection contract)
  - `SALE-ORD-034`: code-proven (workflow targeting disambiguation: target label, multi-row lockout, single-row enablement, guardrail text)
- Validation commands:
  - `pnpm vitest run client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx`
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Status: `closed with evidence`
- Residual: all code-proven rows need live staging proof for `live-proven` promotion. No rows block G5.
- Next: G5 surfacing-discoverability gate is now unblocked.
<!-- GENERATED:G4:GATE:END -->
