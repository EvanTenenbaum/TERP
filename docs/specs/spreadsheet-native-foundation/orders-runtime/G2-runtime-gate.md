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
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-selection-closure-packet.json`
  - `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.md`
  - `docs/specs/spreadsheet-native-foundation/orders-runtime/adversarial-review-context.json`
  - current atomic-card truth: `TER-794` and `TER-796` are closed with evidence; `TER-795` remains partial on `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035`
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
  - staging build `build-mmxzi3to` is the current live reference build, backed by deployment `eb16abcf-6c41-4939-a2bf-dd5687c0cc3a` for commit `1e248c932623ad6c5248a7f18b4e1d23f128b297`
  - `SALE-ORD-019`, `SALE-ORD-022`, `SALE-ORD-030`, and `SALE-ORD-032` are now the only G2 rows safe to treat as directly live-proven from staging evidence
  - `SALE-ORD-022` is closed with evidence via the narrow fill probe packet at `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json`
  - `SALE-ORD-031` stays partial with a code-proven limitation because the live Orders document grid still disables sort/filter
  - the remaining unresolved TER-795 rows are `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035`
- G2 remains partial because `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035` still need a closure packet or explicit limitation packet
- Status: `partial`
- Next unblock: keep `TER-795` active, publish the `SALE-ORD-031` limitation packet now, publish the `SALE-ORD-035` limitation packet now unless one bounded failure packet closes it immediately, give `SALE-ORD-029` one narrow proof attempt before limitation, and park `SALE-ORD-020` plus `SALE-ORD-021` until a fresh reachable document route exists. Do not reopen `TER-796` unless a future isolated row-op rerun reproduces a real regression.
<!-- GENERATED:TER-795:GATE:END -->

## Module Adapter Readiness Gate

Status: `blocked`

This gate may share its process model now, but it does not authorize broad parallel technical adapter work on the shared spreadsheet runtime.

Safe to parallelize now:

- roadmap and gate templates
- machine-readable state and packet workflow
- proof taxonomy and requirement mapping
- planning for future module adapters

Blocked until this readiness gate is lifted:

- building other module adapters against the current `PowersheetGrid` behavior or shape
- treating any Orders foundation-shared capability as portable repo-wide runtime truth
- claiming `ORD-SS-012` coverage from Orders while `SALE-ORD-031` remains an Orders-surface limitation
- claiming reload-safe fill persistence from Orders while `SALE-ORD-022` carries the shipped-route-only caveat

Lift conditions:

1. `G2` moves to `closed with evidence`.
2. `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035` each have a closure packet or explicit limitation packet.
3. [PowersheetGrid boundary contract](./PowersheetGrid-boundary-contract.md) is promoted to a frozen interface contract.
4. Shared-seam ownership is explicitly reopened for module adapters instead of staying centralized under Orders.

`implemented-not-surfaced` remains rollout-blocking even after the adapter gate eventually opens.

## Fastest Honest Close Path

The goal of the remaining `G2` work is to clear the Orders product roadmap, not to keep expanding foundation proof mechanics.

Writable-tranche rule:

- each tranche ends in exactly one of: user-facing product change, closure packet, limitation packet, or blocker packet
- use targeted local verification during implementation
- use at most one narrow live probe per row when needed
- use Claude only for merge-ready work or disputed limitation packets
- run full `check` or `lint` or `test` or `build` only at real ship points

Immediate row order:

1. `SALE-ORD-031` -> limitation packet now
2. `SALE-ORD-035` -> limitation packet now unless one bounded failure packet closes it immediately
3. `SALE-ORD-029` -> one narrow proof attempt, then limitation if still fuzzy
4. `SALE-ORD-020` -> park until a fresh reachable document route exists, then one fresh-build attempt
5. `SALE-ORD-021` -> park until a fresh reachable document route exists, then one fresh-build attempt

As soon as `G2` is honestly closeable, move directly into `G3` Orders document closure. Do not insert new foundation or meta-system work between those gates.
