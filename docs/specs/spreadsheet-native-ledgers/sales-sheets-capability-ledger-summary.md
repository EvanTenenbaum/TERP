# Capability Ledger Summary: Sales -> Sales Sheets

Snapshot:

- Commit: `0e2bb8ba5edfb9c9b1e1b836acb50a8c9348cfae`
- Extracted: `2026-03-19`
- Checked Against Code: `targeted current-code procedure confirmation`
- Scope Owner: `Sales pilot team`

## Scope

This ledger targets the spreadsheet-native build contract for:

- workbook: `Sales`
- sheet candidate: `Sales Sheets`

Included current surfaces:

- [SalesWorkspacePage.tsx](../../../client/src/pages/SalesWorkspacePage.tsx)
- [SalesSheetCreatorPage.tsx](../../../client/src/pages/SalesSheetCreatorPage.tsx)
- [SalesSheetPreview.tsx](../../../client/src/components/sales/SalesSheetPreview.tsx)
- [SalesSheetTemplates.tsx](../../../client/src/components/sales/SalesSheetTemplates.tsx)
- [salesSheets.ts](../../../server/routers/salesSheets.ts)

Adjacent but not absorbed into this sheet:

- `/sales?tab=orders`
- `/quotes`
- `/live-shopping`
- document-output consumers outside the builder itself

## Coverage Snapshot

- Capability rows in this ledger: `6`
- Pack-level Sales Sheets rows decomposed here: `4`
- Current workbook/direct-child procedures explicitly represented: `14`
- Open discrepancies recorded: `4`
- Blueprint-blocking discrepancies: `none`

## Source Appendix

| Source Type         | Reference                                                  | Relevant Rows / Sections                                                                                                                                                           | Code Refs                                                                                                                                                                                                                                                      | Why It Matters                                                                                             | Open Questions                                                                                |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Flow Matrix         | `docs/reference/USER_FLOW_MATRIX.csv`                      | `salesSheets.getInventory`, `salesSheets.saveDraft`, `salesSheets.getDraftById`, `salesSheets.generateShareLink`, `salesSheets.convertToOrder`, `salesSheets.convertToLiveSession` | [salesSheets.ts](../../../server/routers/salesSheets.ts)                                                                                                                                                                                                       | establishes the real router surface for builder load, persistence, and conversion                          | matrix still undercounts preview-only export helpers and builder-local composition behavior   |
| Flow Guide          | `docs/reference/FLOW_GUIDE.md`                             | `Domain 4.1 Orders`, `Domain 4.6 Order Pricing`, `Domain 12.1 Live Shopping Sessions`                                                                                              | [SalesSheetCreatorPage.tsx](../../../client/src/pages/SalesSheetCreatorPage.tsx), [SalesSheetPreview.tsx](../../../client/src/components/sales/SalesSheetPreview.tsx)                                                                                          | proves Sales Sheets is adjacent to Orders and Live Shopping even though it lacks a dedicated guide section | lack of a dedicated Sales Sheets domain is still a documentation gap                          |
| Feature Map         | `docs/features/USER_FLOWS.md`                              | `DF-021`, `DF-022`, `DF-016`                                                                                                                                                       | same as above                                                                                                                                                                                                                                                  | confirms module intent and sibling-workflow adjacency                                                      | product naming between Sales Sheet and Sales Catalog is still unresolved                      |
| Preservation Matrix | `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md` | `DF-021`, `DF-022`, `GF-003`                                                                                                                                                       | [SalesWorkspacePage.tsx](../../../client/src/pages/SalesWorkspacePage.tsx)                                                                                                                                                                                     | ties the ledger back to already-protected Sales and golden-flow parity                                     | preservation coverage is too coarse to replace this detailed ledger                           |
| Current UI Code     | current Sales Sheets builder and preview                   | builder load, auto-save, draft delete, history, saved views, copy, export, share, convert                                                                                          | [SalesSheetCreatorPage.tsx](../../../client/src/pages/SalesSheetCreatorPage.tsx), [SalesSheetPreview.tsx](../../../client/src/components/sales/SalesSheetPreview.tsx), [SalesSheetTemplates.tsx](../../../client/src/components/sales/SalesSheetTemplates.tsx) | reveals actual operator workflow depth that the artboards and docs under-model                             | media layout and template density still need design judgment after functionality is preserved |

## Key Scope Decisions

1. Sales Sheets is treated as a real build surface, not a lightweight review panel.
2. Builder-local composition behavior is preserved even where the flow docs do not name it explicitly.
3. Auto-save, draft deletion, and unsaved-change gates are first-class capabilities, not implementation details.
4. Preview and output remain an explicit sidecar to the builder rather than being flattened into one fake single-surface contract.
5. Orders and Live Shopping remain sibling downstream modules, not hidden implementation consequences.

## Classification Summary

- `sheet-native`: `4`
- `sheet-plus-sidecar`: `2`
- `exception-surface`: `0`
- `intentionally-deferred`: `0`
- `blocked rows`: `0`

## Net-New Capabilities Discovered During Decomposition

The pack-level Sales Sheets summary was directionally right, but detailed decomposition surfaced more distinct implementation contracts than the pack rows suggested:

- builder-local composition, reordering, and price-override behavior had to be preserved separately from simple builder load
- draft persistence split into a full save, auto-save, restore, and delete contract instead of a generic draft note
- preview and output behavior split from downstream conversions so share and export flows do not get flattened into order creation

Future module authors should treat pack rows as the floor for preservation work, not the maximum row count.

## Validation Notes

This ledger closes the biggest pack-level Sales Sheets risk: losing real builder behavior because the mock mostly emphasized layout and output polish.

Current code confirms:

- client-driven inventory and pricing load in the builder
- draft save, auto-save, load, and delete behavior
- history and saved-view handling
- preview output paths including copy, image, PDF, and share
- downstream conversion into Orders and Live Shopping

The next step after this ledger is not more broad mock revision. It is parity-proof planning against the six concrete rows here.
