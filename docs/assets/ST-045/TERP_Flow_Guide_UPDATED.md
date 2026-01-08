# TERP User Flow Guide (v2.0)

_Generated: 2026-01-08 | Source: Codebase analysis of server routers, client routes, and RBAC definitions_

## Overview

This guide documents all user flows in the TERP application, organized by business domain and entity. Each flow includes:
- **tRPC Procedure**: The API endpoint
- **Type**: query (read) or mutation (write)
- **Auth Level**: publicProcedure, protectedProcedure, adminProcedure, or strictlyProtectedProcedure
- **Permission**: Required RBAC permission string (if any)
- **Roles**: User roles that can access this flow

### Authentication Levels

| Level | Description |
|-------|-------------|
| `publicProcedure` | No authentication required |
| `protectedProcedure` | Requires valid session + permission check |
| `adminProcedure` | Requires authenticated admin user |
| `strictlyProtectedProcedure` | Highest security level, additional verification |

### Permission Format

Permissions follow the pattern `module:action`:
- **Modules**: clients, orders, inventory, accounting, pricing, analytics, todos, audit, settings, system
- **Actions**: read, create, update, delete, manage

---

## Domain 1: Accounting

### 1.1 Invoices (Accounts Receivable)

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Invoices | `invoices.list` | query | protected | accounting:read | Super Admin, Accounting Manager |
| Get Invoice | `invoices.getById` | query | protected | accounting:read | Super Admin, Accounting Manager |
| Generate from Order | `invoices.generateFromOrder` | mutation | protected | accounting:create | Super Admin, Accounting Manager |
| Update Status | `invoices.updateStatus` | mutation | protected | accounting:update | Super Admin, Accounting Manager |
| Mark as Sent | `invoices.markSent` | mutation | protected | accounting:update | Super Admin, Accounting Manager |
| Void Invoice | `invoices.void` | mutation | protected | accounting:delete | Super Admin, Accounting Manager |
| Get Summary | `invoices.getSummary` | query | protected | accounting:read | Super Admin, Accounting Manager |
| Check Overdue | `invoices.checkOverdue` | mutation | protected | accounting:update | System/Scheduled |

**Invoice Status Lifecycle:**
```
DRAFT → SENT → VIEWED → PARTIAL → PAID
                ↓
              OVERDUE
                ↓
              VOID (terminal)
```

### 1.2 Payments

| Flow | Procedure | Type | Auth | Permission | Purpose |
|------|-----------|------|------|------------|---------|
| Preview Balance | `accounting.previewPaymentBalance` | query | protected | accounting:read | Preview client balance before payment |
| Receive Client Payment | `accounting.receiveClientPayment` | mutation | protected | accounting:create | WS-001: Cash drop-off from client |
| Pay Vendor | `accounting.payVendor` | mutation | protected | accounting:create | WS-002: Cash out to vendor |
| Record Payment | `accounting.recordPayment` | mutation | protected | accounting:update | Record payment against invoice/bill |

### 1.3 Accounts Receivable Reports

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get AR Summary | `accounting.getARSummary` | query | protected | accounting:read |
| Get AR Aging | `accounting.getARAging` | query | protected | accounting:read |
| Get Outstanding Receivables | `accounting.getOutstandingReceivables` | query | protected | accounting:read |
| Get Overdue Invoices | `accounting.getOverdueInvoices` | query | protected | accounting:read |
| Get Client Statement | `accounting.getClientStatement` | query | protected | accounting:read |

### 1.4 Accounts Payable Reports

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get AP Summary | `accounting.getAPSummary` | query | protected | accounting:read |
| Get AP Aging | `accounting.getAPAging` | query | protected | accounting:read |
| Get Outstanding Payables | `accounting.getOutstandingPayables` | query | protected | accounting:read |
| Get Overdue Bills | `accounting.getOverdueBills` | query | protected | accounting:read |

### 1.5 Bank Accounts & Transactions

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Bank Accounts | `accounting.list` (bank accounts) | query | protected | accounting:read |
| Create Bank Account | `accounting.create` (bank account) | mutation | protected | accounting:create |
| Update Balance | `accounting.updateBalance` | mutation | protected | accounting:update |
| Get Total Cash Balance | `accounting.getTotalCashBalance` | query | protected | accounting:read |
| List Transactions | `accounting.list` (transactions) | query | protected | accounting:read |
| Create Transaction | `accounting.create` (transaction) | mutation | protected | accounting:create |
| Reconcile | `accounting.reconcile` | mutation | protected | accounting:update |
| Get Unreconciled | `accounting.getUnreconciled` | query | protected | accounting:read |

