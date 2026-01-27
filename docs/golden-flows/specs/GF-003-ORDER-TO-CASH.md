# GF-003: Order-to-Cash Golden Flow Specification

**Version:** 1.2
**Status:** Draft
**Last Updated:** 2026-01-27
**Module:** Sales / Accounting

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Journey](#2-user-journey)
3. [Sequence Diagrams](#3-sequence-diagrams)
4. [UI States](#4-ui-states)
5. [API Endpoints](#5-api-endpoints)
6. [Data Model](#6-data-model)
7. [Concrete Examples](#7-concrete-examples)
8. [State Transitions](#8-state-transitions)
9. [Business Rules](#9-business-rules)
10. [Error States & Edge Cases](#10-error-states--edge-cases)
11. [Invariants](#11-invariants)
12. [Cross-Flow Touchpoints](#12-cross-flow-touchpoints)
13. [UI Components](#13-ui-components)
14. [Performance Benchmarks](#14-performance-benchmarks)
15. [Acceptance Test Cases](#15-acceptance-test-cases)
16. [Security Considerations](#16-security-considerations)

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

## 3. Sequence Diagrams

### 3.1 Order Confirmation Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Orders  │     │  Orders  │     │ Batches  │     │ Inventory│
│   (UI)   │     │  Router  │     │    Db    │     │  Table   │     │ Movement │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ confirm(orderId)                │                │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │ BEGIN TRANSACTION               │                │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │                │ SELECT order FOR UPDATE         │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ Validate: isDraft=true, not cancelled            │
     │                │<───────────────│                │                │
     │                │                │                │                │
     │                │ SELECT lineItems FOR UPDATE     │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ SELECT batches FOR UPDATE       │                │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │                │ For each item: validate availableQty >= requestedQty
     │                │<────────────────────────────────│                │
     │                │                │                │                │
     │                │ For each item:                  │                │
     │                │   IF item.isSample:             │                │
     │                │     UPDATE batch SET sampleQty -= qty            │
     │                │   ELSE:                         │                │
     │                │     UPDATE batch SET reservedQty += qty          │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │                │ UPDATE order SET isDraft=false, confirmedAt=NOW()
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ COMMIT TRANSACTION              │                │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │ { success: true, orderId, orderNumber }         │                │
     │<───────────────│                │                │                │
     │                │                │                │                │
```

**Note:** Sample items (`isSample=true`) decrement from a separate `sampleQty` pool, not `reservedQty`. This allows tracking sample inventory separately from regular sales inventory.

### 3.2 Payment Recording Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │ Payments │     │ Invoices │     │  Clients │     │  Ledger  │
│   (UI)   │     │  Router  │     │  Table   │     │  Table   │     │ Entries  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ recordPayment(invoiceId, amount, method)        │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │ SELECT invoice WHERE id = ?     │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ Validate: status != PAID, != VOID               │
     │                │ Validate: amount <= amountDue + 0.01            │
     │                │<───────────────│                │                │
     │                │                │                │                │
     │                │ BEGIN TRANSACTION               │                │
     │                │────────────────────────────────────────────────>│
     │                │                │                │                │
     │                │ Generate paymentNumber (PMT-YYYYMM-XXXXX)       │
     │                │                │                │                │
     │                │ INSERT payment record           │                │
     │                │────────────────────────────────────────────────>│
     │                │                │                │                │
     │                │ UPDATE invoice SET amountPaid += amount         │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ UPDATE invoice SET amountDue = total - amountPaid
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ UPDATE invoice SET status = PAID|PARTIAL        │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ INSERT GL entry: DR Cash        │                │
     │                │────────────────────────────────────────────────>│
     │                │                │                │                │
     │                │ INSERT GL entry: CR Accounts Receivable         │
     │                │────────────────────────────────────────────────>│
     │                │                │                │                │
     │                │ UPDATE client SET totalOwed -= amount           │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │                │ COMMIT TRANSACTION              │                │
     │                │                │                │                │
     │                │ syncClientBalance(customerId)   │                │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │ { paymentId, paymentNumber, invoiceStatus, amountDue }           │
     │<───────────────│                │                │                │
```

### 3.3 Ship Order Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Orders  │     │  Orders  │     │ Batches  │     │ Inventory│
│   (UI)   │     │  Router  │     │  Table   │     │  Table   │     │ Movement │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ shipOrder(id, trackingNumber, carrier)          │                │
     │───────────────>│                │                │                │
     │                │                │                │                │
     │                │ BEGIN TRANSACTION               │                │
     │                │                │                │                │
     │                │ SELECT order FOR UPDATE         │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ validateTransition(current, "SHIPPED")          │
     │                │                │                │                │
     │                │ SELECT allocations for order    │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ For each allocation:            │                │
     │                │   SELECT batch FOR UPDATE       │                │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │                │   UPDATE batch SET reservedQty -= allocatedQty  │
     │                │────────────────────────────────>│                │
     │                │                │                │                │
     │                │   INSERT inventoryMovement (type=SALE)          │
     │                │────────────────────────────────────────────────>│
     │                │                │                │                │
     │                │ UPDATE order SET fulfillmentStatus="SHIPPED"    │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ INSERT orderStatusHistory       │                │
     │                │───────────────>│                │                │
     │                │                │                │                │
     │                │ COMMIT TRANSACTION              │                │
     │                │                │                │                │
     │ { success, orderId, status, inventoryReleased[] }               │
     │<───────────────│                │                │                │

```

### 3.4 Full Order-to-Cash Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORDER-TO-CASH LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ CREATE  │───>│ CONFIRM │───>│ INVOICE │───>│ PAYMENT │───>│ FULFILL │
  │  ORDER  │    │  ORDER  │    │         │    │         │    │         │
  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ orders  │    │ batches │    │invoices │    │payments │    │ orders  │
  │ created │    │reserved │    │ created │    │recorded │    │ shipped │
  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │  Draft  │    │ Pending │    │  Sent   │    │ Partial/│    │Delivered│
  │ Status  │    │ Status  │    │ Status  │    │  Paid   │    │ Status  │
  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘

  Database Changes at Each Step:
  ──────────────────────────────
  CREATE:  INSERT orders, INSERT order_line_items
  CONFIRM: UPDATE batches.reservedQty, UPDATE orders.isDraft=false
  INVOICE: INSERT invoices, INSERT invoice_line_items, UPDATE clients.totalOwed
  PAYMENT: INSERT payments, UPDATE invoices.amountPaid, INSERT ledger_entries
  FULFILL: UPDATE batches.reservedQty (release), INSERT inventory_movements
```

---

## 4. UI States

### 4.1 Orders List Page (`/orders`)

| State | Description | UI Elements |
|-------|-------------|-------------|
| Loading | Fetching orders | TableSkeleton component |
| Empty (Draft) | No draft orders | EmptyState with "Create Draft Order" CTA |
| Empty (Confirmed) | No confirmed orders | EmptyState informational message |
| Populated | Orders displayed | Order cards with status badges |
| Filtered | Search/filter applied | Filter chips, filtered results |

### 4.2 Order Creation Page (`/orders/create`)

| State | Description | UI Elements |
|-------|-------------|-------------|
| Client Selection | No client selected | Client selector dropdown |
| Product Selection | Adding items | Batch selection dialog, line item table |
| Pricing Review | Items added | OrderTotalsPanel, margin calculations |
| Validation Error | Invalid data | Error banners, field highlights |
| Submitting | Saving order | Loading spinner, disabled submit |

### 4.3 Order Detail Sheet

| State | Description | Actions Available |
|-------|-------------|-------------------|
| Draft | Order not confirmed | Edit, Confirm, Delete |
| Pending | Confirmed, awaiting pack | Mark as Packed, Process Return |
| Packed | Items picked | Mark as Shipped |
| Shipped | In transit | Mark as Delivered |
| Delivered | Order complete | Process Return |
| Returned | Items returned | Restock, Return to Vendor |

### 4.4 Invoice States

| State | Badge Color | Description |
|-------|-------------|-------------|
| DRAFT | Gray | Invoice created but not sent |
| SENT | Blue | Invoice sent to customer |
| VIEWED | Purple | Customer has viewed invoice |
| PARTIAL | Yellow | Partial payment received |
| PAID | Green | Fully paid |
| OVERDUE | Red | Past due date, not fully paid |
| VOID | Gray (strikethrough) | Invoice cancelled |

### 4.5 Payment Recording

| State | Description |
|-------|-------------|
| Invoice Selection | Choose invoice(s) to pay |
| Amount Entry | Enter payment amount |
| Method Selection | Choose payment method |
| Confirmation | Review and submit |
| Success | Payment recorded, balances updated |

---

## 5. API Endpoints

### 5.1 Orders Router (`server/routers/orders.ts`)

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

### 5.2 Invoices Router (`server/routers/invoices.ts`)

| Endpoint | Method | Description | Permission |
|----------|--------|-------------|------------|
| `invoices.list` | query | List invoices with filters | `accounting:read` |
| `invoices.getById` | query | Get invoice with line items | `accounting:read` |
| `invoices.generateFromOrder` | mutation | Create invoice from order (see validation rules below) | `accounting:create` |
| `invoices.updateStatus` | mutation | Update invoice status | `accounting:update` |
| `invoices.markSent` | mutation | Mark invoice as sent | `accounting:update` |
| `invoices.void` | mutation | Void invoice with GL reversal | `accounting:delete` |
| `invoices.getSummary` | query | Get invoice statistics | `accounting:read` |
| `invoices.checkOverdue` | mutation | Update overdue invoices | `accounting:update` |

### 5.3 Payments Router (`server/routers/payments.ts`)

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

## 6. Data Model

### 6.1 Entity Relationship Diagram

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

### 6.2 Key Tables

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

## 7. Concrete Examples

### 7.1 Create Draft Order - Request

```json
{
  "orderType": "SALE",
  "isDraft": true,
  "clientId": 142,
  "items": [
    {
      "batchId": 1089,
      "displayName": "White Runtz - Premium Indoor",
      "quantity": 5,
      "unitPrice": 1200.00,
      "isSample": false
    },
    {
      "batchId": 1094,
      "displayName": "Gelato 41 - Greenhouse",
      "quantity": 10,
      "unitPrice": 800.00,
      "isSample": false
    },
    {
      "batchId": 1094,
      "displayName": "Gelato 41 Sample",
      "quantity": 0.5,
      "unitPrice": 0,
      "isSample": true
    }
  ],
  "notes": "Priority customer - expedite if possible"
}
```

### 7.2 Create Draft Order - Response

```json
{
  "id": 4521,
  "orderNumber": "D-1706385600000",
  "orderType": "SALE",
  "isDraft": true,
  "clientId": 142,
  "items": [
    {
      "batchId": 1089,
      "displayName": "White Runtz - Premium Indoor",
      "originalName": "WR-IND-2026-001",
      "quantity": 5,
      "unitPrice": 1200.00,
      "isSample": false,
      "unitCogs": 850.00,
      "cogsMode": "FIXED",
      "cogsSource": "FIXED",
      "unitMargin": 350.00,
      "marginPercent": 29.17,
      "lineTotal": 6000.00,
      "lineCogs": 4250.00,
      "lineMargin": 1750.00
    },
    {
      "batchId": 1094,
      "displayName": "Gelato 41 - Greenhouse",
      "originalName": "G41-GH-2026-003",
      "quantity": 10,
      "unitPrice": 800.00,
      "isSample": false,
      "unitCogs": 525.00,
      "cogsMode": "RANGE",
      "cogsSource": "MIDPOINT",
      "unitMargin": 275.00,
      "marginPercent": 34.38,
      "lineTotal": 8000.00,
      "lineCogs": 5250.00,
      "lineMargin": 2750.00
    },
    {
      "batchId": 1094,
      "displayName": "Gelato 41 Sample",
      "originalName": "G41-GH-2026-003",
      "quantity": 0.5,
      "unitPrice": 0,
      "isSample": true,
      "unitCogs": 525.00,
      "cogsMode": "RANGE",
      "cogsSource": "MIDPOINT",
      "unitMargin": -525.00,
      "marginPercent": 0,
      "lineTotal": 0,
      "lineCogs": 262.50,
      "lineMargin": -262.50
    }
  ],
  "subtotal": "14000.00",
  "tax": "0.00",
  "discount": "0.00",
  "total": "14000.00",
  "totalCogs": "9762.50",
  "totalMargin": "4237.50",
  "avgMarginPercent": "30.27",
  "fulfillmentStatus": "DRAFT",
  "createdAt": "2026-01-27T18:00:00.000Z",
  "createdBy": 3
}
```

### 7.3 Confirm Order - Request

```json
{
  "orderId": 4521,
  "paymentTerms": "NET_30"
}
```

### 7.4 Confirm Order - Response

```json
{
  "success": true,
  "orderId": 4521,
  "orderNumber": "O-1706385600000",
  "fulfillmentStatus": "PENDING",
  "isDraft": false,
  "confirmedAt": "2026-01-27T18:05:00.000Z",
  "dueDate": "2026-02-26",
  "inventoryReserved": [
    { "batchId": 1089, "reserved": 5, "newReservedQty": 15 },
    { "batchId": 1094, "reserved": 10.5, "newReservedQty": 28.5 }
  ]
}
```

### 7.5 Generate Invoice - Response

```json
{
  "id": 2891,
  "invoiceNumber": "INV-202601-00147",
  "customerId": 142,
  "invoiceDate": "2026-01-27",
  "dueDate": "2026-02-26",
  "subtotal": "14000.00",
  "taxAmount": "0.00",
  "discountAmount": "0.00",
  "totalAmount": "14000.00",
  "amountPaid": "0.00",
  "amountDue": "14000.00",
  "status": "DRAFT",
  "referenceType": "ORDER",
  "referenceId": 4521,
  "lineItems": [
    {
      "id": 8901,
      "invoiceId": 2891,
      "batchId": 1089,
      "description": "White Runtz - Premium Indoor (5 units @ $1,200.00)",
      "quantity": "5.00",
      "unitPrice": "1200.00",
      "taxRate": "0.00",
      "discountPercent": "0.00",
      "lineTotal": "6000.00"
    },
    {
      "id": 8902,
      "invoiceId": 2891,
      "batchId": 1094,
      "description": "Gelato 41 - Greenhouse (10 units @ $800.00)",
      "quantity": "10.00",
      "unitPrice": "800.00",
      "taxRate": "0.00",
      "discountPercent": "0.00",
      "lineTotal": "8000.00"
    }
  ],
  "createdAt": "2026-01-27T18:10:00.000Z",
  "createdBy": 3
}
```

### 7.6 Record Payment - Request

```json
{
  "invoiceId": 2891,
  "amount": 7000.00,
  "paymentMethod": "WIRE",
  "referenceNumber": "WF-2026012700145",
  "notes": "Partial payment - remainder due by 2/15",
  "paymentDate": "2026-01-28"
}
```

### 7.7 Record Payment - Response

```json
{
  "paymentId": 1456,
  "paymentNumber": "PMT-202601-00089",
  "invoiceId": 2891,
  "customerId": 142,
  "amount": 7000.00,
  "invoiceStatus": "PARTIAL",
  "amountDue": 7000.00,
  "glEntries": [
    {
      "entryNumber": "PMT-1456-DR",
      "accountId": 1001,
      "accountName": "Cash",
      "debit": "7000.00",
      "credit": "0.00"
    },
    {
      "entryNumber": "PMT-1456-CR",
      "accountId": 1200,
      "accountName": "Accounts Receivable",
      "debit": "0.00",
      "credit": "7000.00"
    }
  ]
}
```

### 7.8 Ship Order - Request

```json
{
  "orderId": 4521,
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "notes": "Left with receptionist"
}
```

### 7.9 Ship Order - Response

```json
{
  "success": true,
  "orderId": 4521,
  "fulfillmentStatus": "SHIPPED",
  "shippedAt": "2026-01-29T14:30:00.000Z",
  "shippedBy": 5,
  "inventoryReleased": [
    {
      "batchId": 1089,
      "quantityReleased": 5,
      "movementId": 12847,
      "movementType": "SALE"
    },
    {
      "batchId": 1094,
      "quantityReleased": 10.5,
      "movementId": 12848,
      "movementType": "SALE"
    }
  ]
}
```

### 7.10 Multi-Invoice Payment - Request

```json
{
  "clientId": 142,
  "totalAmount": 15000.00,
  "allocations": [
    { "invoiceId": 2891, "amount": 7000.00 },
    { "invoiceId": 2845, "amount": 5500.00 },
    { "invoiceId": 2801, "amount": 2500.00 }
  ],
  "paymentMethod": "ACH",
  "referenceNumber": "ACH-BATCH-20260130",
  "notes": "Monthly payment batch"
}
```

### 7.11 Complete Order Lifecycle - Summary

| Step | Timestamp | Action | Key Data Changes |
|------|-----------|--------|------------------|
| 1 | 18:00:00 | Create Draft | orders.id=4521, isDraft=true |
| 2 | 18:05:00 | Confirm | isDraft=false, batches.reservedQty +15.5 |
| 3 | 18:10:00 | Generate Invoice | invoices.id=2891, client.totalOwed +14000 |
| 4 | Day 2 | Record Payment $7k | invoices.amountDue=7000, status=PARTIAL |
| 5 | Day 3 | Ship Order | batches.reservedQty -15.5, movements created |
| 6 | Day 4 | Deliver | fulfillmentStatus=DELIVERED |
| 7 | Day 30 | Final Payment $7k | invoices.status=PAID, client.totalOwed -7000 |

---

## 8. State Transitions

### 8.1 Fulfillment Status State Machine

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

### 8.2 Valid Transitions

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

### 8.3 Invoice Status Transitions

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

## 9. Business Rules

### 9.1 Order Creation

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-001 | Customer must be a client with `isBuyer=true` | API validation |
| BR-002 | Products must have available inventory | Batch availability check |
| BR-003 | Quantity must be positive | Schema validation |
| BR-004 | Unit price cannot be negative | Schema validation |
| BR-005 | Non-sample items must have price > 0 | API validation |
| BR-006 | COGS cannot be negative | Schema validation |

### 9.2 Order Confirmation

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-007 | Inventory reserved on confirm | Transaction with row locks |
| BR-008 | Sample orders decrement sampleQty | Separate inventory pool |
| BR-009 | Regular orders increment reservedQty | Prevents overselling |
| BR-010 | Order must have line items | API validation |
| BR-011 | Payment terms required for sales | Schema default |
| BR-012 | Rate limit: 10 confirms/minute/user | In-memory rate limiter |

### 9.3 Invoicing

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-013 | Only SALE orders can generate invoices | API validation (`orderType !== "SALE"` throws) |
| BR-014 | Order must be PENDING, PACKED, or SHIPPED | Status check in `generateFromOrder` |
| BR-015 | One invoice per order | Duplicate check (`order.invoiceId` already set) |
| BR-016 | Due date calculated from payment terms | Automatic calculation based on `paymentTerms` |

**`invoices.generateFromOrder` Validation Flow (Verified):**
```
1. Validate order exists → TRPCError NOT_FOUND if missing
2. Validate orderType === "SALE" → TRPCError BAD_REQUEST if QUOTE
3. Validate fulfillmentStatus in [PENDING, PACKED, SHIPPED] → TRPCError BAD_REQUEST
4. Check order.invoiceId is null → TRPCError BAD_REQUEST if invoice exists
5. Generate invoice number (INV-YYYYMM-XXXXX)
6. Create invoice with line items from order
7. Update order.invoiceId with new invoice ID
8. Increase client.totalOwed by invoice total
```

### 9.4 Payments

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-017 | Payment amount must be positive | Schema validation |
| BR-018 | Payment cannot exceed invoice amountDue | API validation |
| BR-019 | Cannot pay voided invoices | Status check |
| BR-020 | Cannot pay fully paid invoices | Status check |
| BR-021 | GL entries created for each payment | Transaction |

### 9.5 Fulfillment

| Rule ID | Rule | Enforcement |
|---------|------|-------------|
| BR-022 | Picked quantity cannot exceed ordered quantity | API validation |
| BR-023 | Cannot ship from terminal status | State machine |
| BR-024 | Shipping releases reserved inventory | Transaction |
| BR-025 | Inventory movements recorded on ship | Audit trail |

---

## 10. Error States & Edge Cases

### 10.1 Order Creation Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Client not found` | Invalid clientId | Select valid client |
| `Batch not found` | Invalid batchId | Select valid batch |
| `Insufficient inventory` | Quantity > available | Reduce quantity or wait for restock |
| `Invalid quantity` | Quantity <= 0 | Enter positive quantity |
| `Unit price cannot be zero` | Price = 0 for non-sample | Set price or mark as sample |

### 10.2 Confirmation Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Order is already confirmed` | Duplicate confirm | No action needed |
| `Cannot confirm cancelled order` | Status = CANCELLED | Create new order |
| `Order has no line items` | Empty order | Add items first |
| `Rate limit exceeded` | Too many confirms | Wait 1 minute |
| `Not authorized` | User didn't create order | Contact order owner |

### 10.3 Invoice Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Can only generate invoice from SALE` | orderType = QUOTE | Convert quote to sale first |
| `Order must be in status: PENDING, PACKED, SHIPPED` | Wrong status | Progress fulfillment first |
| `Invoice already exists` | Duplicate generation | Use existing invoice |

### 10.4 Payment Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Invoice not found` | Invalid invoiceId | Verify invoice exists |
| `Invoice is already paid` | status = PAID | No further payment needed |
| `Cannot pay voided invoice` | status = VOID | Generate new invoice |
| `Payment exceeds amount due` | amount > amountDue | Reduce payment amount |
| `Allocations must equal payment` | Multi-invoice mismatch | Adjust allocations |

### 10.5 Fulfillment Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `Invalid status transition` | Breaking state machine | Check valid transitions |
| `Cannot pick for shipped order` | Already shipped | Order is done |
| `Picked qty exceeds ordered qty` | Overpicking | Reduce picked quantity |

### 10.6 Edge Cases Matrix

| Scenario | What Happens | System Behavior | Recovery |
|----------|--------------|-----------------|----------|
| **Concurrent confirmation** | Two users confirm same draft simultaneously | Row lock blocks second request | Second user sees "already confirmed" |
| **Inventory depleted mid-confirmation** | Available qty drops between load and confirm | Transaction fails, rollback | User re-selects with new quantities |
| **Payment recorded during void** | Payment submitted while invoice being voided | Payment rejected: "invoice is voided" | User selects different invoice |
| **Network failure during transaction** | Connection lost mid-commit | Transaction rolls back automatically | User retries operation |
| **Partial GL failure** | Cash entry succeeds, AR entry fails | Full transaction rollback | User retries; both entries atomic |
| **Client deleted with open orders** | Client soft-deleted, orders exist | Orders remain visible, new orders blocked | Complete or cancel existing orders |
| **Batch deleted with reserved qty** | Batch soft-deleted while reserved | Reservation remains; fulfillment allowed | Complete fulfillment, then no new orders |
| **Optimistic lock conflict** | Two users edit same order | Second save fails with version mismatch | Reload and re-apply changes |
| **Invoice generated twice** | Rapid clicks on "Generate Invoice" | Duplicate check blocks second | First invoice returned for both |
| **Payment exceeds total due** | Rounding causes overpay attempt | Amount capped at amountDue | Exact amount applied, success returned |
| **Void payment on paid invoice** | Payment voided, invoice was PAID | Invoice reverts to PARTIAL or SENT | AR balance restored correctly |
| **Return after invoice paid** | Customer returns goods, invoice settled | Creates credit memo (future feature) | Manual adjustment currently required |
| **Sample qty exceeds sample pool** | Order 10 samples, only 5 available | Validation fails at confirmation | Reduce sample qty or wait for restock |
| **Order without allocations** | Order line items exist but no batch allocations | Shipment uses line item quantities directly | Legacy orders remain shippable; new orders require allocations |

### 10.7 Failure Recovery Procedures

| Failure Type | Detection | Automatic Recovery | Manual Intervention |
|--------------|-----------|-------------------|---------------------|
| Transaction rollback | Database error logged | State unchanged | Retry operation |
| Orphaned reservation | Nightly batch job | Auto-release after 7 days | Manual release via admin |
| GL imbalance | Daily reconciliation | Alert to accounting | Create adjustment entry |
| Client balance mismatch | syncClientBalance triggered | Auto-correct on payment | Force sync via admin |
| Stuck fulfillment status | Status > 30 days in PACKED | Alert generated | Manual status update |

---

## 11. Invariants

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
- If `payment.amount > invoice.amountDue` but `<= amountDue + 0.01`:
  - Payment is ACCEPTED (not rejected)
  - `effectiveAmount = amountDue` (capped at exact balance)
  - Invoice marked as PAID
  - No overpayment recorded
- If `payment.amount > invoice.amountDue + 0.01`:
  - Payment is REJECTED with error "Payment exceeds amount due"

**Tolerance Rationale:** The 0.01 tolerance accommodates minor floating-point rounding in UI calculations while preventing actual overpayments.

**Test Case:**
```typescript
// Invoice with amountDue = $100.00
await recordPayment({ amount: "100.01" }); // ACCEPTED, caps to $100.00
await recordPayment({ amount: "100.02" }); // REJECTED: exceeds tolerance
```

### INV-006: Fulfilled Quantity Constraint

**Statement:** Fulfilled (picked) quantity cannot exceed ordered quantity.

```
FOR EACH line_item:
  pickedQuantity <= orderedQuantity
```

**Enforcement:**
- Validated in `orders.fulfillOrder`
- Error thrown if constraint violated

### INV-007: Invoice Balance Consistency

**Statement:** Invoice amountDue must always equal totalAmount minus amountPaid, never negative.

```
invoice.amountDue = MAX(0, invoice.totalAmount - invoice.amountPaid)
```

**Enforcement:**
- Recalculated on every payment operation using database arithmetic
- MAX(0, ...) prevents negative balance due to rounding tolerance (0.01)
- Verified by reconciliation jobs

**Test Case:**
```typescript
// After recording $7000 payment on $14000 invoice
expect(invoice.totalAmount).toBe("14000.00");
expect(invoice.amountPaid).toBe("7000.00");
expect(invoice.amountDue).toBe("7000.00");

// Edge case: slight overpayment due to tolerance
// Payment of $14000.01 on $14000 invoice caps at amountDue
expect(invoice.amountDue).toBe("0.00"); // Never negative
```

### INV-008: Client AR Balance Consistency

**Statement:** Client totalOwed must equal sum of all outstanding invoice amounts.

```
client.totalOwed = SUM(invoices.amountDue WHERE customerId = client.id AND status NOT IN ('PAID', 'VOID'))
```

**Enforcement:**
- Updated within payment transaction (optimistic update)
- Synced via `clientBalanceService.syncClientBalance()` for consistency

**`syncClientBalance` Trigger Points:**
| Trigger | Location | Purpose |
|---------|----------|---------|
| After payment recorded | `payments.recordPayment` | Ensure balance reflects new payment |
| After multi-invoice payment | `payments.recordMultiInvoicePayment` | Sync after batch update |
| After payment voided | `payments.void` | Restore balance after reversal |
| After invoice voided | `invoices.void` | Remove voided invoice from balance |
| After invoice generated | `invoices.generateFromOrder` | Include new AR in balance |
| Daily reconciliation | Scheduled job (4:00 AM) | Catch any drift from partial failures |

**Test Case:**
```typescript
// Client with 3 outstanding invoices: $5000, $3000, $2000
await syncClientBalance(clientId);
const client = await getClient(clientId);
expect(client.totalOwed).toBe("10000.00");
```

### INV-009: Inventory Reservation Balance

**Statement:** Reserved inventory must equal sum of confirmed but unfulfilled order quantities.

```
batch.reservedQty = SUM(order_line_items.quantity
  WHERE order.fulfillmentStatus IN ('CONFIRMED', 'PENDING', 'PACKED')
  AND order.deletedAt IS NULL)
```

**Enforcement:**
- Increased on order confirmation (within transaction)
- Released on shipment (within transaction)
- Row-level locks prevent race conditions

**Test Case:**
```typescript
// Before: batch.reservedQty = 10
// Confirm order with qty = 5
await confirmOrder(orderId);
const batch = await getBatch(batchId);
expect(batch.reservedQty).toBe("15.00");
```

### INV-010: State Machine Integrity

**Statement:** All fulfillment status transitions must follow defined state machine.

```
validTransitions = {
  DRAFT: ['CONFIRMED', 'PENDING', 'CANCELLED'],
  CONFIRMED: ['PENDING', 'PACKED', 'SHIPPED', 'CANCELLED'],
  PENDING: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'PENDING', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: ['RESTOCKED', 'RETURNED_TO_VENDOR']
}
```

**Enforcement:**
- `validateTransition(currentStatus, newStatus)` called before every status change
- Invalid transitions throw `TRPCError` with code `BAD_REQUEST`

### INV-011: COGS Integrity

**Statement:** Order totalCogs must equal sum of line item COGS.

```
order.totalCogs = SUM(orderLineItems.quantity * orderLineItems.cogsPerUnit)
```

**Enforcement:**
- Calculated on order creation/update
- Immutable after order confirmation

### INV-012: GL Entry Balance

**Statement:** Every payment must create balanced debit/credit entries.

```
SUM(ledgerEntries.debit WHERE referenceId = paymentId) =
SUM(ledgerEntries.credit WHERE referenceId = paymentId)
```

**Enforcement:**
- Both entries created in same transaction
- If either fails, transaction rolls back

### INV-013: Available Inventory Constraint

**Statement:** Available quantity can never go negative.

```
batch.availableQty = batch.totalQty - batch.reservedQty - batch.quarantineQty - batch.holdQty >= 0
```

**Enforcement:**
- Checked with row lock before reservation
- Validation in `calculateAvailableQty()`

### INV-014: Decimal Precision Requirements

**Statement:** All monetary and quantity values must use consistent decimal precision to prevent rounding errors.

| Field Type | Precision | Database Type | Examples |
|------------|-----------|---------------|----------|
| Monetary amounts (prices, totals, payments) | 2 decimal places | `DECIMAL(15,2)` | `1200.00`, `14000.00` |
| Quantities (inventory, line items) | 4 decimal places | `DECIMAL(15,4)` | `5.0000`, `10.5000` |
| Percentages (margins, tax rates) | 2 decimal places | `DECIMAL(5,2)` | `29.17`, `8.25` |
| COGS per unit | 2 decimal places | `DECIMAL(10,2)` | `850.00`, `525.00` |

**Enforcement:**
- Database schema enforces precision at storage layer
- Drizzle ORM returns string representations to preserve precision
- Application code uses database arithmetic (not JavaScript) for calculations
- JavaScript `Number` type avoided for monetary calculations to prevent floating-point errors

**Test Case:**
```typescript
// Verify no floating-point precision loss
const payment = await recordPayment({ amount: "14000.01" }); // String input
expect(payment.amount).toBe("14000.01"); // Exact precision preserved
// Avoid: payment.amount = 14000.01 * 100 / 100 (floating-point error risk)
```

### Invariant Summary Table

| ID | Invariant | Critical Level | Check Frequency |
|----|-----------|----------------|-----------------|
| INV-002 | Order total = sum of items | HIGH | Every order mutation |
| INV-003 | Payment <= amountDue | HIGH | Every payment |
| INV-006 | Picked qty <= ordered qty | HIGH | Every fulfillment |
| INV-007 | amountDue = total - paid | HIGH | Every payment |
| INV-008 | client.totalOwed = SUM(invoices) | HIGH | Every payment + daily |
| INV-009 | reservedQty = SUM(pending orders) | HIGH | Confirm/Ship + daily |
| INV-010 | Valid state transitions only | MEDIUM | Every status change |
| INV-011 | totalCogs = SUM(item COGS) | MEDIUM | Order creation |
| INV-012 | GL entries balanced | HIGH | Every payment |
| INV-013 | Available qty >= 0 | HIGH | Every reservation |
| INV-014 | Decimal precision consistency | HIGH | All monetary/qty operations |

---

## 12. Cross-Flow Touchpoints

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

## 13. UI Components

### 13.1 Order Components (`client/src/components/orders/`)

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

### 13.2 Key Pages

| Page | Path | Purpose |
|------|------|---------|
| Orders | `/orders` | Order list with tabs for draft/confirmed |
| Create Order | `/orders/create` | New order creation wizard |
| Order Detail | Sheet in `/orders` | View/manage individual order |

---

## 14. Performance Benchmarks

### 14.1 Expected Latencies

| Operation | Target P50 | Target P99 | Max Acceptable |
|-----------|------------|------------|----------------|
| Create draft order (5 items) | 150ms | 400ms | 1000ms |
| Confirm order | 200ms | 500ms | 1500ms |
| Generate invoice | 100ms | 300ms | 800ms |
| Record payment | 150ms | 400ms | 1000ms |
| Ship order | 200ms | 500ms | 1200ms |
| List orders (50 per page) | 100ms | 250ms | 600ms |
| Order search | 80ms | 200ms | 500ms |

### 14.2 Throughput Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Concurrent order confirmations | 50/second | With row locking |
| Payment recordings | 100/second | Single invoice |
| Order list queries | 200/second | With caching |
| Bulk invoice generation | 20/second | Batch processing |

### 14.3 Database Query Optimization

- Batch queries used instead of N+1 for line items
- Row-level locks (FOR UPDATE) prevent race conditions
- Indexed columns: orderId, clientId, batchId, status fields

### 14.4 Rate Limiting

- Order confirmation: 10/minute/user
- In-memory rate limiter with automatic cleanup

### 14.5 Transaction Handling

- Order confirmation wrapped in transaction
- Inventory updates use database arithmetic (not JS)
- Optimistic locking with version column

### 14.6 Batch Size Limits

| Operation | Max Batch Size | Rationale |
|-----------|----------------|-----------|
| Order line items | 100 items | UI performance |
| Multi-invoice payment | 20 invoices | Transaction complexity |
| Bulk status update | 50 orders | Lock contention |
| Invoice list export | 1000 records | Memory constraints |

---

## 15. Acceptance Test Cases

### 15.1 Order Creation Tests

| Test ID | Test Case | Preconditions | Steps | Expected Result |
|---------|-----------|---------------|-------|-----------------|
| O2C-001 | Create draft with valid data | Client exists, batch available | 1. Select client 2. Add 2 items 3. Save | Draft created, status=DRAFT |
| O2C-002 | Create draft with insufficient inventory | Batch has 5 units available | Request 10 units | Error: Insufficient inventory |
| O2C-003 | Create draft with sample items | Sample pool has inventory | Add sample item, qty=1 | Draft created, sample flagged |
| O2C-004 | Create draft with zero price | Non-sample item | Set price=0 | Error: Price required |
| O2C-005 | Create draft with COGS override | Any batch | Set overrideCogs=500 | COGS source=MANUAL |

### 15.2 Order Confirmation Tests

| Test ID | Test Case | Preconditions | Steps | Expected Result |
|---------|-----------|---------------|-------|-----------------|
| O2C-010 | Confirm valid draft | Draft order exists | Confirm with NET_30 | Status=PENDING, inventory reserved |
| O2C-011 | Concurrent confirmation | Same draft open in 2 sessions | Both click confirm | First succeeds, second gets "already confirmed" |
| O2C-012 | Confirm with depleted inventory | Inventory sold between load and confirm | Confirm | Transaction fails, error shown |
| O2C-013 | Confirm rate-limited | User confirmed 10 orders in 1 min | Confirm 11th | Error: Rate limit exceeded |
| O2C-014 | Confirm cancelled order | Order status=CANCELLED | Attempt confirm | Error: Cannot confirm cancelled |

### 15.3 Invoice Tests

| Test ID | Test Case | Preconditions | Steps | Expected Result |
|---------|-----------|---------------|-------|-----------------|
| O2C-020 | Generate invoice from pending order | Confirmed SALE order | Generate invoice | Invoice created, status=DRAFT |
| O2C-021 | Generate invoice from quote | Quote order (not SALE) | Generate invoice | Error: Must be SALE order |
| O2C-022 | Generate duplicate invoice | Invoice already exists | Generate again | Error: Invoice exists |
| O2C-023 | Void invoice with balance | Invoice partially paid | Void with reason | Status=VOID, GL reversed |
| O2C-024 | Mark invoice overdue | Due date passed | Check overdue | Status=OVERDUE |

### 15.4 Payment Tests

| Test ID | Test Case | Preconditions | Steps | Expected Result |
|---------|-----------|---------------|-------|-----------------|
| O2C-030 | Record full payment | Invoice amountDue=$14000 | Pay $14000 | Status=PAID, amountDue=0 |
| O2C-031 | Record partial payment | Invoice amountDue=$14000 | Pay $7000 | Status=PARTIAL, amountDue=7000 |
| O2C-032 | Record overpayment | Invoice amountDue=$14000 | Pay $15000 | Error: Exceeds amount due |
| O2C-033 | Pay voided invoice | Invoice status=VOID | Attempt payment | Error: Cannot pay voided |
| O2C-034 | Multi-invoice payment | 3 invoices outstanding | Pay all at once | All updated, client balance reduced |
| O2C-035 | Void payment | Payment exists | Void with reason | Invoice balance restored, GL reversed |

### 15.5 Fulfillment Tests

| Test ID | Test Case | Preconditions | Steps | Expected Result |
|---------|-----------|---------------|-------|-----------------|
| O2C-040 | Pack order | Status=PENDING | Mark packed | Status=PACKED, packedAt set |
| O2C-041 | Ship order | Status=PACKED | Ship with tracking | Status=SHIPPED, inventory released |
| O2C-042 | Deliver order | Status=SHIPPED | Mark delivered | Status=DELIVERED |
| O2C-043 | Process return | Status=DELIVERED | Process return | Status=RETURNED |
| O2C-044 | Restock return | Status=RETURNED | Restock | Status=RESTOCKED, inventory increased |
| O2C-045 | Invalid transition | Status=DRAFT | Attempt SHIPPED | Error: Invalid transition |

### 15.6 End-to-End Flow Tests

| Test ID | Test Case | Flow |
|---------|-----------|------|
| O2C-E2E-001 | Happy path - full cycle | Create → Confirm → Invoice → Full Pay → Ship → Deliver |
| O2C-E2E-002 | Partial payment flow | Create → Confirm → Invoice → Partial Pay → Partial Pay → Ship |
| O2C-E2E-003 | Return and restock | Full cycle → Return → Restock |
| O2C-E2E-004 | Cancel before confirm | Create → Cancel |
| O2C-E2E-005 | Multi-invoice customer | 3 orders → 3 invoices → Multi-invoice payment |

### 15.7 Invariant Verification Tests

| Test ID | Invariant | Verification |
|---------|-----------|--------------|
| O2C-INV-001 | INV-002 | After order update, sum(items) = total |
| O2C-INV-002 | INV-003 | Payment capped at amountDue |
| O2C-INV-003 | INV-008 | After payment, client.totalOwed = SUM(invoices.amountDue) |
| O2C-INV-004 | INV-009 | After ship, reservedQty reduced by shipped amount |
| O2C-INV-005 | INV-012 | Payment creates balanced GL entries |

---

## 16. Security Considerations

### 16.1 Authorization

- All endpoints require authentication
- Permission-based access (`orders:create`, `orders:read`, etc.)
- Order confirmation validates ownership or admin role

### 16.2 Data Validation

- Input sanitization via Zod schemas
- Actor from context (never from input)
- No fallback user IDs (`ctx.user?.id || 1` forbidden)

### 16.3 Audit Trail

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
| 1.1 | 2026-01-27 | Claude | Added sequence diagrams, concrete examples, expanded invariants, acceptance tests, performance benchmarks, edge cases |
| 1.2 | 2026-01-27 | Claude | QA audit fixes: INV-014 decimal precision, sample inventory branching in sequence diagram, MAX(0,...) formula, payment tolerance clarification, syncClientBalance triggers, generateFromOrder validation verified |
