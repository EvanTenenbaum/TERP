# Capability Ledger Summary: Procurement -> Purchase Orders

Snapshot:

- Commit: `0e2bb8ba5edfb9c9b1e1b836acb50a8c9348cfae`
- Extracted: `2026-03-19`
- Checked Against Code: `targeted current-code procedure confirmation`
- Scope Owner: `Procurement pilot team`

## Scope

This ledger targets the spreadsheet-native build contract for:

- workbook: `Procurement`
- sheet candidate: `Purchase Orders`

Included current surfaces:

- [PurchaseOrdersWorkSurface.tsx](../../../client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx)
- [PurchaseOrdersSlicePage.tsx](../../../client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx)
- [purchaseOrders.ts](../../../server/routers/purchaseOrders.ts)
- [poReceiving.ts](../../../server/routers/poReceiving.ts) for receiving adjacency only

Adjacent but not absorbed into this sheet:

- Direct Intake ownership
- receipt and discrepancy surfaces
- vendor-facing communications outside the current PO UI

## Coverage Snapshot

- Capability rows in this ledger: `6`
- Pack-level Purchase Orders rows decomposed here: `3`
- Current workbook/direct-child procedures explicitly represented: `11`
- Open discrepancies recorded: `4`
- Blueprint-blocking discrepancies: `none`

## Source Appendix

| Source Type         | Reference                                                  | Relevant Rows / Sections                                                                                          | Code Refs                                                                                                                                                                                                        | Why It Matters                                                                    | Open Questions                                                                               |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Flow Matrix         | `docs/reference/USER_FLOW_MATRIX.csv`                      | `purchaseOrders.*`, `poReceiving.getPendingReceiving`, `poReceiving.receive`, `poReceiving.receiveGoodsWithBatch` | [purchaseOrders.ts](../../../server/routers/purchaseOrders.ts), [poReceiving.ts](../../../server/routers/poReceiving.ts)                                                                                         | preserves the real PO lifecycle and receiving bridge                              | matrix does not fully capture inline draft ergonomics, bulk helpers, or export behavior      |
| Flow Guide          | `docs/reference/FLOW_GUIDE.md`                             | `Domain 16.1 Purchase Orders`, `Domain 16.2 PO Intake`, `Domain 19.1 Cost of Goods Sold`                          | same as above                                                                                                                                                                                                    | ties PO actions to intake and cost context                                        | guide still reads more like classic route CRUD than current slice-plus-work-surface behavior |
| Feature Map         | `docs/features/USER_FLOWS.md`                              | `DF-018`, `DF-082`                                                                                                | [PurchaseOrdersWorkSurface.tsx](../../../client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx), [PurchaseOrdersSlicePage.tsx](../../../client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx) | confirms purchase-order and work-surface intent                                   | current visuals were only lightly reviewed, so code still dominates scope decisions          |
| Preservation Matrix | `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md` | `DF-018`, `GF-002`                                                                                                | same as above                                                                                                                                                                                                    | keeps PO to intake as a protected golden flow                                     | preservation coverage is still too coarse to replace this ledger                             |
| Current UI Code     | queue, slice page, and work surface                        | queue mode, create/edit draft, inline row editing, bulk COGS, notes, export, placement, receiving handoff         | [PurchaseOrdersWorkSurface.tsx](../../../client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx), [PurchaseOrdersSlicePage.tsx](../../../client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx) | reveals the real spreadsheet-native behavior already present in the current build | receipt adjacency and final receiving blueprint still need dedicated decisions               |

## Key Scope Decisions

1. Purchase Orders is not treated as a simple CRUD surface; it is a working draft sheet plus a queue plus a receiving bridge.
2. Inline drafting, keyboard movement, duplication, and deletion stay in scope because they are core to the current operator workflow.
3. Bulk quantity and bulk COGS behavior remain explicit because the current surface already supports them and the recording did not overrule that.
4. Status lifecycle and receiving handoff are preserved as separate capabilities rather than being flattened into a single Place Order event.
5. Receiving remains adjacent and explicit instead of disappearing into a fake all-in-one sheet.

## Classification Summary

- `sheet-native`: `5`
- `sheet-plus-sidecar`: `1`
- `exception-surface`: `0`
- `intentionally-deferred`: `0`
- `blocked rows`: `0`

## Net-New Capabilities Discovered During Decomposition

The original pack rows undercounted how many distinct behaviors Purchase Orders already carries in the current build. Detailed decomposition surfaced additional protected contracts:

- queue browsing and receiving-mode context had to separate from create and edit draft behavior
- inline line drafting, duplication, deletion, and keyboard movement had to stand on their own instead of hiding under a generic draft row
- bulk quantity, bulk COGS, notes, totals, and export behavior needed a dedicated preservation row apart from lifecycle transitions

Future module authors should treat pack rows as the floor for preservation work, not the maximum row count.

## Validation Notes

This ledger tightens the Purchase Orders contract in three important ways:

- it corrects the current source-path drift by grounding the slice page under `client/src/components/uiux-slice/`
- it preserves the real drafting ergonomics already present in the current build
- it keeps PO-to-receiving adjacency explicit instead of pretending the PO sheet is self-contained

Current code confirms:

- queue and receiving-mode browse behavior
- draft create, edit, and delete
- inline line-item editing with keyboard support
- bulk quantity and bulk COGS updates
- notes, totals, and export
- submit, confirm, and status transitions
- PO-linked receiving handoff and draft generation for intake

The next step after this ledger is parity-proof planning and then the accounting and fulfillment ledger tranche.
