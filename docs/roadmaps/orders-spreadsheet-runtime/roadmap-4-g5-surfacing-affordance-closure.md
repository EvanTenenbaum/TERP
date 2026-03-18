# Roadmap 4 — G5 Surfacing And Affordance Closure

## Status Block

- Gate: `G5`
- Linear gate: `TER-791`
- Current verdict: `partial`
- Execution state: `blocked pending Roadmap 3`
- Prerequisites: Roadmap 3 `closed with evidence`
- Gate file: [G5-surfacing-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G5-surfacing-gate.md)

## Objective

Close all surfacing debt across queue, document, and support surfaces so built behavior is visibly legible and usable.

Current truth:

- the current repo already contains document-mode surfacing work and March 18 proof updates for several rows
- this roadmap remains blocked because cross-surface surfacing proof is incomplete

## Allowed Inputs

- Linear issues: `TER-791`, `TER-778`, `TER-803`
- Durable files:
  - `orders-runtime/G5-surfacing-gate.md`
  - `orders-runtime/Documentation.md`
  - `orders-runtime/02-proof-row-map.csv`
- Proof rows:
  - `SALE-ORD-024`
  - `SALE-ORD-025`
  - `SALE-ORD-026`
  - `SALE-ORD-027`
  - `SALE-ORD-033`

## Implementation Tranches

1. Close selection legibility and selection-summary visibility.
2. Close editable-vs-locked field cues and blocked feedback.
3. Close per-surface discoverability for queue, support, and document surfaces.
4. Close workflow action visibility after spreadsheet edits.
5. Reduce `implemented_not_surfaced_count` to zero.

## Validation Commands And Proof Artifacts

Before code edits:

- write exact targeted tests and screenshot checklist into `G5-surfacing-gate.md`

Required full gate:

- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Required staging artifacts:

- visible selection states
- locked/editable cues
- blocked paste/fill feedback
- save state and error state
- per-surface discoverability matrix screenshots

## Adversarial Review Requirement

- Attempt to find any built behavior that still requires hidden knowledge to discover.
- Any surviving `implemented-not-surfaced` row keeps this roadmap open.

## Stop-Go Conditions

- Stop if any critical Orders row remains `implemented-not-surfaced`.
- Stop if proof depends on onboarding knowledge instead of visible affordances.
- Go only when all required surfaces visibly communicate the interaction model.

## Completion Writeback

1. Update `G5-surfacing-gate.md`, `Documentation.md`, `02-proof-row-map.csv`, and `execution-metrics.json`.
2. Update `TER-791` and owned child issues.
3. Unblock `G6` only after surfacing debt is actually closed.

## Reopen Triggers

- any later change hides a required spreadsheet affordance
- metrics show `implemented_not_surfaced_count` is non-zero again
- staging proof reveals a surface-specific discoverability gap
