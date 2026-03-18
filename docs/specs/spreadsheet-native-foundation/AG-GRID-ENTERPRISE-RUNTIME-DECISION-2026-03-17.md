# AG Grid Enterprise Runtime Decision

Date: `2026-03-17`

## Status

Current runtime candidate: `AG Grid Enterprise`

Decision state: `pass with evidence`

Tracking issue: `TER-768` / `[ORDR-002] Run AG Grid Enterprise Orders spike and make stop/go decision`

## What Changed

As of March 17, 2026:

- `ag-grid-enterprise` is installed in TERP alongside the existing AG Grid packages
- the Orders rollout contract now requires spreadsheet behaviors that were previously treated as explicit reopen triggers under the Community-only pilot baseline
- the runtime question is no longer "can Community stay the default forever?"
- the runtime question is now "does Enterprise satisfy the document-grid-first Orders rollout without forcing TERP into duplicated workflow logic or hidden spreadsheet behavior?"
- local runtime uses a dedicated `ag-grid-license` bootstrap so license application is not coupled only to workbook-surface module registration
- live DigitalOcean specs must declare `VITE_AG_GRID_LICENSE_KEY` as a build-time secret for staging and production
- Docker builder stages must forward `VITE_AG_GRID_LICENSE_KEY` into the Vite asset build or AG Grid will still report `License Key Not Found` even when the app spec secret exists

## Current Rule

AG Grid Enterprise is the active runtime candidate for the Orders spreadsheet runtime rollout.

`TER-768` passed the bounded runtime gate for the Orders rollout based on the current repo state and March 18, 2026 proof updates:

- fit for the Orders document-grid-first rollout
- local and CI/CD license-key provisioning via `VITE_AG_GRID_LICENSE_KEY` without committing secrets
- global license bootstrap at `client/src/lib/ag-grid-license.ts`
- workbook-scoped enterprise module registration at `client/src/lib/ag-grid.ts`
- shared runtime seam via `PowersheetGrid`
- queue/support/document adoption paths in current Orders surfaces
- targeted runtime tests and current contract tests passing
- no current evidence that Community alone can satisfy the rollout contract without reopening duplicate workflow logic

Evidence recorded for the gate:

- code paths:
  - `client/src/lib/ag-grid-license.ts`
  - `client/src/lib/ag-grid.ts`
  - `client/src/components/spreadsheet-native/PowersheetGrid.tsx`
  - `client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
  - `client/src/components/orders/OrdersDocumentLineItemsGrid.tsx`
- commands:
  - `pnpm vitest run client/src/components/spreadsheet-native/PowersheetGrid.test.tsx client/src/components/orders/OrdersDocumentLineItemsGrid.test.tsx client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx client/src/lib/spreadsheet-native/pilotContracts.test.ts`
  - `pnpm check`

This is still a bounded rollout decision, not an unconditional app-wide adoption mandate.

If later rollout evidence fails on performance, license provisioning, or workflow safety, the runtime decision reopens explicitly.

## Historical Note

Older docs that describe AG Grid Community as the provisional baseline should now be read as historical context from the pre-Enterprise phase of the pilot.

They do not override the current runtime gate.

## Scope of This Decision

This note does not claim that every Enterprise feature should be adopted immediately.

The phased fit remains:

- immediate: cell selection, clipboard, fill handle, undo/redo, limited context menu, status bar/custom status items
- later for queue/support: set filter, multi filter, side bar/tool panels, possible advanced filter, Excel export
- deferred/selective: row grouping, server-side row model, master/detail
- not part of the Orders rollout baseline: pivoting, charts, tree data, sparklines
