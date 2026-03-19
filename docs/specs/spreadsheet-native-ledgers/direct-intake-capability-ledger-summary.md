# Capability Ledger Summary: Operations -> Direct Intake

Snapshot:

- Commit: `0e2bb8ba5edfb9c9b1e1b836acb50a8c9348cfae`
- Extracted: `2026-03-19`
- Checked Against Code: `targeted current-code procedure confirmation`
- Scope Owner: `Operations pilot team`

## Scope

This ledger targets the spreadsheet-native build contract for:

- workbook: `Operations`
- sheet candidate: `Direct Intake`

Included current surfaces:

- [DirectIntakeWorkSurface.tsx](../../../client/src/components/work-surface/DirectIntakeWorkSurface.tsx)
- [inventory.ts](../../../server/routers/inventory.ts)
- [poReceiving.ts](../../../server/routers/poReceiving.ts)
- [PurchaseOrdersSlicePage.tsx](../../../client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx) for PO-linked handoff only

Adjacent but not absorbed into this sheet:

- `/intake-receipts`
- discrepancy handling surfaces
- full Purchase Orders ownership

## Coverage Snapshot

- Capability rows in this ledger: `6`
- Pack-level Intake rows decomposed here: `3`
- Current workbook/direct-child procedures explicitly represented: `8`
- Open discrepancies recorded: `4`
- Blueprint-blocking discrepancies: `none`

## Source Appendix

| Source Type         | Reference                                                  | Relevant Rows / Sections                                                                                                                                            | Code Refs                                                                                                                                                                                                    | Why It Matters                                                      | Open Questions                                                                     |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Flow Matrix         | `docs/reference/USER_FLOW_MATRIX.csv`                      | `inventory.intake`, `inventory.uploadMedia`, `inventory.deleteMedia`, `poReceiving.getPendingReceiving`, `poReceiving.receive`, `poReceiving.receiveGoodsWithBatch` | [inventory.ts](../../../server/routers/inventory.ts), [poReceiving.ts](../../../server/routers/poReceiving.ts)                                                                                               | captures the commit path for direct intake and the receiving branch | matrix does not fully capture row-selection, keyboard, or export-helper behavior   |
| Flow Guide          | `docs/reference/FLOW_GUIDE.md`                             | `Domain 16.1 Purchase Orders`, `Domain 16.2 PO Intake`, `Domain 3.2 Inventory Movements`                                                                            | same as above                                                                                                                                                                                                | ties intake to receiving and inventory mutation truth               | terminology still leans toward Receiving in places where policy now prefers Intake |
| Feature Map         | `docs/features/USER_FLOWS.md`                              | `DF-010`, `DF-053`, `DF-077`                                                                                                                                        | [DirectIntakeWorkSurface.tsx](../../../client/src/components/work-surface/DirectIntakeWorkSurface.tsx)                                                                                                       | confirms intake, receipts, and direct-intake work-surface intent    | preservation docs still show drift around `DF-077` labeling                        |
| Preservation Matrix | `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md` | `DF-010`, `DF-053`, `GF-001`                                                                                                                                        | current intake work surface and receipt surfaces                                                                                                                                                             | preserves the golden-flow contract for intake                       | matrix needs follow-up because `DF-077` is labeled as a different feature there    |
| Current UI Code     | direct intake sheet and receiving bridge                   | pending-row edit rules, keyboard contract, media cleanup, bulk submit, CSV export, PO handoff                                                                       | [DirectIntakeWorkSurface.tsx](../../../client/src/components/work-surface/DirectIntakeWorkSurface.tsx), [PurchaseOrdersSlicePage.tsx](../../../client/src/components/uiux-slice/PurchaseOrdersSlicePage.tsx) | shows the real operator workflow depth missing from the artboard    | receipt and discrepancy adjacency still need module-level blueprint decisions      |

## Key Scope Decisions

1. Direct Intake is treated as its own sheet contract, not a thin alias for PO receiving.
2. Keyboard movement, row selection, and density are preserved because the recording explicitly pushed toward more operator-native speed, not less structure.
3. Media cleanup and validation are first-class trust behaviors, not optional chrome.
4. Bulk submit and export stay in scope because current operators use intake as a working session, not just a single-record form.
5. PO-linked receiving remains a distinct adjacent branch even if the visual language eventually converges.

## Classification Summary

- `sheet-native`: `5`
- `sheet-plus-sidecar`: `1`
- `exception-surface`: `0`
- `intentionally-deferred`: `0`
- `blocked rows`: `0`

## Net-New Capabilities Discovered During Decomposition

The original pack rows did not fully express the operational depth of Direct Intake. Detailed decomposition surfaced additional distinct contracts that need protection:

- keyboard movement, selection sync, row creation, and row removal had to be preserved separately from simple row drafting
- attachment lifecycle and cleanup behavior had to stand on its own instead of being buried inside generic submit language
- single-row submit, bulk submit, and export each needed their own preservation row because they fail differently

Future module authors should treat pack rows as the floor for preservation work, not the maximum row count.

## Validation Notes

This ledger turns the broad intake pack row into a real operational contract.

Current code confirms:

- pending-only edit restrictions
- row-level notes and media behavior
- keyboard and selection handling that keep the sheet fast to operate
- single-row and bulk submission paths
- CSV export for the intake session
- branch distinction between direct intake and PO-linked receiving

The next step after this ledger is parity-proof planning plus explicit receipt and discrepancy adjacency decisions.
