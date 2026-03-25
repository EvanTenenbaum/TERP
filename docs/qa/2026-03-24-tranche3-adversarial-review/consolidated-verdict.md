# Pilot Surface QA Review — 2026-03-24 (Tranche 3)

Adversarial review of all 12 current pilot surfaces, combining new reviews, re-reviews, and carried-forward prior SHIP verdicts.

## Verdicts

| Surface                    | Verdict              | P0  | P1  | P2  | P3  | Notes                                   |
| -------------------------- | -------------------- | --- | --- | --- | --- | --------------------------------------- |
| OrdersSheetPilotSurface    | **CONDITIONAL SHIP** | -   | 1   | 1   | 1   | P1 fixed this session                   |
| InventorySheetPilotSurface | **CONDITIONAL SHIP** | -   | 1   | 1   | 1   | P1 fixed this session                   |
| SalesSheetsPilotSurface    | **CONDITIONAL SHIP** | -   | 1   | -   | 1   | P1 fixed this session                   |
| IntakePilotSurface         | **SHIP**             | -   | -   | -   | -   | Clean — proper auth, permissions, gates |
| PurchaseOrdersPilotSurface | **SHIP**             | -   | -   | 1   | 1   | Minor status workflow gap               |
| QuotesPilotSurface         | **CONDITIONAL SHIP** | -   | 1   | -   | 1   | P1 fixed this session                   |
| SamplesPilotSurface        | **CONDITIONAL SHIP** | -   | 1   | -   | 1   | P1 fixed this session                   |
| PaymentsPilotSurface       | **CONDITIONAL SHIP** | -   | -   | 2   | 1   | PAY-P1 mitigated (refetch works)        |
| InvoicesPilotSurface       | **CONDITIONAL SHIP** | -   | 1   | 2   | -   | INV-P1 deferred (known, documented)     |
| ReturnsPilotSurface        | **SHIP**             | -   | -   | -   | 2   | All prior findings fixed                |
| FulfillmentPilotSurface    | **SHIP**             | -   | -   | -   | 2   | Carried from 2026-03-21 review          |
| ClientLedgerPilotSurface   | **SHIP**             | -   | -   | 2   | 1   | Carried from 2026-03-21 review          |

**Overall: 0 NO-SHIP. All 12 current surfaces are SHIP or CONDITIONAL SHIP, but known deferred P1 and active P2/P3 findings remain.**

---

## P1 Findings — Fixed This Session

### ORD-P1: InspectorPanel footer prop rendered as text (FIXED)

**Surface:** OrdersSheetPilotSurface
**Location:** `OrdersSheetPilotSurface.tsx:767`
**Issue:** `footer=` was inside JSX children, not a prop. The literal text "footer=" was rendered in the UI body instead of the "Open Classic Sales Context" button appearing in the sticky footer.
**Fix:** Corrected JSX syntax to pass `footer` as a proper prop with `footer={...}`.

### INV-P1-BULK: Inventory bulk delete missing deletedAt (FIXED)

**Surface:** InventorySheetPilotSurface
**Location:** `server/inventoryDb.ts:2019-2026`, `server/routers/inventory.ts:1794`
**Issue:** `bulkDeleteBatches` only set `batchStatus: "CLOSED"` without setting `deletedAt`. Inventory queries filter on `isNull(batches.deletedAt)`, so "deleted" batches still appeared in some views. Also used forbidden `ctx.user?.id` pattern instead of `getAuthenticatedUserId(ctx)`.
**Fix:** Added `deletedAt: new Date()` to soft delete, `deletedAt: null` to restore, and switched to `getAuthenticatedUserId(ctx)`.

### QUO-P1: Soft-deleted quotes can be sent/accepted/rejected (FIXED)

**Surface:** QuotesPilotSurface
**Location:** `server/routers/quotes.ts` — `send`, `accept`, `reject` mutations
**Issue:** Quote lookup queries used `eq(orders.orderType, "QUOTE")` but did not filter `isNull(orders.deletedAt)`. A soft-deleted quote could still be sent, accepted, or rejected.
**Fix:** Added `isNull(orders.deletedAt)` to all three mutation queries.

