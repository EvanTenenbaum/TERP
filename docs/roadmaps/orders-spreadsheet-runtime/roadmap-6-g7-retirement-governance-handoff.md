# Roadmap 6 — G7 Retirement And Governance Handoff

## Status Block

- Gate: `G7`
- Linear gate: `TER-793`
- Current verdict: `open`
- Execution state: `blocked pending Roadmap 5`
- Prerequisites: Roadmap 5 `closed with evidence`
- Gate file: [G7-retirement-handoff.md](../../specs/spreadsheet-native-foundation/orders-runtime/G7-retirement-handoff.md)

## Objective

Finish the governance work that lets Orders leave special-initiative mode and operate as a normal TERP capability.

## Allowed Inputs

- Linear issues: `TER-793`, `TER-806`, `TER-766`
- Durable files:
  - `orders-runtime/G7-retirement-handoff.md`
  - `orders-runtime/00-program-charter.md`
  - `orders-runtime/execution-metrics.json`
- Proof rows:
  - `SALE-ORD-008`
  - `SALE-ORD-009`
  - `SALE-ORD-010`
  - `SALE-ORD-011`
  - `SALE-ORD-013`
  - `SALE-ORD-014`

## Implementation Tranches

1. Write explicit classic fallback policy and boundaries.
2. Record adjacent-owner acceptance for retained seams.
3. Define audit cadence, reopen criteria, and named long-term owner.
4. Define the two-release monitoring contract and the P0/P1 reopen rule.
5. Close the parent initiative only after governance is durable.

## Validation Commands And Proof Artifacts

Docs-only:

- `rg -n "fallback|owner|audit cadence|reopen|two-release" docs/specs/spreadsheet-native-foundation/orders-runtime docs/roadmaps/orders-spreadsheet-runtime`
- `jq '.' docs/specs/spreadsheet-native-foundation/orders-runtime/execution-metrics.json`

Required artifacts:

- explicit fallback policy
- adjacent-owner acceptance notes
- named owner
- audit cadence
- reopen thresholds

## Adversarial Review Requirement

- Challenge any retirement claim that lacks named ownership or clear fallback boundaries.
- Reject the roadmap if governance depends on tribal knowledge.

## Stop-Go Conditions

- Stop if long-term owner is unnamed.
- Stop if fallback policy or reopen criteria are vague.
- Go only when the initiative can survive normal TERP operations without special handling.

## Completion Writeback

1. Update `G7-retirement-handoff.md`, `00-program-charter.md`, and `execution-metrics.json`.
2. Update `TER-793`, `TER-806`, and parent `TER-766`.
3. Set this roadmap verdict to `closed with evidence` only after the two-release monitoring contract is documented.

## Reopen Triggers

- a P0 or P1 gate reopens within the next two releases
- adjacent owner rejects retained seam ownership
- audit cadence is missed or removed
