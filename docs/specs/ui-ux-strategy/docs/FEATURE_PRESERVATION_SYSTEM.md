# FEATURE_PRESERVATION_SYSTEM.md

**Status:** REQUIRED PROCESS

This system prevents critical product features, workflows, and requirements from being lost during refactors or UI redesign.

It is designed for **AI-assisted development**, where scope loss often occurs due to:
- incomplete context in a prompt,
- over-aggressive “simplification,”
- accidental deletion of edge-case behavior.

---

## 1) The Problem

UX redesigns frequently fail because:
- feature requirements get dropped
- the app becomes “prettier but less capable”
- muscle memory gets broken
- accounting/operations logic is silently corrupted

TERP is especially vulnerable because:
- the project is late-stage MVP
- development is AI-driven
- workflow correctness matters (inventory + money)

---

## 2) The Solution: 4 artifacts + 1 policy

### Artifact A — Canonical Feature Inventory (CFI)
A single doc representing the authoritative list of:
- workflows
- critical features
- validations
- dependencies

**Rule:** Every PR must reference the CFI and confirm:
- features preserved
- features changed (with justification)


### Artifact B — UX Pattern Registry (this exists)
Defines the allowed UI patterns.

**Rule:** Any new UI must map to existing patterns.


### Artifact C — Golden Flows
A shortlist (5–10) of “must never break” flows.

Each Golden Flow is expressed as:
- steps
- expected outputs
- known edge cases

**Rule:** Every PR that touches relevant code must validate the Golden Flows.


### Artifact D — Decision Log
Records design decisions and the evidence hierarchy behind them.

**Rule:** When a PR changes behavior, update the decision log entry.


### Policy — No Silent Deletions
If a PR removes or downgrades a feature:
- it must be explicitly listed in PR summary
- it must state why removal is correct
- it must identify what replaces it (if anything)

---

## 3) Evidence hierarchy (for disputes)

When recommendations conflict, prefer evidence in this order:

1. Direct user quotes / transcription
2. Observed user behavior (video/frame notes)
3. Repo’s existing workflow docs/specs
4. Proven patterns in similar products (named + relevant)
5. General best practices
6. AI speculation

---

## 4) PR Checklist Template (agents must fill)

Copy into every PR description that affects UX/workflows:

- [ ] **CFI referenced**: which workflows/features are impacted?
- [ ] **No silent deletions**: list any removed/downgraded behavior.
- [ ] **Keyboard contract preserved**: Tab/Enter/Esc behavior verified.
- [ ] **Save-state contract**: Saved / Saving / Needs attention.
- [ ] **Golden flows validated**: list flows validated + outcomes.
- [ ] **Edge cases considered**: notes on failures or follow-ups.
- [ ] **Tests updated**: unit/integration/e2e adjustments made.

---

## 5) How to build/maintain the CFI

The Canonical Feature Inventory should:
- be human-scannable
- be stable (avoid churn)
- link to source docs/specs for details

Suggested structure:

- Module: Intake
  - Direct Intake (compressed workflow)
  - Standard PO planning
  - Receipt creation
  - Batch creation

- Module: Sales
  - Orders
  - Payments
  - Fulfillment

- Module: Ledger
  - Client ledger view
  - Transactions: payments, invoices, adjustments

**Important:** The ledger already has significant documentation in repo. Do not invent or replace it.

---

## 6) What this system prevents

- Losing payment terms in intake
- Removing back buttons accidentally
- Destroying global navigation consistency
- Accidentally removing audit/history surfaces
- Turning Work Surfaces into inconsistent bespoke screens

