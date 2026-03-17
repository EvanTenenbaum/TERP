# Specification: Spreadsheet-Native Pilot Module Selection and Cutover Plan

**Task:** ARCH-SS-008: Pilot Module Selection and Cutover Plan for Spreadsheet-Native TERP  
**Status:** Draft  
**Priority:** CRITICAL  
**Estimate:** 18h planning / rollout design  
**Module:** Pilot planning, rollout strategy, cutover governance  
**Dependencies:** [SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md](./SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md), [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md), [SPREADSHEET-NATIVE-CAPABILITY-LEDGER-TEMPLATE.md](./SPREADSHEET-NATIVE-CAPABILITY-LEDGER-TEMPLATE.md), [FEATURE_PRESERVATION_MATRIX.md](./ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md)  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

The fork needs real pilot modules, not abstract “we’ll start somewhere” language.

Bad pilot selection creates avoidable failure:

- exception-heavy surfaces get picked too early
- simple pilots fail to prove the real model
- complex pilots overwhelm the still-young sheet engine
- cutover happens before parity is proven

This plan defines:

- how pilots are selected
- which pilots are currently recommended
- how coexistence works
- when cutover is allowed
- when rollback is mandatory

## 2. Pilot Selection Principles

Good pilots should:

- fit the sheet archetypes naturally
- be high-frequency enough to matter
- expose real workflow complexity
- avoid declared exception surfaces
- allow side-by-side parity verification
- have strong existing route and API clarity

Bad pilots:

- calendar / scheduling
- image-heavy photography review
- customer-facing live shopping
- VIP portal
- highly exceptional admin surfaces with low daily usage

## 3. Pilot Scoring Criteria

Each candidate should be scored across:

- workflow frequency
- sheet-archetype fit
- hidden dependency load
- exception-surface reliance
- reporting/output burden
- rollback simplicity
- parity measurability

## 4. Recommended Pilot Order

### Pilot 1: Operations Workbook, Inventory Sheet

Recommended target:

- `Operations -> Inventory`

Why it is first:

- strong `registry sheet` fit
- high operational frequency
- existing TERP already has grid-oriented inventory work
- lower document-output burden than sales or accounting
- validates row identity, selection, inspector, filters, bulk actions, and save state

What it proves:

- primary table behavior
- registry-sheet viability
- inspector discipline
- bulk action handling
- role-safe views
- performance with large operational datasets

What it does not prove:

- document-sheet transaction complexity
- formal document outputs
- deep multi-stage workflow transitions

### Pilot 2: Sales Workbook, Orders Sheet

Recommended target:

- `Sales -> Orders`

Why it is second:

- strong `document sheet` fit
- high business value
- validates header + lines + status progression
- forces clear save/transaction semantics
- tests adjacent tables and explicit workflow transitions

What it proves:

- document-sheet model
- supporting-table coordination
- readiness and workflow transitions
- save / document commit behavior
- more realistic parity burden than pilot 1

### Follow-On Candidate: Operations Workbook, Receiving Sheet

Recommended after pilot 1 and 2:

- `Operations -> Receiving`

Why not first:

- queue + transaction complexity
- likely higher hidden dependency load than Inventory

Why it matters early:

- validates queue/conveyor behavior
- validates intake-heavy operational workflows

## 5. Explicit Non-Pilot List

The following are excluded from initial pilots:

- Calendar / Scheduling
- Photography Review
- Live Shopping
- VIP Portal
- accounting close / period-locking flows

Reason:

- they either belong to exception surfaces or carry too much early-stage risk for the first pilot wave

## 6. Pilot Preconditions

Before any pilot implementation begins, the team must complete:

1. source appendix for pilot scope
2. discrepancy log for pilot scope
3. capability ledger for pilot scope
4. golden flow identification
5. output/print dependency mapping
6. permissions and role review
7. rollback path definition
8. parity evidence checklist

## 7. Coexistence Model

### 7.1 Shadow Mode

Initial pilot should support shadow use:

- legacy surface remains primary
- sheet-native surface is available to pilot users
- evidence and workflow observations are collected

### 7.2 Opt-In Pilot Mode

After shadow validation:

- selected users/roles may choose the sheet-native pilot surface
- legacy fallback remains immediate

### 7.3 Controlled Default Mode

After parity evidence:

- pilot users see sheet-native surface by default
- legacy path remains available behind explicit fallback

### 7.4 Retirement Mode

Only after repeated evidence and low incident rate:

- legacy surface becomes read-only, hidden, or retired per module plan

## 8. Cutover Gates

Cutover to sheet-native default requires:

- completed source appendix and reviewed discrepancy log
- completed and reviewed capability ledger
- all P0/P1 pilot capabilities implemented or explicitly excepted
- parity evidence attached
- no unresolved P0/P1 source discrepancies
- no unresolved P0 regressions
- rollback tested
- pilot telemetry reviewed

## 9. Rollback Rules

Rollback is required if:

- a P0 flow is blocked
- save-state truth is compromised
- audit/output behavior is broken
- role-safe rendering fails
- user completion time regresses materially with no acceptable mitigation

## 10. Feature Work During Coexistence

During coexistence:

- new features touching the pilot scope must account for both surfaces, or
- the surface strategy must be explicitly frozen with product sign-off

Disallowed:

- silently adding features only to legacy while claiming the pilot remains current
- shipping pilot-only behavior without documenting the legacy gap

## 11. Pilot Evidence Package

Every pilot milestone must produce:

- capability ledger status snapshot
- flow screenshots or recordings
- command outputs / test evidence
- parity findings
- unresolved issues list
- rollback status

## 12. Success Metrics

Pilot success should be measured by:

- completion time vs current TERP
- context switches per task
- sidecar dependency on happy path
- save/conflict incident rate
- parity defects discovered
- fallback usage rate

## 13. Cutover Sequence

Recommended sequence:

1. governance and contract docs
2. pilot ledgers
3. pilot blueprint
4. internal build
5. shadow validation
6. opt-in pilot
7. controlled default
8. legacy retirement decision

## 14. Adversarial QA Findings and Resolutions

### Finding 1: “Inventory might be too easy and fail to prove the hard parts.”

Risk:

- pilot 1 succeeds but does not validate document complexity

Resolution:

- selected Orders as the second pilot explicitly to prove document-sheet behavior

### Finding 2: “Orders might be too risky to run early.”

Risk:

- document complexity breaks the early engine

Resolution:

- kept Orders second, not first
- required Inventory first to stabilize registry-sheet mechanics

### Finding 3: “Coexistence can drag on forever and create double-maintenance pain.”

Risk:

- fork never commits to cutover

Resolution:

- defined explicit coexistence stages and cutover gates

### Finding 4: “Teams may treat pilot choice as preference rather than evidence-driven.”

Risk:

- politically favored modules jump the queue

Resolution:

- defined scoring criteria, non-pilot list, and required preconditions

## 15. Approval Checklist

- [ ] Product approves the recommended pilot order
- [ ] Engineering approves coexistence and rollback stages
- [ ] QA approves the evidence package and cutover gates
- [ ] Pilot owners are named before implementation starts
