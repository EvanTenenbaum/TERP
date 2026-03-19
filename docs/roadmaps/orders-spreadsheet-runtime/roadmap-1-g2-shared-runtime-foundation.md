# Roadmap 1 — G2 Shared Runtime Foundation

## Status Block

<!-- GENERATED:TER-795:ROADMAP-STATUS:START -->
- Gate: `G2`
- Linear gate: `TER-788`
- Current verdict: `partial`
- Execution state: `active`
- Prerequisites: Roadmap 0 `closed with evidence`
- Gate file: [G2-runtime-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md)
<!-- GENERATED:TER-795:ROADMAP-STATUS:END -->

## Objective

Finish the shared spreadsheet runtime only. This roadmap does not move Orders document, queue, or support surfaces yet.

Current truth:

<!-- GENERATED:TER-795:ROADMAP-TRUTH:START -->
- The shared runtime seam already exists in `PowersheetGrid`, and the March 18 targeted runtime tests proved the current adapter path is real rather than aspirational.
- `TER-794` and `TER-796` are currently safe to treat as closed with evidence; `TER-795` remains partial on the remaining proof rows and the `SALE-ORD-031` limitation.
- Staging build `build-mmwp9o9e` already cleared the AG Grid watermark or license blocker, restored queue-route health, and kept the Add Item focus repair live.
- The repaired proof harness rejected the earlier two-cell-range theory and now proves rectangular keyboard paste with a real two-cell range on staging.
- The fill tranche is shipped: staging build `build-mmxxcgce` records `3,4 -> 5,6` on the isolated live fill-handle probe with no license warnings or page errors, so `SALE-ORD-022` is now closed with evidence.
- The same continuation fixed the focused-row-id targeting drift, but `SALE-ORD-031` stays partial because the live Orders document surface still disables sort/filter and cannot exercise that path directly.
- Claude's post-ship review left one residual caution attached to `SALE-ORD-022`: the narrow probe proves live route propagation, not a separate post-reload persistence round-trip.
- This gate remains open because `SALE-ORD-019`, `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035` still need a closure packet or explicit limitation packet.
<!-- GENERATED:TER-795:ROADMAP-TRUTH:END -->

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
