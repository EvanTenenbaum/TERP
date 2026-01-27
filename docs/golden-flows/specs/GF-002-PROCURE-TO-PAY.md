# GF-002: Procure-to-Pay Golden Flow Specification

**Version:** 1.0
**Status:** Draft
**Created:** 2026-01-27
**Last Updated:** 2026-01-27

---

## Overview

The Procure-to-Pay (P2P) flow covers the complete purchasing cycle from creating purchase orders through receiving goods and recording vendor bills. This flow creates inventory batches and accounts payable entries.

---

## User Journey

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Create    │───▶│   Select    │───▶│  Add Line   │───▶│   Submit    │───▶│   Receive   │───▶│   Record    │
│     PO      │    │  Supplier   │    │    Items    │    │     PO      │    │    Goods    │    │    Bill     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 1. Create Purchase Order
- Navigate to Purchase Orders page (`/purchase-orders`)
- Click "Create PO" button
- System generates unique PO number (format: `PO-YYYY-NNNN`)

### 2. Select Supplier
- Choose supplier from dropdown (clients with `isSeller=true`)
- Supplier contact info auto-populated
- Payment terms can be set (Net 15, Net 30, Net 45, Net 60, Due on Receipt, COD)

### 3. Add Line Items
- Select products from inventory catalog
- Enter quantity ordered (must be > 0)
- Enter unit cost (must be >= 0)
- Line total calculated automatically (quantity × unit cost)
- Can add multiple line items
- PO total calculated as sum of all line totals

### 4. Submit Purchase Order
- Review PO details
- Add internal notes and/or supplier notes
- Set expected delivery date (optional)
- Click "Create Purchase Order"
- PO status: DRAFT → SENT (when submitted to supplier)
- Supplier can confirm → CONFIRMED

### 5. Receive Goods
- Navigate to receiving workflow
- Select confirmed PO to receive
- For each line item:
  - Enter received quantity
  - Assign location (optional)
  - Enter lot number (optional)
  - Enter expiration date (optional)
- System creates:
  - New lot record
  - New batch records (one per received item)
  - Inventory movements (INTAKE type)
- PO status updates based on received quantities:
  - Partial receipt → RECEIVING
  - Full receipt → RECEIVED

### 6. Record Bill
- Create bill linked to PO (reference type: `PURCHASE_ORDER`)
- Enter bill details:
  - Bill number
  - Bill date
  - Due date (based on payment terms)
  - Line items (can differ from PO if needed)
- Bill creates AP entry
- Pay bill through payments workflow

---

## UI States

### Purchase Orders List Screen

| State | Visual | Actions |
|-------|--------|---------|
| Loading | Spinner, "Loading purchase orders..." | None |
| Error | Red alert with error message | Retry button |
| Empty | "No purchase orders found" message | Create PO button |
| Loaded | Table with PO list | View, Delete, Filter, Search |

### Create PO Dialog

| State | Visual | Actions |
|-------|--------|---------|
| Initial | Empty form | Fill form, Cancel |
| Validation Error | Field-level error messages | Fix errors |
| Submitting | "Creating..." button disabled | Wait |
| Success | Toast: "Purchase order created" | Auto-close |
| Error | Toast with error message | Retry |

### PO Detail/Inspector Panel

| State | Visual | Actions |
|-------|--------|---------|
| No Selection | "Select a purchase order to view details" | None |
| Selected | Full PO details with items | Update status, Delete |
| Status Update | Status badge dropdown | Select new status |

### Receiving Screen

| State | Visual | Actions |
|-------|--------|---------|
| No Pending POs | Empty state message | None |
| Pending POs List | Cards with PO details | Select to receive |
| Receiving Form | Line items with qty inputs | Enter received qty, Submit |
| Partial Receive | Warning indicator | Continue or complete |
| Over-receive Warning | Yellow warning | Acknowledge and proceed |

### Bills Screen

| State | Visual | Actions |
|-------|--------|---------|
| Draft | Edit all fields | Edit, Delete |
| Pending | View only, awaiting approval | Approve, Void |
| Approved | Ready for payment | Record payment |
| Partial | Shows paid vs. due amounts | Record additional payment |
| Paid | Fully paid indicator | View only |
| Overdue | Red indicator with days overdue | Record payment |
| Void | Strikethrough styling | None |

---

## API Endpoints

