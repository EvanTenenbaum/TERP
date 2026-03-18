# G6 Rollout Verdict

- Linear gate: `TER-792`
- Scope: proof reconciliation, adversarial review, writeback, and release verdict.
- Exit criteria:
  - every required `SALE-ORD` row is `live-proven`, `adjacent-owned`, or `rejected with evidence`
  - adversarial review artifact exists before any live-promotion claim
  - Linear, contract, proof map, and verdict docs agree
- Evidence list:
  - `G6-rollout-verdict.md`
  - `01-issue-manifest.json`
  - `02-proof-row-map.csv`
  - `execution-metrics.json`
- Status: `blocked`
- Next unblock: finish G5 surfacing proof so the final rollout verdict can run on stable UI behavior.
