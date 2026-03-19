# Orders Runtime Proof Budget

_Generated file. Advisory only. Do not edit by hand._

- Generated at: `2026-03-19T21:48:18.228Z`
- Active gate: `G2`
- Linear gate: `TER-788`
- Active atomic card: `TER-795`
- Current build: `build-mmxzi3to`

## Budget State

- Remaining fresh deployed-build reruns: `0`
  Spend it only after a new isolated runtime change or a new shipped build that changes the target row.
- Broad G2 proof bundle: `spent`
  The broader Orders runtime packet already proved queue-route health plus the currently accepted row-op lanes. Do not reopen it for unrelated TER-795 rows.
- Narrow fill-handle probe on the current build: `spent on prior shipped build`
  The current shipped-build closure packet already covers `SALE-ORD-022`.
- Local proofability: `green locally and green on the shipped build for SALE-ORD-019 and SALE-ORD-022`
  Use local probes to shape the next row packet before spending a live run.

## Cheapest Next Probe

- Next row: `SALE-ORD-020`
- Command shape: Add or extend one isolated multi-cell edit probe for pricing preservation, autosave evidence, and a clean restore path.
- Rule: One isolated live probe per row or tranche, targeted tests during implementation, and full check/lint/test/build only at ship points.

## Guardrails

- Keep `TER-796` sealed unless an isolated row-op rerun proves a real regression.
- Keep `SALE-ORD-022` closed with evidence, but preserve the no-reload persistence caveat.
- Keep `SALE-ORD-031` partial until a live Orders document surface exercises sort/filter.
- Move to `SALE-ORD-020` next and keep row scope isolated.
- Treat this file as advisory only; `ter-795-state.json` is the machine-readable source for repeated TER-795 row status and next-move truth.

## Source Inputs

- `docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
