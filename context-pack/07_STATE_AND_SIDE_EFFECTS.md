# 07_STATE_AND_SIDE_EFFECTS

This file maps where state lives and how mutations produce side effects.

## Where State Lives

### Server State

1. Database (MySQL via Drizzle)
   - Evidence: `drizzle/schema.ts`, `server/db.ts`.
2. Session/auth context
   - Evidence: `server/_core/simpleAuth.ts`, `server/_core/context.ts`.
3. tRPC authorization gates
   - Evidence: `server/_core/trpc.ts`.
4. Background jobs and consistency tasks
   - Started: `server/_core/index.ts`
   - Present but not fully started by default: `server/cron/glBalanceCheck.ts`, `server/cron/arReconciliationCheck.ts`

### Client State

1. Component-local state in work surfaces
   - Evidence: `client/src/components/work-surface/*`.
2. React Query/tRPC cache
   - Evidence: `client/src/main.tsx`, `client/src/lib/trpc.ts`.
3. Local storage keys (session UX, filters/preferences)
   - Evidence: `client/src/_core/hooks/useAuth.ts`, `client/src/hooks/useInventoryFilters.ts`, `client/src/contexts/*`.

## Core Side-Effect Chains

### A) Canonical Order Creation Path (Target)

`/orders/create` -> `orders.createDraftEnhanced` -> `orders.finalizeDraft`

Current side effects:

- Draft + line items created
- Finalize path reserves inventory and updates draft status
- Sample items decrement sample allocation fields at finalize

Evidence:

- `server/routers/orders.ts:703` (`createDraftEnhanced`)
- `server/routers/orders.ts:1074` (`finalizeDraft`)

### B) Legacy Order Confirmation Path (Still Wired, Non-Canonical)

`/orders` -> `orders.confirmDraftOrder`

Current side effects:

- Decrements on-hand/sample inventory in this path
- Updates sale/payment terms
- Updates consignment payable logic

Evidence:

- `client/src/components/work-surface/OrdersWorkSurface.tsx:598`
- `server/ordersDb.ts:1163` (`confirmDraftOrder`)

### C) Shipping and Invoice Creation

`updateOrderStatus(..., SHIPPED)` currently:

- Runs inventory decrement helper
- Creates invoice from order
- Optionally records cash payment
- Syncs client balance

Evidence:

- `server/ordersDb.ts:1691` (`updateOrderStatus`)
- `server/ordersDb.ts:1805` (`createInvoiceFromOrder`)
- `server/ordersDb.ts:1958` (`decrementInventoryForOrder`)

Correctness hotspot:

- Inventory movement policy is not unified with canonical target (reserve-at-finalize + decrement onHand+reserved at ship).

### D) Payment Side Effects (Split vs Canonical)

Current code paths:

1. `payments.recordPayment` (legacy router, full flow)
   - Writes payment row
   - Updates invoice amounts/status
   - Posts GL entries
   - Syncs client balance
   - Evidence: `server/routers/payments.ts:233`

2. `accounting.payments.create` (row-only)
   - Creates payment row only
   - Evidence: `server/routers/accounting.ts:1175`, `server/arApDb.ts:877`

3. `accounting.invoices.recordPayment` (allocation + GL)
   - Updates invoice + posts GL entries
   - Does not insert payment row
   - Evidence: `server/routers/accounting.ts:915`, `server/arApDb.ts:191`

Canonical target (decision):

- Use `payments.recordPayment` as source-of-truth path.

Current mismatch:

- Invoice payment UI currently calls `accounting.payments.create`.
- Evidence: `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767`

### E) Auth/Logout Side Effects

Current behavior:

- Logout clears session token path, but context may still provision public/demo fallback user.
- Frontend treats any `auth.me` result as authenticated.

Evidence:

- `server/routers/auth.ts:22`
- `server/_core/context.ts:203`, `server/_core/context.ts:230`
- `client/src/_core/hooks/useAuth.ts:50`

Canonical target (decision):

- Production should not fall back into internal app access after logout.

### F) Samples Side Effects

- `/samples` is a user-facing internal route.
- `samples.fulfillRequest` is permission-gated (`samples:allocate`) and mutates inventory/sample movement state.

Evidence:

- `client/src/App.tsx:350`
- `client/src/config/navigation.ts:174`
- `server/routers/samples.ts:166`

## Eventual Consistency / Delayed Updates

1. Client balance sync can lag if not called by every mutation path.
   - Evidence: `server/services/clientBalanceService.ts`.
2. Notification processing is cron-based.
   - Evidence: `server/_core/index.ts` (`startNotificationQueueCron`).
3. Reconciliation jobs exist but are not universally active.
   - Evidence: `server/cron/glBalanceCheck.ts`, `server/cron/arReconciliationCheck.ts`.

## Data Correctness Hotspots

1. Order-state inventory transitions across finalize/confirm/ship paths.
2. Payment flow split between row creation and allocation/GL posting.
3. Post-logout access model in production.
4. Supplier identity migration (`supplierClientId` canonical, `vendorId` transitional).
5. Feature-flag audit history reliability in production.

Primary evidence pointers:

- `server/routers/orders.ts`, `server/ordersDb.ts`
- `server/routers/payments.ts`, `server/routers/accounting.ts`, `server/arApDb.ts`
- `server/_core/context.ts`, `server/routers/auth.ts`, `client/src/_core/hooks/useAuth.ts`
- `drizzle/schema.ts:232`, `drizzle/schema.ts:238`
- `server/routers/featureFlags.ts:372`
