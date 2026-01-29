# Data Model Implementation Inventory

**Purpose:** Catalog of all database tables, enums, and relations
**Created:** 2026-01-29
**Source:** Drizzle schema analysis

---

## Tables Summary

| Category | Tables | Key Tables |
|----------|--------|------------|
| Core/Party | 5 | clients, users, supplier_profiles |
| Sales | 6 | orders, order_items, invoices, payments |
| Inventory | 8 | batches, lots, products, inventory_movements |
| Purchasing | 4 | purchase_orders, po_items, bills |
| Samples | 4 | sample_requests, sample_allocations |
| Accounting | 5 | gl_entries, bank_accounts, fiscal_periods |
| System | 10+ | feature_flags, audit_logs, notifications |

---

## Core Tables

### clients
**Purpose:** Unified party model for all business entities

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK, auto-increment |
| name | varchar | Required |
| teriCode | varchar | Unique identifier (CLI-XXX) |
| isSeller | boolean | true = supplier |
| isBuyer | boolean | true = customer |
| totalOwed | decimal | AR balance |
| vipPortalEnabled | boolean | VIP access flag |
| createdBy | int | FK → users |
| createdAt | timestamp | |
| updatedAt | timestamp | |
| deletedAt | timestamp | Soft delete |

**Relations:**
- supplierProfile (1:1)
- orders (1:many as customer)
- invoices (1:many)

### supplier_profiles
**Purpose:** Extended data for suppliers

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| clientId | int | FK → clients |
| legacyVendorId | int | Migration tracking |
| licenseNumber | varchar | |
| paymentTerms | enum | NET_7, NET_15, etc. |

### users
**Purpose:** Internal system users

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| email | varchar | Unique |
| name | varchar | |
| role | enum | Role assignment |
| clerkId | varchar | External auth |

---

## Sales Tables

### orders
**Purpose:** Sales orders

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| orderNumber | varchar | Unique, e.g., ORD-2026-0001 |
| customerId | int | FK → clients |
| status | enum | draft, confirmed, etc. |
| isDraft | boolean | |
| orderType | enum | QUOTE, SALE |
| total | decimal | |
| fulfillmentStatus | enum | Parallel status |
| pickPackStatus | enum | Pick/pack status |
| confirmedAt | timestamp | |
| shippedAt | timestamp | |
| createdBy | int | FK → users |

**Status Enum:** draft, confirmed, invoiced, shipped, delivered, cancelled

### order_items
**Purpose:** Order line items

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| orderId | int | FK → orders |
| batchId | int | FK → batches |
| quantity | decimal | |
| unitPrice | decimal | |
| subtotal | decimal | Calculated |
| isSample | boolean | Sample flag |

### invoices
**Purpose:** AR invoices

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| invoiceNumber | varchar | Unique |
| customerId | int | FK → clients |
| orderId | int | FK → orders |
| status | enum | DRAFT, SENT, PAID, etc. |
| total | decimal | |
| amountPaid | decimal | |
| dueDate | date | |

**Status Enum:** DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID

### payments
**Purpose:** Payment records

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| invoiceId | int | FK → invoices (nullable for multi) |
| customerId | int | FK → clients |
| amount | decimal | |
| method | enum | CASH, CHECK, ACH, etc. |
| reference | varchar | |
| createdBy | int | FK → users |

---

## Inventory Tables

### batches
**Purpose:** Inventory lots with quantities

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| batchCode | varchar | Unique |
| productId | int | FK → products |
| lotId | int | FK → lots |
| status | enum | Batch status |
| onHandQty | decimal | Total physical |
| reservedQty | decimal | Reserved for orders |
| sampleQty | decimal | For samples |
| quarantineQty | decimal | Quality hold |
| holdQty | decimal | Admin hold |
| unitCogs | decimal | Cost per unit |
| createdBy | int | FK → users |

**Status Enum:** AWAITING_INTAKE, LIVE, PHOTOGRAPHY_COMPLETE, ON_HOLD, QUARANTINED, SOLD_OUT, CLOSED

