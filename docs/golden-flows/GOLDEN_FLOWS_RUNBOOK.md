# Golden Flows Runbook (GF-001 to GF-008)

> **Version:** 2.0
> **Updated:** 2026-02-06
> **Purpose:** QA-ready execution steps for all TERP Golden Flows
> **Audience:** QA testers, beta testers, developers

---

## Environment

| Setting | Value |
|---------|-------|
| **Staging URL** | `https://terp-app-b9s35.ondigitalocean.app` |
| **Auth Mode** | DEMO_MODE (auto-login as Super Admin) or manual login |
| **Browser** | Chrome 120+ recommended |

## Test Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Super Admin | `qa.superadmin@terp.test` | `TerpQA2026!` | Full system access |
| Sales Manager | `qa.salesmanager@terp.test` | `TerpQA2026!` | Clients, orders, quotes |
| Sales Rep / CS | `qa.salesrep@terp.test` | `TerpQA2026!` | Clients, orders, returns |
| Inventory Manager | `qa.inventory@terp.test` | `TerpQA2026!` | Inventory, locations, transfers |
| Warehouse Staff | `qa.fulfillment@terp.test` | `TerpQA2026!` | Receive POs, adjustments |
| Accountant | `qa.accounting@terp.test` | `TerpQA2026!` | Accounting, credits, COGS |
| Read-Only Auditor | `qa.auditor@terp.test` | `TerpQA2026!` | Read-only, audit logs |

## Pre-Test Setup

1. Open staging URL in a clean browser session (incognito recommended).
2. Log in with the role specified for each flow.
3. Clear localStorage if encountering stale filter state: DevTools > Application > Local Storage > Clear.
4. Keep browser DevTools Console tab open to monitor for errors.

---

## GF-001: Direct Intake

**Purpose:** Record new inventory arrivals from suppliers without a Purchase Order.
**Required Role:** Inventory Manager (`qa.inventory@terp.test`)
**Entry Point:** `/intake`
**Spec:** `docs/golden-flows/specs/GF-001-DIRECT-INTAKE.md`

### Step-by-Step Instructions

1. **Login** as `qa.inventory@terp.test`.
2. **Navigate** to the Intake page (`/intake` via sidebar).
3. **Verify** the intake work surface loads with an AG Grid table and inspector panel.
4. **Click "Add Row"** to add an intake line.
5. **Fill in row data:**
   - Vendor/Supplier name (searchable dropdown)
   - Brand name
   - Category (Flower, Deps, Concentrate, Edible, PreRoll, Vape, Other)
   - Item name
   - Quantity (numeric, e.g., `10.5`)
   - COGS per unit (numeric, e.g., `125.00`)
   - Payment terms (COD, NET_7, NET_15, NET_30, CONSIGNMENT, PARTIAL)
   - Site/Location
   - Notes (optional)
6. **Add a second row** and repeat step 5 with different data.
7. **Verify** the summary bar updates: Items count, total Qty, total Value.
8. **Click "Submit All"** to submit the intake batch.
9. **Verify** success toast appears and batches are created with `AWAITING_INTAKE` status.

### Expected Outcomes

- Summary bar shows live-updating counts and totals as rows are edited.
- Form validation highlights errors (empty required fields, invalid numbers).
- Submitted batches appear in Inventory with `AWAITING_INTAKE` status.
- GL entries created: Debit Inventory (1300), Credit AP.

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No form fields visible | BUG-112 rendering issue | See TER-33 fix; clear localStorage and reload |
| Vendor dropdown empty | Auth scope or data issue | Check network tab for supplier query response |
| Submit fails | Validation errors | Check inspector panel for error messages |
| Stale data after submit | Cache not invalidated | Refresh page; check React Query invalidation |

---

## GF-002: Procure to Pay (Purchase Order)

**Purpose:** Create purchase orders, receive goods, and match AP entries.
**Required Role:** Inventory Manager (`qa.inventory@terp.test`)
**Entry Point:** `/purchase-orders`
**Spec:** `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md`

### Step-by-Step Instructions

1. **Login** as `qa.inventory@terp.test`.
2. **Navigate** to Purchase Orders page.
3. **Click "Create PO"** to open the PO creation form.
4. **Select supplier** from the supplier dropdown.
5. **Add line items:**
   - Select product from the product dropdown (should list all active products).
   - Enter quantity and unit cost.
