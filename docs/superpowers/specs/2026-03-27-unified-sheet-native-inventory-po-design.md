# Unified Sheet-Native Surfaces: Inventory Management + Purchase Orders

**Date**: 2026-03-27
**Status**: Design Approved
**Approach**: Hybrid — Phase 1 (Inventory Management), Phase 2 (Purchase Orders)

## Problem

The Inventory Management and Purchase Order surfaces each have multiple implementations (classic form-based + sheet-native pilot) that diverge from the directional density/layout patterns established in the Sales spec. The SheetModeToggle adds cognitive overhead, the classic surfaces are feature-rich but bloated, and the sheet-native pilots are incomplete (missing filtering, saved views, gallery mode for Inventory; missing creation flow, COGS modes, supplier history for POs). Users switch between surfaces to access different features.

## Decision

Replace all classic and sheet-native surfaces with one unified sheet-native surface per module. Retire the SheetModeToggle for the inventory and purchase-orders tabs. PowersheetGrid (AG Grid) is the data surface everywhere. Editable cells use double-click to edit inline. Minimal padding — grids get maximum space.

---

## Phase 1: Inventory Management Surface

### New Component

`InventoryManagementSurface.tsx` — replaces both `InventoryWorkSurface` and `InventorySheetPilotSurface`.

### Layout (top → bottom)

**1. Toolbar** (single row, 4px vertical padding)

- "Inventory" title
- Dashboard stat badges (compact, always visible): batch count, total units, inventory value, live batch count
- Data source: `inventory.dashboardStats`
- Right-aligned: Grid/Gallery toggle, Export CSV button

**2. Action Bar** (single row, 3px vertical padding)

- Search input (full-text: SKU, product name, supplier)
- Status dropdown filter
- Filters button (opens AdvancedFilters — see Filtering section)
- Saved Views dropdown (`QuickViewSelector`)
- Save View button (`SaveViewDialog`)
- Right-aligned: Bulk Actions dropdown (visible when multi-row selected — Set Status, Delete Selected, Clear Selection)

**3. Main Content** (switches between Grid Mode and Gallery Mode via toolbar toggle)

**Grid Mode — PowersheetGrid:**

- `selectionMode: "cell-range"`, `enableFillHandle: false`, `enableUndoRedo: true`
- Header: "Inventory" label + row count + editable/locked cell legend badges
- Editable columns (accent left-border, double-click to edit):
  - **Grade** — dropdown select
  - **Status** — dropdown (AWAITING_INTAKE, LIVE, ON_HOLD, QUARANTINED, SOLD_OUT, CLOSED)
  - **On Hand Qty** — number input; triggers Adjustment Context Drawer on change
  - **COGS** — number input, direct save on blur/Enter
- Locked columns (muted treatment):
  - **SKU** — auto-generated identifier
  - **Product** — catalog reference (product name + subcategory)
  - **Supplier** — client reference
  - **Brand** — from supplier/product relationship
  - **Reserved** — calculated from orders
  - **Available** — calculated (on hand − reserved)
  - **Age** — calculated from intake date, with aging color treatment
  - **Stock Status** — badge (CRITICAL/LOW/OPTIMAL/OUT_OF_STOCK)
- Non-qty edits (Grade, Status, COGS) save directly on cell blur/Enter — no drawer needed
- Status changes committed with automatic "Spreadsheet status update" reason
- Data source: `inventory.getEnhanced` with pagination, search, status filter, sort
- Footer: row count + saved view count + edit mode indicator

**Gallery Mode — responsive card grid** (sm:2, xl:3 columns):

- Same toolbar and action bar as Grid Mode — filters apply to both modes
- Each card: product image (or placeholder), SKU, product name, supplier, brand, grade badge, status badge, on-hand/reserved/available quantities, unit COGS, stock status badge, age badge
- Per-card actions: "Open" (opens inspector), "Adjust" (opens adjustment drawer for that batch)
- Data source: same as grid mode

