# TERP Golden Flows — Comprehensive Browser Test Plan

**Version:** 1.0
**Date:** February 16, 2026
**Target Application:** https://terp-app.ondigitalocean.app
**Purpose:** Exhaustive browser-based test plan for all 8 Golden Flows, designed for execution by an automated testing agent. Verifies real business outcomes across modules — not just UI clicks.

---

## Test Environment & Credentials

| Role | Email | Password | Use For |
|------|-------|----------|---------|
| Super Admin | `qa.superadmin@terp.test` | `TerpQA2026!` | Full access, setup, all flows |
| Sales Manager | `qa.salesmanager@terp.test` | `TerpQA2026!` | Orders, Clients, Quotes |
| Inventory | `qa.inventory@terp.test` | `TerpQA2026!` | Stock, Batches |
| Accounting | `qa.accounting@terp.test` | `TerpQA2026!` | GL, AR/AP |
| Fulfillment | `qa.fulfillment@terp.test` | `TerpQA2026!` | Pick/Pack |
| Auditor | `qa.auditor@terp.test` | `TerpQA2026!` | Read-only verification |

### Login Procedure (All Tests)
1. Navigate to `https://terp-app.ondigitalocean.app/login`
2. Enter email for the required role
3. Enter password `TerpQA2026!`
4. Click "Sign In"
5. **Verify:** Dashboard loads, user name visible in header

### Global Invariants (Check After Every Mutating Action)
- **GL Balance:** `SUM(debits) = SUM(credits)` for any date range
- **AR Balance:** `invoices.amountDue = invoices.totalAmount - invoices.amountPaid` for every invoice
- **Client Balance:** `client.totalOwed = SUM(unpaid invoices.amountDue)` for each affected client
- **Inventory:** `batch.onHandQty >= 0` always; `availableQty = onHandQty - reservedQty - quarantineQty - holdQty`
- **Order Totals:** `order.total = SUM(lineItems.lineTotal)` for every order
- **Decimal Precision:** All monetary values stored to 4 decimal places (DECIMAL(15,4))

---

## GF-001: Direct Intake (Inventory Intake Without PO)

### Overview
Direct inventory intake creates vendors, brands, products, lots, and batches in a single atomic transaction — no purchase order required. This is the fastest path to get inventory into the system.

**Key Router:** `inventory.intake` (tRPC mutation)
**Permission Required:** `inventory:create`
**Batch Status After Intake:** `AWAITING_INTAKE`
**Current Blocker:** BUG-112 (form fields not rendering) — tests may need to work around this via API

### Test Data Constants
```
Vendor: "QA Test Farm Alpha"
Brand: "QA Brand One"
Category: "Flower" (requires strain)
Strain: "Blue Dream"
Product: null (not required for Flower)
Unit: grams
Quantity: 500.0000
Unit Cost: $8.5000
COGS Mode: FIXED, unitCogs: $3.2500
Payment Terms: NET_30
Location: "Warehouse A - Shelf 1"
```

---

### GF-001-TC-001: Happy Path — Flower Category with FIXED COGS

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Logged in as `qa.superadmin@terp.test`
- No existing vendor named "QA Direct Intake Vendor 001"

**Steps:**

1. **Navigate to Intake Form**
   - Go to `/inventory` or click "Inventory" in sidebar
   - Click "New Intake" or equivalent button to open PurchaseModal
   - **Verify:** Modal opens with intake form fields

2. **Enter Vendor Information**
   - In "Vendor" field, type "QA Direct Intake Vendor 001"
   - If vendor does not exist, system should allow creation of new vendor
   - **Verify:** Vendor field accepts input

3. **Enter Brand Information**
   - In "Brand" field, type "QA Brand Alpha"
   - **Verify:** Brand field accepts input

4. **Select Category = Flower**
   - Select "Flower" from Category dropdown
   - **Verify:** "Strain" field becomes visible/required
   - **Verify:** "Product Name" field is NOT required (Flower uses strain)

5. **Enter Strain**
   - In "Strain" field, type "Blue Dream"
   - **Verify:** Strain field accepts input

6. **Enter Quantity and Unit**
   - Set Unit to "grams"
   - Enter Quantity: `500`
   - **Verify:** Quantity accepts decimal values

7. **Enter Cost Information**
   - Unit Cost: `8.50`
   - COGS Mode: Select "FIXED"
   - Unit COGS: `3.25`
   - **Verify:** When FIXED selected, unitCogs field appears; min/max fields hidden

8. **Set Payment Terms**
   - Select "NET_30" from Payment Terms dropdown
   - **Verify:** Selection registers

9. **Enter Location**
   - Location: "Warehouse A - Shelf 1"
   - **Verify:** Location field accepts input

10. **Submit the Intake**
    - Click "Submit" / "Create" button
    - **Verify:** Form submits without error
    - **Verify:** Success toast/notification appears

11. **CROSS-MODULE: Verify Batch Created**
    - Navigate to `/inventory/batches` or search for the newly created batch
    - **Verify:** New batch exists with:
      - `status = AWAITING_INTAKE`
      - `onHandQty = 500.0000`
      - `reservedQty = 0`
      - `unitCogs = 3.2500`
      - Vendor association is correct
      - Brand association is correct
      - Strain = "Blue Dream"

12. **CROSS-MODULE: Verify Lot Created**
    - **Verify:** A lot record exists linked to this batch
    - **Verify:** Lot references the correct vendor

13. **CROSS-MODULE: Verify Inventory Movement**
    - Navigate to inventory movements or check via batch detail
    - **Verify:** An INTAKE movement exists with:
      - `type = INTAKE`
      - `quantity = 500.0000`
      - `batchId` matches new batch

14. **CROSS-MODULE: Verify Vendor Created (if new)**
    - Navigate to `/clients` or vendor list
    - **Verify:** "QA Direct Intake Vendor 001" exists
    - **Verify:** Vendor has `isSeller = true`

15. **CROSS-MODULE: Verify Audit Log**
    - Check audit logs for this transaction
    - **Verify:** Entry exists with action type indicating intake creation

**Expected Outcome:** Single atomic transaction creates vendor + brand + product + lot + batch + location + movement. All entities correctly linked.

---

### GF-001-TC-002: Happy Path — Non-Flower Category with RANGE COGS

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Logged in as `qa.superadmin@terp.test`

**Steps:**

1. Open intake form (same navigation as TC-001)

2. **Enter Vendor:** "QA Direct Intake Vendor 002"

3. **Enter Brand:** "QA Brand Beta"

4. **Select Category:** "Concentrates" (or any non-Flower category)
   - **Verify:** "Product Name" field becomes required
   - **Verify:** "Strain" field is NOT required (non-Flower)

5. **Enter Product Name:** "Live Rosin Cart 1g"
   - **Verify:** Product Name accepts input

6. **Enter Quantity:** `200` units

7. **Enter Cost:**
   - Unit Cost: `12.00`
   - COGS Mode: Select "RANGE"
   - **Verify:** Min COGS and Max COGS fields appear; unitCogs field hidden
   - Min COGS: `4.00`
   - Max COGS: `8.00`
   - **Verify:** Min < Max (system should validate this)

8. **Payment Terms:** "COD"

9. **Submit**
   - **Verify:** Success
   - **Verify:** Batch created with COGS mode = RANGE, minCogs = 4.00, maxCogs = 8.00

10. **Verify batch detail shows RANGE COGS** with midpoint calculation available for sample costing: `(4.00 + 8.00) / 2 = 6.00`

---

### GF-001-TC-003: Validation — Flower Without Strain (Should Fail)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Open intake form
2. Select Category = "Flower"
3. Leave Strain field empty
4. Fill all other required fields
5. Attempt to submit
6. **Verify:** Form shows validation error indicating strain is required for Flower category
7. **Verify:** No batch, lot, vendor, or movement records created (atomic rollback)

---

### GF-001-TC-004: Validation — RANGE COGS with Min >= Max (Should Fail)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Open intake form
2. Fill required fields
3. COGS Mode: "RANGE"
4. Min COGS: `10.00`
5. Max COGS: `5.00` (min > max)
6. Attempt submit
7. **Verify:** Validation error: min must be less than max
8. **Verify:** No records created

**Also test:** Min COGS = Max COGS (e.g., both `5.00`) — should also fail per BR rules

---

### GF-001-TC-005: Validation — Zero Quantity (Should Fail)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Open intake form
2. Enter Quantity: `0`
3. Fill all other fields correctly
4. Attempt submit
5. **Verify:** Validation error on quantity (must be > 0)
6. **Verify:** No records created

---

### GF-001-TC-006: Validation — Negative Quantity (Should Fail)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Open intake form
2. Enter Quantity: `-100`
3. Attempt submit
4. **Verify:** Validation error — quantity cannot be negative
5. **Verify:** No records created

---

### GF-001-TC-007: Existing Vendor Reuse

**Role:** Super Admin
**Priority:** P1

**Prerequisites:**
- Vendor "QA Direct Intake Vendor 001" already exists (from TC-001)

**Steps:**
1. Open intake form
2. Start typing "QA Direct Intake Vendor 001"
3. **Verify:** Autocomplete/dropdown shows existing vendor
4. Select the existing vendor
5. Fill all other fields with different brand/product
6. Submit
7. **Verify:** No duplicate vendor created
8. **Verify:** New batch is linked to the EXISTING vendor record

---

### GF-001-TC-008: All Payment Terms Variants

**Role:** Super Admin
**Priority:** P2

