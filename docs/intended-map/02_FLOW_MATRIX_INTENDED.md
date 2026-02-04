# Intended End-to-End Flow Matrix

**Purpose:** Comprehensive catalog of all user flows with dependencies and variants
**Created:** 2026-01-29
**CSV Version:** `02_FLOW_MATRIX_INTENDED.csv`

---

## Flow Types

| Type | Description | Count |
|------|-------------|-------|
| GoldenFlow | Critical user journeys, must work for release | 8 |
| SupportingFlow | Supporting operations used by golden flows | 5+ |
| AdminFlow | Administrative operations | TBD |

---

## Golden Flow Summary

| ID | Name | Module | Status | Blockers |
|----|------|--------|--------|----------|
| GF-001 | Direct Intake | Inventory | BLOCKED | BUG-112: Form fields not rendering |
| GF-002 | Procure-to-Pay | Purchasing | PARTIAL | PO Receiving UI not implemented |
| GF-003 | Order-to-Cash | Sales | BLOCKED | SQL error on inventory load |
| GF-004 | Invoice & Payment | Accounting | IMPLEMENTED | PDF generation timeout (minor) |
| GF-005 | Pick & Pack | Fulfillment | FUNCTIONAL | Depends on GF-003 |
| GF-006 | Client Ledger | Accounting | FUNCTIONAL | Data inconsistencies |
| GF-007 | Inventory Management | Inventory | BLOCKED | Shows 0 batches |
| GF-008 | Sample Request | Sales | PARTIAL | Fulfillment UI gap |

---

## Flow Dependencies

### Cross-Flow Dependency Graph

```
GF-001 (Direct Intake)
    │
    ├──▶ GF-007 (Inventory Management) ◀── GF-002 (Procure-to-Pay)
    │         │
    │         ▼
    │    GF-003 (Order-to-Cash)
    │         │
    │         ├──▶ GF-004 (Invoice & Payment)
    │         │         │
    │         │         ▼
    │         │    GF-006 (Client Ledger)
    │         │
    │         └──▶ GF-005 (Pick & Pack)
    │
    └──▶ FEAT-008 (Intake Verification)

GF-008 (Sample Request)
    │
    ├──▶ GF-007 (uses sample inventory)
    └──▶ GF-003 (conversion to order)
```

### Dependency Matrix

| Flow | Depends On | Depended By |
|------|------------|-------------|
| GF-001 | - | GF-007, FEAT-008 |
| GF-002 | - | GF-007, GF-004 (AP) |
| GF-003 | GF-007 | GF-004, GF-005 |
| GF-004 | GF-003 | GF-006 |
| GF-005 | GF-003 | - |
| GF-006 | GF-003, GF-004 | - |
| GF-007 | GF-001, GF-002 | GF-003, GF-008 |
| GF-008 | GF-007 | GF-003 (optional) |

---

## Detailed Flow Specifications

### GF-001: Direct Intake

**Module:** Inventory
**Entry:** `/inventory` → "New Intake" button
**Owner Role:** Inventory Manager

#### Preconditions
- [ ] User authenticated with `inventory:create` permission
- [ ] At least one supplier exists (client with `isSeller=true`)
- [ ] Product categories configured in settings

#### Steps (Happy Path)
1. **Navigate** to Inventory page (`/inventory`)
2. **Click** "New Intake" button in header
3. **PurchaseModal** opens with form
4. **Enter** supplier information:
   - Vendor Name (required, autocomplete)
   - Brand Name (required, autocomplete)
5. **Enter** product information:
   - Category (required, dropdown)
   - If Flower: Strain Name (required, autocomplete)
   - If Other: Product Name (required, free text)
   - Grade (optional/required per settings)
6. **Enter** quantity: positive decimal
7. **Enter** cost: COGS Mode (Fixed/Range), amounts
8. **Enter** payment terms: COD, NET_*, CONSIGNMENT, PARTIAL
9. **Select** storage location (optional)
10. **Upload** media files (optional)
11. **Click** "Create Intake"
12. **System** uploads media (if any)
13. **System** validates all inputs
14. **System** creates: Lot, Batch (`AWAITING_INTAKE`), Inventory Movement
15. **Success** toast shown, modal closes
16. **Inventory list** refreshes with new batch

#### Error Paths
| Error | Cause | Recovery |
|-------|-------|----------|
| Validation error | Required field missing | Show field-level error |
| API error | Server failure | Show toast, allow retry |
| Media upload fail | File too large/invalid type | Show error, continue without media |

#### Side Effects
- Creates record in `lots` table
- Creates record in `batches` table with `status='AWAITING_INTAKE'`
- Creates record in `inventory_movements` with `type='INTAKE'`
- Links media files to batch (if uploaded)
- Audit: `createdBy` set to current user

