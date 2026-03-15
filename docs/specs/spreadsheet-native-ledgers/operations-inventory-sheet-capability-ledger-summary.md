# Capability Ledger Summary: Operations -> Inventory Sheet

Snapshot:

- Commit: `00fbedf608cff51b0e73b61057b9907b4eee24b2`
- Extracted: `2026-03-13`
- Checked Against Code: `yes`
- Scope Owner: `Inventory pilot team`

## Scope

This ledger targets the first spreadsheet-native pilot for:

- workbook: `Operations`
- sheet candidate: `Inventory`

Included current surfaces:

- [InventoryWorkspacePage.tsx](../../../client/src/pages/InventoryWorkspacePage.tsx)
- [InventoryWorkSurface.tsx](../../../client/src/components/work-surface/InventoryWorkSurface.tsx)
- [PurchaseModal.tsx](../../../client/src/components/inventory/PurchaseModal.tsx)
- [AdjustQuantityDialog.tsx](../../../client/src/components/AdjustQuantityDialog.tsx)
- [SavedViewsDropdown.tsx](../../../client/src/components/inventory/SavedViewsDropdown.tsx)
- [SaveViewModal.tsx](../../../client/src/components/inventory/SaveViewModal.tsx)
- legacy deep-link expectations around `/inventory/:id`

Adjacent but not absorbed into this first pilot sheet:

- `/locations`
- `/locations/transfers`
- `/intake-receipts`
- `/purchase-orders`
- `/inventory?tab=shipping`

Explicit exception adjacency:

- photography review remains excluded from sheet-primary ownership, but inventory gallery mode still reads thumbnail data

## Coverage Snapshot

- Core matrix procedures reviewed for inventory pilot boundary: `46`
- Current workbook/direct-child procedures reviewed in code: `21`
- Current workbook/direct-child procedures missing from matrix: `0`
- Direct procedure overlap between current workbook/direct-child code and matrix: `21`
- Open discrepancies recorded: `1`
- Blueprint-blocking discrepancies: `none` — ownership blockers resolved in [OWNERSHIP-SEAMS-MEMO.md](../spreadsheet-native-foundation/OWNERSHIP-SEAMS-MEMO.md)

## Source Appendix

| Source Type         | Reference                                                  | Relevant Rows / Sections                                                                                                                   | Code Refs                                                                                                                                                                                                                                                                                                                                                     | Why It Matters                                                                                                                      | Open Questions                                                                                    |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Flow Matrix         | `docs/reference/USER_FLOW_MATRIX.csv`                      | `batches.*`, `inventoryMovements.*`, `cogs.*`, `warehouseTransfers.*`, `storage.*`, `strains.getOrCreate`                                  | [inventory.ts](../../../server/routers/inventory.ts), [inventoryMovements.ts](../../../server/routers/inventoryMovements.ts), [storage.ts](../../../server/routers/storage.ts)                                                                                                                                                                                | now captures the current inventory workbook, add-inventory support procedures, view controls, and gallery thumbnail reads           | transfer/location and COGS ownership still need explicit long-term sheet decisions                |
| Flow Guide          | `docs/reference/FLOW_GUIDE.md`                             | Domain `3.1` to `3.5`, Domain `17.1` to `17.3`                                                                                             | same as above                                                                                                                                                                                                                                                                                                                                                 | now matches router permissions for movement writes and includes the current inventory workbook support procedures                   | transfer/location and COGS ownership remain intentionally unresolved                              |
| Feature Map         | `docs/features/USER_FLOWS.md`                              | `DF-010`, `DF-013`, `DF-024`, `DF-077`, `DF-079`                                                                                           | [InventoryWorkspacePage.tsx](../../../client/src/pages/InventoryWorkspacePage.tsx), [InventoryWorkSurface.tsx](../../../client/src/components/work-surface/InventoryWorkSurface.tsx)                                                                                                                                                                          | clarifies user journeys, work-surface intent, and exception boundaries                                                              | feature docs undercount toolbar and modal capabilities                                            |
| Preservation Matrix | `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md` | `DF-010`, `DF-013`, `DF-053`, `INV-001`, `INV-002`, `INV-003`, `GF-001`, `GF-007`                                                          | [InventoryWorkSurface.tsx](../../../client/src/components/work-surface/InventoryWorkSurface.tsx)                                                                                                                                                                                                                                                              | anchors what redesign parity must preserve                                                                                          | preservation rows are not detailed enough to replace the ledger                                   |
| Current UI Code     | current inventory workbook plus direct child components    | work-surface toolbar, status editing, quantity adjustment, add inventory modal, saved views, export, gallery thumbnails, short-window undo | [InventoryWorkSurface.tsx](../../../client/src/components/work-surface/InventoryWorkSurface.tsx), [PurchaseModal.tsx](../../../client/src/components/inventory/PurchaseModal.tsx), [SavedViewsDropdown.tsx](../../../client/src/components/inventory/SavedViewsDropdown.tsx), [SaveViewModal.tsx](../../../client/src/components/inventory/SaveViewModal.tsx) | reveals the current workbook behavior the pilot must actually preserve even when the step-5 sheet only implements a subset directly | live staging still suggests Save View is narrower than a generic “save any visible state” promise |

