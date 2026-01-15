# TERP User Flow Guide (v3.2)

_Generated: 2026-01-15 | Source: Comprehensive codebase analysis of 123 server routers, 54 client pages, and RBAC definitions_

## Overview

This guide documents all user flows in the TERP application, organized by business domain and entity. Each flow includes:
- **tRPC Procedure**: The API endpoint
- **Type**: query (read) or mutation (write)
- **Auth Level**: publicProcedure, protectedProcedure, adminProcedure, strictlyProtectedProcedure, or vipPortalProcedure
- **Permission**: Required RBAC permission string (if any)
- **Roles**: User roles that can access this flow
- **Expected Effects**: Business logic side effects and outcomes (v3.2)

**Statistics (v3.2 - 100% Coverage with Business Logic):**
- Total Routers: 123 (119 main + 4 subdirectory)
- Total Procedures: 1,414+
- Total Domains: 26
- Total Features: 70
- Client Routes: 54 pages, 41 defined routes
- Documentation Coverage: 100%

---

## Business Logic & Expected Effects

This section documents the key business logic patterns, side effects, and expected outcomes for major operations across the system.

### Accounting Domain Effects

| Operation | Side Effects | State Changes |
|-----------|--------------|---------------|
| **Generate Invoice from Order** | Creates GL entry (debit AR, credit Revenue). Updates order.invoiceId. Calculates due date from payment terms. | Invoice: DRAFT |
| **Mark Invoice Sent** | Records sentAt timestamp. Triggers client notification. Starts aging clock. | Invoice: DRAFT → SENT |
| **Record Payment** | Creates GL entries (debit Cash, credit AR). Auto-applies to oldest invoices (FIFO). Updates client balance. | Invoice: SENT → PARTIAL/PAID |
| **Void Invoice** | IRREVERSIBLE. Reverses GL entries. Updates client balance. Requires reason. Cannot void if payments applied. | Invoice: → VOID |
| **Bad Debt Write-Off** | Creates GL entry (debit Bad Debt Expense, credit AR). Updates client credit status to SUSPENDED. | Client: credit_status → SUSPENDED |

### Order Domain Effects

| Operation | Side Effects | State Changes |
|-----------|--------------|---------------|
| **Create Draft Order** | Soft-reserves inventory (visible but not committed). Calculates margins per line item. | Order: DRAFT |
| **Confirm Draft Order** | Commits inventory reservations (hard reserve). Validates credit limit. Sends to fulfillment queue. | Order: DRAFT → PENDING |
| **Fulfill Order** | Deducts inventory from batches. Creates inventory movements (type=SALE). Handles partial fulfillment. | Order: CONFIRMED → FULFILLED, Batch: quantity decreases |
| **Ship Order** | Records carrier/tracking. Triggers shipping notification. Sets expected delivery date. | Order: PACKED → SHIPPED |
| **Deliver Order** | Can trigger auto-invoice generation. Starts payment terms clock. Awards gamification points. | Order: SHIPPED → DELIVERED |
| **Process Return** | Creates return record. Triggers inventory restoration workflow. May create credit memo or refund. | Order: creates linked Return |

### Inventory Domain Effects

| Operation | Side Effects | State Changes |
|-----------|--------------|---------------|
| **Create Batch** | Generates unique batch ID. Creates inventory movement (type=INTAKE). Updates location counts. | Batch: AWAITING_INTAKE |
| **Update Batch Status** | LIVE: makes available for sale. DEPLETED: auto-set when quantity=0. EXPIRED: removes from availability. | Batch: status transition |
| **Record Movement** | Updates batch quantity. Links to reference document (order/PO/transfer). Maintains running balance. | Batch: quantity changes |
| **Adjust Inventory** | Creates ADJUSTMENT movement with reason code. May trigger manager alert for large adjustments. | Batch: quantity changes |
| **Update COGS** | Records audit trail. Recalculates pending order margins. May trigger margin alerts if below threshold. | Batch: cogs updated, Orders: margins recalculated |

### CRM Domain Effects

| Operation | Side Effects | State Changes |
|-----------|--------------|---------------|
| **Create Client** | Generates TERI code. Sets default payment terms/credit limit. Links referrer (triggers gamification points). | Client: created |
| **Update Client** | Optimistic locking (version check). Credit limit changes may trigger credit review. | Client: updated |
| **Archive Client** | Soft delete (sets deletedAt). Validates no pending orders. Preserves history for reporting. | Client: deletedAt set |

### VIP Portal Effects

