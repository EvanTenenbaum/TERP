# TER-1071 Evidence Index

## Scope

- Task: `TER-1071`
- Goal: explicit decision pass for deferred backlog items so the remaining initiative can close without ambiguous leftovers
- Canonical repo home: `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/`

## Outputs

- [decision pass](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/analysis/2026-04-08-ter-1071-deferred-decision-pass.md)
- [hostile review](/Users/evan/spec-erp-docker/TERP/TERP-TER-1070-20260408/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/reviews/2026-04-08-ter-1071-adversarial-review.md)

## Verification Bundle

- `rg -n "TER-1055|TER-1056|TER-1063|TER-1065" docs/specs/spreadsheet-native-foundation/p2-remaining-initiative docs`
- `rg -n "appointments today|pending fulfillment|Pending Intake|activity feed|since last session" client/src/components/dashboard/SimpleDashboard.tsx client/src/pages/DashboardV3.tsx server/routers/dashboard* server/dashboard*.ts client/src/components/dashboard`
- `rg -n "communication|communications|clientCommunications|addCommunication|getCommunications" client server`
- `rg -n "manifest|pick list|picklist|batch locations|location" client/src/components/spreadsheet-native/FulfillmentPilotSurface.tsx client/src/components/work-surface/PickPackWorkSurface.tsx server/routers/pickPack* client/src/components/orders`
- Linear writeback for `TER-1071`, `TER-1055`, `TER-1056`, `TER-1063`, `TER-1065`, and `TER-1066`

## Notes

- No browser/runtime proof was required for TER-1071 because this task intentionally makes no user-facing code change.
- No product-code tests were rerun for this slice because the decision pass is documentation + tracker normalization only.
- The closeout standard here is explicit reasoning plus tracker writeback, not synthetic green checks on untouched code.

## User-Verifiable Deliverables

- Each deferred item now has an explicit parking reason instead of remaining as an implied maybe-later continuation of P2.
- The canonical initiative packet now states that tranches 1 through 3 landed on `main` and the deferred pass is closed.
- Another agent can start from this repo packet and tracker state without inferring whether dashboard or follow-up workflow work is still secretly part of P2.