### Purchase Orders Router (`server/routers/purchaseOrders.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `purchaseOrders.list` | Query | List POs with pagination, filtering by status/supplier |
| `purchaseOrders.getAll` | Query | Get all POs (legacy, use `.list` instead) |
| `purchaseOrders.getById` | Query | Get PO by ID with items and supplier details |
| `purchaseOrders.getByIdWithDetails` | Query | Get PO with full product info |
| `purchaseOrders.create` | Mutation | Create new PO with line items |
| `purchaseOrders.update` | Mutation | Update PO fields |
| `purchaseOrders.updateStatus` | Mutation | Update PO status |
| `purchaseOrders.delete` | Mutation | Delete PO (cascades to items) |
| `purchaseOrders.submit` | Mutation | Submit PO (DRAFT → SENT) |
| `purchaseOrders.confirm` | Mutation | Confirm PO (SENT → CONFIRMED) |
| `purchaseOrders.addItem` | Mutation | Add line item to PO |
| `purchaseOrders.updateItem` | Mutation | Update line item |
| `purchaseOrders.deleteItem` | Mutation | Remove line item |
| `purchaseOrders.getBySupplier` | Query | Get POs for a supplier |
| `purchaseOrders.getByProduct` | Query | Get POs containing a product |

### PO Receiving Router (`server/routers/poReceiving.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `poReceiving.receive` | Mutation | Receive PO items, create batches |
| `poReceiving.receiveGoodsWithBatch` | Mutation | Enhanced receiving with location assignment |
| `poReceiving.getReceivingHistory` | Query | Get receiving history for a PO |
| `poReceiving.getPOItemsWithReceipts` | Query | Get PO items with received quantities |
| `poReceiving.getPendingReceiving` | Query | Get POs pending receiving |
| `poReceiving.getStats` | Query | Get receiving statistics |
| `poReceiving.getAvailableLocations` | Query | Get locations for receiving |

### Accounting Router - Bills (`server/routers/accounting.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `accounting.bills.list` | Query | List bills with filters |
| `accounting.bills.getById` | Query | Get bill by ID |
| `accounting.bills.create` | Mutation | Create bill with line items |
| `accounting.bills.update` | Mutation | Update bill |
| `accounting.bills.updateStatus` | Mutation | Update bill status |
| `accounting.bills.recordPayment` | Mutation | Record payment against bill |
| `accounting.bills.getOutstandingPayables` | Query | Get unpaid bills |
| `accounting.bills.getAPAging` | Query | Get AP aging report |
| `accounting.bills.generateNumber` | Query | Generate next bill number |

---

## Data Model

### purchase_orders Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `poNumber` | VARCHAR(50) | Unique PO number (e.g., PO-2026-0001) |
| `supplierClientId` | INT | FK to clients.id (canonical) |
| `vendorId` | INT | FK to vendors.id (DEPRECATED) |
| `intakeSessionId` | INT | FK to intake_sessions.id (optional) |
| `purchaseOrderStatus` | ENUM | DRAFT, SENT, CONFIRMED, RECEIVING, RECEIVED, CANCELLED |
| `orderDate` | DATE | Date PO was created |
| `expectedDeliveryDate` | DATE | Expected delivery (optional) |
| `actualDeliveryDate` | DATE | Actual delivery date |
| `subtotal` | DECIMAL(15,2) | Sum of line items |
| `tax` | DECIMAL(15,2) | Tax amount |
| `shipping` | DECIMAL(15,2) | Shipping cost |
| `total` | DECIMAL(15,2) | Grand total |
| `paymentTerms` | VARCHAR(100) | Payment terms |
| `paymentDueDate` | DATE | Payment due date |
| `notes` | TEXT | Internal notes |
| `vendorNotes` | TEXT | Notes visible to vendor |
| `createdBy` | INT | FK to users.id |
| `createdAt` | TIMESTAMP | Creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |
| `sentAt` | TIMESTAMP | When PO was sent |
| `confirmedAt` | TIMESTAMP | When PO was confirmed |

### purchase_order_items Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `purchaseOrderId` | INT | FK to purchase_orders.id |
| `productId` | INT | FK to products.id |
| `quantityOrdered` | DECIMAL(15,4) | Quantity ordered |
| `quantityReceived` | DECIMAL(15,4) | Quantity received so far |
| `unitCost` | DECIMAL(15,4) | Cost per unit |
| `totalCost` | DECIMAL(15,4) | Line total |
| `notes` | TEXT | Line item notes |
| `createdAt` | TIMESTAMP | Creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