| Operation | Side Effects | State Changes |
|-----------|--------------|---------------|
| **VIP Login** | Creates session token (JWT). Logs login event. Rate limited. | Session: created |
| **Create Need** | Creates need record. Notifies sales team. Used for demand forecasting. | Need: PENDING |
| **Enable VIP Portal** | Generates client portal credentials. Sets VIP flag. Sends welcome email. | Client: vipEnabled = true |

### Live Shopping Effects

| Operation | Side Effects | State Changes |
|-----------|--------------|---------------|
| **Create Session** | Generates session ID. Enables real-time inventory visibility. Notifies warehouse. | Session: ACTIVE |
| **Add to Cart** | Soft holds inventory. Calculates client-specific pricing. Broadcasts to participants. | Item: INTERESTED |
| **End Session** | Converts CONFIRMED items to order. Releases unpurchased items. Creates order if applicable. | Session: COMPLETED, Order: created |

### Gamification Effects

| Operation | Side Effects | State Changes |
|-----------|--------------|---------------|
| **Record Referral** | Links referrer to new client. Awards points on first purchase. Tracks couch tax chain. | Referral: created |
| **Redeem Reward** | Deducts points. Creates redemption record. Triggers fulfillment (physical) or instant delivery (digital). | Points: deducted, Redemption: created |
| **Process Couch Tax** | Traverses referral network. Awards percentage to each level. Creates distribution record. | Points: awarded to chain |

---

### Authentication Levels

| Level | Description |
|-------|-------------|
| `publicProcedure` | No authentication required |
| `protectedProcedure` | Requires valid session + permission check |
| `adminProcedure` | Requires authenticated admin user |
| `strictlyProtectedProcedure` | Highest security level, additional verification |
| `vipPortalProcedure` | VIP portal client sessions with token verification |

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

## Domain 11: VIP Portal

### 11.1 VIP Portal Core

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| VIP Login | `vipPortal.login` | mutation | public | (none) | VIP Client |
| VIP Logout | `vipPortal.logout` | mutation | public | (none) | VIP Client |
| Verify Session | `vipPortal.verifySession` | query | public | (none) | VIP Client |
| Get VIP Dashboard | `vipPortal.getSummary` | query | vipPortal | (none) | VIP Client |
| Get VIP KPIs | `vipPortal.getKPIs` | query | vipPortal | (none) | VIP Client |
| Get VIP Leaderboard | `vipPortal.getLeaderboard` | query | vipPortal | (none) | VIP Client |
| Get History | `vipPortal.getHistory` | query | vipPortal | (none) | VIP Client |
| Get Supply | `vipPortal.getSupply` | query | vipPortal | (none) | VIP Client |
| Get Invoices | `vipPortal.getInvoices` | query | vipPortal | (none) | VIP Client |
| Get Needs | `vipPortal.getNeeds` | query | vipPortal | (none) | VIP Client |
| Create Need | `vipPortal.createNeed` | mutation | vipPortal | (none) | VIP Client |
| Create Supply | `vipPortal.createSupply` | mutation | vipPortal | (none) | VIP Client |

### 11.2 VIP Portal Admin

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List VIP Clients | `vipPortalAdmin.listVipClients` | query | protected | (none) |
| Enable VIP Portal | `vipPortalAdmin.enableVipPortal` | mutation | protected | (none) |
| Disable VIP Portal | `vipPortalAdmin.disableVipPortal` | mutation | protected | (none) |
| Impersonate Client | `vipPortalAdmin.impersonate` | mutation | protected | (none) |
| Get VIP Config | `vipPortalAdmin.getConfig` | query | protected | (none) |
| Update VIP Config | `vipPortalAdmin.updateConfig` | mutation | protected | (none) |
| Get Active Sessions | `vipPortalAdmin.getActiveSessions` | query | protected | (none) |
| Revoke Session | `vipPortalAdmin.revokeSession` | mutation | protected | (none) |

### 11.3 VIP Tiers

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Tiers | `vipTiers.list` | query | protected | (none) |
| Create Tier | `vipTiers.create` | mutation | admin | (none) |
| Update Tier | `vipTiers.update` | mutation | admin | (none) |
| Delete Tier | `vipTiers.delete` | mutation | admin | (none) |
| Get Client Status | `vipTiers.getClientStatus` | query | protected | (none) |
| Override Client Tier | `vipTiers.overrideClientTier` | mutation | admin | (none) |
| Recalculate All Tiers | `vipTiers.recalculateAllTiers` | mutation | admin | (none) |
| Get My VIP Status | `vipTiers.getMyVipStatus` | query | vipPortal | (none) |

