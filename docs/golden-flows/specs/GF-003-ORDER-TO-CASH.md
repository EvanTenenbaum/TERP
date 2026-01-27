# GF-003: Order-to-Cash Golden Flow Specification

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-01-27
**Module:** Sales / Accounting

---

## 1. Overview

The Order-to-Cash (O2C) flow is TERP's most critical Golden Flow, covering the complete sales cycle from order creation through fulfillment and payment collection. This flow represents TERP's core value proposition for THCA wholesale operations.

### Business Purpose

- Create and manage customer orders (quotes and sales)
- Process orders through fulfillment workflow
- Generate invoices and collect payments
- Maintain accurate inventory and financial records
- Track customer accounts receivable

### Flow Summary

```
Order Creation → Confirmation → Invoice Generation → Payment Collection → Fulfillment → Delivery
```

---

## 2. User Journey

### 2.1 Primary Flow

1. **Navigate to Orders** (`/orders`)
   - View draft and confirmed orders tabs
   - Filter by status, order type, search

2. **Create New Order** (`/orders/create`)
   - Select customer (client with `isBuyer=true`)
   - Search and add products from available batches
   - Set quantities and review pricing/margins
   - Choose order type: QUOTE or SALE
   - Save as draft or confirm immediately

3. **Confirm Draft Order**
   - Review order details and inventory availability
   - Set payment terms (NET_7, NET_15, NET_30, COD, PARTIAL, CONSIGNMENT)
   - Confirm to reserve inventory

4. **Generate Invoice**
   - Invoice created from confirmed order
   - Invoice sent to customer
   - Invoice status tracked (DRAFT → SENT → VIEWED)

5. **Record Payment**
   - Apply payment against invoice(s)
   - Support partial payments and multi-invoice payments
   - Update AR balance and invoice status

6. **Fulfill Order**
   - Pick items from inventory
   - Pack order for shipment
   - Ship with tracking information
   - Mark as delivered

### 2.2 Alternative Flows

| Flow | Description | Starting Point |
|------|-------------|----------------|
| Quote Conversion | Convert approved quote to sale | Quote detail view |
| Draft Editing | Modify draft before confirmation | Draft order list |
| Partial Fulfillment | Ship subset of order items | Fulfillment screen |
| Returns Processing | Handle returned goods | Delivered order |

---

## 3. UI States

### 3.1 Orders List Page (`/orders`)

| State | Description | UI Elements |
|-------|-------------|-------------|
| Loading | Fetching orders | TableSkeleton component |
| Empty (Draft) | No draft orders | EmptyState with "Create Draft Order" CTA |
| Empty (Confirmed) | No confirmed orders | EmptyState informational message |
| Populated | Orders displayed | Order cards with status badges |
| Filtered | Search/filter applied | Filter chips, filtered results |

### 3.2 Order Creation Page (`/orders/create`)

| State | Description | UI Elements |
|-------|-------------|-------------|
| Client Selection | No client selected | Client selector dropdown |
| Product Selection | Adding items | Batch selection dialog, line item table |
| Pricing Review | Items added | OrderTotalsPanel, margin calculations |
| Validation Error | Invalid data | Error banners, field highlights |
| Submitting | Saving order | Loading spinner, disabled submit |

### 3.3 Order Detail Sheet

| State | Description | Actions Available |
|-------|-------------|-------------------|
| Draft | Order not confirmed | Edit, Confirm, Delete |
| Pending | Confirmed, awaiting pack | Mark as Packed, Process Return |
| Packed | Items picked | Mark as Shipped |
| Shipped | In transit | Mark as Delivered |
| Delivered | Order complete | Process Return |
| Returned | Items returned | Restock, Return to Vendor |

### 3.4 Invoice States

| State | Badge Color | Description |
|-------|-------------|-------------|
| DRAFT | Gray | Invoice created but not sent |
| SENT | Blue | Invoice sent to customer |
| VIEWED | Purple | Customer has viewed invoice |
| PARTIAL | Yellow | Partial payment received |
| PAID | Green | Fully paid |
| OVERDUE | Red | Past due date, not fully paid |
| VOID | Gray (strikethrough) | Invoice cancelled |

