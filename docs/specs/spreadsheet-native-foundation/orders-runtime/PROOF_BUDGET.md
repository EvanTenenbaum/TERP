# Orders Runtime Proof Budget

_Generated file. Advisory only. Do not edit by hand._

- Generated at: `2026-03-20T17:06:40.009Z`
- Active gate: `G5`
- Linear gate: `TER-791`
- Active atomic card: `TER-795`
- Current build: `build-mmxxcgce`

## Budget State

- Remaining fresh deployed-build reruns: `0`
  Spend it only after a new isolated runtime change or a new shipped build that changes the target row.
- Broad G2 proof bundle: `spent`
  The broader Orders runtime packet already proved queue-route health plus the currently accepted row-op lanes. Do not reopen it for unrelated TER-795 rows.
- Narrow fill-handle probe on the current build: `spent on shipped build`
  The current shipped-build closure packet already covers `SALE-ORD-022`.
- Local proofability: `green locally and closed with shipped-build evidence for SALE-ORD-019 and SALE-ORD-022`
  Use local probes to shape the next row packet before spending a live run.

## Cheapest Next Probe

- Next row: `none`
- Command shape: Do not spend more TER-795 proof budget unless a regression reopens G2. Move active execution to `G5` via `docs/roadmaps/orders-spreadsheet-runtime/roadmap-4-g5-surfacing-affordance-closure.md`.
- Rule: Keep TER-795 closed with evidence and use active-gate-specific proof artifacts for the next tranche.

## Guardrails

- Keep `TER-796` sealed unless an isolated row-op rerun proves a real regression.
- Keep `SALE-ORD-022` closed with evidence, but preserve the no-reload persistence caveat.
- Keep `SALE-ORD-031` partial until a live Orders document surface exercises sort/filter.
- Keep G2 / TER-795 `closed with evidence` unless a new regression reopens one of the classified rows.
- Treat this file as advisory only; `ter-795-state.json` is the machine-readable source for repeated TER-795 row status and next-move truth.

## Source Inputs

- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/G5-surfacing-gate.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
