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
- `TER-794` and `TER-795` are closed on local evidence, and `TER-796` is the current active atomic card
- current staging build `build-mmvlul6k` still crashes on `/sales?tab=orders&surface=sheet-native&orderId=627`, so proof is blocked on validating the shared-runtime hardening fix in a fresh build
- this roadmap remains open because the runtime tranche is only partially proven and not yet fully closed with evidence

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

## Adversarial Review Requirement

- Independent attempt to break mixed editable/locked edit paths, invalid multi-cell updates, undo/redo boundaries, and filtered targeting.
- No row may move to `live-proven` from this roadmap.

## Stop-Go Conditions

- Stop if any surface-specific workaround creates a second spreadsheet grammar.
- Stop if pricing, validation, undo, or save-state is bypassed.
- Go only when shared runtime contracts are the single path used by downstream rollouts.

## Completion Writeback

1. Update `G2-runtime-gate.md`, `Implement.md`, and `execution-metrics.json`.
2. Update `TER-788` and owned child issues.
3. Keep `G3` blocked unless this roadmap is `closed with evidence`.

## Reopen Triggers

- any downstream surface introduces a parallel runtime contract
- adversarial review finds an unhandled spreadsheet failure case
- targeted validation commands become stale or non-reproducible