### 3.5 Payment Recording

| State | Description |
|-------|-------------|
| Invoice Selection | Choose invoice(s) to pay |
| Amount Entry | Enter payment amount |
| Method Selection | Choose payment method |
| Confirmation | Review and submit |
| Success | Payment recorded, balances updated |

---

## 4. API Endpoints

### 4.1 Orders Router (`server/routers/orders.ts`)

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `orders.create` | mutation | Create basic order | `orders:create` |
| `orders.createDraftEnhanced` | mutation | Create draft with COGS/margin | `orders:create` |
| `orders.getById` | query | Get order by ID | `orders:read` |
| `orders.getAll` | query | List orders with filters | `orders:read` |
| `orders.getByClient` | query | Get orders for client | `orders:read` |
| `orders.update` | mutation | Update order details | `orders:update` |
| `orders.delete` | mutation | Soft delete order | `orders:delete` |
| `orders.confirm` | mutation | Confirm draft order | `orders:create` |
| `orders.confirmDraftOrder` | mutation | Confirm with payment terms | `orders:create` |
| `orders.updateDraftOrder` | mutation | Update draft order | `orders:update` |
| `orders.updateDraftEnhanced` | mutation | Update draft with COGS | `orders:update` |
| `orders.finalizeDraft` | mutation | Finalize draft to confirmed | `orders:create` |
| `orders.convertQuoteToSale` | mutation | Convert quote to sale | `orders:create` |
| `orders.updateOrderStatus` | mutation | Change fulfillment status | `orders:update` |
| `orders.fulfillOrder` | mutation | Record picked quantities | `orders:update` |
| `orders.shipOrder` | mutation | Ship order with tracking | `orders:update` |
| `orders.deliverOrder` | mutation | Mark as delivered | `orders:update` |
| `orders.processReturn` | mutation | Process order return | `orders:update` |
| `orders.markAsReturned` | mutation | Mark order returned | `orders:update` |
| `orders.processRestock` | mutation | Restock returned items | `orders:update` |
| `orders.getOrderStatusHistory` | query | Get status history | `orders:read` |
| `orders.getNextStatuses` | query | Get valid next statuses | `orders:read` |
| `orders.allocateBatchesToLineItem` | mutation | Allocate batches to line item | `orders:update` |

### 4.2 Invoices Router (`server/routers/invoices.ts`)

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `invoices.list` | query | List invoices with filters | `accounting:read` |
| `invoices.getById` | query | Get invoice with line items | `accounting:read` |
| `invoices.generateFromOrder` | mutation | Create invoice from order | `accounting:create` |
| `invoices.updateStatus` | mutation | Update invoice status | `accounting:update` |
| `invoices.markSent` | mutation | Mark invoice as sent | `accounting:update` |
| `invoices.void` | mutation | Void invoice with GL reversal | `accounting:delete` |
| `invoices.getSummary` | query | Get invoice statistics | `accounting:read` |
| `invoices.checkOverdue` | mutation | Update overdue invoices | `accounting:update` |

### 4.3 Payments Router (`server/routers/payments.ts`)

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `payments.list` | query | List payments with filters | `accounting:read` |
| `payments.getById` | query | Get payment details | `accounting:read` |
| `payments.recordPayment` | mutation | Record payment against invoice | `accounting:create` |
| `payments.recordMultiInvoicePayment` | mutation | Pay multiple invoices | `accounting:create` |
| `payments.getByClient` | query | Get client payments | `accounting:read` |
| `payments.getClientSummary` | query | Get payment summary | `accounting:read` |
| `payments.getInvoicePaymentHistory` | query | Get payment history for invoice | `accounting:read` |
| `payments.getClientOutstandingInvoices` | query | Get outstanding invoices | `accounting:read` |
| `payments.void` | mutation | Void payment with GL reversal | `accounting:delete` |

