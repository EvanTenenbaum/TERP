# TERP Context Pack (00_INDEX)

Built from TERP repo commit `726d4de9` (branch `main`) and live validation on `2026-02-10` (build `build-mlg8ifh4`).

This pack is optimized for fast lookup during a live walkthrough in Atlas: route -> action -> mutation -> data impact -> evidence.

## File Map (What To Open, When)

- `01_PRODUCT_BRIEF.md`
  - Use for product scope, personas, jobs-to-be-done, glossary.
- `02_SYSTEM_MAP.md`
  - Use for module/screen mapping and screen-to-data mapping.
- `03_DATA_MODEL_CHEATSHEET.md`
  - Use for core entities, relationships, invariants, enums, computed fields.
- `04_GOLDEN_FLOWS.md`
  - Primary walkthrough script (risk + criticality + proof checks).
- `05_BUSINESS_RULES.md`
  - Business rules, enforcement location, violation behavior, missing enforcement.
- `06_NAVIGATION_AND_ROUTES.md`
  - Route map by module, hidden/legacy routes.
- `07_STATE_AND_SIDE_EFFECTS.md`
  - State ownership and mutation side effects.
- `08_TESTING_PROTOCOL_FOR_ATLAS.md`
  - Ready-to-paste Atlas prompt + verification templates + issue rubric.
- `09_KNOWN_ISSUES_AND_RISKS.md`
  - Truth tables and risk register.
- `10_DECISIONS_AND_OPEN_QUESTIONS.md`
  - Canonical decisions (resolved) + remaining unknowns.
- `11_APPENDIX_EVIDENCE_MAP.md`
  - Fast file/symbol lookup index.
- `routes.csv`, `entities.csv`, `golden_flows.csv`
  - Machine-readable lookup tables.

## Golden Flows First (Recommended Walkthrough Order)

This order reflects current code + canonical operating decisions.

1. Auth sanity: `/login`, `/`, logout behavior.
   - Evidence: `server/routers/auth.ts` (`logout`), `server/_core/context.ts` (`createContext` fallback), `client/src/_core/hooks/useAuth.ts`.
2. Direct intake + inventory status: `/direct-intake` -> `/inventory`.
   - Evidence: `server/routers/inventory.ts`, `server/inventoryIntakeService.ts`, `server/inventoryUtils.ts`.
3. Canonical order creation: `/orders/create` (`createDraftEnhanced` + `finalizeDraft`).
   - Evidence: `server/routers/orders.ts:703` (`createDraftEnhanced`), `server/routers/orders.ts:1074` (`finalizeDraft`).
4. Shipping and invoice creation from order fulfillment.
   - Evidence: `server/ordersDb.ts:1691` (`updateOrderStatus`), `server/ordersDb.ts:1805` (`createInvoiceFromOrder`).
5. Invoice management surface: `/accounting/invoices`.
   - Evidence: `client/src/components/work-surface/InvoicesWorkSurface.tsx`, `server/routers/invoices.ts:341` (`generateFromOrder`).
6. Payment recording verification (canonical backend target: `payments.recordPayment`; current UI mismatch is known defect).
   - Evidence: `server/routers/payments.ts:233` (`recordPayment`), `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767` (`accounting.payments.create`).
7. Returns and ledger consistency: `/returns`, `/accounting/general-ledger`, `/clients/:clientId/ledger`.
   - Evidence: `server/routers/returns.ts`, `server/accountingHooks.ts`, `server/services/clientBalanceService.ts`.
8. Purchase orders + supplier model checks.
   - Evidence: `drizzle/schema.ts:232` (`supplierClientId`), `drizzle/schema.ts:238` (`vendorId` deprecated comment), `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md:620`.
9. Samples workflow checks (`/samples` is user-facing internal flow).
   - Evidence: `client/src/App.tsx:350`, `client/src/config/navigation.ts:174`, `server/routers/samples.ts:166` (`fulfillRequest`).

## Do Not Break (High-Risk Areas)

1. Canonical order path and inventory semantics must stay consistent.
   - Canonical: `/orders/create` finalizes draft; `/orders` is list/manage, not primary confirmation path.
   - Evidence: `server/routers/orders.ts:703`, `server/routers/orders.ts:1074`, `server/routers/orders.ts:614`, `client/src/components/work-surface/OrdersWorkSurface.tsx:598`.
2. Inventory movement timing must be unified.
   - Target behavior: reserve at finalize; at ship decrement both `onHandQty` and `reservedQty` atomically (sample decremented at finalize).
   - Evidence: `server/routers/orders.ts:1799`, `server/ordersDb.ts:1691`, `server/ordersDb.ts:1163`.
3. Invoice creation should be fulfillment/order-driven operationally.
   - Evidence: `server/ordersDb.ts:1747`, `server/ordersDb.ts:1805`, `server/routers/invoices.ts:341`, `client/src/components/work-surface/InvoicesWorkSurface.tsx`.
4. Payment source of truth should be canonicalized.
   - Canonical target: `payments.recordPayment`; current UI wiring to `accounting.payments.create` is mismatch.
   - Evidence: `server/routers/payments.ts:233`, `server/routers/accounting.ts:1175`, `server/arApDb.ts:877`, `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767`.
5. Production logout/auth behavior.
   - Production should not rely on demo/public fallback post-logout.
   - Evidence: `server/_core/context.ts:203`, `server/_core/context.ts:230`, `server/routers/auth.ts:22`, `client/src/_core/hooks/useAuth.ts:50`.
6. Feature-flag admin reliability.
   - `featureFlags.getAuditHistory` 500s are defects, not transitional behavior.
   - Evidence: `server/routers/featureFlags.ts:372`, `server/services/featureFlagService.ts:356`, `server/featureFlagsDb.ts:458`, `docs/qa-reviews/FEATURE_FLAG_E2E_QA_LIVE.md:85`.
7. `/orders/create` helper endpoint failures (`credit`/`referrals`) must be treated as defects before canonicalizing broad usage.
   - Evidence: `server/routers/credit.ts:189`, `server/routers/referrals.ts:25`, `server/routers/referrals.ts:120`, `server/routers/referrals.ts:502`.
8. Compatibility routing for `/settings/display`.
   - Should redirect to `/settings`; current behavior is 404.
   - Evidence: `client/src/App.tsx:305`, `client/src/App.tsx:488`.
