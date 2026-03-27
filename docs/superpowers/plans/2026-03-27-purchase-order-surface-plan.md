# Purchase Order Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PurchaseOrdersWorkSurface (2909 lines), PurchaseOrdersSlicePage (1328 lines), and PurchaseOrdersPilotSurface (1223 lines) with one unified PurchaseOrderSurface that has queue mode with status lifecycle management, creation/edit mode with multi-source product browser + editable document grid + invoice-bottom, and a `defaultStatusFilter` prop for the receiving tab.

**Architecture:** Single component with two URL-driven modes: queue (default) and creation/edit (`?poView=create` or `?poId=X&poView=edit`). Queue mode shows a read-only PO grid with KPI cards, line items support grid, and state-machine-driven action buttons. Creation mode shows a split surface — left multi-source product browser (Supplier History | Low Stock | Catalog tabs), right editable PO document grid with invoice-bottom totals and terms. The receiving tab on InventoryWorkspacePage renders the same component with `defaultStatusFilter={["CONFIRMED","RECEIVING"]}`.

**Tech Stack:** React 19, AG Grid (via PowersheetGrid), tRPC, Tailwind 4, shadcn/ui, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-unified-sheet-native-inventory-po-design.md` — Phase 2

**Prerequisite:** Phase 1 (Inventory Management Surface) should be complete first.

---

## File Structure

### New Files

| File                                                                     | Responsibility                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `client/src/components/spreadsheet-native/PurchaseOrderSurface.tsx`      | Main surface — queue mode + creation/edit mode                                        |
| `client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx` | Unit tests                                                                            |
| `client/src/components/spreadsheet-native/ProductBrowserGrid.tsx`        | Multi-source product browser (Supplier History / Low Stock / Catalog tabs)            |
| `client/src/components/spreadsheet-native/ProductBrowserGrid.test.tsx`   | Unit tests                                                                            |
| `client/src/hooks/usePoDocument.ts`                                      | PO draft state management — line items, supplier, terms, notes, auto-save, validation |
| `client/src/hooks/usePoDocument.test.ts`                                 | Unit tests                                                                            |

### Modified Files

| File                                            | Change                                                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `client/src/pages/ProcurementWorkspacePage.tsx` | Remove SheetModeToggle, replace dual-surface with `<PurchaseOrderSurface />`                                                       |
| `client/src/pages/InventoryWorkspacePage.tsx`   | Replace `PurchaseOrdersSlicePage mode="receiving"` with `<PurchaseOrderSurface defaultStatusFilter={["CONFIRMED","RECEIVING"]} />` |

---

## Key Types Reference

### PO tRPC — getAll return shape

```typescript
{
  data: Array<{
    id: number;
    poNumber: string;
    supplierClientId: number | null;
    purchaseOrderStatus:
      | "DRAFT"
      | "SENT"
      | "CONFIRMED"
      | "RECEIVING"
      | "RECEIVED"
      | "CANCELLED";
    orderDate: Date;
    expectedDeliveryDate: Date | null;
    total: string;
    paymentTerms: string | null;
    notes: string | null;
    vendorNotes: string | null;
    createdAt: Date;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

### PO tRPC — getById return shape

```typescript
{
  id: number; poNumber: string; supplierClientId: number | null;
  purchaseOrderStatus: string; orderDate: Date; expectedDeliveryDate: Date | null;
  total: string; paymentTerms: string | null; notes: string | null; vendorNotes: string | null;
  items: Array<{
    id: number; productId: number; productName: string | null;
    category: string | null; subcategory: string | null;
    quantityOrdered: string; quantityReceived: string | null;
    cogsMode: "FIXED"|"RANGE"; unitCost: string;
    unitCostMin: string | null; unitCostMax: string | null;
    totalCost: string; notes: string | null;
  }>;
  supplier: { id: number; name: string; email: string | null; phone: string | null } | null;
}
```

### PO tRPC — create input

```typescript
{ supplierClientId: number; orderDate: string;
  expectedDeliveryDate?: string; paymentTerms?: string;
  notes?: string; vendorNotes?: string;
  items: Array<{
    productId?: number; productName?: string; category?: string; subcategory?: string;
    quantityOrdered: number; cogsMode: "FIXED"|"RANGE";
    unitCost?: number; unitCostMin?: number; unitCostMax?: number;
  }> }
```

### PO tRPC — mutations

```typescript
// updateStatus: { id: number; status: "DRAFT"|"SENT"|... }
// delete: { id: number }
// submit (DRAFT→SENT): { id: number } → { success: true, poNumber: string }
// confirm (SENT→CONFIRMED): { id: number; vendorConfirmationNumber?: string; confirmedDeliveryDate?: string }
// addItem: { purchaseOrderId: number; productId: number; quantityOrdered: number; cogsMode; unitCost?; unitCostMin?; unitCostMax?; notes? }
// updateItem: { id: number; quantityOrdered?; cogsMode?; unitCost?; unitCostMin?; unitCostMax?; notes? }
// deleteItem: { id: number }
```

### PO tRPC — getRecentProductsBySupplier return

```typescript
Array<{
  productId: number | null;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  cogsMode: "FIXED" | "RANGE";
  unitCost: string | null;
  unitCostMin: string | null;
  unitCostMax: string | null;
  poNumber: string;
  orderDate: Date;
}>;
```

### Status state machine

```typescript
const PO_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["RECEIVING", "CANCELLED"],
  RECEIVING: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};
```

### Receiving handoff (from lib/productIntakeDrafts.ts)

```typescript
createProductIntakeDraftFromPO(po, items, warehouseId, warehouseName) → ProductIntakeDraft
upsertProductIntakeDraft(draft, userId) → void (localStorage)
```

---

## Task 1: usePoDocument Hook

**Files:**

- Create: `client/src/hooks/usePoDocument.ts`
- Create: `client/src/hooks/usePoDocument.test.ts`

- [ ] **Step 1: Write the test file**

```tsx
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  createEmptyLineItem,
  validatePoDocument,
  buildCreatePayload,
  getLineTotal,
  getDocumentTotal,
  createDefaultPoDocument,
  type PoDocumentState,
} from "./usePoDocument";

describe("usePoDocument helpers", () => {
  it("createEmptyLineItem returns valid defaults", () => {
    const item = createEmptyLineItem();
    expect(item.tempId).toBeTruthy();
    expect(item.quantityOrdered).toBe(1);
    expect(item.cogsMode).toBe("FIXED");
    expect(item.unitCost).toBe(0);
  });

  it("validatePoDocument catches missing supplier", () => {
    const state = { ...createDefaultPoDocument(), supplierId: null };
    const errors = validatePoDocument(state);
    expect(errors).toContain("Supplier is required");
  });

  it("validatePoDocument catches empty line items", () => {
    const state = {
      ...createDefaultPoDocument(),
      supplierId: 1,
      lineItems: [],
    };
    const errors = validatePoDocument(state);
    expect(errors).toContain("At least one line item is required");
  });

  it("validatePoDocument catches zero qty", () => {
    const item = createEmptyLineItem();
    item.quantityOrdered = 0;
    const state = {
      ...createDefaultPoDocument(),
      supplierId: 1,
      lineItems: [item],
    };
    const errors = validatePoDocument(state);
    expect(errors.some(e => e.includes("quantity"))).toBe(true);
  });

  it("validatePoDocument passes for valid state", () => {
    const item = createEmptyLineItem();
    item.productId = 1;
    item.productName = "Wedding Cake";
    item.quantityOrdered = 100;
    item.unitCost = 2.4;
    const state: PoDocumentState = {
      ...createDefaultPoDocument(),
      supplierId: 1,
      lineItems: [item],
      paymentTerms: "NET_30",
    };
    expect(validatePoDocument(state)).toEqual([]);
  });

  it("buildCreatePayload maps state to tRPC input", () => {
    const item = createEmptyLineItem();
    item.productId = 1;
    item.quantityOrdered = 100;
    item.unitCost = 2.4;
    const state: PoDocumentState = {
      ...createDefaultPoDocument(),
      supplierId: 42,
      lineItems: [item],
      expectedDeliveryDate: "2026-04-03",
      paymentTerms: "NET_30",
      internalNotes: "Test",
      supplierNotes: "Vendor notes",
    };
    const payload = buildCreatePayload(state);
    expect(payload.supplierClientId).toBe(42);
    expect(payload.notes).toBe("Test");
    expect(payload.vendorNotes).toBe("Vendor notes");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].quantityOrdered).toBe(100);
  });

  it("getLineTotal calculates FIXED correctly", () => {
    const item = createEmptyLineItem();
    item.quantityOrdered = 100;
    item.unitCost = 2.5;
    expect(getLineTotal(item)).toBe(250);
  });

  it("getLineTotal calculates RANGE as avg", () => {
    const item = createEmptyLineItem();
    item.cogsMode = "RANGE";
    item.quantityOrdered = 100;
    item.unitCostMin = 2;
    item.unitCostMax = 3;
    expect(getLineTotal(item)).toBe(250);
  });

  it("getDocumentTotal sums all lines", () => {
    const a = createEmptyLineItem();
    a.quantityOrdered = 10;
    a.unitCost = 5;
    const b = createEmptyLineItem();
    b.quantityOrdered = 20;
    b.unitCost = 3;
    expect(getDocumentTotal([a, b])).toBe(110);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/hooks/usePoDocument.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement usePoDocument**

```typescript
// client/src/hooks/usePoDocument.ts

export interface PoLineItem {
  tempId: string;
  productId: number | null;
  productName: string;
  category: string;
  subcategory: string;
  quantityOrdered: number;
  cogsMode: "FIXED" | "RANGE";
  unitCost: number;
  unitCostMin: number;
  unitCostMax: number;
  notes: string;
}

export interface PoDocumentState {
  supplierId: number | null;
  lineItems: PoLineItem[];
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  internalNotes: string;
  supplierNotes: string;
  draftId: number | null;
}

export function createEmptyLineItem(): PoLineItem {
  return {
    tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: null,
    productName: "",
    category: "Flower",
    subcategory: "",
    quantityOrdered: 1,
    cogsMode: "FIXED",
    unitCost: 0,
    unitCostMin: 0,
    unitCostMax: 0,
    notes: "",
  };
}

export function createLineItemFromProduct(product: {
  productId: number | null;
  productName: string | null;
  category: string | null;
  subcategory: string | null;
  cogsMode: "FIXED" | "RANGE";
  unitCost: string | null;
  unitCostMin: string | null;
  unitCostMax: string | null;
}): PoLineItem {
  const toNum = (v: string | null) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: product.productId,
    productName: product.productName ?? "",
    category: product.category ?? "Flower",
    subcategory: product.subcategory ?? "",
    quantityOrdered: 1,
    cogsMode: product.cogsMode ?? "FIXED",
    unitCost: toNum(product.unitCost),
    unitCostMin: toNum(product.unitCostMin),
    unitCostMax: toNum(product.unitCostMax),
    notes: "",
  };
}

export function validatePoDocument(state: PoDocumentState): string[] {
  const errors: string[] = [];
  if (!state.supplierId) errors.push("Supplier is required");
  if (state.lineItems.length === 0)
    errors.push("At least one line item is required");
  for (const item of state.lineItems) {
    if (item.quantityOrdered <= 0)
      errors.push(
        `Line "${item.productName || "unnamed"}": quantity must be > 0`
      );
    if (item.cogsMode === "FIXED" && item.unitCost < 0)
      errors.push(`Line "${item.productName}": unit cost must be >= 0`);
    if (item.cogsMode === "RANGE") {
      if (item.unitCostMin < 0)
        errors.push(`Line "${item.productName}": min cost must be >= 0`);
      if (item.unitCostMax < item.unitCostMin)
        errors.push(`Line "${item.productName}": max cost must be >= min`);
    }
  }
  return errors;
}

export function buildCreatePayload(state: PoDocumentState) {
  return {
    supplierClientId: state.supplierId!,
    orderDate: state.orderDate,
    expectedDeliveryDate: state.expectedDeliveryDate || undefined,
    paymentTerms: state.paymentTerms || undefined,
    notes: state.internalNotes || undefined,
    vendorNotes: state.supplierNotes || undefined,
    items: state.lineItems.map(item => ({
      productId: item.productId ?? undefined,
      productName: item.productName || undefined,
      category: item.category || undefined,
      subcategory: item.subcategory || undefined,
      quantityOrdered: item.quantityOrdered,
      cogsMode: item.cogsMode,
      unitCost: item.cogsMode === "FIXED" ? item.unitCost : undefined,
      unitCostMin: item.cogsMode === "RANGE" ? item.unitCostMin : undefined,
      unitCostMax: item.cogsMode === "RANGE" ? item.unitCostMax : undefined,
    })),
  };
}

export function getLineTotal(item: PoLineItem): number {
  if (item.cogsMode === "RANGE")
    return item.quantityOrdered * ((item.unitCostMin + item.unitCostMax) / 2);
  return item.quantityOrdered * item.unitCost;
}

export function getDocumentTotal(items: PoLineItem[]): number {
  return items.reduce((sum, item) => sum + getLineTotal(item), 0);
}

export function createDefaultPoDocument(): PoDocumentState {
  return {
    supplierId: null,
    lineItems: [createEmptyLineItem()],
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    paymentTerms: "",
    internalNotes: "",
    supplierNotes: "",
    draftId: null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run client/src/hooks/usePoDocument.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/usePoDocument.ts client/src/hooks/usePoDocument.test.ts
git commit -m "feat(po): add usePoDocument state helpers and validation"
```

---

## Task 2: ProductBrowserGrid Component

**Files:**

- Create: `client/src/components/spreadsheet-native/ProductBrowserGrid.tsx`
- Create: `client/src/components/spreadsheet-native/ProductBrowserGrid.test.tsx`

- [ ] **Step 1: Write test file**

```tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    purchaseOrders: {
      getRecentProductsBySupplier: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
      products: { useQuery: () => ({ data: [], isLoading: false }) },
      getBySupplier: { useQuery: () => ({ data: [], isLoading: false }) },
    },
    inventory: {
      getEnhanced: {
        useQuery: () => ({ data: { items: [] }, isLoading: false }),
      },
    },
  },
}));

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid="browser-grid">{title}</div>
  ),
}));

