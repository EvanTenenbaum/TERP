# Phase 1.2: Integrate Returns into Orders - Impact Analysis

## Files to Create
1. `client/src/components/orders/ProcessReturnModal.tsx` - Modal for processing returns
2. `client/src/components/orders/ReturnHistorySection.tsx` - Display return history

## Files to Modify
1. `drizzle/schema.ts` - Add returns table
2. `server/routers/orders.ts` - Add processReturn endpoint
3. `server/ordersDb.ts` - Add processReturn function
4. `client/src/pages/Orders.tsx` - Add "Process Return" button and return history display

## Dependencies
- Existing orders table
- Existing batches table
- Existing inventoryMovements table
- OrderStatusBadge component (already created)

## Ripple Effects
- None - additive only, no breaking changes
- Returns automatically restock inventory
- Return history displayed in order detail

## Database Migration Required
- Yes - new returns table with order reference

## Testing Requirements
- Return processing with item selection
- Inventory restocking on return
- Return history display
- Return reason tracking
