# Tranche 1 Seam 3 Spec

## Rebuilt Problem Statement

Product identity still risks drifting across the retrieval surfaces and the order-building surface.

## Relevant Code Anchors

- `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
- `client/src/components/spreadsheet-native/SalesOrderSurface.tsx`
- `client/src/components/sales/InventoryBrowser.tsx`
- `client/src/components/orders/LineItemTable.tsx`

## Working Hypothesis

The same sellable item should keep the same operator-facing identity fields across:

- retrieval surfaces
- saved / portable cuts
- line items after commit

That identity should stay stable enough that operators do not need to mentally re-translate the item as they move from browse to commit.

## Spec Direction

- define one descriptor stack for product / batch identity
- keep that stack consistent in catalogue rows, order inventory rows, and committed line items
- do not redesign the whole row layout; standardize the descriptor order and missing-value fallbacks

## Acceptance Target

An operator should be able to point at a row in retrieval and the corresponding committed line without losing the product's plain-language identity.
