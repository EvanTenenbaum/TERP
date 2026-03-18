# Roadmap 3 — G4 Cross-Surface Rollout

## Status Block

- Gate: `G4`
- Linear gate: `TER-790`
- Current verdict: `partial`
- Execution state: `blocked pending Roadmap 2`
- Prerequisites: Roadmap 2 `closed with evidence`
- Gate file: [G4-cross-surface-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G4-cross-surface-gate.md)

## Objective

Roll the shared interaction grammar into queue and support surfaces and close workflow-target ambiguity.

Current truth:

- queue and support already participate in the current shared runtime path
- this roadmap stays blocked until `G3` closes because the document-first gate remains authoritative

## Allowed Inputs

- Linear issues: `TER-790`, `TER-776`, `TER-777`, `TER-800`, `TER-801`, `TER-802`
- Durable files:
  - `orders-runtime/G4-cross-surface-gate.md`
  - `orders-runtime/02-proof-row-map.csv`
  - `orders-runtime/execution-metrics.json`
- Proof rows:
  - `SALE-ORD-001`
  - `SALE-ORD-002`
  - `SALE-ORD-007`
  - `SALE-ORD-023`
  - `SALE-ORD-034`

## Implementation Tranches

1. Move queue selection and copy behavior onto the shared grammar.
2. Align support-grid behavior and active-order synchronization.
3. Close focused-row versus focused-cell workflow targeting ambiguity.
4. Prove queue, support, and document surfaces now share one interaction model.

## Validation Commands And Proof Artifacts

Before code edits:

- write exact targeted tests and route checks into `G4-cross-surface-gate.md`

Required full gate:

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Required staging artifacts:

- queue screenshots with selection states
- support-grid screenshots with linked context
- pre-action and post-action screenshots showing workflow target clarity

## Adversarial Review Requirement

- Try workflow actions with conflicting focused row and selected cell states.
- Try surface switching to expose grammar drift between queue, support, and document modes.

## Stop-Go Conditions

- Stop if queue or support introduces a surface-specific spreadsheet rule.
- Stop if workflow actions are still ambiguous after edits.
- Go only when cross-surface behavior is consistent enough to evaluate surfacing as a final layer.

## Completion Writeback

1. Update `G4-cross-surface-gate.md`, `02-proof-row-map.csv`, and `execution-metrics.json`.
2. Update `TER-790` and owned child issues.
3. Unblock `G5` only after workflow-target ambiguity is closed or rejected with evidence.

## Reopen Triggers

- cross-surface grammar drift returns
- workflow targets become ambiguous after follow-on changes
- queue/support proof no longer matches document proof