### lots Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `code` | VARCHAR(50) | Unique lot code (e.g., LOT-20260127-001) |
| `supplierClientId` | INT | FK to clients.id |
| `vendorId` | INT | FK to vendors.id (DEPRECATED) |
| `date` | TIMESTAMP | Lot date |
| `notes` | TEXT | Lot notes |
| `deletedAt` | TIMESTAMP | Soft delete timestamp |

### batches Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `code` | VARCHAR(50) | Unique batch code |
| `sku` | VARCHAR(100) | Unique SKU |
| `productId` | INT | FK to products.id |
| `lotId` | INT | FK to lots.id |
| `batchStatus` | ENUM | AWAITING_INTAKE, IN_STOCK, etc. |
| `onHandQty` | DECIMAL(15,4) | Available quantity |
| `reservedQty` | DECIMAL(15,4) | Reserved for orders |
| `quarantineQty` | DECIMAL(15,4) | In quality hold |
| `unitCogs` | DECIMAL(12,4) | Cost of goods sold per unit |
| `cogsMode` | ENUM | FIXED, RANGE |
| `paymentTerms` | ENUM | COD, NET_7, NET_15, NET_30, etc. |
| `version` | INT | Optimistic locking version |
| `deletedAt` | TIMESTAMP | Soft delete timestamp |

### bills Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `billNumber` | VARCHAR(50) | Unique bill number |
| `vendorId` | INT | FK to clients.id (supplier) |
| `billDate` | DATE | Bill date |
| `dueDate` | DATE | Payment due date |
| `subtotal` | DECIMAL(12,2) | Sum of line items |
| `taxAmount` | DECIMAL(12,2) | Tax amount |
| `discountAmount` | DECIMAL(12,2) | Discount amount |
| `totalAmount` | DECIMAL(12,2) | Grand total |
| `amountPaid` | DECIMAL(12,2) | Amount paid so far |
| `amountDue` | DECIMAL(12,2) | Remaining balance |
| `status` | ENUM | DRAFT, PENDING, APPROVED, PARTIAL, PAID, OVERDUE, VOID |
| `paymentTerms` | VARCHAR(100) | Payment terms |
| `notes` | TEXT | Bill notes |
| `referenceType` | VARCHAR(50) | LOT, PURCHASE_ORDER, SERVICE |
| `referenceId` | INT | FK to reference entity |
| `createdBy` | INT | FK to users.id |
| `deletedAt` | TIMESTAMP | Soft delete timestamp |

### bill_line_items Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `billId` | INT | FK to bills.id |
| `productId` | INT | FK to products.id (optional) |
| `lotId` | INT | FK to lots.id (optional) |
| `description` | TEXT | Line item description |
| `quantity` | DECIMAL(10,2) | Quantity |
| `unitPrice` | DECIMAL(12,2) | Price per unit |
| `taxRate` | DECIMAL(5,2) | Tax rate percentage |
| `discountPercent` | DECIMAL(5,2) | Discount percentage |
| `lineTotal` | DECIMAL(12,2) | Line total |
| `deletedAt` | TIMESTAMP | Soft delete timestamp |

### inventory_movements Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `batchId` | INT | FK to batches.id |
| `inventoryMovementType` | ENUM | INTAKE, SALE, ADJUSTMENT, etc. |
| `quantityChange` | DECIMAL(15,4) | Change amount (can be negative) |
| `quantityBefore` | DECIMAL(15,4) | Quantity before change |
| `quantityAfter` | DECIMAL(15,4) | Quantity after change |
| `referenceType` | VARCHAR(50) | PO_RECEIPT, ORDER, REFUND, etc. |
| `referenceId` | INT | FK to reference entity |
| `notes` | TEXT | Movement notes |
| `performedBy` | INT | FK to users.id |
| `deletedAt` | TIMESTAMP | Soft delete timestamp |

---

## State Transitions

### Purchase Order Status

```
          ┌──────────────────────────────────────────┐
          │                                          │
          ▼                                          │
       DRAFT ──────▶ SENT ──────▶ CONFIRMED          │
          │                          │               │
          │                          ▼               │
          │                     RECEIVING ───────────┤
          │                          │               │
          │                          ▼               │
          └──────────────────▶ CANCELLED ◀──────────┘
                                     ▲
                                     │
                                 RECEIVED
```