### 1.6 Fiscal Periods

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Periods | `accounting.list` (periods) | query | protected | accounting:read |
| Get Current Period | `accounting.getCurrent` | query | protected | accounting:read |
| Create Period | `accounting.create` (period) | mutation | protected | accounting:create |
| Close Period | `accounting.close` | mutation | protected | accounting:update |
| Lock Period | `accounting.lock` | mutation | protected | accounting:update |
| Reopen Period | `accounting.reopen` | mutation | protected | accounting:update |

**Fiscal Period Status Lifecycle:**
```
OPEN → CLOSED → LOCKED (terminal)
  ↑       ↓
  └───────┘ (reopen)
```

### 1.7 General Ledger

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Chart of Accounts | `accounting.getChartOfAccounts` | query | protected | accounting:read |
| Post Journal Entry | `accounting.postJournalEntry` | mutation | protected | accounting:create |
| Get Trial Balance | `accounting.getTrialBalance` | query | protected | accounting:read |
| Get Account Balance | `accounting.getBalance` | query | protected | accounting:read |

### 1.8 Expenses

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Expenses | `accounting.list` (expenses) | query | protected | accounting:read |
| Create Expense | `accounting.create` (expense) | mutation | protected | accounting:create |
| Update Expense | `accounting.update` (expense) | mutation | protected | accounting:update |
| Mark Reimbursed | `accounting.markReimbursed` | mutation | protected | accounting:update |
| Get Pending Reimbursements | `accounting.getPendingReimbursements` | query | protected | accounting:read |
| Get Breakdown by Category | `accounting.getBreakdownByCategory` | query | protected | accounting:read |

### 1.9 Bad Debt Management

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Write Off | `badDebt.writeOff` | mutation | protected | accounting:manage |
| Reverse Write-Off | `badDebt.reverse` | mutation | protected | accounting:manage |
| Get by Client | `badDebt.getByClient` | query | protected | accounting:manage |
| Get Aging Report | `badDebt.getAgingReport` | query | protected | accounting:manage |

---

## Domain 2: CRM (Client Relationship Management)

### 2.1 Clients (Core)

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Clients | `clients.list` | query | protected | clients:read | Super Admin, Sales Manager, Sales Rep |
| Get Count | `clients.count` | query | protected | clients:read | Super Admin, Sales Manager, Sales Rep |
| Get Client | `clients.getById` | query | protected | clients:read | Super Admin, Sales Manager, Sales Rep |
| Get by TERI Code | `clients.getByTeriCode` | query | protected | clients:read | Super Admin, Sales Manager, Sales Rep |
| Check TERI Available | `clients.checkTeriCodeAvailable` | query | protected | clients:read | Super Admin, Sales Manager, Sales Rep |
| Create Client | `clients.create` | mutation | protected | clients:create | Super Admin, Sales Manager |
| Update Client | `clients.update` | mutation | protected | clients:update | Super Admin, Sales Manager |
| Delete Client | `clients.delete` | mutation | protected | clients:delete | Super Admin |
| Archive Client | `clients.archive` | mutation | protected | clients:delete | Super Admin, Sales Manager |

**Client Role Flags:**
- `isBuyer` - Can purchase products
- `isSeller` - Can supply products (has supplier profile)
- `isBrand` - Represents a brand
- `isReferee` - Referral source
- `isContractor` - Service contractor

### 2.2 Supplier Profiles

For clients with `isSeller = true`:

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Supplier Profile | `clients.getSupplierProfile` | query | protected | clients:read |
| Update Supplier Profile | `clients.updateSupplierProfile` | mutation | protected | clients:update |

### 2.3 Client Transactions

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Transactions | `clients.transactions.list` | query | protected | clients:read |
| Get Transaction | `clients.transactions.getById` | query | protected | clients:read |
| Create Transaction | `clients.transactions.create` | mutation | protected | clients:create |
| Update Transaction | `clients.transactions.update` | mutation | protected | clients:update |
| Record Payment | `clients.transactions.recordPayment` | mutation | protected | clients:read |
| Delete Transaction | `clients.transactions.delete` | mutation | protected | clients:delete |
| Link Transactions | `clients.transactions.linkTransaction` | mutation | protected | clients:read |
| Get with Relationships | `clients.transactions.getWithRelationships` | query | protected | clients:read |
| Get History | `clients.transactions.getHistory` | query | protected | clients:read |

