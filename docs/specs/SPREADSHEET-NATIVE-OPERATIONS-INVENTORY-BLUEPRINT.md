# Blueprint: Spreadsheet-Native Operations -> Inventory

**Task:** ARCH-SS-017  
**Status:** Draft  
**Priority:** CRITICAL  
**Spec Date:** 2026-03-14

## 1. Blueprint Purpose

This is the first pilot blueprint for the spreadsheet-native fork.

It inherits:

- Foundation Baseline v2
- the generated schema and router truth pack
- the ownership seams memo
- the primitive pack
- the pilot proof-case contract

## 2. Sheet Shape

Workbook:

- `Operations`

Primary sheet:

- `Inventory`

Archetype:

- `registry` with bounded `child-detail` and `summary-support`

Layout:

- primary inventory table
- supporting selected-batch detail table
- supporting movement/history table
- inspector for comments, media, audit, and validation explanation
- command strip with saved views, export, gallery toggle, and bulk actions

Width and layout rules:

- the default inventory grid must fit its `P0` browse columns without horizontal scrolling
- the main grid gets width priority over the inspector and all supporting regions
- one supporting inline table is preferred over multiple competing side panels
- financial or deep audit fields stay out of the default grid unless they fit without creating routine scroll

## 3. Canonical Routes and Boundaries

Canonical workbook route:

- `/operations?tab=inventory`

Compatibility route to preserve during transition:

- `/inventory?tab=inventory`

Owned by this sheet:

- browse and filter inventory
- selected-batch detail
- status editing
- quantity adjustment
- bulk status, delete, and restore
- saved views
- export
- bounded add-inventory intake
- bounded thumbnail/gallery support

Not owned by this sheet:

- location setup administration
- transfer execution workflow
- photography review workspace
- official accounting-owned valuation truth

## 3.1 Final Target vs Pilot vs Preserved Adjacent Behavior

Final target:

- one dominant inventory registry sheet
- one inline selected-batch detail/supporting table region
- one movement/history support region where justified
- one disciplined inspector for audit, media, comments, and exceptional context

Current pilot:

- one dominant browse grid
- direct status edit
- direct quantity adjust
- one inline selected-batch locations table
- one secondary inspector

Preserved adjacent behavior:

- add inventory
- bulk actions
- saved view writes
- gallery/media review
- export
- undo/reversal

## 4. Data Contract

Primary query contract:

- `inventory.getEnhanced`
- `inventory.dashboardStats`
- `inventory.getById`
- `inventory.list`

Supporting query contract:

- `inventory.views.list`
- `inventory.profitability.batch` as read-only context only
- `inventoryMovements.*` and current movement history surfaces through the linked proof contract

Primary mutation contract:

- `inventory.updateStatus`
- `inventory.adjustQty`
- `inventory.updateBatch`
- `inventory.bulk.updateStatus`
- `inventory.bulk.delete`
- `inventory.bulk.restore`

Bounded intake support:

- `inventory.intake`
- `inventory.vendors`
- `inventory.brands`
- `inventory.uploadMedia`
- `inventory.deleteMedia`

Primary schema tables:

- `batches`
- `inventoryMovements`
- `inventoryViews`

Adjacent tables:

- `lots`
- `clients`
- `supplierProfiles`
- `locations`
- `siteTransfers`

## 5. Workflow Rules

- Cell edits change data only.
- Status changes and bulk actions are explicit actions, not incidental cell side effects.
- Transfer and location admin actions are handoffs, not absorbed behavior.
- Valuation context is read-only unless and until Accounting explicitly delegates ownership.

## 5.1 Default Grid Width Budget

Default `P0` inventory columns:

- `SKU`
- `Product`
- `Status`
- `Available`
- `On Hand`
- `Age`

Default grid exclusions:

- `Unit COGS`
- standalone supplier column
- standalone brand column
- raw audit counts
- gallery/media signals

Those stay in alternate views, supporting regions, or the inspector.

## 5.2 Action Execution Matrix

| Action                            | Owner Surface           | Persistence Class                                | Trigger                    | Failure Unit       | Undo / Reversal                                    | Proof Gate    |
| --------------------------------- | ----------------------- | ------------------------------------------------ | -------------------------- | ------------------ | -------------------------------------------------- | ------------- |
| Status edit                       | Operations -> Inventory | immediate row mutation                           | edited status cell         | row mutation       | no implicit undo; reversal follows inventory rules | `OPS-INV-004` |
| Adjust quantity                   | Operations -> Inventory | explicit row mutation                            | selected row + action rail | row mutation       | reversal remains adjacent-owned until closed       | `OPS-INV-005` |
| Add inventory                     | Operations -> Inventory | intake workflow handoff or bounded inline intake | command strip              | intake transaction | intake correction flow                             | `OPS-INV-003` |
| Bulk delete / restore             | Operations -> Inventory | explicit bulk workflow action                    | selected rows              | bulk transaction   | restore / reversal path required                   | `OPS-INV-006` |
| Export                            | Operations -> Inventory | generated output                                 | command strip              | export job         | n/a                                                | `OPS-INV-011` |
| Transfer / location admin handoff | Locations / Storage     | adjacent-owned handoff                           | selected batch context     | route/context load | n/a                                                | `INV-D004`    |

## 6. Proof Gate

This blueprint is implementation-ready only after:

- `OPS-INV-001` through `OPS-INV-012` each map to a proof case
- `INV-D004` and `INV-D007` are treated as resolved by the ownership memo
- `INV-D006` remains explicit supporting-entity work, not hidden debt
