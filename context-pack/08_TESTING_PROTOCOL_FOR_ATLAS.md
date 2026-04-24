# 08_TESTING_PROTOCOL_FOR_ATLAS

## Ready-To-Paste Atlas Session Prompt

Use this prompt in Atlas:

---

You are the TERP PM/QA copilot for a live walkthrough.

Rules:

- Treat implementation code as source of truth.
- Use canonical decisions from `10_DECISIONS_AND_OPEN_QUESTIONS.md`.
- Do not guess. If behavior is unclear, label it `UNSPECIFIED` and ask Evan.
- For each issue: include route, exact steps, expected vs actual, severity (P0-P3), and evidence pointers (file + symbol).

Priority checks for this session:

1. Canonical order path `/orders/create` and related inventory behavior
2. Shipping + invoice creation from fulfillment
3. Payment flow correctness vs canonical backend (`payments.recordPayment`)
4. Post-logout auth behavior in production context
5. Feature flags audit history reliability

Use these files while testing:

- `00_INDEX.md`
- `04_GOLDEN_FLOWS.md`
- `05_BUSINESS_RULES.md`
- `07_STATE_AND_SIDE_EFFECTS.md`
- `09_KNOWN_ISSUES_AND_RISKS.md`
- `10_DECISIONS_AND_OPEN_QUESTIONS.md`

---

## Walkthrough Order (Optimized)

1. Auth/logout sanity (`/login`, `/`, logout behavior).
2. Direct Intake (`/direct-intake`) and Inventory status checks (`/inventory`).
3. Canonical order create flow (`/orders/create`) with client selection and helper endpoints.
4. Order shipping path verification (status + inventory + invoice generation side effects).
5. Invoice management (`/accounting/invoices`) and PDF/actions sanity.
6. Payment flow validation (`/accounting/invoices` + `/accounting/payments` + `/accounting/general-ledger`).
7. Returns flow (`/returns`) and downstream ledger/client-balance consistency.
8. Supplier model checks in procure flows (`/purchase-orders`) against canonical model.
9. Samples flow (`/samples`) with permissioned internal-user expectations.
10. Admin settings compatibility checks (`/settings`, `/settings/feature-flags`, `/settings/display`).

## Verification Templates

### A) Canonical Order Creation (`/orders/create`)

Success criteria:

- `createDraftEnhanced` + `finalizeDraft` complete without helper endpoint failures.
- Inventory reservation behavior is correct (`reservedQty` changes).
- No unexpected hard failures from credit/referral helper calls for normal roles.

Evidence pointers:

- `server/routers/orders.ts:703` (`createDraftEnhanced`)
- `server/routers/orders.ts:1074` (`finalizeDraft`)
- `server/routers/credit.ts:189` (`getVisibilitySettings`)
- `server/routers/referrals.ts:25`, `server/routers/referrals.ts:120`

### B) Shipping + Invoice Generation

Success criteria:

- Ship transition completes.
- Inventory movement matches policy (target: decrement both `onHandQty` and `reservedQty`).
- Invoice is created from order fulfillment path.

Evidence pointers:

- `server/ordersDb.ts:1691` (`updateOrderStatus`)
- `server/ordersDb.ts:1805` (`createInvoiceFromOrder`)
- `server/ordersDb.ts:1958` (`decrementInventoryForOrder`)

### C) Payment Flow (High-Risk)

Success criteria (all required):

1. Invoice `amountDue` decreases and status updates.
2. Payment row appears in `/accounting/payments`.
3. GL entries are posted appropriately.

Canonical target:

- `payments.recordPayment`

Current known mismatch to test for:

- UI flow calls `accounting.payments.create`.

Evidence pointers:

- `server/routers/payments.ts:233`
- `server/routers/accounting.ts:1175`
- `server/routers/accounting.ts:915`
- `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767`

### D) Logout/Auth Behavior

Success criteria:

- After logout, navigating to `/` in production should not re-enter internal dashboard automatically.

Evidence pointers:

- `server/routers/auth.ts:22`
- `server/_core/context.ts:203`, `server/_core/context.ts:230`
- `client/src/_core/hooks/useAuth.ts:50`

### E) Feature Flag Audit History

Success criteria:

- `/settings/feature-flags` loads audit history data or clean empty state; no 500.

Evidence pointers:

- `server/routers/featureFlags.ts:372`
- `server/services/featureFlagService.ts:356`
- `server/featureFlagsDb.ts:458`

## Issue Severity Rubric (TERP-Specific)

- **P0**
  - Financial misstatement risk (invoice/payment/GL inconsistency)
  - Inventory corruption
  - Unauthorized mutation/security breach
- **P1**
  - Canonical order flow unusable
  - Shipping/invoicing blocked
  - Payment recording functionally broken
- **P2**
  - Core workflow partially usable with material workaround
  - Permission/fallback behavior confusing but recoverable
- **P3**
  - Cosmetic/UX polish issues with no data correctness impact

## Stop-And-Ask Triggers

Ask Evan immediately when any of these appear:

1. A decision would change accounting or inventory policy (not just UI behavior).
2. You see conflicting outcomes between `payments.recordPayment` and `accounting.payments.create` and need migration preference.
3. You need to disable or hide legacy `/orders` confirmation controls and the rollout sequence is unclear.
4. A proposed fix changes production auth model (demo/public fallback behavior).
5. Supplier identity or migration choices require data conversion/deprecation timing.
