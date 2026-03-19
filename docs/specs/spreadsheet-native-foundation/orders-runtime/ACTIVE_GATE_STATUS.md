# Orders Runtime Active Gate Status

_Generated file. Do not edit by hand._

- Generated at: `2026-03-19T21:21:49.470Z`
- Active gate: `G2`
- Linear gate: `TER-788`
- Status: `partial`
- Active atomic card: `TER-795`
- Current build: `build-mmxxcgce`
- Route: `/sales?tab=orders&surface=sheet-native&orderId=627`

## Use This Before Global Session Tracking

For the Orders runtime initiative, this file is a local generated snapshot to check before `docs/ACTIVE_SESSIONS.md` when it is present or freshly regenerated.
It is generated from `ter-795-state.json`, the synced gate artifacts, and current worktree state.
Source of truth for repeated TER-795 row status, build truth, and next move is `ter-795-state.json`; gate narrative and tracker state still live in the synced gate doc and Linear.

## Gate Snapshot

- Scope: shared selection runtime, clipboard/fill contracts, edit navigation, row ops, and environment hardening.
- Repo-backed execution contract: `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md` plus `docs/roadmaps/orders-spreadsheet-runtime/README.md`
- Active-gate operating model: `1 coordinator + up to 2 read-only sidecars + at most 1 narrow writer`

## Current Blocker

`SALE-ORD-019`, `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, `SALE-ORD-035` still need a closure packet or explicit limitation packet. `SALE-ORD-031` also stays partial until a live sort/filter surface exists.

## Next Unblock

- Next row: `SALE-ORD-019`
- Next command: Add or extend one isolated selection probe for scope-selection proof across the required Orders surfaces.
- Cadence rule: One isolated live probe per row or tranche, targeted tests during implementation, and full check/lint/test/build only at ship points.

## Runtime Guards

- Live-proven rows only: `SALE-ORD-022`, `SALE-ORD-030`, `SALE-ORD-032`.
- TER-796 seal rule: keep `TER-796` sealed unless an isolated row-op rerun proves a real regression.
- SALE-ORD-022 guard: keep the closure packet honest; the probe proves shipped-route propagation, not a separate reload or persistence round-trip.
- SALE-ORD-031 guard: keep `SALE-ORD-031` partial until a live Orders document surface exercises sort/filter.
- Next independent TER-795 row: move to `SALE-ORD-019` next.

## Validation Commands

- `pnpm vitest run client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx client/src/lib/spreadsheet-native/pilotContracts.test.ts client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/pages/SpreadsheetNativePilotRollout.test.tsx`
- `pnpm proof:staging:orders-runtime:g2`
- `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Evidence Artifacts Present

- `docs/specs/spreadsheet-native-foundation/orders-runtime/HANDOFF-2026-03-19-CODEX-EXECUTION-PROMPT.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`
- `output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-closure-packet.json`
- `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.json`

## Worktree Pressure

- Total worktrees: `30`
- Dirty worktrees: `18`
- Dirty worktrees with 5+ entries: `7`
- Current worktree dirty entries excluding generator-owned outputs: `22`

Top dirty worktrees:
- `204` dirty -> `TERP` (`refs/heads/staging`)
- `37` dirty -> `TERP-low-rebuild-20260310-04c982f7` (`refs/heads/claude/staging-low-rebuild-20260310-04c982f7`)
- `22` dirty -> `worktrees/orders-runtime-ter-795-20260318` (`refs/heads/codex/ter-795-g2-writeback-20260319`)
- `20` dirty -> `worktrees/sheet-native-staging-20260315` (`refs/heads/codex/sheet-native-staging-20260315`)
- `17` dirty -> `worktrees/workspace-surfacing-fixes-20260312` (`refs/heads/codex/workspace-surfacing-fixes-20260312`)

## Source Inputs

- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
- `docs/roadmaps/orders-spreadsheet-runtime/README.md`
