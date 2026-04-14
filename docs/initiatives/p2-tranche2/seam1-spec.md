# Seam 1 Spec: Portable Cuts (Filter Transport Between Surfaces)

**Status**: Specification  
**Date**: 2026-04-07  
**Branch**: p2-phase1-immediate-fixes

---

## 1. Current Filter Infrastructure Audit

### 1.1 Two Separate Filter Systems

The codebase has **two distinct filter systems** that don't share types or state:

#### A. Inventory WorkSurface Filters (`useInventoryFilters.ts`)

**State shape:**

```typescript
interface InventoryFilters {
  status: string[]; // Batch statuses (LIVE, ON_HOLD, etc.)
  category: string | null;
  subcategory: string | null;
  vendor: string[];
  brand: string[];
  grade: string[];
  dateRange: { from: Date | null; to: Date | null };
  location: string | null;
  stockLevel: "all" | "in_stock" | "low_stock" | "out_of_stock";
  cogsRange: { min: number | null; max: number | null };
  paymentStatus: string[];
  stockStatus: "ALL" | "CRITICAL" | "LOW" | "OPTIMAL" | "OUT_OF_STOCK";
  ageBracket: "ALL" | "FRESH" | "MODERATE" | "AGING" | "CRITICAL";
  batchId: string | null;
}
```

**URL param support:** Yes, but **read-only on init** — reads `stockLevel`, `status`, `category`, `stockStatus`, `ageBracket`, `batchId` from `window.location.search` during `useState` initialization. Does NOT write back to URL.

**Persistence:** In-memory only (React state). No localStorage, no sessionStorage, no URL sync after init.

#### B. Sales/Catalogue Filters (`filtering.ts` in `components/sales/`)

**State shape:**

```typescript
interface InventoryFilters {
  // Note: same name, DIFFERENT type
  search: string;
  categories: string[]; // plural (vs singular in inventory)
  brands: string[];
  grades: string[];
  priceMin: number | null;
  priceMax: number | null;
  strainFamilies: string[];
  vendors: string[];
  inStockOnly: boolean;
}
```

**Portable Cut mechanism already exists:**

```typescript
interface PortableSalesCut {
  clientId: number;
  filters: InventoryFilters; // Sales filter type
  viewId?: number | null;
  viewName?: string | null;
}
```

**Transport:** `sessionStorage` (key: `salesCataloguePortableCut`). Written by `SalesCatalogueSurface` on "Convert to Order", read by `OrderCreatorPage` on init.

**Current flow:**

1. User builds a catalogue cut in `SalesCatalogueSurface`
2. Clicks "→ Sales Order" or "→ Quote"
3. `writePortableSalesCut()` stores filters + clientId + viewId in sessionStorage
4. Navigation to order creator
5. `OrderCreatorPage` calls `readPortableSalesCut()` on init
6. Passes `portableCut` prop to `InventoryBrowser`
7. `InventoryBrowser` applies the cut via `matchesSalesInventoryFilters()`
8. Cut badge appears with view name + filter summary chips

---

### 1.2 `SavedViewsDropdown.tsx` — Inventory Saved Views

**Persistence:** Server-side via `trpc.inventory.views.list/create/delete`

**What's saved:** Full `InventoryFilters` object (inventory type) as JSON, associated with user, optionally shared.

**Application:** Calls `onApplyView(view.filters)` which sets all filter state in the parent.

**NOT portable:** These views are locked to the Inventory WorkSurface. They cannot be loaded in the Sales Catalogue or Order Creator.

---

### 1.3 `AdvancedFilters.tsx` — Inventory Filter UI

Pure presentational component. Renders filter controls for the inventory filter type. Calls `onUpdateFilter(key, value)` on change. No persistence logic.

**Filter facets available:**

- Status (checkbox list)
- Category (select)
- Subcategory (select, filtered by category)
- Stock Level (select)
- Vendor (checkbox list)
- Brand/Farmer (checkbox list, dynamic label)
- Grade (checkbox list)
- Date Range (two date inputs)
- Location (text input)
- COGS Range (two number inputs)
- Payment Status (checkbox list)
- Stock Status (select)
- Age Bracket (select)
- Batch ID (text input)

---

### 1.4 `FilterChips.tsx` — Inventory Filter Display

