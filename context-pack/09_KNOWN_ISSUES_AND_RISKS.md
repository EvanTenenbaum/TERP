# 09_KNOWN_ISSUES_AND_RISKS

This file consolidates:

- Repo-documented issues/TODOs
- Live-confirmed defects
- Docs-vs-code-vs-operations truth tables
- Risk register

## Repo-Documented Issues (Still Relevant)

1. Background reconciliation checks exist but are not fully operationalized with notification workflows.
   - Evidence: `server/cron/glBalanceCheck.ts` (TODO comments), `server/cron/arReconciliationCheck.ts` (TODO comments), startup wiring in `server/_core/index.ts`.
2. Several pages/components still carry explicit TODO/FIXME markers.
   - Evidence examples: `client/src/pages/LiveShoppingPage.tsx`, `server/routers/scheduling.ts`.
3. Legacy docs remain partially stale relative to runtime behavior.
   - Evidence examples: auth/provider notes in `README.md` and older auth docs vs current `server/_core/simpleAuth.ts` + `server/_core/context.ts`.

## Live-Confirmed Defects (2026-02-10, build `build-mlg8ifh4`)

Host validated: `https://terp-app-b9s35.ondigitalocean.app`

1. **`orders.getAll` fails on `/orders` (HTTP 500)**
   - Impact: order list/manage visibility degraded.
   - Evidence:
     - Live network: `/api/trpc/orders.getAll,orders.getAll?...` -> 500
     - `server/routers/orders.ts` (`getAll` input parsing path)
     - `client/src/components/work-surface/OrdersWorkSurface.tsx` (list query usage)

2. **`inventory.profitability.summary/top` fail on dashboard (HTTP 500)**
   - Impact: profitability analytics unavailable.
   - Evidence:
     - Live network: `/api/trpc/inventory.profitability.summary,inventory.profitability.top?...` -> 500
     - `server/routers/inventory.ts` (`profitability.summary`, `profitability.top`)

3. **`featureFlags.getAuditHistory` fails on `/settings/feature-flags` (HTTP 500)**
   - Impact: audit traceability for flag changes is broken.
   - Evidence:
     - Live network: `/api/trpc/featureFlags.getAuditHistory?...` -> 500
     - `client/src/pages/settings/FeatureFlagsPage.tsx` (query call)
     - `server/routers/featureFlags.ts:372`
     - `server/services/featureFlagService.ts:356`
     - `server/featureFlagsDb.ts:458`

4. **`/settings/display` is 404**
   - Impact: legacy links/bookmarks break.
   - Evidence:
     - Live route result: `/settings/display` -> 404
     - `client/src/App.tsx:305` (`/settings` exists)
     - `client/src/App.tsx:488` (fallback NotFound, no `/settings/display` route)

5. **`/orders/create` helper endpoints fail after client selection (HTTP 500)**
   - Impact: canonical order flow lacks reliable credit/referral context.
   - Evidence:
     - Live network:
       - `credit.getVisibilitySettings` -> 500
       - `referrals.getSettings,referrals.getPendingCredits` -> 500
     - `server/routers/credit.ts:189`
     - `server/routers/referrals.ts:25`, `server/routers/referrals.ts:120`, `server/routers/referrals.ts:502`

6. **Logout does not enforce unauthenticated state in production-like runtime**
   - Impact: user can return to internal dashboard after logout due to fallback user provisioning.
   - Evidence:
     - Live sequence: logout -> `/login`; navigate `/` -> internal dashboard loads.
     - `server/_core/context.ts:203`, `server/_core/context.ts:230`
     - `server/routers/auth.ts:22`
     - `client/src/_core/hooks/useAuth.ts:50`

## Truth Tables (Docs vs Code vs Operational Decision)

### Truth Table 1: Canonical Order Path

- **Code does today:** both `/orders/create` (`createDraftEnhanced` + `finalizeDraft`) and `/orders` (`confirmDraftOrder`) are active.
  - Evidence: `server/routers/orders.ts:703`, `server/routers/orders.ts:1074`, `server/routers/orders.ts:614`, `client/src/components/work-surface/OrdersWorkSurface.tsx:598`.
- **Decision (canonical):** `/orders/create` path is long-term canonical. `/orders` is list/manage surface; `confirmDraftOrder` should be retired from primary flow.
- **What must be validated live:** legacy confirmation controls are phased out safely (no operator confusion).

### Truth Table 2: Inventory Movement Timing

- **Code does today:** inconsistent movement semantics across finalize/confirm/ship paths.
  - Evidence: `server/ordersDb.ts:1163`, `server/ordersDb.ts:1691`, `server/ordersDb.ts:1958`.
- **Decision (canonical):** reserve at finalize; at ship decrement both `onHandQty` and `reservedQty` atomically; sample quantity decremented at finalize.
- **What must be validated live:** shipping transition produces expected quantity deltas in one transaction.

### Truth Table 3: Invoice Creation Operation

- **Code does today:** invoice generation exists in order/fulfillment and invoice routers; manual accounting create path also exists.
  - Evidence: `server/ordersDb.ts:1805`, `server/routers/invoices.ts:341`, `server/routers/accounting.ts` (`invoices.create`).