---

## Domain 12: Live Shopping

### 12.1 Live Shopping Sessions

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| Create Session | `liveShopping.createSession` | mutation | protected | (none) | Sales Rep, Manager |
| Get Active Sessions | `liveShopping.getActive` | query | protected | (none) | All Sales |
| Get Session | `liveShopping.getSession` | query | protected | (none) | All Sales |
| End Session | `liveShopping.endSession` | mutation | protected | (none) | Session Owner |
| Cancel Session | `liveShopping.cancelSession` | mutation | protected | (none) | Session Owner |
| Update Session Status | `liveShopping.updateSessionStatus` | mutation | protected | (none) | Session Owner |
| Get Session Pick List | `liveShopping.getSessionPickList` | query | protected | (none) | Warehouse |
| Get Consolidated Pick List | `liveShopping.getConsolidatedPickList` | query | protected | (none) | Warehouse |

### 12.2 Live Shopping Cart & Items

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Add to Cart | `liveShopping.addToCart` | mutation | protected | (none) |
| Remove from Cart | `liveShopping.removeFromCart` | mutation | protected | (none) |
| Update Cart Quantity | `liveShopping.updateCartQuantity` | mutation | protected | (none) |
| Add Item with Status | `liveShopping.addItemWithStatus` | mutation | protected | (none) |
| Update Item Status | `liveShopping.updateItemStatus` | mutation | protected | (none) |
| Get Items by Status | `liveShopping.getItemsByStatus` | query | protected | (none) |
| Toggle Cart Item Sample | `liveShopping.toggleCartItemSample` | mutation | protected | (none) |
| Set Override Price | `liveShopping.setOverridePrice` | mutation | protected | (none) |
| Highlight Product | `liveShopping.highlightProduct` | mutation | protected | (none) |

### 12.3 Live Shopping Negotiations

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Request Negotiation | `liveShopping.requestNegotiation` | mutation | protected | (none) |
| Respond to Negotiation | `liveShopping.respondToNegotiation` | mutation | protected | (none) |
| Get Negotiation History | `liveShopping.getNegotiationHistory` | query | protected | (none) |
| Get Active Negotiations | `liveShopping.getActiveNegotiations` | query | protected | (none) |

### 12.4 VIP Portal Live Shopping

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Join Session | `vipPortalLiveShopping.joinSession` | mutation | vipPortal | (none) |
| Get Active Session | `vipPortalLiveShopping.getActiveSession` | query | vipPortal | (none) |
| Search Products | `vipPortalLiveShopping.searchProducts` | query | vipPortal | (none) |
| Add Item | `vipPortalLiveShopping.addItemWithStatus` | mutation | vipPortal | (none) |
| Remove Item | `vipPortalLiveShopping.removeItem` | mutation | vipPortal | (none) |
| Request Checkout | `vipPortalLiveShopping.requestCheckout` | mutation | vipPortal | (none) |
| Request Negotiation | `vipPortalLiveShopping.requestNegotiation` | mutation | vipPortal | (none) |

---

## Domain 13: Gamification & Leaderboard

### 13.1 Leaderboard

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| Get Leaderboard | `leaderboard.list` | query | protected | (none) | All Users |
| Get Leaderboard Entry | `leaderboard.get` | query | protected | (none) | All Users |
| Save Leaderboard Config | `leaderboard.save` | mutation | protected | (none) | Admin |
| Get Leaderboard Defaults | `leaderboard.getDefaults` | query | protected | (none) | All Users |
| Reset Leaderboard | `leaderboard.reset` | mutation | protected | (none) | Admin |
| Get For Client | `leaderboard.getForClient` | query | protected | (none) | All Users |
| Get Widget Data | `leaderboard.getWidgetData` | query | protected | (none) | All Users |
| Get Metric Configs | `leaderboard.getMetricConfigs` | query | admin | (none) | Admin |

### 13.2 Gamification

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Balance | `gamification.getBalance` | query | protected | (none) |
| Get Dashboard | `gamification.getDashboard` | query | protected | (none) |
| Get History | `gamification.getHistory` | query | protected | (none) |
| List Catalog | `gamification.listCatalog` | query | protected | (none) |
| Redeem Reward | `gamification.redeem` | mutation | protected | (none) |
| Get Redemptions | `gamification.getRedemptions` | query | protected | (none) |
| Record Referral | `gamification.recordReferral` | mutation | protected | (none) |
| Validate Code | `gamification.validateCode` | query | protected | (none) |
| Award Points | `gamification.award` | mutation | admin | (none) |
| Get Settings | `gamification.getSettings` | query | admin | (none) |
| Update Settings | `gamification.updateSettings` | mutation | admin | (none) |
| Process Couch Tax | `gamification.processCouchTax` | mutation | admin | (none) |