---

## 5. Data Model

### 5.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     clients     │       │     orders      │       │ order_line_items│
│─────────────────│       │─────────────────│       │─────────────────│
│ id              │◄──────│ clientId        │       │ id              │
│ name            │       │ id              │◄──────│ orderId         │
│ isBuyer         │       │ orderNumber     │       │ batchId         │
│ totalOwed       │       │ orderType       │       │ quantity        │
│ creditLimit     │       │ isDraft         │       │ cogsPerUnit     │
└─────────────────┘       │ items (JSON)    │       │ unitPrice       │
                          │ total           │       │ lineTotal       │
                          │ fulfillmentStatus│       │ marginPercent   │
                          │ invoiceId       │       └─────────────────┘
                          └────────┬────────┘                │
                                   │                         │
                                   │                         ▼
                                   │              ┌─────────────────────────┐
                                   │              │order_line_item_allocations│
                                   │              │─────────────────────────│
                                   │              │ id                      │
                                   │              │ orderLineItemId         │
                                   │              │ batchId                 │
                                   │              │ quantityAllocated       │
                                   │              │ unitCost                │
                                   │              └─────────────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐       ┌─────────────────┐
                          │    invoices     │       │invoice_line_items│
                          │─────────────────│       │─────────────────│
                          │ id              │◄──────│ invoiceId       │
                          │ invoiceNumber   │       │ id              │
                          │ customerId      │       │ description     │
                          │ invoiceDate     │       │ quantity        │
                          │ dueDate         │       │ unitPrice       │
                          │ totalAmount     │       │ lineTotal       │
                          │ amountPaid      │       └─────────────────┘
                          │ amountDue       │
                          │ status          │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐       ┌─────────────────┐
                          │    payments     │       │ invoice_payments │
                          │─────────────────│       │─────────────────│
                          │ id              │◄──────│ paymentId       │
                          │ paymentNumber   │       │ invoiceId       │
                          │ customerId      │       │ allocatedAmount │
                          │ invoiceId       │       └─────────────────┘
                          │ amount          │
                          │ paymentMethod   │
                          │ paymentDate     │
                          └─────────────────┘
