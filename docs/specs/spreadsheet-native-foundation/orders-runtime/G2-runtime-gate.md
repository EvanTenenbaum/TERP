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
  - `output/playwright/orders-runtime-g2/2026-03-20/orders-runtime-selection-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-sort-filter-limitation-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-clear-edit-rejection-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-failure-mode-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-20/orders-runtime-multicell-edit-limitation-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-20/orders-runtime-paste-limitation-packet.json`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.md`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.json`
  - current atomic-card truth: `TER-794`, `TER-795`, and `TER-796` are all closed with evidence
- Validation commands:
  - `pnpm vitest run client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx client/src/lib/spreadsheet-native/pilotContracts.test.ts client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/pages/SpreadsheetNativePilotRollout.test.tsx`
  - `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-selection`
  - `pnpm proof:staging:orders-runtime:g2`
  - `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Current blocker:
  - staging build `build-mmz7p245` is the current live reference build, backed by deployment `unknown` for commit `build-mmz7p245`
  - `SALE-ORD-019`, `SALE-ORD-022`, `SALE-ORD-030`, and `SALE-ORD-032` are now the only G2 rows safe to treat as directly live-proven from staging evidence
  - `SALE-ORD-022` is closed with evidence via the narrow fill probe packet at `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json`
  - `SALE-ORD-031` stays partial with a code-proven limitation because the live Orders document grid still disables sort/filter
  - no TER-795 rows remain unresolved; deferred blocker rows are classified and no longer hold G2 open
- G2 is closed with evidence because all 9 TER-795 rows are now classified and any remaining blockers are explicitly documented as deferred, non-gate-blocking evidence.
- Status: `closed with evidence`
- Next unblock: keep TER-795 sealed, do not reopen TER-796 unless a future isolated row-op rerun reproduces a real regression, and move active execution to the G5 surfacing gate.
<!-- GENERATED:TER-795:GATE:END -->
