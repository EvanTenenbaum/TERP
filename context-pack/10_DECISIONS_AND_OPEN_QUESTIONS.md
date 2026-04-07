# 10_DECISIONS_AND_OPEN_QUESTIONS

This file records canonical decisions resolved on `2026-02-10` and the few remaining questions the repo/live checks still cannot fully answer.

## Canonical Decisions (Resolved)

These decisions are treated as authoritative for walkthroughs and QA.

1. **Canonical order path (long-term)**
   - Decision: use `/orders/create` with `orders.createDraftEnhanced` + `orders.finalizeDraft` as primary create flow.
   - `/orders` remains list/manage surface; `orders.confirmDraftOrder` should be retired from the primary flow.
   - Evidence:
     - `server/routers/orders.ts:703` (`createDraftEnhanced`)
     - `server/routers/orders.ts:1074` (`finalizeDraft`)
     - `server/routers/orders.ts:614` (`confirmDraftOrder`)
     - `client/src/components/work-surface/OrdersWorkSurface.tsx:598` (UI still wired to `confirmDraftOrder`)

2. **Inventory movement timing (target behavior)**
   - Decision: reserve at finalize; at ship decrement both `onHandQty` and `reservedQty` in one transaction; sample quantities decrement at finalize.
   - Current code is inconsistent across paths and requires unification.
   - Evidence:
     - `server/routers/orders.ts:1799` (`shipOrder` entry)
     - `server/ordersDb.ts:1691` (`updateOrderStatus`)
     - `server/ordersDb.ts:1958` (`decrementInventoryForOrder` currently decrements `onHandQty` only)
     - `server/ordersDb.ts:1163` (`confirmDraftOrder` legacy decrement path)

3. **Operational invoice creation path**
   - Decision: invoices should be generated from order/fulfillment flow, not as the primary manual accounting entry path.
   - `/accounting/invoices` is primarily for invoice management operations.
   - Evidence:
     - `server/ordersDb.ts:1747` (ship transition block)
     - `server/ordersDb.ts:1805` (`createInvoiceFromOrder` call)
     - `server/routers/invoices.ts:341` (`generateFromOrder`)
     - `client/src/components/work-surface/InvoicesWorkSurface.tsx` (management surface)

4. **Payment backend source of truth (target)**
   - Decision: canonical should be `payments.recordPayment` (full invoice/payment business logic in one path).
   - Current UI wiring to `accounting.payments.create` is a mismatch and should be corrected.
   - Evidence:
     - `server/routers/payments.ts:233` (`recordPayment`)
     - `server/routers/accounting.ts:1175` (`payments.create`)
     - `server/arApDb.ts:877` (`createPayment`)
     - `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767` (calls `accounting.payments.create`)

5. **Production logout behavior**
   - Decision: production should not allow demo/public fallback after logout.
   - Current code provisions fallback user outside demo mode, so logout is not truly unauthenticated today.
   - Evidence:
     - `server/_core/context.ts:203` (fallback branch)
     - `server/_core/context.ts:230` (public user provisioning)
     - `server/routers/auth.ts:22` (`logout`)
     - `client/src/_core/hooks/useAuth.ts:50` (`isAuthenticated: Boolean(meQuery.data)`)

6. **Supplier identity model**
   - Decision: clients-as-suppliers (`supplierClientId`) is the official model; `vendorId` remains transitional compatibility only.
   - Evidence:
     - `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md:620`
     - `drizzle/schema.ts:232` (`supplierClientId`)
     - `drizzle/schema.ts:238` (`vendorId` deprecated comment)

7. **`featureFlags.getAuditHistory` live 500s**
   - Decision: these are defects/incidents, not expected transitional behavior.
   - Expected behavior is data or empty state, not 500.
   - Evidence:
     - `server/routers/featureFlags.ts:372`
     - `server/services/featureFlagService.ts:356`
     - `server/featureFlagsDb.ts:458`
     - `docs/qa-reviews/FEATURE_FLAG_E2E_QA_LIVE.md:85` (empty-state expectation)

