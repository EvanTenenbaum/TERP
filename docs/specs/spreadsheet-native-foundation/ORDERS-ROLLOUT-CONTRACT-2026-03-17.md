# Orders Rollout Contract

Date: `2026-03-17`

## Purpose

This document is the canonical anti-drift rollout contract for `Sales -> Orders`.

It exists to prevent four failure modes:

- requirements getting lost during implementation
- spreadsheet behavior being built but not surfaced
- queue and document work diverging into different interaction grammars
- release claims getting ahead of what users can actually discover and do

Rules:

- every Orders rollout task must map to at least one requirement row below
- every requirement row must name its implementation source and proof source
- a row is only release-ready when it is both implemented and surfaced
- `implemented-not-surfaced` blocks rollout exactly the same way as a broken feature

## Status Legend

- `open`: not implemented yet
- `implemented`: code exists, but surfacing or live proof is still incomplete
- `live-proven`: implemented, surfaced, and proven in staging

`implemented-not-surfaced` is tracked in the independent surfacing-status column below, not as a top-level release status.

## Canonical Requirement Table

| Requirement ID | User outcome                                                               | User-visible behavior                                                                                                                                                           | Surface       | Owner class       | Implementation source                                                                                       | Proof source                                   | Release status |
| -------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------- |
| `ORD-WF-001`   | Find and assess the right order quickly                                    | Queue supports browse, filter, and deep-link selection                                                                                                                          | queue         | Orders-owned      | `OrdersSheetPilotSurface` queue mode                                                                        | `SALE-ORD-001`, `SALE-ORD-002`                 | `live-proven`  |
| `ORD-WF-002`   | Keep context synchronized                                                  | Linked support tables and inspector follow the active order                                                                                                                     | support grid  | Orders-owned      | queue + linked detail + inspector wiring                                                                    | `SALE-ORD-002`, `SALE-ORD-007`                 | `live-proven`  |
| `ORD-WF-003`   | Create and edit drafts inside sheet-native Orders                          | Document mode owns new draft and draft reopen paths                                                                                                                             | document grid | Orders-owned      | `OrderCreatorPage` in sheet-native document mode                                                            | `SALE-ORD-003`, `SALE-ORD-004`                 | `implemented`  |
| `ORD-WF-004`   | Save safely and finalize with trust                                        | Autosave, save-state, nav protection, and finalize guardrails remain visible                                                                                                    | document grid | Orders-owned      | existing save-state and finalize orchestration                                                              | `SALE-ORD-005`, `SALE-ORD-017`                 | `implemented`  |
| `ORD-WF-005`   | Start from seeded business context                                         | Quote, client, need, and sales-sheet entry routes hydrate the document sheet                                                                                                    | document grid | Orders-owned      | current route hydration and redirect logic                                                                  | `SALE-ORD-016`, `SALE-ORD-018`                 | `implemented`  |
| `ORD-WF-006`   | Manage draft lifecycle from sheet-native surfaces                          | Reopen, delete, and confirm drafts without classic fallback                                                                                                                     | cross-surface | Orders-owned      | queue actions + document finalize return                                                                    | `SALE-ORD-006`, `SALE-ORD-015`                 | `implemented`  |
| `ORD-WF-007`   | Continue downstream sales work from confirmed orders                       | Confirmed queue state preserves explicit accounting and shipping handoffs                                                                                                       | queue         | Orders-owned      | queue confirmed state and handoff actions                                                                   | `SALE-ORD-007`, `SALE-ORD-009`, `SALE-ORD-011` | `implemented`  |
| `ORD-WF-008`   | Convert quote-linked work into Orders without ownership ambiguity          | Quote-to-order and sale-conversion entry paths are explicitly owned inside the Orders rollout contract and either land in sheet-native Orders or are reclassified with evidence | cross-surface | Orders-owned      | route canonicalization plus adjacent Quotes evidence; explicit sheet-native conversion ownership still open | `SALE-ORD-012`, `SALE-ORD-028`                 | `open`         |
| `ORD-WF-009`   | Manage document rows with spreadsheet-native speed                         | The Orders document grid supports row insert, row duplicate, and row delete without escaping the shared spreadsheet runtime                                                     | document grid | Orders-owned      | `PowersheetGrid` row operations reusing existing line-item semantics                                        | `SALE-ORD-032`                                 | `implemented`  |
| `ORD-SS-001`   | Drag-select a range like a spreadsheet                                     | Drag creates rectangular selection ranges                                                                                                                                       | cross-surface | Foundation-shared | shared `PowersheetGrid` selection runtime                                                                   | `SALE-ORD-019`                                 | `implemented`  |
| `ORD-SS-002`   | Extend a range with Shift                                                  | `Shift+click` and `Shift+Arrow` extend from anchor                                                                                                                              | cross-surface | Foundation-shared | shared `PowersheetGrid` selection runtime                                                                   | `SALE-ORD-019`                                 | `implemented`  |
| `ORD-SS-003`   | Build discontiguous selections                                             | `Cmd+click` adds or removes cells or ranges                                                                                                                                     | cross-surface | Foundation-shared | shared `PowersheetGrid` discontiguous selection model                                                       | `SALE-ORD-019`                                 | `implemented`  |
| `ORD-SS-004`   | Select row, column, or current scope quickly                               | Row headers, column headers, and `Cmd+A` work consistently                                                                                                                      | cross-surface | Foundation-shared | shared `PowersheetGrid` selection scope controls                                                            | `SALE-ORD-019`                                 | `implemented`  |
| `ORD-SS-005`   | Copy tabular values out of TERP                                            | Selected cells copy as rectangular tabular data                                                                                                                                 | cross-surface | Foundation-shared | clipboard export contract in shared grid adapter                                                            | `SALE-ORD-021`                                 | `implemented`  |
| `ORD-SS-006`   | Paste spreadsheet data into Orders                                         | Rectangular paste maps from active cell into approved fields                                                                                                                    | document grid | Foundation-shared | clipboard import + field policy in shared grid adapter                                                      | `SALE-ORD-020`, `SALE-ORD-021`                 | `implemented`  |
| `ORD-SS-007`   | Edit many cells efficiently                                                | Approved fields support multi-cell updates without bypassing pricing or validation                                                                                              | cross-surface | Foundation-shared | multi-cell edit runtime on shared powersheet foundation                                                     | `SALE-ORD-020`                                 | `implemented`  |
| `ORD-SS-008`   | Repeat values with fill behavior                                           | Drag-fill or equivalent fill affordance works on approved fields                                                                                                                | cross-surface | Foundation-shared | shared fill runtime                                                                                         | `SALE-ORD-022`                                 | `implemented`  |
| `ORD-SS-009`   | Recover confidently from spreadsheet edits                                 | Undo/redo works for spreadsheet edits and keeps save-state intact                                                                                                               | cross-surface | Foundation-shared | powersheet + undo integration                                                                               | `SALE-ORD-020`, `SALE-ORD-022`                 | `implemented`  |
| `ORD-SS-010`   | Clear or cut spreadsheet data predictably                                  | Cut, clear, and delete-cell actions behave consistently on approved editable cells and reject locked cells clearly                                                              | cross-surface | Foundation-shared | clear-cell and clipboard contracts                                                                          | `SALE-ORD-029`, `SALE-ORD-035`                 | `implemented`  |
| `ORD-SS-011`   | Move and edit like a real spreadsheet without relearning controls          | Tab, Shift+Tab, Enter, Shift+Enter, and Escape behave consistently across Orders spreadsheet surfaces                                                                           | cross-surface | Foundation-shared | edit-navigation runtime                                                                                     | `SALE-ORD-030`                                 | `implemented`  |
| `ORD-SS-012`   | Trust sort and filter state during editing                                 | Selection, paste, and fill targeting stay stable and safe after sort or filter changes                                                                                          | cross-surface | Foundation-shared | sort/filter-safe targeting rules                                                                            | `SALE-ORD-031`, `SALE-ORD-035`                 | `implemented`  |
| `ORD-SF-001`   | Understand selection state at a glance                                     | Focused cell, anchor, range, and discontiguous state are visibly legible                                                                                                        | cross-surface | Foundation-shared | selection styling contract                                                                                  | `SALE-ORD-024`                                 | `implemented`  |
| `ORD-SF-002`   | Know what is editable before trying                                        | Editable, locked, and workflow-owned cells are visibly distinct                                                                                                                 | cross-surface | Foundation-shared | field-state styling contract                                                                                | `SALE-ORD-025`                                 | `implemented`  |
| `ORD-SF-003`   | Stay oriented while editing                                                | Selection summary, save state, and blocked feedback remain visible                                                                                                              | cross-surface | Foundation-shared | status bar + selection summary integration                                                                  | `SALE-ORD-024`                                 | `implemented`  |
| `ORD-SF-004`   | Understand blocked paste or fill behavior                                  | Rejected spreadsheet actions explain why they were blocked                                                                                                                      | cross-surface | Foundation-shared | blocked-field messaging contract                                                                            | `SALE-ORD-024`, `SALE-ORD-025`, `SALE-ORD-035` | `implemented`  |
| `ORD-SF-005`   | Learn the interaction model without guessing                               | Keyboard modifiers and sheet shortcuts are surfaced consistently                                                                                                                | cross-surface | Foundation-shared | `KeyboardHintBar` integration                                                                               | `SALE-ORD-026`                                 | `implemented`  |
| `ORD-SF-006`   | Keep spreadsheet behavior consistent wherever Orders work happens          | Queue, support grid, and document grid expose the same spreadsheet grammar and action reachability rather than drifting into different interaction models                       | cross-surface | Foundation-shared | multi-surface `PowersheetGrid` adoption                                                                     | `SALE-ORD-023`, `SALE-ORD-026`                 | `implemented`  |
| `ORD-SF-007`   | Keep workflow actions explicit after spreadsheet edits                     | Finalize, accounting, and shipping remain visibly separate from cell editing                                                                                                    | cross-surface | Orders-owned      | current queue and document action surfaces                                                                  | `SALE-ORD-027`                                 | `implemented`  |
| `ORD-SF-008`   | Find the right spreadsheet affordances in every required Orders surface    | Queue, support grid, and document grid each expose a clear discoverability matrix for selection, clipboard, fill, save state, and workflow actions                              | cross-surface | Foundation-shared | future per-surface affordance matrix                                                                        | `SALE-ORD-026`, `SALE-ORD-033`                 | `open`         |
| `ORD-SF-009`   | Understand exactly what workflow actions will target before advancing work | Focused row, focused cell, selected range, and workflow-action targeting remain visibly unambiguous before finalize or handoff actions                                          | cross-surface | Orders-owned      | future queue/document/action targeting clarity                                                              | `SALE-ORD-034`                                 | `open`         |

