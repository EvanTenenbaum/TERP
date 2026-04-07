# Tranche 2 Seam 1 Spec

## Rebuilt Problem Statement

Retrieval continuity depends on filter state surviving the move from catalogue work into the order-building flow.

## Relevant Code Anchors

- `client/src/hooks/useInventoryFilters.ts`
- `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
- `client/src/pages/OrderCreatorPage.tsx`
- portable-cut helpers used by `readPortableSalesCut`, `writePortableSalesCut`, and `clearPortableSalesCut`

## Observed Shape

- retrieval state already has a portable-cut pattern
- `OrderCreatorPage` already reads from session-backed handoff storage
- filter types are still split enough that continuity can drift when a saved cut moves from one surface into another

## Spec Direction

- keep one portable, serializable retrieval-state contract
- use the portable-cut/sessionStorage seam instead of inventing a new global state layer
- make LIVE-first and plain-language defaults ride through the same handoff path

## Acceptance Target

A saved or portable cut should arrive in the order flow with the same operator-facing defaults and item set that the user chose in retrieval.
