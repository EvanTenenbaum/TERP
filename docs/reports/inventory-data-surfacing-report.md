# Inventory Data Surfacing Report

**Date:** 2026-01-30
**Scope:** Document how inventory data is surfaced in the frontend (inventory module, sales sheets, and all other inventory list surfaces), plus backend and database pathways.

## 1) Canonical Inventory Data Model (Database)

### Core tables and relationships used for inventory lists

| Table                | Role in inventory listings                                                       | Key columns referenced in list/summary flows                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`           | Product master record; joins into batches for name/category/subcategory          | `id`, `brandId`, `nameCanonical`, `category`, `subcategory`                                                                                                    |
| `lots`               | Intake-level grouping; links batches to supplier client                          | `id`, `code`, `supplier_client_id`, `vendorId` (deprecated), `date`                                                                                            |
| `batches`            | Primary inventory unit; quantities + status used for inventory list calculations | `id`, `code`, `sku`, `productId`, `lotId`, `batchStatus`, `grade`, `unitCogs`, `onHandQty`, `reservedQty`, `quarantineQty`, `holdQty`, `createdAt`, `metadata` |
| `inventoryMovements` | Audit trail and movement history for batches                                     | `batchId`, `inventoryMovementType`, `quantityChange`, `quantityBefore`, `quantityAfter`, `adjustmentReason`, `notes`, `performedBy`, `createdAt`               |

These tables anchor all inventory list views. `batches` is the primary list entity, with joins to `products` (name/category), `lots` (intake and supplier link), and `clients` (supplier), and optionally to `inventoryMovements` for movement history enrichment in enhanced views.【F:drizzle/schema.ts†L419-L470】【F:drizzle/schema.ts†L538-L611】【F:drizzle/schema.ts†L612-L724】【F:drizzle/schema.ts†L3401-L3443】

### Supplier identity (canonicalized)

Inventory lists use the **clients** table for supplier identity, via `lots.supplier_client_id` (canonical supplier reference). `lots.vendorId` remains as deprecated legacy data, but list queries now join `clients` through `supplier_client_id` for the supplier name in UI lists and CSV exports.【F:drizzle/schema.ts†L538-L611】

### Inventory quantity semantics (batch-level)

`batches` includes multiple quantity fields used by list/summary calculations:

- `onHandQty`: live quantity available for sale
- `reservedQty`, `quarantineQty`, `holdQty`: quantities removed from availability

Inventory list UIs compute **available** as `onHand - reserved - quarantine - hold`, and use `unitCogs * onHand` for total value where available. These data points are exposed by inventory list APIs or computed on the client for list displays and exports.【F:drizzle/schema.ts†L612-L724】【F:client/src/pages/Inventory.tsx†L124-L215】【F:server/routers/inventory.ts†L117-L279】

## 2) Backend APIs and Data Shaping

### 2.1 Inventory list + search (legacy, list API)

- **Endpoint:** `inventory.list` (tRPC)
- **Data source:** `inventoryDb.getBatchesWithDetails` or `inventoryDb.searchBatches`
- **Return shape:** `{ items, nextCursor, hasMore }` where `items` contains `{ batch, product, brand, lot, supplierClient }`

`inventory.list` is the primary “legacy” list endpoint used by multiple UIs. It performs cursor-based pagination, optional search, and joins `batches` to `products`, `brands`, `lots`, and **clients** (supplier) to produce list-ready records.【F:server/routers/inventory.ts†L694-L771】【F:server/inventoryDb.ts†L853-L953】

Key join logic (canonical supplier): `lots.supplierClientId → clients.id` (replacing deprecated vendor joins). This ensures the supplier name comes from `clients` for list displays and export surfaces.【F:server/inventoryDb.ts†L881-L909】【F:server/inventoryDb.ts†L935-L959】

### 2.2 Enhanced inventory list (Inventory page “enhanced” mode)

- **Endpoint:** `inventory.getEnhanced`
- **Data source:** `inventoryDb.getBatchesWithDetails`
- **Enhancements:** computed availability, age/aging bracket, stock status, total value, optional movement history

`inventory.getEnhanced` wraps the base list data, computing:

- `availableQty = onHand - reserved - quarantine - hold`
- `ageDays` and `ageBracket` from batch intake date
- `stockStatus` (CRITICAL/LOW/OPTIMAL/OUT_OF_STOCK)
- `totalValue = onHand * unitCogs`
- `lastMovementDate` and optional `movementHistory`

It returns `{ items, pagination, summary }`, where `summary` aggregates totals and counts by age/stock status. This is the data shape used by the Inventory module’s enhanced view and summary widgets.【F:server/routers/inventory.ts†L74-L336】

### 2.3 Sales Sheet inventory with pricing

- **Endpoint:** `salesSheets.getInventory`
- **Data source:** `salesSheetsDb.getInventoryWithPricing`
- **Purpose:** supply inventory list items **pre-priced** for a specific client (pricing rules applied)

The sales sheet inventory list is computed by joining `batches` → `products` → `lots` → `clients` (supplier), filtering to `onHandQty > 0`, and applying client-specific pricing rules via the pricing engine. It returns `PricedInventoryItem[]` with category/subcategory, grade, vendor (supplier name), status, and pricing context (base price, retail price, markup, applied rules).【F:server/routers/salesSheets.ts†L75-L117】【F:server/salesSheetsDb.ts†L65-L220】

### 2.4 Spreadsheet inventory grid data

- **Endpoint:** `spreadsheet.getInventoryGridData`
- **Data source:** `spreadsheetViewService.getInventoryGridData`
- **Underlying data:** `inventoryDb.getBatchesWithDetails`

This pathway converts inventory batch records into spreadsheet rows with derived columns (available, intake, ticket, sub, vendor/source). It’s designed for the spreadsheet view’s grid and uses the same canonical supplier joins as the main list API.【F:server/routers/spreadsheet.ts†L35-L68】【F:server/services/spreadsheetViewService.ts†L103-L208】

### 2.5 Batch selection for orders (product-focused)

- **Endpoint:** `inventory.getAvailableForProduct`
- **Data source:** direct `batches` query filtered by product + LIVE status
- **Purpose:** returns candidate batches for a product (quantity and metadata) to support order/batch selection dialogs

This endpoint returns batch identifiers, availability, cost, and optional metadata (harvest/expiry) for selection UIs (e.g., order item batch selection).【F:server/routers/inventory.ts†L818-L908】

## 3) Frontend Inventory Surfaces (List Views and Where They Pull From)

### 3.1 Inventory Module (primary inventory list)

**Route:** `/inventory` (Inventory page)

**Data source(s):**

- **Enhanced path:** `trpc.inventory.getEnhanced` (default)
- **Legacy fallback:** `trpc.inventory.list`

**Key list behaviors:**

- Uses enhanced data mapping for batch, product, brand, supplier client
- Computes CSV export fields and availability math on the client
- Supports filters (status, category, vendor, brand, grade, age bracket, stock status) and sorts
- Consumes `inventory.dashboardStats` for summary cards

This is the canonical inventory list view, with enhanced data turned on by default and a fallback to the legacy list API.【F:client/src/pages/Inventory.tsx†L54-L520】

### 3.2 Inventory Work Surface (alternate list UI)

**Component:** `InventoryWorkSurface`

**Data source:** `trpc.inventory.list`

The work-surface inventory view uses the legacy list API with search, status, category filters, and cursor-style pagination. It computes totals client-side (total qty, total value, live count) and provides inline status edits and selection behavior around list items.【F:client/src/components/work-surface/InventoryWorkSurface.tsx†L330-L420】

### 3.3 Spreadsheet View → Inventory Grid

**Route:** `/spreadsheet` (Inventory tab)

**Data source:** `trpc.spreadsheet.getInventoryGridData`

The spreadsheet inventory grid uses inventory grid rows (vendor, date, category, available, ticket) derived from the same underlying batch list via `getInventoryGridData`. Edits invoke inventory mutations (`adjustQty`, `updateStatus`, `updateBatch`) to keep list data consistent with batch records.【F:client/src/components/spreadsheet/InventoryGrid.tsx†L28-L200】【F:server/routers/spreadsheet.ts†L35-L68】【F:server/services/spreadsheetViewService.ts†L103-L208】

### 3.4 Sales Sheet Module (inventory browser for sales sheet creation)

**Route:** `/sales/sales-sheets` (SalesSheetCreatorPage)

**Data source:** `trpc.salesSheets.getInventory` (client-specific pricing)

Sales sheet creation surfaces a dedicated **inventory browser** (table) that lists available inventory items for a selected client. It supports search, bulk selection, quick quantity add, and uses status/quantity to prevent selling non-sellable batches. The list is built on the priced inventory items computed in `salesSheetsDb.getInventoryWithPricing` and delivered via the sales sheets router.【F:client/src/pages/SalesSheetCreatorPage.tsx†L44-L120】【F:client/src/components/sales/InventoryBrowser.tsx†L1-L220】【F:server/routers/salesSheets.ts†L75-L117】【F:server/salesSheetsDb.ts†L65-L220】

### 3.5 Order Creator (sales order inventory picker)

**Route:** `/orders/create` (OrderCreatorPage)

**Data source:** `trpc.salesSheets.getInventory`

Order creation uses the same priced inventory list as sales sheets (client-specific pricing). This ensures any list of selectable inventory in order creation is consistent with the sales sheet inventory browser (same backend function, same pricing rules).【F:client/src/pages/OrderCreatorPage.tsx†L144-L220】【F:server/routers/salesSheets.ts†L75-L117】

### 3.6 Golden Flow Order Creation (work-surface dialog)

**Component:** `OrderCreationFlow`

**Data source:** `trpc.inventory.getEnhanced`

This flow uses the enhanced inventory list (batches) for the multi-step order creation dialog, exposing batch-based inventory selection during a golden flow workflow. It consumes the enhanced inventory list and maps it to internal “intake batch” display items for selection and pricing defaults.【F:client/src/components/work-surface/golden-flows/OrderCreationFlow.tsx†L562-L640】【F:server/routers/inventory.ts†L74-L336】

### 3.7 Purchase Orders / Inventory list usage (product selection)

**Route:** `/purchase-orders`

**Data source:** `trpc.inventory.list` (inventory-derived product list)

Purchase order creation currently loads inventory list data and uses `items` for product selection in the create-PO form. This list depends on the same inventory list join structure and should remain aligned with product definitions and batch availability in the inventory system.【F:client/src/pages/PurchaseOrdersPage.tsx†L60-L120】【F:server/routers/inventory.ts†L694-L771】

## 4) Cross-Cutting Inventory List Transformation Rules

### 4.1 Availability calculations

Across list surfaces, **available quantity** is always calculated as:

```
available = onHandQty - reservedQty - quarantineQty - holdQty
```

This formula is applied in the enhanced inventory API and in spreadsheet transformations, ensuring consistent list availability numbers across inventory lists and spreadsheet views.【F:server/routers/inventory.ts†L117-L279】【F:server/services/spreadsheetViewService.ts†L103-L135】

### 4.2 Pricing and total value

- **Inventory module:** uses `unitCogs` and `onHandQty` to compute per-batch total value for display/export.
- **Sales sheet / order creation:** uses pricing engine to compute `retailPrice` and markup per item; base price is sourced from `unitCogs`.

This distinction ensures inventory lists surface **cost-focused** data, while sales sheets surface **client-specific retail pricing** derived from the same inventory basis.【F:client/src/pages/Inventory.tsx†L124-L215】【F:server/salesSheetsDb.ts†L182-L255】

### 4.3 Supplier identity in lists

Supplier display for inventory lists uses the **clients** table via `lots.supplier_client_id` (canonical supplier reference). This is enforced in inventory list joins and in sales sheet inventory pricing joins for consistent supplier naming across list surfaces.【F:server/inventoryDb.ts†L881-L909】【F:server/salesSheetsDb.ts†L94-L163】

## 5) Inventory List Surfaces Checklist (What to Validate)

Use this checklist to ensure inventory list data surfaces correctly across modules:

1. **Inventory Page (`/inventory`)**
   - Enhanced list loads (items, summary) and renders filters/sorting
   - Legacy list fallback works when enhanced is disabled
2. **Inventory Work Surface**
   - Legacy list responds to search/status/category filters and pagination
3. **Spreadsheet Inventory Grid**
   - Grid displays rows from `getInventoryGridData` and can update quantities/status
4. **Sales Sheet Creator**
   - Inventory browser lists priced items after client selection
5. **Order Creator**
   - Same priced inventory list loads and supports item selection
6. **Golden Flow Order Creation**
   - Enhanced list is available for batch selection
7. **Purchase Orders**
   - Product selection list is populated from inventory list response

Each of the above surfaces is wired to one of the key APIs: `inventory.list`, `inventory.getEnhanced`, `salesSheets.getInventory`, or `spreadsheet.getInventoryGridData`.【F:client/src/pages/Inventory.tsx†L54-L520】【F:client/src/components/work-surface/InventoryWorkSurface.tsx†L330-L420】【F:client/src/components/spreadsheet/InventoryGrid.tsx†L28-L200】【F:client/src/pages/SalesSheetCreatorPage.tsx†L44-L120】【F:client/src/pages/OrderCreatorPage.tsx†L144-L220】【F:client/src/components/work-surface/golden-flows/OrderCreationFlow.tsx†L562-L640】【F:client/src/pages/PurchaseOrdersPage.tsx†L60-L120】

## 6) Troubleshooting Playbook (When Inventory Appears Missing)

Use this quick flow when inventory list surfaces appear empty or incomplete.

1. **Confirm the right API is returning items.**
   - `inventory.getEnhanced` should return `items` plus a `summary` payload for the Inventory module.【F:server/routers/inventory.ts†L74-L336】
   - `inventory.list` should return `items` with `batch`, `product`, `lot`, and `supplierClient` data for work-surface and purchase orders views.【F:server/routers/inventory.ts†L694-L771】
   - `salesSheets.getInventory` should return priced items for sales sheet/order creation flows.【F:server/routers/salesSheets.ts†L75-L117】
   - `spreadsheet.getInventoryGridData` should return grid rows for the spreadsheet view.【F:server/routers/spreadsheet.ts†L35-L68】

2. **Check frontend filters that can hide inventory.**
   - Inventory module filters are applied client-side (status, category, vendor, brand, grade, stock level, COGS range). If inventory data loads but the table is empty, validate the active filters and search parameters.【F:client/src/pages/Inventory.tsx†L472-L553】
   - Inventory Work Surface status filter defaults to `ALL`, so an empty list here usually indicates the backend list or search payload is empty rather than a client-side filter issue.【F:client/src/components/work-surface/InventoryWorkSurface.tsx†L319-L360】

3. **Verify availability math for sellable inventory.**
   - If `available = onHand - reserved - quarantine - hold` calculates to `<= 0`, inventory will appear as out of stock in list views that filter for availability (e.g., sales sheet inventory list).【F:server/routers/inventory.ts†L117-L279】【F:server/salesSheetsDb.ts†L65-L140】

4. **Validate supplier joins for list display.**
   - Supplier names come from `lots.supplier_client_id` → `clients.id`; missing joins can result in empty vendor columns and may affect vendor filters.【F:server/inventoryDb.ts†L881-L909】

5. **Confirm pricing engine output for sales flows.**
   - Sales sheet and order creation inventory lists depend on `getInventoryWithPricing`. If pricing rules yield no priced items, those lists will appear empty even if inventory exists.【F:server/salesSheetsDb.ts†L65-L220】
