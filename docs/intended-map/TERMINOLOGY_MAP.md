# TERP Terminology Map

**Purpose:** Canonical terminology and aliases used throughout the codebase
**Source:** `docs/protocols/CANONICAL_DICTIONARY.md` and codebase analysis
**Created:** 2026-01-29

---

## Party Model Entities

| Canonical Term | Aliases in Repo | Definition | Authority Source |
|----------------|-----------------|------------|------------------|
| **Client** | party, business entity | Any business entity that interacts with TERP | CANONICAL_DICTIONARY.md |
| **Supplier** | vendor (deprecated), seller | Client with `isSeller=true` who sells TO TERP | CANONICAL_DICTIONARY.md |
| **Customer** | buyer, client | Client who purchases FROM TERP | CANONICAL_DICTIONARY.md |
| **Vendor** | - | **DEPRECATED** - Use Client with `isSeller=true` | CANONICAL_DICTIONARY.md |
| **User** | internal user, employee | Internal TERP system user | CANONICAL_DICTIONARY.md |

### Database Tables
| Canonical | Table Name | Notes |
|-----------|------------|-------|
| Client | `clients` | Single source of truth for parties |
| Supplier Profile | `supplier_profiles` | Extended supplier data (1:1 with client) |
| Vendor | `vendors` | **DEPRECATED** - Do not use |
| User | `users` | Internal users |

### Key Client Flags
| Flag | Meaning |
|------|---------|
| `isSeller=true` | Can sell to TERP (supplier) |
| `isBuyer=true` | Can buy from TERP (customer) |
| `vipPortalEnabled=true` | Has VIP portal access |

---

## Transaction Entities

| Canonical Term | Aliases | Definition | Authority Source |
|----------------|---------|------------|------------------|
| **Order** | sales order | Customer order for products | CANONICAL_DICTIONARY.md |
| **Purchase Order** | PO | Order placed WITH a supplier | CANONICAL_DICTIONARY.md |
| **Invoice** | AR invoice, receivable | Bill sent TO a customer | CANONICAL_DICTIONARY.md |
| **Bill** | AP invoice, payable | Bill received FROM a supplier | CANONICAL_DICTIONARY.md |
| **Payment** | receipt, transaction | Financial transaction (AR or AP) | CANONICAL_DICTIONARY.md |

### Database Tables
| Canonical | Table Name |
|-----------|------------|
| Order | `orders` |
| Order Item | `order_items` |
| Purchase Order | `purchase_orders` |
| PO Item | `po_items` |
| Invoice | `invoices` |
| Bill | `bills` |
| Payment | `payments` |

---

## Inventory Entities

| Canonical Term | Aliases | Definition | Authority Source |
|----------------|---------|------------|------------------|
| **Product** | SKU, item | Product definition (catalog entry) | CANONICAL_DICTIONARY.md |
| **Batch** | lot, inventory item | Specific quantity with cost from a receipt | CANONICAL_DICTIONARY.md |
| **Lot** | receipt, shipment | Received shipment from supplier | CANONICAL_DICTIONARY.md |
| **Intake** | purchase (deprecated) | Process of receiving inventory | GF-001:Terminology |

### Database Tables
| Canonical | Table Name |
|-----------|------------|
| Product | `products` |
| Batch | `batches` |
| Lot | `lots` |

### Terminology Changes (MEET-066)
| Old Term | New Term | Context |
|----------|----------|---------|
| Purchase | Intake | Button labels, modals |
| New Purchase | New Intake | Inventory page |
| Product Purchase | Product Intake | Modal titles |

---

## Status Enumerations

### Order Status
| Value | Description | State |
|-------|-------------|-------|
| `draft` | Being created/edited | Mutable |
| `confirmed` | Inventory reserved | Immutable |
| `invoiced` | Invoice generated | Immutable |
| `shipped` | Physically shipped | Immutable |
| `delivered` | Received by customer | Terminal |
| `cancelled` | Order cancelled | Terminal |

