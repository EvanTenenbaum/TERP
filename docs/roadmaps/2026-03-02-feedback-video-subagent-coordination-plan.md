# 2026-03-02 Feedback Video Sub-Agent Coordination Plan

## Topology

- Pattern: Supervisor-led hierarchical multi-agent execution with evidence-only merge gating.
- Supervisor lane owns sequencing, dependency arbitration, and Linear state transitions.
- Delivery lanes operate in isolated worktrees/branches per atomic ticket.

## Role lanes and ownership boundaries

1. Product decomposition + acceptance contract lane

- Owns: acceptance contracts, scope integrity, dependency updates.
- Must not: implement UI behavior directly unless explicitly re-assigned.

2. UI/UX implementation lane

- Owns: layout density, control placement, discoverability, visual consistency.
- Must not: alter backend transition logic.

3. Frontend behavior/state lane

- Owns: client state, drawer contracts, filter persistence, deterministic UI behavior.
- Must not: modify server-side state machine contracts without backend lane handoff.

4. Backend/API/data-contract lane (ticket-conditional)

- Owns: mode semantics, transition maps, pricing defaults, permission contracts.
- Must not: ship UI-only text/layout changes without UX lane review.

5. QA/eval lane

- Owns: V4 gate execution, adversarial tests, requirements-to-evidence matrix.
- Must not: close implementation tickets; only publish PASS/BLOCKED verdict.

6. Release/readiness lane

- Owns: merge queue, wave closeout checklist, regression gate, release verdict.
- Must not: bypass QA gate or merge unverified tickets.

## Handoff contracts

Each handoff packet must include:

- Objective and atomic ID.
- Inputs (artifact paths, ticket links, resolved decisions).
- Constraints (mode defaults, no-scope boundaries, dependency lock).
- Output schema (changed files, tests run, evidence links, rollback note).
- Verification commands + expected PASS criteria.

## Parallel vs serial execution

### Can run in parallel

- Wave 1: `CF-001` and `CF-002` after kickoff.
- Wave 2: `CF-005`, `CF-006`, and `CF-010` once `CF-003` is complete.
- Wave 4: Cross propagation on Pick & Pack and Orders per A-item.
- Wave 5: Accounting and Clients propagation tasks by A-item.

### Must run serially

- `CF-003 -> CF-004` (layout dependency).
- `CF-006 -> CF-007 -> CF-008` (drawer/p pricing contract chain).
- `CF-010 -> CF-011 -> CF-012` (mode + status reliability chain).
- Wave progression for propagation: `W4 -> W5 -> W6`.

## Blocker rules

- Any unresolved dependency or failed verification command sets ticket state to BLOCKED.
- RED-risk tickets (`CF-008`, `CF-011`, `CF-012`, and RED cross tasks) require explicit rollback note before merge.
- No ticket can move to Done without attached evidence packet and QA lane PASS.

## Arbitration flow

1. Conflicting implementation claims are resolved by evidence, not confidence.
2. Supervisor compares reproducible outputs and acceptance coverage.
3. QA lane executes tie-break adversarial check.
4. Final ruling documented in Linear comment with rationale and next action.

## Merge order

1. Core Wave 1 foundation.
2. Core Wave 2 composer/drawer contracts.
3. Core Wave 3 semantics and reliability.
4. Cross Wave 4 (Pick & Pack + Orders).
5. Cross Wave 5 (Accounting + Clients).
6. Cross Wave 6 (Inventory) then release gate.
