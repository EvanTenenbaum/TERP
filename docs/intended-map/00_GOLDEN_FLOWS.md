# Golden Flows Summary

**Purpose:** Define the 8 critical user journeys that TERP must support for release
**Created:** 2026-01-29
**Source:** `docs/golden-flows/specs/GF-*.md`

---

## Definition

**Golden Flows** are the minimum set of end-to-end user journeys that must function correctly for TERP to be considered "release-ready." They are:
- High-frequency operations
- Business-critical (revenue, inventory, compliance)
- Cross-module interactions
- Role-gated workflows

---

## Golden Flows Registry

| ID | Name | Owner Role | Entry Point | Priority |
|----|------|------------|-------------|----------|
| GF-001 | Direct Intake | Inventory | `/inventory` | P0 |
| GF-002 | Procure-to-Pay | Inventory/Accounting | `/purchase-orders` | P0 |
| GF-003 | Order-to-Cash | Sales/Fulfillment | `/orders` | P0 |
| GF-004 | Invoice & Payment | Accounting | `/accounting/invoices` | P0 |
| GF-005 | Pick & Pack | Fulfillment | `/pick-pack` | P0 |
| GF-006 | Client Ledger Review | Accounting | `/clients/:id/ledger` | P1 |
| GF-007 | Inventory Management | Inventory | `/inventory` | P0 |
| GF-008 | Sample Request | Sales | `/samples` | P1 |

---

## GF-001: Direct Intake

**Intent Source:** `docs/golden-flows/specs/GF-001-DIRECT-INTAKE.md` v3.0

### Description
Add inventory batches directly into the system without requiring a Purchase Order. Primary method for recording supplier arrivals.

### Preconditions
- User authenticated with Inventory role
- At least one supplier exists (`clients` with `isSeller=true`)
- Product categories configured

### Steps
1. Navigate to Inventory page (`/inventory`)
2. Click "New Intake" button
3. Fill intake form: Vendor, Brand, Category, Product/Strain, Quantity, COGS, Payment Terms, Location
4. Optionally upload media files
5. Click "Create Intake"
6. System creates: Lot, Batch (status: AWAITING_INTAKE), Inventory Movement
7. Success toast displayed, modal closes

### Expected Outcomes
- Batch created with `status=AWAITING_INTAKE`
- `onHandQty` set to intake quantity
- Audit trail: `createdBy` populated
- Media files linked if uploaded

### Invariants Referenced
- INV-001: `inventory.onHandQty >= 0`
- INV-006: `batch.onHandQty = initialQty - sum(allocations)`
- INV-007: Audit trail exists for all mutations

### Cross-Flow Touchpoints
- GF-007: New batches appear in inventory management
- FEAT-008: Verification workflow transitions batch to LIVE

### Role Requirements
- Inventory Manager: Full access
- Super Admin: Full access

---

## GF-002: Procure-to-Pay

**Intent Source:** `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md` v1.1

### Description
Complete purchasing cycle from PO creation through goods receipt and vendor payment.

### Preconditions
- User authenticated with Inventory or Accounting role
- At least one supplier exists
- Products defined in catalog

### Steps
1. Navigate to Purchase Orders (`/purchase-orders`)
2. Click "Create PO"
3. Select supplier, add line items (product, qty, cost)
4. Submit PO (status: DRAFT → SENT)
5. Vendor confirms (status: CONFIRMED)
6. Receive goods against PO
7. System creates: Lot, Batches, Inventory Movements
8. Record bill linked to PO
9. Pay bill through payments workflow

### Expected Outcomes
- PO created and tracked through lifecycle
- Batches created on receipt
- Bill created for AP
- GL entries posted on payment

### Invariants Referenced
- INV-001: `inventory.onHandQty >= 0`
- INV-004: `GL debits = GL credits`
- INV-007: Audit trail exists

### Cross-Flow Touchpoints
- GF-007: Received goods appear in inventory
- GF-004: Bill payment follows invoice/payment flow (AP side)

### Role Requirements
- Inventory Manager: PO creation, receiving
- Accounting Manager: Bill recording, payment

### Known Gaps
- PO Receiving UI not implemented (API-only)

---

## GF-003: Order-to-Cash

