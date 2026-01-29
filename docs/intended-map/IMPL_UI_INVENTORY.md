# UI Implementation Inventory

**Purpose:** Catalog of all implemented UI routes and components
**Created:** 2026-01-29
**Source:** Client codebase analysis

---

## Routes Summary

| Route | Page Component | Module | Auth Required | Notes |
|-------|----------------|--------|---------------|-------|
| `/` | Dashboard | Core | Y | Main dashboard |
| `/login` | Login | Auth | N | Authentication |
| `/orders` | Orders | Sales | Y | Order management |
| `/orders/create` | CreateOrder | Sales | Y | New order |
| `/clients` | Clients | CRM | Y | Client list |
| `/clients/:id` | ClientDetail | CRM | Y | Client profile |
| `/clients/:id/ledger` | ClientLedger | Accounting | Y | AR/AP ledger |
| `/inventory` | Inventory | Inventory | Y | Batch list |
| `/purchase-orders` | PurchaseOrders | Purchasing | Y | PO list |
| `/pick-pack` | PickPackPage | Fulfillment | Y | Pick & pack queue |
| `/samples` | SampleManagement | Sales | Y | Sample requests |
| `/accounting/invoices` | Invoices | Accounting | Y | Invoice list |
| `/accounting/payments` | Payments | Accounting | Y | Payment list |
| `/accounting/bills` | Bills | Accounting | Y | AP bills |
| `/settings` | Settings | Admin | Y | System settings |
| `/settings/feature-flags` | FeatureFlags | Admin | Y | Feature flag admin |

---

## Pages by Module

### Dashboard
| Route | Component | File | Key Features |
|-------|-----------|------|--------------|
| `/` | Dashboard | `client/src/pages/Dashboard.tsx` | Widgets, stats, leaderboards |

**Widgets:**
- TotalDebtWidget
- ClientDebtLeaderboard
- CashCollectedLeaderboard
- InventoryStatsWidget

### Sales Module
| Route | Component | File | Key Features |
|-------|-----------|------|--------------|
| `/orders` | Orders | `pages/Orders.tsx` | List, filters, create |
| `/orders/create` | CreateOrder | `pages/CreateOrder.tsx` | Order form |
| `/orders/:id` | OrderDetail | `pages/OrderDetail.tsx` | View/edit order |

### CRM Module
| Route | Component | File | Key Features |
|-------|-----------|------|--------------|
| `/clients` | Clients | `pages/Clients.tsx` | Client list, filters |
| `/clients/:id` | ClientDetail | `pages/ClientDetail.tsx` | Profile, tabs |
| `/clients/:id/ledger` | ClientLedger | `pages/ClientLedger.tsx` | Transaction history |

### Inventory Module
| Route | Component | File | Key Features |
|-------|-----------|------|--------------|
| `/inventory` | Inventory | `pages/Inventory.tsx` | Batch list, dashboard |

**Key Components:**
- BatchDetailDrawer
- PurchaseModal (Direct Intake)
- InventoryFilters

### Accounting Module
| Route | Component | File | Key Features |
|-------|-----------|------|--------------|
| `/accounting/invoices` | Invoices | `pages/Invoices.tsx` | AR invoices |
| `/accounting/payments` | Payments | `pages/Payments.tsx` | Payment list |
| `/accounting/bills` | Bills | `pages/Bills.tsx` | AP bills |

**Key Components:**
- InvoicesWorkSurface
- RecordPaymentDialog
- PaymentInspector
- InvoiceToPaymentFlow (Golden Flow UI)
- MultiInvoicePaymentForm

### Fulfillment Module
| Route | Component | File | Key Features |
|-------|-----------|------|--------------|
| `/pick-pack` | PickPackPage | `pages/PickPackPage.tsx` | Queue, pick, pack |

### Samples Module
| Route | Component | File | Key Features |
|-------|-----------|------|--------------|
| `/samples` | SampleManagement | `pages/SampleManagement.tsx` | Sample requests |

**Key Components:**
- SampleForm
- SampleList
- SampleReturnDialog

### Purchasing Module
| Route | Component | File | Key Features |
|-------|-----------|------|--------------|
| `/purchase-orders` | PurchaseOrders | `pages/PurchaseOrders.tsx` | PO list, create |

**Key Components:**
- PurchaseOrdersWorkSurface

---

## Work Surface Framework

Work Surfaces are specialized UI components for complex workflows.

| Component | File | Purpose | Golden Flow |
|-----------|------|---------|-------------|
| InvoicesWorkSurface | `components/work-surface/InvoicesWorkSurface.tsx` | Invoice management | GF-004 |
| PaymentInspector | `components/work-surface/PaymentInspector.tsx` | Payment recording | GF-004 |
| InvoiceToPaymentFlow | `components/work-surface/golden-flows/InvoiceToPaymentFlow.tsx` | 3-step payment | GF-004 |
| PurchaseOrdersWorkSurface | `components/work-surface/PurchaseOrdersWorkSurface.tsx` | PO management | GF-002 |
| DirectIntakeWorkSurface | `components/work-surface/DirectIntakeWorkSurface.tsx` | Inventory intake | GF-001 |

---

## UI Implementation Status by Golden Flow

| Flow | Entry Point | Core UI | Inspector | Work Surface | Status |
|------|-------------|---------|-----------|--------------|--------|
| GF-001 | Inventory | PurchaseModal | N/A | DirectIntakeWorkSurface | BLOCKED |
| GF-002 | PurchaseOrders | PurchaseOrdersWorkSurface | N/A | Partial | PARTIAL |
| GF-003 | Orders | CreateOrder, OrderDetail | N/A | N/A | BLOCKED |
| GF-004 | Invoices | InvoicesWorkSurface | PaymentInspector | InvoiceToPaymentFlow | IMPLEMENTED |
| GF-005 | PickPackPage | PickPackPage | N/A | N/A | FUNCTIONAL |
| GF-006 | ClientLedger | ClientLedger | N/A | N/A | FUNCTIONAL |
| GF-007 | Inventory | Inventory | BatchDetailDrawer | N/A | BLOCKED |
| GF-008 | SampleManagement | SampleForm, SampleList | N/A | N/A | PARTIAL |

---

## Component Statistics

| Category | Count |
|----------|-------|
| Pages | 20+ |
| Work Surfaces | 5 |
| Golden Flow UIs | 8 |
| Reusable Components | 50+ |