---

## Domain 14: Samples

### 14.1 Sample Management

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Samples | `samples.list` | query | protected | (none) | All Sales |
| Get All Samples | `samples.getAll` | query | protected | (none) | All Sales |
| Get by Client | `samples.getByClient` | query | protected | (none) | All Sales |
| Get by ID | `samples.getById` | query | protected | (none) | All Sales |
| Get Pending | `samples.getPending` | query | protected | (none) | All Sales |
| Get Expiring | `samples.getExpiring` | query | protected | (none) | All Sales |
| Create Request | `samples.createRequest` | mutation | strictlyProtected | (none) | Sales Rep, Manager |
| Fulfill Request | `samples.fulfillRequest` | mutation | strictlyProtected | (none) | Warehouse |
| Cancel Request | `samples.cancelRequest` | mutation | strictlyProtected | (none) | Sales Rep, Manager |

### 14.2 Sample Allocation & Returns

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Monthly Allocation | `samples.getMonthlyAllocation` | query | protected | (none) |
| Set Monthly Allocation | `samples.setMonthlyAllocation` | mutation | strictlyProtected | (none) |
| Check Allocation | `samples.checkAllocation` | query | protected | (none) |
| Request Return | `samples.requestReturn` | mutation | strictlyProtected | (none) |
| Approve Return | `samples.approveReturn` | mutation | strictlyProtected | (none) |
| Complete Return | `samples.completeReturn` | mutation | strictlyProtected | (none) |
| Request Vendor Return | `samples.requestVendorReturn` | mutation | strictlyProtected | (none) |

### 14.3 Sample Analytics

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Conversion Report | `samples.getConversionReport` | query | protected | (none) |
| Get Cost by Product | `samples.getCostByProduct` | query | protected | (none) |
| Get Cost by Client | `samples.getCostByClient` | query | protected | (none) |
| Get Distribution Report | `samples.getDistributionReport` | query | protected | (none) |
| Get ROI Analysis | `samples.getROIAnalysis` | query | protected | (none) |

---

## Domain 15: Returns & Refunds

### 15.1 Returns

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Returns | `returns.list` | query | protected | (none) | All Sales |
| Get All Returns | `returns.getAll` | query | protected | (none) | All Sales |
| Get Return by ID | `returns.getById` | query | protected | (none) | All Sales |
| Get by Order | `returns.getByOrder` | query | protected | (none) | All Sales |
| Create Return | `returns.create` | mutation | protected | (none) | Sales Rep, Manager |
| Approve Return | `returns.approve` | mutation | protected | (none) | Manager |
| Reject Return | `returns.reject` | mutation | protected | (none) | Manager |
| Receive Return | `returns.receive` | mutation | protected | (none) | Warehouse |
| Process Return | `returns.process` | mutation | protected | (none) | Manager |
| Get Stats | `returns.getStats` | query | protected | (none) | All Sales |

### 15.2 Refunds

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Refund by ID | `refunds.getById` | query | protected | (none) |
| Get All Refunds | `refunds.getAll` | query | protected | (none) |
| Create Refund | `refunds.create` | mutation | protected | (none) |
| Get by Original Transaction | `refunds.getByOriginalTransaction` | query | protected | (none) |
| Get by Return | `refunds.getByReturn` | query | protected | (none) |
| Get Stats | `refunds.getStats` | query | protected | (none) |

---

## Domain 16: Purchase Orders & Receiving

