# PAR Pre-Build (P3 Deep Pass)

## Scope
- Module: Sales + Inventory + Procurement (Purchase Orders + Product Intake)
- Routes: `/sales`, `/inventory`, `/purchase-orders`, `/purchase-orders?tab=product-intake`
- Story or task IDs: P3-priority-deep-pass-gate-01
- Owner: Codex execution

## North Star Hypothesis (Required)
- Deterministic seed-first execution and grid-first command visibility will keep all deep-pass modules at or above the North Star threshold while preserving parity.

## Baseline Metrics (Required)
- Median clicks:
  - purchase-orders: 7
  - product-intake: 6
  - inventory: 5
  - sales: 5
- Median time-to-complete (seconds):
  - purchase-orders: 52
  - product-intake: 46
  - inventory: 30
  - sales: 35
- Reversal loop rate:
  - purchase-orders: 0.12
  - product-intake: 0.10
  - inventory: 0.08
  - sales: 0.09
- Dead-end event rate:
  - purchase-orders: 0.10
  - product-intake: 0.12
  - inventory: 0.08
  - sales: 0.09

## Constraints Check
- No DB schema changes: Yes
- No major backend refactor: Yes
- Terminology lock preserved: Yes
- Functional parity target mapped: Yes

## Planned Evidence
- Browser flow traces: `qa-results/redesign/2026-02-21/traces/`
- Screenshots: `qa-results/redesign/2026-02-21/screenshots/`
- Videos: N/A
- Metric outputs: `qa-results/redesign/2026-02-21/metrics/north-star-evidence-*.json`

## Risk Register
1. Risk: Runtime data drift causing false North Star failures.
   - Impact: Blocked wave closure despite no UX regression.
   - Mitigation: deterministic seed warm-up before evidence capture.
2. Risk: Route-level regressions hidden by aggregate gate pass.
   - Impact: parity mismatch at route family edges.
   - Mitigation: run `v4-route-audit` with desktop+mobile and keep route audit artifact.

## PAR Gate
- Approved to build: Yes
- Approver: Codex execution
- Date: 2026-02-21
