# Constraint-Stack QA Tests (Wholesale Ops Chaos)

Source references: `docs/reference/USER_FLOW_MATRIX.csv`, `docs/reference/FLOW_GUIDE.md`.

## 25 High-Value Constraint Collision Tests

### 1) Discount Override + Partial Fulfillment + Post-Confirm Edit

- **Constraints**: percent discount + manual price override; partial fulfillment/backorder; edit after confirmation
- **Best mode**: BROWSER
- **Steps**:
  1. Create a sales order for a client with two line items and apply a 10% discount.
  2. Manually override the unit price on one item.
  3. Confirm the order.
  4. Fulfill only one line item (leave the other in backorder).
  5. Attempt to edit the order quantity on the unfulfilled line.
- **Expected result**: Edit is either blocked with a clear warning or allowed with audit log + recalculated totals; backorder remains consistent with fulfillment status.
- **What to log on failure**: order ID, discount/override values, fulfillment status, audit log entry, error response.
- **Severity**: High

### 2) Duplicate TERI Code + Client Merge + Active Orders

- **Constraints**: duplicate client TERI code; two similar records causing confusion; edits after confirmation
- **Best mode**: BROWSER
- **Steps**:
  1. Attempt to create a client with a TERI code that already exists.
  2. Create a second client with similar name/address (but different TERI code).
  3. Create a confirmed order for each client.
  4. Attempt to update the TERI code on the second client to match the first.
  5. Attempt to merge or archive one client.
- **Expected result**: Duplicate TERI code is rejected; system prevents data corruption and keeps orders linked to the correct client; clear UI guidance to resolve duplicates.
- **What to log on failure**: client IDs, TERI codes, order IDs, conflict error message, UI toast content.
- **Severity**: Critical

### 3) Mid-Save Navigation + Missing Required Fields + Retry

- **Constraints**: missing required fields; refresh/navigation mid-save; retries
- **Best mode**: BROWSER
- **Steps**:
  1. Start creating a new order with required client + line items partially filled.
  2. Click save/confirm, then navigate away before the request completes.
  3. Return to the order creation page.
  4. Retry save with missing required fields.
  5. Complete fields and save again.
- **Expected result**: No partial/duplicate draft created; validation errors appear; final save succeeds with a single order record.
- **What to log on failure**: network requests (create/update), draft IDs created, validation error payload, duplicate order count.
- **Severity**: High

### 4) Permission Boundary Shift + Confirmed Order Edit

- **Constraints**: permission boundary mid-flow; edits after confirmation; role change
- **Best mode**: BROWSER
- **Steps**:
  1. Log in as Sales Manager and open a confirmed order.
  2. Begin editing a line item quantity.
  3. Switch role (or remove permission) to Sales Rep.
  4. Attempt to save edits.
- **Expected result**: Save is blocked with RBAC error; UI reverts edits or locks fields; audit log notes permission denial.
- **What to log on failure**: user role before/after, permission check response, order ID, UI state.
- **Severity**: High

### 5) Quote-to-Sale Conversion + Price Override + Discount Cap

- **Constraints**: discount cap + price override; convert quote to sale; approval boundary
- **Best mode**: BROWSER
- **Steps**:
  1. Create a quote with a discount at the maximum allowed threshold.
  2. Override a line item price below the floor.
  3. Convert quote to sale.
  4. Attempt to finalize without approval.
- **Expected result**: Conversion flags pricing exceptions; finalize requires approval or is blocked; totals stay consistent.
- **What to log on failure**: quote ID, override values, discount thresholds, approval gate response.
- **Severity**: High

### 6) Backorder + Inventory Adjustment + Fulfillment Retry

- **Constraints**: partial fulfillment/backorders; inventory adjustment; retry after failure
- **Best mode**: BROWSER
- **Steps**:
  1. Create an order that exceeds available inventory for one item.
  2. Confirm the order and fulfill available quantity, leaving a backorder.
  3. Adjust inventory upward for the backordered batch.
  4. Retry fulfillment for remaining quantity.
- **Expected result**: Backorder resolves; inventory movements reflect correct deltas; no double-decrement.
- **What to log on failure**: batch ID, inventory before/after, movement IDs, fulfillment attempt results.
- **Severity**: High

### 7) Duplicate Batch Names + Similar SKU + Pick/Pack Confusion

