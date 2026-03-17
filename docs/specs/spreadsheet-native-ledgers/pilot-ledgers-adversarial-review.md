# Adversarial Review: Inventory and Orders Pilot Ledgers

Snapshot:

- Commit reviewed: `00fbedf608cff51b0e73b61057b9907b4eee24b2`
- Review date: `2026-03-13`
- Reviewed artifacts:
  - `operations-inventory-sheet-capability-ledger.csv`
  - `operations-inventory-sheet-capability-ledger-summary.md`
  - `operations-inventory-sheet-discrepancy-log.md`
  - `sales-orders-sheet-capability-ledger.csv`
  - `sales-orders-sheet-capability-ledger-summary.md`
  - `sales-orders-sheet-discrepancy-log.md`

## Review Standard

This review assumed the ledger set had been written by a new team with partial product understanding.

The review deliberately tried to break the artifacts by asking:

- are the rows really grounded in current code and routes
- are scope boundaries hiding adjacent functionality
- are the docs being trusted where code already contradicts them
- are blocked areas being called blocked or just hand-waved
- is the artifact internally consistent enough to trust during blueprinting

## Findings and Improvements

### `AR-001` Inventory ledger was initially too doc-trusting for core batch workflows

Problem:

- the matrix and guide do not represent the aggregate `inventory.*` procedures that the current inventory workbook actually runs

Why this was dangerous:

- the ledger would have looked complete while missing the real browse, stats, add-inventory, bulk, and update paths

Improvement applied:

- inventory rows were rewritten around current workbook code evidence
- discrepancy `INV-D001` and `INV-D002` were added
- inventory summary now reports direct code-vs-matrix overlap explicitly

### `AR-002` Inventory status editing was overstated

Problem:

- the first pass implied broad batch metadata editing from the workbook
- deeper validation showed the current workbook directly proves status editing, not a full metadata editor

Why this was dangerous:

- blueprint writers could have preserved a fictional inline-edit surface and missed the actual current behavior

Improvement applied:

- `OPS-INV-004` was narrowed to status transitions
- success criteria, API dependencies, and hidden dependencies were rewritten around `inventory.updateStatus`

### `AR-003` Inventory view controls hid a real photography dependency

Problem:

- the first pass treated saved views, gallery mode, and export as a generic toolbar row
- deeper validation showed gallery mode reads `photography.getBatchImages`, and saved views have shared/private ownership rules

Why this was dangerous:

- the pilot could have lost thumbnails, leaked saved views across users, or accidentally swallowed photography ownership

Improvement applied:

- `OPS-INV-011` now captures thumbnail reads, shared/private view behavior, and export truncation
- `INV-D005` was expanded to reflect those cross-surface risks

### `AR-004` Inventory destructive flows under-modeled undo and eligibility behavior

Problem:

- the first pass captured bulk delete and quantity adjustment, but it did not explicitly preserve zero-on-hand eligibility and the current 10-second undo window

Why this was dangerous:

- the spreadsheet-native fork could have felt “mostly right” while still removing important operator safety rails

Improvement applied:

- `OPS-INV-005` and `OPS-INV-006` now preserve recent undo behavior explicitly
- delete eligibility is now called out as a first-class guardrail

### `AR-005` Orders ledger initially missed draft deletion entirely

Problem:

- the current workbook supports deleting drafts from the inspector, but the first pass did not have a ledger row for it

Why this was dangerous:

- a destructive but necessary real-world flow could have been dropped without anyone noticing until migration

Improvement applied:

- `SALE-ORD-015` was added for draft deletion
- the discrepancy analysis now distinguishes current `orders.delete` from legacy `orders.deleteDraftOrder`

### `AR-006` Orders ledger initially flattened too much of the create-order experience

Problem:

- the actual current sales workflow uses route-seeded entry modes, quote duplication, sales-sheet handoff, autosave, and unsaved-change protection

