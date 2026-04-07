# 11_APPENDIX_EVIDENCE_MAP (Fast Lookup)

This is the rapid lookup index for live walkthroughs.

## Global Anchors

- Frontend route tree: `client/src/App.tsx`
- Sidebar/nav model: `client/src/config/navigation.ts`
- Backend router assembly: `server/routers.ts`
- Machine-readable maps:
  - `context-pack/routes.csv`
  - `context-pack/entities.csv`
  - `context-pack/golden_flows.csv`

## Latest Live Validation Anchors (2026-02-10)

- Host: `https://terp-app-b9s35.ondigitalocean.app`
- Build observed: `build-mlg8ifh4`
- Confirmed issues:
  - `/orders` -> `orders.getAll` 500
  - `/orders/create` after client select -> `credit.getVisibilitySettings` 500, `referrals.getSettings/getPendingCredits` 500
  - `/settings/feature-flags` -> `featureFlags.getAuditHistory` 500
  - `/settings/display` -> 404
  - logout then `/` -> dashboard re-entry (fallback user behavior)

Relevant code anchors:

- `server/routers/orders.ts` (`getAll`, `createDraftEnhanced`, `finalizeDraft`, `shipOrder`)
- `server/ordersDb.ts` (`confirmDraftOrder`, `updateOrderStatus`, `decrementInventoryForOrder`)
- `server/routers/credit.ts` (`getVisibilitySettings`)
- `server/routers/referrals.ts` (`getSettings`, `getPendingCredits`, `getEligibleReferrers`)
- `server/routers/featureFlags.ts` (`getAuditHistory`)
- `server/services/featureFlagService.ts` (`getAuditHistory`)
- `server/featureFlagsDb.ts` (`getAuditLogs`)
- `client/src/App.tsx` (no `/settings/display` route)
- `server/_core/context.ts` (`createContext` fallback provisioning)

## Canonical Decision Anchors

### Order path canonicalization

- Canonical path target: `/orders/create`
  - `server/routers/orders.ts:703` (`createDraftEnhanced`)
  - `server/routers/orders.ts:1074` (`finalizeDraft`)
- Legacy/secondary path still active:
  - `server/routers/orders.ts:614` (`confirmDraftOrder`)
  - `client/src/components/work-surface/OrdersWorkSurface.tsx:598` (mutation wiring)

### Inventory movement timing

- Shipping status transition:
  - `server/ordersDb.ts:1691` (`updateOrderStatus`)
  - `server/ordersDb.ts:1778` (`decrementInventoryForOrder` call)
  - `server/ordersDb.ts:1958` (`decrementInventoryForOrder` implementation)
- Legacy confirm path movement:
  - `server/ordersDb.ts:1163` (`confirmDraftOrder`)

### Invoice creation operational path

- Order fulfillment creates invoice:
  - `server/ordersDb.ts:1805` (`createInvoiceFromOrder`)
- Router endpoint exists for order-derived generation:
  - `server/routers/invoices.ts:341` (`generateFromOrder`)
- Invoice management surface:
  - `client/src/components/work-surface/InvoicesWorkSurface.tsx`

### Payment source-of-truth mismatch

- Canonical backend target:
  - `server/routers/payments.ts:233` (`recordPayment`)
- Current active UI wiring mismatch:
  - `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767` (`accounting.payments.create`)
  - `server/routers/accounting.ts:1175` (`payments.create`)
  - `server/routers/accounting.ts:915` (`invoices.recordPayment`)
  - `server/arApDb.ts:877` (`createPayment`)
  - `server/arApDb.ts:191` (`recordInvoicePayment`)

### Auth/logout fallback behavior

- Logout endpoint:
  - `server/routers/auth.ts:22`
- Fallback provisioning path:
  - `server/_core/context.ts:203`
  - `server/_core/context.ts:230`
- Frontend auth interpretation:
  - `client/src/_core/hooks/useAuth.ts:50`

### Supplier model canonicalization

- Canonical + deprecated schema markers:
  - `drizzle/schema.ts:232` (`supplierClientId`)
  - `drizzle/schema.ts:238` (`vendorId` deprecated comment)
- Product spec rule:
  - `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md:620`

### Settings/display compatibility gap

- Existing settings route:
  - `client/src/App.tsx:305` (`/settings`)
- Missing compatibility route (falls to NotFound):
  - `client/src/App.tsx:488`

### Samples visibility + fulfillment

- User-facing route + navigation:
  - `client/src/App.tsx:350`
  - `client/src/config/navigation.ts:174`
- Permissioned fulfillment mutation:
  - `server/routers/samples.ts:166` (`fulfillRequest`)

## Module Quick Jump

- Inventory: `server/routers/inventory.ts`, `server/inventoryIntakeService.ts`, `server/inventoryUtils.ts`, `client/src/components/work-surface/InventoryWorkSurface.tsx`
- Orders: `server/routers/orders.ts`, `server/ordersDb.ts`, `client/src/pages/OrderCreatorPage.tsx`, `client/src/components/work-surface/OrdersWorkSurface.tsx`
- Accounting: `server/routers/accounting.ts`, `server/routers/payments.ts`, `server/arApDb.ts`, `server/accountingHooks.ts`, `server/services/orderAccountingService.ts`
- Returns: `server/routers/returns.ts`, `server/services/returnProcessing.ts`, `client/src/pages/ReturnsPage.tsx`
- Samples: `server/routers/samples.ts`, `server/samplesDb.ts`, `client/src/pages/SampleManagement.tsx`

## Background Jobs / Consistency Checks

- Started on boot: `server/_core/index.ts`
- Present but not started by default: `server/cron/glBalanceCheck.ts`, `server/cron/arReconciliationCheck.ts`