- **Constraints**: two similar records causing confusion; duplicate identifiers; pick/pack partial fulfillment
- **Best mode**: BROWSER
- **Steps**:
  1. Create two batches with similar names/SKUs.
  2. Create an order containing both batches.
  3. In Pick & Pack, attempt to fulfill only one of the items.
  4. Scan or select the wrong batch intentionally.
- **Expected result**: System detects mismatch or shows clear identifiers to prevent wrong fulfillment; fulfillment status accurate.
- **What to log on failure**: batch IDs, SKU/name, pick/pack selection logs, fulfillment status.
- **Severity**: High

### 8) Invoice Generation + Partial Payment + Status Transition

- **Constraints**: partial fulfillment; partial payment; status transitions
- **Best mode**: BROWSER
- **Steps**:
  1. Generate invoice from a partially fulfilled order.
  2. Record a partial payment.
  3. Attempt to mark invoice as paid.
- **Expected result**: Invoice remains PARTIAL; payment applied to balance; status transitions follow lifecycle.
- **What to log on failure**: invoice ID, payment record, status history, balance calculations.
- **Severity**: Medium

### 9) Credit Hold + Manual Override + Order Confirmation

- **Constraints**: permission boundary; price override; order confirmation
- **Best mode**: BROWSER
- **Steps**:
  1. Place a client on credit hold.
  2. Create an order with manual price overrides.
  3. Attempt to confirm the order as Sales Rep.
- **Expected result**: Confirmation blocked with credit hold reason; override does not bypass hold; manager approval required.
- **What to log on failure**: client ID, credit status, user role, confirmation response.
- **Severity**: High

### 10) Order Creator Retry + Form Dirty State + Duplicate Submission

- **Constraints**: missing required fields + retries; refresh/navigation mid-save; duplicate record risk
- **Best mode**: BROWSER
- **Steps**:
  1. Start an order, leave required field blank, click finalize.
  2. Fix errors and click finalize twice quickly.
  3. Refresh the page mid-save.
- **Expected result**: Only one order created; duplicate prevention works; dirty state protection warns on refresh.
- **What to log on failure**: request IDs, order IDs created, UI dirty state prompt logs.
- **Severity**: High

### 11) Concurrent Edits + Optimistic Locking + Auto-Refresh

- **Constraints**: edits after confirmation; refresh mid-save; two similar records causing confusion
- **Best mode**: BROWSER
- **Steps**:
  1. Open the same confirmed order in two tabs.
  2. Edit line item quantity in tab A.
  3. In tab B, update discount and save.
  4. Return to tab A and save.
- **Expected result**: Optimistic locking detects conflict; user prompted to refresh/reconcile changes.
- **What to log on failure**: order ID, version fields, conflict response, final saved state.
- **Severity**: High

### 12) Live Shopping Price Negotiation + Order Finalize + Discount Stack

- **Constraints**: discount + price override; edits after confirmation; mid-flow permission boundary
- **Best mode**: BROWSER
- **Steps**:
  1. Start a live shopping session and negotiate prices.
  2. Apply an additional global discount.
  3. Confirm the order.
  4. Switch to a role without pricing override permission.
  5. Attempt to re-open and edit pricing.
- **Expected result**: Final pricing locked; unauthorized edits blocked; audit log captures negotiation history.
- **What to log on failure**: session ID, order ID, pricing overrides, permission error.
- **Severity**: High

### 13) Purchase Order Receive + Partial Receipt + Duplicate Lot Identifier

- **Constraints**: partial fulfillment; duplicate identifiers; edit after confirmation
- **Best mode**: BROWSER
- **Steps**:
  1. Create a purchase order with two items.
  2. Receive only one item and generate a batch with a lot identifier.
  3. Attempt to receive the second item using the same lot identifier.
- **Expected result**: Duplicate lot identifier rejected; receiving remains partial with clear error messaging.
- **What to log on failure**: PO ID, receipt IDs, lot identifier, batch IDs.
- **Severity**: High

### 14) Inventory Adjustment + Backdated Movement + Reconciliation

- **Constraints**: inventory adjustment; edits after confirmation; refresh mid-save
- **Best mode**: CODE
- **Steps**:
  1. Create a batch and record an inventory movement.
  2. Attempt a backdated adjustment while an order is pending.
  3. Refresh the page during save.
- **Expected result**: Adjustment is either blocked or reconciled; movement history stays chronological; no double entries.
- **What to log on failure**: batch ID, movement timestamps, adjustment payload, error logs.
- **Severity**: Medium

