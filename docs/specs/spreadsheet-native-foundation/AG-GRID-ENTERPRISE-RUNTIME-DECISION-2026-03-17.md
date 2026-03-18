# AG Grid Enterprise Runtime Decision

Date: `2026-03-17`

## Status

Current runtime candidate: `AG Grid Enterprise`

Decision state: `gated`

Tracking issue: `TER-768` / `[ORDR-002] Run AG Grid Enterprise Orders spike and make stop/go decision`

## What Changed

As of March 17, 2026:

- `ag-grid-enterprise` is installed in TERP alongside the existing AG Grid packages
- the Orders rollout contract now requires spreadsheet behaviors that were previously treated as explicit reopen triggers under the Community-only pilot baseline
- the runtime question is no longer "can Community stay the default forever?"
- the runtime question is now "does Enterprise satisfy the document-grid-first Orders rollout without forcing TERP into duplicated workflow logic or hidden spreadsheet behavior?"

## Current Rule

AG Grid Enterprise is the active runtime candidate for the Orders spreadsheet runtime rollout.

It is not yet a permanently locked foundation decision.

It must still pass `TER-768`:

- fit for the Orders document-grid-first rollout
- license handling and self-hosted deployment expectations
- documented local and CI/CD license-key provisioning via `VITE_AG_GRID_LICENSE_KEY` without committing secrets
- spreadsheet-native bootstrap scoping so Enterprise registration lives in the workbook adapter seam rather than the entire app shell
- keyboard and spreadsheet interaction parity
- field-policy and blocked-action surfacing
- row-vs-cell workflow targeting
- acceptable performance on Orders-shaped data

If `TER-768` fails, the runtime decision reopens explicitly.

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