| From | To | Trigger | Validation |
|------|----|---------|------------|
| DRAFT | SENT | `submit()` | Must have at least 1 line item |
| SENT | CONFIRMED | `confirm()` | PO must be in SENT status |
| CONFIRMED | RECEIVING | `receive()` | Partial receipt of items |
| RECEIVING | RECEIVING | `receive()` | Additional partial receipt |
| RECEIVING | RECEIVED | `receive()` | All items fully received |
| CONFIRMED | RECEIVED | `receive()` | All items received in one go |
| * | CANCELLED | `updateStatus()` | Admin action only |

### Bill Status

```
       DRAFT ──────▶ PENDING ──────▶ APPROVED
          │              │              │
          │              │              ▼
          │              │          PARTIAL ───────▶ PAID
          │              │              │
          │              │              │
          └──────────────┴──────────────┴──────────▶ VOID
                                        │
                                        ▼
                                    OVERDUE
```

| From | To | Trigger | Validation |
|------|----|---------|------------|
| DRAFT | PENDING | Submit for approval | All required fields filled |
| PENDING | APPROVED | Approve bill | Manager approval |
| APPROVED | PARTIAL | Payment recorded | Payment < amountDue |
| APPROVED | PAID | Payment recorded | Payment >= amountDue |
| PARTIAL | PARTIAL | Additional payment | Total paid < amountDue |
| PARTIAL | PAID | Final payment | Total paid >= amountDue |
| PENDING/APPROVED | OVERDUE | System check | dueDate < today |
| * | VOID | Void bill | Admin action |

---

## Business Rules

### Supplier Selection
- **RULE-001**: Supplier must be a client with `isSeller=true`
- **RULE-002**: Use `supplierClientId` (canonical) - `vendorId` is deprecated

### Purchase Order Validation
- **RULE-003**: Must have at least one line item before submission
- **RULE-004**: Quantity ordered must be > 0 for each line item
- **RULE-005**: Unit cost must be >= 0 for each line item
- **RULE-006**: PO total = sum of all line item totals

### Receiving Validation
- **RULE-007**: Cannot receive more than ordered (warning, not hard block)
- **RULE-008**: Received quantity must be >= 0
- **RULE-009**: Can only receive POs in CONFIRMED or RECEIVING status
- **RULE-010**: Each receipt creates inventory movement record

### Inventory Creation
- **RULE-011**: Receiving creates one lot per receiving session
- **RULE-012**: Receiving creates one batch per received line item
- **RULE-013**: Batch `unitCogs` = PO item `unitCost`
- **RULE-014**: Inventory movement type = INTAKE, referenceType = PO_RECEIPT

### Bill Recording
- **RULE-015**: Bill can reference PO via `referenceType=PURCHASE_ORDER`
- **RULE-016**: Bill `amountDue` = `totalAmount` - `amountPaid`
- **RULE-017**: Payment updates `amountPaid` and potentially `status`
- **RULE-018**: Soft delete only (use `deletedAt`)

---

## Error States

### Invalid Supplier
- **Error**: "Supplier not found or not a seller"
- **Cause**: Selected client doesn't have `isSeller=true`
- **Recovery**: Select a valid supplier from the dropdown

### Over-receiving
- **Warning**: "Receiving more than ordered"
- **Cause**: Received quantity > (ordered - already received)
- **Recovery**: Acknowledge warning, adjust if needed

### Invalid PO Status for Receiving
- **Error**: "Purchase order cannot be received from {status} status"
- **Cause**: Attempting to receive a DRAFT or CANCELLED PO
- **Recovery**: Confirm PO first or select a different PO

### Duplicate Bill Number
- **Error**: "Bill number already exists"
- **Cause**: Manually entered duplicate bill number
- **Recovery**: Use generated bill number or enter unique number

### Insufficient Payment Permission
- **Error**: "Unauthorized" or permission denied
- **Cause**: User lacks `accounting:create` or `accounting:update` permission
- **Recovery**: Contact admin for appropriate permissions

### Database Unavailable
- **Error**: "Database not available"
- **Cause**: Database connection issue
- **Recovery**: Retry operation, check system status

---

## Invariants