**Intent Source:** `docs/golden-flows/specs/GF-003-ORDER-TO-CASH.md` v1.2

### Description
Complete sales cycle from order creation through fulfillment and payment collection.

### Preconditions
- User authenticated with Sales or Fulfillment role
- Customer exists
- Sellable batches in inventory (`status=LIVE`, `availableQty > 0`)

### Steps
1. Navigate to Orders (`/orders`)
2. Create new order: select customer, add products from batches
3. Review pricing/margins
4. Save as draft or confirm
5. On confirm: inventory reserved (`reservedQty` incremented)
6. Generate invoice
7. Collect payment
8. Pick and pack order
9. Ship and deliver

### Expected Outcomes
- Order created with line items
- Inventory reserved on confirmation
- Invoice generated with correct totals
- Payment recorded, AR balance updated
- Order fulfilled and shipped

### Invariants Referenced
- INV-001: `inventory.onHandQty >= 0`
- INV-002: `order.total = sum(line_items.subtotal)`
- INV-003: `invoice.balance = total - amountPaid`
- INV-005: `client.totalOwed = sum(unpaid_invoices)`
- INV-008: Order state transitions follow valid paths

### Cross-Flow Touchpoints
- GF-004: Invoice and payment
- GF-005: Pick and pack fulfillment
- GF-007: Inventory decremented

### Role Requirements
- Sales Rep/Manager: Order creation
- Accounting Manager: Invoice, payment
- Fulfillment: Pick, pack, ship

---

## GF-004: Invoice & Payment

**Intent Source:** `docs/golden-flows/specs/GF-004-INVOICE-PAYMENT.md` v2.0

### Description
AR operations including invoice viewing, payment recording, and PDF generation.

### Preconditions
- User authenticated with Accounting role
- Invoice exists (generated from order)

### Steps
1. Navigate to Invoices (`/accounting/invoices`)
2. View invoice list with status filters
3. Select invoice to view details
4. Click "Record Payment"
5. Enter payment details: amount, method, reference
6. Submit payment
7. System validates amount <= amountDue
8. Payment created, invoice status updated
9. GL entries posted (Debit Cash, Credit AR)
10. Client balance synced

### Expected Outcomes
- Payment recorded against invoice
- Invoice status updated (PARTIAL or PAID)
- GL entries balanced
- Client `totalOwed` updated

### Invariants Referenced
- INV-003: `invoice.balance = total - amountPaid`
- INV-004: `GL debits = GL credits`
- INV-005: `client.totalOwed = sum(unpaid_invoices)`

### Cross-Flow Touchpoints
- GF-003: Invoice generated from order
- GF-006: Payment appears in client ledger

### Role Requirements
- Accounting Manager: Full access
- Super Admin: Full access

---

## GF-005: Pick & Pack

**Intent Source:** `docs/golden-flows/specs/GF-005-PICK-PACK.md` v2.0

### Description
Warehouse fulfillment operations for confirmed sales orders.

### Preconditions
- User authenticated with Fulfillment or Admin role
- Confirmed order exists with reserved inventory

### Steps
1. Navigate to Pick & Pack (`/pick-pack`)
2. View pick list queue with stats
3. Select order from queue
4. View order details and items
5. Pick items (select items, assign to bags)
6. Pack items (create bags, assign items)
7. Mark ready for shipping
8. Ship order (releases reserved inventory)
9. Mark delivered (optional)

### Expected Outcomes
- Items picked and packed into bags
- Order status: CONFIRMED → PICKED → PACKED → SHIPPED → DELIVERED
- `reservedQty` decremented on ship
- Inventory movement recorded (type: SALE)

### Invariants Referenced
- INV-001: `inventory.onHandQty >= 0`
- INV-006: `batch.onHandQty = initialQty - sum(allocations)`
- INV-007: Audit trail exists
- INV-008: Order state transitions follow valid paths

### Cross-Flow Touchpoints
- GF-003: Follows order confirmation
- GF-007: Inventory decremented

### Role Requirements
- Fulfillment: Full access
- Super Admin: Full access

---

## GF-006: Client Ledger Review

**Intent Source:** `docs/golden-flows/specs/GF-006-CLIENT-LEDGER.md` v1.2

