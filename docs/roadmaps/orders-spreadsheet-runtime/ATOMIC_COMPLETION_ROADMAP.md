# Orders Initiative — Atomic Completion Roadmap

**Date**: 2026-03-20
**Goal**: Feature-complete and initiative-retired
**Current state**: G1–G4 closed, G5 partial (code done), G6–G7 blocked
**Remaining gates**: G5 closure → G6 verdict → G7 retirement

---

## Proof Row Inventory

| State            | Count | Rows                                         |
| ---------------- | ----- | -------------------------------------------- |
| live-proven      | 8     | 001, 002, 009, 011, 019, 022, 030, 032       |
| code-proven      | 19    | 003–007, 012, 015–018, 023–029, 033–035      |
| blocker          | 2     | 020 (multi-cell autosave), 021 (paste proof) |
| limitation       | 1     | 031 (sort/filter targeting)                  |
| adjacent partial | 2     | 008 (accounting), 010 (returns)              |
| blocked          | 2     | 013 (ownership), 014 (accounting output)     |

---

## Phase 1: Close G5 — Surfacing Gate

**Linear**: TER-791 | **Parallel agents**: 2 | **Est**: 1 session

All code is merged to main. Three items remain.

### Task 1A: ORD-SF-009 implementation

- **What**: Active-row vs focused-cell workflow target disambiguation
- **Proof row**: SALE-ORD-034 (already code-proven from G4)
- **Work**: Verify existing queue workflow-target badge and multi-row lockout already satisfy ORD-SF-009's exit criteria; update the rollout contract from `not-started` to `surfaced-and-proven` or implement the remaining disambiguation if a gap exists
- **Agent**: `coder-agent` (worktree isolation)
- **Gate**: `pnpm check && pnpm lint && pnpm test && pnpm build`

### Task 1B: Live staging proof screenshots

- **What**: Deploy main to staging, capture proof screenshots for all 3 surfaces (queue, support, document)
- **Evidence needed**: Build ID, commit SHA, route, record ID, screenshot for each surface showing: selection summary, affordance matrix, editable/locked cues, keyboard hints, workflow target badge
- **Agent**: `sre-agent` — run `pnpm proof:await-staging-build --commit <sha>` then capture proof bundle
- **Gate**: All 5 G5 proof rows (024–027, 033) have screenshot evidence

### Task 1C: G5 adversarial review

- **What**: Bounded adversarial review confirming no hidden-knowledge dependency
- **Depends on**: 1A + 1B
- **Agent**: `code-review-agent` — review G5 gate file, proof-row-map, screenshots, and rollout contract
- **Gate**: SHIP verdict, G5 status updated to `closed with evidence`

---

## Phase 2: Close G6 — Proof Verdict Sync

**Linear**: TER-792 | **Parallel agents**: 3 | **Est**: 2–3 sessions

### Task 2A: Promote code-proven rows to live-proven (batch)

- **What**: 19 code-proven rows need live staging proof to reach `live-proven`
- **Rows**: 003–007, 012, 015–018, 023–029, 033–035
- **Method**: Playwright proof harness against staging — one proof bundle per gate tranche:
  - G2 tranche: 029, 035 (clear-cell + failure-mode)
  - G3 tranche: 003–006, 012, 015–018 (document lifecycle)
  - G4 tranche: 007, 023, 034 (cross-surface)
  - G5 tranche: 024–027, 033 (surfacing)
- **Agent**: `test-automator-agent` × 3 (one per tranche, worktree isolation)
- **Gate**: Each row has a staging proof packet with build ID, screenshot, and negative-case evidence

### Task 2B: Resolve G2 blockers (020, 021) and limitation (031)

- **What**:
  - SALE-ORD-020 (multi-cell edit autosave): needs a fresh staging build with reachable document route, then prove multi-cell edit triggers autosave correctly
  - SALE-ORD-021 (paste proof): needs clipboard readback proof on staging
  - SALE-ORD-031 (sort/filter targeting): accepted as `limitation` — document the limitation boundary and reclassify to `accepted-limitation` or implement the missing sort/filter safety
- **Agent**: `coder-agent` for any code fixes + `sre-agent` for staging proof
- **Gate**: All 3 rows have a final verdict (live-proven, accepted-limitation, or rejected with evidence)

### Task 2C: Adjacent-owner acceptance

- **What**: Rows owned by adjacent teams need explicit acceptance or reclassification
  - SALE-ORD-008 (accounting launch): get acceptance from accounting owner or reclassify
  - SALE-ORD-010 (returns): get acceptance from returns owner or reclassify
  - SALE-ORD-013 (ownership-blocked): explicit owner decision
  - SALE-ORD-014 (accounting output): proof or reclassification
