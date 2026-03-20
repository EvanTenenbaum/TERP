# Roadmap 1 — G2 Shared Runtime Foundation

## Status Block

<!-- GENERATED:TER-795:ROADMAP-STATUS:START -->

- Gate: `G2`
- Linear gate: `TER-788`
- Current verdict: `closed with evidence`
- Execution state: `complete — all 9 rows classified`
- Prerequisites: Roadmap 0 `closed with evidence` (met)
- Gate file: [G2-runtime-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md)
<!-- GENERATED:TER-795:ROADMAP-STATUS:END -->

## Objective

Finish the shared spreadsheet runtime only. This roadmap does not move Orders document, queue, or support surfaces yet.

Current truth:

<!-- GENERATED:TER-795:ROADMAP-TRUTH:START -->

- G2 is closed with evidence. All 9 proof rows are classified.
- 4 rows live-proven: SALE-ORD-019 (selection), SALE-ORD-022 (fill handle), SALE-ORD-030 (edit nav), SALE-ORD-032 (row ops)
- 2 rows code-proven: SALE-ORD-029 (clear/delete/cut), SALE-ORD-035 (failure modes)
- 1 row limitation: SALE-ORD-031 (sort/filter disabled by surface design)
- 2 rows deferred blocker: SALE-ORD-020 (multi-cell edit) and SALE-ORD-021 (paste) — pending fresh staging build, do not block G3/G4
- Staging build `build-mmxzi3to` is the active proven build for selection and edit-nav rows.
- Staging build `build-mmxxcgce` is the active proven build for fill-handle rows.
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
