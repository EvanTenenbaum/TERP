# 05_BUSINESS_RULES (What Is Enforced, Where, and What Happens When Violated)

This file consolidates business rules that are explicitly implemented in code. If a rule is only implied (UI text suggests it, docs suggest it, but code does not enforce it), it is listed under **Rules Missing Enforcement**.

For each rule:

- **Rule statement**: plain language
- **Where enforced**: frontend vs backend vs database
- **Violation behavior**: error vs silent behavior
- **Evidence pointers**: files + key symbols

---

## Inventory Rules

### Rule: Available quantity = On-hand − Reserved − Quarantine − Hold (never negative)

- Where enforced: backend calculation helper.
- Violation behavior: not a “violation”; it is the canonical derived number.
- Evidence: `server/inventoryUtils.ts` (`calculateAvailableQty`).

### Rule: Quantity buckets must be non-negative; allocations must not exceed on-hand

- Where enforced: backend helper exists; enforcement is **UNSPECIFIED** (depends on whether callers use it).
- Violation behavior: when validated, returns errors; otherwise state can drift.
- Evidence: `server/inventoryUtils.ts` (`validateQuantityConsistency`).

### Rule: Intake must validate COGS inputs

- Where enforced: backend, before DB transaction.
- Violation behavior: throws error and no DB changes occur.
- Evidence: `server/inventoryIntakeService.ts` (`processIntake` calls `inventoryUtils.validateCOGS` before transaction).

### Rule: Intake creates vendor/brand/product/lot/batch/location/audit atomically

- Where enforced: backend, transaction.
- Violation behavior: rollback on any failure.
- Evidence: `server/inventoryIntakeService.ts` (`processIntake` uses `db.transaction`).

### Rule: Batch status transitions must be valid

- Where enforced: backend.
- Violation behavior: throws an error.
- Evidence: `server/routers/inventory.ts` (`updateStatus` calls `inventoryUtils.isValidStatusTransition`).

### Rule: Quarantine status moves quantity between buckets

- Where enforced: backend in `inventory.updateStatus`.
- Violation behavior: status change triggers quantity transfer logic.
- Evidence: `server/routers/inventory.ts` (quarantine-quantity synchronization comments and code).

---

## Order Rules

### Rule: Positive quantities and non-negative prices (draft updates)

- Where enforced: backend.
- Violation behavior: throws error; mutation fails.
- Evidence: `server/ordersDb.ts` (`updateDraftOrder` validation loop).

### Rule: Confirming a draft order requires inventory availability

- Where enforced: backend, inside DB transaction with row locks.
- Violation behavior: throws error; transaction rolls back.
- Evidence: `server/ordersDb.ts` (`confirmDraftOrder` locks batches with `FOR UPDATE` and checks `calculateAvailableQty`).

### Rule: Order finalization (Order Creator path) reserves inventory (reservedQty) instead of decrementing on-hand

- Where enforced: backend.
- Violation behavior: throws BAD_REQUEST if insufficient inventory.
- Evidence: `server/routers/orders.ts` (`finalizeDraft` increments `batches.reservedQty`).

### Rule: Order confirmation (Orders Work Surface path) decrements inventory (onHandQty)

- Where enforced: backend.
- Violation behavior: throws error if insufficient inventory.
- Evidence: `client/src/components/work-surface/OrdersWorkSurface.tsx` uses `trpc.orders.confirmDraftOrder`, implemented in `server/ordersDb.ts`.

### Rule: Confirm endpoint rate limiting (10 confirms/minute/user)

- Where enforced: backend in-memory limiter.
- Violation behavior: throws TRPCError `TOO_MANY_REQUESTS`.
- Evidence: `server/routers/orders.ts` (`confirmRateLimitMap` + `checkConfirmRateLimit`).

---

## Returns Rules

Note: TERP contains **two** return implementations:

1. A “returns workflow” router with explicit states tracked in `returns.notes`.
   - Evidence: `server/routers/returns.ts` (`RETURN_STATUS_TRANSITIONS`, `extractReturnStatus`).
2. Order-based “return processing” endpoints (`orders.markAsReturned`, `orders.processRestock`, `orders.processVendorReturn`).
   - Evidence: `server/routers/orders.ts` (procedures near the “Get order returns” section), `server/services/returnProcessing.ts`.

This section documents rules that are clearly implemented in `server/routers/returns.ts` because they directly impact inventory and accounting correctness.

### Rule: Return reasons are canonicalized before insert (some UI reasons map to DB reasons)