**Transaction Link Types:**
- `REFUND_OF` - Refund linked to original transaction
- `PAYMENT_FOR` - Payment applied to invoice
- `CREDIT_APPLIED_TO` - Credit applied to transaction
- `CONVERTED_FROM` - Quote converted to order
- `PARTIAL_OF` - Partial payment
- `RELATED_TO` - General relationship

### 2.4 Client Activity & Communication

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Activity | `clients.activity.list` | query | protected | clients:read |
| Get All Tags | `clients.tags.getAll` | query | protected | clients:read |
| Add Tag | `clients.tags.add` | mutation | protected | clients:create |
| Remove Tag | `clients.tags.remove` | mutation | protected | clients:delete |
| Get Note ID | `clients.notes.getNoteId` | query | protected | clients:read |
| Link Note | `clients.notes.linkNote` | mutation | protected | clients:read |
| List Communications | `clients.communications.list` | query | protected | clients:read |
| Add Communication | `clients.communications.add` | mutation | protected | clients:create |

---

## Domain 3: Inventory

### 3.1 Batches (Sellable Units)

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Batches | `batches.list` | query | protected | inventory:read | Super Admin, Inventory Manager, Sales Rep |
| Get Batch | `batches.getById` | query | protected | inventory:read | Super Admin, Inventory Manager, Sales Rep |
| Create Batch | `batches.create` | mutation | protected | inventory:create | Super Admin, Inventory Manager |
| Update Batch | `batches.update` | mutation | protected | inventory:update | Super Admin, Inventory Manager |
| Delete Batch | `batches.delete` | mutation | protected | inventory:delete | Super Admin |
| Update Status | `batches.updateStatus` | mutation | protected | inventory:update | Super Admin, Inventory Manager |
| Get Available Qty | `batches.getAvailableQuantity` | query | protected | inventory:read | All inventory roles |

**Batch Status Lifecycle:**
```
AWAITING_INTAKE → LIVE → SOLD_OUT
                   ↓
        PHOTOGRAPHY_COMPLETE
                   ↓
              ON_HOLD / QUARANTINED
                   ↓
                CLOSED (terminal)
```

### 3.2 Inventory Movements

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Record Movement | `inventoryMovements.record` | mutation | protected | inventory:read |
| Decrease Inventory | `inventoryMovements.decrease` | mutation | protected | inventory:read |
| Increase Inventory | `inventoryMovements.increase` | mutation | protected | inventory:read |
| Adjust Inventory | `inventoryMovements.adjust` | mutation | protected | inventory:read |
| Get by Batch | `inventoryMovements.getByBatch` | query | protected | inventory:read |
| Get by Reference | `inventoryMovements.getByReference` | query | protected | inventory:read |
| Validate Availability | `inventoryMovements.validateAvailability` | query | protected | inventory:read |
| Get Summary | `inventoryMovements.getSummary` | query | protected | inventory:read |
| Reverse Movement | `inventoryMovements.reverse` | mutation | protected | inventory:read |

**Movement Types:**
- `INTAKE` - Initial inventory intake
- `SALE` - Sold to customer
- `RETURN` - Customer return
- `REFUND_RETURN` - Refund with inventory return
- `ADJUSTMENT` - Manual adjustment
- `QUARANTINE` / `RELEASE_FROM_QUARANTINE`
- `DISPOSAL` - Disposed inventory
- `TRANSFER` - Location transfer
- `SAMPLE` - Sample allocation

**Adjustment Reasons:**
- `DAMAGED`, `EXPIRED`, `LOST`, `THEFT`
- `COUNT_DISCREPANCY`, `QUALITY_ISSUE`, `REWEIGH`, `OTHER`

### 3.3 COGS Management

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get COGS | `cogs.getCOGS` | query | protected | (none) |
| Calculate Impact | `cogs.calculateImpact` | query | protected | (none) |
| Update Batch COGS | `cogs.updateBatchCogs` | mutation | protected | (none) |
| Get History | `cogs.getHistory` | query | protected | (none) |
| Get COGS by Batch | `cogs.getCOGSByBatch` | query | protected | (none) |

