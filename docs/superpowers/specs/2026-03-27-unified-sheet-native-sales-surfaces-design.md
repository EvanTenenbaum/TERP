# Unified Sheet-Native Sales Surfaces

**Date**: 2026-03-27
**Status**: Design Approved
**Approach**: Hybrid — Phase 1 (Sales Catalogue), Phase 2 (Sales Order)

## Problem

The Sales Catalogue and Sales Order creation flows each have two surfaces (classic form-based + sheet-native pilot) that diverge from the directional mockups Evan provided. The mockups prescribe a specific layout composition — left-side inventory browser, right-side document/preview, inline support modules — that neither surface implements. The SheetModeToggle adds cognitive overhead and the classic surfaces are now redundant.

## Decision

Replace both classic and sheet-native surfaces with one unified sheet-native surface per module. Retire the SheetModeToggle for these tabs. PowersheetGrid (AG Grid) is the data surface everywhere. Minimal padding — grids get maximum space.

---

## Phase 1: Sales Catalogue Surface

### New Component

`SalesCatalogueSurface.tsx` — replaces both `SalesSheetCreatorPage` and `SalesSheetsPilotSurface`.

### Layout (top → bottom)

**1. Toolbar** (single row, 4px vertical padding)

- Back to Orders button
- "Sales Catalogue" badge
- Draft name input (inline, 150px)
- ClientCombobox (customer selector, buyers only)
- Right-aligned: Autosave status card, Dirty cell count card, Save Draft button

**2. Action Bar** (single row, 3px vertical padding)

- "Sheet" label
- `+ Add` button (adds selected inventory row to sheet)
- `Remove` button (removes selected preview row)
- Quick View dropdown (loads saved filter/sort views, scoped to customer)
- Save View button (persists current filter/sort as named view)
- Filters button (opens AdvancedFilters: category, grade, price range, strain, vendor, in-stock)
- Right-aligned: running item count + total value

**3. Split Grids** (6px gap between cards, each card has 6px border-radius)

Left (75% — `3fr`): **Inventory Browser PowersheetGrid**

- Read-only, cell-range selection, no fill handle, no undo
- Header: "Inventory" label + inline search input
- Columns: Product, Category, Qty, Retail, COGS (permission-gated), Selected (✓/—)
- Data source: `salesSheets.getInventory(clientId)` — returns client-priced inventory
- Footer: "Client pricing applied · [view name] · N visible"

Right (25% — `1fr`): **Preview PowersheetGrid + Output**

- Read-only, cell-range selection
- Header: "Preview" label + Clear All button
- Columns: #, Item, Qty, Total
- Invoice-style totals below grid: Items count, Total value (right-aligned, heavier weight)
- Output actions row: Save (primary), Share, PDF, Print buttons

**4. Handoff Bar** (full-width card below split, 6px margin)

- Left: Dirty-state warning badge ("Dirty edits block share / convert")
- Right: Share Link, → Sales Order, → Quote, Live buttons
- All convert/share actions disabled when `hasUnsavedChanges === true`
- Handoff mechanism: `sessionStorage.setItem("salesSheetToQuote", ...)` + navigate with `?fromSalesSheet=true`

**5. Status Bar** (WorkSurfaceStatusBar)

- Left: "N selected · [view name] · N dirty cells · [client]"
- Right: KeyboardHintBar (⌘S save, ⌘C copy, Click select)

### Data & State

- **tRPC layer unchanged**: `salesSheets.getInventory`, `saveDraft`, `getDrafts`, `getDraftById`, `deleteDraft`, `convertDraftToSheet`, `getViews`, `saveView`, `loadView`, `setDefaultView`, `deleteView`, `generateShareLink`, `convertToOrder`, `convertToLiveSession`
- **Auto-save**: 30s timer with stale-closure-safe refs (existing pattern from SalesSheetsPilotSurface)
- **Draft state**: `currentDraftId`, `draftName`, `hasUnsavedChanges`, `lastSaveTime`
- **Filter/sort state**: `filters` (InventoryFilters), `sort` (InventorySortConfig), `columnVisibility`, `currentViewId`
- **Selected items**: `PricedInventoryItem[]` — items added to the sheet

### Existing Components Reused