### lots
**Purpose:** Receipt/shipment records

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| lotNumber | varchar | |
| vendorId | int | FK → vendors (legacy) |
| receivedAt | timestamp | |

### products
**Purpose:** Product catalog

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| name | varchar | |
| sku | varchar | |
| category | enum | |
| strainId | int | FK → strains |

### inventory_movements
**Purpose:** Inventory transaction log

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| batchId | int | FK → batches |
| type | enum | INTAKE, SALE, SAMPLE, ADJUSTMENT, etc. |
| quantity | decimal | |
| reference | varchar | Order/sample ID |
| createdBy | int | FK → users |

---

## Purchasing Tables

### purchase_orders
**Purpose:** Purchase orders to suppliers

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| poNumber | varchar | Unique |
| supplierId | int | FK → clients (isSeller) |
| status | enum | DRAFT, SENT, etc. |
| total | decimal | |

**Status Enum:** DRAFT, SENT, CONFIRMED, RECEIVING, RECEIVED, CANCELLED

### po_items
**Purpose:** PO line items

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| purchaseOrderId | int | FK → purchase_orders |
| productId | int | FK → products |
| quantity | decimal | |
| unitCost | decimal | |

### bills
**Purpose:** AP bills from suppliers

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| purchaseOrderId | int | FK → purchase_orders |
| vendorId | int | FK → clients |
| total | decimal | |
| status | enum | |

---

## Accounting Tables

### gl_entries
**Purpose:** General ledger entries

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| accountId | int | FK → gl_accounts |
| debit | decimal | |
| credit | decimal | |
| sourceType | enum | PAYMENT, INVOICE, etc. |
| sourceId | int | Reference ID |

### fiscal_periods
**Purpose:** Accounting periods

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| name | varchar | |
| startDate | date | |
| endDate | date | |
| status | enum | OPEN, CLOSED, LOCKED |

---

## Sample Tables

### sample_requests
**Purpose:** Sample distribution requests

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| clientId | int | FK → clients |
| productId | int | FK → products |
| quantity | decimal | |
| status | enum | PENDING, FULFILLED, etc. |
| requestedBy | int | FK → users |

**Status Enum:** PENDING, FULFILLED, RETURN_REQUESTED, RETURNED, VENDOR_RETURN_REQUESTED, CANCELLED

### sample_allocations
**Purpose:** Monthly allocation tracking

| Column | Type | Notes |
|--------|------|-------|
| id | int | PK |
| clientId | int | FK → clients |
| month | date | |
| usedQuantity | decimal | |
| limitQuantity | decimal | Default 7.0 |

---

## Enums Summary

| Enum Name | Values | Used By |
|-----------|--------|---------|
| orderStatus | draft, confirmed, invoiced, shipped, delivered, cancelled | orders |
| invoiceStatus | DRAFT, SENT, VIEWED, PARTIAL, PAID, OVERDUE, VOID | invoices |
| batchStatus | AWAITING_INTAKE, LIVE, ON_HOLD, QUARANTINED, SOLD_OUT, CLOSED | batches |
| purchaseOrderStatus | DRAFT, SENT, CONFIRMED, RECEIVING, RECEIVED, CANCELLED | purchase_orders |
| paymentTerms | COD, NET_7, NET_15, NET_30, CONSIGNMENT, PARTIAL | intakes, POs |
| cogsMode | FIXED, RANGE | batches |
| movementType | INTAKE, SALE, SAMPLE, ADJUSTMENT_IN, ADJUSTMENT_OUT, RETURN | inventory_movements |
| sampleStatus | PENDING, FULFILLED, RETURN_REQUESTED, RETURNED, CANCELLED | sample_requests |
| fiscalPeriodStatus | OPEN, CLOSED, LOCKED | fiscal_periods |

---

## Audit Columns (Standard)

All mutable tables include:
- `createdBy` (int, FK → users)
- `createdAt` (timestamp)
- `updatedBy` (int, FK → users, nullable)
- `updatedAt` (timestamp)
- `deletedAt` (timestamp, nullable - soft delete)