### 3.4 Products

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Products | `productCatalogue.list` | query | protected | (none) |
| Get Product | `productCatalogue.getById` | query | protected | (none) |
| Create Product | `productCatalogue.create` | mutation | protected | (none) |
| Update Product | `productCatalogue.update` | mutation | protected | (none) |
| Delete Product | `productCatalogue.delete` | mutation | protected | (none) |
| Restore Product | `productCatalogue.restore` | mutation | protected | (none) |
| Get Categories | `productCatalogue.getCategories` | query | protected | (none) |
| Get Brands | `productCatalogue.getBrands` | query | protected | (none) |

### 3.5 Strains

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Strains | `strains.list` | query | protected | inventory:read |
| Get Strain | `strains.getById` | query | protected | inventory:read |
| Search Strains | `strains.search` | query | protected | inventory:read |
| Create Strain | `strains.create` | mutation | protected | inventory:create |
| Get Family | `strains.getFamily` | query | protected | inventory:read |
| Get Family Stats | `strains.getFamilyStats` | query | protected | inventory:read |
| Fuzzy Search | `strains.fuzzySearch` | query | protected | inventory:read |
| Get or Create | `strains.getOrCreate` | mutation | protected | inventory:create |

---

## Domain 4: Orders & Sales

### 4.1 Orders (Core)

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| Create Order | `orders.create` | mutation | protected | orders:create | Super Admin, Sales Manager, Sales Rep |
| Get Order | `orders.getById` | query | protected | orders:read | Super Admin, Sales Manager, Sales Rep |
| Get by Client | `orders.getByClient` | query | protected | orders:read | Super Admin, Sales Manager, Sales Rep |
| Get All Orders | `orders.getAll` | query | protected | orders:read | Super Admin, Sales Manager, Sales Rep |
| Update Order | `orders.update` | mutation | protected | orders:update | Super Admin, Sales Manager |
| Delete Order | `orders.delete` | mutation | protected | orders:delete | Super Admin |
| Restore Order | `orders.restore` | mutation | protected | orders:delete | Super Admin |
| Get with Line Items | `orders.getOrderWithLineItems` | query | protected | orders:read | All order roles |
| Get Audit Log | `orders.getAuditLog` | query | protected | orders:read | Super Admin, Sales Manager |

### 4.2 Draft Orders (Enhanced Workflow)

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Create Draft Enhanced | `orders.createDraftEnhanced` | mutation | protected | orders:create |
| Update Draft Enhanced | `orders.updateDraftEnhanced` | mutation | protected | orders:update |
| Confirm Draft | `orders.confirmDraftOrder` | mutation | protected | orders:create |
| Finalize Draft | `orders.finalizeDraft` | mutation | protected | orders:create |
| Update Draft | `orders.updateDraftOrder` | mutation | protected | orders:update |
| Delete Draft | `orders.deleteDraftOrder` | mutation | protected | orders:delete |

### 4.3 Order Status & Fulfillment

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Update Status | `orders.updateOrderStatus` | mutation | protected | orders:update |
| Get Status History | `orders.getOrderStatusHistory` | query | protected | orders:read |
| Confirm Order | `orders.confirmOrder` | mutation | protected | orders:update |
| Fulfill Order | `orders.fulfillOrder` | mutation | protected | orders:update |
| Ship Order | `orders.shipOrder` | mutation | protected | orders:update |
| Deliver Order | `orders.deliverOrder` | mutation | protected | orders:update |

**Order Type:**
- `QUOTE` - Price quotation
- `SALE` - Confirmed order

**Quote Status Lifecycle:**
```
PENDING → ACCEPTED → (converts to SALE)
    ↓
REJECTED / EXPIRED
```

**Sale Status Lifecycle:**
```
PENDING → PARTIAL → PAID
    ↓
OVERDUE / CANCELLED
```

**Fulfillment Status Lifecycle:**
```
PENDING → PACKED → SHIPPED → (DELIVERED)
```

### 4.4 Returns & Conversions

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Process Return | `orders.processReturn` | mutation | protected | orders:update |
| Get Order Returns | `orders.getOrderReturns` | query | protected | orders:read |
| Convert to Sale | `orders.convertToSale` | mutation | protected | orders:create |
| Convert Quote to Sale | `orders.convertQuoteToSale` | mutation | protected | orders:create |
| Export Order | `orders.export` | mutation | protected | orders:read |