| Component              | From                                | Usage                                          |
| ---------------------- | ----------------------------------- | ---------------------------------------------- |
| `ClientCombobox`       | `ui/client-combobox`                | Customer selector in toolbar                   |
| `QuickViewSelector`    | `sales/QuickViewSelector`           | Saved views dropdown in action bar             |
| `SaveViewDialog`       | `sales/SaveViewDialog`              | Save current filter/sort config                |
| `AdvancedFilters`      | `sales/AdvancedFilters`             | Category, grade, price, strain, vendor filters |
| `DraftDialog`          | `sales/DraftDialog`                 | Load saved drafts (via toolbar menu)           |
| `SavedSheetsDialog`    | `sales/SavedSheetsDialog`           | Load finalized sheets                          |
| `WorkSurfaceStatusBar` | `work-surface/WorkSurfaceStatusBar` | Status bar                                     |
| `KeyboardHintBar`      | `work-surface/KeyboardHintBar`      | Keyboard shortcuts                             |
| `PowersheetGrid`       | `spreadsheet-native/PowersheetGrid` | Both grids                                     |
| `ConfirmDialog`        | `ui/confirm-dialog`                 | Delete draft confirmation                      |

### Components Retired

- `SalesSheetCreatorPage` (628 lines) — classic form surface
- `SalesSheetsPilotSurface` (1000+ lines) — sheet-native pilot
- `SalesSheetPreview` (717 lines) — replaced by preview PowersheetGrid + inline totals
- `InventoryBrowser` (300+ lines) — replaced by inventory PowersheetGrid with column defs
- `DraftControls` (115 lines) — inlined into toolbar
- `SheetModeToggle` for sales-sheets tab in SalesWorkspacePage

### Routing Change

In `SalesWorkspacePage.tsx`, the `sales-sheets` panel simplifies:

```tsx
// Before: two surfaces + toggle
salesSheetsSurfaceMode === "sheet-native"
  ? <SalesSheetsPilotSurface />
  : <SalesSheetCreatorPage embedded />

// After: one surface, no toggle
<SalesCatalogueSurface />
```

---

## Phase 2: Sales Order Surface

### New Component

`SalesOrderSurface.tsx` — replaces `OrderCreatorPage` (document/create mode) and `OrdersSheetPilotSurface` document mode.

**Note**: `OrdersSheetPilotSurface` queue mode (orders list) is preserved as-is. Only the document/create mode is replaced.

### Layout (top → bottom)

**1. Toolbar** (single row, 4px vertical padding)

- Back to Queue button
- Seed badge (if `fromSalesSheet=true`: "Seeded from Catalogue")
- ClientCombobox (customer selector — clickable name opens Customer Drawer)
- Document Mode selector (Sales Order / Quote)
- Draft number label
- Right-aligned: Autosave status card, Save Draft button, Finalize button (primary)

**2. Action Bar** (single row, 3px vertical padding)

- "Order" label
- `+ Add Rows` button (adds selected inventory to order document)
- `Duplicate` button (duplicates selected order rows)
- `Del` button (deletes selected order rows)
- `Filters` button (inventory browser filters)
- `Saved Views ▾` dropdown (customer-scoped filter/sort views)
- Right-aligned: running line count + total + referral source

**3. Split Grids** (6px gap, rounded card borders)

Left (40% — `2fr`): **Inventory Browser PowersheetGrid**

- Shared pattern with Sales Catalogue inventory grid
- Read-only, cell-range selection
- Header: "Inventory" label + search input + location filter
- Columns: SKU, Product, Batch, Avail, Action (Add/Added)
- Data source: `salesSheets.getInventory(clientId)` with batch-level enrichment
- Footer: "N available · Client pricing applied"

Right (60% — `3fr`): **Order Document PowersheetGrid** (editable)

- Uses `OrdersDocumentLineItemsGrid` column defs and edit/paste/fill logic
- `selectionMode: "cell-range"`, `enableFillHandle: true`, `enableUndoRedo: true`
- Header: "Sales Order" label + editable/locked cell legend badges
- Editable columns (accent border): Qty, Price, Discount, COGS (permission-gated), Sample
- Locked columns (muted): #, Product, Batch, Line Total
- Conditional columns: COGS, Margin (via `resolveOrderCostVisibility()`)
- Batch/Lot change: row context menu → "Change Lot" opens BatchSelectionDialog
- Paste validation, fill-handle arithmetic detection, toast dedup — all from existing OrdersDocumentLineItemsGrid

**4. Invoice Bottom** (anchored inside right grid card, below rows)

- Right-aligned summary rows: Subtotal, Discount (editable — click for %/$ mode popover), Freight (editable), **Total** (bold, primary color)
- **Payment Terms**: Select dropdown (Net 15 / Net 30 / Net 45 / Net 60 / COD / Prepaid) + "★ Save default" action to persist to customer profile. Auto-populated from customer default on client selection. _Note: Payment Terms in the order creation UI is new — requires schema investigation during implementation for whether the field already exists on the order/client tables._
- **Credit info** (subtle, right-aligned): Available credit amount + usage % warning. Informational only — never blocks any action. Clicking opens Customer Drawer to credit section.