### Description
AR/AP visibility with transaction history and aging analysis.

### Preconditions
- User authenticated with Accounting, Sales, or Admin role
- Client exists with transaction history

### Steps
1. View dashboard AR/AP widgets
2. Navigate to Clients (`/clients`)
3. Select client to view profile
4. Click "View Ledger"
5. View transaction history with running balance
6. Filter by date range, transaction type
7. Export to CSV (optional)
8. Add manual adjustment (optional)

### Expected Outcomes
- Complete transaction history displayed
- Running balance calculated correctly
- Aging buckets visible
- Export produces accurate CSV

### Invariants Referenced
- INV-003: `invoice.balance = total - amountPaid`
- INV-005: `client.totalOwed = sum(unpaid_invoices)`

### Cross-Flow Touchpoints
- GF-003: Orders create receivables
- GF-004: Payments reduce balance

### Role Requirements
- Accounting Manager: Full access
- Sales Manager: Read access
- Super Admin: Full access

---

## GF-007: Inventory Management

**Intent Source:** `docs/golden-flows/specs/GF-007-INVENTORY-MGMT.md` v1.1

### Description
Core inventory operations: view, filter, adjust, transfer batches.

### Preconditions
- User authenticated with Inventory role
- Batches exist in system

### Steps
1. Navigate to Inventory (`/inventory`)
2. View dashboard stats and batch list
3. Filter/search by SKU, status, category, etc.
4. Select batch to view details
5. Adjust quantity (with reason)
6. Change status (with validation)
7. Bulk operations on multiple batches

### Expected Outcomes
- Inventory displayed with accurate counts
- Adjustments recorded with audit trail
- Status changes validated (quarantine sync)
- Movements logged

### Invariants Referenced
- INV-001: `inventory.onHandQty >= 0`
- INV-006: `batch.onHandQty = initialQty - sum(allocations)`
- INV-007: Audit trail exists

### Cross-Flow Touchpoints
- GF-001: Intake creates batches
- GF-002: PO receipt creates batches
- GF-003/GF-005: Sales/fulfillment decrements

### Role Requirements
- Inventory Manager: Full access
- Super Admin: Full access

---

## GF-008: Sample Request

**Intent Source:** `docs/golden-flows/specs/GF-008-SAMPLE-REQUEST.md` v1.1

### Description
Sales sample distribution to clients and prospects.

### Preconditions
- User authenticated with Sales role
- Sample inventory available (`sampleAvailable=1` or `sampleOnly=1` batches)
- Monthly allocation not exceeded

### Steps
1. Navigate to Samples (`/samples`)
2. Click "New Sample"
3. Select product, client, quantity
4. Submit request (validates allocation)
5. Sample created with PENDING status
6. Fulfill request (decrements `sampleQty`)
7. Update location (WAREHOUSE → WITH_CLIENT)
8. Track conversion to sale

### Expected Outcomes
- Sample request created and tracked
- `sampleQty` decremented on fulfillment
- Monthly allocation tracked
- Location history maintained

### Invariants Referenced
- INV-001: `inventory.onHandQty >= 0`
- INV-007: Audit trail exists

### Cross-Flow Touchpoints
- GF-007: Sample inventory tracked
- GF-003: Sample conversion to order

### Role Requirements
- Sales Rep: Create, view own samples
- Sales Manager: View all samples
- Super Admin: Full access

### Known Gaps
- Fulfillment UI not exposed (API-only noted)

---

## Implementation Status Summary

| Flow | Status | Primary Blocker |
|------|--------|-----------------|
| GF-001 | BLOCKED | BUG-112: Form fields not rendering |
| GF-002 | PARTIAL | PO Receiving UI not implemented |
| GF-003 | BLOCKED | SQL error on inventory load |
| GF-004 | IMPLEMENTED | PDF generation timeout (minor) |
| GF-005 | FUNCTIONAL | Depends on GF-003 |
| GF-006 | FUNCTIONAL | Data inconsistencies |
| GF-007 | BLOCKED | Shows 0 batches |
| GF-008 | PARTIAL | Fulfillment UI gap |

**Source:** `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md` (Jan 26, 2026 QA Checkpoint)
