# Roadmap 1 — G2 Shared Runtime Foundation

## Status Block

<!-- GENERATED:TER-795:ROADMAP-STATUS:START -->

- Gate: `G2`
- Linear gate: `TER-788`
- Current verdict: `closed with evidence`
- Execution state: `complete — all 9 rows classified`
- Prerequisites: Roadmap 0 `closed with evidence`
- Gate file: [G2-runtime-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md)
<!-- GENERATED:TER-795:ROADMAP-STATUS:END -->

## Objective

Finish the shared spreadsheet runtime only. This roadmap does not move Orders document, queue, or support surfaces yet.

Current truth:

<!-- GENERATED:TER-795:ROADMAP-TRUTH:START -->

- The shared runtime seam already exists in `PowersheetGrid`, and the March 18 targeted runtime tests proved the current adapter path is real rather than aspirational.
- `TER-794`, `TER-795`, and `TER-796` are currently safe to treat as closed with evidence; all 9 G2 rows are classified.
- Staging build `build-mmxxcgce` on route `/sales?tab=orders&surface=sheet-native&orderId=627` is the latest shipped reference build used for final G2 closure evidence.
- The repaired selection probe proves queue drag-range, queue Cmd discontiguous selection, queue column and current-grid scope selection, and document Shift-range behavior on the live Orders surfaces.
- `SALE-ORD-019` is closed with evidence via `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-selection-closure-packet.json` on build `build-mmxzi3to`.
- The fill tranche remains closed: staging build `build-mmxxcgce` recorded `3,4 -> 5,6` on the isolated live fill-handle probe with no license warnings or page errors, so `SALE-ORD-022` stays closed with evidence.
- `SALE-ORD-031` is now a published limitation: Orders document grid disables sort/filter by design, so ORD-SS-012 cannot be proved on the originating surface, but that no longer blocks G2.
- `SALE-ORD-029` and `SALE-ORD-035` are code-proven with comprehensive unit test coverage of positive and negative paths.
- `SALE-ORD-020` and `SALE-ORD-021` remain honestly classified as deferred blockers pending a fresh reachable staging build, but they no longer block G2, G3, or G4 closure.
- All 9 G2 rows are now classified: 4 live-proven, 2 code-proven, 1 limitation, 2 deferred blockers.
- `G2`, `G3`, and `G4` are closed with evidence. `G5` is now the active gate.
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