## Key Scope Decisions

1. The capability ledger keeps batch browsing, detail inspection, add inventory, status editing, quantity adjustment, bulk actions, saved views, gallery mode, and export in scope for preservation, but the current step-5 sheet-native implementation is intentionally narrower: browse, inspect, status edit, quantity adjust, and explicit pagination are direct while the rest stay adjacent classic behaviors for now.
2. Transfer handoff is preserved as inventory-adjacent, but full site and zone administration is not forced into the first inventory sheet.
3. The current workbook only proves direct status editing, not a broader batch-metadata editing surface, so the ledger does not overclaim non-proven inline metadata behavior.
4. COGS and valuation remain in the ledger as adjacent Accounting-owned truth with read-only inventory context, per the ownership seams memo.
5. Lightweight media inside intake and gallery thumbnails are preserved only as bounded support behaviors; heavy photography review remains outside the sheet-primary model.

## Classification Summary

- `sheet-native`: `4`
- `sheet-plus-sidecar`: `6`
- `intentionally-deferred`: `2`
- `exception-surface`: `0`
- `blocked rows`: `3`

## Validation Notes

The largest inventory risk is now ownership drift, not source drift.

Current workbook and direct child components now account for 21 unique procedures, and all 21 are represented in the reconciled source set.

Deep validation also changed the ledger in three important ways:

- the status-edit row was narrowed to current, proven `inventory.updateStatus` behavior instead of overclaiming broader metadata editing
- the quantity-adjust and bulk-delete rows still preserve the current 10-second undo behavior at the ledger level, but the step-5 direct sheet pilot only claims quantity mutation itself; undo or reversal remains adjacent classic behavior for now
- the saved-view/gallery row now captures shared/private view ownership, export truncation, and thumbnail reads so those do not disappear by accident

Live staging validation on March 13, 2026 confirmed:

- the inventory workbook loads at `/inventory?tab=inventory` with table and gallery modes
- gallery mode is real current functionality, not just a planned view toggle
- `Export CSV` produces a real filtered inventory export artifact

One caution remains: `Save View` stayed disabled for a search-only state change in staging. Until the current implementation is better proven, parity should be defined around structured filters and existing saved-view behavior, not a broad promise that every visible search state can be saved as a named view.

The March 14, 2026 foundation pass also closed the two blueprint-blocking ownership seams:

- `INV-D004` is resolved by assigning stock truth to Inventory and transfer/setup truth to Locations / Storage
- `INV-D007` is resolved by assigning official valuation truth to Accounting and read-only valuation context to Inventory