### Invoice Status
| Value | Description |
|-------|-------------|
| `DRAFT` | Not yet sent |
| `SENT` | Sent to customer |
| `VIEWED` | Customer has viewed |
| `PARTIAL` | Partially paid |
| `PAID` | Fully paid (terminal) |
| `OVERDUE` | Past due date |
| `VOID` | Voided (terminal) |

### Batch Status
| Value | Description |
|-------|-------------|
| `AWAITING_INTAKE` | Pending verification (FEAT-008) |
| `LIVE` | Available for sale |
| `PHOTOGRAPHY_COMPLETE` | Photos taken |
| `ON_HOLD` | Temporarily unavailable |
| `QUARANTINED` | Quality issue |
| `SOLD_OUT` | No remaining quantity |
| `CLOSED` | Archived (terminal) |

### Purchase Order Status
| Value | Description |
|-------|-------------|
| `DRAFT` | Being created |
| `SENT` | Sent to vendor |
| `CONFIRMED` | Vendor confirmed |
| `RECEIVING` | Partially received |
| `RECEIVED` | Fully received |
| `CANCELLED` | Cancelled |

### Payment Terms
| Value | Description |
|-------|-------------|
| `COD` | Cash on Delivery |
| `NET_7` | Due in 7 days |
| `NET_15` | Due in 15 days |
| `NET_30` | Due in 30 days |
| `CONSIGNMENT` | Pay when sold |
| `PARTIAL` | Partial payment upfront |

### Sample Request Status
| Value | UI Label | Description |
|-------|----------|-------------|
| `PENDING` | Pending | Awaiting fulfillment |
| `FULFILLED` | Approved | Sample distributed |
| `RETURN_REQUESTED` | Return Requested | Return initiated |
| `RETURNED` | Returned | Sample returned |
| `VENDOR_RETURN_REQUESTED` | Vendor Return | Going back to vendor |
| `CANCELLED` | Cancelled | Request cancelled |

---

## Foreign Key Conventions

| Pattern | References | Notes |
|---------|------------|-------|
| `clientId` | `clients.id` | Canonical party reference |
| `customerId` | `clients.id` | **LEGACY** - Rename to `clientId` |
| `vendorId` (in payments) | `clients.id` | References supplier |
| `vendorId` (in lots/brands) | `vendors.id` | **LEGACY** - Migrate to `supplierClientId` |
| `userId` | `users.id` | Internal user |
| `createdBy` | `users.id` | Actor who created record |
| `updatedBy` | `users.id` | Actor who last updated |
| `actorId` | `users.id` or `vip:{clientId}` | Audit trail actor |

---

## Role Terminology

| Canonical Role | UI Label | Key Permissions |
|----------------|----------|-----------------|
| `super_admin` | Super Admin | All permissions |
| `sales_manager` | Sales Manager | Orders, clients, reporting |
| `sales_rep` | Sales Rep | Own orders, clients |
| `inventory_manager` | Inventory Manager | Inventory, batches |
| `fulfillment` | Fulfillment | Pick & pack, shipping |
| `accounting_manager` | Accounting Manager | AR/AP, GL, payments |
| `auditor` | Read-Only Auditor | Read-only all modules |

---

## Module Terminology

| Canonical Module | UI Navigation | Routes |
|------------------|---------------|--------|
| CRM | Clients | `/clients` |
| Sales | Orders | `/orders` |
| Inventory | Inventory | `/inventory` |
| Purchasing | Purchase Orders | `/purchase-orders` |
| Fulfillment | Pick & Pack | `/pick-pack` |
| Accounting | Accounting | `/accounting/*` |
| Samples | Samples | `/samples` |

---

## Quantity Types

| Term | Field Name | Description |
|------|------------|-------------|
| On-Hand | `onHandQty` | Total physical quantity |
| Reserved | `reservedQty` | Reserved for confirmed orders |
| Available | (calculated) | `onHandQty - reservedQty - quarantineQty - holdQty` |
| Sample | `sampleQty` | Designated for samples |
| Quarantine | `quarantineQty` | Quality hold |
| Hold | `holdQty` | Administrative hold |