```

### 5.2 Key Tables

#### `orders`

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| version | INT | Optimistic locking |
| orderNumber | VARCHAR(50) | Unique order identifier |
| orderType | ENUM | QUOTE or SALE |
| isDraft | BOOLEAN | Draft vs confirmed status |
| clientId | INT | FK to clients |
| items | JSON | Order line items (legacy) |
| subtotal | DECIMAL(15,2) | Pre-tax/discount total |
| tax | DECIMAL(15,2) | Tax amount |
| discount | DECIMAL(15,2) | Discount amount |
| total | DECIMAL(15,2) | Final total |
| totalCogs | DECIMAL(15,2) | Total cost of goods sold |
| totalMargin | DECIMAL(15,2) | Total profit margin |
| avgMarginPercent | DECIMAL(5,2) | Average margin % |
| validUntil | DATE | Quote expiration (quotes only) |
| quoteStatus | ENUM | Quote-specific status |
| paymentTerms | ENUM | NET_7, NET_15, NET_30, COD, PARTIAL, CONSIGNMENT |
| cashPayment | DECIMAL(15,2) | Cash payment at time of sale |
| dueDate | DATE | Payment due date |
| saleStatus | ENUM | Sale-specific status |
| invoiceId | INT | FK to invoice (if generated) |
| fulfillmentStatus | ENUM | DRAFT, CONFIRMED, PENDING, PACKED, SHIPPED, DELIVERED, RETURNED, RESTOCKED, RETURNED_TO_VENDOR, CANCELLED |
| packedAt | TIMESTAMP | When order was packed |
| packedBy | INT | FK to users |
| shippedAt | TIMESTAMP | When order was shipped |
| shippedBy | INT | FK to users |
| confirmedAt | TIMESTAMP | When order was confirmed |
| createdBy | INT | FK to users |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |
| deletedAt | TIMESTAMP | Soft delete timestamp |

#### `order_line_items`

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| orderId | INT | FK to orders |
| batchId | INT | FK to batches |
| productDisplayName | VARCHAR(255) | Display name |
| quantity | DECIMAL(10,2) | Ordered quantity |
| cogsPerUnit | DECIMAL(10,2) | Cost per unit |
| originalCogsPerUnit | DECIMAL(10,2) | Original COGS before override |
| isCogsOverridden | BOOLEAN | Whether COGS was overridden |
| cogsOverrideReason | TEXT | Reason for override |
| marginPercent | DECIMAL(5,2) | Margin percentage |
| marginDollar | DECIMAL(10,2) | Margin in dollars |
| isMarginOverridden | BOOLEAN | Whether margin was overridden |
| marginSource | ENUM | CUSTOMER_PROFILE, DEFAULT, MANUAL |
| unitPrice | DECIMAL(10,2) | Selling price per unit |
| lineTotal | DECIMAL(10,2) | Total for line item |
| isSample | BOOLEAN | Whether item is a sample |

#### `invoices`

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| invoiceNumber | VARCHAR(50) | Unique invoice number |
| customerId | INT | FK to clients |
| invoiceDate | DATE | Invoice date |
| dueDate | DATE | Payment due date |
| subtotal | DECIMAL(12,2) | Pre-tax total |
| taxAmount | DECIMAL(12,2) | Tax amount |
| discountAmount | DECIMAL(12,2) | Discount amount |
| totalAmount | DECIMAL(12,2) | Final total |
| amountPaid | DECIMAL(12,2) | Amount paid to date |
| amountDue | DECIMAL(12,2) | Remaining balance |
| status | ENUM | DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID |
| paymentTerms | VARCHAR(100) | Payment terms text |
| notes | TEXT | Invoice notes |
| referenceType | VARCHAR(50) | SALE, ORDER, CONTRACT |
| referenceId | INT | FK to source record |
| createdBy | INT | FK to users |
| deletedAt | TIMESTAMP | Soft delete timestamp |

#### `payments`

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| paymentNumber | VARCHAR(50) | Unique payment number (PMT-YYYYMM-XXXXX) |
| paymentType | ENUM | RECEIVED (AR) or SENT (AP) |
| paymentDate | DATE | Payment date |
| amount | DECIMAL(12,2) | Payment amount |
| paymentMethod | ENUM | CASH, CHECK, WIRE, ACH, CREDIT_CARD, DEBIT_CARD, OTHER |
| referenceNumber | VARCHAR(100) | Check number, wire ref, etc. |
| bankAccountId | INT | FK to bank accounts |
| customerId | INT | FK to clients (AR payments) |
| invoiceId | INT | FK to invoices (single invoice) |
| notes | TEXT | Payment notes |
| isReconciled | BOOLEAN | Bank reconciliation status |
| reconciledAt | TIMESTAMP | When reconciled |
| createdBy | INT | FK to users |
| deletedAt | TIMESTAMP | Soft delete timestamp |

---

## 6. State Transitions

### 6.1 Fulfillment Status State Machine

```
                        ┌──────────────┐
                        │    DRAFT     │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
       │  CONFIRMED   │ │   PENDING    │ │  CANCELLED   │
       └──────┬───────┘ └──────┬───────┘ └──────────────┘
              │                │               (Terminal)
              ├────────────────┤
              │                │
              ▼                ▼
       ┌──────────────┐ ┌──────────────┐
       │    PACKED    │ │   SHIPPED    │◄────┐
       └──────┬───────┘ └──────┬───────┘     │
              │                │              │
              └────────┬───────┘              │
                       │                      │
                       ▼                      │
                ┌──────────────┐              │
                │   SHIPPED    │──────────────┘
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │  DELIVERED   │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │   RETURNED   │
                └──────┬───────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
       ┌──────────────┐ ┌────────────────────┐
       │  RESTOCKED   │ │ RETURNED_TO_VENDOR │
       └──────────────┘ └────────────────────┘
         (Terminal)           (Terminal)