8. **`/orders/create` helper failures (`credit` + `referrals`)**
   - Decision: not acceptable for canonical production flow.
   - Must be permission-gated and/or have explicit fallback UI for non-admin roles before relying on `/orders/create` broadly.
   - Evidence:
     - `server/routers/referrals.ts:25` (`getSettings` admin-only)
     - `server/routers/referrals.ts:120` (`getPendingCredits` admin-only)
     - `server/routers/referrals.ts:502` (`getEligibleReferrers` admin-only)
     - `server/routers/credit.ts:189` (`getVisibilitySettings`)

9. **`/settings/display` compatibility**
   - Decision: route should exist as compatibility redirect to `/settings`.
   - Current behavior is 404.
   - Evidence:
     - `client/src/App.tsx:305` (`/settings` exists)
     - `client/src/App.tsx:488` (fallback `NotFound`; no `/settings/display` route)

10. **Sample fulfillment positioning**

- Decision: user-facing for internal authorized users (permissioned), not public and not backend-only.
- Evidence:
  - `client/src/App.tsx:350` (`/samples` route)
  - `client/src/config/navigation.ts:174` (Samples in inventory nav)
  - `server/routers/samples.ts:166` (`fulfillRequest` with `samples:allocate` permission)

## Live Validation Snapshot (Most Recent)

Validation date: `2026-02-10`
Live host: `https://terp-app-b9s35.ondigitalocean.app`
Observed build: `build-mlg8ifh4`

Observed in this pass:

- `/settings/feature-flags` loads but `featureFlags.getAuditHistory` returns 500.
- `/settings/display` resolves to 404 Not Found.
- `/orders` still triggers `orders.getAll` 500s.
- `/orders/create` still triggers 500s on `credit.getVisibilitySettings` and `referrals.getSettings/getPendingCredits` after client selection.
- Logout -> `/login` then direct navigation to `/` still re-enters internal dashboard (fallback user behavior persists).

Evidence pointers:

- `server/routers/featureFlags.ts:372`, `server/featureFlagsDb.ts:458`
- `client/src/App.tsx:305`, `client/src/App.tsx:488`
- `server/routers/orders.ts` (`getAll`)
- `server/routers/credit.ts:189`
- `server/routers/referrals.ts:25`, `server/routers/referrals.ts:120`
- `server/_core/context.ts:203`, `server/_core/context.ts:230`

## Remaining Open Questions (Not Resolved by Repo Alone)

1. **Exact shipping transaction unification plan**
   - Decision target is clear (decrement both `onHandQty` and `reservedQty` at ship), but implementation details and migration/backfill plan are not in repo.
   - Missing evidence: design note or migration task for existing reserved quantities.

2. **Final deprecation plan for `confirmDraftOrder`**
   - Canonical decision is clear, but phased rollout (feature flag, route guard, migration timeline) is not specified.
   - Missing evidence: explicit deprecation checklist in docs/tasks.

3. **Canonical UI orchestration for payment flow**
   - Backend target is set to `payments.recordPayment`, but concrete UI wiring migration path and backward compatibility behavior are not documented.
   - Missing evidence: implementation task spec for `InvoiceToPaymentFlow` migration.

4. **Production auth policy switch-over details**
   - Decision is to disable demo/public fallback in production, but exact environment/config change plan and safe rollout steps are not documented.
   - Missing evidence: deployment runbook update defining prod vs demo auth behavior.

5. **Supplier migration completion criteria**
   - Canonical model is set, but full inventory/accounting migration milestones for legacy `vendorId` paths are not fully specified.
   - Missing evidence: deprecation matrix by module/table/endpoint.

6. **`/settings/display` redirect ownership and rollout**
   - Decision is clear, but no implementation owner/timing is captured in repo docs.

7. **Role-based fallback behavior for credit/referrals on `/orders/create`**
   - Decision says not acceptable to fail; specific UX fallback pattern (hide vs degraded widget vs warning state) is not finalized.

## High-Leverage Questions For Walkthrough (Current)

1. Which release should carry the `confirmDraftOrder` deprecation and `/orders/create` hardening together?
2. Do you want `/orders` confirmation controls hidden immediately or behind a feature flag first?
3. Should `/orders/create` continue if credit/referral helper calls fail (with warning), or block finalization until fixed?
4. Should payment migration move UI directly to `payments.recordPayment`, or add a thin backend adapter first?
5. What is the production cutover date for disabling fallback public/demo post-logout behavior?
