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
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.md`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.json`
  - current atomic-card truth: `TER-794` and `TER-796` are closed with evidence; `TER-795` remains partial on `SALE-ORD-019`, `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035`
- Validation commands:
  - `pnpm vitest run client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx client/src/lib/spreadsheet-native/pilotContracts.test.ts client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/pages/SpreadsheetNativePilotRollout.test.tsx`
  - `pnpm proof:staging:orders-runtime:g2`
  - `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
  - `pnpm check`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Current blocker:
  - staging build `build-mmxxcgce` is the current live reference build, backed by deployment `20fda840-ae7c-4a36-a450-7f1e45029131` for commit `3398a9baa8101e47e9119fc69943da7a3627edbd`
  - `SALE-ORD-022`, `SALE-ORD-030`, and `SALE-ORD-032` are now the only G2 rows safe to treat as directly live-proven from staging evidence
  - `SALE-ORD-022` is closed with evidence via the narrow fill probe packet at `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json`
  - `SALE-ORD-031` stays partial with a code-proven limitation because the live Orders document grid still disables sort/filter
  - the remaining unresolved TER-795 rows are `SALE-ORD-019`, `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035`
- G2 remains partial because `SALE-ORD-019`, `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035` still need a closure packet or explicit limitation packet
- Status: `partial`
- Next unblock: keep `TER-795` active, keep `SALE-ORD-031` partial with its limitation note, and move to `SALE-ORD-019` as the next independent TER-795 row. Do not reopen `TER-796` unless a future isolated row-op rerun reproduces a real regression.
<!-- GENERATED:TER-795:GATE:END -->