describe("ProductBrowserGrid", () => {
  it("renders tab toggle with Supplier History active", async () => {
    const { ProductBrowserGrid } = await import("./ProductBrowserGrid");
    render(
      <ProductBrowserGrid
        supplierId={1}
        addedProductIds={new Set()}
        onAddProduct={vi.fn()}
      />
    );
    expect(screen.getByText("Supplier History")).toBeInTheDocument();
    expect(screen.getByText("Low Stock")).toBeInTheDocument();
    expect(screen.getByText("Catalog")).toBeInTheDocument();
  });

  it("renders search input", async () => {
    const { ProductBrowserGrid } = await import("./ProductBrowserGrid");
    render(
      <ProductBrowserGrid
        supplierId={1}
        addedProductIds={new Set()}
        onAddProduct={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("shows empty state when no supplier selected", async () => {
    const { ProductBrowserGrid } = await import("./ProductBrowserGrid");
    render(
      <ProductBrowserGrid
        supplierId={null}
        addedProductIds={new Set()}
        onAddProduct={vi.fn()}
      />
    );
    expect(screen.getByTestId("browser-grid")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/ProductBrowserGrid.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ProductBrowserGrid**

The component has three tabs, each querying a different tRPC endpoint:

- **Supplier History**: `purchaseOrders.getRecentProductsBySupplier({ supplierClientId, limit: 12 })` — shows Product, Category, Last Cost, Last PO, + Add button
- **Low Stock**: `inventory.getEnhanced({ stockLevel: "low_stock", sortBy: "available", sortOrder: "asc", pageSize: 50 })` — shows Product, Category, On Hand, Available, Stock Status, + Add
- **Full Catalog**: `purchaseOrders.products({ search, limit: 100 })` — shows Product, Category, Subcategory, + Add

Props:

```typescript
interface ProductBrowserGridProps {
  supplierId: number | null;
  addedProductIds: Set<number>; // Products already in the PO document
  onAddProduct: (product: {
    productId: number | null;
    productName: string | null;
    category: string | null;
    subcategory: string | null;
    cogsMode: "FIXED" | "RANGE";
    unitCost: string | null;
    unitCostMin: string | null;
    unitCostMax: string | null;
  }) => void;
}
```

Each tab maps its data to a unified `BrowserRow` type for the shared PowersheetGrid. The "+ Add" column uses a custom cell renderer that calls `onAddProduct` with the row's product fields. Rows where `addedProductIds.has(productId)` show an "Added" badge instead.

Follow the exact pattern from the spec mockup and from `PurchaseOrdersWorkSurface.tsx`'s supplier history section (the `appendQuickAddItem` pattern at line ~800).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/ProductBrowserGrid.test.tsx`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/spreadsheet-native/ProductBrowserGrid.tsx client/src/components/spreadsheet-native/ProductBrowserGrid.test.tsx
git commit -m "feat(po): add ProductBrowserGrid with 3-tab product browser"
```

---

## Task 3: PurchaseOrderSurface — Queue Mode

**Files:**

- Create: `client/src/components/spreadsheet-native/PurchaseOrderSurface.tsx`
- Create: `client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx`

- [ ] **Step 1: Write test file**

```tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("wouter", () => ({
  useLocation: () => ["/procurement?tab=purchase-orders", vi.fn()],
  useSearch: () => "",
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    purchaseOrders: {
      getAll: {
        useQuery: () => ({
          data: { data: [], total: 0 },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      getById: {
        useQuery: () => ({ data: null, isLoading: false, refetch: vi.fn() }),
      },
      updateStatus: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      submit: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      confirm: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      products: { useQuery: () => ({ data: [], isLoading: false }) },
      getRecentProductsBySupplier: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
      getBySupplier: { useQuery: () => ({ data: [], isLoading: false }) },
    },
    clients: {
      list: { useQuery: () => ({ data: { items: [] }, isLoading: false }) },
    },
    inventory: {
      getEnhanced: {
        useQuery: () => ({ data: { items: [] }, isLoading: false }),
      },
    },
  },
}));

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid="powersheet-grid">{title}</div>
  ),
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  useSpreadsheetSelectionParam: () => ({
    selectedId: null,
    setSelectedId: vi.fn(),
  }),
}));

describe("PurchaseOrderSurface — queue mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders queue toolbar", async () => {
    const { PurchaseOrderSurface } = await import("./PurchaseOrderSurface");
    render(<PurchaseOrderSurface />);
    expect(screen.getByText("Purchase Orders")).toBeInTheDocument();
  });

  it("renders + New PO button", async () => {
    const { PurchaseOrderSurface } = await import("./PurchaseOrderSurface");
    render(<PurchaseOrderSurface />);
    expect(screen.getByText(/new po/i)).toBeInTheDocument();
  });

  it("renders search input", async () => {
    const { PurchaseOrderSurface } = await import("./PurchaseOrderSurface");
    render(<PurchaseOrderSurface />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement PurchaseOrderSurface queue mode**

The component checks `useSearch()` for `?poView=create` or `?poView=edit` to determine mode. Queue mode (default) renders:

1. **Toolbar**: "Purchase Orders" title, status count badges (computed from queue data), "+ New PO" button (sets URL to `?poView=create`), Export CSV
2. **Action Bar**: Search input, Status dropdown (All + 6 statuses), `defaultStatusFilter` applied on mount if provided
3. **PO Queue PowersheetGrid**: Read-only. Columns: PO Number, Supplier (resolved from `clients.list` seller query), Status badge, Order Date, Est Delivery, Total (currency), Payment Terms, Line Count. Data: `purchaseOrders.getAll`
4. **Selected PO KPI Cards** (4-up on select): Supplier, Status + age, Total + lines, Actions (state-machine buttons from `PO_ALLOWED_TRANSITIONS`)
5. **Line Items Support Grid**: Read-only. Selected PO's items from `purchaseOrders.getById`. Columns: Product, Category, Ordered, Received, COGS Mode, Unit Cost (formatted), Line Total
6. **Status Bar**: PO count, selected PO context, keyboard hints

**Key mutations wired:**

- `purchaseOrders.updateStatus` for generic transitions
- `purchaseOrders.submit` for DRAFT→SENT
- `purchaseOrders.confirm` for SENT→CONFIRMED
- `purchaseOrders.delete` for draft deletion
- Receiving handoff: `createProductIntakeDraftFromPO()` → navigate to receiving page

Follow the patterns from `PurchaseOrdersPilotSurface.tsx` (already fully audited) for: row mapping, supplier resolution, status colors, toast dedup, confirm dialogs, receiving confirm dialog (BUG-025).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/spreadsheet-native/PurchaseOrderSurface.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx
git commit -m "feat(po): add PurchaseOrderSurface queue mode

PO queue grid, KPI cards with state-machine actions, line items
support grid. Supports defaultStatusFilter for receiving tab."
```

---

## Task 4: PurchaseOrderSurface — Creation/Edit Mode

**Files:**

- Modify: `client/src/components/spreadsheet-native/PurchaseOrderSurface.tsx`

- [ ] **Step 1: Add creation mode rendering**

When `searchParams.get("poView") === "create"` or `"edit"`, render the creation layout instead of queue. Key elements:

**Toolbar**: "← Back to Queue" (`setLocation` to remove poView param), title ("New Purchase Order" or "Edit PO-XXXX"), `SupplierCombobox` (from `ui/supplier-combobox`), autosave badge, Save Draft button, Submit PO button

**Split layout** (`flex` with `gap-1.5`):

- Left (`flex: 2`): `<ProductBrowserGrid supplierId={doc.supplierId} addedProductIds={addedIds} onAddProduct={handleAddProduct} />`
- Right (`flex: 3`): Editable PowersheetGrid for PO line items

**Right grid columns:**

- Locked: `#` (row index), Product (name), Category, Line Total (calculated)
- Editable: Qty (number), COGS Mode (FIXED/RANGE dropdown), Unit Cost (number for FIXED; two fields for RANGE need special handling), Notes

**Invoice bottom** (inside right grid card, below rows):

- Right-aligned totals: Subtotal (N lines), **Total** (bold)
- 4-column terms: Order Date (date input), Expected Delivery (date input), Payment Terms (Select with CONSIGNMENT/COD/NET_7/NET_15/NET_30/PARTIAL), Notes (Internal/Supplier toggle buttons → textarea)

**State**: Use `createDefaultPoDocument()` for new PO, load from `getById` for edit. `buildCreatePayload()` for submit. `validatePoDocument()` before submit — show toast with errors.

**handleAddProduct**: Calls `createLineItemFromProduct()` → appends to `doc.lineItems`. Computes `addedProductIds` as `new Set(doc.lineItems.filter(l => l.productId).map(l => l.productId!))`.

**Edit mode** (`?poView=edit&poId=X`): Load PO via `purchaseOrders.getById`, map items to `PoLineItem[]`, populate state. Use `purchaseOrders.update` for header changes, `purchaseOrders.updateItem`/`addItem`/`deleteItem` for line changes.

- [ ] **Step 2: Add creation mode tests**

```tsx
describe("PurchaseOrderSurface — creation mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders creation toolbar when poView=create", async () => {
    // Override useSearch mock to return creation params
    const wouter = await import("wouter");
    vi.spyOn(wouter, "useSearch").mockReturnValue("poView=create");

    const { PurchaseOrderSurface } = await import("./PurchaseOrderSurface");
    render(<PurchaseOrderSurface />);
    expect(screen.getByText(/new purchase order/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx`
Expected: All tests PASS

- [ ] **Step 4: Run type check and lint**

Run: `pnpm check && pnpm lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add client/src/components/spreadsheet-native/PurchaseOrderSurface.tsx client/src/components/spreadsheet-native/PurchaseOrderSurface.test.tsx
git commit -m "feat(po): add creation/edit mode with split surface

Left: ProductBrowserGrid (Supplier History / Low Stock / Catalog).
Right: Editable PO document grid with COGS modes + invoice bottom.
Uses usePoDocument for state, validation, and payload building."
```

---

## Task 5: Update Workspace Routing

**Files:**

- Modify: `client/src/pages/ProcurementWorkspacePage.tsx`
- Modify: `client/src/pages/InventoryWorkspacePage.tsx`

- [ ] **Step 1: Update ProcurementWorkspacePage**

1. Add import: `import { PurchaseOrderSurface } from "@/components/spreadsheet-native/PurchaseOrderSurface";`
2. Remove lazy import for `PurchaseOrdersPilotSurface`
3. Remove import for `PurchaseOrdersSlicePage`
4. Remove `SheetModeToggle`, `PilotSurfaceBoundary` imports and all surface-mode hooks
5. Remove `commandStrip` prop entirely
6. Replace panel:

```tsx
<LinearWorkspacePanel value="purchase-orders">
  <PurchaseOrderSurface />
</LinearWorkspacePanel>
```

- [ ] **Step 2: Update InventoryWorkspacePage receiving panel**

Replace:

```tsx
<PurchaseOrdersSlicePage mode="receiving" />
```

With:

```tsx
<PurchaseOrderSurface defaultStatusFilter={["CONFIRMED", "RECEIVING"]} />
```

Add import for `PurchaseOrderSurface`. Remove `PurchaseOrdersSlicePage` import if no longer used anywhere.

- [ ] **Step 3: Run full check suite**

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ProcurementWorkspacePage.tsx client/src/pages/InventoryWorkspacePage.tsx
git commit -m "feat(po): wire PurchaseOrderSurface, kill SheetModeToggle

Procurement workspace: unified PurchaseOrderSurface, no toggle.
Inventory receiving tab: PurchaseOrderSurface with defaultStatusFilter."
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run full check suite**

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

Expected: Zero errors.

- [ ] **Step 2: Run all spreadsheet-native tests**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/`
Expected: All pass.

- [ ] **Step 3: Manual smoke check**

1. Procurement → purchase-orders: no toggle, queue loads, actions work
2. Click "+ New PO": creation mode with split surface
3. Select supplier: Supplier History tab populates
4. Add products to PO: right grid populates, totals update
5. Fill terms, submit: PO created, back to queue
6. Inventory → receiving tab: filtered to CONFIRMED/RECEIVING only
7. "Start Receiving" on a PO: confirm dialog → navigates to receiving page
8. All other tabs unaffected

- [ ] **Step 4: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix(po): address smoke test findings"
```

---

## Summary

| Task | Files                             | What it produces                              |
| ---- | --------------------------------- | --------------------------------------------- |
| 1    | usePoDocument.ts + test           | PO state helpers, validation, payload builder |
| 2    | ProductBrowserGrid.tsx + test     | 3-tab product browser                         |
| 3    | PurchaseOrderSurface.tsx + test   | Queue mode with lifecycle actions             |
| 4    | PurchaseOrderSurface.tsx (modify) | Creation/edit mode with split surface         |
| 5    | Workspace pages (modify)          | Wire surfaces, kill toggles                   |
| 6    | (verification)                    | Full check/lint/test/build                    |