- Rule statement: reasons like `DAMAGED_IN_TRANSIT` and `QUALITY_ISSUE` are stored as `DEFECTIVE` in the database.
- Where enforced: backend mapping function.
- Violation behavior: not a “violation”; this is canonicalization.
- Evidence: `server/routers/returns.ts` (`returnReasonInputEnum`, `DbReturnReason`, `mapReturnReason`).

### Rule: Return status transitions must be valid (state machine)

- Rule statement: return status transitions follow a fixed state machine (PENDING → APPROVED/REJECTED/CANCELLED → RECEIVED → PROCESSED).
- Where enforced: backend validation, before writing.
- Violation behavior: throws error (transition rejected).
- Evidence: `server/routers/returns.ts` (`RETURN_STATUS_TRANSITIONS`, `isValidReturnStatusTransition`, `getReturnTransitionError`), used by `approve`, `reject`, `receive`, `process`.

### Rule: Return “status” is not a database column; it’s tracked in `returns.notes`

- Rule statement: the workflow status is inferred from string markers like `[APPROVED ...]` embedded in `returns.notes`.
- Where enforced: backend parsing helper + note appends.
- Violation behavior: reporting/filtering is limited; status can be malformed if notes are edited outside this router.
- Evidence: `server/routers/returns.ts` (`extractReturnStatus` comment “schema doesn't have a status field”), mutations `approve/reject/receive/process` append markers into `returns.notes`.

### Rule: Creating a return can optionally restock inventory immediately (default true)

- Rule statement: `returns.create` accepts `restockInventory` (default `true`). When true, it increases `batches.onHandQty` and writes an `inventoryMovements` row per item.
- Where enforced: backend transaction.
- Violation behavior: on missing batch, throws error and rolls back.
- Evidence: `server/routers/returns.ts` (`create` mutation; locks batches with `.for("update")`, updates `batches.onHandQty`, inserts `inventoryMovements` with `inventoryMovementType: "RETURN"`).

### Rule: Creating a return may create a credit memo + reverse GL entries + reduce `clients.totalOwed`

- Rule statement: if an invoice exists for the order (`invoices.referenceType="ORDER"` and `referenceId=orderId`) and return has value, the create mutation:
  - Computes return value from original order item unit prices
  - Creates a credit memo (`creditsDb.createCredit`)
  - Attempts to reverse GL entries for the invoice (`reverseGLEntries`)
  - Decrements `clients.totalOwed` via a raw SQL update
- Where enforced: backend, inside the `returns.create` transaction.
- Violation behavior:
  - If there are no GL entries to reverse, it logs a warning and continues.
  - Other GL reversal failures throw and roll back.
- Evidence: `server/routers/returns.ts` (`create`: “ACC-003” blocks; calls `creditsDb.generateCreditNumber`, `creditsDb.createCredit`, `reverseGLEntries`, and updates `clients.totalOwed`).

### Rule: Receiving a return can quarantine or dispose inventory depending on actual condition

- Rule statement: `returns.receive` records condition-specific inventory side effects:
  - `SELLABLE`: inserts an `inventoryMovements` “ADJUSTMENT” with `quantityChange: "0"` (condition verification log).
  - `QUARANTINE`: moves qty from `onHandQty` → `quarantineQty`, and may set `batchStatus="QUARANTINED"` when on-hand becomes 0.
  - `DAMAGED/DESTROYED`: decrements `onHandQty` and inserts a “DISPOSAL” movement.
- Where enforced: backend transaction with row locks.
- Violation behavior: throws error for invalid status transition; otherwise writes the movements and updates batch quantities.
- Evidence: `server/routers/returns.ts` (`receive` mutation condition branches; `inventoryMovementType` values `ADJUSTMENT`, `QUARANTINE`, `DISPOSAL`).

### Rule: “Process return” can issue credit, but uses a simplified amount calculation

- Rule statement: `returns.process` (default `issueCredit=true`) creates a credit memo, but if no explicit `creditAmount` is provided, it computes a rough amount (`totalQty * 10` with a cap by order total).
- Where enforced: backend.
- Violation behavior: may issue a credit amount that does not match original invoice/order pricing.
- Evidence: `server/routers/returns.ts` (`process` mutation: “simplified calculation (simplified)” comment, `totalQty * 10` logic).

---

## Credit Rules

### Rule: Credit exposure check for SALE orders (warning/soft/hard block)

- Where enforced: frontend calls backend credit check and shows warning dialog.
- Violation behavior:
  - If enforcementMode is HARD_BLOCK and exposure exceeds limit: backend returns `allowed=false`.
  - Frontend shows warning/override UX.
- Evidence: `server/routers/credit.ts` (`checkOrderCredit`), `client/src/pages/OrderCreatorPage.tsx` (calls `trpc.credit.checkOrderCredit`).

### Rule: Credit check failures do not block order finalization

- Where enforced: frontend behavior.
- Violation behavior: credit check error is logged and finalization continues.
- Evidence: `client/src/pages/OrderCreatorPage.tsx` (catch block: “allow order to proceed”).

---

## Invoice / Accounting Rules

### Rule: Recording a payment cannot overpay an invoice (two different enforcement paths)

- Where enforced: backend.
- Violation behavior: throws error and does not apply the allocation.
- Evidence:
  - Accounting allocation path: `server/arApDb.ts` (`recordInvoicePayment`, ST-061 over-allocation check), called by `server/routers/accounting.ts` (`invoices.recordPayment`).
  - Legacy “all-in-one” path: `server/routers/payments.ts` (`recordPayment` overpayment check with 0.01 tolerance).

### Rule: Payment posting creates balanced GL entries (Cash debit, AR credit) when using the allocation paths

- Where enforced: backend.
- Violation behavior: transaction rollback on failure.
- Evidence:
  - Legacy path posts entries directly: `server/routers/payments.ts` (`recordPayment` inserts `ledgerEntries` with `referenceType="PAYMENT"`).
  - Accounting path posts via helper: `server/accountingHooks.ts` (`postPaymentGLEntries`), called by `server/routers/accounting.ts` (`invoices.recordPayment`).

### Rule: Creating a payment record is separate from applying it to an invoice (split endpoint design)

- Rule statement: the accounting router has:
  - `accounting.payments.create`: inserts a `payments` row only.
  - `accounting.invoices.recordPayment`: applies an allocation to the invoice + posts GL entries, but does **not** insert a `payments` row.
- Where enforced: backend API structure (split responsibilities).
- Violation behavior: it’s possible to have:
  - A payment record that does not change invoice balances/GL, or
  - An invoice marked paid without a corresponding payment record in `payments`.
- Evidence:
  - Payment insert: `server/routers/accounting.ts` (`payments.create` calls `arApDb.createPayment`), `server/arApDb.ts` (`createPayment` inserts into `payments`).
  - Allocation + GL: `server/routers/accounting.ts` (`invoices.recordPayment` calls `arApDb.recordInvoicePayment` + `postPaymentGLEntries`).
  - Legacy combined behavior still exists: `server/routers/payments.ts` (`recordPayment` inserts payment + updates invoice + posts GL + syncs client balance).

### Rule: Payment numbers can be generated atomically (sequence + row lock)

- Where enforced: backend helper.
- Violation behavior: should prevent duplicate numbers under concurrency; throws on failure.
- Evidence: `server/arApDb.ts` (`generatePaymentNumber` uses transaction + `.for("update")` on `sequences`), exposed via `server/routers/accounting.ts` (`payments.generateNumber`).

### Rule: Invoice creation posts GL entries and syncs client balance

- Where enforced: backend.
- Violation behavior: if posting fails, invoice creation may fail depending on path.
- Evidence: `server/routers/accounting.ts` (`accounting.invoices.create` calls `postInvoiceGLEntries` and `syncClientBalance`).

### Rule: Invoice status transitions (VOID and PAID special rules)

- Where enforced: backend.
- Violation behavior: errors (BAD_REQUEST).
- Evidence: `server/routers/invoices.ts` (`updateStatus` validation), and accounting invoice update endpoints in `server/routers/accounting.ts`.

---

## Consignment Payables Rules (MEET-005/MEET-006)

### Rule: Payables apply only to consigned inventory

- Where enforced: backend.
- Violation behavior: payable updates are skipped.
- Evidence: `server/services/payablesService.ts` (`updatePayableOnSale` checks `ownershipType !== "CONSIGNED"`).

### Rule: Payable amount = units sold × cogs per unit

- Where enforced: backend.
- Violation behavior: payable updated on sale.
- Evidence: `server/services/payablesService.ts` (`updatePayableOnSale`).

### Rule: When consigned batch on-hand hits zero, payable becomes DUE

- Where enforced: backend.
- Violation behavior: status changes and notification scheduling.
- Evidence: `server/services/payablesService.ts` (`checkInventoryZeroThreshold` → `markPayableDue`).

### Rule: Consigned intake tries to create a payable (best-effort)

- Where enforced: backend.
- Violation behavior: payable creation failure is logged but treated as non-fatal during intake.
- Evidence: `server/inventoryIntakeService.ts` (consignment payable creation block).

---

## Samples Rules

### Rule: Sample request creation checks monthly allocation

- Where enforced: backend.
- Violation behavior: throws error.
- Evidence: `server/samplesDb.ts` (`createSampleRequest` calls `checkMonthlyAllocation`).

### Rule: Sample fulfillment decrements batch.sampleQty and logs inventory movement

- Where enforced: backend transaction with row lock.
- Violation behavior: throws error, rolls back.
- Evidence: `server/samplesDb.ts` (`fulfillSampleRequest` uses `FOR UPDATE`, updates `batches.sampleQty`, inserts `inventoryMovements`).

---

## Auth / Permissions Rules

### Rule: Public/demo user is provisioned when there is no valid session

- Where enforced: backend context.
- Violation behavior: not a violation; this is intended behavior.
- Evidence: `server/_core/context.ts` (`getOrCreatePublicUser`, `createContext`).

### Rule: Public/demo user is blocked from most mutations unless Super Admin

- Where enforced: backend middleware.
- Violation behavior: UNAUTHORIZED errors on mutation.
- Evidence: `server/_core/trpc.ts` (`requireUser` mutation rejection, `strictlyProtectedProcedure`).

---

## Rules Missing Enforcement (Implied But Not Validated Everywhere)

These are gaps where canonical policy is now clear, but enforcement/wiring is still incomplete.

1. **Canonical order path is not fully enforced in UI**
   - Policy: `/orders/create` (`createDraftEnhanced` + `finalizeDraft`) is canonical; `/orders` should not be primary confirmation flow.
   - Gap: `/orders` still wires `confirmDraftOrder`.
   - Evidence: `server/routers/orders.ts:703`, `server/routers/orders.ts:1074`, `server/routers/orders.ts:614`, `client/src/components/work-surface/OrdersWorkSurface.tsx:598`.

2. **Inventory movement policy is not unified at ship-time**
   - Policy: reserve at finalize; ship should decrement both `onHandQty` and `reservedQty` atomically.
   - Gap: current ship helper decrements `onHandQty` but does not apply canonical reserved release in the same helper.
   - Evidence: `server/ordersDb.ts:1691`, `server/ordersDb.ts:1958`, `server/ordersDb.ts:1163`.

3. **Payment source-of-truth mismatch remains active**
   - Policy: canonical backend should be `payments.recordPayment`.
   - Gap: invoice payment UI still calls `accounting.payments.create`, which does not complete full invoice+GL flow by itself.
   - Evidence: `server/routers/payments.ts:233`, `server/routers/accounting.ts:1175`, `client/src/components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx:767`.

4. **Post-logout production auth expectation not enforced**
   - Policy: production should not re-enter internal app via fallback user after logout.
   - Gap: context provisions fallback user when no auth token is present.
   - Evidence: `server/_core/context.ts:203`, `server/_core/context.ts:230`, `server/routers/auth.ts:22`, `client/src/_core/hooks/useAuth.ts:50`.

5. **`/settings/display` compatibility route missing**
   - Policy: add redirect to `/settings`.
   - Gap: route is not declared; falls through to NotFound.
   - Evidence: `client/src/App.tsx:305`, `client/src/App.tsx:488`.

6. **Feature-flag audit history reliability**
   - Policy: 500s are defects; expected behavior is data or empty state.
   - Gap: live `featureFlags.getAuditHistory` returns 500.
   - Evidence: `server/routers/featureFlags.ts:372`, `server/services/featureFlagService.ts:356`, `server/featureFlagsDb.ts:458`, `docs/qa-reviews/FEATURE_FLAG_E2E_QA_LIVE.md:85`.

7. **`/orders/create` helper dependencies lack resilient fallback**
   - Policy: canonical flow should not fail due to admin-only helper endpoints.
   - Gap: `credit.getVisibilitySettings` and referral helper calls can 500 during client selection.
   - Evidence: `server/routers/credit.ts:189`, `server/routers/referrals.ts:25`, `server/routers/referrals.ts:120`, `server/routers/referrals.ts:502`.

8. **Supplier migration still transitional across modules**
   - Policy: `supplierClientId` is canonical; `vendorId` is transitional only.
   - Gap: legacy `vendorId` paths remain across schema and services.
   - Evidence: `drizzle/schema.ts:232`, `drizzle/schema.ts:238`, `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md:620`.