### 16.1 Purchase Orders

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List POs | `purchaseOrders.list` | query | protected | (none) | Purchasing, Manager |
| Get All POs | `purchaseOrders.getAll` | query | protected | (none) | Purchasing, Manager |
| Get PO by ID | `purchaseOrders.getById` | query | protected | (none) | Purchasing, Manager |
| Get PO with Details | `purchaseOrders.getByIdWithDetails` | query | protected | (none) | Purchasing, Manager |
| Create PO | `purchaseOrders.create` | mutation | protected | (none) | Purchasing, Manager |
| Update PO | `purchaseOrders.update` | mutation | protected | (none) | Purchasing, Manager |
| Delete PO | `purchaseOrders.delete` | mutation | protected | (none) | Manager |
| Confirm PO | `purchaseOrders.confirm` | mutation | protected | (none) | Manager |
| Submit PO | `purchaseOrders.submit` | mutation | protected | (none) | Purchasing |
| Update Status | `purchaseOrders.updateStatus` | mutation | protected | (none) | Manager |
| Add Item | `purchaseOrders.addItem` | mutation | protected | (none) | Purchasing |
| Update Item | `purchaseOrders.updateItem` | mutation | protected | (none) | Purchasing |
| Delete Item | `purchaseOrders.deleteItem` | mutation | protected | (none) | Purchasing |

**PO Status Lifecycle:**
```
DRAFT → SENT → CONFIRMED → RECEIVING → RECEIVED
                ↓
            CANCELLED
```

### 16.2 PO Receiving

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Receive Goods | `poReceiving.receive` | mutation | protected | (none) |
| Receive with Batch | `poReceiving.receiveGoodsWithBatch` | mutation | protected | (none) |
| Get Receiving History | `poReceiving.getReceivingHistory` | query | protected | (none) |
| Get PO Items with Receipts | `poReceiving.getPOItemsWithReceipts` | query | protected | (none) |
| Get Pending Receiving | `poReceiving.getPendingReceiving` | query | protected | (none) |
| Get Stats | `poReceiving.getStats` | query | protected | (none) |

---

## Domain 17: Storage & Transfers

### 17.1 Storage Sites & Zones

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Sites | `storage.listSites` | query | protected | (none) | Warehouse, Manager |
| Get Site | `storage.getSite` | query | protected | (none) | Warehouse, Manager |
| Create Site | `storage.createSite` | mutation | protected | (none) | Manager |
| Update Site | `storage.updateSite` | mutation | protected | (none) | Manager |
| Delete Site | `storage.deleteSite` | mutation | protected | (none) | Admin |
| List Zones | `storage.listZones` | query | protected | (none) | Warehouse |
| Create Zone | `storage.createZone` | mutation | protected | (none) | Manager |
| Update Zone | `storage.updateZone` | mutation | protected | (none) | Manager |
| Delete Zone | `storage.deleteZone` | mutation | protected | (none) | Admin |

### 17.2 Transfers

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Transfers | `storage.listTransfers` | query | protected | (none) |
| Create Transfer | `storage.createTransfer` | mutation | protected | (none) |
| Ship Transfer | `storage.shipTransfer` | mutation | protected | (none) |
| Receive Transfer | `storage.receiveTransfer` | mutation | protected | (none) |
| Cancel Transfer | `storage.cancelTransfer` | mutation | protected | (none) |

### 17.3 Warehouse Transfers

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Transfer Inventory | `warehouseTransfers.transfer` | mutation | protected | (none) |
| Get Transfer History | `warehouseTransfers.getTransferHistory` | query | protected | (none) |
| Get Batch Locations | `warehouseTransfers.getBatchLocations` | query | protected | (none) |
| Get Stats | `warehouseTransfers.getStats` | query | protected | (none) |

---

## Domain 18: Advanced Scheduling

### 18.1 Scheduling Core

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| List Shifts | `scheduling.listShifts` | query | protected | (none) | All Users |
| Create Shift | `scheduling.createShift` | mutation | protected | (none) | Manager |
| Update Shift Status | `scheduling.updateShiftStatus` | mutation | protected | (none) | Manager |
| Delete Shift | `scheduling.deleteShift` | mutation | protected | (none) | Manager |
| List Shift Templates | `scheduling.listShiftTemplates` | query | protected | (none) | Manager |
| Create Shift Template | `scheduling.createShiftTemplate` | mutation | protected | (none) | Manager |
| Apply Shift Template | `scheduling.applyShiftTemplate` | mutation | protected | (none) | Manager |

### 18.2 Room & Booking Management

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Rooms | `scheduling.listRooms` | query | protected | (none) |
| Get Room | `scheduling.getRoom` | query | protected | (none) |
| Create Room | `scheduling.createRoom` | mutation | protected | (none) |
| Update Room | `scheduling.updateRoom` | mutation | protected | (none) |
| Delete Room | `scheduling.deleteRoom` | mutation | protected | (none) |
| List Bookings | `scheduling.listBookings` | query | protected | (none) |
| Create Booking | `scheduling.createBooking` | mutation | protected | (none) |
| Update Booking Status | `scheduling.updateBookingStatus` | mutation | protected | (none) |
| Cancel Booking | `scheduling.cancelBooking` | mutation | protected | (none) |
| Check Availability | `scheduling.checkAvailability` | query | protected | (none) |

