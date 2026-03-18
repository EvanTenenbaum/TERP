# Orders Spreadsheet Runtime Rollout

Date: `2026-03-17`

## Tracking

- Active tracker: Linear only
- Project: `TERP - Orders Spreadsheet Runtime Rollout`
- Project URL: `https://linear.app/terpcorp/project/terp-orders-spreadsheet-runtime-rollout-0f792b7787cc`
- Parent issue: `TER-766` / `[ORDR-000] Orders spreadsheet runtime rollout and release gates`

This document is a repo backup of the active Linear execution map. It exists so milestone sequencing, hard gates, and anti-duplication rules do not disappear into tracker metadata.

## Source Documents

- [Orders Rollout Contract](../specs/spreadsheet-native-foundation/ORDERS-ROLLOUT-CONTRACT-2026-03-17.md)
- [Orders Full-Parity Pilot Evaluation Pack](../specs/spreadsheet-native-foundation/ORDERS-FULL-PARITY-PILOT-EVALUATION-PACK-2026-03-17.md)
- [AG Grid Enterprise Runtime Decision](../specs/spreadsheet-native-foundation/AG-GRID-ENTERPRISE-RUNTIME-DECISION-2026-03-17.md)
- [Sales -> Orders Capability Ledger Summary](../specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger-summary.md)
- [Pilot Ledgers Parity Proof Plan](../specs/spreadsheet-native-ledgers/pilot-ledgers-parity-proof-plan.md)

## Hard Gates

1. `TER-768` / `[ORDR-002]` is the stop/go gate for AG Grid Enterprise. If it fails, runtime migration work stops.
2. `TER-773` / `[ORDR-007]` is the document-first gate. Queue and support-grid work does not start before the document grid path closes.
3. `TER-779` / `[ORDR-012]` is the only closeout lane for `TER-766`. Parent and project do not close before proof, tracker writeback, and verdict reconciliation are complete.

Existing queue and support-grid proofs are still useful, but they count as pre-gate pilot evidence until the document-first gate closes and the shared runtime is actually reused by all required Orders surfaces.

## Anti-Duplication Rules

- Reuse, do not replace:
  - `OrderCreatorPage`
  - `OrdersSheetPilotSurface`
  - current pricing and recalculation logic
  - `useSaveState`
  - `useUndo`
  - `useWorkSurfaceKeyboard`
  - current route hydration and seeded-entry logic
- Must not create:
  - a second Orders mutation path
  - a second save-state system
  - a second undo system
  - a second seeded-entry flow
  - a second route grammar
- Existing issue disposition:
  - `TER-282` remains historical context only
  - `TER-206` is subsumed by the document-grid rollout unless residual evidence remains after implementation

## Milestones and Atomic Issues

### M0 - Contract Lock and Tracker Disposition

- `TER-767` / `[ORDR-001]`
  - lock the rollout contract
  - add `ORD-WF-008..009`, `ORD-SS-010..012`, `ORD-SF-008..009`
  - add `SALE-ORD-028..035`
  - explicitly disposition `TER-282` and `TER-206`

### M1 - Engine Spike and Stop/Go Decision

- `TER-768` / `[ORDR-002]`
  - prove or reject AG Grid Enterprise for the Orders document-grid-first runtime

### M2 - Shared Powersheet Runtime

- `TER-769` / `[ORDR-003]`
  - turn `PowersheetGrid` into the sanctioned workbook adapter
- `TER-770` / `[ORDR-004]`
  - build shared selection and row-vs-cell coordination runtime
- `TER-771` / `[ORDR-005]`
  - build field-policy, clipboard, fill, clear-cell, and edit-rejection contracts
- `TER-772` / `[ORDR-006]`
  - add edit-navigation and row-operation parity

### M3 - Orders Document Grid Rollout

- `TER-773` / `[ORDR-007]`
  - migrate the Orders document line-items grid onto the runtime
- `TER-774` / `[ORDR-008]`
  - close conversion and seeded-entry parity inside the sheet-native document flow

### M4 - Queue + Support Grid Rollout

- `TER-776` / `[ORDR-009]`
  - add queue spreadsheet selection, copy parity, and explicit workflow semantics
- `TER-777` / `[ORDR-010]`
  - align support grids and active-row vs focused-cell consistency
- `TER-778` / `[ORDR-011]`
  - surface per-surface affordances, blocked-state messaging, and workflow visibility

### M5 - Proof, Tracker Writeback, and Rollout Verdict

- `TER-779` / `[ORDR-012]`
  - expand proof harness
  - run the staging proof wave
  - reconcile proof rows, Linear status, and the final Orders rollout verdict

## ORDR-to-Requirement Matrix