Pure presentational. Maps active filters to removable badge chips. Calls `onRemoveFilter(key, value?)` on dismiss. Has "Clear All" button.

---

### 1.5 `InventoryBrowser.tsx` — Does it use the same filter system?

**No.** The InventoryBrowser has its own local filter state:

- `search` (text input)
- `minClientPrice` / `maxClientPrice` (number inputs)
- `includeUnavailable` (checkbox)
- Plus the **portable cut** passed as a prop

It does NOT use `useInventoryFilters` or the `AdvancedFilters` component. The inventory browser in the order creator is a completely separate filtering context.

---

### 1.6 `SalesCatalogueSurface.tsx` — Catalogue Filter System

Uses its own `InventoryFilters` (sales type), `AdvancedFilters` (sales version — different component than inventory's), `QuickViewSelector`, and `SaveViewDialog`.

**Saved views:** Server-side via `trpc.salesSheets.getViews/createView`, scoped to client + user. Different API than inventory views.

**Already has portability:** The `writePortableSalesCut` → `readPortableSalesCut` flow works for Catalogue → Order Creator.

---

## 2. Serialization Assessment

### What's Already Serializable

| Filter System                             | Serializable?        | How                                                                                                       |
| ----------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| Inventory filters (`useInventoryFilters`) | ✅ Yes, with caveats | All fields are JSON-safe. `Date` objects need ISO string conversion. Saved views already serialize to DB. |
| Sales filters (`filtering.ts`)            | ✅ Yes               | Already serialized to sessionStorage as JSON (PortableSalesCut). All fields are primitive.                |
| Inventory saved views                     | ✅ Yes               | Already persisted to server as JSON                                                                       |
| Sales saved views                         | ✅ Yes               | Already persisted to server as JSON                                                                       |

**Caveat:** Inventory `dateRange` uses `Date` objects. The `normalizeSavedFilters` function in `InventoryWorkSurface.tsx` already handles Date deserialization from saved views, confirming this is a solved problem.

### What Surfaces Already Read URL Filter Params

| Surface               | Reads URL Params                                                                          | Writes URL Params |
| --------------------- | ----------------------------------------------------------------------------------------- | ----------------- |
| Inventory WorkSurface | ✅ On init: stockLevel, status, category, stockStatus, ageBracket, batchId                | ❌ Never          |
| Sales Catalogue       | ✅ On init: clientId                                                                      | ❌ Never          |
| Order Creator         | ✅ On init: clientId, draftId, quoteId, needId, mode, fromSalesSheet, customerDrawer, tab | ❌ Never          |
| InventoryBrowser      | ❌                                                                                        | ❌                |

---

## 3. Transport Options Analysis

### Option A: URL Parameters (Recommended for cross-surface links)

**Pros:**

- Shareable, bookmarkable
- Already partially implemented (inventory deep links)
- Works across browser tabs
- Survives page refresh

**Cons:**

- URL length limits (~2000 chars in some browsers)
- Complex nested filters need encoding
- Two-way sync is complex

**Best for:** Deep links between surfaces (e.g., inventory dashboard card → inventory work surface with filter pre-applied)

### Option B: sessionStorage (Already implemented for Catalogue → Order)

**Pros:**

- Already working (PortableSalesCut)
- No URL length limits
- Can carry rich state

**Cons:**

- Not shareable/bookmarkable
- Single-tab only
- Cleared on tab close
- Requires manual read/clear lifecycle

**Best for:** Transient navigation flows (catalogue → order creator)

### Option C: Shared Hook / Context

**Pros:**

- Real-time sync between mounted components
- Type-safe

**Cons:**

- Only works within same React tree
- Doesn't survive navigation between pages
- Would require significant refactor to share between disconnected surfaces

**Not recommended** as primary transport.

### Option D: Server-side Saved Views (Already exists, separate systems)

**Pros:**

- Persistent, named, shareable
- Already built for both surfaces

**Cons:**

- Requires save action (not instant)
- Two separate APIs
- Overkill for ad-hoc filter transport

**Best for:** Intentional, named filter presets

---

## 4. Proposed Implementation

### Phase 1: Unify the Portable Cut Pattern (Low effort, high impact)

1. **Generalize `PortableSalesCut` to `PortableFilterCut`:**

   ```typescript
   interface PortableFilterCut {
     source: "inventory" | "catalogue" | "order-creator";
     clientId?: number | null;
     inventoryFilters?: InventoryWorkSurfaceFilters; // renamed for clarity
     salesFilters?: SalesInventoryFilters; // renamed for clarity
     viewId?: number | null;
     viewName?: string | null;
     timestamp: number;
   }
   ```

2. **Single sessionStorage key** with read/write/clear utilities (extend existing `filtering.ts`)

3. **Existing flow preserved:** Catalogue → Order Creator continues to work unchanged

4. **New flow enabled:** Inventory WorkSurface → Order Creator
   - User applies filters on Inventory page, finds interesting batches
   - Clicks "Create Order from This View" (new action)
   - Writes portable cut with inventory filters translated to sales filter format
   - Order Creator reads and applies

### Phase 2: URL Parameter Deep Links (Medium effort)

1. **Extend inventory deep linking** to support full filter state:
   - Encode active filters as URL search params
   - Use same `getInitialFilters` pattern but extend to all filter fields

2. **Add URL deep link support to Sales Catalogue:**
   - `?clientId=X&categories=Flower,Concentrates&inStockOnly=true`

3. **Dashboard cards already link to inventory with params** — extend the pattern

### Phase 3: Cross-Surface Saved Views (Future, larger effort)

1. Unify saved view API so a view saved in Inventory can be loaded in Catalogue
2. Requires filter type translation layer
3. Not blocking for P2 tranches

---

## 5. Filter Type Translation

The two filter systems overlap but aren't identical. A translation layer is needed:

```typescript
function inventoryToSalesFilters(
  inv: InventoryWorkSurfaceFilters
): SalesInventoryFilters {
  return {
    search: "", // inventory uses separate search state
    categories: inv.category ? [inv.category] : [],
    brands: inv.brand,
    grades: inv.grade,
    priceMin: inv.cogsRange.min, // approximate: COGS ≠ retail price
    priceMax: inv.cogsRange.max,
    strainFamilies: [], // inventory doesn't filter by strain family
    vendors: inv.vendor,
    inStockOnly: inv.stockLevel === "in_stock",
  };
}

function salesToInventoryFilters(
  sales: SalesInventoryFilters
): Partial<InventoryWorkSurfaceFilters> {
  return {
    category: sales.categories.length === 1 ? sales.categories[0] : null,
    brand: sales.brands,
    grade: sales.grades,
    vendor: sales.vendors,
    stockLevel: sales.inStockOnly ? "in_stock" : "all",
    // Note: priceMin/priceMax don't map cleanly (retail vs COGS)
  };
}
```

**Key gap:** Inventory filters use COGS range, sales filters use retail price range. These are not directly translatable without knowing the margin/markup. The translation should preserve what it can and drop what it can't.

---

## 6. Simplest Path (Recommendation)

**For P2 Tranche 2, the simplest valuable implementation is:**

1. **Keep the existing `PortableSalesCut` mechanism** — it works, it's tested, it solves the Catalogue → Order flow
2. **Add an "Inventory → Order" portable cut writer** — new button on Inventory WorkSurface that writes a translated filter set to sessionStorage and navigates to order creator
3. **Extract filter utilities to a shared module** (`client/src/lib/filterTransport.ts`) so both surfaces import from one place
4. **Extend URL deep links** for inventory to cover more filter fields (vendor, brand, grade) — broadens existing pattern

This gives cross-surface filter portability without redesigning the filter architecture. The two filter systems remain separate but bridged by the portable cut pattern.

---

## 7. Files to Create/Modify

| File                                                          | Action     | Description                                                                 |
| ------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `client/src/lib/filterTransport.ts`                           | **Create** | Shared PortableFilterCut type, read/write/clear, translation functions      |
| `client/src/components/sales/filtering.ts`                    | **Modify** | Import shared types from filterTransport, deprecate local PortableSalesCut  |
| `client/src/components/work-surface/InventoryWorkSurface.tsx` | **Modify** | Add "Create Order from View" action button, write portable cut              |
| `client/src/hooks/useInventoryFilters.ts`                     | **Modify** | Extend URL param reading to cover vendor, brand, grade arrays               |
| `client/src/pages/OrderCreatorPage.tsx`                       | **Modify** | Read generalized PortableFilterCut (backward-compatible with existing flow) |