### SAM-P1: Return button enabled for wrong statuses (FIXED)

**Surface:** SamplesPilotSurface
**Location:** `SamplesPilotSurface.tsx:804-807,815-818`
**Issue:** "Request Return" was enabled for PENDING+FULFILLED, but server requires FULFILLED only. "Vendor Return" was enabled for PENDING+FULFILLED, but server requires RETURNED+FULFILLED.
**Fix:** Corrected client-side gates to match server-side state machine.

### SAL-P1: Delete draft race condition (FIXED)

**Surface:** SalesSheetsPilotSurface
**Location:** `SalesSheetsPilotSurface.tsx:480-490`
**Issue:** `handleDeleteCurrentDraft` originally cleared all local state synchronously before the delete mutation completed, and the follow-on review found the auto-save timer could still fire against a just-deleted draft.
**Fix:** State clearing now happens in the delete mutation's `onSuccess`, pending auto-save timers are cancelled during delete, and stale save callbacks for the deleted draft are ignored.

---

## P1 Findings — Deferred (Known, Documented)

### INV-P1: "Mark as Paid" bypasses GL flow

**Surface:** InvoicesPilotSurface
**Location:** `InvoicesPilotSurface.tsx:970-972`
**Issue:** Calls `invoices.updateStatus` with `{id, status: "PAID"}` which just flips the status without creating a payment record or GL entries.
**Status:** Known since 2026-03-21. Documented as deferred — fix requires either removing the action or adding a `markFullyPaid` server mutation.

---

## P2 Findings (Remaining)

1. **OrdersSheetPilotSurface:** `lineItemCount` always shows 0 — `orders.getAll` doesn't join line items
2. **InventorySheetPilotSurface:** `updateStatus` doesn't pass `version` for optimistic locking — race condition window
3. **PaymentsPilotSurface:** Void button has no client-side permission gate (server enforces `accounting:delete` but UI shows to all users)
4. **PaymentsPilotSurface:** "Record Payment" requires invoice context — no standalone payment recording path
5. **InvoicesPilotSurface:** Create Invoice dialog submits zero-balance skeleton
6. **InvoicesPilotSurface:** `deepLink.openRecordPayment` is dead code
7. **PurchaseOrdersPilotSurface:** Status update bypasses workflow validation
8. **ClientLedgerPilotSurface:** Transaction type filter is single-select display but multi-select state
9. **ClientLedgerPilotSurface:** Export after filter change may serve stale cached data

## P3 Findings (Remaining)

1. **OrdersSheetPilotSurface:** No sorting on monetary columns
2. **InventorySheetPilotSurface:** Dashboard cache not invalidated after status update
3. **SalesSheetsPilotSurface:** Auto-save debounce could be tuned
4. **QuotesPilotSurface:** No actor attribution on `convertToOrder` mutation
5. **SamplesPilotSurface:** `setExpirationDate` not yet available in pilot
6. **PaymentsPilotSurface:** Cross-namespace invalidation relies on refetch rather than proper cache keys
7. **FulfillmentPilotSurface:** R keyboard shortcut fires unconditionally
8. **FulfillmentPilotSurface:** Duplicate status-derivation logic
9. **ReturnsPilotSurface:** `extractWorkflowStatus` duplicates server logic
10. **ReturnsPilotSurface:** ReceiveCard doesn't re-initialize on async prop change
11. **ClientLedgerPilotSurface:** INVOICE reference type has no navigation handler
12. **PurchaseOrdersPilotSurface:** No export from pilot surface

## Reviewer

- Agent: `terp-qa-reviewer` (10 parallel agents)
- Date: 2026-03-24
- Method: Full source read of all 13 surfaces + server routers
- Prior review: `docs/qa/2026-03-21-pilot-surface-review/consolidated-verdict.md`