6. **Review totals** and submit the PO.
7. **Approve the PO** (change status from Draft to Approved).
8. **Receive goods:**
   - Open the approved PO.
   - Click "Receive" to record receipt of goods.
   - Enter received quantities.
9. **Verify AP entry** is created for the supplier with correct amount.
10. **Check vendor balance** in client profile or AR/AP dashboard.

### Expected Outcomes

- PO transitions: Draft -> Approved -> Received.
- Product dropdown shows all active products (150+ items).
- AP balance increases for the supplier after receiving.
- Inventory batches created from PO line items.

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Product dropdown empty | Data binding issue (TER-34) | Check products query in network tab |
| Supplier dropdown empty | Missing isSeller=true clients | Verify client data includes suppliers |
| PO submit fails | Missing required fields | Check form validation messages |

---

## GF-003: Order to Cash (Sales Order)

**Purpose:** Complete sales cycle from order creation through fulfillment and payment.
**Required Role:** Sales Rep (`qa.salesrep@terp.test`)
**Entry Point:** `/orders`
**Spec:** `docs/golden-flows/specs/GF-003-ORDER-TO-CASH.md`

### Step-by-Step Instructions

1. **Login** as `qa.salesrep@terp.test`.
2. **Navigate** to Orders page (`/orders`).
3. **Click "New Order"** to create a sales order.
4. **Select customer** from client dropdown (clients with `isBuyer=true`).
5. **Add line items:**
   - Search and select products.
   - Enter quantities and prices.
   - Add at least 2 different line items.
6. **Review order summary** (subtotal, line count).
7. **Submit order** (creates in Draft status).
8. **Confirm order** (transition Draft -> Confirmed).
9. **Generate invoice:**
   - From the order detail, click "Generate Invoice."
   - Verify invoice is created with correct line items and amounts.
10. **Record partial payment:**
    - Open the generated invoice.
    - Click "Record Payment."
    - Enter a partial payment amount.
    - Verify invoice status changes to PARTIAL.
11. **Record remaining payment:**
    - Record another payment for the balance.
    - Verify invoice status changes to PAID.
12. **Fulfill order:**
    - Mark order as shipped/fulfilled.
    - Verify inventory decrements.

### Expected Outcomes

- Order lifecycle: Draft -> Confirmed -> Invoiced -> Paid -> Fulfilled.
- Invoice amounts match order totals.
- GL entries created at each stage:
  - Invoice: Debit AR (1200), Credit Revenue (4000).
  - Payment: Debit Cash (1000), Credit AR (1200).
  - Fulfillment: Debit COGS (5000), Credit Inventory (1300).
- Client `totalOwed` updates after payments.

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No products in order form | Product list empty | Verify products exist and are active |
| Invoice generation fails | Order not in billable state | Ensure order is Confirmed first |
| Payment dialog errors | Amount validation | Ensure amount <= remaining balance |
| GL entries missing | Accounting hooks silent failure | Check server logs for GLPostingError |

---

## GF-004: Invoice and Payment

**Purpose:** View invoices, download PDFs, and record payments with GL posting.
**Required Role:** Accountant (`qa.accounting@terp.test`)
**Entry Point:** `/accounting/invoices`
**Spec:** `docs/golden-flows/specs/GF-004-INVOICE-PAYMENT.md`

### Step-by-Step Instructions

1. **Login** as `qa.accounting@terp.test`.
2. **Navigate** to Invoices page (`/accounting/invoices`).
3. **Filter by status** (DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID).
4. **Select an invoice** to view details in the inspector panel.
5. **Review invoice details:**
   - Line items, amounts, payment history.
   - Customer name and billing info.
6. **Download PDF:**
   - Click the PDF download button.
   - Verify PDF generates within 10 seconds (not 197+ seconds).
   - Verify PDF content matches invoice details.
7. **Record payment:**
   - Click "Record Payment."
   - Enter amount, payment method, reference number, date.
   - Submit payment.
8. **Verify GL entries:**
   - Check that payment posts: Debit Cash (1000), Credit AR (1200).
   - Verify invoice balance updates.
9. **Verify invoice status** transitions (SENT -> PARTIAL -> PAID).

### Expected Outcomes