| Linear Issue             | Primary Requirement Rows                                                                                                     | Primary Capability Rows                                                                                                                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TER-767` / `[ORDR-001]` | `ORD-WF-008`, `ORD-WF-009`, `ORD-SS-010`, `ORD-SS-011`, `ORD-SS-012`, `ORD-SF-008`, `ORD-SF-009`                             | `SALE-ORD-028` through `SALE-ORD-035`                                                                                                                                                                                                          |
| `TER-768` / `[ORDR-002]` | `ORD-SS-001` through `ORD-SS-012`, `ORD-SF-001` through `ORD-SF-009`                                                         | `SALE-ORD-019` through `SALE-ORD-035` feasibility gate                                                                                                                                                                                         |
| `TER-769` / `[ORDR-003]` | `ORD-SS-001`, `ORD-SS-002`, `ORD-SS-003`, `ORD-SS-004`, `ORD-SF-001`, `ORD-SF-009`                                           | `SALE-ORD-019`, `SALE-ORD-023`, `SALE-ORD-034`                                                                                                                                                                                                 |
| `TER-770` / `[ORDR-004]` | `ORD-SS-001` through `ORD-SS-004`, `ORD-SF-001`, `ORD-SF-003`, `ORD-SF-009`                                                  | `SALE-ORD-019`, `SALE-ORD-023`, `SALE-ORD-024`, `SALE-ORD-034`                                                                                                                                                                                 |
| `TER-771` / `[ORDR-005]` | `ORD-SS-005`, `ORD-SS-006`, `ORD-SS-007`, `ORD-SS-008`, `ORD-SS-009`, `ORD-SS-010`, `ORD-SS-012`, `ORD-SF-002`, `ORD-SF-004` | `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-022`, `SALE-ORD-029`, `SALE-ORD-031`, `SALE-ORD-035`                                                                                                                                                 |
| `TER-772` / `[ORDR-006]` | `ORD-WF-009`, `ORD-SS-011`, `ORD-SF-005`                                                                                     | `SALE-ORD-030`, `SALE-ORD-032`                                                                                                                                                                                                                 |
| `TER-773` / `[ORDR-007]` | `ORD-WF-003`, `ORD-WF-004`, `ORD-WF-006`, `ORD-WF-009`, `ORD-SS-001` through `ORD-SS-012`, `ORD-SF-001` through `ORD-SF-009` | `SALE-ORD-003`, `SALE-ORD-004`, `SALE-ORD-005`, `SALE-ORD-006`, `SALE-ORD-015`, `SALE-ORD-017`, `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-022`, `SALE-ORD-029`, `SALE-ORD-030`, `SALE-ORD-031`, `SALE-ORD-032`, `SALE-ORD-034`, `SALE-ORD-035` |
| `TER-774` / `[ORDR-008]` | `ORD-WF-005`, `ORD-WF-008`                                                                                                   | `SALE-ORD-012`, `SALE-ORD-016`, `SALE-ORD-018`, `SALE-ORD-028`                                                                                                                                                                                 |
| `TER-776` / `[ORDR-009]` | `ORD-WF-001`, `ORD-WF-007`, `ORD-SS-001` through `ORD-SS-005`, `ORD-SF-001` through `ORD-SF-009`                             | `SALE-ORD-001`, `SALE-ORD-007`, `SALE-ORD-019`, `SALE-ORD-021`, `SALE-ORD-023`, `SALE-ORD-024`, `SALE-ORD-025`, `SALE-ORD-026`, `SALE-ORD-027`, `SALE-ORD-033`, `SALE-ORD-034`                                                                 |
| `TER-777` / `[ORDR-010]` | `ORD-WF-002`, `ORD-SS-001` through `ORD-SS-005`, `ORD-SF-001` through `ORD-SF-009`                                           | `SALE-ORD-002`, `SALE-ORD-019`, `SALE-ORD-021`, `SALE-ORD-023`, `SALE-ORD-024`, `SALE-ORD-025`, `SALE-ORD-026`, `SALE-ORD-033`, `SALE-ORD-034`                                                                                                 |
| `TER-778` / `[ORDR-011]` | `ORD-SF-001` through `ORD-SF-009`                                                                                            | `SALE-ORD-024`, `SALE-ORD-025`, `SALE-ORD-026`, `SALE-ORD-027`, `SALE-ORD-033`, `SALE-ORD-034`, `SALE-ORD-035`                                                                                                                                 |
| `TER-779` / `[ORDR-012]` | all release-gate rows required by the rollout contract                                                                       | all open Orders-owned `SALE-ORD-*` rows through `SALE-ORD-035`                                                                                                                                                                                 |

## AG Grid Enterprise Fit

AG Grid Enterprise is the selected runtime direction for the bounded spike in `TER-768`, but it is intentionally phased so TERP only adopts the modules that serve the Orders rollout contract.

### Phase 1: shared runtime and Orders document-grid foundation

- cell selection
- clipboard
- fill handle
- undo / redo edits
- limited TERP-owned context menu actions
- status bar / custom status items for selection summary, blocked-state feedback, and save-state surfacing

These modules belong in the shared grid foundation first, then at the Orders document seam currently represented by `LineItemTable`, while preserving `OrderCreatorPage` orchestration.

### Phase 2: queue and support-grid parity

- set filter
- multi filter
- side bar with filter / column tool panels
- possibly advanced filter for large queue workflows
- Excel export for operational extracts

These only move in once the document-grid-first runtime proves row-vs-cell coordination, field-policy enforcement, and workflow targeting.

### Later or selective app-wide use

- row grouping for operational-heavy grids
- server-side row model if data volume proves client-side row model insufficient
- master/detail only if it cleanly replaces duplicated linked-grid chrome outside Orders

### Explicitly deferred for Orders rollout

- pivoting
- integrated charts
- pivot charts
- tree data
- sparklines

Enterprise gives TERP spreadsheet mechanics, not workflow semantics. Field safety, blocked edits, active-row vs focused-cell rules, save/finalize behavior, and anti-drift surfacing remain TERP-owned responsibilities in the shared `powersheet` runtime.

## Release-Gate Capability Rows

Orders remains blocked until all required Orders-owned rows are either `live-proven` or explicitly reclassified with evidence, including:

- `SALE-ORD-003` through `SALE-ORD-018` for document-mode parity
- `SALE-ORD-019` through `SALE-ORD-027` for spreadsheet and surfacing parity
- `SALE-ORD-028` through `SALE-ORD-035` for conversion, edit-navigation, row-operation, workflow-targeting, and failure-mode trust gates