- **Agent**: `product-manager-agent` — draft acceptance requests, write Linear comments, track responses
- **Gate**: Each row has `adjacent-accepted`, `reclassified`, or `rejected with evidence`

### Task 2D: G6 reconciliation and verdict

- **Depends on**: 2A + 2B + 2C
- **What**:
  1. Reconcile proof-row-map: every SALE-ORD row is `live-proven`, `adjacent-owned`, `accepted-limitation`, or `rejected with evidence`
  2. Full adversarial review of the complete proof set
  3. Linear writeback — close TER-792, TER-804, TER-805
  4. Declare `proof-complete` and `tracker-complete`
- **Agent**: `code-review-agent` for adversarial review + `coder-agent` for writeback
- **Gate**: G6 status = `closed with evidence`, execution-metrics reflects zero open rows

---

## Phase 3: Close G7 — Retirement & Governance Handoff

**Linear**: TER-793 | **Parallel agents**: 2 | **Est**: 1 session

### Task 3A: Classic fallback policy

- **What**: Document the explicit fallback policy for any remaining classic-mode dependency
  - Which routes still need classic mode?
  - Under what conditions does classic mode re-enable?
  - What is the two-release audit cadence?
- **Agent**: `architect-agent` — analyze codebase for remaining classic references, draft policy
- **Gate**: Fallback policy documented in `G7-retirement-handoff.md`

### Task 3B: Adjacent-owner handoff and reopen criteria

- **What**:
  - Adjacent owners (accounting, shipping, returns) formally accept their retained seams
  - Reopen criteria are written: what regression or user report triggers re-opening the initiative?
  - Named owner for post-initiative monitoring is assigned
- **Agent**: `product-manager-agent` — draft handoff docs, collect acceptance
- **Gate**: All adjacent owners have accepted, reopen criteria documented, named owner assigned

### Task 3C: G7 closure and initiative retirement

- **Depends on**: 3A + 3B
- **What**:
  1. Update `G7-retirement-handoff.md` with all evidence
  2. Close TER-793, TER-806 in Linear
  3. Update roadmap README: all gates `closed with evidence`
  4. Declare `retirement-complete` — Orders exits special-initiative mode
- **Agent**: `coder-agent` for file updates + Linear writeback
- **Gate**: All 7 gates closed, Orders is no longer a special initiative

---

## Execution Dependency Graph

```
Phase 1 (G5):   1A ──┐
                 1B ──┤──→ 1C ──→ G5 CLOSED
                      │
Phase 2 (G6):   2A ──┐│
                 2B ──┤├──→ 2D ──→ G6 CLOSED
                 2C ──┘│
                       │
Phase 3 (G7):   3A ───┤──→ 3C ──→ G7 CLOSED → INITIATIVE RETIRED
                 3B ───┘
```

## Agent Team Delegation Summary

| Task                    | Agent Type                          | Isolation | Parallelizable      |
| ----------------------- | ----------------------------------- | --------- | ------------------- |
| 1A: ORD-SF-009          | `coder-agent`                       | worktree  | yes (with 1B)       |
| 1B: Staging proof       | `sre-agent`                         | none      | yes (with 1A)       |
| 1C: G5 review           | `code-review-agent`                 | none      | no (needs 1A+1B)    |
| 2A: Live-proof batch    | `test-automator-agent` ×3           | worktree  | yes (3 tranches)    |
| 2B: Blocker resolution  | `coder-agent` + `sre-agent`         | worktree  | yes (with 2A, 2C)   |
| 2C: Adjacent acceptance | `product-manager-agent`             | none      | yes (with 2A, 2B)   |
| 2D: G6 verdict          | `code-review-agent` + `coder-agent` | none      | no (needs 2A+2B+2C) |
| 3A: Fallback policy     | `architect-agent`                   | none      | yes (with 3B)       |
| 3B: Handoff + reopen    | `product-manager-agent`             | none      | yes (with 3A)       |
| 3C: G7 closure          | `coder-agent`                       | none      | no (needs 3A+3B)    |

**Total parallel slots**: Phase 1 uses 2 agents, Phase 2 uses up to 5 agents, Phase 3 uses 2 agents.
**Critical path**: 1A/1B → 1C → 2A/2B/2C → 2D → 3A/3B → 3C
**Estimated sessions to complete**: 4–5 (assuming 1 session ≈ 1 focused conversation)
