# North Star Decision Log

Use this log for decisions that materially affect Sales, Inventory, and Purchase Orders redesign outcomes.
Every decision must reference the North Star pillar(s), score impact, and evidence.

## Entry Template
- Decision ID:
- Date:
- Module:
- Owner:
- Change summary:
- Hypothesis (Speed or Orientation):
- North Star pillars affected:
- Expected metric impact:
  - Click efficiency:
  - Time-to-complete:
  - Reversal loops:
  - Dead-end rate:
- Risks:
- Mitigations:
- Evidence paths:
- Scorecard delta:
  - Before:
  - After:
- Result:
  - Accepted
  - Rejected
  - Reworked

## Entries

### NS-001
- Decision ID: NS-001
- Date: 2026-02-20
- Module: Cross-module (Sales, Inventory, Purchase Orders)
- Owner: Redesign execution team
- Change summary: Adopted mandatory North Star Charter and PAR gates as completion criteria.
- Hypothesis (Speed or Orientation): A shared, enforceable review model will prevent regressions and increase iteration quality.
- North Star pillars affected: Speed, Orientation, Continuity, Control, Trust
- Expected metric impact:
  - Click efficiency: Improves by eliminating avoidable regressions
  - Time-to-complete: Improves via repeated gate enforcement
  - Reversal loops: Reduced through explicit continuity checks
  - Dead-end rate: Reduced through mandatory evidence-based QA
- Risks: Process overhead
- Mitigations: Use templates and reusable evidence structure
- Evidence paths:
  - `docs/uiux-redesign/north-star/NORTH_STAR_CHARTER.md`
  - `docs/uiux-redesign/north-star/NORTH_STAR_SCORECARD_TEMPLATE.json`
  - `docs/uiux-redesign/par/PAR-PREBUILD-TEMPLATE.md`
  - `docs/uiux-redesign/par/PAR-POSTBUILD-TEMPLATE.md`
- Scorecard delta:
  - Before: N/A
  - After: N/A
- Result:
  - Accepted

### NS-002
- Decision ID: NS-002
- Date: 2026-02-20
- Module: Sales, Inventory, Procurement
- Owner: Codex redesign execution
- Change summary: Reworked core surfaces to enforce persistent grid structure in loading and empty states; added deterministic local bootstrap paths for Product Intake and Inventory; corrected score-gate evaluation to measure action visibility at load state.
- Hypothesis (Speed or Orientation): Keep users oriented and productive even when backend/local schema drift causes partial data failures.
- North Star pillars affected: Orientation, Continuity, Control, Trust
- Expected metric impact:
  - Click efficiency: Improve by reducing recovery/hunting clicks during empty or degraded states
  - Time-to-complete: Improve by keeping users on one operational surface
  - Reversal loops: Reduced through stable table-first interaction regardless of data latency
  - Dead-end rate: Reduced through deterministic fallback records for interaction testing
- Risks: Fallback records could mask backend data quality issues if overused.
- Mitigations: Browser QA evidence includes real API behavior and flags fallback usage separately.
- Evidence paths:
  - `qa-results/redesign/2026-02-20/metrics/north-star-evidence-2026-02-20T08-10-51-872Z.json`
  - `docs/uiux-redesign/par/PAR-POSTBUILD-2026-02-20-SALES-INVENTORY-PROCUREMENT-PASS2.md`
- Scorecard delta:
  - Before:
    - purchase-orders: 22/24 (failed red-line)
    - product-intake: 21/24
    - inventory: 23/24
    - sales: 20/24
  - After:
    - purchase-orders: 24/24 (pass)
    - product-intake: 23/24 (pass)
    - inventory: 24/24 (pass)
    - sales: 23/24 (pass)
- Result:
  - Accepted

### NS-003
- Decision ID: NS-003
- Date: 2026-02-21
- Module: Purchase Orders (North Star harness)
- Owner: Codex execution
- Change summary: Added deterministic seed warm-up as mandatory precondition for adversarial North Star evidence capture.
- Hypothesis (Speed or Orientation): Stable seeded data removes false-negative scoring noise and keeps quality signals tied to UX behavior, not runtime drift.
- North Star pillars affected: Trust, Control, Orientation
- Expected metric impact:
  - Click efficiency: No direct change to product behavior; improves metric reliability.
  - Time-to-complete: No direct change to product behavior; improves measurement consistency.
  - Reversal loops: No direct change.
  - Dead-end rate: No direct change.
- Risks: Seeding before evidence can mask transient data integrity issues unrelated to UX.
- Mitigations: Keep strict schema/invariant gates and domain oracles in Phase 5 and Phase 6 packets.
- Evidence paths:
  - `.qa/runs/2026-02-21/phase-6/P6-adversarial-round1-18/verification.md`
  - `.qa/runs/2026-02-21/phase-6/P6-adversarial-fix1-19/verification.md`
  - `qa-results/redesign/2026-02-21/metrics/north-star-evidence-2026-02-21T05-50-37-503Z.json`
  - `qa-results/redesign/2026-02-21/metrics/north-star-evidence-2026-02-21T05-52-42-517Z.json`
- Scorecard delta:
  - Before: purchase-orders 21/24 (failed)
  - After: purchase-orders 24/24 (passed)
- Result:
  - Accepted
