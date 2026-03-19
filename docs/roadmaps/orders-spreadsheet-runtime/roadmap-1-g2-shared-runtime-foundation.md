# Roadmap 1 — G2 Shared Runtime Foundation

## Status Block

- Gate: `G2`
- Linear gate: `TER-788`
- Current verdict: `partial`
- Execution state: `active`
- Prerequisites: Roadmap 0 `closed with evidence`
- Gate file: [G2-runtime-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md)

## Objective

Finish the shared spreadsheet runtime only. This roadmap does not move Orders document, queue, or support surfaces yet.

Current truth:

- the shared runtime seam already exists in `PowersheetGrid`
- targeted runtime tests passed on March 18, 2026
- `TER-794` and `TER-796` are currently safe to treat as closed with evidence
- `TER-795` remains blocked even after the live clipboard and row-op packet cleaned up, because fill-handle, sort/filter-safe targeting, clear-style action proof, and the remaining failure bundle are still unresolved
- staging build `build-mmwp9o9e` proves the Orders queue route loads without AG Grid watermark or license warnings, the document route proves duplicate, quick-add, delete, Tab, Shift+Tab, Enter, Shift+Enter, and Escape behavior through the shared runtime, and the Add Item focus repair is live
- the repaired proof harness now rejects the earlier two-cell-range theory and proves rectangular keyboard paste with a real two-cell range on staging
- the active TER-795 tranche is now a scoped local fill fix: Orders document fill is constrained to the vertical axis and uses a deterministic AG Grid `setFillValue` callback for approved fields, and a March 19 local browser micro-probe on the real sheet-native document route now shows the repaired series propagating `3,4 -> 5,6`
- the next live check is now reduced to one narrow command, `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`, instead of another full G2 proof rerun, and that probe now carries the same selection-summary fallback plus richer failure fields used in the broader harness
- March 19 local probing also proves the worktree can boot a degraded production server without `DATABASE_URL`, and a mocked tRPC browser harness reaches the real sheet-native document grid without watch-mode churn; the next blocker is deployed-build confirmation, not local browser startup
- March 19 continuation confirmed there is still no deployed build newer than `build-mmwp9o9e`, so `SALE-ORD-022` is now a deploy-blocked limitation until the local fill repair is shipped and re-probed on a fresh build
- the same continuation fixed a real sort/filter-safe row-targeting drift by carrying `focusedRowId` through the shared selection contract and preserving fill writeback by row id, but Claude review kept `SALE-ORD-031` at `partial` because the live Orders document surface still disables sort/filter and therefore cannot exercise that path directly
- this roadmap remains open because `SALE-ORD-019`, `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-022`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035` still lack a closure-grade proof bundle or limitation packet that can safely advance `G2`

## Allowed Inputs

- Linear issues: `TER-788`, `TER-769`, `TER-770`, `TER-771`, `TER-772`, `TER-794`, `TER-795`, `TER-796`
- Durable files:
  - `orders-runtime/Implement.md`
  - `orders-runtime/G2-runtime-gate.md`
  - `orders-runtime/execution-metrics.json`
- Proof rows:
  - `SALE-ORD-019`
  - `SALE-ORD-020`
  - `SALE-ORD-021`
  - `SALE-ORD-022`
  - `SALE-ORD-029`
  - `SALE-ORD-030`
  - `SALE-ORD-031`
  - `SALE-ORD-032`
  - `SALE-ORD-035`

## Implementation Tranches

1. Sanction `PowersheetGrid` as the only workbook adapter boundary.
2. Close shared selection and row-vs-cell coordination.
3. Close clipboard, fill, clear/cut/delete-cell, edit rejection, and failure-path contracts.
4. Close edit navigation, row operations, and sort/filter-safe targeting.
5. Record environment hardening needed to make the runtime reproducible and testable.
6. Use `1 coordinator + read-only sidecars + at most 1 narrow writer` while G2 proof is still unstable.

## Validation Commands And Proof Artifacts

Before code edits:

- write exact targeted tests into `G2-runtime-gate.md` and `Implement.md`

Required full gate:

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Required artifacts:

- scoped diff notes in `Implement.md`
- targeted test command list in `G2-runtime-gate.md`
- updated `execution-metrics.json`
- adversarial-review findings packet before any additional G2 row moves beyond `partial`

## Adversarial Review Requirement

- Independent attempt to break mixed editable/locked edit paths, invalid multi-cell updates, undo/redo boundaries, and filtered targeting.
- Treat contradictory proof packets or non-repeatable staging mutations as failures, not as partial wins.
- No row may move to `live-proven` from this roadmap.

## Stop-Go Conditions

- Stop if any surface-specific workaround creates a second spreadsheet grammar.
- Stop if pricing, validation, undo, or save-state is bypassed.
- Go only when shared runtime contracts are the single path used by downstream rollouts.

## Completion Writeback

1. Update `G2-runtime-gate.md`, `Implement.md`, and `execution-metrics.json`.
2. Update `TER-788` and owned child issues.
3. Keep `G3` blocked unless this roadmap is `closed with evidence`.
4. Record which blocker was resolved by coordinator work versus sidecar findings so the next gate inherits a clear proof trail.

## Reopen Triggers

- any downstream surface introduces a parallel runtime contract
- adversarial review finds an unhandled spreadsheet failure case
- targeted validation commands become stale or non-reproducible
