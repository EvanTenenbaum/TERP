# Orders Runtime Proof Budget

_Generated file. Advisory only. Do not edit by hand._

- Generated at: `2026-03-19T20:25:39.497Z`
- Active gate: `G2`
- Linear gate: `TER-788`
- Active atomic card: `TER-795`
- Current build: `build-mmwp9o9e`

## Budget State

- Remaining fresh deployed-build reruns: `1`
  Spend it only on a fresh deployed build or after a new isolated TER-795 proof/runtime change.
- Broad G2 proof bundle: `spent`
  The broader Orders runtime packet already proved queue-route health, duplicate, quick-add, delete, and keyboard navigation. Do not rerun it for the current TER-795 fill tranche.
- Narrow fill-handle probe on the current build: `spent on current build`
  That narrow probe was validated once against the current staging build build-mmwp9o9e and reproduces the still-live failure in isolation (`selectionSummaryBeforeDrag: 2 selected cells · 2 rows in scope`, `fillHandleVisible: true`, `bodyClassDuringDrag: ag-dragging-fill-handle`, `quantityValuesAfterDrag: [3,4,1,1]`), so the browser budget can stay spent here until a fresh deployed build exists
- Local proofability: `green locally, not yet green on a deployed build`
  The March 19, 2026 local sheet-native fill drag probe records `selectionSummaryBeforeDrag: 2 selected cells · 2 rows in scope`, `fillHandleVisible: true`, and `quantityValuesAfterDrag: [3,4,5,6]`, so the repaired fill path is browser-proven locally even though TER-795 remains blocked until a deployed build confirms the same behavior

## Cheapest Next Probe

- Command: `PLAYWRIGHT_BASE_URL=<fresh-build-url> pnpm proof:staging:orders-fill-handle`
- Rule: Keep SALE-ORD-030 and SALE-ORD-032 as the only G2 rows currently safe to treat as live-proven, keep TER-796 sealed, treat SALE-ORD-022 as deploy-blocked until a shipped build newer than build-mmwp9o9e exists, keep SALE-ORD-031 partial with its code-proven limitation note until sort/filter is enabled on the Orders document grid, and move to SALE-ORD-019 as the next independent TER-795 row. Do not reopen TER-796 unless a future isolated row-op rerun reproduces a real regression.

## Guardrails

- Keep `TER-796` sealed: keep TER-796 sealed, treat SALE-ORD-022 as deploy-blocked until a shipped build newer than build-mmwp9o9e exists, keep SALE-ORD-031 partial with its code-proven limitation note until sort/filter is enabled on the Orders document grid, and move to SALE-ORD-019 as the next independent TER-795 row.
- Do not reopen the broad G2 staging bundle for the current fill tranche.
- If the next fresh deployed-build pass still fails, freeze `SALE-ORD-022` as an explicit limitation packet before moving to the remaining TER-795 rows.
- Treat this file as advisory only; source-of-truth updates still belong in the gate doc, manifest, metrics, and Linear.

## Source Inputs

- `docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/01-issue-manifest.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`
- `docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md`