**4. Selected Batch Summary Cards** (4-up grid, appears when a row is selected)

- **Product** — product name + subcategory + supplier
- **Stock** — on hand, available, reserved (shows delta if pending adjustment: "1,200 → 1,150")
- **Valuation** — unit COGS × on hand = total value
- **Location** — location count as clickable link ("3 locations →") that opens inspector to locations section

**5. Status Bar** (WorkSurfaceStatusBar)

- Left: total units + batch count + inventory value
- Right: KeyboardHintBar (Dbl-click edit, ⌘K search, ⌘S save, ⌘Z undo)

### Adjustment Context Drawer

A right-side drawer panel that slides in when an On Hand Qty cell value is changed via double-click edit.

**Contents:**

- **Change summary** — SKU + product name, old value → new value, delta (e.g., "−50")
- **Reason quick-tags** (required — at least one must be selected before Apply is enabled):
  - Recount, Damage, Sample, Transfer, Shrinkage, Return
  - Tags map to `InventoryAdjustmentReason` enum values
  - Single-select — clicking one deselects the previous
- **Notes textarea** (optional) — free text for additional context
- **Apply / Cancel buttons** — Apply shows the delta (e.g., "Apply −50"), disabled until reason is selected
- **Footer hint** — "Reason tag is required · Edit is saved on Apply"

**Behavior:**

- Triggers when a double-click edit changes On Hand Qty value
- The cell stays in edit state while the drawer is open
- Cancel reverts the cell to its previous value
- Apply commits via `inventory.adjustQty` mutation with the selected reason + notes
- Multi-edit flow: after Apply, if the user immediately edits another row's qty, the drawer refreshes with new batch context (stays open). Close explicitly via × or Cancel.
- Non-qty edits (Grade, Status, COGS) do NOT trigger the drawer — they save directly.

### Filtering

Full 14-dimension AdvancedFilters, matching the classic surface:

1. **Status** — multi-select checkbox (AWAITING_INTAKE, LIVE, ON_HOLD, QUARANTINED, SOLD_OUT, CLOSED)
2. **Category** — dropdown single-select
3. **Subcategory/Strain** — dropdown single-select (shown only if items exist)
4. **Stock Level** — dropdown (All, In Stock, Low Stock, Out of Stock)
5. **Supplier** — multi-select checkbox (scrollable)
6. **Brand/Farmer** — multi-select checkbox (dynamic label based on category via LEX-011 nomenclature)
7. **Grade** — multi-select checkbox
8. **Date Range** — from/to date picker (intake date)
9. **Location** — free text search (rack/shelf/bin)
10. **COGS Range** — min/max number inputs
11. **Payment Status** — multi-select checkbox (PAID, PENDING, OVERDUE, PARTIAL)
12. **Stock Status** — dropdown (ALL, OPTIMAL, LOW, CRITICAL, OUT_OF_STOCK)
13. **Age Bracket** — dropdown (ALL, FRESH 0-7d, MODERATE 8-14d, AGING 15-30d, CRITICAL 30+d)
14. **Batch ID** — text input

Filter chips display below action bar when active, with per-filter remove and "Clear All."

### Saved Views

- `inventory.views.save` — persist current filter + sort config as named view
- `inventory.views.list` — load all saved views (shared + personal)
- `inventory.views.load` — apply saved view
- `inventory.views.setDefault` — set a view as default on load
- `inventory.views.delete` — remove a saved view
- Views store: filter config, sort config, column visibility
- "Share with team" checkbox on save (isShared boolean)

### Inspector Panel

Preserved for deep batch context. Opens on demand — click "locations →" in summary cards, or via Gallery card "Open" button.

**Sections:**

- **Batch Summary** — SKU, product name, supplier, brand, grade, current status
- **Quantities** — on hand, reserved, quarantine, hold (formatted)
- **Valuation** — unit COGS, total value
- **Locations** — PowersheetGrid sub-grid (Location Label, Qty columns). Data from `inventory.getById` locations array.
- **Evidence** — audit event count, stock status, age
- **Actions** — status change dropdown, adjust qty button (opens drawer)

