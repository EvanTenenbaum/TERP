This is the **Atomic Complete Roadmap** for the Live Shopping implementation. It incorporates all architectural corrections from the RedHat QA review, specifically addressing the security "air gap" in SSE, the missing pricing methods, and transactional integrity.

# ATOMIC ROADMAP: Live Shopping Implementation

## Phase 0: Foundation & Security (Week 1-2)

### Task P0-T01: Feature Flag & Configuration
- **File(s)**: `src/config/features.ts`, `src/env.mjs`
- **Description**: Define feature flags to control rollout and SSE configuration variables.
- **Dependencies**: None
- **Acceptance Criteria**: `features.liveShopping.enabled` returns boolean based on env var.
- **Estimated Effort**: 1h
- **Code Skeleton**:
```typescript
export const features = {
  liveShopping: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_LIVE_SHOPPING === 'true',
    useSSE: true,
    heartbeatIntervalMs: 15000, // QA Requirement: Heartbeat
    maxItemsPerCart: 50
  }
};
```

### Task P0-T02: Drizzle Schema Definition (Strict Mode)
- **File(s)**: `src/db/schema/live-shopping.ts`, `src/db/schema/index.ts`
- **Description**: Implement strict schema with correct relations and decimal typing. **QA FIX**: Use specific decimal config and explicit `relations`.
- **Dependencies**: P0-T01
- **Acceptance Criteria**: Tables `live_shopping_sessions`, `session_cart_items`, `session_price_overrides` defined. Soft deletes enabled.
- **Estimated Effort**: 3h
- **Code Skeleton**:
```typescript
// See QA Review "Schema Corrections" for full code.
// Critical:
const money = (name: string) => decimal(name, { precision: 15, scale: 2 });
const qty = (name: string) => decimal(name, { precision: 15, scale: 4 });
// Relations must be named 'session' not 'sessionId' in the relations object
```

### Task P0-T03: Existing Schema Extensions
- **File(s)**: `src/db/schema/orders.ts`, `src/db/schema/salesSheets.ts`
- **Description**: Add `origin` column to orders and `shareToken` to sales sheets.
- **Dependencies**: P0-T02
- **Acceptance Criteria**: `orders` table has `origin` enum including 'LIVE_SHOPPING'.
- **Estimated Effort**: 2h

### Task P0-T04: SSE Event Manager (Infrastructure)
- **File(s)**: `src/lib/sse/sessionEventManager.ts`
- **Description**: Singleton event emitter to bridge Service Layer -> HTTP Layer.
- **Dependencies**: None
- **Acceptance Criteria**: Can `.emit()` an event and receive it in a listener. Handles max listener warnings.
- **Estimated Effort**: 2h
- **Code Skeleton**:
```typescript
import { EventEmitter } from 'events';
class SessionEventManager extends EventEmitter {
  emitCartUpdate(sessionId: string, data: any) {
    this.emit(`session:${sessionId}`, { type: 'CART_UPDATE', payload: data });
  }
}
export const sessionEventManager = new SessionEventManager();
```

### Task P0-T05: SSE Authentication Middleware (Security Critical)
- **File(s)**: `src/api/middleware/sseAuth.ts`, `src/api/sseRouter.ts`
- **Description**: **QA P0 FIX**: Middleware to validate Bearer tokens *outside* tRPC. Must handle Staff (User) and VIP (Client) tokens distinctively.
- **Dependencies**: P0-T04
- **Acceptance Criteria**: Request without token returns 401. Request with valid token but wrong session returns 403. Request with valid token + session allows connection.
- **Estimated Effort**: 4h
- **Code Skeleton**:
```typescript
export async function sseAuthMiddleware(req, res, next) {
  // Logic from QA Review "SSE Authentication Middleware"
  // Must verify token using src/services/authService logic
  // Must verify Client owns the Session (if VIP)
}
```

---

## Phase 1: Core Services & Calculation (Week 3-4)

