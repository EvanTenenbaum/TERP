# Tranche 2 Seam 2 Spec

## Rebuilt Problem Statement

Once a cut leaves the operator-facing grid and becomes shared text, a print/PDF handoff, or a public shared page, the identity and confirmation language can drift enough to feel untrustworthy.

## Relevant Code Anchors

- `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
- `client/src/pages/SharedSalesSheetPage.tsx`
- `server/routers/salesSheets.ts`

## Observed Shape

- copy-for-chat and printable export already reuse the richer sales identity descriptor
- the public shared catalogue page still sanitizes into a narrower identity shape
- outbound confirmation language is present, but terms voice is not standardized across every customer-facing output
- missing grower or batch identity can disappear quietly instead of producing an explicit warning

## Spec Direction

- keep one outbound identity helper across copy, print/PDF, and public shared view
- keep operator-facing actions distinct from customer-facing output, but make the customer-facing confirmation language consistent
- warn when outbound catalogue lines are missing grower or batch identity instead of silently flattening them

## Acceptance Target

Shared view, print/PDF, and copied catalogue text should all read with the same identity system and the same confirmation-terms voice, while incomplete identity data produces an explicit warning.