```

### 6.2 Valid Transitions

| From Status | Valid Next Statuses |
|-------------|---------------------|
| DRAFT | CONFIRMED, PENDING, CANCELLED |
| CONFIRMED | PENDING, PACKED, SHIPPED, CANCELLED |
| PENDING | PACKED, SHIPPED, CANCELLED |
| PACKED | SHIPPED, PENDING, CANCELLED |
| SHIPPED | DELIVERED, RETURNED |
| DELIVERED | RETURNED |
| RETURNED | RESTOCKED, RETURNED_TO_VENDOR |
| RESTOCKED | (none - terminal) |
| RETURNED_TO_VENDOR | (none - terminal) |
| CANCELLED | (none - terminal) |

### 6.3 Invoice Status Transitions

| From Status | Valid Next Statuses |
|-------------|---------------------|
| DRAFT | SENT, VOID |
| SENT | VIEWED, PARTIAL, PAID, OVERDUE, VOID |
| VIEWED | PARTIAL, PAID, OVERDUE, VOID |
| PARTIAL | PAID, OVERDUE, VOID |
| OVERDUE | PARTIAL, PAID, VOID |
| PAID | VOID |
| VOID | (none - terminal) |

---

## 7. Business Rules

### 7.1 Order Creation

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-001 | Customer must be a client with `isBuyer=true` | API validation |
| BR-002 | Products must have available inventory | Batch availability check |
| BR-003 | Quantity must be positive | Schema validation |
| BR-004 | Unit price cannot be negative | Schema validation |
| BR-005 | Non-sample items must have price > 0 | API validation |
| BR-006 | COGS cannot be negative | Schema validation |

### 7.2 Order Confirmation

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-007 | Inventory reserved on confirm | Transaction with row locks |
| BR-008 | Sample orders decrement sampleQty | Separate inventory pool |
| BR-009 | Regular orders increment reservedQty | Prevents overselling |
| BR-010 | Order must have line items | API validation |
| BR-011 | Payment terms required for sales | Schema default |
| BR-012 | Rate limit: 10 confirms/minute/user | In-memory rate limiter |

### 7.3 Invoicing

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-013 | Only SALE orders can generate invoices | API validation |
| BR-014 | Order must be PENDING, PACKED, or SHIPPED | Status check |
| BR-015 | One invoice per order | Duplicate check |
| BR-016 | Due date calculated from payment terms | Automatic calculation |

### 7.4 Payments

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-017 | Payment amount must be positive | Schema validation |
| BR-018 | Payment cannot exceed invoice amountDue | API validation |
| BR-019 | Cannot pay voided invoices | Status check |
| BR-020 | Cannot pay fully paid invoices | Status check |
| BR-021 | GL entries created for each payment | Transaction |

### 7.5 Fulfillment

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-022 | Picked quantity cannot exceed ordered quantity | API validation |
| BR-023 | Cannot ship from terminal status | State machine |
| BR-024 | Shipping releases reserved inventory | Transaction |
| BR-025 | Inventory movements recorded on ship | Audit trail |

---

## 8. Error States

### 8.1 Order Creation Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Client not found` | Invalid clientId | Select valid client |
| `Batch not found` | Invalid batchId | Select valid batch |
| `Insufficient inventory` | Quantity > available | Reduce quantity or wait for restock |
| `Invalid quantity` | Quantity <= 0 | Enter positive quantity |
| `Unit price cannot be zero` | Price = 0 for non-sample | Set price or mark as sample |

### 8.2 Confirmation Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Order is already confirmed` | Duplicate confirm | No action needed |
| `Cannot confirm cancelled order` | Status = CANCELLED | Create new order |
| `Order has no line items` | Empty order | Add items first |
| `Rate limit exceeded` | Too many confirms | Wait 1 minute |
| `Not authorized` | User didn't create order | Contact order owner |