### Task P1-T01: Decimal Math Utility
- **File(s)**: `src/utils/financialMath.ts`
- **Description**: **QA P1 FIX**: Wrapper around `decimal.js` to ensure NO floating point math occurs in the app.
- **Dependencies**: None
- **Acceptance Criteria**: `calculateLineTotal(0.1, 0.2)` returns `0.3` exactly.
- **Estimated Effort**: 2h
- **Code Skeleton**:
```typescript
import Decimal from 'decimal.js';
export const financialMath = {
  add: (a: string, b: string) => new Decimal(a).add(b).toFixed(2),
  multiply: (qty: string, price: string) => new Decimal(qty).mul(price).toFixed(2),
  // ...
};
```

### Task P1-T02: Session Pricing Service
- **File(s)**: `src/services/live-shopping/sessionPricingService.ts`
- **Description**: **QA P0 FIX**: Implement the missing pricing logic. Wraps `pricingService.getMarginWithFallback` and applies it to Batch Unit Cost.
- **Dependencies**: P1-T01
- **Acceptance Criteria**: Calculates price based on Cost / (1 - Margin). Throws if batch cost missing.
- **Estimated Effort**: 4h
- **Code Skeleton**:
```typescript
// See QA Review "Service Integration Corrections"
export const sessionPricingService = {
  async calculateEffectivePrice(batchId: number, clientId: number, categoryId: string) {
    // 1. Fetch Batch Cost
    // 2. Fetch Margin (pricingService.getMarginWithFallback)
    // 3. Math using financialMath (Decimal.js)
    // 4. Check for Session Overrides in DB
    return price;
  }
}
```

### Task P1-T03: Credit Engine Patch
- **File(s)**: `src/services/creditEngine.ts`
- **Description**: **QA P1 FIX**: Update credit calculation to include "Draft Exposure" from active Live Shopping carts.
- **Dependencies**: P0-T02
- **Acceptance Criteria**: `calculateAvailableCredit(clientId)` decreases when items are added to a live cart (even before order creation).
- **Estimated Effort**: 3h
- **Code Skeleton**:
```typescript
// Add step to fetch sum(session_price * quantity) from session_cart_items 
// where session.status = 'ACTIVE' and session.client_id = clientId
```

### Task P1-T04: Session Cart Service
- **File(s)**: `src/services/live-shopping/sessionCartService.ts`
- **Description**: Handle `addItem`, `removeItem`, `updateQuantity`.
- **Dependencies**: P1-T02, P1-T03
- **Acceptance Criteria**: Adding item checks `batches.onHand`. Updating qty triggers `sessionEventManager.emit`.
- **Estimated Effort**: 6h

---

## Phase 2: Staff Console (Week 5-6)

### Task P2-T01: Staff tRPC Router
- **File(s)**: `src/trpc/routers/liveShopping.ts`
- **Description**: Staff-facing endpoints. Must use `strictlyProtectedProcedure`.
- **Dependencies**: P1-T04
- **Acceptance Criteria**: Only admins/staff can create sessions. `kickClient` emits termination event.
- **Estimated Effort**: 4h

### Task P2-T02: Price Override Logic
- **File(s)**: `src/services/live-shopping/overrideService.ts`, `src/trpc/routers/liveShopping.ts`
- **Description**: Logic to insert into `session_price_overrides` and trigger re-calc of cart totals.
- **Dependencies**: P1-T02
- **Acceptance Criteria**: Creating an override immediately updates all connected clients' cart totals via SSE.
- **Estimated Effort**: 5h

### Task P2-T03: Staff Broadcaster Hooks
- **File(s)**: `src/hooks/useStaffSessionEvents.ts`
- **Description**: Frontend hook to consume SSE for staff dashboard (inventory levels, active carts).
- **Dependencies**: P0-T05
- **Acceptance Criteria**: Staff UI updates in real-time when client adds item.
- **Estimated Effort**: 3h

---

## Phase 3: Client Experience (Week 7-8)

### Task P3-T01: VIP tRPC Router
- **File(s)**: `src/trpc/routers/vipLiveShopping.ts`
- **Description**: **QA FIX**: Client-facing endpoints using `vipPortalProcedure`.
- **Dependencies**: P1-T04
- **Acceptance Criteria**: `joinSession` checks `vipPortalEnabled`. Cannot access another client's session.
- **Estimated Effort**: 4h
- **Code Skeleton**:
```typescript
// See QA Review "API Route Corrections"
// strictly verify session.clientId === ctx.client.id
```

