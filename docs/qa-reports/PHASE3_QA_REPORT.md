Here is the RedHat QA Review for Phase 3.

# RedHat QA Report: Phase 3

## Summary
**PASS WITH CONDITIONS**

The implementation provides a solid security foundation for the VIP Portal, correctly isolating session access to the specific authenticated client. However, the Real-Time implementation (SSE) lacks keep-alive mechanisms required for production environments (especially Vercel/AWS ALB), and there is a potential data leak in the batch details query.

## Checklist Results
- [x] **VIP Portal Page**: **PASS** - Auth checks and state management are handled correctly.
- [ ] **Client SSE Hook**: **FAIL** - Missing heartbeat/keep-alive mechanism. Connection will timeout on most cloud platforms.
- [x] **Cart Interaction**: **PASS** - Strict session ownership enforcement on all mutations.
- [x] **Checkout Flow**: **PASS** - Event emission is correctly implemented.

## Critical Issues (Must Fix Before Commit)

### 1. SSE Connection Timeout (Infrastructure)
**Severity: P0**
**Location:** `src/pages/api/sse/vip/live-shopping/[roomCode].ts`

**Issue:** Cloud platforms (Vercel, AWS, Nginx) have a default timeout (usually 10-60 seconds) for HTTP requests. If the Host does not trigger an event within this window, the SSE connection will be terminated by the load balancer. The client will attempt to reconnect, creating a "flashing" connection status and potential event loss.

**Fix:** Implement a server-side heartbeat (`ping`) interval.

```typescript
// Add inside the handler, before subscription setup
const heartbeat = setInterval(() => {
  res.write(': ping\n\n'); // SSE comment format for keep-alive
  if ((res as any).flush) (res as any).flush();
}, 15000); // 15 seconds

// Add to cleanup
req.on("close", () => {
  clearInterval(heartbeat);
  sessionEventManager.removeListener(session.id, handleEvent);
  res.end();
});
```

### 2. Batch Data Leak / ID Enumeration
**Severity: P0**
**Location:** `server/routers/vipPortalLiveShopping.ts` -> `getBatchDetails`

**Issue:** The `getBatchDetails` procedure takes a `batchId` and returns product details. It does **not** verify that the Batch is actually relevant to the current Session. A malicious authenticated client could script calls to this endpoint iterating through `batchId` 1...10000 to scrape the entire product catalog (images, descriptions, base prices), violating tenant isolation.

**Fix:** Join with `liveShoppingSessions` or `sessionCartItems` (if it's in the cart) or verify the batch belongs to the vendor hosting the session.

```typescript
// Proposed Fix Logic
const result = await db
  .select({ ... })
  .from(batches)
  // ... joins ...
  .where(and(
    eq(batches.id, input.batchId),
    // Ensure this batch is actually "owned" by the Host of the current session
    // This requires passing the sessionId in the input as well
  ))
```

## High Priority Issues (Should Fix)

### 3. Token Exposure in URL
**Severity: P1**
**Location:** `src/hooks/useLiveSessionClient.ts`

**Issue:** Passing `?token=` in the SSE URL puts the session token in browser history, proxy logs, and server access logs. While `EventSource` limits header usage, this is a security risk.
**Recommendation:** Use a "Ticket" system. Call a TRPC mutation `generateSSETicket` (authenticated via headers) that returns a short-lived (10s) one-time-use ticket, then pass that ticket to the SSE URL.

### 4. Cart State Desynchronization
**Severity: P1**
**Location:** `src/hooks/useLiveSessionClient.ts`

**Issue:** The SSE listener for `CART_UPDATED` has logic to calculate totals manually if an array is received:
```typescript
total += (parseFloat(item.quantity) * parseFloat(item.unitPrice));
```
However, the `addToCart` mutation returns the *full cart object* from the service. If the calculation logic in the frontend differs even slightly from the backend (rounding errors, tax, special session discounts), the UI will "jump" between values.
**Recommendation:** Ensure the backend `CART_UPDATED` event sends the exact same shape as `addToCart` return (pre-calculated totals).

## Required Changes Before Commit

### 1. Update `src/pages/api/sse/vip/live-shopping/[roomCode].ts`
Apply the heartbeat logic to prevent connection drops.

```typescript
// ... imports

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... existing auth checks ...

  // 4. Setup SSE Headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(`data: ${JSON.stringify({ type: "CONNECTED", sessionId: session.id })}\n\n`);

  // [REQUIRED CHANGE] Heartbeat
  const heartbeatInterval = setInterval(() => {
    res.write(": keepalive\n\n");
    if ((res as any).flush) (res as any).flush();
  }, 15000);

  const handleEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if ((res as any).flush) (res as any).flush();
  };

  sessionEventManager.addListener(session.id, handleEvent);

  req.on("close", () => {
    // [REQUIRED CHANGE] Clear interval
    clearInterval(heartbeatInterval);
    sessionEventManager.removeListener(session.id, handleEvent);
    res.end();
  });
}
```

### 2. Update `server/routers/vipPortalLiveShopping.ts`
Secure the `getBatchDetails` endpoint.

```typescript
  getBatchDetails: vipPortalProcedure
    .input(z.object({ batchId: z.number(), sessionId: z.number() })) // Add sessionId
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      // ... db check ...

      // 1. Verify Session Access (Prevent scraping)
      const session = await db.query.liveShoppingSessions.findFirst({
         where: eq(liveShoppingSessions.id, input.sessionId)
      });
      
      if (!session || session.clientId !== ctx.clientId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Invalid Session" });
      }

      // 2. Fetch Batch (Optionally ensure batch belongs to Session Host)
      const result = await db
        .select({ /* ... fields ... */ })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .leftJoin(productMedia, eq(products.id, productMedia.productId))
        .where(eq(batches.id, input.batchId))
        .limit(1);

      // ... rest of logic
```

### 3. Update Frontend Call
Update `src/pages/vip/live-session/[roomCode].tsx` to pass the `sessionId` to `getBatchDetails`.

```typescript
const batchDetailsQuery = trpc.vipPortalLiveShopping.getBatchDetails.useQuery(
    { 
      batchId: highlightedProduct?.batchId,
      sessionId: joinMutation.data?.session.id // Pass session ID
    },
    { enabled: !!highlightedProduct?.batchId && !!joinMutation.data?.session.id }
);
```