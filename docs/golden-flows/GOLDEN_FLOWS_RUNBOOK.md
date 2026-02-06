# Golden Flows Runbook (GF-001 to GF-008)

This runbook provides QA-ready execution steps for all Golden Flows in TERP.

## Environment

- Staging URL: `https://terp-app-b9s35.ondigitalocean.app`
- Required accounts:
  - Super Admin: `qa.superadmin@terp.test`
  - Sales Rep: `qa.salesrep@terp.test`
  - Inventory: `qa.inventory@terp.test`
  - Auditor: `qa.auditor@terp.test`

## GF-001 Direct Intake

- **Role:** Inventory
- **Steps:**
  1. Login as Inventory and navigate to `/intake`.
  2. Confirm intake row grid is visible.
  3. Add at least 2 rows and enter item name, lot, qty, cost.
  4. Submit intake.
  5. Verify success toast and inventory update.
- **Expected outcomes:** Totals update live; submission persists records.
- **Troubleshooting:**
  - If rows are not visible, clear local storage and reload.
  - Check browser console for render errors in `DirectIntakeWorkSurface`.

## GF-002 Procure to Pay (PO)

- **Role:** Inventory / Accounting
- **Steps:**
  1. Navigate to Purchase Orders.
  2. Create PO and select supplier + products.
  3. Submit and approve PO.
  4. Receive goods.
  5. Match AP entry and vendor balance.
- **Expected outcomes:** PO status transitions Draft -> Approved -> Received.
- **Troubleshooting:**
  - If product dropdown is empty, verify products query returns items in network panel.

## GF-003 Order to Cash (Sales Order)

- **Role:** Sales Rep
- **Steps:**
  1. Create order with multiple line items.
  2. Confirm order.
  3. Convert to invoice.
  4. Record partial then full payment.
  5. Fulfill shipment.
- **Expected outcomes:** Correct status transitions and ledger updates.
- **Troubleshooting:**
  - If invoice is missing, verify order is in a billable state.

## GF-004 Invoice and Payment

- **Role:** Accounting
- **Steps:**
  1. Open invoice details.
  2. Download invoice PDF.
  3. Record payment.
  4. Verify invoice balance reaches zero after full payment.
- **Expected outcomes:** PDF downloads quickly and payment posts GL entries.
- **Troubleshooting:**
  - If PDF stalls, inspect API latency and server logs for `pdf` timing entries.

## GF-005 Pick-Pack

- **Role:** Fulfillment / Warehouse
- **Steps:**
  1. Open pick queue.
  2. Start pick task.
  3. Confirm packed quantities.
  4. Complete shipment handoff.
- **Expected outcomes:** Pick status updates and inventory decrements.
- **Troubleshooting:**
  - Check lot availability if tasks cannot be completed.

## GF-006 Client Ledger / AR-AP

- **Role:** Accounting
- **Steps:**
  1. Open AR/AP dashboard.
  2. Verify top debtors and top vendors owed widgets.
  3. Open detail pages for clients/vendors.
- **Expected outcomes:** Ranked entities with non-zero balances and proper names.
- **Troubleshooting:**
  - If widgets are empty, validate joins and balance filters in accounting endpoints.

## GF-007 Inventory Management

- **Role:** Inventory
- **Steps:**
  1. Open inventory list.
  2. Apply filters for status, lot, and location.
  3. Verify totals and value calculations.
- **Expected outcomes:** Filtered counts and valuation reflect current records.
- **Troubleshooting:**
  - Clear stale local filter state if list appears empty unexpectedly.

## GF-008 Sample Request

- **Role:** Sales Rep
- **Steps:**
  1. Open sample request form.
  2. Select client and product via search selector.
  3. Submit request.
  4. Validate resulting request references selected product.
- **Expected outcomes:** Request stores `productId` and displays product name.
- **Troubleshooting:**
  - If selector is empty, verify `products.list` response and auth scope.

## Screenshot Index

- Login page: `docs/golden-flows/screenshots/staging-login.png`
- Intake page: `docs/golden-flows/screenshots/staging-intake.png`
