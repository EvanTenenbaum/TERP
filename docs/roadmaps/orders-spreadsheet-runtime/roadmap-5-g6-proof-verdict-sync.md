# Roadmap 5 — G6 Proof, Adversarial Review, Verdict Sync

## Status Block

- Gate: `G6`
- Linear gate: `TER-792`
- Current verdict: `open`
- Execution state: `blocked pending Roadmap 4`
- Prerequisites: Roadmap 4 `closed with evidence`
- Gate file: [G6-rollout-verdict.md](../../specs/spreadsheet-native-foundation/orders-runtime/G6-rollout-verdict.md)

## Objective

Run the proof wave, require adversarial review, and reconcile all rollout truth sources. This is the only roadmap allowed to declare proof-complete and tracker-complete.

## Allowed Inputs

- Linear issues: `TER-792`, `TER-779`, `TER-804`, `TER-805`
- Durable files:
  - `orders-runtime/G6-rollout-verdict.md`
  - `orders-runtime/01-issue-manifest.json`
  - `orders-runtime/02-proof-row-map.csv`
  - `orders-runtime/execution-metrics.json`
- Proof rows: all required `SALE-ORD-*` rows through `SALE-ORD-035`

## Implementation Tranches

1. Reconcile row states against actual code, staging proof, and surfacing evidence.
2. Run the staging proof wave for every required row not already retired with evidence.
3. Run mandatory adversarial review and record the verdict as a first-class artifact.
4. Write back row-level truth into the proof map, gate verdict, and Linear.

## Validation Commands And Proof Artifacts

Required proof bundle:

- build ID
- commit SHA
- persona
- route
- record ID or seeded context
- screenshot set per proof row cluster
- negative-case bundle for blocked edits, paste/fill rejection, undo/redo across autosave, and workflow-target ambiguity

Required commands:

- any route-specific smoke or targeted proof scripts named in the gate file
- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Adversarial Review Requirement

- Mandatory and blocking.
- No row changes to `live-proven` without an explicit adversarial review artifact attached to `G6`.

## Stop-Go Conditions

- Stop if any required row remains `partial` or `implemented-not-surfaced`.
- Stop if Linear, gate files, and proof map disagree.
- Go only when every required row is `live-proven`, `adjacent-owned`, or `rejected with evidence`.

## Completion Writeback

1. Update `G6-rollout-verdict.md`, `01-issue-manifest.json`, `02-proof-row-map.csv`, and `execution-metrics.json`.
2. Update `TER-792`, `TER-779`, `TER-804`, `TER-805`, and parent `TER-766`.
3. Unblock `G7` only after tracker-complete and proof-complete are both true.

## Reopen Triggers

- any proof row reopens
- adversarial review finds a new P0 or P1
- tracker/doc drift reappears after writeback