#### Invariants Enforced
- INV-001: `onHandQty >= 0` (initialized positive)
- INV-006: `onHandQty` matches intake quantity
- INV-007: `createdBy` populated

---

### GF-003: Order-to-Cash

**Module:** Sales
**Entry:** `/orders` → "Create Order" button
**Owner Role:** Sales Rep, Sales Manager

#### Preconditions
- [ ] User authenticated with `orders:create` permission
- [ ] At least one customer exists (client with `isBuyer=true`)
- [ ] Sellable batches available (`status='LIVE'`, `availableQty > 0`)

#### Steps (Happy Path)
1. **Navigate** to Orders page (`/orders`)
2. **Click** "Create Order" or "New Order"
3. **Select** customer from dropdown
4. **Add products** from available batches:
   - Search/browse products
   - Select batch with available qty
   - Enter quantity
   - Review pricing/margin
5. **Set** order type: QUOTE or SALE
6. **Review** order totals
7. **Save** as draft OR **Confirm** immediately
8. *If confirming:*
   - System validates inventory availability
   - System reserves inventory (`reservedQty += qty`)
   - Order status → `confirmed`
9. **Generate Invoice** (via GF-004)
10. **Collect Payment** (via GF-004)
11. **Fulfill Order** (via GF-005)

#### State Transitions
```
draft → confirmed → invoiced → shipped → delivered
  │                    │
  └── cancelled ◀──────┘ (before ship only)
```

#### Side Effects
- Creates `orders` record
- Creates `order_items` records
- On confirm: updates `batches.reservedQty`
- On ship: updates `batches.onHandQty`, creates `inventory_movements`

#### Invariants Enforced
- INV-001: Cannot oversell (`availableQty >= requestedQty`)
- INV-002: `order.total = sum(line_items.subtotal)`
- INV-008: Only valid state transitions

---

### GF-004: Invoice & Payment

**Module:** Accounting
**Entry:** `/accounting/invoices`
**Owner Role:** Accounting Manager

#### Preconditions
- [ ] User authenticated with `accounting:read` permission
- [ ] Invoice exists (generated from confirmed order)
- [ ] For payment: `accounting:create` permission

#### Steps (Happy Path)
1. **Navigate** to Invoices (`/accounting/invoices`)
2. **View** invoice list with status filters
3. **Select** invoice to view in inspector panel
4. **Review** invoice details:
   - Line items and amounts
   - Payment history
   - Status
5. **Click** "Record Payment"
6. **Enter** payment details:
   - Amount (default: amount due)
   - Payment method
   - Reference number
   - Date
7. **Submit** payment
8. **System validates**:
   - Amount <= amountDue
   - Invoice not VOID or PAID
9. **System creates** payment record
10. **System updates** invoice:
    - amountPaid += payment amount
    - status → PARTIAL or PAID
11. **System posts** GL entries:
    - Debit: Cash account
    - Credit: Accounts Receivable
12. **System syncs** client balance
13. **Success** toast shown

#### Multi-Invoice Payment (Alternative)
1. Navigate to client payment screen
2. View outstanding invoices
3. Select multiple invoices
4. Allocate payment amount
5. Submit multi-invoice payment
6. System creates single payment, multiple junction records

#### Side Effects
- Creates `payments` record
- Creates `invoice_payments` junction records
- Creates `gl_entries` (Debit Cash, Credit AR)
- Updates `invoices.amountPaid`
- Updates `clients.totalOwed` via `syncClientBalance()`

---

## Supporting Flows

### FLOW-001: User Login

**Entry:** `/login`
**Roles:** All

**Steps:**
1. Navigate to login page
2. Enter email and password
3. Submit credentials
4. System validates credentials
5. System creates session
6. Redirect to dashboard or requested page

**QA Testing:** Use accounts from `docs/qa/QA_PLAYBOOK.md`

### FLOW-002: Create Client

**Entry:** `/clients` → "Create Client"
**Roles:** Sales Manager, Super Admin

**Steps:**
1. Navigate to Clients
2. Click "Create Client"
3. Fill required fields (name)
4. Set `isSeller` and/or `isBuyer` flags
5. Save

**Validation:** Name is required; duplicate warning if similar name exists

---

## Flow Coverage Requirements

### By Role

| Role | Must-Work Flows |
|------|-----------------|
| Super Admin | All flows |
| Sales Manager | GF-003, GF-008, FLOW-002 |
| Sales Rep | GF-003 (own), GF-008 |
| Inventory Manager | GF-001, GF-002, GF-007 |
| Accounting Manager | GF-004, GF-006 |
| Fulfillment | GF-005 |
| Auditor | Read-only all |

### By Module

| Module | Flows |
|--------|-------|
| Inventory | GF-001, GF-007 |
| Purchasing | GF-002 |
| Sales | GF-003, GF-008 |
| Accounting | GF-004, GF-006 |
| Fulfillment | GF-005 |