- PDF downloads complete in under 10 seconds.
- Payment posts correctly to GL.
- Invoice balance reaches $0 after full payment.
- Client `totalOwed` decreases by payment amount.

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| PDF download timeout (197s) | Performance issue (TER-36) | Check server logs for PDF generation timing |
| Payment fails to post | GL posting error | Check accountingHooks.ts error logging |
| Balance incorrect after payment | Rounding or double-posting | Verify ledger entries sum correctly |

---

## GF-005: Pick-Pack (Fulfillment)

**Purpose:** Pick, pack, and ship orders from the warehouse.
**Required Role:** Warehouse Staff (`qa.fulfillment@terp.test`)
**Entry Point:** `/fulfillment` or pick queue
**Spec:** `docs/golden-flows/specs/GF-005-PICK-PACK.md`

### Step-by-Step Instructions

1. **Login** as `qa.fulfillment@terp.test`.
2. **Navigate** to the fulfillment/pick queue.
3. **View pick queue:**
   - See list of orders awaiting fulfillment.
   - Each task shows order number, items, and priority.
4. **Start pick task:**
   - Select an order from the queue.
   - Click "Start Pick" to begin.
5. **Confirm picked quantities:**
   - For each line item, enter the picked quantity.
   - Flag any discrepancies (short picks).
6. **Complete packing:**
   - Confirm all items are packed.
   - Enter box/package count.
7. **Complete shipment handoff:**
   - Mark shipment as ready/shipped.
   - Enter tracking info if applicable.

### Expected Outcomes

- Pick task status transitions: Queued -> In Progress -> Packed -> Shipped.
- Inventory decrements by picked quantities.
- Order status updates to reflect fulfillment progress.
- COGS GL entries posted: Debit COGS (5000), Credit Inventory (1300).

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Pick queue empty | No confirmed orders | Create and confirm orders via GF-003 first |
| Insufficient inventory | Lot unavailable | Check batch status (must be LIVE) |
| Ship button disabled | Pick not completed | Complete all line item picks first |

---

## GF-006: Client Ledger / AR-AP Dashboard

**Purpose:** View accounts receivable and payable summaries, drill into client ledgers.
**Required Role:** Accountant (`qa.accounting@terp.test`)
**Entry Point:** Dashboard or `/accounting`
**Spec:** `docs/golden-flows/specs/GF-006-CLIENT-LEDGER.md`

### Step-by-Step Instructions

1. **Login** as `qa.accounting@terp.test`.
2. **Navigate** to the Dashboard.
3. **Verify AR/AP widgets:**
   - "Top Debtors" widget shows clients with outstanding balances.
   - "Top Vendors Owed" widget shows suppliers with AP balances.
   - Amounts should be non-zero if transactions exist.
4. **Click "View All"** on Top Debtors widget.
5. **View client list** with totalOwed column and aging indicators.
6. **Click on a specific client** to open client profile.
7. **Click "View Ledger"** to see transaction history.
8. **Review ledger table:**
   - Date, Type, Description, Reference, Debit, Credit, Running Balance.
   - Summary cards: Total Transactions, Debits, Credits, Current Balance.
9. **Filter by date range** or transaction type.
10. **Export ledger to CSV** (if available).
11. **(Optional) Add manual adjustment:**
    - Click "Add Adjustment."
    - Enter credit or debit amount with description.

### Expected Outcomes

- Top Debtors shows ranked clients with non-zero balances.
- Top Vendors Owed shows suppliers with proper names (not "Unknown Vendor").
- Client ledger shows complete transaction history with correct running balance.
- Aging buckets (Current, 30, 60, 90+ days) calculate correctly.

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "No outstanding balances" | Query filter issue (TER-37) | Check getTopDebtors query JOINs and WHERE clauses |
| "Unknown Vendor" | Missing name JOIN (TER-37) | Check getTopVendorsOwed query client name join |
| Incorrect running balance | Ordering or calculation bug | Verify ledger entries sorted by date |

---

## GF-007: Inventory Management

**Purpose:** View, filter, and manage inventory batches and valuation.
**Required Role:** Inventory Manager (`qa.inventory@terp.test`)
**Entry Point:** `/inventory`
**Spec:** `docs/golden-flows/specs/GF-007-INVENTORY-MGMT.md`

### Step-by-Step Instructions

