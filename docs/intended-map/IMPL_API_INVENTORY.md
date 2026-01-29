# API Implementation Inventory

**Purpose:** Catalog of all implemented tRPC routers and endpoints
**Created:** 2026-01-29
**Source:** Server codebase analysis, FLOW_GUIDE.md

---

## Router Summary

**Statistics (from FLOW_GUIDE.md v3.3):**
- Total Routers: 124 (120 main + 4 subdirectory)
- Total Procedures: 1,450+
- Total Domains: 27

| Domain | Router | Procedure Count | Module |
|--------|--------|-----------------|--------|
| Accounting | accountingRouter | 50+ | Accounting |
| Invoices | invoicesRouter | 15 | Accounting |
| Payments | paymentsRouter | 20+ | Accounting |
| Orders | ordersRouter | 25+ | Sales |
| Inventory | inventoryRouter | 30+ | Inventory |
| Clients | clientsRouter | 20+ | CRM |
| Purchase Orders | purchaseOrdersRouter | 15+ | Purchasing |
| Pick & Pack | pickPackRouter | 10+ | Fulfillment |
| Samples | samplesRouter | 15+ | Sales |
| VIP Portal | vipPortalRouter | 30+ | VIP |
| Feature Flags | featureFlagsRouter | 20 | Admin |
| Users | usersRouter | 10+ | Admin |
| Search | searchRouter | 5+ | Core |
| Audit | auditRouter | 5+ | Core |

---

## Key Routers by Golden Flow

### GF-001: Direct Intake
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `inventory.createIntake` | mutation | protected | Create batch from intake |
| `inventory.verify` | mutation | protected | Verify intake (FEAT-008) |
| `search.global` | query | protected | Product search |
| `clients.list` | query | protected | Supplier dropdown |
| `brands.list` | query | protected | Brand dropdown |

### GF-002: Procure-to-Pay
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `purchaseOrders.create` | mutation | protected | Create PO |
| `purchaseOrders.list` | query | protected | List POs |
| `purchaseOrders.getById` | query | protected | PO detail |
| `purchaseOrders.submit` | mutation | protected | Submit PO |
| `purchaseOrders.confirm` | mutation | protected | Vendor confirm |
| `purchaseOrders.receive` | mutation | protected | Receive goods |
| `accounting.bills.create` | mutation | protected | Create bill |
| `accounting.bills.pay` | mutation | protected | Pay bill |

### GF-003: Order-to-Cash
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `orders.create` | mutation | protected | Create order |
| `orders.list` | query | protected | List orders |
| `orders.getById` | query | protected | Order detail |
| `orders.confirm` | mutation | protected | Confirm order |
| `orders.cancel` | mutation | protected | Cancel order |
| `invoices.generateFromOrder` | mutation | protected | Generate invoice |

### GF-004: Invoice & Payment
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `invoices.list` | query | protected | List invoices |
| `invoices.getById` | query | protected | Invoice detail |
| `invoices.markSent` | mutation | protected | Mark as sent |
| `invoices.void` | mutation | protected | Void invoice |
| `payments.recordPayment` | mutation | protected | Record payment |
| `payments.recordMultiInvoicePayment` | mutation | protected | Multi-invoice payment |
| `payments.getClientOutstandingInvoices` | query | protected | Outstanding list |
| `vipPortal.documents.downloadInvoicePdf` | query | vipPortal | PDF generation |

### GF-005: Pick & Pack
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `pickPack.getPickList` | query | admin | Get queue |
| `pickPack.getOrderDetails` | query | admin | Order detail |
| `pickPack.packItems` | mutation | admin | Pack items to bag |
| `pickPack.markReadyForShipping` | mutation | admin | Mark ready |
| `orders.shipOrder` | mutation | protected | Ship order |
| `orders.deliverOrder` | mutation | protected | Mark delivered |

### GF-006: Client Ledger
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `accounting.getClientLedger` | query | protected | Transaction history |
| `accounting.getClientStatement` | query | protected | Statement |
| `accounting.getARSummary` | query | protected | AR summary |
| `accounting.getARAging` | query | protected | Aging buckets |
| `dashboard.getTopDebtors` | query | protected | Debt leaderboard |

### GF-007: Inventory Management
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `inventory.list` | query | protected | List batches |
| `inventory.getById` | query | protected | Batch detail |
| `inventory.adjustQuantity` | mutation | protected | Qty adjustment |
| `inventory.updateStatus` | mutation | protected | Status change |
| `inventory.bulkUpdateStatus` | mutation | protected | Bulk status |

### GF-008: Sample Request
| Endpoint | Type | Auth | Purpose |
|----------|------|------|---------|
| `samples.createRequest` | mutation | protected | Create request |
| `samples.list` | query | protected | List samples |
| `samples.fulfillRequest` | mutation | protected | Fulfill sample |
| `samples.requestReturn` | mutation | protected | Request return |
| `samples.completeReturn` | mutation | protected | Complete return |
| `samples.updateLocation` | mutation | protected | Update location |

---

## Authentication Levels

| Level | Description | Usage |
|-------|-------------|-------|
| `publicProcedure` | No auth required | Login, health check |
| `protectedProcedure` | User session required | Most operations |
| `adminProcedure` | Admin role required | Admin operations |
| `strictlyProtectedProcedure` | Real user (no demo) | Critical mutations |
| `vipPortalProcedure` | VIP session | VIP portal operations |

---

## Permission Checks

Permissions follow pattern `module:action`:

| Module | Actions |
|--------|---------|
| `clients` | read, create, update, delete |
| `orders` | read, create, update, delete |
| `inventory` | read, create, update, delete |
| `accounting` | read, create, update, delete |
| `samples` | read, create, update, delete |
| `settings` | read, manage |
| `audit` | read |

---

## Background Jobs

| Job | File | Schedule | Purpose |
|-----|------|----------|---------|
| sessionTimeout | `_core/calendarJobs.ts` | Cron | Clean expired sessions |
| notificationQueue | `_core/calendarJobs.ts` | Cron | Process notifications |
| debtAging | `_core/calendarJobs.ts` | Cron | Update aging buckets |
| priceAlerts | `_core/calendarJobs.ts` | Cron | Check price alerts |