### 4.5 Pick & Pack (WS-003)

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Pick List | `pickPack.getPickList` | query | admin | (none) |
| Get Order Details | `pickPack.getOrderDetails` | query | admin | (none) |
| Pack Items | `pickPack.packItems` | mutation | admin | (none) |
| Unpack Items | `pickPack.unpackItems` | mutation | admin | (none) |
| Mark All Packed | `pickPack.markAllPacked` | mutation | admin | (none) |
| Mark Order Ready | `pickPack.markOrderReady` | mutation | admin | (none) |
| Update Status | `pickPack.updateStatus` | mutation | admin | (none) |
| Get Stats | `pickPack.getStats` | query | admin | (none) |

### 4.6 Order Pricing

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Margin for Product | `orders.getMarginForProduct` | query | protected | orders:read |
| Calculate Price | `orders.calculatePrice` | query | protected | orders:read |
| Update Line Item COGS | `orders.updateLineItemCOGS` | mutation | protected | orders:update |

---

## Domain 5: Pricing

### 5.1 Pricing Rules

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Rules | `pricing.listRules` | query | protected | pricing:read | Super Admin, Sales Manager |
| Get Rule | `pricing.getRuleById` | query | protected | pricing:read | Super Admin, Sales Manager |
| Create Rule | `pricing.createRule` | mutation | protected | pricing:create | Super Admin, Sales Manager |
| Update Rule | `pricing.updateRule` | mutation | protected | pricing:update | Super Admin, Sales Manager |
| Delete Rule | `pricing.deleteRule` | mutation | protected | pricing:read | Super Admin, Sales Manager |

### 5.2 Pricing Profiles

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Profiles | `pricing.listProfiles` | query | protected | pricing:read |
| Get Profile | `pricing.getProfileById` | query | protected | pricing:read |
| Create Profile | `pricing.createProfile` | mutation | protected | pricing:create |
| Update Profile | `pricing.updateProfile` | mutation | protected | pricing:update |
| Delete Profile | `pricing.deleteProfile` | mutation | protected | pricing:read |
| Apply to Client | `pricing.applyProfileToClient` | mutation | protected | pricing:read |
| Get Client Rules | `pricing.getClientPricingRules` | query | protected | pricing:read |

### 5.3 Default Pricing

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get All Defaults | `pricingDefaults.getAll` | query | protected | pricing:read |
| Get by Category | `pricingDefaults.getByCategory` | query | protected | pricing:read |
| Upsert Default | `pricingDefaults.upsert` | mutation | protected | pricing:read |
| Get Margin with Fallback | `pricingDefaults.getMarginWithFallback` | query | protected | pricing:read |

---

## Domain 6: Calendar & Scheduling

### 6.1 Calendar Events

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Events | `calendar.getEvents` | query | public | (none) |
| Get Event | `calendar.getEventById` | query | public | (none) |
| Create Event | `calendar.createEvent` | mutation | public | (none) |
| Update Event | `calendar.updateEvent` | mutation | public | (none) |
| Delete Event | `calendar.deleteEvent` | mutation | public | (none) |
| Get by Entity | `calendar.getEventsByEntity` | query | public | (none) |
| Get My Events | `calendar.getMyEvents` | query | protected | (none) |
| Get Event History | `calendar.getEventHistory` | query | public | (none) |
| Get by Client | `calendar.getEventsByClient` | query | public | (none) |

### 6.2 Recurrence

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Recurrence Rule | `calendarRecurrence.getRecurrenceRule` | query | public | (none) |
| Get Instances | `calendarRecurrence.getInstances` | query | public | (none) |
| Modify Instance | `calendarRecurrence.modifyInstance` | mutation | public | (none) |
| Cancel Instance | `calendarRecurrence.cancelInstance` | mutation | public | (none) |
| Update Rule | `calendarRecurrence.updateRecurrenceRule` | mutation | public | (none) |

### 6.3 Invitations

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Create Invitation | `calendarInvitations.createInvitation` | mutation | public | (none) |
| Send Invitation | `calendarInvitations.sendInvitation` | mutation | public | (none) |
| Respond to Invitation | `calendarInvitations.respondToInvitation` | mutation | public | (none) |
| Get Pending | `calendarInvitations.getPendingInvitations` | query | public | (none) |
| Bulk Send | `calendarInvitations.bulkSendInvitations` | mutation | public | (none) |

