# Pilot Domain Data Contracts

This document turns the pilot ledgers into stable backend-facing contracts for the fork.

## 1. Operations -> Inventory

### Workbook Definition

- workbook id: `operations`
- sheet id: `inventory`
- canonical route: `/operations?tab=inventory`
- compatibility route: `/inventory?tab=inventory`
- archetype: `registry`

### Query Contracts

- `inventory.getEnhanced`
- `inventory.dashboardStats`
- `inventory.getById`
- `inventory.views.list`
- `inventory.profitability.batch` as read-only context only

### Mutation Contracts

- `inventory.updateStatus`
- `inventory.adjustQty`
- direct step-5 pilot mutations stop here; bulk actions, saved-view writes, and intake/media remain adjacent classic behaviors for now

### Supporting Lookup Contracts

- `settings.locations.list` as adjacent location context only

### Core Tables

- `batches`
- `inventoryMovements`
- `inventoryViews`

### Adjacent Owner Surfaces

- `Locations / Storage` owns location setup and transfer execution
- `Accounting` owns official valuation truth
- `Photography` owns review-heavy media work

## 2. Sales -> Orders

### Workbook Definition

- workbook id: `sales`
- sheet id: `orders`
- step-5 pilot route: `/sales?tab=orders&surface=sheet-native`
- adjacent preserved route: `/sales?tab=create-order`
- archetype: `conveyor` for queue/state progression

### Query Contracts

- `clients.list`
- `orders.getAll`
- `orders.getOrderWithLineItems`
- `orders.getOrderStatusHistory`
- `orders.getAuditLog`
- `accounting.ledger.list` as adjacent read-only context
- adjacent lookup/context procedures already used by the workbook and its direct children

### Mutation Contracts

- direct step-5 orders-sheet pilot is read/inspect/handoff only
- draft creation, draft editing, finalize, delete, conversion, and export remain adjacent workbook behaviors until the document-sheet pilot exists

### Adjacent or Linked Mutations

- `orders.createDraftEnhanced`
- `orders.updateDraftEnhanced`
- `orders.finalizeDraft`
- `orders.confirmDraftOrder`
- `orders.deleteDraftOrder`
- `orders.confirmOrder`
- `orders.convertToSale`
- `orders.convertQuoteToSale`
- `orders.export`
- `orders.processReturn`
- `orders.processRestock`
- `orders.processVendorReturn`
- payment execution handoff to Accounting
- shipping execution handoff to Operations -> Shipping

### Core Tables

- `orders`
- `orderLineItems`
- `orderLineItemAllocations`
- `orderStatusHistory`

### Adjacent Owner Surfaces

- `Accounting` owns payment execution and invoice/output truth
- `Operations -> Shipping` owns pick/pack/ship execution
- `Returns` owns dedicated return execution surface

## 3. Contract Rules

- These contracts are the allowed surface area for first-pilot adapter work.
- Adapters may aggregate multiple procedures, but they may not hide ownership boundaries.
- No pilot adapter may bind directly to deprecated `vendors` truth.
- Step-5 direct sheet adapters must distinguish `sheet-native-direct` behavior from `classic-adjacent` and `adjacent-owned` preserved behavior.