## Independent Status Matrix

The release status above is not enough by itself. Each requirement also carries independent implementation and surfacing status in the machine-readable contract, and rollout remains blocked until both are acceptable.

| Requirement ID | Implementation status | Surfacing status           | Release status |
| -------------- | --------------------- | -------------------------- | -------------- |
| `ORD-WF-001`   | `implemented`         | `surfaced-and-proven`      | `live-proven`  |
| `ORD-WF-002`   | `implemented`         | `surfaced-and-proven`      | `live-proven`  |
| `ORD-WF-003`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-WF-004`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-WF-005`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-WF-006`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-WF-007`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-WF-008`   | `not-started`         | `not-started`              | `open`         |
| `ORD-WF-009`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-001`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-002`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-003`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-004`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-005`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-006`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-007`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-008`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-009`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-010`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-011`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SS-012`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SF-001`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SF-002`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SF-003`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SF-004`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SF-005`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SF-006`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SF-007`   | `implemented`         | `implemented-not-surfaced` | `implemented`  |
| `ORD-SF-008`   | `not-started`         | `not-started`              | `open`         |
| `ORD-SF-009`   | `not-started`         | `not-started`              | `open`         |

## Required Surfacing Checklist

Every critical Orders surface must prove:

- focused cell is visible
- range and discontiguous selection are visible
- locked and editable cells are visibly distinct
- selection summary is visible
- save and error state are visible
- blocked paste or fill explains why it was blocked
- workflow actions remain visible after spreadsheet edits
- spreadsheet affordances are reachable in that surface, not hidden elsewhere
- per-surface discoverability is documented and proven separately for queue, support grid, and document grid
- focused row, focused cell, selected range, and workflow-targeting rules remain visibly unambiguous before finalize or handoff actions