1. **Login** as `qa.inventory@terp.test`.
2. **Navigate** to Inventory page (`/inventory`).
3. **Verify batch list loads** with columns: Product, Lot, Status, Qty, COGS, Location.
4. **Apply status filter:**
   - Filter by LIVE, AWAITING_INTAKE, ON_HOLD, QUARANTINED, SOLD_OUT, CLOSED.
   - Verify counts update per filter.
5. **Search by product name** or lot number.
6. **Check valuation totals:**
   - Total inventory value should reflect sum of (qty * COGS) for displayed batches.
   - Verify values are not $0.00 (known bug pattern).
7. **Click on a batch** to view detail drawer.
8. **Review batch details:**
   - Product info, supplier, COGS, quantity, status history.
   - Location and ownership type.
9. **Edit batch** (if permitted by role):
   - Update status, location, or notes.
   - Verify changes persist after refresh.

### Expected Outcomes

- Batch list shows all inventory with correct values (not $0.00).
- Filters work correctly and show accurate counts.
- Valuation totals update when filters change.
- Batch detail drawer shows complete information.

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| All values show $0.00 | Status filter enum mismatch | Check batch status enum alignment in schema |
| "No Inventory Found" | localStorage stale filters | Clear localStorage and reload |
| Missing batches | Soft-delete filter | Verify deletedAt IS NULL in query |

---

## GF-008: Sample Request

**Purpose:** Create and manage sales sample requests with product tracking.
**Required Role:** Sales Rep (`qa.salesrep@terp.test`)
**Entry Point:** `/samples`
**Spec:** `docs/golden-flows/specs/GF-008-SAMPLE-REQUEST.md`

### Step-by-Step Instructions

1. **Login** as `qa.salesrep@terp.test`.
2. **Navigate** to Sample Management page (`/samples`).
3. **View existing samples:**
   - Filter by status tabs: ALL, PENDING, FULFILLED, RETURN_REQUESTED, RETURNED.
   - Review expiring samples widget.
4. **Click "New Sample"** to open the sample request form.
5. **Fill in request details:**
   - **Product:** Use the searchable product selector (should be a combobox, not text input).
   - **Client:** Select from client dropdown.
   - **Quantity:** Enter quantity (e.g., `3.5`).
   - **Due Date:** Optional date field.
   - **Notes:** Optional notes.
6. **Submit the request.**
7. **Verify the request appears** in the sample list with:
   - Correct product name (not a text string).
   - Correct client name.
   - Status: PENDING.
   - Allocated against monthly limit (default 7.0g/month).
8. **Verify monthly allocation** is tracked.

### Expected Outcomes

- Product selector shows searchable product list (not a plain text input).
- Request stores `productId` (not text) and displays product name.
- Monthly allocation tracking shows remaining allocation.
- Request lifecycle: PENDING -> FULFILLED -> RETURNED (optional).

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Text input instead of selector | Component not using ProductCombobox (TER-35) | Replace text input with ProductCombobox |
| Product selector empty | products.list query issue | Check network tab for product search response |
| Allocation exceeded | Monthly limit reached | Check current month allocation in sample list |

---

## Cross-Flow Dependencies

```
GF-001 (Intake) ──creates──> Inventory Batches
                                    │
GF-002 (PO) ──creates──> Inventory Batches + AP Entries
                                    │
GF-007 (Inventory) ──views──> Inventory Batches
                                    │
GF-003 (Order) ──reserves──> Inventory Batches
        │
        ├──generates──> GF-004 (Invoice)
        │                       │
        │                       └──posts──> GL Entries
        │
        └──triggers──> GF-005 (Pick-Pack)
                               │
                               └──decrements──> Inventory Batches

GF-006 (AR/AP) ──reads──> Client Balances from GL Entries
GF-008 (Samples) ──allocates──> Inventory Batches
```

## Quick Verification Checklist

Use this checklist for rapid smoke testing:

- [ ] GF-001: Intake form renders, rows can be added, submit works
- [ ] GF-002: PO product dropdown populated, PO lifecycle completes
- [ ] GF-003: Order -> Invoice -> Payment -> Fulfillment completes
- [ ] GF-004: PDF generates in <10s, payment records and posts GL
- [ ] GF-005: Pick queue loads, pick/pack/ship workflow completes
- [ ] GF-006: Top debtors/vendors show data, ledger drill-down works
- [ ] GF-007: Inventory list loads with values, filters work correctly
- [ ] GF-008: Product selector is searchable combobox, request stores productId