### 8.3 Invoice Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Can only generate invoice from SALE` | orderType = QUOTE | Convert quote to sale first |
| `Order must be in status: PENDING, PACKED, SHIPPED` | Wrong status | Progress fulfillment first |
| `Invoice already exists` | Duplicate generation | Use existing invoice |

### 8.4 Payment Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Invoice not found` | Invalid invoiceId | Verify invoice exists |
| `Invoice is already paid` | status = PAID | No further payment needed |
| `Cannot pay voided invoice` | status = VOID | Generate new invoice |
| `Payment exceeds amount due` | amount > amountDue | Reduce payment amount |
| `Allocations must equal payment` | Multi-invoice mismatch | Adjust allocations |

### 8.5 Fulfillment Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Invalid status transition` | Breaking state machine | Check valid transitions |
| `Cannot pick for shipped order` | Already shipped | Order is done |
| `Picked qty exceeds ordered qty` | Overpicking | Reduce picked quantity |

---

## 9. Invariants

### INV-002: Order Total Consistency

**Statement:** Order total must equal the sum of line item totals.

```
order.total = SUM(orderLineItems.lineTotal) - order.discount + order.tax
```

**Enforcement:**
- Calculated on order creation/update
- Verified in `priceCalculationService.calculateOrderTotals()`

### INV-003: Payment Cannot Exceed Invoice

**Statement:** Payment amount cannot exceed invoice amount due.

```
payment.amount <= invoice.amountDue + 0.01 (tolerance)
```

**Enforcement:**
- Validated in `payments.recordPayment`
- Validated in `payments.recordMultiInvoicePayment`
- Payment capped at amountDue if slightly over due to rounding

### INV-006: Fulfilled Quantity Constraint

**Statement:** Fulfilled (picked) quantity cannot exceed ordered quantity.

```
FOR EACH line_item:
  pickedQuantity <= orderedQuantity
```

**Enforcement:**
- Validated in `orders.fulfillOrder`
- Error thrown if constraint violated

### Additional Invariants

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| INV-007 | Invoice amountDue = totalAmount - amountPaid | Calculated on payment |
| INV-008 | Client totalOwed = SUM(invoice.amountDue) | Synced via clientBalanceService |
| INV-009 | Reserved inventory = SUM(confirmed orders not shipped) | Released on ship |
| INV-010 | All state transitions must follow state machine | validateTransition() |

---

## 10. Cross-Flow Touchpoints

### GF-004: Invoice Generation

| Touchpoint | Direction | Data Flow |
|------------|-----------|-----------|
| Order Confirmation | O2C → Invoice | Order triggers invoice creation capability |
| Generate Invoice | O2C → Invoice | `invoices.generateFromOrder` creates invoice from order |
| Invoice Link | O2C ← Invoice | `order.invoiceId` links back to generated invoice |

### GF-005: Pick & Pack Fulfillment

| Touchpoint | Direction | Data Flow |
|------------|-----------|-----------|
| Order Ready | O2C → Pick | Confirmed orders appear in pick queue |
| Pick Complete | O2C ← Pick | `orders.fulfillOrder` records picked quantities |
| Pack Complete | O2C ← Pack | Status → PACKED |
| Ship | O2C ← Ship | `orders.shipOrder` with tracking info |

### GF-006: Client Ledger

| Touchpoint | Direction | Data Flow |
|------------|-----------|-----------|
| Invoice Created | O2C → Ledger | Increases client.totalOwed |
| Payment Received | O2C → Ledger | Decreases client.totalOwed |
| Credit Exposure | Ledger → O2C | Affects order approval |

### GF-007: Inventory Management

| Touchpoint | Direction | Data Flow |
|------------|-----------|-----------|
| Order Confirmation | O2C → Inventory | Increases batch.reservedQty |
| Order Shipped | O2C → Inventory | Releases reservedQty, creates movement record |
| Return Processed | O2C → Inventory | Restocks or returns to vendor |
| Availability Check | O2C ← Inventory | Validates available quantity |