### 15) Client Archive + Active Quote + Reassign Ownership

- **Constraints**: permission boundary; edit after confirmation; duplicate identifiers
- **Best mode**: BROWSER
- **Steps**:
  1. Create a quote for a client.
  2. Attempt to archive the client while quote is pending.
  3. Attempt to create a new client with the same TERI code.
- **Expected result**: Archive blocked or requires reassignment; duplicate TERI code still blocked.
- **What to log on failure**: client ID, quote ID, archive response, TERI validation response.
- **Severity**: High

### 16) Invoice Void + Partial Payment + Ledger Adjustment

- **Constraints**: state transition + partial payment; accounting adjustment; edits after confirmation
- **Best mode**: BROWSER
- **Steps**:
  1. Generate an invoice and record a partial payment.
  2. Attempt to void the invoice.
  3. Add a ledger adjustment for the same client.
- **Expected result**: Void is blocked or requires reversal handling; ledger reflects correct offsets; no negative balances.
- **What to log on failure**: invoice ID, payment ID, ledger entries, balance calculations.
- **Severity**: High

### 17) Order Split + Backorder + Shipment Update

- **Constraints**: partial fulfillment/backorder; edit after confirmation; status transitions
- **Best mode**: BROWSER
- **Steps**:
  1. Create a sales order with two items and confirm.
  2. Fulfill one item and ship it.
  3. Attempt to split remaining items into a new order.
- **Expected result**: Order split preserves fulfillment history; backorder remains tied to original or new order with clear linkage.
- **What to log on failure**: original order ID, split order ID, fulfillment status history.
- **Severity**: Medium

### 18) Pricing Profile Change + Draft Order + Refresh

- **Constraints**: pricing change; draft order edits; refresh mid-save
- **Best mode**: BROWSER
- **Steps**:
  1. Start a draft order for a client with a pricing profile.
  2. Change the client pricing profile in another tab.
  3. Refresh the draft order page.
  4. Continue editing line items.
- **Expected result**: Draft reflects updated pricing rules or warns about stale pricing; no silent mismatch.
- **What to log on failure**: client ID, pricing profile IDs, draft ID, recalculation status.
- **Severity**: Medium

### 19) Inventory Transfer + Partial Receive + Duplicate Transfer ID

- **Constraints**: partial fulfillment; duplicate identifiers; retries
- **Best mode**: BROWSER
- **Steps**:
  1. Create a warehouse transfer for multiple batches.
  2. Receive only some items at destination.
  3. Retry receive with the same transfer ID after a timeout.
- **Expected result**: Transfer receive is idempotent; partial receive preserved; duplicates blocked.
- **What to log on failure**: transfer ID, receive payload, inventory deltas.
- **Severity**: High

### 20) Return Processing + Refund + Inventory Adjustment

- **Constraints**: returns; inventory adjustment; price override
- **Best mode**: BROWSER
- **Steps**:
  1. Process a return for a delivered order.
  2. Apply a refund with a manual price override.
  3. Verify inventory movement is recorded.
- **Expected result**: Refund and inventory return are linked; totals reconcile; adjustment reason logged.
- **What to log on failure**: order ID, return ID, refund amount, movement ID.
- **Severity**: High

### 21) Duplicate Sales Sheet Tokens + Customer Confusion

- **Constraints**: duplicate identifiers; two similar records causing confusion; refresh mid-save
- **Best mode**: BROWSER
- **Steps**:
  1. Generate two sales sheets with similar titles.
  2. Share both links with a client and have them open simultaneously.
  3. Attempt to place orders on both and refresh mid-save.
- **Expected result**: Each sales sheet results in separate orders; no cross-contamination of cart data.
- **What to log on failure**: sales sheet IDs, token values, order IDs, cross-linked line items.
- **Severity**: Medium

### 22) Payment Recording + Invoice Status + Permission Downgrade

- **Constraints**: permission boundary mid-flow; status transition; retry
- **Best mode**: BROWSER
- **Steps**:
  1. Open an invoice as Accounting Manager.
  2. Start recording a payment.
  3. Downgrade role to Sales Rep.
  4. Attempt to finalize the payment.
- **Expected result**: Payment is blocked; invoice status unchanged; UI shows permission error.
- **What to log on failure**: invoice ID, payment payload, role before/after, error response.
- **Severity**: High

