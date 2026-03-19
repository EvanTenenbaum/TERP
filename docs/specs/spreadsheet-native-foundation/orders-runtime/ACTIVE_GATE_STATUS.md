# Orders Runtime Active Gate Status

_Generated file. Do not edit by hand._

- Generated at: `2026-03-19T20:41:24.200Z`
- Active gate: `G2`
- Linear gate: `TER-788`
- Status: `partial`
- Active atomic card: `TER-795`
- Current build: `build-mmxxcgce`
- Route: `/sales?tab=orders&surface=sheet-native&orderId=627`

## Use This Before Global Session Tracking

For the Orders runtime initiative, this file is a local generated snapshot to check before `docs/ACTIVE_SESSIONS.md` when it is present or freshly regenerated.
It is generated from the active gate artifacts, the issue manifest, execution metrics, and current worktree state.
Source of truth stays with the gate doc, issue manifest, execution metrics, and Linear.

## Gate Snapshot

- Scope: shared selection runtime, clipboard/fill contracts, edit navigation, row ops, and environment hardening.
- Repo-backed execution contract: `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md` plus `docs/roadmaps/orders-spreadsheet-runtime/README.md`
- Active-gate operating model: `1 coordinator + up to 2 read-only sidecars + at most 1 narrow writer`

## Current Blocker

Fresh staging build build-mmxxcgce now carries the shipped TER-795 fill repair: the isolated live fill-handle probe on the real Orders document route records `selectionSummaryBeforeDrag: [2 selected cells · 2 rows in scope]`, `fillHandleVisible: true`, `bodyClassDuringDrag: [ag-dragging-fill-handle]`, and `quantityValuesAfterDrag: [3,4,5,6]` with no license warnings or page errors, so `SALE-ORD-022` is now closed with evidence under the shipped-build probe contract. The same shipped tranche preserves the cleared AG Grid watermark blocker, keeps the Add Item focus repair live, and carries the focused-row-id sort/filter-safe targeting repair; targeted vitest coverage plus the full local gate passed before ship. Claude adversarial review after the shipped probe kept `SALE-ORD-031` at partial because the live Orders document surface still disables sort/filter, and it added one residual note that the narrow `SALE-ORD-022` probe proves live route propagation rather than a separate post-reload persistence round-trip. `TER-795` therefore remains partial on the remaining independent proof rows and limitations rather than on deploy lag, AG Grid licensing, Add Item focus, or TER-796 row-operation stability.

## Next Unblock

- Next command: none recorded.
- Gate doc narrative: keep `TER-795` active, record `SALE-ORD-022` as shipped-build evidence closure with its no-reload note, keep `SALE-ORD-031` partial with its code-proven limitation note until a live sort/filter surface exists, and move to `SALE-ORD-019` as the next independent TER-795 row. Do not reopen TER-796 unless a future isolated row-op rerun reproduces a real regression.

## Runtime Guards

- Live-proven rows only: not explicitly recorded in the manifest.
- TER-796 seal rule: keep TER-796 sealed.
- SALE-ORD-031 guard: keep SALE-ORD-031 partial with its code-proven limitation note until sort/filter is enabled on the Orders document grid, and move to SALE-ORD-019 as the next independent TER-795 row.
- Next independent TER-795 row: move to SALE-ORD-019 as the next independent TER-795 row.

## Validation Commands

- `pnpm vitest run client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx client/src/lib/spreadsheet-native/pilotContracts.test.ts client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/pages/SpreadsheetNativePilotRollout.test.tsx`
- `pnpm proof:staging:orders-runtime:g2`
- `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Evidence Artifacts Present

- `output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-report.json`
- `output/playwright/orders-runtime-g2/2026-03-18/fill-handle-drag-probe.json`
- `output/playwright/orders-runtime-g2/2026-03-19/local-sheet-native-fill-drag-probe.json`
- `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-report.json`

## Worktree Pressure

- Total worktrees: `40`
- Dirty worktrees: `18`
- Dirty worktrees with 5+ entries: `7`
- Current worktree dirty entries excluding generator-owned outputs: `5`

Top dirty worktrees:
- `101` dirty -> `/Users/evan/spec-erp-docker/TERP/TERP` (`refs/heads/staging`)
- `37` dirty -> `/Users/evan/spec-erp-docker/TERP/TERP-low-rebuild-20260310-04c982f7` (`refs/heads/claude/staging-low-rebuild-20260310-04c982f7`)
- `20` dirty -> `/Users/evan/spec-erp-docker/TERP/worktrees/sheet-native-staging-20260315` (`refs/heads/codex/sheet-native-staging-20260315`)
- `17` dirty -> `/Users/evan/spec-erp-docker/TERP/worktrees/workspace-surfacing-fixes-20260312` (`refs/heads/codex/workspace-surfacing-fixes-20260312`)
- `7` dirty -> `/Users/evan/spec-erp-docker/TERP/worktrees/pricing-cents-preservation-20260312` (`refs/heads/codex/ter-696-pricing-cents-preservation-20260312`)

## Source Inputs

- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
- `docs/roadmaps/orders-spreadsheet-runtime/README.md`