### Task P3-T02: SSE Endpoint Implementation
- **File(s)**: `src/api/index.ts` (or app entry point)
- **Description**: Wire up the Express/Fastify route for SSE with the Auth Middleware.
- **Dependencies**: P0-T05
- **Acceptance Criteria**: `GET /api/stream/session/:id` establishes persistent connection. Sends Heartbeat every 15s.
- **Estimated Effort**: 3h

### Task P3-T03: Client Reconnection Logic
- **File(s)**: `src/hooks/useLiveSession.ts` (Frontend)
- **Description**: **QA FIX**: robust `EventSource` wrapper that handles auto-reconnect and `Last-Event-ID`.
- **Dependencies**: P3-T02
- **Acceptance Criteria**: Killing server and restarting it results in client automatically reconnecting without page refresh.
- **Estimated Effort**: 4h

---

## Phase 4: Integrations (Week 9)

### Task P4-T01: Transactional Order Converter
- **File(s)**: `src/services/live-shopping/orderConversionService.ts`
- **Description**: **QA P0 FIX**: The "Atomic" transaction.
- **Dependencies**: P1-T04, P3-T01
- **Acceptance Criteria**:
    1. Start Transaction
    2. Lock Batch Rows
    3. Validate Inventory (again)
    4. Create Order Header & Lines
    5. Decrement Batch Qty
    6. Close Session
    7. Commit.
    *Failure at step 5 must rollback Step 4.*
- **Estimated Effort**: 8h
- **Code Skeleton**:
```typescript
import { db } from "../db";
export async function convertSessionToOrder(sessionId: string) {
  return await db.transaction(async (tx) => {
    // ... all logic here using 'tx' not 'db'
  });
}
```

### Task P4-T02: Cleanup Cron Job
- **File(s)**: `src/cron/cleanupSessions.ts`
- **Description**: Soft delete expired sessions, release implied inventory holds.
- **Dependencies**: P4-T01
- **Acceptance Criteria**: Runs every 15 mins. Marks sessions `EXPIRED` if `expiresAt < now`.
- **Estimated Effort**: 2h

---

## Phase 5: Verification & Launch (Week 10)

### Task P5-T01: Property-Based Tests
- **File(s)**: `tests/property/live-shopping.test.ts`
- **Description**: Use `fast-check` to verify math and inventory logic.
- **Dependencies**: All Phase 4
- **Acceptance Criteria**: Fuzz test pricing with random overrides—price never NaN or negative.
- **Estimated Effort**: 6h

### Task P5-T02: Integration Test Suite
- **File(s)**: `tests/integration/live-shopping-flow.test.ts`
- **Description**: End-to-end test mocking the DB but using real Routers.
- **Dependencies**: All Phase 4
- **Acceptance Criteria**: Full flow (Create -> Join -> Add -> Convert) passes.
- **Estimated Effort**: 6h

---

## RedHat QA Checklist per Phase

### Phase 0 Checks
- [ ] **Schema**: Are `decimal` columns strict? Is `relations` object defined correctly?
- [ ] **Security**: Does SSE Middleware explicitly verify the token against the DB session?
- [ ] **Infra**: Does the EventManager handle >10 listeners without warning?

### Phase 1 Checks
- [ ] **Math**: Is `decimal.js` used for ALL currency ops? (Grep for `parseFloat`).
- [ ] **Pricing**: Does `sessionPricingService` fail gracefully if Batch Cost is 0/null?
- [ ] **Credit**: Does `creditEngine` reflect items currently in a live cart?

### Phase 2 Checks
- [ ] **Permissions**: Can a standard user (non-admin) access `strictlyProtectedProcedure`? (Should be No/Verify Roles).
- [ ] **Data Leak**: Does the Staff Payload (with COGS) accidentally leak to the Client Event Channel?

### Phase 3 Checks
- [ ] **Auth**: Can Client A join Client B's session by guessing the UUID?
- [ ] **Stability**: Does the SSE connection survive a 30s idle period (Heartbeat check)?

### Phase 4 Checks
- [ ] **Atomicity**: If `convertToOrder` fails on the last item, is the Order Header deleted? (Rollback check).
- [ ] **Inventory**: Check for "Phantom Inventory" after a failed conversion.