### Data & State

- **tRPC layer unchanged**: `inventory.getEnhanced`, `inventory.dashboardStats`, `inventory.getById`, `inventory.getAgingSummary`, `inventory.updateStatus`, `inventory.adjustQty`, `inventory.updateBatch`, `inventory.bulk.updateStatus`, `inventory.bulk.delete`, `inventory.bulk.restore`, `inventory.views.*`
- **Selection**: `useSpreadsheetSelectionParam("batchId")` for URL-synced batch selection
- **Pagination**: window-based lazy loading (PAGE_SIZE rows, "Load More" in grid header)
- **Bulk selection**: derived from PowersheetGrid multi-row selection summary
- **Export**: `useExport` hook with full column set (SKU, product, category, subcategory, vendor, brand, grade, status, on-hand, reserved, quarantine, hold, available, unit COGS, total value, purchase date, expiration date, location)

### Existing Components Reused

| Component                   | From                                                                                                                      | Usage                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `PowersheetGrid`            | `spreadsheet-native/PowersheetGrid`                                                                                       | Main grid + gallery's inspector locations grid |
| `WorkSurfaceStatusBar`      | `work-surface/WorkSurfaceStatusBar`                                                                                       | Status bar                                     |
| `KeyboardHintBar`           | `work-surface/KeyboardHintBar`                                                                                            | Keyboard shortcuts                             |
| `InspectorPanel` + sections | `work-surface/InspectorPanel`                                                                                             | Batch detail inspector                         |
| `AdvancedFilters`           | New inventory-specific component, following the pattern from `sales/AdvancedFilters` but with inventory filter dimensions | 14-dimension filtering                         |
| `QuickViewSelector`         | `sales/QuickViewSelector` (adapt for inventory views)                                                                     | Saved views dropdown                           |
| `SaveViewDialog`            | `sales/SaveViewDialog` (adapt for inventory views)                                                                        | Save current view                              |
| `ConfirmDialog`             | `ui/confirm-dialog`                                                                                                       | Bulk status, bulk delete confirmations         |

### New Components

| Component                    | Purpose                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| `InventoryManagementSurface` | Unified inventory surface — grid/gallery modes, filtering, editing                                      |
| `AdjustmentContextDrawer`    | Right-side drawer for qty adjustment context (reason tags + notes)                                      |
| `InventoryGalleryView`       | Gallery card grid — responsive layout, product images, per-card actions                                 |
| `InventoryAdvancedFilters`   | 14-dimension filter panel, following `sales/AdvancedFilters` pattern with inventory-specific dimensions |

### Components Retired

- `InventoryWorkSurface` (2753 lines) — classic form-based surface
- `InventorySheetPilotSurface` (1043 lines) — sheet-native pilot
- `AdjustQuantityDialog` usage in inventory context — replaced by AdjustmentContextDrawer (component itself may still be used by other surfaces)
- `SheetModeToggle` for inventory tab in InventoryWorkspacePage

### Routing Change

In `InventoryWorkspacePage.tsx`, the `inventory` panel simplifies:

```tsx
// Before: two surfaces + toggle
surfaceMode === "sheet-native"
  ? <InventorySheetPilotSurface onOpenClassic={...} />
  : <InventoryWorkSurface />

// After: one surface, no toggle
<InventoryManagementSurface />
```

The `commandStrip` prop for the inventory tab drops the SheetModeToggle. Other tabs (intake, shipping, samples) keep their toggles unchanged.

---

## Phase 2: Purchase Order Surface

### New Component

`PurchaseOrderSurface.tsx` — replaces `PurchaseOrdersSlicePage`, `PurchaseOrdersPilotSurface`, and `PurchaseOrdersWorkSurface`. Two modes: **queue** and **creation/edit**.

### Props