| Invariant | Description | Enforcement |
|-----------|-------------|-------------|
| **INV-001** | PO total = sum of line item totals | Calculated on save via `recalculatePOTotals()` |
| **INV-002** | received qty <= ordered qty (soft) | Warning logged, not hard blocked |
| **INV-003** | Bill amountDue = totalAmount - amountPaid | Calculated on payment recording |
| **INV-004** | Batch onHandQty >= 0 | Enforced at inventory movement level |
| **INV-005** | Inventory movement quantityAfter = quantityBefore + quantityChange | Enforced in transaction |
| **INV-006** | Every PO has unique poNumber | Database unique constraint |
| **INV-007** | Every batch has unique code and sku | Database unique constraints |
| **INV-008** | Actor attribution required | `createdBy` is NOT NULL |

---

## Cross-Flow Touchpoints

### GF-007: Inventory Management
- **Touch Point**: Receiving creates batches
- **Data Flow**: PO item → Batch (productId, unitCost → unitCogs, quantity → onHandQty)
- **Reference**: `poReceiving.receive()` and `poReceiving.receiveGoodsWithBatch()`

### GF-006: Accounts Payable
- **Touch Point**: Bill recording creates AP entries
- **Data Flow**: Bill → AP aging → Payment tracking
- **Reference**: `accounting.bills.create()`, `accounting.bills.recordPayment()`

### GF-003: Order-to-Cash (Indirect)
- **Touch Point**: Batches created here are sold in O2C flow
- **Data Flow**: Batch (onHandQty) → Order line item → Sale
- **Reference**: Batch availability for order fulfillment

### Client/Supplier Management
- **Touch Point**: Supplier selection from clients
- **Data Flow**: Client (isSeller=true) → PO.supplierClientId
- **Reference**: `clients.list({ clientTypes: ['seller'] })`

---

## Frontend Components

### Pages
- `client/src/pages/PurchaseOrdersPage.tsx` - Basic PO list and create
- `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx` - Enhanced Work Surface implementation

### Key UI Components
- PO list table with filtering and sorting
- Create PO dialog with supplier selection and line items
- Inspector panel for PO details
- Status badges with color coding
- Delete confirmation dialog

### Hooks Used
- `trpc.purchaseOrders.*` - PO CRUD operations
- `trpc.clients.list({ clientTypes: ['seller'] })` - Supplier selection
- `trpc.inventory.list` - Product selection for line items
- `useWorkSurfaceKeyboard` - Keyboard shortcuts
- `useSaveState` - Save state indicator
- `useInspectorPanel` - Inspector panel management

---

## Testing Scenarios

### Happy Path
1. Create PO with valid supplier and line items
2. Submit PO to supplier
3. Supplier confirms PO
4. Receive goods in full
5. Record bill for received goods
6. Pay bill in full

### Partial Receiving
1. Create and confirm PO with multiple items
2. Receive only some items
3. Verify PO status = RECEIVING
4. Receive remaining items
5. Verify PO status = RECEIVED

### Over-receiving
1. Create PO for 100 units
2. Attempt to receive 120 units
3. Verify warning is shown
4. Confirm receipt proceeds
5. Verify batch quantity = 120

### Bill Payment Flow
1. Create bill linked to PO
2. Record partial payment
3. Verify status = PARTIAL
4. Record remaining payment
5. Verify status = PAID

### Error Handling
1. Attempt PO with invalid supplier
2. Attempt receive on DRAFT PO
3. Attempt duplicate bill number
4. Verify appropriate error messages

---

## Appendix: Related Files

### Backend
- `server/routers/purchaseOrders.ts` - PO router
- `server/routers/poReceiving.ts` - Receiving router
- `server/routers/accounting.ts` - Bills/payments router
- `server/arApDb.ts` - AR/AP database functions

### Frontend
- `client/src/pages/PurchaseOrdersPage.tsx`
- `client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx`
- `client/src/components/inventory/PurchaseModal.tsx`

### Schema
- `drizzle/schema.ts` - All table definitions
  - `purchaseOrders` (line 224)
  - `purchaseOrderItems` (line 307)
  - `lots` (line 534)
  - `batches` (line 584)
  - `bills` (line 1174)
  - `billLineItems` (line 1220)
  - `inventoryMovements` (line 3381)

### Seeds
- `scripts/seed/seeders/seed-purchase-orders.ts`
- `scripts/seed/seeders/seed-vendor-bills.ts`