**For each payment term** (COD, NET_7, NET_15, NET_30, CONSIGNMENT, PARTIAL):
1. Open intake form
2. Fill all required fields
3. Select the payment term
4. Submit
5. **Verify:** Batch/lot created with correct payment terms stored
6. **Verify:** If payable is created, due date calculates correctly:
   - COD → due immediately (0 days)
   - NET_7 → due date = intake date + 7 days
   - NET_15 → due date = intake date + 15 days
   - NET_30 → due date = intake date + 30 days
   - CONSIGNMENT → due date = intake date + 60 days
   - PARTIAL → due date = intake date + 30 days

---

### GF-001-TC-009: Decimal Precision Test

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Open intake form
2. Enter Quantity: `123.4567`
3. Enter Unit Cost: `7.8912`
4. Enter Unit COGS (FIXED): `3.4567`
5. Submit
6. **Verify:** All values stored to 4 decimal places (DECIMAL(15,4))
7. **Verify:** No rounding errors visible in UI or database
8. **Verify:** Calculated fields (e.g., total cost = qty × unitCost) maintain precision

---

### GF-001-TC-010: Permission Denied — Auditor Role

**Role:** Auditor
**Priority:** P1

**Steps:**
1. Login as `qa.auditor@terp.test`
2. Navigate to `/inventory`
3. Attempt to access intake form
4. **Verify:** Either "New Intake" button is hidden/disabled, OR clicking it returns permission error
5. **Verify:** Auditor cannot submit intake via any means
6. **Verify:** Auditor CAN view existing batch records (read permission)

---

### GF-001-TC-011: Permission Denied — Sales Manager Role

**Role:** Sales Manager
**Priority:** P2

**Steps:**
1. Login as `qa.salesmanager@terp.test`
2. Attempt to create an intake
3. **Verify:** Permission denied — sales manager should not have `inventory:create`

---

### GF-001-TC-012: Large Quantity Intake

**Role:** Super Admin
**Priority:** P2

**Steps:**
1. Open intake form
2. Enter Quantity: `999999.9999` (near max for DECIMAL(15,4))
3. Enter Unit Cost: `0.0001` (minimum meaningful cost)
4. Submit
5. **Verify:** System handles large quantity without overflow
6. **Verify:** Batch created with correct values

---

### GF-001-TC-013: Duplicate Submission Prevention

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Open intake form
2. Fill all fields
3. Double-click submit rapidly (or click submit then immediately click again)
4. **Verify:** Only ONE batch/lot/movement is created — not duplicate
5. **Verify:** Second click is either debounced or shows "already submitted"

---

### GF-001-TC-014: Special Characters in Names

**Role:** Super Admin
**Priority:** P2

**Steps:**
1. Open intake form
2. Vendor name: `O'Brien & Sons "Premium" Farm <Test>`
3. Brand: `Möther Ëarth™`
4. Strain: `Blue Dream #5 (Indoor/Outdoor)`
5. Submit
6. **Verify:** All special characters preserved correctly
7. **Verify:** No XSS or injection issues
8. **Verify:** Values display correctly in all views

---

## GF-002: Procure-to-Pay (PO Lifecycle)

### Overview
Full procurement cycle: Create PO → Add Line Items → Submit → Vendor Confirms → Receive Goods → Record Bill → Pay Bill. Creates inventory through the PO receiving process.

**PO State Machine:** DRAFT → SENT → CONFIRMED → RECEIVING → RECEIVED (+CANCELLED)
**Bill State Machine:** DRAFT → PENDING → APPROVED → PARTIAL → PAID (+OVERDUE, VOID)
**Key Routers:** `purchaseOrders.*`, `poReceiving.*`, `accounting.bills.*`
**Supplier Requirement:** Must be a client with `isSeller = true`

### Known Issues to Validate
- Hard delete on POs (should be soft delete)
- No receiving UI currently
- `vendorId` still required (should be `supplierId`)
- `createdBy` comes from client input (security violation)
- Duplicate inventory movement inserts in receiving code
- Can submit PO without line items

---

### GF-002-TC-001: Happy Path — Full PO Lifecycle

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Supplier exists with `isSeller = true` (e.g., "QA Supplier Corp")
- At least one product exists

**Steps:**

1. **Create PO**
   - Navigate to `/purchase-orders` or equivalent
   - Click "New Purchase Order"
   - **Verify:** PO form opens, status defaults to DRAFT

2. **Select Supplier**
   - Search/select "QA Supplier Corp"
   - **Verify:** Supplier is a client with `isSeller = true`
   - **Verify:** Supplier details populate (name, address, etc.)

3. **Add Line Items**
   - Add Item 1: Product "Blue Dream Flower", Qty: 1000g, Unit Cost: $5.00
   - Add Item 2: Product "OG Kush Flower", Qty: 500g, Unit Cost: $7.50
   - **Verify:** Line totals calculate: Item 1 = $5,000.00, Item 2 = $3,750.00
   - **Verify:** PO total = $8,750.00

4. **Save as Draft**
   - Click Save/Create
   - **Verify:** PO created with status = DRAFT
   - **Verify:** PO number generated (format: PO-YYYYMM-NNNNN or similar)
   - Record the PO number for subsequent steps

5. **Submit PO (DRAFT → SENT)**
   - Click "Send" or "Submit" button
   - **Verify:** Status changes to SENT
   - **Verify:** Cannot edit line items while SENT (or validate this behavior)

6. **Confirm PO (SENT → CONFIRMED)**
   - Click "Confirm" or equivalent
   - **Verify:** Status changes to CONFIRMED

7. **Receive Goods (CONFIRMED → RECEIVING → RECEIVED)**
   - Click "Receive" or navigate to receiving
   - Enter received quantities:
     - Item 1: Received 1000g
     - Item 2: Received 500g
   - **Verify:** Status changes to RECEIVING then RECEIVED

8. **CROSS-MODULE: Verify Inventory Created**
   - Navigate to `/inventory/batches`
   - **Verify:** Two new batches created:
     - Batch for "Blue Dream": `onHandQty = 1000.0000`, `unitCogs = 5.0000`
     - Batch for "OG Kush": `onHandQty = 500.0000`, `unitCogs = 7.5000`
   - **Verify:** Both batches have `status = AWAITING_INTAKE` (or LIVE if auto-activated)

9. **CROSS-MODULE: Verify Inventory Movements**
   - **Verify:** Two INTAKE movements created:
     - Movement 1: type=INTAKE, qty=1000, ref=PO_RECEIPT, batchId=batch1
     - Movement 2: type=INTAKE, qty=500, ref=PO_RECEIPT, batchId=batch2

10. **CROSS-MODULE: Verify Lot Created**
    - **Verify:** One lot created for this PO receipt
    - **Verify:** Both batches linked to the lot

11. **Record Bill**
    - Navigate to bills or click "Create Bill" from PO
    - **Verify:** Bill auto-populates from PO data
    - **Verify:** Bill total = $8,750.00
    - **Verify:** Bill status = DRAFT or PENDING

12. **Approve Bill (PENDING → APPROVED)**
    - Click "Approve"
    - **Verify:** Status changes to APPROVED

13. **Pay Bill (APPROVED → PAID)**
    - Click "Record Payment"
    - Enter amount: $8,750.00
    - Select payment method: CHECK
    - **Verify:** Bill status changes to PAID

14. **CROSS-MODULE: Verify GL Entries**
    - Navigate to `/accounting/gl`
    - **Verify:** Payment GL entries exist:
      - DR: Accounts Payable $8,750.00
      - CR: Cash $8,750.00
    - **Verify:** Debits = Credits

15. **CROSS-MODULE: Verify Supplier Balance**
    - Navigate to supplier's client profile/ledger
    - **Verify:** Balance updated to reflect payment

---

### GF-002-TC-002: Partial Receiving

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Create and confirm a PO with 1 line item: 1000g at $5.00
2. Receive only 600g (partial)
3. **Verify:** PO status is RECEIVING (not RECEIVED — not fully received)
4. **Verify:** Batch created with onHandQty = 600
5. **Verify:** INTAKE movement for 600g
6. Receive remaining 400g
7. **Verify:** PO status changes to RECEIVED
8. **Verify:** Batch updated to onHandQty = 1000 (or second batch created with 400)
9. **Verify:** Second INTAKE movement for 400g

---

### GF-002-TC-003: PO Cancellation

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Create PO with line items, save as DRAFT
2. Click "Cancel"
3. **Verify:** Status changes to CANCELLED
4. **Verify:** Cannot edit, submit, or receive against cancelled PO
5. **Verify:** No inventory created
6. **Verify:** No movements or lots created

**Also test:** Cancel from SENT status (before confirmation)

---

### GF-002-TC-004: Submit PO Without Line Items (Known Bug)

**Role:** Super Admin
**Priority:** P1 (Known Issue Validation)

**Steps:**
1. Create PO, select supplier but DO NOT add any line items
2. Click "Submit" / "Send"
3. **Expected (per known bug):** System may allow this — document whether it does
4. **Desired behavior:** Should fail validation with "At least one line item required"
5. Record result: PASS (if properly blocked) or FAIL (if allowed)

---

### GF-002-TC-005: Partial Bill Payment

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Complete PO through receiving (total = $10,000.00)
2. Create and approve bill for $10,000.00
3. Record payment of $4,000.00
4. **Verify:** Bill status = PARTIAL
5. **Verify:** Bill `amountPaid = $4,000.00`, `amountDue = $6,000.00`
6. Record second payment of $6,000.00
7. **Verify:** Bill status = PAID
8. **Verify:** Bill `amountPaid = $10,000.00`, `amountDue = $0.00`
9. **Verify GL:** Two sets of payment entries, debits = credits