```tsx
interface PurchaseOrderSurfaceProps {
  defaultStatusFilter?: string[]; // Pre-filter queue (e.g., ["CONFIRMED", "RECEIVING"] for receiving tab)
}
```

### Mode 1: Queue (default)

**Layout (top → bottom):**

**1. Toolbar** (single row, 4px vertical padding)

- "Purchase Orders" title
- Status count badges: draft count, confirmed count, receiving count
- Right-aligned: "+ New PO" button (primary, navigates to creation mode), Export CSV

**2. Action Bar** (single row, 3px vertical padding)

- Search input (PO number, supplier name)
- Status dropdown filter (All, Draft, Sent, Confirmed, Receiving, Received, Cancelled)
- Right-aligned: context hint ("Select a PO to see details and take action")

**3. PO Queue PowersheetGrid** (read-only)

- `selectionMode: "cell-range"`, `enableFillHandle: false`, `enableUndoRedo: false`
- Columns: PO Number, Supplier, Status (badge), Order Date, Est. Delivery, Total (currency), Payment Terms, Line Count
- Data source: `purchaseOrders.getAll`
- Supplier name resolution: `clients.list` (seller clients)

**4. Selected PO KPI Cards** (4-up, appears on row select)

- **Supplier** — name (+ email/phone from detail query if available)
- **Status** — status label + age ("Draft · created today")
- **Total** — formatted amount + line item count
- **Actions** — state-machine-driven buttons:
  - DRAFT: Send, Edit, Delete
  - SENT: Confirm, Cancel
  - CONFIRMED: Start Receiving, Cancel
  - RECEIVING: Start Receiving, Cancel
  - RECEIVED: (no actions — terminal)
  - CANCELLED: (no actions — terminal)

**5. Line Items Support Grid** (read-only PowersheetGrid)

- Shows selected PO's line items
- Columns: Product, Category, Ordered, Received, COGS Mode, Unit Cost (formatted — "$X" for FIXED, "$X–$Y" for RANGE), Line Total
- Data source: `purchaseOrders.getById` → items array

**6. Status Bar** (WorkSurfaceStatusBar)

- Left: PO count + selected PO context
- Right: KeyboardHintBar (Click select, ⌘K search)

**Queue → Creation transition:**

- "+ New PO" navigates to `?poView=create`
- "Edit" on a draft PO navigates to `?poId=X&poView=edit`
- Deep link support: `?poId=X` selects that PO in the queue, `?supplierClientId=X` opens creation mode with supplier pre-filled

**"Start Receiving" handoff:**

- Available for CONFIRMED and RECEIVING POs
- ConfirmDialog before action to prevent silent context-switch (existing BUG-025 pattern)
- On confirm: creates `ProductIntakeDraft` via `createProductIntakeDraftFromPO()` with all PO lines at full remaining quantities
- Stores draft in localStorage via `upsertProductIntakeDraft()`
- Navigates to ReceivingPage (standalone intake module for warehouse staff)
- The ReceivingPage handles line selection and quantity adjustment — the PO surface does not replicate the intake picker step
- If a line has 0 remaining quantity (fully received), it's included in the draft but marked as complete

### Mode 2: Creation/Edit

Triggered by URL params: `?poView=create` or `?poId=X&poView=edit`.

**Layout (top → bottom):**

**1. Toolbar** (single row, 4px vertical padding)

- "← Back to Queue" button
- Title: "New Purchase Order" or "Edit PO-XXXX"
- SupplierCombobox (required, seller clients only)
- Right-aligned: Autosave status badge, Save Draft button, Submit PO button (primary)

**2. Split Grids** (6px gap)

**Left (40% — `2fr`): Multi-Source Product Browser**

Tab toggle in header: **Supplier History** (default) | **Low Stock** | **Full Catalog**

_Supplier History tab:_

- Data source: `purchaseOrders.getRecentProductsBySupplier` (limit 8)
- Columns: Product, Category, Last Cost, Last PO (number + date), Action ("+ Add" / "Added")
- Also shows: Previous POs from supplier (`purchaseOrders.getBySupplier`, limit 8) — PO number, date, status, total — for cadence/terms context