**5. Order Adjustments** (full-width card below the split, 6px margin)

- 3-column grid:
  - **Referral**: Current source name + "Change" button (ReferredBySelector)
  - **Notes**: Editable text input (order-level notes, editable accent border)
  - **Draft status**: State label + Save Draft / Finalize buttons (redundant with toolbar for accessibility)
- Header with status badges: Autosave state, seed origin, Quote mode availability

**6. Status Bar** (WorkSurfaceStatusBar)

- Left: "N items · seeded draft · [terms] · [client]"
- Right: KeyboardHintBar (Tab next, ⌘S save, ⌘↵ finalize, ⌘Z undo)

### State Management — `useOrderDraft()` Hook

Extracted from OrderCreatorPage's inline state. Encapsulates:

- `activeDraftId`, `activeDraftVersion` — current draft identity
- `orderType` — SALE or QUOTE
- `clientId`, `referredByClientId` — customer context
- `lineItems` — order line items with full pricing/COGS fields
- `adjustment` — order-level discount/markup (mode, type, amount, showOnDocument)
- `paymentTerms` — selected terms for this order
- `notes` — order-level notes
- Auto-save: 2s debounced via `useDebounceCallback`, fingerprint comparison to avoid unnecessary saves
- Dirty tracking: `buildOrderFingerprint()` comparison
- Draft CRUD: create (`orders.createDraftEnhanced`), update (`orders.updateDraftEnhanced`), finalize (`orders.finalizeDraft`)
- Credit check: `orders.checkOrderCredit` — runs for SALE orders before finalize, result is informational
- Seed import: reads `sessionStorage.getItem("salesSheetToQuote")` when `fromSalesSheet=true`
- Route params: `draftId`, `quoteId`, `clientId`, `needId`, `mode=quote`, `mode=duplicate`, `fromSalesSheet`

### Existing Components Reused

| Component                     | From                                 | Usage                                                                 |
| ----------------------------- | ------------------------------------ | --------------------------------------------------------------------- |
| `OrdersDocumentLineItemsGrid` | `orders/OrdersDocumentLineItemsGrid` | Right grid — editable order document (reuse column defs + edit logic) |
| `PowersheetGrid`              | `spreadsheet-native/PowersheetGrid`  | Both grids                                                            |
| `ClientCombobox`              | `ui/client-combobox`                 | Customer selector                                                     |
| `CreditWarningDialog`         | `orders/CreditWarningDialog`         | Credit check result dialog (informational)                            |
| `CreditLimitBanner`           | `orders/CreditLimitBanner`           | Credit context (adapted for invoice-bottom)                           |
| `BatchSelectionDialog`        | Referenced in OrderCreatorPage       | Lot change from context menu                                          |
| `ConfirmDraftModal`           | `orders/ConfirmDraftModal`           | Finalize confirmation                                                 |
| `ReferredBySelector`          | Referenced in OrderCreatorPage       | Referral source in adjustments                                        |
| `QuickViewSelector`           | `sales/QuickViewSelector`            | Saved filter views                                                    |
| `AdvancedFilters`             | `sales/AdvancedFilters`              | Inventory browser filters                                             |
| `WorkSurfaceStatusBar`        | `work-surface/WorkSurfaceStatusBar`  | Status bar                                                            |
| `KeyboardHintBar`             | `work-surface/KeyboardHintBar`       | Keyboard shortcuts                                                    |

### Components Retired

- `OrderCreatorPage` (21,560 lines) — monolith replaced by SalesOrderSurface + useOrderDraft
- `OrdersSheetPilotSurface` document mode — replaced by SalesOrderSurface
- `FloatingOrderPreview` — replaced by invoice-bottom totals
- `OrderAdjustmentPanel` — replaced by invoice-bottom Discount row
- `OrderTotalsPanel` — replaced by invoice-bottom summary
- `ReferralCreditsPanel` — replaced by compact Referral card in adjustments
- `LineItemTable` — replaced by PowersheetGrid with OrdersDocumentLineItemsGrid defs
- `SheetModeToggle` for orders and create-order tabs in SalesWorkspacePage
- Various inline form sections from OrderCreatorPage

### Routing Change

In `SalesWorkspacePage.tsx`:

```tsx
// orders tab: OrdersSheetPilotSurface stays for queue mode.
// When it enters document mode (New Order, Edit Draft, fromSalesSheet, etc.),
// it renders SalesOrderSurface instead of the old OrderCreatorPage embed.
// The transition trigger is the same URL params: ?ordersView=document, ?draftId=, etc.

// create-order tab simplifies to always render SalesOrderSurface:
// Before:
surfaceMode === "sheet-native"
  ? <OrdersSheetPilotSurface forceDocumentMode />
  : <OrderCreatorPage />
// After:
<SalesOrderSurface />
```

The orders tab's `OrdersSheetPilotSurface` keeps its queue mode. Its `currentDocumentMode` branch changes from rendering `<OrderCreatorPage surfaceVariant="sheet-native-orders" />` to rendering `<SalesOrderSurface />`.

---

## Shared Patterns

### Inventory Browser Grid

Both surfaces use a left-side inventory PowersheetGrid. The column defs differ:

| Surface         | Columns                                        | Data                             |
| --------------- | ---------------------------------------------- | -------------------------------- |
| Sales Catalogue | Product, Category, Qty, Retail, COGS, Selected | Client-priced inventory          |
| Sales Order     | SKU, Product, Batch, Avail, Action             | Batch-level inventory with stock |

The data source is the same (`salesSheets.getInventory`), but Sales Order enriches with batch/SKU details. A shared `useInventoryBrowserGrid()` hook can provide: search state, filter state, view state, column defs (parameterized), and row mapping.

### Filtering & Saved Views

Both surfaces use the same filter/view system:

- `AdvancedFilters` for category, grade, price range, strain, vendor, in-stock
- `QuickViewSelector` for loading saved filter/sort configurations
- `SaveViewDialog` for persisting new views
- Views are scoped to customer (`clientId`) or universal
- `salesSheets.getViews`, `saveView`, `loadView`, `setDefaultView`, `deleteView`

### Density & Styling

- **Padding**: 3-4px vertical on toolbar/action bar, 6px gap between grid cards
- **Font sizes**: 9-11px for labels/badges/hints, 11-12px for data
- **Grid cards**: `border: 1px solid border`, `border-radius: 6px`, white background
- **Editable cells**: left 2px accent border + subtle accent background (existing `powersheet-cell--editable` CSS)
- **Locked cells**: muted foreground + muted background (existing `powersheet-cell--locked` CSS)
- **Status cards**: compact inline badges (AUTO/OK, DIRTY/N, CREDIT/Warn)

### Margin Warnings

Margin warnings are informational only. They never block any action — no save, finalize, or convert is gated on margin state. Warnings display as subtle visual cues (color-coded margin % in grid cells, toast for zero-margin orders) but no modal or hard block.

---

## What Is NOT Changing

- **tRPC routers**: `salesSheets.*` and `orders.*` — no server changes for layout work
- **Database schema**: No migrations for layout work (Payment Terms may require schema investigation)
- **OrdersSheetPilotSurface queue mode**: The orders list grid stays as-is
- **Other pilot surfaces**: Inventory, Intake, Fulfillment, Invoices, Payments, Quotes, Returns — untouched
- **Shared sales-sheet page**: `/shared/sales-sheet/:token` (SharedSalesSheetPage) — untouched
- **Live Shopping**: LiveShoppingPage — untouched
- **PowersheetGrid / SpreadsheetPilotGrid**: No changes to the grid component itself

---

## Risk & Mitigation

| Risk                                                 | Impact | Mitigation                                                                                                                       |
| ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| OrderCreatorPage decomposition breaks existing flows | High   | Phase 2 runs after Phase 1 validates the pattern. Extract `useOrderDraft()` first, verify draft lifecycle before wiring layout.  |
| Payment Terms schema doesn't exist                   | Medium | Investigate during Phase 2 implementation. If schema work needed, flag as sub-task. If field exists but isn't surfaced, wire it. |
| Lost functionality during retirement                 | High   | Audit checklist verified against 17-category feature inventory. Each retired component has a mapped replacement.                 |
| AG Grid performance with two side-by-side grids      | Low    | Already proven in other sheet-native surfaces. Lazy load grids, defer non-visible grid until client selected.                    |

---

## Success Criteria

1. Sales Catalogue tab renders one unified surface (no SheetModeToggle)
2. Sales Order/Create Order tab renders one unified surface (no SheetModeToggle)
3. All 17 feature categories from the OrderCreatorPage audit have a working home
4. Dirty-state gating works: share/convert blocked when unsaved changes exist
5. Handoff from Sales Catalogue → Sales Order preserves client + items via sessionStorage
6. Filtering and saved views work in both surfaces, scoped to customer
7. Auto-save and draft lifecycle work identically to current behavior
8. No regressions in: credit checks, finalize workflow, quote mode, referral, COGS visibility