---

### GF-002-TC-006: Bill Void

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Create and approve a bill for $5,000.00
2. Record partial payment of $2,000.00
3. Void the bill
4. **Verify:** Bill status = VOID
5. **Verify:** Payment reversed
6. **Verify GL:** Reversing entries created (CR AP / DR Cash)
7. **Verify:** Supplier balance adjusted

---

### GF-002-TC-007: PO with Multiple Suppliers (Negative Test)

**Role:** Super Admin
**Priority:** P2

**Steps:**
1. Create PO and select Supplier A
2. Try to add a line item from Supplier B
3. **Verify:** System prevents mixing suppliers on a single PO

---

### GF-002-TC-008: Duplicate Inventory Movement Bug Validation

**Role:** Super Admin
**Priority:** P0 (Known Bug)

**Steps:**
1. Create and fully receive a PO with 2 line items
2. Check inventory movements for each batch
3. **Verify:** Count of INTAKE movements — per known bug, there may be DUPLICATE movements (code inserts at lines 543-553 AND 598-608)
4. Document: How many INTAKE movements per line item? Expected: 1. If 2: bug confirmed.
5. **Verify:** onHandQty matches expected (not doubled from duplicate movements)

---

## GF-003: Order-to-Cash (Sales Cycle)

### Overview
The most critical golden flow. Complete sales cycle: Create Order → Add Line Items → Confirm (reserves inventory) → Pick/Pack → Ship (releases inventory) → Invoice → Payment → GL entries.

**Fulfillment State Machine:** DRAFT → CONFIRMED → PENDING → PACKED → SHIPPED → DELIVERED → RETURNED → RESTOCKED/RETURNED_TO_VENDOR (+CANCELLED)
**Skip-Steps Allowed:** CONFIRMED can go directly to SHIPPED
**Invoice Generation:** Only for SALE orders, must be PENDING/PACKED/SHIPPED
**Payment Tolerance:** $0.01 — payment of $100.01 on $100.00 invoice accepted (capped), $100.02 rejected

---

### GF-003-TC-001: Happy Path — Full Order-to-Cash Cycle

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Client "QA Buyer Corp" exists with `isBuyer = true`, payment terms NET_30
- Batch "Blue Dream" exists with `onHandQty >= 100`, `status = LIVE`
- Record starting values:
  - `batch.onHandQty` = STARTING_QTY (note this)
  - `batch.reservedQty` = STARTING_RESERVED (note this)
  - `client.totalOwed` = STARTING_OWED (note this)

**Steps:**

1. **Create Order**
   - Navigate to `/orders`
   - Click "New Order"
   - Select Client: "QA Buyer Corp"
   - Order Type: SALE
   - **Verify:** Order form opens, status = DRAFT

2. **Add Line Items**
   - Add: "Blue Dream Flower", Qty: 50g, Unit Price: $15.00
   - **Verify:** Line total = $750.00
   - **Verify:** Order total = $750.00

3. **Save Order**
   - Click Save
   - **Verify:** Order created with status DRAFT
   - **Verify:** NO inventory reserved yet (DRAFT does not reserve)
   - Record Order ID

4. **Confirm Order (DRAFT → CONFIRMED)**
   - Click "Confirm"
   - **Verify:** Status changes to CONFIRMED

5. **CROSS-MODULE: Verify Inventory Reserved**
   - Navigate to the batch detail
   - **Verify:** `batch.reservedQty` increased by 50.0000 (= STARTING_RESERVED + 50)
   - **Verify:** `batch.onHandQty` unchanged (still STARTING_QTY)
   - **Verify:** `availableQty` decreased by 50 (= onHand - reserved - quarantine - hold)

6. **CROSS-MODULE: Verify Inventory Movement**
   - **Verify:** RESERVE movement created with qty = 50

7. **Ship Order (CONFIRMED → SHIPPED — skip-step)**
   - Click "Ship" or advance to SHIPPED
   - **Verify:** Status changes to SHIPPED

8. **CROSS-MODULE: Verify Inventory Released**
   - **Verify:** `batch.reservedQty` decreased by 50 (back to STARTING_RESERVED)
   - **Verify:** `batch.onHandQty` decreased by 50 (= STARTING_QTY - 50)
   - **Verify:** SALE movement created with qty = 50

9. **Generate Invoice**
   - From the order, click "Generate Invoice" or navigate to create invoice
   - **Verify:** Invoice created with:
     - `totalAmount = $750.00`
     - `amountPaid = $0.00`
     - `amountDue = $750.00`
     - `status = DRAFT`
     - `dueDate` = order date + 30 days (NET_30)
   - Record Invoice ID and number (INV-YYYYMM-NNNNN)

10. **CROSS-MODULE: Verify Client Balance**
    - Navigate to client profile
    - **Verify:** `client.totalOwed` increased by $750.00 (= STARTING_OWED + 750)

11. **Record Full Payment**
    - Navigate to invoice → "Record Payment"
    - Enter amount: $750.00
    - Payment method: WIRE
    - Click submit
    - **Verify:** Invoice status changes to PAID
    - **Verify:** `invoice.amountPaid = $750.00`
    - **Verify:** `invoice.amountDue = $0.00`

12. **CROSS-MODULE: Verify GL Entries**
    - Navigate to `/accounting/gl`
    - **Verify:** Payment entries exist:
      - DR: Cash $750.00 (entry number PMT-{id}-DR)
      - CR: Accounts Receivable $750.00 (entry number PMT-{id}-CR)
    - **Verify:** GL balanced (total debits = total credits)

13. **CROSS-MODULE: Verify Client Balance Updated**
    - **Verify:** `client.totalOwed` decreased by $750.00 (back to STARTING_OWED)
    - **Verify:** syncClientBalance() was triggered

14. **CROSS-MODULE: Verify Client Ledger**
    - Navigate to client's ledger view
    - **Verify:** Two entries appear:
      - SALE entry: +$750.00 (debit — they owe you)
      - PAYMENT_RECEIVED entry: -$750.00 (credit — payment received)
    - **Verify:** Running balance = $0.00 for this transaction pair

---

### GF-003-TC-002: Payment Tolerance — $0.01 Overpayment (Accepted)

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Order confirmed and shipped with total = $100.00
- Invoice generated with amountDue = $100.00

**Steps:**
1. Record payment of $100.01 (1 cent over)
2. **Verify:** Payment ACCEPTED (within $0.01 tolerance)
3. **Verify:** Payment amount CAPPED to $100.00 (not $100.01)
4. **Verify:** Invoice status = PAID
5. **Verify:** `invoice.amountDue = $0.00`
6. **Verify:** GL entries for exactly $100.00

---

### GF-003-TC-003: Payment Tolerance — $0.02 Overpayment (Rejected)

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Invoice with amountDue = $100.00

**Steps:**
1. Attempt payment of $100.02 (2 cents over — exceeds tolerance)
2. **Verify:** Payment REJECTED
3. **Verify:** Error message indicates overpayment
4. **Verify:** Invoice status unchanged
5. **Verify:** No GL entries created for this attempt

---

### GF-003-TC-004: Partial Payment → Full Payment

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Invoice with amountDue = $1,000.00

**Steps:**
1. Record payment of $400.00
2. **Verify:** Invoice status = PARTIAL
3. **Verify:** `amountPaid = $400.00`, `amountDue = $600.00`
4. **Verify:** GL: DR Cash $400, CR AR $400
5. **Verify:** Client balance reduced by $400

6. Record payment of $600.00
7. **Verify:** Invoice status = PAID
8. **Verify:** `amountPaid = $1,000.00`, `amountDue = $0.00`
9. **Verify:** GL: DR Cash $600, CR AR $600
10. **Verify:** Client balance reduced by remaining $600

---

### GF-003-TC-005: Order Cancellation Before Shipment

**Role:** Super Admin
**Priority:** P1

**Prerequisites:**
- Order confirmed (inventory reserved)
- Record batch.reservedQty BEFORE cancellation

**Steps:**
1. Cancel the confirmed order
2. **Verify:** Order status = CANCELLED
3. **Verify:** `batch.reservedQty` decreased by order quantity (reservation released)
4. **Verify:** `batch.onHandQty` unchanged (nothing was shipped)
5. **Verify:** No invoice generated for cancelled order
6. **Verify:** RELEASE movement created (or CANCEL movement)

---

### GF-003-TC-006: Cannot Invoice DRAFT Order

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Create order, leave in DRAFT status
2. Attempt to generate invoice
3. **Verify:** System blocks invoice generation — order must be at least PENDING/PACKED/SHIPPED
4. **Verify:** No invoice record created

---

### GF-003-TC-007: Cannot Invoice SAMPLE Order

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Create order with type = SAMPLE
2. Confirm and ship the order
3. Attempt to generate invoice
4. **Verify:** System blocks — only SALE orders can be invoiced
5. **Verify:** No invoice created

---

### GF-003-TC-008: Multiple Line Items with Different Batches

**Role:** Super Admin
**Priority:** P1

**Prerequisites:**
- Batch A: "Blue Dream" with onHandQty >= 100
- Batch B: "OG Kush" with onHandQty >= 50
- Client exists

**Steps:**
1. Create order with 2 line items:
   - Item 1: Blue Dream, 80g at $15.00 = $1,200.00
   - Item 2: OG Kush, 40g at $20.00 = $800.00
2. **Verify:** Order total = $2,000.00

3. Confirm order
4. **Verify:** Batch A reservedQty increased by 80
5. **Verify:** Batch B reservedQty increased by 40

