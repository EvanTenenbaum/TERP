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
- imported rows can still arrive in the order document even when the retrieval cut was intentionally broadened to include unavailable inventory
- the sheet-native order surface already blocks non-sellable row adds from the live grid, but it does not yet turn imported non-sellable rows into commit-time guidance

## Spec Direction

- keep one portable, serializable retrieval-state contract
- use the portable-cut/sessionStorage seam instead of inventing a new global state layer
- make LIVE-first and plain-language defaults ride through the same handoff path
- place money, relationship, and recent-order context near the order moment without recreating the older dashboard rail
- add a commit-time safeguard so a draft made only of unavailable or blocked imported rows cannot be finalized by mistake

## Acceptance Target

A saved or portable cut should arrive in the order flow with the same operator-facing defaults and item set that the user chose in retrieval, while imported non-sellable rows stay visible as risk and cannot become the whole finalized draft unnoticed.