### 6.4 Time Off Requests

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Request Time Off | `timeOffRequests.request` | mutation | protected | (none) |
| Approve Request | `timeOffRequests.approve` | mutation | protected | (none) |
| Reject Request | `timeOffRequests.reject` | mutation | protected | (none) |
| List Requests | `timeOffRequests.list` | query | protected | (none) |
| Cancel Request | `timeOffRequests.cancel` | mutation | protected | (none) |

**Time Off Status Lifecycle:**
```
PENDING → APPROVED / REJECTED
    ↓
CANCELLED
```

---

## Domain 7: Workflow & Productivity

### 7.1 Todo Tasks

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get List Tasks | `todoTasks.getListTasks` | query | protected | todos:read |
| Get My Tasks | `todoTasks.getMyTasks` | query | protected | todos:read |
| Get Task | `todoTasks.getById` | query | protected | todos:read |
| Create Task | `todoTasks.create` | mutation | protected | todos:create |
| Update Task | `todoTasks.update` | mutation | protected | todos:update |
| Delete Task | `todoTasks.delete` | mutation | protected | todos:delete |
| Complete Task | `todoTasks.complete` | mutation | protected | todos:read |
| Uncomplete Task | `todoTasks.uncomplete` | mutation | protected | todos:read |
| Assign Task | `todoTasks.assign` | mutation | protected | todos:read |
| Reorder Tasks | `todoTasks.reorder` | mutation | protected | todos:read |
| Get Overdue | `todoTasks.getOverdue` | query | protected | todos:read |
| Get Due Soon | `todoTasks.getDueSoon` | query | protected | todos:read |
| Get List Stats | `todoTasks.getListStats` | query | protected | todos:read |

**Task Status:**
- `todo` - Not started
- `in_progress` - Currently working
- `done` - Completed

**Task Priority:**
- `low`, `medium`, `high`, `urgent`

---

## Domain 8: Dashboard & Analytics

### 8.1 Dashboard

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Dashboard Data | `dashboardEnhanced.getDashboardData` | query | public | (none) |
| Get Sales Performance | `dashboardEnhanced.getSalesPerformance` | query | public | (none) |
| Get AR Aging Report | `dashboardEnhanced.getARAgingReport` | query | public | (none) |
| Get Inventory Valuation | `dashboardEnhanced.getInventoryValuation` | query | public | (none) |
| Get Top Products | `dashboardEnhanced.getTopProducts` | query | public | (none) |
| Get Top Clients | `dashboardEnhanced.getTopClients` | query | public | (none) |
| Get Profitability Metrics | `dashboardEnhanced.getProfitabilityMetrics` | query | public | (none) |
| Export Data | `dashboardEnhanced.exportData` | mutation | public | (none) |

### 8.2 Dashboard Alerts

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Generate Alerts | `dashboardEnhanced.generateAlerts` | mutation | public | (none) |
| Get Active Alerts | `dashboardEnhanced.getActiveAlerts` | query | public | (none) |
| Get Alert Summary | `dashboardEnhanced.getAlertSummary` | query | public | (none) |
| Acknowledge Alert | `dashboardEnhanced.acknowledgeAlert` | mutation | public | (none) |
| Resolve Alert | `dashboardEnhanced.resolveAlert` | mutation | public | (none) |

### 8.3 Analytics

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Summary | `analytics.getSummary` | query | protected | analytics:read |
| Get Extended Summary | `analytics.getExtendedSummary` | query | protected | analytics:read |
| Get Revenue Trends | `analytics.getRevenueTrends` | query | protected | analytics:read |
| Get Top Clients | `analytics.getTopClients` | query | protected | analytics:read |
| Client Strain Preferences | `analytics.clientStrainPreferences` | query | protected | analytics:read |
| Top Strain Families | `analytics.topStrainFamilies` | query | protected | analytics:read |
| Strain Family Trends | `analytics.strainFamilyTrends` | query | protected | analytics:read |
| Export Data | `analytics.exportData` | mutation | protected | analytics:read |

---

## Domain 9: Administration