6. Ship order
7. **Verify:** Batch A: onHandQty decreased by 80, reservedQty decreased by 80
8. **Verify:** Batch B: onHandQty decreased by 40, reservedQty decreased by 40
9. **Verify:** Two SALE movements created (one per batch)

10. Generate invoice, pay $2,000.00
11. **Verify:** GL balanced, client balance updated

---

### GF-003-TC-009: Fulfillment Skip-Steps (CONFIRMED → SHIPPED Directly)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Create and confirm order (status = CONFIRMED)
2. Skip PENDING and PACKED — go directly to SHIPPED
3. **Verify:** Transition allowed
4. **Verify:** Inventory correctly released (reservedQty down, onHandQty down)
5. **Verify:** SALE movement created
6. **Verify:** Invoice can be generated from SHIPPED status

---

### GF-003-TC-010: Due Date Calculation Per Payment Terms

**Role:** Super Admin
**Priority:** P1

**For each payment term**, create order → confirm → ship → invoice:

| Payment Term | Expected Due Date Offset |
|---|---|
| COD | 0 days (same day) |
| NET_7 | + 7 days |
| NET_15 | + 15 days |
| NET_30 | + 30 days |
| PARTIAL | + 30 days |
| CONSIGNMENT | + 60 days |

**Verify:** Each invoice's `dueDate` matches the expected calculation from the invoice creation date.

---

### GF-003-TC-011: Inventory Insufficient — Confirm Should Fail

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Batch with `availableQty = 20` (e.g., onHand=50, reserved=30)

**Steps:**
1. Create order for 30g from this batch (exceeds available 20g)
2. Attempt to confirm
3. **Verify:** Confirmation fails with "insufficient inventory" error
4. **Verify:** No reservation created
5. **Verify:** `batch.reservedQty` unchanged

---

### GF-003-TC-012: Order Return Flow

**Role:** Super Admin
**Priority:** P1

**Prerequisites:**
- Order fully shipped (SHIPPED status), batch.onHandQty recorded

**Steps:**
1. Initiate return on the order (SHIPPED → RETURNED)
2. **Verify:** Status = RETURNED
3. Choose "Restock" (RETURNED → RESTOCKED)
4. **Verify:** `batch.onHandQty` increased by returned quantity
5. **Verify:** RETURN movement created
6. **Verify:** If invoice was paid, credit memo or adjustment needed

---

### GF-003-TC-013: Rate Limiting — 10 Confirms/Minute

**Role:** Super Admin
**Priority:** P2

**Steps:**
1. Rapidly create and confirm 11 orders within 60 seconds
2. **Verify:** First 10 confirmations succeed
3. **Verify:** 11th confirmation is rate-limited (error returned)
4. Wait 60 seconds
5. **Verify:** Can confirm again after rate limit window

---

### GF-003-TC-014: Concurrent Order Modification (Optimistic Locking)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Open order detail in two browser tabs
2. In Tab 1: Modify line item quantity and save
3. In Tab 2: Modify line item price and save
4. **Verify:** Second save fails with optimistic lock conflict (version mismatch)
5. **Verify:** Data integrity maintained — no partial updates

---

## GF-004: Invoice & Payment

### Overview
AR operations: Review Invoice → Record Payment → Verify GL entries. Supports single-invoice payment, multi-invoice payment, payment void, and invoice void.

**Invoice State Machine:** DRAFT → SENT → VIEWED → PARTIAL → PAID → OVERDUE → VOID
**Void:** Can be triggered from any state
**Multi-Invoice Payment:** Allocations must sum to total (within $0.01 tolerance)
**Payment Number Format:** PMT-{YYYYMM}-{NNNNN}

---

### GF-004-TC-001: Happy Path — Single Invoice Payment (3-Step Flow)

**Role:** Accounting
**Priority:** P0

**Prerequisites:**
- Login as `qa.accounting@terp.test`
- Invoice exists with status SENT, amountDue = $500.00

**Steps:**

1. **Step 1: Review Invoice**
   - Navigate to invoice list or search for the invoice
   - Click on the invoice to open detail
   - **Verify:** Invoice details display correctly:
     - Invoice number (INV-YYYYMM-NNNNN format)
     - Client name
     - Line items with amounts
     - Total = $500.00
     - Amount Due = $500.00
     - Status = SENT

2. **Step 2: Payment Details**
   - Click "Record Payment"
   - Enter amount: $500.00
   - Select payment method: CHECK
   - Enter reference/check number if applicable
   - **Verify:** Payment form shows correct invoice context

3. **Step 3: Confirm**
   - Review payment summary
   - Click "Confirm Payment"
   - **Verify:** Success notification
   - **Verify:** Invoice status → PAID
   - **Verify:** `amountPaid = $500.00`
   - **Verify:** `amountDue = $0.00`
   - **Verify:** Payment number generated (PMT-YYYYMM-NNNNN)

4. **CROSS-MODULE: GL Entries**
   - Navigate to GL
   - **Verify:**
     - DR: Cash $500.00 (PMT-{id}-DR)
     - CR: AR $500.00 (PMT-{id}-CR)
   - **Verify:** Balanced

5. **CROSS-MODULE: Client Ledger**
   - Navigate to client's ledger
   - **Verify:** PAYMENT_RECEIVED entry for -$500.00

6. **CROSS-MODULE: Client Balance**
   - **Verify:** `client.totalOwed` decreased by $500.00

---

### GF-004-TC-002: Multi-Invoice Payment

**Role:** Accounting
**Priority:** P0

**Prerequisites:**
- Client has 3 unpaid invoices:
  - Invoice A: $200.00 due
  - Invoice B: $350.00 due
  - Invoice C: $150.00 due

**Steps:**
1. Navigate to payment screen / multi-pay option
2. Select all 3 invoices
3. Enter total payment: $700.00
4. Set allocations:
   - Invoice A: $200.00 (pays in full)
   - Invoice B: $350.00 (pays in full)
   - Invoice C: $150.00 (pays in full)
5. **Verify:** Allocations sum = $700.00 = payment total

6. Submit payment
7. **Verify:** All 3 invoices → PAID status
8. **Verify:** Each invoice's amountDue = $0.00
9. **Verify:** `invoice_payments` junction records created (3 records)
10. **Verify:** Single payment record with total $700.00
11. **Verify GL:** One set of entries: DR Cash $700 / CR AR $700
12. **Verify:** Client balance reduced by $700

---

### GF-004-TC-003: Multi-Invoice Partial Allocation

**Role:** Accounting
**Priority:** P1

**Prerequisites:**
- Invoice A: $500 due, Invoice B: $500 due

**Steps:**
1. Enter total payment: $600.00
2. Allocate: Invoice A = $500 (full), Invoice B = $100 (partial)
3. **Verify:** Allocation sum = $600 = payment total
4. Submit
5. **Verify:** Invoice A → PAID ($500/$500)
6. **Verify:** Invoice B → PARTIAL ($100/$500, amountDue = $400)
7. **Verify GL:** DR Cash $600 / CR AR $600
8. **Verify:** Two `invoice_payments` records

---

### GF-004-TC-004: Multi-Invoice Payment — Allocation Mismatch (Should Fail)

**Role:** Accounting
**Priority:** P1

