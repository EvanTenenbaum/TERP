# RedHat QA Report: Phase 4

## Summary
**PASS WITH CONDITIONS**

The Phase 4 Live Shopping implementation is robust, type-safe, and follows the architectural patterns established in previous phases. The segregation of services (`Order`, `Cart`, `Credit`) is well-structured.

However, there is a **High Priority** logic gap regarding inventory reservation ("Soft Holds") vs. external orders, and a data mapping issue in the Sales Sheet generation that will result in inaccurate reporting of discounts.

## Checklist Results
- [x] **Order Conversion**: **PASS** - Correctly calls `ordersDb.createOrder` with valid types, handles status transitions atomically, and locks the final price using `overridePrice`.
- [ ] **Sales Sheet Integration**: **FAIL (Minor)** - The `basePrice` (Retail) and `finalPrice` (Sale) are mapped to the same value. Sales sheets will not reflect discounts or "Deal" pricing, appearing as if the items were sold at list price.
- [x] **Sample Toggle**: **PASS** - Correctly modifies schema, updates cart state, and excludes items from billable totals in `sessionCreditService`.
- [x] **Credit Validation**: **PASS** - Correctly calculates exposure, handles unlimited credits (limit=0), and provides appropriate warning levels.

## Critical Issues (Must Fix Before Commit)
*None. The code is safe to deploy without causing system crashes or data corruption.*

## High Priority Issues (Should Fix)
### 1. Sales Sheet Pricing Data Loss (`sessionOrderService.ts`)
In `generateSalesSheetFromCart`, both `basePrice` and `finalPrice` are set to the cart's `unitPrice`.
- **Issue**: If a host overrides a $100 item to $80, the Sales Sheet will show: `List: $80, Final: $80`. The client does not see the $20 savings.
- **Impact**: Reduces psychological value of the "Live Shopping" recap.
- **Fix**: Update `sessionCartService.getCart` to include the original Batch/Product retail price, and map that to `basePrice` in the Sales Sheet service.

### 2. Inventory Race Condition (External Orders)
The `sessionCartService` correctly checks "Soft Holds" (inventory in other active sessions), preventing two live sessions from selling the same batch.
- **Issue**: The `ordersDb.createOrder` function (used by standard web checkout or admin entry) likely does **not** check `sessionCartItems`.
- **Scenario**:
    1. Host adds last 5 units of Batch A to Live Cart (Soft Hold).
    2. Admin creates a manual Order for Batch A (taking 5 units) via backend. `createOrder` sees 5 On Hand (ignoring Soft Hold) and succeeds.
    3. Host tries to "End Session & Convert". `createOrder` fails because inventory is now 0.
- **Impact**: Bad UX for the Host/Client at the moment of closing the deal.
- **Mitigation**: Acceptable for Phase 4 release, but `ordersDb.createOrder` needs a "Soft Hold Awareness" patch in Phase 5.

## Required Changes Before Commit

### 1. Fix Sales Sheet Mapping in `sessionOrderService.ts`
Modify the `generateSalesSheetFromCart` method to distinguish between Retail Price and Deal Price if possible, or mark TODO. Currently, it functionally works but is logically inaccurate for a "Sales Sheet".

### 2. Verify `ordersDb.createOrder` Signature
In `sessionOrderService.ts`, you call `createOrder` without `overrideCogs`.
```typescript
// Current Call
const newOrder = await createOrder({
  // ...
  items: orderItems, // Items do not have overrideCogs
  // ...
});
```
Ensure `ordersDb.ts` interface `CreateOrderInput` marks `overrideCogs` as optional (`?`). If it is mandatory in your strict setup, this will throw a TS build error. (Based on reference provided, it appears optional, but verify).

### 3. Unused Export in `sessionCreditService.ts`
The function `getDraftExposure` is exported but not used within the provided scope.
- **Action**: Either remove it to reduce clutter or integrate it into the `checkCreditStatus` router endpoint for more granular data.

### 4. Router Logic Update (`liveShopping.ts`)
In `highlightProduct`, the logic resets *all* items in the session to `isHighlighted: false` before setting the specific one.
```typescript
// Current
await db.update(sessionCartItems)
  .set({ isHighlighted: false })
  .where(eq(sessionCartItems.sessionId, input.sessionId));
```
- **Check**: If `input.isHighlighted` is `false` (un-highlighting), this logic works. If `true`, it works.
- **Optimization**: This is two DB calls. It's acceptable, but ensure `sessionCartItems` has an index on `sessionId` (Schema confirms `idx_sci_session`, so this is performant). **PASS**.