### 23) Bulk Tagging + Undo + Duplicate Tag Names

- **Constraints**: duplicate identifiers; refresh mid-save; retries
- **Best mode**: BROWSER
- **Steps**:
  1. Create two tags with similar names/casing.
  2. Bulk add tags to multiple products.
  3. Refresh mid-save and retry.
- **Expected result**: Only intended tags apply; duplicate tag names are clearly disambiguated; no partial tag state.
- **What to log on failure**: tag IDs, product IDs, tag assignment payload, retry response.
- **Severity**: Medium

### 24) Cash Payment + Overpayment + Invoice Status Drift

- **Constraints**: partial payment; state transition; edit after confirmation
- **Best mode**: BROWSER
- **Steps**:
  1. Record a cash payment that exceeds invoice balance.
  2. Attempt to mark invoice as paid.
  3. Edit invoice line items after payment.
- **Expected result**: Overpayment handled with credit or warning; invoice status correct; edits restricted or trigger reconciliation.
- **What to log on failure**: invoice ID, payment amount, balance before/after, status history.
- **Severity**: High

### 25) Order Finalize + Network Failure + Offline Retry

- **Constraints**: refresh/navigation mid-save; retries; missing required fields on retry
- **Best mode**: BROWSER
- **Steps**:
  1. Fill in an order and click finalize.
  2. Simulate network failure or disconnect.
  3. Retry finalize after reconnecting with one field cleared.
- **Expected result**: No duplicate order; validation blocks missing field; retry submits once network is restored.
- **What to log on failure**: network error details, order IDs created, validation errors.
- **Severity**: High

---

## Top 10 Tests as Runnable Prompts

1. **Prompt: Discount Override + Partial Fulfillment + Post-Confirm Edit**

- Act as a Sales Manager. Create an order with two line items, apply a 10% discount, and override one unit price. Confirm the order, fulfill only one line, then attempt to edit the remaining line’s quantity. Capture whether the system blocks the edit or allows it with audit logging and correct totals.

2. **Prompt: Duplicate TERI Code + Client Merge + Active Orders**

- Act as a Sales Manager. Attempt to create a client with an existing TERI code, then create a similar client with a different code. Create a confirmed order for each client, then attempt to change the second client’s TERI code to match the first. Record whether the system blocks duplicates and keeps orders linked correctly.

3. **Prompt: Mid-Save Navigation + Missing Fields + Retry**

- Act as a Sales Rep. Start an order, click save/confirm, and navigate away before it finishes. Return, retry save with missing required fields, then complete the fields and save. Verify no duplicate drafts or orders are created.

4. **Prompt: Permission Downgrade During Order Edit**

- Act as a Sales Manager. Open a confirmed order, begin editing a line item, then switch to a Sales Rep role and attempt to save. Verify the save is blocked and the UI shows a permission error without corrupting data.

5. **Prompt: Quote Conversion With Pricing Exceptions**

- Act as a Sales Manager. Create a quote with max discount and a manual price override below floor, then convert to sale and try to finalize. Verify the system blocks or flags the pricing exception and requires approval.

6. **Prompt: Backorder + Inventory Adjustment + Fulfillment Retry**

- Act as an Inventory Manager. Confirm an order that exceeds available inventory. Fulfill the available quantity, adjust inventory upward, then retry fulfillment. Confirm inventory movements are correct and no double-decrement occurs.

7. **Prompt: Duplicate Lot Identifier on PO Receiving**

- Act as a Purchasing Manager. Receive a PO line item and assign a lot identifier, then attempt to receive another item using the same lot identifier. Confirm the system rejects the duplicate and keeps receiving status accurate.

8. **Prompt: Invoice Void With Partial Payment**

- Act as an Accounting Manager. Generate an invoice, record a partial payment, then attempt to void the invoice and add a ledger adjustment. Verify the system blocks or reverses correctly and balances remain accurate.

9. **Prompt: Draft Order Pricing Profile Drift**

- Act as a Sales Rep. Start a draft order, change the client’s pricing profile in another tab, refresh the draft, and continue editing. Verify the draft recalculates or warns about stale pricing.

10. **Prompt: Transfer Receive Retry Idempotency**

- Act as a Warehouse user. Create a transfer, receive a partial shipment, then retry the same receive after a timeout. Verify the transfer receive is idempotent and no duplicate inventory is added.
