# RedHat QA Report: Phase 2

## Summary
**PASS WITH CONDITIONS**

The implementation is solid regarding security permissions and basic CRUD functionality. The SSE integration is well-structured on the client side. However, there are **2 logic concerns** in the backend router regarding data consistency and **1 missing file** reference that is critical for the real-time functionality to work.

## Checklist Results
- [x] **tRPC Router security**: **PASS** - Permission middleware (`orders:read`, `orders:update`) is correctly applied. Input validation via Zod is present. SQL injection risks are mitigated by Drizzle ORM usage.
- [x] **Session List Page**: **PASS** - Proper pagination, loading states, and error handling are present.
- [x] **Control Panel**: **PASS WITH CONDITIONS** - The `setOverridePrice` mutation contains logic that belongs in the service layer and performs inefficient database operations.
- [x] **SSE Hook**: **PASS** - Connection lifecycle, memory cleanup (on unmount), and reconnection logic are implemented correctly.

## Critical Issues (Must Fix Before Commit)

### 1. Inefficient & Risky Logic in `setOverridePrice`
**Severity**: High
**File**: `server/routers/liveShopping.ts`
**Line**: ~255
**Issue**: The mutation manually iterates through `cartItems` and executes a database update for *each* item in a loop.
```typescript
for(const item of cartItems) {
   // ...
   await db.update(sessionCartItems).set(...).where(...);
}
```
**Risk**: This creates an "N+1" query performance issue. Furthermore, logic for recalculating cart prices should reside in `sessionCartService`, not the router. If the service calculation differs from this manual router update, data integrity is lost.
**Fix**: Move the price update propagation logic into `sessionPricingService.setSessionOverride` or `sessionCartService`. The router should only call the service.

### 2. Missing API Route Handler
**Severity**: High
**File**: Missing
**Issue**: The hook `useLiveSessionSSE.ts` attempts to connect to `/api/sse/live-shopping/${sessionId}`. This file (`src/pages/api/sse/live-shopping/[sessionId].ts`) was not provided in the review bundle.
**Risk**: Without this file, real-time updates will fail completely (404 Error).
**Fix**: Verify this file exists and implements the `sessionEventManager` subscription correctly.

## High Priority Issues (Should Fix)

### 1. Price Override Persistence
**Severity**: Medium
**File**: `server/routers/liveShopping.ts`
**Issue**: The `setOverridePrice` mutation calls `sessionPricingService.setSessionOverride`, but then manually updates `sessionCartItems`. It implies `sessionCartItems` stores a snapshot of the price. If the session is paused and resumed, or if the server restarts, we need to ensure the `sessionPriceOverrides` table is actually the source of truth for *future* additions to the cart.
**Fix**: Ensure `sessionCartService.addItem` checks the `sessionPriceOverrides` table before setting the initial price of a new item.

### 2. Cart Total Value Logic in SSE
**Severity**: Medium
**File**: `src/hooks/useLiveSessionSSE.ts`
**Issue**: Inside `evtSource.addEventListener("CART_UPDATED")`, there is logic to manually recalculate the total value if an array is received:
```typescript
total += (parseFloat(item.quantity) * parseFloat(item.unitPrice));
```
**Risk**: Frontend math using floating point numbers (IEEE 754) can result in display errors (e.g., `$10.9900000000001`).
**Fix**: Ensure the backend sends the pre-calculated total, or use a currency library/integer math on the frontend for display.

## Required Changes Before Commit

### `server/routers/liveShopping.ts`
Refactor `setOverridePrice` to use a single SQL update or service method.

```typescript
// REPLACE lines 255-276 with:
await sessionPricingService.setSessionOverride(
  input.sessionId,
  input.productId,
  input.price
);

// Update existing cart items in one query
await db.update(sessionCartItems)
  .set({ unitPrice: input.price.toString() })
  .where(and(
    eq(sessionCartItems.sessionId, input.sessionId),
    eq(sessionCartItems.productId, input.productId)
  ));

await sessionCartService.emitCartUpdate(input.sessionId);
```

### `src/hooks/useLiveSessionSSE.ts`
Fix potential state update race condition in `HIGHLIGHTED` event.

```typescript
// Change line 87
setCart(prev => {
  if(!prev) return null; // If cart hasn't loaded via API yet, we can't update it
  // ... rest of logic
});
```

## Files That Need Updates

1.  **`server/routers/_app.ts`**: You must register the new `liveShoppingRouter` here for `trpc.liveShopping` to work on the client.
2.  **`src/pages/api/sse/live-shopping/[sessionId].ts`**: Create this file to bridge the `sessionEventManager` to the HTTP Response stream.
3.  **`server/routers/liveShopping.ts`**: Apply the refactor for `setOverridePrice`.