_Low Stock tab:_

- Data source: `inventory.getEnhanced` filtered to low/critical stock status
- Columns: Product, Category, On Hand, Available, Stock Status badge, Action ("+ Add" / "Added")

_Full Catalog tab:_

- Data source: `purchaseOrders.products` (limit 500), fallback to `productCatalogue.list`
- Columns: Product, Category, Subcategory, Action ("+ Add" / "Added")

Shared across all tabs:

- Search input (filters current tab's data)
- "+ Add" button per row — adds product to PO document grid with defaults (qty: 1, COGS mode: FIXED, unit cost from last cost or 0)
- "Added" badge replaces button when product already in document
- Footer: tab label + row count + context

**Right (60% — `3fr`): PO Document Grid (editable PowersheetGrid)**

- `selectionMode: "cell-range"`, `enableFillHandle: true`, `enableUndoRedo: true`
- Header: "PO Line Items" label + editable/locked cell legend badges
- Editable columns (accent border, double-click to edit):
  - **Qty** — number input (positive, required)
  - **COGS Mode** — dropdown (FIXED / RANGE)
  - **Unit Cost** — number input for FIXED; two inputs (Min / Max) for RANGE
  - **Notes** — free text per line item
- Locked columns (muted):
  - **#** — row number
  - **Product** — product name
  - **Category** — from product or manual selection
  - **Line Total** — calculated (qty × unit cost; for RANGE: qty × average of min+max)
- Row delete: × button per row (minimum 1 line enforced)
- Paste validation for qty/cost fields
- Fill-handle arithmetic detection (from existing OrdersDocumentLineItemsGrid patterns)

**Invoice Bottom** (anchored inside right grid card, below rows):

- Right-aligned totals: Subtotal (N lines), **Total** (bold, primary color)
- Terms row (4-column grid):
  - **Order Date** — date input (editable, accent border, defaults to today)
  - **Expected Delivery** — date input (editable, accent border, optional)
  - **Payment Terms** — dropdown (existing settings-driven options: CONSIGNMENT, COD, NET_7, NET_15, NET_30, PARTIAL). Customization via existing settings mechanism.
  - **Notes** — two buttons: "Internal" / "Supplier" — each toggles open a textarea below. Both stored separately on the PO.

**3. Status Bar**

- Left: line count + total + supplier name
- Right: KeyboardHintBar (Dbl-click edit, Tab next, ⌘S save, ⌘↵ submit, ⌘Z undo)

### State Management — `usePoDocument()` Hook

Extracted from PurchaseOrdersWorkSurface inline state. Encapsulates:

- `supplierId` — selected supplier
- `lineItems` — PO line items with qty, COGS mode, unit cost (min/max for RANGE), notes
- `orderDate`, `expectedDeliveryDate` — date fields
- `paymentTerms` — selected terms
- `internalNotes`, `supplierNotes` — two separate note fields
- `draftId` — current draft identity (null for new PO)
- Auto-save: debounced, fingerprint-based dirty tracking
- Dirty tracking: fingerprint comparison to avoid unnecessary saves
- Draft CRUD: create (`purchaseOrders.create`), update (`purchaseOrders.update`), submit (`purchaseOrders.submitPO`)
- Validation: supplier required, at least 1 line item, qty > 0, cost validation per COGS mode

### Existing Components Reused

| Component                      | From                                        | Usage                                                  |
| ------------------------------ | ------------------------------------------- | ------------------------------------------------------ |
| `PowersheetGrid`               | `spreadsheet-native/PowersheetGrid`         | Queue grid, line items grid, product browser grid      |
| `WorkSurfaceStatusBar`         | `work-surface/WorkSurfaceStatusBar`         | Status bar                                             |
| `KeyboardHintBar`              | `work-surface/KeyboardHintBar`              | Keyboard shortcuts                                     |
| `SupplierCombobox`             | `ui/supplier-combobox`                      | Supplier selector in creation toolbar                  |
| `ConfirmDialog`                | `ui/confirm-dialog`                         | Delete, status change, receiving handoff confirmations |
| `InspectorPanel`               | `work-surface/InspectorPanel`               | PO detail inspector (queue mode)                       |
| `purchaseOrderCategoryOptions` | `work-surface/purchaseOrderCategoryOptions` | Category/subcategory options for product browser       |
| `purchaseOrderBulkCogs`        | `work-surface/purchaseOrderBulkCogs`        | Bulk COGS logic for multi-row operations               |
| `purchaseOrdersDeepLink`       | `uiux-slice/purchaseOrdersDeepLink`         | URL param parsing (adapted for new param scheme)       |
| `productIntakeDrafts`          | `lib/productIntakeDrafts`                   | Intake draft creation for receiving handoff            |

### New Components

| Component              | Purpose                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `PurchaseOrderSurface` | Unified PO surface — queue + creation/edit modes                                                |
| `ProductBrowserGrid`   | Left-side multi-source product browser with tab toggle (Supplier History / Low Stock / Catalog) |
| `usePoDocument()`      | PO draft state management hook — line items, supplier, terms, notes, auto-save, validation      |

### Components Retired

- `PurchaseOrdersWorkSurface` (2909 lines) — legacy work surface
- `PurchaseOrdersSlicePage` (1328 lines) — slice surface with dual-mode
- `PurchaseOrdersPilotSurface` (1223 lines) — sheet-native pilot
- `SheetModeToggle` for purchase-orders tab in ProcurementWorkspacePage

### Routing Changes

In `ProcurementWorkspacePage.tsx`:

```tsx
// Before: two surfaces + toggle
surfaceMode === "sheet-native"
  ? <PurchaseOrdersPilotSurface onOpenClassic={...} />
  : <PurchaseOrdersSlicePage />

// After: one surface, no toggle
<PurchaseOrderSurface />
```

In `InventoryWorkspacePage.tsx`, the `receiving` panel:

```tsx
// Before:
receivingDraftId ? (
  <ReceivingPage />
) : (
  <PurchaseOrdersSlicePage mode="receiving" />
);

// After:
receivingDraftId ? (
  <ReceivingPage />
) : (
  <PurchaseOrderSurface defaultStatusFilter={["CONFIRMED", "RECEIVING"]} />
);
```

The `commandStrip` for the purchase-orders tab drops the SheetModeToggle.

---

## Shared Patterns

### Density & Styling

- **Padding**: 3-4px vertical on toolbar/action bar, 6px gap between grid cards
- **Font sizes**: 9-11px for labels/badges/hints, 11-12px for data
- **Grid cards**: `border: 1px solid border`, `border-radius: 6px`, white background
- **Editable cells**: left 2px accent border + subtle accent background (`powersheet-cell--editable`)
- **Locked cells**: muted foreground + muted background (`powersheet-cell--locked`)
- **Status badges**: compact inline badges matching existing color scheme per status
- **Dashboard stat badges**: compact toolbar badges (no vertical cost)

### Keyboard Shortcuts

**Inventory:**

- Double-click: enter cell edit mode
- ⌘K: focus search
- ⌘S: save (commits pending edits)
- ⌘Z: undo
- ⌘C: copy selected cells
- ⌘A: select all
- Escape: cancel edit / close drawer

**Purchase Orders (creation mode):**

- Double-click: enter cell edit mode
- Tab: next editable cell
- ⌘S: save draft
- ⌘↵: submit PO
- ⌘Z: undo
- Escape: cancel edit

---

## Future Work: Inline Receiving/Intake

**Out of scope for this spec.** Noted as a future enhancement.

The current design hands off from the PO surface to the standalone ReceivingPage (`ProductIntakeSlicePage`) for actual intake processing. The goal is to eventually offer an inline intake option within the PO surface for users who want to stay in context, while the standalone ReceivingPage remains the primary entry point for warehouse staff who need a dedicated, focused intake workflow.

This would involve:

- Adding an inline intake panel to the PO surface (right side or below the queue)
- Embedding location assignment, quality/grade, media uploads, batch/SKU creation
- Preserving the ReceivingPage as a standalone module — different users, different context
- The PO surface inline option would be for procurement staff doing quick receives; the standalone page stays for warehouse staff doing full intake processing

---

## What Is NOT Changing

- **tRPC routers**: `inventory.*`, `purchaseOrders.*`, `poReceiving.*`, `clients.*`, `inventoryMovements.*` — no server changes
- **Database schema**: No migrations
- **ReceivingPage** (`ProductIntakeSlicePage`) — untouched, standalone module for warehouse staff
- **Intake draft mechanism** — `productIntakeDrafts.ts` localStorage flow preserved as-is
- **Other workspace tabs**: Intake, Shipping, Photography, Samples — untouched
- **Other pilot surfaces**: `IntakePilotSurface`, `FulfillmentPilotSurface`, `SamplesPilotSurface` — untouched
- **Sales surfaces**: `SalesCatalogueSurface`, `SalesOrderSurface`, `OrdersSheetPilotSurface` — untouched
- **PowersheetGrid / AG Grid**: No changes to the grid component itself
- **Category/subcategory options**: `purchaseOrderCategoryOptions.ts` reused as-is
- **Bulk COGS logic**: `purchaseOrderBulkCogs.ts` reused as-is

---

## Risk & Mitigation

| Risk                                                                                                            | Impact | Mitigation                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory classic surface has features that get lost in translation                                             | High   | Full 14-category feature audit completed. Each classic feature has a mapped home in the new surface. Gap analysis verified against both classic and pilot.          |
| Gallery mode with PowersheetGrid may have different performance characteristics than classic HTML table gallery | Low    | Gallery is a separate React component, not a grid mode. PowersheetGrid is only used in grid mode.                                                                   |
| PO creation split surface is significantly more complex than the current modal                                  | Medium | Phase 2 runs after Phase 1 validates the pattern. `usePoDocument()` hook extracted first, tested before wiring layout.                                              |
| Receiving tab behavior changes when PurchaseOrdersSlicePage is retired                                          | Medium | `PurchaseOrderSurface` with `defaultStatusFilter` prop provides identical queue-mode behavior. Handoff to ReceivingPage preserved exactly.                          |
| AdjustmentContextDrawer is a new interaction pattern (right drawer on cell edit)                                | Low    | Pattern is proven in the codebase (InspectorPanel). Drawer is simpler — fewer sections, focused purpose.                                                            |
| Multi-source product browser (3 tabs) adds complexity to PO creation                                            | Medium | Each tab is a thin data-source wrapper over a shared grid component. Supplier History is default and most useful. Low Stock and Catalog are progressive disclosure. |

---

## Success Criteria

1. Inventory tab renders one unified surface (no SheetModeToggle) with grid and gallery modes
2. Purchase Orders tab renders one unified surface (no SheetModeToggle) with queue and creation modes
3. All inventory features from classic surface have a working home (14-dimension filtering, saved views, gallery, dashboard stats, bulk operations, qty adjustment, status editing, export)
4. All PO features from classic + slice surfaces have a working home (creation with COGS modes, status lifecycle, supplier history, line item management, receiving handoff, export)
5. Double-click inline editing works for inventory grid (grade, status, on-hand, COGS)
6. Adjustment Context Drawer enforces reason requirement for qty changes
7. PO multi-source product browser works (Supplier History, Low Stock, Full Catalog tabs)
8. PO invoice-bottom shows totals, dates, payment terms, and both note fields
9. Receiving tab on Inventory workspace uses PurchaseOrderSurface with pre-filter, handoff to ReceivingPage preserved
10. No regressions in: bulk operations, export, saved views, deep linking, intake draft creation