Why this was dangerous:

- a single broad create/edit row would have hidden how users really enter and safely work inside the composer

Improvement applied:

- `SALE-ORD-016` now covers seeded entry modes
- `SALE-ORD-017` now covers autosave and navigation-loss protection
- new discrepancies `ORD-D008` and `ORD-D009` were added

### `AR-007` Orders ledger initially missed customer money, pricing, and referral sidecars

Problem:

- the first pass underweighted the order composer’s direct use of customer drawer, pricing profile, referral credits, and relationship-profile context

Why this was dangerous:

- blueprint writers could have treated those as “nice extras” and lost meaningful current workflow power

Improvement applied:

- `SALE-ORD-018` was added
- the summary now includes direct child components and their cross-domain procedures

### `AR-008` Orders ledger over-trusted legacy documented procedures in several rows

Problem:

- the first pass used legacy or doc-owned procedures like `orders.calculatePrice`, `orders.fulfillOrder`, `orders.deliverOrder`, and `orders.getAuditLog` too casually inside current workbook rows

Why this was dangerous:

- the ledger would have looked more complete than it really was and blurred the difference between current workbook behavior and legacy/adjacent behavior

Improvement applied:

- edit, fulfillment, and return rows were narrowed to current workbook behavior
- doc-only or legacy ownership is now treated as discrepancy or hidden dependency instead of direct coverage

### `AR-009` The first pass trusted the summaries more than the CSVs

Problem:

- summary classification counts had already drifted away from the CSVs

Why this was dangerous:

- a reviewer could have trusted the summary while the actual ledger told a different story

Improvement applied:

- both summaries were rebuilt from the current CSV state
- direct coverage counts were recalculated after deeper validation

### `AR-010` The current orders workbook exposes at least one misleading affordance

Problem:

- the inspector shows a Download Invoice button with no wired workbook handler

Why this was dangerous:

- a new team could have counted it as preserved functionality when it is really unresolved ownership

Improvement applied:

- discrepancy `ORD-D010` was added
- the export/output row explicitly treats it as unresolved, not covered

### `AR-011` Workbook route ownership drifted back into the ledgers after the source reconciliation

Problem:

- several orders ledger rows still described the current surface as `/orders?...` even after the source-of-truth docs and staging evidence showed that `/sales?tab=orders` and `/sales?tab=create-order` are the real workbook routes

Why this was dangerous:

- the pilot artifacts would have reintroduced the same ambiguity they were supposed to remove, especially for blueprint writers trying to map current functionality to future sheet ownership

Improvement applied:

- orders ledger rows were normalized to the current `/sales` workbook routes
- legacy `/orders*` paths are now treated as compatibility routes or deep-link expectations instead of the primary current surface

### `AR-012` Live staging proof exposed sharper ownership boundaries than the code-only review

Problem:

- code review alone could not prove whether current quick actions were genuinely operational or just visible affordances

Why this was dangerous:

- a future fork could preserve dead or inert affordances and still claim “feature parity”

Improvement applied:

- live staging proof confirmed that `Make Payment` is a real cross-workbook handoff to Accounting
- live staging proof also confirmed that `Download Invoice` is still visually present but functionally inert on the current orders surface
- inventory live proof confirmed real gallery and export behavior, while also showing that `Save View` is narrower than a generic “save any visible state” promise

## Remaining Open Risks

These were blocking at the time of the review and were later resolved by the March 14, 2026 ownership seams memo:

- `INV-D004`
- `INV-D007`
- `ORD-D005`
- `ORD-D007`

These remain open but are not blueprint-blocking on their own:

- `INV-D006`
- `ORD-D010`

## Decision

The ledger set is now strong enough to use as a real pilot-planning input and as a migration threat model.

It is now strong enough to support pilot blueprints from an ownership perspective, but it still requires live proof completion for the remaining `partial` and `code-proven` P0/P1 rows.