### 18.3 Delivery & Queue

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Delivery Schedules | `scheduling.listDeliverySchedules` | query | protected | (none) |
| Create Delivery Schedule | `scheduling.createDeliverySchedule` | mutation | protected | (none) |
| Update Delivery Status | `scheduling.updateDeliveryStatus` | mutation | protected | (none) |
| Get Overdue Deliveries | `scheduling.getOverdueDeliveries` | query | protected | (none) |
| Get Live Queue | `scheduling.getLiveQueue` | query | protected | (none) |
| Check In | `scheduling.checkIn` | mutation | protected | (none) |
| Update Check-In Status | `scheduling.updateCheckInStatus` | mutation | protected | (none) |

### 18.4 Time Off & Hour Tracking

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Request Time Off | `timeOffRequests.request` | mutation | protected | (none) |
| Approve Time Off | `timeOffRequests.approve` | mutation | protected | (none) |
| Reject Time Off | `timeOffRequests.reject` | mutation | protected | (none) |
| List Time Off | `timeOffRequests.list` | query | protected | (none) |
| Cancel Time Off | `timeOffRequests.cancel` | mutation | protected | (none) |
| Clock In | `hourTracking.clockIn` | mutation | protected | (none) |
| Clock Out | `hourTracking.clockOut` | mutation | protected | (none) |
| Start Break | `hourTracking.startBreak` | mutation | protected | (none) |
| End Break | `hourTracking.endBreak` | mutation | protected | (none) |
| Get Timesheet | `hourTracking.getTimesheet` | query | protected | (none) |
| Get Hours Report | `hourTracking.getHoursReport` | query | protected | (none) |

---

## Domain 19: COGS Management

### 19.1 Cost of Goods Sold

| Flow | Procedure | Type | Auth | Permission | Roles |
|------|-----------|------|------|------------|-------|
| Get COGS Summary | `cogs.getCOGS` | query | protected | (none) | Manager, Accounting |
| Calculate Impact | `cogs.calculateImpact` | query | protected | (none) | Manager, Accounting |
| Update Batch COGS | `cogs.updateBatchCogs` | mutation | protected | (none) | Manager, Accounting |
| Get History | `cogs.getHistory` | query | protected | (none) | Manager, Accounting |
| Get COGS By Batch | `cogs.getCOGSByBatch` | query | protected | (none) | Manager, Accounting |

---

## Domain 20: Client Ledger

### 20.1 Unified Ledger

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Get Ledger | `clientLedger.getLedger` | query | protected | (none) |
| Get Balance As Of | `clientLedger.getBalanceAsOf` | query | protected | (none) |
| Add Adjustment | `clientLedger.addLedgerAdjustment` | mutation | protected | (none) |
| Export Ledger | `clientLedger.exportLedger` | query | protected | (none) |
| Get Transaction Types | `clientLedger.getTransactionTypes` | query | protected | (none) |

---

## Domain 21: Bad Debt

### 21.1 Write-Off Management

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Write Off | `badDebt.writeOff` | mutation | protected | accounting:manage |
| Reverse | `badDebt.reverse` | mutation | protected | accounting:manage |
| Get By Client | `badDebt.getByClient` | query | protected | accounting:manage |
| Get Client Total | `badDebt.getClientTotal` | query | protected | accounting:manage |
| Get Aging Report | `badDebt.getAgingReport` | query | protected | accounting:manage |

---

## Domain 22: Strains

### 22.1 Strain Management

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Strains | `strains.list` | query | protected | inventory:read |
| Get By ID | `strains.getById` | query | protected | inventory:read |
| Search | `strains.search` | query | protected | inventory:read |
| Fuzzy Search | `strains.fuzzySearch` | query | protected | inventory:read |
| Get Family | `strains.getFamily` | query | protected | inventory:read |
| Get Family Stats | `strains.getFamilyStats` | query | protected | inventory:read |
| Create | `strains.create` | mutation | protected | inventory:create |
| Get Or Create | `strains.getOrCreate` | mutation | protected | inventory:create |
| Import OpenTHC | `strains.importOpenTHC` | mutation | protected | inventory:create |

---

## Domain 23: Tags