### GF-008: GL/Accounting

| Touchpoint | Direction | Data Flow |
|------------|-----------|-----------|
| Invoice Posted | O2C → GL | DR Accounts Receivable, CR Revenue |
| Payment Posted | O2C → GL | DR Cash, CR Accounts Receivable |
| Invoice Voided | O2C → GL | Reversing entries created |

---

## 11. UI Components

### 11.1 Order Components (`client/src/components/orders/`)

| Component | Purpose |
|-----------|---------|
| `OrderStatusBadge` | Display fulfillment status with color coding |
| `OrderStatusTimeline` | Show status history timeline |
| `OrderStatusActions` | Available status transition buttons |
| `OrderTotalsPanel` | Display order totals and margins |
| `OrderCOGSDetails` | Show COGS breakdown |
| `LineItemTable` | Editable line items table |
| `LineItemRow` | Individual line item row |
| `BatchSelectionDialog` | Product/batch selection modal |
| `ConfirmDraftModal` | Draft confirmation dialog |
| `DeleteDraftModal` | Draft deletion confirmation |
| `ShipOrderModal` | Shipping details entry |
| `ProcessReturnModal` | Return processing dialog |
| `ReturnHistorySection` | Display return history |
| `COGSInput` | COGS override input |
| `MarginInput` | Margin override input |
| `OrderAdjustmentPanel` | Order-level discounts/markups |
| `CreditLimitBanner` | Credit limit warnings |
| `CreditWarningDialog` | Credit limit exceeded dialog |
| `FloatingOrderPreview` | Persistent order summary |
| `EditInvoiceDialog` | Invoice editing modal |

### 11.2 Key Pages

| Page | Path | Purpose |
|------|------|---------|
| Orders | `/orders` | Order list with tabs for draft/confirmed |
| Create Order | `/orders/create` | New order creation wizard |
| Order Detail | Sheet in `/orders` | View/manage individual order |

---

## 12. Performance Considerations

### 12.1 Query Optimization

- Batch queries used instead of N+1 for line items
- Row-level locks (FOR UPDATE) prevent race conditions
- Indexed columns: orderId, clientId, batchId, status fields

### 12.2 Rate Limiting

- Order confirmation: 10/minute/user
- In-memory rate limiter with automatic cleanup

### 12.3 Transaction Handling

- Order confirmation wrapped in transaction
- Inventory updates use database arithmetic (not JS)
- Optimistic locking with version column

---

## 13. Security Considerations

### 13.1 Authorization

- All endpoints require authentication
- Permission-based access (`orders:create`, `orders:read`, etc.)
- Order confirmation validates ownership or admin role

### 13.2 Data Validation

- Input sanitization via Zod schemas
- Actor from context (never from input)
- No fallback user IDs (`ctx.user?.id || 1` forbidden)

### 13.3 Audit Trail

- All mutations logged via `orderAuditService`
- Status changes recorded in `orderStatusHistory`
- Inventory movements tracked in `inventoryMovements`

---

## Appendix A: Payment Terms Reference

| Term | Days to Due | Description |
|------|-------------|-------------|
| COD | 0 | Cash on delivery |
| NET_7 | 7 | Payment due in 7 days |
| NET_15 | 15 | Payment due in 15 days |
| NET_30 | 30 | Payment due in 30 days |
| PARTIAL | 30 | Partial payment arrangement |
| CONSIGNMENT | 60 | Consignment arrangement |

---

## Appendix B: Payment Methods

| Method | Description |
|--------|-------------|
| CASH | Cash payment |
| CHECK | Paper check |
| WIRE | Bank wire transfer |
| ACH | ACH electronic transfer |
| CREDIT_CARD | Credit card payment |
| DEBIT_CARD | Debit card payment |
| OTHER | Other payment method |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-27 | Claude | Initial specification |
