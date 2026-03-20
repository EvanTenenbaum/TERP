# G2 Runtime Gate

- Linear gate: `TER-788`
- Scope: shared selection runtime, clipboard/fill contracts, edit navigation, row ops, and environment hardening.
- Exit criteria:
  - selection, paste, fill, edit-nav, and row-op contracts reuse one runtime
  - scoped diffs and validation commands are logged for each atomic tranche
  - adversarial review findings are captured before G3 promotion

<!-- GENERATED:TER-795:GATE:START -->

- Evidence list:
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/HANDOFF-2026-03-19-CODEX-EXECUTION-PROMPT.md`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`
  - `output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-closure-packet.json`
  - selection proof is included in `output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-clear-edit-rejection-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-failure-mode-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-sort-filter-limitation-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-multicell-edit-blocker-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-paste-blocker-packet.json`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.md`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.json`
  - atomic-card truth: `TER-794`, `TER-795`, and `TER-796` are all closed with evidence
- Row verdicts:
  - `SALE-ORD-019`: live-proven (selection closure packet on build-mmxzi3to)
  - `SALE-ORD-020`: blocker (staging unreachable, proof budget exhausted)
  - `SALE-ORD-021`: blocker (staging unreachable, clipboard API limitation)
  - `SALE-ORD-022`: live-proven (fill-handle closure packet on build-mmxxcgce)
  - `SALE-ORD-029`: code-proven (clear/delete/cut positive + negative path unit tests)
  - `SALE-ORD-030`: live-proven (Tab/Enter/Escape proof on staging)
  - `SALE-ORD-031`: limitation (sort/filter disabled by surface design)
  - `SALE-ORD-032`: live-proven (duplicate/quick-add/delete proof on staging)
  - `SALE-ORD-035`: code-proven (failure-mode bundle unit tests)
- Validation commands:
  - `pnpm vitest run client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx client/src/lib/spreadsheet-native/pilotContracts.test.ts client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/pages/SpreadsheetNativePilotRollout.test.tsx`
  - `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-selection`
  - `pnpm proof:staging:orders-runtime:g2`
  - `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Status: `closed with evidence`
- Residual blockers: `SALE-ORD-020` and `SALE-ORD-021` are classified as blockers pending a fresh reachable staging build. These do not prevent G3 promotion.
- Next: G3 Orders document rollout is now unblocked.
<!-- GENERATED:TER-795:GATE:END -->
