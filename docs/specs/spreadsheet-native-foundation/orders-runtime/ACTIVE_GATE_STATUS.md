# Orders Runtime Active Gate Status

_Generated file. Do not edit by hand._

- Generated at: `2026-03-20T20:18:07.176Z`
- Active gate: `G6`
- Linear gate: `TER-792`
- Status: `partial`
- Active atomic card: `see active gate roadmap`
- Current build: `build-mmz7p245`
- Route: `/sales?tab=orders&surface=sheet-native&orderId=627`

## Use This Before Global Session Tracking

For the Orders runtime initiative, this file is a local generated snapshot to check before `docs/ACTIVE_SESSIONS.md` when it is present or freshly regenerated.
It is generated from `ter-795-state.json`, the synced gate artifacts, and current worktree state.
Source of truth for repeated TER-795 row status, build truth, and next move is `ter-795-state.json`; gate narrative and tracker state still live in the synced gate doc and Linear.

## Gate Snapshot

- Scope: shared selection runtime, clipboard/fill contracts, edit navigation, row ops, and environment hardening.
- Repo-backed execution contract: `docs/specs/spreadsheet-native-foundation/orders-runtime/G6-rollout-verdict.md` plus `docs/roadmaps/orders-spreadsheet-runtime/roadmap-5-g6-proof-verdict-sync.md`
- Active-gate operating model: `1 coordinator + up to 2 read-only sidecars + at most 1 narrow writer`

## Current Blocker

G6 is the active gate. TER-795 / G2 is already `closed with evidence`, so current blockers and required proof now live in `docs/specs/spreadsheet-native-foundation/orders-runtime/G6-rollout-verdict.md` and `docs/roadmaps/orders-spreadsheet-runtime/roadmap-5-g6-proof-verdict-sync.md`.

## Next Unblock

- Next focus: follow `docs/specs/spreadsheet-native-foundation/orders-runtime/G6-rollout-verdict.md` for the current open tranche.
- TER-795 state: `closed with evidence` with `0` remaining rows.
- Cadence rule: Do not spend more TER-795 proof budget unless a new regression reopens G2; use G6-specific proof artifacts for the active surfacing lane.

## Runtime Guards

- Live-proven G2 rows: `SALE-ORD-019`, `SALE-ORD-022`, `SALE-ORD-030`, `SALE-ORD-032`.
- TER-796 seal rule: keep `TER-796` sealed unless an isolated row-op rerun proves a real regression.
- SALE-ORD-022 guard: keep the closure packet honest; the probe proves shipped-route propagation, not a separate reload or persistence round-trip.
- SALE-ORD-031 guard: keep `SALE-ORD-031` partial until a live Orders document surface exercises sort/filter.
- TER-795 closure: keep G2 closed unless a new regression reopens one of the classified rows.

## Validation Commands

- `pnpm vitest run client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx client/src/lib/spreadsheet-native/pilotContracts.test.ts client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/pages/SpreadsheetNativePilotRollout.test.tsx`
- `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-selection`
- `pnpm proof:staging:orders-runtime:g2`
- `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Evidence Artifacts Present

- `docs/specs/spreadsheet-native-foundation/orders-runtime/G6-rollout-verdict.md`
- `docs/roadmaps/orders-spreadsheet-runtime/roadmap-5-g6-proof-verdict-sync.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Documentation.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/02-proof-row-map.csv`

## Worktree Pressure

- Total worktrees: `32`
- Dirty worktrees: `18`
- Dirty worktrees with 5+ entries: `6`
- Current worktree dirty entries excluding generator-owned outputs: `25`

Top dirty worktrees:

- `37` dirty -> `TERP-low-rebuild-20260310-04c982f7` (`refs/heads/claude/staging-low-rebuild-20260310-04c982f7`)
- `25` dirty -> `worktrees/orders-runtime-closure-remediation-20260320` (`refs/heads/codex/orders-runtime-closure-remediation-20260320`)
- `20` dirty -> `worktrees/sheet-native-staging-20260315` (`refs/heads/codex/sheet-native-staging-20260315`)
- `17` dirty -> `worktrees/workspace-surfacing-fixes-20260312` (`refs/heads/codex/workspace-surfacing-fixes-20260312`)
- `7` dirty -> `worktrees/pricing-cents-preservation-20260312` (`refs/heads/codex/ter-696-pricing-cents-preservation-20260312`)

## Source Inputs

- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/G6-rollout-verdict.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
- `docs/roadmaps/orders-spreadsheet-runtime/README.md`
