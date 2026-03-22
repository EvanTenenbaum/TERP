# Pilot Surface QA Review — 2026-03-21

Adversarial review of 5 pilot surfaces with smoke-only test coverage.

## Verdicts

| Surface                  | Verdict              | P0  | P1  | P2  | P3  |
| ------------------------ | -------------------- | --- | --- | --- | --- |
| FulfillmentPilotSurface  | **SHIP**             | -   | -   | -   | 2   |
| ClientLedgerPilotSurface | **SHIP**             | -   | -   | 2   | 1   |
| ReturnsPilotSurface      | **CONDITIONAL SHIP** | -   | -   | 1   | 2   |
| InvoicesPilotSurface     | **NO-SHIP**          | -   | 1   | 2   | -   |
| PaymentsPilotSurface     | **NO-SHIP**          | -   | 1   | 1   | -   |

## P1 Blockers (must fix before ship)

### INV-P1: "Mark as Paid (Full)" bypasses GL flow

**Surface:** InvoicesPilotSurface
**Location:** `handleMarkPaid` calls `trpc.invoices.updateStatus` with `{ id, status: "PAID" }`
**Impact:** Flips invoice status to PAID without creating a payment record, GL debit/credit, or updating `amountPaid`/`amountDue`. ClientLedger will show outstanding balance with no PAYMENT_RECEIVED transaction.
**Fix:** Either remove the Mark Paid quick action (route through InvoiceToPaymentFlow) or add a `markFullyPaid` server mutation that atomically creates payment + GL entries.

### PAY-P1: Cache namespace split causes stale grids

**Surface:** PaymentsPilotSurface + InvoicesPilotSurface (cross-surface)
**Issue:** PaymentsPilotSurface queries `trpc.accounting.payments.list` but voids via `trpc.payments.void`. InvoicesPilotSurface invalidates `utils.payments.list` (top-level) after recording. These are different tRPC cache keys.
**Impact:** Recording a payment from Invoices then navigating to Payments shows stale data until manual refresh.
**Fix:** Align both surfaces to same query key, or add cross-namespace invalidation.

## P2 Findings

1. **PaymentsPilotSurface:** No permission gate on Void button — server enforces `accounting:delete` but UI shows button to all users
2. **PaymentsPilotSurface:** "Record Payment" button disabled without invoice context — no path for standalone payment recording
3. **InvoicesPilotSurface:** Create Invoice dialog submits `totalAmount: "0.00"` and `lineItems: []` — zero-balance invoice skeleton
4. **InvoicesPilotSurface:** `deepLink.openRecordPayment` documented but never wired — dead code path
5. **ReturnsPilotSurface:** No client-side permission gate on Approve/Reject/Receive mutation cards
6. **ClientLedgerPilotSurface:** Transaction type filter is single-select display but multi-select state — misleading trigger
7. **ClientLedgerPilotSurface:** Export after filter change may serve stale cached data

## P3 Findings

1. **FulfillmentPilotSurface:** R keyboard shortcut fires unconditionally, skipping packed-item count check
2. **FulfillmentPilotSurface:** Duplicate status-derivation logic between `mapToQueueRow` and `OrderInspector`
3. **ReturnsPilotSurface:** `extractWorkflowStatus` duplicates server `extractReturnStatus` — divergence risk
4. **ReturnsPilotSurface:** ReceiveCard initializes from props at mount, never re-initializes on async prop change
5. **ClientLedgerPilotSurface:** INVOICE reference type has no navigation handler — silent no-op

## Reviewer

- Agent: `feature-dev:code-reviewer`
- Date: 2026-03-21
- Method: Full source read of all 5 surfaces + server routers
