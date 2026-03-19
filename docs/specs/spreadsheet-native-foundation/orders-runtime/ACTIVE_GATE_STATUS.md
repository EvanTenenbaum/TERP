# Orders Runtime Active Gate Status

_Generated file. Do not edit by hand._

- Generated at: `2026-03-19T20:25:39.250Z`
- Active gate: `G2`
- Linear gate: `TER-788`
- Status: `partial`
- Active atomic card: `TER-795`
- Current build: `build-mmwp9o9e`
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

Staging build-mmwp9o9e still clears the AG Grid watermark and `License Key Not Found` blocker on the Orders queue route, keeps the Add Item focus repair live (`addItemFocusedInventorySearch: true`), preserves the isolated duplicate plus quick-add/delete packet (`duplicateDelta: 1`, `quickAddDelta: 1`, `deleteReturnedToBaseline: true`), and continues to reproduce the live fill-handle failure (`quantityValuesAfterDrag: ["3","4","1","1"]`). March 19 continuation rechecked deployment truth with `doctl apps list-deployments` plus `version.json` and confirmed there is still no deployed build newer than build-mmwp9o9e, so the deterministic fill repair remains local-only worktree state and `SALE-ORD-022` stays deploy-blocked. The same continuation fixed a real sort/filter-safe targeting drift by carrying `focusedRowId` through the shared selection contract and preserving fill writeback by row id; targeted vitest coverage plus `pnpm check` passed, but Claude adversarial review kept `SALE-ORD-031` at partial because the live Orders document surface still disables sort/filter. `TER-795` therefore remains blocked on the unshipped fill repair, clear-style action proof, the remaining failure bundle, and the next independent proof rows rather than on AG Grid licensing, Add Item focus, or TER-796 row-operation stability.

## Next Unblock

- Next command: `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
- Gate doc narrative: keep `TER-795` blocked, treat `SALE-ORD-022` as deploy-blocked until a build newer than `build-mmwp9o9e` contains the local fill repair, keep `SALE-ORD-031` partial with its code-proven limitation note until a live sort/filter surface exists, and move to `SALE-ORD-019` as the next independent TER-795 row while separately preparing the next shipped build for `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`.

## Runtime Guards

- Live-proven rows only: SALE-ORD-030 and SALE-ORD-032.
- TER-796 seal rule: keep TER-796 sealed, treat SALE-ORD-022 as deploy-blocked until a shipped build newer than build-mmwp9o9e exists, keep SALE-ORD-031 partial with its code-proven limitation note until sort/filter is enabled on the Orders document grid, and move to SALE-ORD-019 as the next independent TER-795 row.

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
- Current worktree dirty entries excluding generator-owned outputs: `28`

Top dirty worktrees:
- `37` dirty -> `/Users/evan/spec-erp-docker/TERP/TERP-low-rebuild-20260310-04c982f7` (`refs/heads/claude/staging-low-rebuild-20260310-04c982f7`)
- `28` dirty -> `/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318` (`refs/heads/codex/ter-795-20260318-980e3a3c`)
- `20` dirty -> `/Users/evan/spec-erp-docker/TERP/worktrees/sheet-native-staging-20260315` (`refs/heads/codex/sheet-native-staging-20260315`)
- `17` dirty -> `/Users/evan/spec-erp-docker/TERP/TERP` (`refs/heads/staging`)
- `17` dirty -> `/Users/evan/spec-erp-docker/TERP/worktrees/workspace-surfacing-fixes-20260312` (`refs/heads/codex/workspace-surfacing-fixes-20260312`)

## Source Inputs

- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
- `docs/roadmaps/orders-spreadsheet-runtime/README.md`