### 9.1 RBAC Role Management

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Roles | `rbacRoles.list` | query | protected | (none) | Super Admin |
| Get Role | `rbacRoles.getById` | query | protected | (none) | Super Admin |
| Create Role | `rbacRoles.create` | mutation | protected | (none) | Super Admin |
| Update Role | `rbacRoles.update` | mutation | protected | (none) | Super Admin |
| Delete Role | `rbacRoles.delete` | mutation | protected | (none) | Super Admin |
| Assign Permission | `rbacRoles.assignPermission` | mutation | protected | (none) | Super Admin |
| Remove Permission | `rbacRoles.removePermission` | mutation | protected | (none) | Super Admin |
| Bulk Assign Permissions | `rbacRoles.bulkAssignPermissions` | mutation | protected | (none) | Super Admin |
| Replace Permissions | `rbacRoles.replacePermissions` | mutation | protected | (none) | Super Admin |

### 9.2 User Management

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Users | `userManagement.listUsers` | query | strictlyProtected | (none) | Super Admin |
| Create User | `userManagement.createUser` | mutation | strictlyProtected | (none) | Super Admin |
| Delete User | `userManagement.deleteUser` | mutation | strictlyProtected | (none) | Super Admin |
| Reset Password | `userManagement.resetPassword` | mutation | strictlyProtected | (none) | Super Admin |

### 9.3 System Configuration

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Config | `configuration.get` | query | protected | settings:manage |
| Get Config Value | `configuration.getValue` | query | protected | settings:manage |
| Set Config Value | `configuration.setValue` | mutation | protected | settings:manage |
| Reset Config | `configuration.reset` | mutation | protected | settings:manage |
| Get History | `configuration.getHistory` | query | protected | settings:manage |
| Get Feature Flags | `configuration.getFeatureFlags` | query | protected | settings:manage |

### 9.4 System Monitoring

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Recent Metrics | `monitoring.getRecentMetrics` | query | admin | (none) |
| Get Slow Query Stats | `monitoring.getSlowQueryStats` | query | admin | (none) |
| Get Performance Summary | `monitoring.getPerformanceSummary` | query | admin | (none) |
| Get Procedure Metrics | `monitoring.getProcedureMetrics` | query | admin | (none) |

### 9.5 Audit Logs

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Query Audit Logs | `auditLogs.query` | query | protected | audit:read |
| Get Entity Trail | `auditLogs.getEntityTrail` | query | protected | audit:read |
| Export Audit Logs | `auditLogs.export` | query | protected | audit:read |
| Get User History | `auditLogs.getUserHistory` | query | strictlyProtected | users:read |

---

## Domain 10: Authentication

### 10.1 Auth Flows

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Current User | `auth.me` | query | public | (none) |
| Logout | `auth.logout` | mutation | public | (none) |
| Update Profile | `auth.updateProfile` | mutation | strictlyProtected | (none) |
| Change Password | `auth.changePassword` | mutation | strictlyProtected | (none) |

---

## Known Issues & RBAC Gaps

### Permission Strings Not in RBAC Seed

The following permission strings are used in code but not present in the RBAC seed data:

| Permission | Module | Used By |
|------------|--------|---------|
| `accounting:read` | Accounting | All accounting read operations |
| `accounting:create` | Accounting | Invoice generation, payments |
| `accounting:update` | Accounting | Status updates, reconciliation |
| `accounting:delete` | Accounting | Void operations |
| `accounting:manage` | Accounting | Bad debt, fiscal period management |
| `analytics:read` | Analytics | All analytics queries |
| `settings:manage` | Admin | Configuration management |
| `audit:read` | Admin | Audit log access |

**Recommendation:** Run the RBAC seed script to add missing permission strings, or create them via the admin UI.

### Deprecated Routers

The `vendors` router is deprecated. All vendor operations should use the `clients` router with `isSeller = true`.

---

## Appendix: Client Routes

| Route | Page | Auth Required | Primary Entity |
|-------|------|---------------|----------------|
| `/` | Dashboard | Yes | Dashboard |
| `/clients` | Client List | Yes | Clients |
| `/clients/:id` | Client Detail | Yes | Clients |
| `/inventory` | Inventory List | Yes | Batches |
| `/inventory/:id` | Batch Detail | Yes | Batches |
| `/orders` | Order List | Yes | Orders |
| `/orders/:id` | Order Detail | Yes | Orders |
| `/accounting/*` | Accounting Module | Yes | Invoices, Bills, etc. |
| `/calendar` | Calendar | Yes | Events |
| `/analytics` | Analytics | Yes | Analytics |
| `/admin/*` | Admin Pages | Yes (Admin) | Users, Roles, Config |

---

_End of TERP User Flow Guide v2.0_