**Steps:**
1. Enter payment total: $1,000.00
2. Set allocations totaling $800.00 (doesn't match)
3. Attempt submit
4. **Verify:** Validation error — allocations must sum to payment total (within $0.01)
5. **Verify:** No payment recorded

---

### GF-004-TC-005: Invoice Void

**Role:** Accounting
**Priority:** P0

**Prerequisites:**
- Invoice with status SENT, amountDue = $1,000.00
- Record client.totalOwed before void

**Steps:**
1. Open invoice detail
2. Click "Void" button
3. Confirm void action
4. **Verify:** Invoice status → VOID
5. **Verify:** `amountDue = $0.00`

6. **CROSS-MODULE: GL Reversal**
   - **Verify:** If any GL entries existed for this invoice, reversing entries created

7. **CROSS-MODULE: Client Balance**
   - **Verify:** `client.totalOwed` reduced by $1,000.00
   - **Verify:** Uses `GREATEST(0, ...)` so balance never goes negative

---

### GF-004-TC-006: Payment Void

**Role:** Accounting
**Priority:** P0

**Prerequisites:**
- Invoice PAID with payment of $500.00
- GL entries exist for the payment

**Steps:**
1. Navigate to payment record
2. Click "Void Payment"
3. Confirm
4. **Verify:** Payment soft-deleted
5. **Verify:** Invoice status reverts (PAID → SENT or previous status)
6. **Verify:** `invoice.amountPaid` decreased by $500.00
7. **Verify:** `invoice.amountDue` increased by $500.00

8. **CROSS-MODULE: GL Reversal**
   - **Verify:** Reversing entries created:
     - CR: Cash $500.00 (PMT-REV-{id}-CR)
     - DR: AR $500.00 (PMT-REV-{id}-DR)
   - **Verify:** GL still balanced

9. **CROSS-MODULE: Client Balance**
   - **Verify:** `client.totalOwed` increased by $500.00

---

### GF-004-TC-007: Void Multi-Invoice Payment

**Role:** Accounting
**Priority:** P1

**Prerequisites:**
- Multi-invoice payment (3 invoices) from TC-002

**Steps:**
1. Void the multi-invoice payment
2. **Verify:** All 3 invoices revert to previous status
3. **Verify:** Each invoice's amountPaid and amountDue restored
4. **Verify:** All 3 `invoice_payments` junction records handled
5. **Verify GL:** Single set of reversing entries for the full payment amount
6. **Verify:** Client balance increased by full payment amount

---

### GF-004-TC-008: All Payment Methods

**Role:** Accounting
**Priority:** P2

**For each method** (CASH, CHECK, WIRE, ACH, CREDIT_CARD, DEBIT_CARD, OTHER):
1. Record payment using this method
2. **Verify:** Payment recorded with correct method
3. **Verify:** GL entries created identically regardless of method
4. **Verify:** Payment displays correct method in UI

---

### GF-004-TC-009: Payment Exceeds Invoice Amount (Should Fail)

**Role:** Accounting
**Priority:** P1

**Steps:**
1. Invoice amountDue = $100.00
2. Attempt payment of $200.00
3. **Verify:** Rejected (exceeds amountDue beyond $0.01 tolerance)
4. **Verify:** No payment recorded, no GL entries

---

### GF-004-TC-010: Invoice Already PAID — Cannot Pay Again

**Role:** Accounting
**Priority:** P1

**Steps:**
1. Invoice in PAID status (amountDue = $0.00)
2. Attempt to record another payment
3. **Verify:** System blocks — nothing to pay
4. **Verify:** No duplicate payment recorded

---

### GF-004-TC-011: Void Invoice That Has Payments

**Role:** Accounting
**Priority:** P1

**Prerequisites:**
- Invoice with $1,000 total, $600 paid (PARTIAL status)

**Steps:**
1. Void the invoice
2. **Verify:** Invoice → VOID
3. **Verify:** Existing payment handled (voided or adjusted)
4. **Verify GL:** All related entries reversed
5. **Verify:** Client balance adjusted correctly — not negative

---

### GF-004-TC-012: Concurrent Payment Recording (Optimistic Lock)

**Role:** Accounting
**Priority:** P1

**Steps:**
1. Open same invoice in two tabs
2. Tab 1: Record $300 payment, submit
3. Tab 2: Record $300 payment, submit
4. **Verify:** One succeeds, one fails with version conflict
5. **Verify:** Invoice amount correct — not double-counted

---

## GF-005: Pick & Pack

### Overview
Two parallel systems: pickPack Router (bag-based workflow) and orders Router (fulfillment status). Manages the warehouse process of picking items from batches and packing them into bags for shipment.

**PickPack Status:** PENDING → PICKING → PACKED → READY
**Bag Identifiers:** BAG-001, BAG-002, etc.
**All pickPack Endpoints:** Require `adminProcedure` (admin role)
**Sample Orders:** Use `sampleQty` pool instead of regular inventory

---

### GF-005-TC-001: Happy Path — Pick, Pack, and Mark Ready

**Role:** Super Admin (admin required for pickPack)
**Priority:** P0

**Prerequisites:**
- Confirmed order with 2 line items (Blue Dream 50g, OG Kush 30g)
- Both batches have sufficient onHandQty

**Steps:**

1. **Navigate to Pick/Pack**
   - Go to `/fulfillment` or pick/pack module
   - Find the order in the queue
   - **Verify:** Order shows pickPackStatus = PENDING

2. **Start Picking (PENDING → PICKING)**
   - Click "Start Picking" or begin pick process
   - **Verify:** Status changes to PICKING

3. **Pack Items into Bags**
   - Select Item 1 (Blue Dream 50g)
   - Pack into BAG-001
   - Select Item 2 (OG Kush 30g)
   - Pack into BAG-001 (same bag) or BAG-002 (separate bag)
   - **Verify:** Items associated with bag identifier(s)
   - **Verify:** Status changes to PACKED

4. **Mark Order Ready (PACKED → READY)**
   - Click "Mark Ready" or equivalent
   - **Verify:** Validates all items are packed
   - **Verify:** Status = READY

5. **Proceed to Ship**
   - Ship the order (fulfillment side)
   - **Verify:** For each allocation, batch row locked (FOR UPDATE)
   - **Verify:** `batch.reservedQty` decremented per line item
   - **Verify:** SALE movement created per batch
   - **Verify:** Fulfillment status → SHIPPED

---

### GF-005-TC-002: Mark All Packed (Bulk Operation)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Order with 5 line items in PICKING status
2. Click "Mark All Packed" (packs all items into one bag)
3. **Verify:** All items assigned to BAG-001
4. **Verify:** Status → PACKED
5. Mark ready
6. **Verify:** Status → READY

---

### GF-005-TC-003: Unpack Item (Requires Reason)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Order with packed items (status PACKED)
2. Select a packed item
3. Click "Unpack"
4. **Verify:** System requires reason (min 1 character)
5. Enter reason: "Wrong batch picked"
6. Confirm unpack
7. **Verify:** Item unpacked, removed from bag
8. **Verify:** Audit log entry created with unpack reason
9. **Verify:** Cannot mark order READY until all items re-packed

---

### GF-005-TC-004: Unpack Without Reason (Should Fail)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Attempt to unpack an item with empty reason string
2. **Verify:** Validation error — reason required (min length 1)
3. **Verify:** Item remains packed

---

### GF-005-TC-005: Sample Order — Uses sampleQty Pool

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Batch with `sampleQty >= 10`, `onHandQty >= 100`
- Order type = SAMPLE with 10g line item

**Steps:**
1. Navigate to pick/pack for the sample order
2. Pick and pack the items
3. Ship the order
4. **Verify:** `batch.sampleQty` decreased by 10 (NOT onHandQty or reservedQty)
5. **Verify:** SAMPLE movement type created (not SALE)
6. **Verify:** `batch.onHandQty` unchanged
7. **Verify:** No invoice can be generated for this order

---

### GF-005-TC-006: Ship Validates State Machine

**Role:** Super Admin
**Priority:** P1

**Steps — Try shipping from invalid states:**
1. Order in DRAFT → attempt ship → **Verify:** REJECTED (must be at least CONFIRMED)
2. Order in CANCELLED → attempt ship → **Verify:** REJECTED
3. Order already DELIVERED → attempt ship again → **Verify:** REJECTED
4. Order in CONFIRMED → ship directly → **Verify:** ACCEPTED (skip-step allowed)

---

### GF-005-TC-007: Available Quantity Check During Picking

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Batch: onHand=100, reserved=80, quarantine=10, hold=5
   - Available = max(0, 100 - 80 - 10 - 5) = max(0, 5) = 5
2. Try to pick 10 from this batch
3. **Verify:** System warns/blocks — only 5 available
4. Pick 5 instead
5. **Verify:** Succeeds

---

### GF-005-TC-008: Non-Admin Cannot Access PickPack

**Role:** Sales Manager
**Priority:** P1

**Steps:**
1. Login as `qa.salesmanager@terp.test`
2. Navigate to pick/pack endpoints
3. **Verify:** Access denied — all pickPack endpoints require `adminProcedure`
4. **Verify:** Cannot pick, pack, unpack, or mark ready

---

## GF-006: Client Ledger

### Overview
Navigation flow: Dashboard → Client List → Client Profile → Client Ledger. Shows transaction history with running balance, aging buckets, and supports manual adjustments and CSV export.

**Transaction Types:** SALE (+debit), PURCHASE (-credit), PAYMENT_RECEIVED (-credit), PAYMENT_SENT (+debit), CREDIT (-credit), DEBIT (+debit)
**Balance Convention:** Positive = "they owe you" (red), Negative = "you owe them" (green), Zero = "Balance is even"
**Aging Buckets:** Current (0-30d), 30 Days (31-60d), 60 Days (61-90d), 90+ Days (>90d)

---

### GF-006-TC-001: Happy Path — View Client Ledger

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Client "QA Buyer Corp" has transaction history (orders, invoices, payments)

**Steps:**

1. **Dashboard Navigation**
   - Navigate to `/dashboard`
   - **Verify:** TotalDebtWidget shows AR/AP totals
   - **Verify:** ClientDebtLeaderboard shows top debtors with aging
   - If "QA Buyer Corp" appears in leaderboard, click their row

2. **Client List**
   - Navigate to `/clients`
   - Search or find "QA Buyer Corp"
   - Click to open client profile

3. **Client Profile**
   - **Verify:** Client name, teriCode, contact info displayed
   - **Verify:** `totalOwed` figure visible
   - Click "Ledger" tab or navigate to ledger view

4. **Client Ledger View**
   - **Verify:** Transaction list loads with pagination (50/page)
   - **Verify:** Each transaction shows: date, type, description, amount, running balance
   - **Verify:** Running balance is chronological
   - **Verify:** Positive balances shown in red ("they owe you")
   - **Verify:** Negative balances shown in green ("you owe them")
   - **Verify:** Zero balance states "Balance is even"

5. **Verify Aging Buckets**
   - **Verify:** Aging display shows:
     - Current (0-30 days)
     - 30 Days (31-60 days)
     - 60 Days (61-90 days)
     - 90+ Days (> 90 days)
   - **Verify:** Totals per bucket match outstanding invoices by age

---

### GF-006-TC-002: Manual Adjustment — Credit

**Role:** Super Admin or Accounting
**Priority:** P1

**Prerequisites:**
- Client with known totalOwed balance (e.g., $1,000.00)
- Login with role that has `accounting:create` permission

**Steps:**
1. Navigate to client ledger
2. Click "Add Adjustment" or equivalent
3. Select type: CREDIT
4. Enter amount: $150.00 (must be positive)
5. Enter notes: "Courtesy discount for delayed shipment" (required)
6. Submit

7. **Verify:** New CREDIT entry appears in ledger (-$150.00)
8. **Verify:** Running balance decreased by $150.00
9. **Verify:** `client.totalOwed` decreased by $150.00

---

### GF-006-TC-003: Manual Adjustment — Debit

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Navigate to client ledger
2. Add Adjustment: type = DEBIT, amount = $200.00
3. Notes: "Restocking fee"
4. Submit

5. **Verify:** DEBIT entry appears (+$200.00)
6. **Verify:** Running balance increased by $200.00
7. **Verify:** `client.totalOwed` increased by $200.00

---

### GF-006-TC-004: Manual Adjustment — Missing Notes (Should Fail)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Attempt to add adjustment with empty notes
2. **Verify:** Validation error — notes required
3. **Verify:** No adjustment recorded

---

### GF-006-TC-005: Manual Adjustment — Negative Amount (Should Fail)

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Attempt to add adjustment with amount = -$50.00
2. **Verify:** Validation error — amount must be positive
3. **Verify:** No adjustment recorded

---

### GF-006-TC-006: Manual Adjustment — Permission Denied (Sales Manager)

**Role:** Sales Manager
**Priority:** P1

**Steps:**
1. Login as `qa.salesmanager@terp.test`
2. Navigate to client ledger
3. Attempt to add adjustment
4. **Verify:** "Add Adjustment" button hidden or disabled
5. **Verify:** Cannot add adjustment — requires `accounting:create` permission

---

### GF-006-TC-007: CSV Export

**Role:** Super Admin
**Priority:** P2

**Steps:**
1. Navigate to client ledger for "QA Buyer Corp" (teriCode = QBC or similar)
2. Click "Export CSV" or equivalent
3. **Verify:** File downloads with name format `ledger_{teriCode}_{date}.csv`
4. **Verify:** CSV contains all transactions in chronological order
5. **Verify:** Columns include: date, type, description, amount, running balance
6. **Verify:** Data matches what is displayed in the UI

---

### GF-006-TC-008: Balance Invariant Check

**Role:** Super Admin
**Priority:** P0

**Steps:**
1. Navigate to client profile
2. Note the displayed `totalOwed`
3. Navigate to client ledger
4. Sum all transaction amounts (debits - credits) to compute expected balance
5. **Verify (INV-005):** `clients.totalOwed` matches computed balance from all transactions
6. If mismatch found → **P0 BUG — data integrity violation**

---

### GF-006-TC-009: Dashboard Widget — Total Debt

**Role:** Super Admin
**Priority:** P2

**Steps:**
1. Navigate to Dashboard
2. Check TotalDebtWidget
3. **Verify:** Shows total AR (what clients owe you) and total AP (what you owe vendors)
4. Click on a row in the widget
5. **Verify:** Navigates to that client's profile/ledger

---

### GF-006-TC-010: Pagination

**Role:** Super Admin
**Priority:** P2

**Prerequisites:**
- Client with > 50 transactions

**Steps:**
1. Navigate to client ledger
2. **Verify:** First page shows 50 transactions
3. Click "Next" or scroll to load more
4. **Verify:** Additional transactions load
5. **Verify:** Running balance is continuous across pages

---

## GF-007: Inventory Management

### Overview
Batch-level inventory tracking with multiple quantity buckets, status management, adjustments, quarantine, and movement history.

**Batch Status Machine:** AWAITING_INTAKE → LIVE → PHOTOGRAPHY_COMPLETE → ON_HOLD → QUARANTINED → SOLD_OUT → CLOSED
**Quantity Buckets:** onHand, reserved, quarantine, hold, defective, sample
**Adjustment Bounds:** ±1,000,000
**Optimistic Locking:** Version column — conflict = OPTIMISTIC_LOCK_CONFLICT error

---

### GF-007-TC-001: Happy Path — Batch Status Transitions

**Role:** Inventory
**Priority:** P0

**Prerequisites:**
- Login as `qa.inventory@terp.test`
- Batch in AWAITING_INTAKE status with onHandQty > 0

**Steps:**

1. **AWAITING_INTAKE → LIVE**
   - Open batch detail
   - Change status to LIVE
   - **Verify:** Status = LIVE
   - **Verify:** Batch now available for orders

2. **LIVE → PHOTOGRAPHY_COMPLETE**
   - Change status to PHOTOGRAPHY_COMPLETE
   - **Verify:** Status updated

3. **LIVE → ON_HOLD**
   - From a LIVE batch, change to ON_HOLD
   - **Verify:** Status = ON_HOLD
   - **Verify:** holdQty may be updated depending on implementation

4. **ON_HOLD → LIVE**
   - Release from hold
   - **Verify:** Status back to LIVE

5. **LIVE → QUARANTINED**
   - Quarantine the batch
   - **Verify:** Status = QUARANTINED
   - **Verify (quarantine sync):** `quarantineQty += onHandQty`, `onHandQty = 0`
   - **Verify:** QUARANTINE movement created

6. **QUARANTINED → LIVE**
   - Release from quarantine
   - **Verify:** Status = LIVE
   - **Verify (quarantine sync):** `onHandQty += quarantineQty`, `quarantineQty = 0`
   - **Verify:** RELEASE_FROM_QUARANTINE movement created

---

### GF-007-TC-002: Inventory Adjustment — Positive

**Role:** Inventory
**Priority:** P0

**Prerequisites:**
- Batch with onHandQty = 100

**Steps:**
1. Navigate to batch detail
2. Click "Adjust" on the onHandQty field
3. Enter adjustment: `+50`
4. Enter reason: "Recount found additional stock"
5. Submit

6. **Verify:** `onHandQty = 150` (100 + 50)
7. **Verify:** ADJUSTMENT movement created with qty = +50, reason stored
8. **Verify:** version column incremented (optimistic lock)

---

### GF-007-TC-003: Inventory Adjustment — Negative

**Role:** Inventory
**Priority:** P0

**Prerequisites:**
- Batch with onHandQty = 100

**Steps:**
1. Adjust onHandQty by `-30`
2. Reason: "Damaged in storage"
3. Submit

4. **Verify:** `onHandQty = 70` (100 - 30)
5. **Verify:** ADJUSTMENT movement with qty = -30
6. **Verify:** Reason = "Damaged in storage"
7. **Verify:** `onHandQty >= 0` invariant maintained

---

### GF-007-TC-004: Adjustment Without Reason (Should Fail)

**Role:** Inventory
**Priority:** P1

**Steps:**
1. Attempt adjustment with empty reason
2. **Verify:** REASON_REQUIRED error
3. **Verify:** No adjustment recorded

---

### GF-007-TC-005: Adjustment Exceeds Bounds (Should Fail)

**Role:** Inventory
**Priority:** P1

**Steps:**
1. Attempt adjustment of `+1,000,001` (exceeds ±1,000,000)
2. **Verify:** ADJUSTMENT_TOO_LARGE error
3. **Verify:** No adjustment recorded

Also test: `-1,000,001`

---

### GF-007-TC-006: Adjustment Would Make Quantity Negative (Should Fail)

**Role:** Inventory
**Priority:** P0

**Prerequisites:**
- Batch with onHandQty = 20

**Steps:**
1. Attempt adjustment of `-50` on onHandQty
2. **Verify:** Error — would result in negative quantity
3. **Verify:** `onHandQty` remains 20

---

### GF-007-TC-007: Optimistic Lock Conflict

**Role:** Inventory
**Priority:** P1

**Steps:**
1. Open batch detail in two browser tabs
2. Tab 1: Adjust onHandQty +10, submit (succeeds)
3. Tab 2: Adjust onHandQty +5, submit (uses stale version)
4. **Verify:** Tab 2 gets OPTIMISTIC_LOCK_CONFLICT error
5. **Verify:** Batch has correct value from Tab 1's adjustment only

---

### GF-007-TC-008: Available Quantity Derivation

**Role:** Inventory
**Priority:** P0

**Prerequisites:**
- Batch with onHand=200, reserved=50, quarantine=10, hold=20

**Steps:**
1. Navigate to batch detail
2. **Verify:** Available qty displayed = `200 - 50 - 10 - 20 = 120`
3. **Verify:** Available qty is derived (not stored) — recalculates on each view

---

### GF-007-TC-009: Adjustment Reasons Dropdown

**Role:** Inventory
**Priority:** P2

**For each reason** (DAMAGED, EXPIRED, LOST, THEFT, COUNT_DISCREPANCY, QUALITY_ISSUE, REWEIGH, OTHER):
1. Select the reason
2. Submit adjustment
3. **Verify:** Reason stored correctly in adjustment/movement record

---

### GF-007-TC-010: Bulk Status Change

**Role:** Inventory
**Priority:** P2

**Steps:**
1. Select multiple batches (3+)
2. Attempt bulk status change (e.g., all LIVE → ON_HOLD)
3. **Verify:** Each transition validated individually
4. **Verify:** Invalid transitions for some batches don't block valid ones (or document actual behavior)

---

### GF-007-TC-011: Soft Delete — Batch Closure

**Role:** Inventory
**Priority:** P1

**Prerequisites:**
- Batch with onHandQty = 0

**Steps:**
1. Delete/close the batch
2. **Verify:** Status set to CLOSED (soft delete, not hard delete)
3. **Verify:** `deletedAt` timestamp set
4. **Verify:** Batch no longer appears in active inventory lists
5. **Verify:** Batch still accessible via "include archived" filter

**Negative test:** Batch with onHandQty > 0
1. Attempt delete
2. **Verify:** Blocked — cannot delete batch with remaining inventory

---

### GF-007-TC-012: Movement History

**Role:** Inventory
**Priority:** P1

**Steps:**
1. Navigate to batch detail → movements tab
2. **Verify:** All movements displayed chronologically
3. **Verify:** Each movement shows: type, quantity, reference, timestamp, actor
4. **Verify (INV-001):** `SUM(all movements) = current onHandQty`

---

### GF-007-TC-013: Invalid Status Transitions

**Role:** Inventory
**Priority:** P1

**Test each invalid transition:**
| From | Attempted To | Expected |
|------|-------------|----------|
| AWAITING_INTAKE | QUARANTINED | REJECTED |
| CLOSED | LIVE | REJECTED |
| SOLD_OUT | AWAITING_INTAKE | REJECTED |
| PHOTOGRAPHY_COMPLETE | AWAITING_INTAKE | REJECTED |

For each: attempt the transition and verify it is blocked with appropriate error message.

---

## GF-008: Sample Request

### Overview
Sample lifecycle: Request → Fulfill → Track Location → Return (optional) → Vendor Return (optional). Uses monthly allocation system (default 7.0g/month per client) and sources from sampleQty pool.

**Sample Status Machine:** PENDING → FULFILLED → RETURN_REQUESTED → RETURN_APPROVED → RETURNED → VENDOR_RETURN_REQUESTED → SHIPPED_TO_VENDOR → VENDOR_CONFIRMED (+CANCELLED)
**Monthly Allocation:** 7.0g/month default, stored in `sampleAllocations` table
**COGS Calculation:** FIXED uses unitCogs, RANGE uses midpoint `(min + max) / 2`
**Location Tracking:** WAREHOUSE → WITH_CLIENT → WITH_SALES_REP → RETURNED → LOST

---

### GF-008-TC-001: Happy Path — Create and Fulfill Sample Request

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Client "QA Buyer Corp" exists
- Batch "Blue Dream" with `sampleQty >= 5`, `sampleAvailable = 1`, `status = LIVE`
- Client has monthly allocation with remaining >= 5g

**Steps:**

1. **Create Sample Request**
   - Navigate to `/samples` or sample request module
   - Click "New Sample Request"
   - Select Client: "QA Buyer Corp"
   - Select Product/Batch: "Blue Dream"
   - Quantity: 5.0g
   - Notes: "For product evaluation"
   - Submit

2. **Verify Request Created**
   - **Verify:** Sample request status = PENDING
   - **Verify:** Quantity = 5.0000g
   - **Verify:** Client associated correctly

3. **Fulfill Sample Request (PENDING → FULFILLED)**
   - Click "Fulfill" (or "Approve" — note: FULFILLED is labeled "Approved" in UI)
   - **Verify:** Status = FULFILLED

4. **CROSS-MODULE: Verify Batch Impact**
   - Navigate to batch detail
   - **Verify:** `batch.sampleQty` decreased by 5.0000
   - **Verify:** `batch.onHandQty` unchanged (samples use separate pool)
   - **Verify:** SAMPLE movement created with qty = 5.0000

5. **CROSS-MODULE: Verify Allocation Updated**
   - **Verify:** Client's monthly allocation:
     - `usedQuantity` increased by 5.0
     - `remainingQuantity` decreased by 5.0

6. **Verify COGS Calculation**
   - If batch COGS mode = FIXED: `totalCost = 5.0 × unitCogs`
   - If batch COGS mode = RANGE: `totalCost = 5.0 × ((minCogs + maxCogs) / 2)`
   - **Verify:** totalCost on sample request matches expected

7. **Verify Location**
   - **Verify:** Location = WAREHOUSE (initial) or WITH_CLIENT (after fulfillment)
   - **Verify:** Location history entry created

---

### GF-008-TC-002: Sample Return Flow

**Role:** Super Admin
**Priority:** P1

**Prerequisites:**
- Sample in FULFILLED status

**Steps:**

1. **Request Return (FULFILLED → RETURN_REQUESTED)**
   - Click "Request Return"
   - Enter reason: "Client did not like the product"
   - Enter condition: "Unopened"
   - Submit
   - **Verify:** Status = RETURN_REQUESTED

2. **Approve Return (RETURN_REQUESTED → RETURN_APPROVED)**
   - Click "Approve Return"
   - **Verify:** Status = RETURN_APPROVED

3. **Complete Return (RETURN_APPROVED → RETURNED)**
   - Click "Complete Return"
   - **Verify:** Status = RETURNED
   - **Verify:** Location auto-set to RETURNED

4. **Known Gap Check:** Does return credit inventory back?
   - **Verify (document behavior):** Check if `batch.sampleQty` increases upon return
   - Per known gaps, return currently does NOT credit inventory — document this finding

---

### GF-008-TC-003: Vendor Return Flow

**Role:** Super Admin
**Priority:** P1

**Prerequisites:**
- Sample in RETURNED status (or FULFILLED if vendor return can be initiated directly)

**Steps:**

1. **Request Vendor Return (→ VENDOR_RETURN_REQUESTED)**
   - Click "Vendor Return Request"
   - **Verify:** Status = VENDOR_RETURN_REQUESTED

2. **Ship to Vendor (→ SHIPPED_TO_VENDOR)**
   - Click "Ship to Vendor"
   - Enter tracking number (required)
   - **Verify:** Status = SHIPPED_TO_VENDOR
   - **Verify:** Tracking number stored

3. **Confirm Vendor Receipt (→ VENDOR_CONFIRMED)**
   - Click "Confirm Vendor Receipt"
   - **Verify:** Status = VENDOR_CONFIRMED

---

### GF-008-TC-004: Monthly Allocation Limit

**Role:** Super Admin
**Priority:** P0

**Prerequisites:**
- Client monthly allocation: 7.0g total, 6.5g used, 0.5g remaining

**Steps:**
1. Create sample request for 1.0g
2. **Verify:** Rejected — exceeds remaining allocation (0.5g remaining, 1.0g requested)
3. Create sample request for 0.5g
4. **Verify:** Accepted — within allocation

---

### GF-008-TC-005: Inventory Sourcing Priority

**Role:** Super Admin
**Priority:** P1

**Prerequisites:**
- Batch A: sampleOnly=1, sampleQty=10
- Batch B: sampleAvailable=1, sampleOnly=0, sampleQty=50

**Steps:**
1. Create sample request for 5g
2. **Verify:** System sources from Batch A first (`sampleOnly DESC` ordering)
3. **Verify:** Batch A's sampleQty decreased, Batch B unchanged

---

### GF-008-TC-006: Cancel Sample Request

**Role:** Super Admin
**Priority:** P1

**Steps:**
1. Create sample request (status PENDING)
2. Cancel the request
3. **Verify:** Status = CANCELLED
4. **Verify:** No inventory deducted
5. **Verify:** Allocation not affected

---

### GF-008-TC-007: Due Date in Notes (Known Gap)

**Role:** Super Admin
**Priority:** P2

**Steps:**
1. Create sample request with notes: "Due Date: 2026-03-15"
2. Fulfill the request
3. **Verify:** Due date is parsed from notes by `extractDueDate` function
4. **Verify:** Due date displays correctly in UI

**Known gap:** Due date stored in notes field, not a dedicated column. Document behavior.

---

### GF-008-TC-008: Permission Tests

**Role:** Various
**Priority:** P1

| Action | Required Permission | Test Role | Expected |
|--------|-------------------|-----------|----------|
| View samples | `samples:read` | All roles | Allowed |
| Create request | `samples:create` | Super Admin | Allowed |
| Fulfill | `samples:allocate` | Super Admin | Allowed |
| Approve return | `samples:approve` | Super Admin | Allowed |
| Track location | `samples:track` | Super Admin | Allowed |
| Delete sample | `samples:delete` | Super Admin | Allowed |
| Vendor return | `samples:vendorReturn` | Super Admin | Allowed |
| Create request | `samples:create` | Auditor | DENIED |

For each denied case, verify the UI hides the action button or returns permission error.

---

### GF-008-TC-009: Location Tracking History

**Role:** Super Admin
**Priority:** P2

**Steps:**
1. Fulfill a sample (location = WAREHOUSE → WITH_CLIENT)
2. Update location to WITH_SALES_REP
3. Update location to RETURNED
4. Navigate to sample detail → location history
5. **Verify:** All location changes recorded chronologically
6. **Verify:** Each entry shows: location, timestamp, actor

---

### GF-008-TC-010: Batch with Zero sampleQty (Should Fail to Source)

**Role:** Super Admin
**Priority:** P1

**Prerequisites:**
- All available batches for the product have sampleQty = 0

**Steps:**
1. Create sample request
2. Attempt to fulfill
3. **Verify:** Fulfillment fails — no batch has sufficient sampleQty
4. **Verify:** Status remains PENDING

---

## Cross-Module Integration Tests

### Overview
These tests verify that changes in one module correctly cascade to all dependent modules. They validate the full dependency chain: Orders → Inventory → GL → AR → Client Ledger.

---

### XMOD-001: Full End-to-End — Order to Payment with All Verifications

**Role:** Super Admin
**Priority:** P0

**This is the master integration test.** It traces a single transaction from order creation through to final payment, verifying every cross-module impact at each step.

**Prerequisites:**
- Client: "QA Integration Client" with payment terms NET_30
- Batch: "Integration Test Flower" with onHandQty = 500, reservedQty = 0, sampleQty = 20
- Record ALL starting values:
  - `batch.onHandQty` = 500
  - `batch.reservedQty` = 0
  - `client.totalOwed` = $0.00
  - GL total debits = X, GL total credits = X (balanced)

**Steps:**

1. **Create Order** (100g at $10.00/g = $1,000.00)
   - **After:** batch unchanged (DRAFT doesn't reserve), client unchanged, GL unchanged

2. **Confirm Order**
   - **After:**
     - `batch.reservedQty` = 100 (+100)
     - `batch.onHandQty` = 500 (unchanged)
     - `availableQty` = 500 - 100 = 400
     - RESERVE movement exists
     - Client unchanged, GL unchanged

3. **Pack and Ship Order**
   - **After:**
     - `batch.reservedQty` = 0 (-100 — reservation released)
     - `batch.onHandQty` = 400 (-100 — stock shipped)
     - SALE movement exists (qty = 100)
     - Client unchanged, GL unchanged (no invoice yet)

4. **Generate Invoice**
   - **After:**
     - Invoice: totalAmount = $1,000.00, amountDue = $1,000.00, status = DRAFT
     - `client.totalOwed` = $1,000.00 (+$1,000)
     - Client ledger: SALE entry +$1,000.00
     - GL unchanged (invoice generation alone may not create GL entries)

5. **Record Payment ($1,000.00)**
   - **After:**
     - Invoice: status = PAID, amountPaid = $1,000.00, amountDue = $0.00
     - `client.totalOwed` = $0.00 (-$1,000)
     - Client ledger: PAYMENT_RECEIVED entry -$1,000.00
     - GL: DR Cash $1,000 / CR AR $1,000 (entries balanced)

6. **Final State Verification:**
   - `batch.onHandQty` = 400, `batch.reservedQty` = 0 ✓
   - `client.totalOwed` = $0.00 ✓
   - GL: total debits = total credits ✓
   - Client ledger running balance for this transaction = $0.00 ✓
   - Invoice fully paid, no outstanding balance ✓

---

### XMOD-002: PO Receiving → Order → Invoice → Payment (Full Round-Trip)

**Role:** Super Admin
**Priority:** P0

**Tests:** Inventory enters via PO (GF-002), sold via Order (GF-003), invoiced (GF-004), paid, and GL balanced throughout.

**Steps:**
1. Create and receive PO for 200g at $5.00/g (total cost: $1,000.00)
2. Verify batch created: onHandQty = 200, unitCogs = $5.00
3. Create and confirm order for 100g at $15.00/g
4. Verify reservation: reservedQty = 100, onHandQty still 200
5. Ship order
6. Verify: onHandQty = 100, reservedQty = 0
7. Generate invoice: $1,500.00
8. Record payment: $1,500.00
9. **Verify GL final state:** All entries balanced, both AP (from bill) and AR (from invoice) entries present

---

### XMOD-003: Direct Intake → Sample → Client Ledger (No Invoice)

**Role:** Super Admin
**Priority:** P1

**Tests:** Inventory enters via Direct Intake (GF-001), sample dispensed (GF-008), no invoice generated, client ledger reflects sample.

**Steps:**
1. Direct intake: 100g with sampleQty = 50
2. Create sample request for client: 5g
3. Fulfill sample
4. Verify: batch.sampleQty decreased by 5
5. Verify: NO invoice generated (samples are free)
6. Verify: Client ledger may or may not show sample entry (document behavior)
7. Verify: GL entries exist for COGS if applicable

---

### XMOD-004: Invoice Void → Client Ledger → GL Reversal

**Role:** Super Admin
**Priority:** P0

**Tests:** Voiding an invoice correctly cascades: removes from client balance, reverses GL, updates ledger.

**Steps:**
1. Generate invoice for $2,000.00 on client
2. Verify: client.totalOwed increased by $2,000
3. Record partial payment of $800.00
4. Verify: client.totalOwed = $1,200.00
5. Void the invoice
6. Verify: client.totalOwed adjusted (back to original minus the $800 payment handling)
7. Verify GL: Reversing entries for both the invoice and the payment
8. Verify client ledger: Void entry appears

---

### XMOD-005: Concurrent Operations — Two Orders on Same Batch

**Role:** Super Admin
**Priority:** P1

**Tests:** Two simultaneous orders drawing from the same batch maintain data integrity.

**Prerequisites:**
- Batch: onHandQty = 100, reservedQty = 0

**Steps:**
1. Create Order A for 60g, Create Order B for 60g (total 120 > available 100)
2. Confirm Order A
3. Verify: reservedQty = 60, availableQty = 40
4. Attempt to confirm Order B (requesting 60, only 40 available)
5. **Verify:** Order B confirmation fails — insufficient available quantity
6. **Verify:** No partial reservation — either all or nothing
7. **Verify:** Batch state: onHandQty = 100, reservedQty = 60

---

### XMOD-006: Quarantine Impact on Orders

**Role:** Super Admin
**Priority:** P1

**Tests:** Quarantining a batch that has reserved inventory.

**Prerequisites:**
- Batch: onHandQty = 200, reservedQty = 50

**Steps:**
1. Quarantine the batch
2. **Verify:** Status = QUARANTINED
3. **Verify:** quarantineQty = 200 (old onHandQty), onHandQty = 0
4. **Verify:** reservedQty unchanged at 50
5. **Verify:** availableQty = max(0, 0 - 50 - 200 - 0) = 0
6. **Verify:** Existing confirmed orders with reservations — can they still be shipped?
7. Release from quarantine
8. **Verify:** onHandQty restored, reservedQty preserved

---

### XMOD-007: Payment Void → Invoice → Client Ledger Chain

**Role:** Super Admin
**Priority:** P0

**Tests:** Voiding a payment correctly cascades through invoice status and client balance.

**Steps:**
1. Invoice $500, pay $500 (PAID)
2. Verify: client.totalOwed decreased, GL has payment entries
3. Void the payment
4. Verify: Invoice status reverts from PAID
5. Verify: client.totalOwed increased back
6. Verify GL: Reversing entries (CR Cash / DR AR)
7. Verify client ledger: Both original payment and reversal entries visible

---

## Global Invariant Checks

Run these checks after EVERY test that modifies data. A failure in any invariant is automatically **P0 — Critical**.

### INV-CHECK-001: GL Balance
```
Navigate to /accounting/gl
Filter by any date range
Verify: SUM(all debit entries) = SUM(all credit entries)
Tolerance: $0.00 (must be EXACT)
```

### INV-CHECK-002: Invoice Math
```
For every invoice modified in the test:
Verify: amountDue = totalAmount - amountPaid
Verify: amountDue >= 0
Verify: amountPaid >= 0
Verify: amountPaid <= totalAmount
```

### INV-CHECK-003: Client Balance Reconciliation
```
For every client affected:
Verify: client.totalOwed = SUM(all unpaid invoices.amountDue)
Alternative: client.totalOwed = SUM(all ledger transactions net amount)
```

### INV-CHECK-004: Inventory Non-Negative
```
For every batch modified:
Verify: onHandQty >= 0
Verify: reservedQty >= 0
Verify: sampleQty >= 0
Verify: quarantineQty >= 0
Verify: holdQty >= 0
```

### INV-CHECK-005: Order Total
```
For every order modified:
Verify: order.total = SUM(lineItems.lineTotal)
Each lineTotal = quantity × unitPrice
```

### INV-CHECK-006: Reserved Qty Consistency
```
For every batch with reservations:
Verify: batch.reservedQty = SUM(qty from all CONFIRMED but not yet SHIPPED orders referencing this batch)
```

### INV-CHECK-007: Movement Sum
```
For every batch:
Verify: SUM(all inventory movements for this batch) = batch.onHandQty
```

### INV-CHECK-008: Decimal Precision
```
For all monetary values:
Verify: stored with DECIMAL(15,4) precision
Verify: no floating point artifacts (e.g., $10.00 not $9.9999999)
```

---

## Test Execution Notes

### Severity Classification
| Level | Criteria | Examples |
|-------|----------|---------|
| **P0** | Data loss, money wrong, security | Missing GL entry, negative inventory, wrong payment amount |
| **P1** | Feature broken, data inconsistent | Form won't submit, wrong totals displayed |
| **P2** | Edge case, cosmetic | Empty state missing, misaligned UI |
| **P3** | Polish | Could be cleaner UX |

### Test Result Recording
For each test case, record:
- **Test ID:** (e.g., GF-003-TC-001)
- **Status:** PASS / FAIL / BLOCKED / SKIPPED
- **Actual Result:** What happened
- **Expected Result:** What should have happened
- **Evidence:** Screenshots, values observed, error messages
- **Severity:** P0-P3 (for failures)
- **Notes:** Additional context

### Execution Order Recommendation
1. **Phase 1 (Core):** Run all P0 tests: GF-001-TC-001, GF-003-TC-001, GF-003-TC-002/003, GF-004-TC-001/005/006, GF-007-TC-001/002/006, GF-008-TC-001/004, XMOD-001
2. **Phase 2 (Functional):** Run all P1 tests
3. **Phase 3 (Edge Cases):** Run all P2 tests
4. **Phase 4 (Regression):** Global invariant checks across all data modified

### Known Issues to Track
| ID | Issue | Impact | Flow |
|----|-------|--------|------|
| BUG-112 | Form fields not rendering in Direct Intake | Blocks GF-001 UI tests | GF-001 |
| DUP-MOVEMENT | Duplicate inventory movement inserts in PO receiving | Double-counted inventory | GF-002 |
| HARD-DELETE | POs use hard delete instead of soft delete | Data loss risk | GF-002 |
| SECURITY-001 | `createdBy` comes from client input | Actor impersonation | GF-002 |
| NO-RECEIVE-UI | No receiving UI for POs | May need API-level testing | GF-002 |
| SAMPLE-RETURN | Return doesn't credit inventory back | sampleQty not restored | GF-008 |
| DUE-DATE-NOTES | Due date stored in notes, not dedicated column | Fragile parsing | GF-008 |
