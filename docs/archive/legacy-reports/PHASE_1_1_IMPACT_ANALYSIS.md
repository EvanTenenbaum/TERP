# Phase 1.1: Simplified Order Fulfillment - Impact Analysis

## Files to Create
1. `client/src/components/orders/OrderStatusBadge.tsx` - Status badge component
2. `client/src/components/orders/OrderStatusTimeline.tsx` - Status history timeline
3. `client/src/components/orders/ShipOrderModal.tsx` - Modal for status changes

## Files to Modify
1. `drizzle/schema.ts` - Add fulfillmentStatus enum and fields to orders table
2. `server/routers/orders.ts` - Add updateOrderStatus and getOrderStatusHistory endpoints
3. `server/db/inventoryDb.ts` - Add decrementInventoryForOrder function
4. `client/src/pages/OrderCreatorPage.tsx` - Integrate status UI

## Dependencies
- Existing `orders` table (line 1315 in schema.ts)
- Existing `inventoryMovements` table
- Existing `batches` table
- Existing shadcn/ui components (Badge, Dialog, Button, etc.)

## Ripple Effects
- None - this is additive only, no breaking changes
- Existing saleStatus remains unchanged for payment tracking
- New fulfillmentStatus is independent

## Database Migration Required
- Yes - new enum and 4 new fields in orders table
- New orderStatusHistory table

## Testing Requirements
- Status transitions (PENDING → PACKED → SHIPPED)
- Inventory decrement on SHIPPED
- Status history logging
- UI rendering at all breakpoints
- Error handling for invalid transitions
