# PAR Inflight Amendment (P6 Round 1)

## Trigger
- Wave: Phase 6 Adversarial Round 1 (`P6-adversarial-round1-18`)
- Trigger date: 2026-02-21
- Regression detected: `pnpm uiux:north-star:evidence` failed with `purchase-orders` score `21/24`.

## Evidence
- Failing packet: `.qa/runs/2026-02-21/phase-6/P6-adversarial-round1-18/verification.md`
- Failing metric file: `qa-results/redesign/2026-02-21/metrics/north-star-evidence-2026-02-21T05-50-37-503Z.json`
- Failure condition: functional parity criterion failed due drifted runtime state.

## Amendment
- Process change: enforce deterministic seed warm-up before adversarial North Star capture.
- Commands added to fix/reverify flow:
  - `pnpm seed:redesign:v2`
  - `pnpm seed:redesign:v2:verify`

## Expected Outcome
- Remove false-negative North Star failures caused by dataset drift.
- Preserve strict gate quality while keeping adversarial signal meaningful.

## Approval
- Approved: Yes
- Owner: Codex execution
- Date: 2026-02-21