### 23.1 Tag Management

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Tags | `tags.list` | query | public | (none) |
| Get By ID | `tags.getById` | query | public | (none) |
| Create Tag | `tags.create` | mutation | public | (none) |
| Update Tag | `tags.update` | mutation | public | (none) |
| Delete Tag | `tags.delete` | mutation | public | (none) |
| Get Product Tags | `tags.getProductTags` | query | public | (none) |
| Get Client Tags | `tags.getClientTags` | query | public | (none) |
| Add Product Tags | `tags.addProductTags` | mutation | public | (none) |
| Add Client Tags | `tags.addClientTags` | mutation | public | (none) |

### 23.2 Advanced Tag Features

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Boolean Search | `advancedTagFeatures.booleanSearch` | query | public | (none) |
| Create Hierarchy | `advancedTagFeatures.createHierarchy` | mutation | public | (none) |
| Get Children | `advancedTagFeatures.getChildren` | query | public | (none) |
| Merge Tags | `advancedTagFeatures.mergeTags` | mutation | public | (none) |
| Get Usage Stats | `advancedTagFeatures.getUsageStats` | query | public | (none) |
| Bulk Add Tags | `advancedTagFeatures.bulkAddTags` | mutation | public | (none) |

---

## Domain 24: Vendor Supply

### 24.1 Supply Management

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Create | `vendorSupply.create` | mutation | public | (none) |
| Get All | `vendorSupply.getAll` | query | public | (none) |
| Get Available | `vendorSupply.getAvailable` | query | public | (none) |
| Reserve | `vendorSupply.reserve` | mutation | public | (none) |
| Purchase | `vendorSupply.purchase` | mutation | public | (none) |
| Find Buyers | `vendorSupply.findBuyers` | query | public | (none) |
| Expire Old | `vendorSupply.expireOld` | mutation | public | (none) |

---

## Domain 25: Health & Diagnostics

### 25.1 Health Checks

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Check | `health.check` | query | public | (none) |
| Liveness | `health.liveness` | query | public | (none) |
| Readiness | `health.readiness` | query | public | (none) |
| Detailed Check | `health.checkDetailed` | query | protected | (none) |
| Metrics | `health.metrics` | query | protected | (none) |

### 25.2 Debug (Development Only)

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Raw MySQL Test | `debug.rawMysqlTest` | query | public | (none) |
| Drizzle Test | `debug.drizzleTest` | query | public | (none) |
| Get Counts | `debug.getCounts` | query | public | (none) |
| Check Database Schema | `debug.checkDatabaseSchema` | query | public | (none) |

---

## Domain 26: Admin Tools

### 26.1 System Administration

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Setup Strain System | `admin.setupStrainSystem` | mutation | protected | (none) |
| Verify Strain System | `admin.verifyStrainSystem` | query | protected | (none) |
| Fix User Permissions | `admin.fixUserPermissions` | mutation | admin | (none) |
| Assign Super Admin | `admin.assignSuperAdminRole` | mutation | admin | (none) |

### 26.2 Migrations

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Run All Migrations | `adminMigrations.runAllMigrations` | mutation | admin | (none) |
| Check Status | `adminMigrations.checkMigrationStatus` | query | admin | (none) |

### 26.3 Data Augmentation

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Run All | `adminDataAugment.runAll` | mutation | protected | (none) |
| Run Script | `adminDataAugment.runScript` | mutation | protected | (none) |
| Get Status | `adminDataAugment.getStatus` | query | protected | (none) |

### 26.4 Import

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Import Strains Batch | `adminImport.importStrainsBatch` | mutation | protected | (none) |
| Get Import Progress | `adminImport.getImportProgress` | query | protected | (none) |

### 26.5 Schema Management

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| Validate Schema | `adminSchema.validate` | query | protected | (none) |
| Push Schema | `adminSchemaPush.pushSchema` | mutation | admin | (none) |

### 26.6 Setup

| Flow | Procedure | Type | Auth | Permission |
|------|-----------|------|------|------------|
| List Users | `adminSetup.listUsers` | query | public | (none) |
| Promote To Admin | `adminSetup.promoteToAdmin` | mutation | public | (none) |

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

### Public Routes (No Authentication)

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/admin-setup` | AdminSetupPage | Initial Setup |
| `/login` | Login | Authentication |
| `/vip-portal/login` | VIPLogin | VIP Authentication |
| `/shared/sales-sheet/:token` | SharedSalesSheetPage | Sales Sheets |
| `/intake/verify/:token` | FarmerVerification | Product Intake |
| `/vip-portal` | VIPDashboard | VIP Portal |
| `/vip-portal/auth/impersonate` | ImpersonatePage | VIP Admin |
| `/vip-portal/session-ended` | SessionEndedPage | VIP Portal |

### Protected Routes - Core

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/` | DashboardV3 | Dashboard |
| `/dashboard` | DashboardV3 | Dashboard |
| `/inventory` | Inventory | Batches |
| `/products` | ProductsPage | Products |