- **Decision (canonical):** invoice creation is operationally order/fulfillment-driven; `/accounting/invoices` is management surface.
- **What must be validated live:** day-to-day users can complete billing from order flow without manual accounting-first workaround.

### Truth Table 4: Payment Recording Source of Truth

- **Code does today:** split paths coexist (`payments.recordPayment`, `accounting.payments.create`, `accounting.invoices.recordPayment`); UI currently calls `accounting.payments.create`.
  - Evidence: `server/routers/payments.ts:233`, `server/routers/accounting.ts:915`, `server/routers/accounting.ts:1175`, `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767`.
- **Decision (canonical):** `payments.recordPayment` should be canonical; current UI wiring is mismatch defect.
- **What must be validated live:** payment action updates invoice balance/status, writes payment record, and posts GL entries together.

### Truth Table 5: Post-Logout Access Model

- **Code does today:** fallback public user is provisioned outside demo mode.
  - Evidence: `server/_core/context.ts:203`, `server/_core/context.ts:230`.
- **Decision (canonical):** production should not allow fallback internal browsing after logout.
- **What must be validated live:** production environment enforces true logged-out state.

### Truth Table 6: Supplier Identity Model

- **Code does today:** canonical + transitional fields coexist (`supplierClientId`, deprecated `vendorId`).
  - Evidence: `drizzle/schema.ts:232`, `drizzle/schema.ts:238`, `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md:620`.
- **Decision (canonical):** clients-as-suppliers (`supplierClientId`) is official model; `vendorId` transitional only.
- **What must be validated live:** PO/intake/reporting screens use canonical identity consistently.

### Truth Table 7: Feature Flag Audit History Errors

- **Code intent:** audit history endpoint should return data or empty result, not fail.
  - Evidence: `server/routers/featureFlags.ts:372`, `server/services/featureFlagService.ts:356`, `server/featureFlagsDb.ts:458`.
- **Docs expectation:** empty state is valid when no history exists.
  - Evidence: `docs/qa-reviews/FEATURE_FLAG_E2E_QA_LIVE.md:85`.
- **Decision:** live 500s are defects/incidents.

### Truth Table 8: `/settings/display` Compatibility

- **Code does today:** no explicit route; fallback 404.
  - Evidence: `client/src/App.tsx:305`, `client/src/App.tsx:488`.
- **Decision:** add compatibility redirect from `/settings/display` to `/settings`.

### Truth Table 9: Sample Fulfillment Exposure

- **Code does today:** `/samples` user-facing route exists; backend `fulfillRequest` is permissioned.
  - Evidence: `client/src/App.tsx:350`, `client/src/config/navigation.ts:174`, `server/routers/samples.ts:166`.
- **Decision:** user-facing for internal authorized users (not public; not backend-only).
- **What must be validated live:** role/permission boundaries for fulfillment actions are correct.

## Dependencies / Integrations At Risk

1. **Deployment/runtime config (DigitalOcean App Platform)**
   - Evidence: `.do/`, `DEPLOY.md`, deployment scripts.
2. **Auth/session config and environment gating**
   - Evidence: `server/_core/context.ts`, `server/_core/simpleAuth.ts`, `server/_core/env.ts`.
3. **Accounting posting and ledger correctness hooks**
   - Evidence: `server/accountingHooks.ts`, `server/services/orderAccountingService.ts`.
4. **Storage/media and asset delivery**
   - Evidence: `server/routers/storage.ts`, `drizzle/schema-storage.ts`.

## Risk Register

| Risk | Impact | Likelihood | Detection | Mitigation |
| --- | --- | --- | --- | --- |
| `/orders` list 500s (`orders.getAll`) | High | High | Open `/orders`, inspect network for 500 | Fix input/null handling, add smoke test for list route |
| `/orders/create` helper 500s (`credit/referrals`) | High | High | Select client in `/orders/create`, inspect network | Add permission-aware fallback UI and harden backend null handling |
| Payment flow canonical mismatch (`accounting.payments.create` vs `payments.recordPayment`) | High | High | Record payment and verify invoice+payment+GL all update | Rewire UI to canonical backend path; add end-to-end accounting assertions |
| Inventory movement inconsistency across order paths | High | Medium | Compare quantity deltas finalize/confirm/ship | Implement single movement policy and transactional update |
| Post-logout fallback browsing in production | High | High | Logout then navigate `/` | Disable fallback in prod, enforce true unauthenticated state |
| Feature flag audit history 500 | Medium | High | Open `/settings/feature-flags` and check audit requests | Repair query path and add endpoint health check |
| `/settings/display` 404 | Low | High | Navigate `/settings/display` | Add compatibility redirect to `/settings` |
| Supplier model drift (`supplierClientId` vs legacy `vendorId`) | High | Medium | Create/update PO and intake supplier flows | Complete migration plan and deprecate legacy paths |
| Dashboard profitability endpoints 500 | Medium | High | Load dashboard, inspect profitability calls | Fix endpoint failure path and add monitoring |
| Returns/accounting consistency drift | High | Medium | Process return and compare invoices/ledger/client balance | Enforce single balance source and reconciliation checks |

## Secrets / Redactions

- No tokens/keys are included in this file.
- If encountered in docs/config, they are intentionally omitted.
