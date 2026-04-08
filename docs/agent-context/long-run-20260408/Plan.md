## Milestones
1. Confirm TER-1068 is already closed and note verification needs.
2. Inventory defaults + status labels + product display adjustments.
3. Inventory grid Price/COGS/Margin columns with backend support.
4. Order creator credit/balance + recent orders surface.
5. Inventory "Add to Order" row action with route seed.
6. Cmd+K search improvements for products/batches.
7. Sales catalogue fast access + share flow polish.
8. QA gates, live browser verification, commit hygiene, Linear updates.

## Owned Paths
- client/src/components/spreadsheet-native/*
- client/src/components/sales/*
- client/src/components/orders/*
- client/src/pages/OrderCreatorPage.tsx
- client/src/components/CommandPalette.tsx
- server/routers/search.ts
- server/routers/inventory.ts
- client/src/lib/spreadsheet-native/*

## Verification Plan
- `pnpm agent:prepare`
- `pnpm check`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Live browser verification per confused-human packet.

## Risks
- Inventory pricing/margin data availability.
- URL deep-linking for batch selection.
- Wider surface regressions from shared inventory constants.