### Protected Routes - Accounting

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/accounting` | AccountingDashboard | Financial Overview |
| `/accounting/dashboard` | AccountingDashboard | Financial Overview |
| `/accounting/chart-of-accounts` | ChartOfAccounts | GL Accounts |
| `/accounting/general-ledger` | GeneralLedger | Journal Entries |
| `/accounting/fiscal-periods` | FiscalPeriods | Periods |
| `/accounting/invoices` | Invoices | AR Invoices |
| `/accounting/bills` | Bills | AP Bills |
| `/accounting/payments` | Payments | Payments |
| `/accounting/bank-accounts` | BankAccounts | Bank Setup |
| `/accounting/bank-transactions` | BankTransactions | Reconciliation |
| `/accounting/expenses` | Expenses | Expenses |
| `/accounting/cash-locations` | CashLocations | Cash Audit |

### Protected Routes - Clients & CRM

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/clients` | ClientsListPage | Clients |
| `/clients/:id` | ClientProfilePage | Client Detail |
| `/clients/:clientId/ledger` | ClientLedger | Client Ledger |
| `/client-ledger` | ClientLedger | Client Ledger |
| `/clients/:clientId/vip-portal-config` | VIPPortalConfigPage | VIP Config |

### Protected Routes - Orders & Sales

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/orders` | Orders | Orders |
| `/orders/create` | OrderCreatorPage | Order Creation |
| `/quotes` | Quotes | Quotes |
| `/sales-sheets` | SalesSheetCreatorPage | Sales Sheets |
| `/sales-portal` | UnifiedSalesPortalPage | Sales Portal |
| `/pick-pack` | PickPackPage | Fulfillment |
| `/photography` | PhotographyPage | Product Photos |

### Protected Routes - Pricing

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/pricing/rules` | PricingRulesPage | Pricing Rules |
| `/pricing/profiles` | PricingProfilesPage | Pricing Profiles |

### Protected Routes - Purchasing & Vendors

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/purchase-orders` | PurchaseOrdersPage | Purchase Orders |
| `/vendors` | VendorsPage | Vendors |
| `/vendors/:id` | VendorRedirect | Vendor Detail |
| `/vendor-supply` | VendorSupplyPage | Vendor Supply |
| `/returns` | ReturnsPage | Returns |
| `/samples` | SampleManagement | Samples |
| `/locations` | LocationsPage | Locations |
| `/intake-receipts` | IntakeReceipts | Intake Receipts |

### Protected Routes - Settings

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/settings` | Settings | Settings |
| `/settings/cogs` | CogsSettingsPage | COGS Config |
| `/settings/notifications` | NotificationPreferencesPage | Notification Prefs |
| `/settings/feature-flags` | FeatureFlagsPage | Feature Flags |
| `/account` | AccountPage | User Account |
| `/credit-settings` | CreditSettingsPage | Credit Config |

### Protected Routes - Operations & Analytics

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/users` | UsersPage | Users |
| `/analytics` | AnalyticsPage | Analytics |
| `/leaderboard` | LeaderboardPage | Leaderboard |
| `/live-shopping` | LiveShoppingPage | Live Shopping |
| `/search` | SearchResultsPage | Search |
| `/spreadsheet-view` | SpreadsheetViewPage | Data View |
| `/needs` | NeedsManagementPage | Client Needs |
| `/interest-list` | InterestListPage | Interest List |
| `/matchmaking` | MatchmakingServicePage | Matchmaking |
| `/workflow-queue` | WorkflowQueuePage | Workflow |
| `/calendar` | CalendarPage | Events |
| `/scheduling` | SchedulingPage | Scheduling |

### Protected Routes - Tasks & Communication

| Route | Page | Primary Entity |
|-------|------|----------------|
| `/todos` | TodoListsPage | Todo Lists |
| `/todos/:listId` | TodoListDetailPage | Todo Detail |
| `/notifications` | NotificationsPage | Notifications |
| `/inbox` | InboxPage | Inbox |
| `/help` | Help | Help |

---

_End of TERP User Flow Guide v3.1 - 100% Router Coverage_
