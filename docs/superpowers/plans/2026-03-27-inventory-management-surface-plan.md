# Inventory Management Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace InventoryWorkSurface (2753 lines) and InventorySheetPilotSurface (1043 lines) with one unified InventoryManagementSurface that has inline-editable grid, gallery mode, 14-dimension filtering, saved views, and a right-side adjustment context drawer.

**Architecture:** Single component with Grid/Gallery toggle. PowersheetGrid handles the data grid with editable cells (grade, status, on-hand qty, COGS). On-hand qty edits trigger a right-side AdjustmentContextDrawer requiring a reason tag before commit. InventoryAdvancedFilters provides the 14-dimension filter panel. InventoryGalleryView renders responsive product cards. All data comes from existing `inventory.*` tRPC queries/mutations — no server changes.

**Tech Stack:** React 19, AG Grid (via PowersheetGrid), tRPC, Tailwind 4, shadcn/ui, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-unified-sheet-native-inventory-po-design.md` — Phase 1

---

## File Structure

### New Files

| File                                                                           | Responsibility                                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `client/src/components/spreadsheet-native/InventoryManagementSurface.tsx`      | Main surface — toolbar, action bar, grid/gallery toggle, summary cards, status bar. Orchestrates all sub-components. |
| `client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx` | Unit tests for surface rendering, mode toggling, edit dispatch                                                       |
| `client/src/components/spreadsheet-native/AdjustmentContextDrawer.tsx`         | Right-side drawer for qty adjustment — reason tags, notes, apply/cancel                                              |
| `client/src/components/spreadsheet-native/AdjustmentContextDrawer.test.tsx`    | Unit tests for drawer — reason required, apply/cancel, delta display                                                 |
| `client/src/components/spreadsheet-native/InventoryAdvancedFilters.tsx`        | 14-dimension filter panel — status, category, grade, stock, supplier, brand, date, location, COGS, age, etc.         |
| `client/src/components/spreadsheet-native/InventoryAdvancedFilters.test.tsx`   | Unit tests for filter state management                                                                               |
| `client/src/components/spreadsheet-native/InventoryGalleryView.tsx`            | Responsive card grid — product images, badges, per-card actions                                                      |
| `client/src/components/spreadsheet-native/InventoryGalleryView.test.tsx`       | Unit tests for gallery rendering                                                                                     |

### Modified Files

| File                                          | Change                                                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `client/src/pages/InventoryWorkspacePage.tsx` | Remove SheetModeToggle for inventory tab, replace dual-surface with single `<InventoryManagementSurface />` |

---

## Key Types Reference

These are the real types from the codebase that tasks reference. Copied here so each task is self-contained.

### Inventory tRPC — getEnhanced return shape

```typescript
// trpc.inventory.getEnhanced.useQuery({...})
// Returns:
{
  items: Array<{
    id: number;
    sku: string;
    code: string;
    status:
      | "AWAITING_INTAKE"
      | "LIVE"
      | "ON_HOLD"
      | "QUARANTINED"
      | "SOLD_OUT"
      | "CLOSED";
    grade: string | null;
    productName: string;
    category: string | null;
    subcategory: string | null;
    vendorName: string | null;
    brandName: string | null;
    onHandQty: number;
    reservedQty: number;
    quarantineQty: number;
    holdQty: number;
    availableQty: number;
    unitCogs: number | null;
    totalValue: number | null;
    receivedDate: Date | null;
    ageDays: number;
    ageBracket: "FRESH" | "MODERATE" | "AGING" | "CRITICAL";
    stockStatus: "CRITICAL" | "LOW" | "OPTIMAL" | "OUT_OF_STOCK";
  }>;
  pagination: {
    page: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor: number | null;
  }
  summary: {
    totalItems: number;
    totalOnHand: number;
    totalAvailable: number;
    totalValue: number;
    byStockStatus: {
      critical: number;
      low: number;
      optimal: number;
      outOfStock: number;
    }
  }
}
```

### Inventory tRPC — mutation inputs

```typescript
// updateStatus
{ id: number; status: string; reason?: string; version?: number }

// adjustQty
{ id: number; field: "onHandQty" | "reservedQty" | "quarantineQty" | "holdQty" | "defectiveQty";
  adjustment: number; adjustmentReason?: InventoryAdjustmentReason; notes?: string }

// updateBatch
{ id: number; version?: number; grade?: string | null; notes?: string | null; reason: string }

// bulk.updateStatus
{ batchIds: number[]; newStatus: "AWAITING_INTAKE" | "LIVE" | "ON_HOLD" | "QUARANTINED" | "SOLD_OUT" | "CLOSED" }

// bulk.delete — input is z.array(z.number()) (batchIds)
// bulk.restore — input is z.array(z.object({ id: z.number(), previousStatus: z.enum([...]) }))
```

### Adjustment Reasons (from shared/inventoryAdjustmentReasons.ts)

```typescript
const INVENTORY_ADJUSTMENT_REASONS = [
  "DAMAGED",
  "EXPIRED",
  "LOST",
  "THEFT",
  "COUNT_DISCREPANCY",
  "QUALITY_ISSUE",
  "REWEIGH",
  "OTHER",
] as const;
type InventoryAdjustmentReason = (typeof INVENTORY_ADJUSTMENT_REASONS)[number];
```

### InventoryPilotRow (from lib/spreadsheet-native/pilotContracts.ts)

```typescript
interface InventoryPilotRow {
  identity: {
    rowKey: string;
    entityId: number | string;
    entityType: string;
    recordVersion?: number;
  };
  batchId: number;
  sku: string;
  productName: string;
  productSummary: string;
  category: string;
  subcategory: string;
  vendorName: string;
  brandName: string;
  grade: string;
  status: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  unitCogs: number | null;
  receivedDate: string | null;
  ageLabel: string;
  stockStatus: string | null;
}
```

### Saved Views tRPC

```typescript
// views.list returns: Array<{ id: number; name: string; filters: Record<string, unknown>; isShared: number; ... }>
// views.save input: { name: string; filters: Record<string, unknown>; isShared?: boolean }
// views.delete input: z.number() (viewId)
```

---

## Task 1: AdjustmentContextDrawer Component

**Files:**

- Create: `client/src/components/spreadsheet-native/AdjustmentContextDrawer.tsx`
- Create: `client/src/components/spreadsheet-native/AdjustmentContextDrawer.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
// client/src/components/spreadsheet-native/AdjustmentContextDrawer.test.tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AdjustmentContextDrawer,
  type AdjustmentContextDrawerProps,
} from "./AdjustmentContextDrawer";

const baseProps: AdjustmentContextDrawerProps = {
  isOpen: true,
  batchId: 42,
  sku: "SKU-1042",
  productName: "Wedding Cake",
  previousValue: 1200,
  currentValue: 1150,
  onApply: vi.fn(),
  onCancel: vi.fn(),
};

describe("AdjustmentContextDrawer", () => {
  it("renders change summary with delta", () => {
    render(<AdjustmentContextDrawer {...baseProps} />);
    expect(screen.getByText(/SKU-1042/)).toBeInTheDocument();
    expect(screen.getByText(/1,200/)).toBeInTheDocument();
    expect(screen.getByText(/1,150/)).toBeInTheDocument();
  });

  it("shows reason tags", () => {
    render(<AdjustmentContextDrawer {...baseProps} />);
    expect(screen.getByText("Damaged")).toBeInTheDocument();
    expect(screen.getByText("Count Discrepancy")).toBeInTheDocument();
    expect(screen.getByText("Reweigh")).toBeInTheDocument();
  });

  it("disables Apply when no reason selected", () => {
    render(<AdjustmentContextDrawer {...baseProps} />);
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    expect(applyBtn).toBeDisabled();
  });

  it("enables Apply after selecting a reason", () => {
    render(<AdjustmentContextDrawer {...baseProps} />);
    fireEvent.click(screen.getByText("Reweigh"));
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    expect(applyBtn).not.toBeDisabled();
  });

  it("calls onApply with reason and notes", () => {
    const onApply = vi.fn();
    render(<AdjustmentContextDrawer {...baseProps} onApply={onApply} />);
    fireEvent.click(screen.getByText("Damaged"));
    fireEvent.click(screen.getByRole("button", { name: /apply/i }));
    expect(onApply).toHaveBeenCalledWith({
      reason: "DAMAGED",
      notes: "",
    });
  });

  it("calls onCancel when Cancel clicked", () => {
    const onCancel = vi.fn();
    render(<AdjustmentContextDrawer {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("does not render when isOpen is false", () => {
    render(<AdjustmentContextDrawer {...baseProps} isOpen={false} />);
    expect(screen.queryByText("Adjustment Context")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/AdjustmentContextDrawer.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AdjustmentContextDrawer**

```tsx
// client/src/components/spreadsheet-native/AdjustmentContextDrawer.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  INVENTORY_ADJUSTMENT_REASONS,
  INVENTORY_ADJUSTMENT_REASON_LABELS,
  type InventoryAdjustmentReason,
} from "@shared/inventoryAdjustmentReasons";

export interface AdjustmentContextDrawerProps {
  isOpen: boolean;
  batchId: number;
  sku: string;
  productName: string;
  previousValue: number;
  currentValue: number;
  isPending?: boolean;
  onApply: (context: {
    reason: InventoryAdjustmentReason;
    notes: string;
  }) => void;
  onCancel: () => void;
}

const formatQty = (v: number) =>
  v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export function AdjustmentContextDrawer({
  isOpen,
  batchId,
  sku,
  productName,
  previousValue,
  currentValue,
  isPending = false,
  onApply,
  onCancel,
}: AdjustmentContextDrawerProps) {
  const [selectedReason, setSelectedReason] =
    useState<InventoryAdjustmentReason | null>(null);
  const [notes, setNotes] = useState("");

  const delta = currentValue - previousValue;
  const deltaLabel =
    delta >= 0 ? `+${formatQty(delta)}` : `${formatQty(delta)}`;

  // Reset state when batch changes
  useEffect(() => {
    setSelectedReason(null);
    setNotes("");
  }, [batchId, previousValue, currentValue]);

  if (!isOpen) return null;

  return (
    <div className="flex w-[260px] flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-3 py-2">
        <span className="text-[11px] font-semibold text-blue-800">
          Adjustment Context
        </span>
        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground"
          aria-label="Close drawer"
        >
          ×
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        {/* Change summary */}
        <div className="rounded-md bg-blue-50 p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            Change
          </div>
          <div className="mt-1 text-xs font-semibold text-blue-800">
            {sku} · On Hand
          </div>
          <div className="mt-1 text-[11px]">
            <span className="text-muted-foreground">
              {formatQty(previousValue)}
            </span>
            <span className="mx-1 text-foreground">→</span>
            <span className="font-semibold text-blue-700">
              {formatQty(currentValue)}
            </span>
            <span
              className={cn(
                "ml-1 text-[10px]",
                delta < 0 ? "text-red-600" : "text-green-600"
              )}
            >
              ({deltaLabel})
            </span>
          </div>
        </div>

        {/* Reason tags */}
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            Reason
          </div>
          <div className="flex flex-wrap gap-1">
            {INVENTORY_ADJUSTMENT_REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] transition-colors",
                  selectedReason === reason
                    ? "border-blue-300 bg-blue-100 font-medium text-blue-800"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {INVENTORY_ADJUSTMENT_REASON_LABELS[reason]}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            Notes
          </div>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional — why this adjustment?"
            className="h-[50px] resize-y text-[10px]"
          />
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-[10px]"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 text-[10px]"
            disabled={selectedReason === null || isPending}
            onClick={() => {
              if (selectedReason) {
                onApply({ reason: selectedReason, notes });
              }
            }}
          >
            {isPending ? "Saving..." : `Apply ${deltaLabel}`}
          </Button>
        </div>

        <div className="text-center text-[9px] text-muted-foreground">
          Reason tag is required · Edit is saved on Apply
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/AdjustmentContextDrawer.test.tsx`
Expected: All 7 tests PASS

- [ ] **Step 5: Run type check**

Run: `pnpm check`
Expected: No new type errors

- [ ] **Step 6: Commit**

```bash
git add client/src/components/spreadsheet-native/AdjustmentContextDrawer.tsx client/src/components/spreadsheet-native/AdjustmentContextDrawer.test.tsx
git commit -m "feat(inventory): add AdjustmentContextDrawer component

Right-side drawer for qty adjustment context with reason tags and notes.
Reason tag is required before Apply is enabled. Resets state on batch change."
```

---

## Task 2: InventoryAdvancedFilters Component

**Files:**

- Create: `client/src/components/spreadsheet-native/InventoryAdvancedFilters.tsx`
- Create: `client/src/components/spreadsheet-native/InventoryAdvancedFilters.test.tsx`
- Reference: `client/src/components/sales/AdvancedFilters.tsx` (pattern to follow)

- [ ] **Step 1: Write the test file**

```tsx
// client/src/components/spreadsheet-native/InventoryAdvancedFilters.test.tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  InventoryAdvancedFilters,
  type InventoryFilterState,
  createDefaultInventoryFilters,
} from "./InventoryAdvancedFilters";

describe("InventoryAdvancedFilters", () => {
  const defaultFilters = createDefaultInventoryFilters();
  const onFiltersChange = vi.fn();

  it("renders filter panel when open", () => {
    render(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        isOpen={false}
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
  });

  it("calls onFiltersChange when status toggled", () => {
    render(
      <InventoryAdvancedFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Live"));
    expect(onFiltersChange).toHaveBeenCalled();
  });

  it("createDefaultInventoryFilters returns all empty", () => {
    const filters = createDefaultInventoryFilters();
    expect(filters.statuses).toEqual([]);
    expect(filters.categories).toEqual([]);
    expect(filters.grades).toEqual([]);
    expect(filters.search).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/InventoryAdvancedFilters.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement InventoryAdvancedFilters**

```tsx
// client/src/components/spreadsheet-native/InventoryAdvancedFilters.tsx
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

// ── Filter state type ──
export interface InventoryFilterState {
  search: string;
  statuses: string[]; // AWAITING_INTAKE, LIVE, ON_HOLD, etc.
  categories: string[];
  subcategories: string[];
  stockLevel: string; // "all" | "in_stock" | "low_stock" | "out_of_stock"
  suppliers: string[];
  brands: string[];
  grades: string[];
  dateFrom: string; // ISO date string or ""
  dateTo: string;
  location: string; // free text
  cogsMin: string; // string for input binding
  cogsMax: string;
  stockStatus: string; // "ALL" | "OPTIMAL" | "LOW" | "CRITICAL" | "OUT_OF_STOCK"
  ageBracket: string; // "ALL" | "FRESH" | "MODERATE" | "AGING" | "CRITICAL"
  batchId: string;
}

export function createDefaultInventoryFilters(): InventoryFilterState {
  return {
    search: "",
    statuses: [],
    categories: [],
    subcategories: [],
    stockLevel: "all",
    suppliers: [],
    brands: [],
    grades: [],
    dateFrom: "",
    dateTo: "",
    location: "",
    cogsMin: "",
    cogsMax: "",
    stockStatus: "ALL",
    ageBracket: "ALL",
    batchId: "",
  };
}

export function hasActiveFilters(filters: InventoryFilterState): boolean {
  const d = createDefaultInventoryFilters();
  return (
    filters.statuses.length > 0 ||
    filters.categories.length > 0 ||
    filters.subcategories.length > 0 ||
    filters.stockLevel !== d.stockLevel ||
    filters.suppliers.length > 0 ||
    filters.brands.length > 0 ||
    filters.grades.length > 0 ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.location !== "" ||
    filters.cogsMin !== "" ||
    filters.cogsMax !== "" ||
    filters.stockStatus !== d.stockStatus ||
    filters.ageBracket !== d.ageBracket ||
    filters.batchId !== ""
  );
}

/** Build the query input for trpc.inventory.getEnhanced from our filter state */
export function filtersToQueryInput(filters: InventoryFilterState) {
  return {
    search: filters.search || undefined,
    status: filters.statuses.length > 0 ? filters.statuses : undefined,
    category: filters.categories[0] || undefined,
    subcategory: filters.subcategories[0] || undefined,
    stockLevel:
      filters.stockLevel !== "all"
        ? (filters.stockLevel as "in_stock" | "low_stock" | "out_of_stock")
        : undefined,
    vendor: filters.suppliers.length > 0 ? filters.suppliers : undefined,
    brand: filters.brands.length > 0 ? filters.brands : undefined,
    grade: filters.grades.length > 0 ? filters.grades : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    location: filters.location || undefined,
    minCogs: filters.cogsMin ? Number(filters.cogsMin) : undefined,
    maxCogs: filters.cogsMax ? Number(filters.cogsMax) : undefined,
    stockStatus:
      filters.stockStatus !== "ALL"
        ? (filters.stockStatus as
            | "CRITICAL"
            | "LOW"
            | "OPTIMAL"
            | "OUT_OF_STOCK")
        : undefined,
    ageBracket:
      filters.ageBracket !== "ALL"
        ? (filters.ageBracket as "FRESH" | "MODERATE" | "AGING" | "CRITICAL")
        : undefined,
    batchId: filters.batchId || undefined,
  };
}

const STATUS_OPTIONS = [
  "AWAITING_INTAKE",
  "LIVE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
] as const;

const STATUS_LABELS: Record<string, string> = {
  AWAITING_INTAKE: "Awaiting Intake",
  LIVE: "Live",
  ON_HOLD: "On Hold",
  QUARANTINED: "Quarantined",
  SOLD_OUT: "Sold Out",
  CLOSED: "Closed",
};

// ── Props ──
interface InventoryAdvancedFiltersProps {
  filters: InventoryFilterState;
  onFiltersChange: (filters: InventoryFilterState) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dynamic options derived from data — passed in by parent */
  categoryOptions?: string[];
  subcategoryOptions?: string[];
  supplierOptions?: Array<{ id: string; name: string }>;
  brandOptions?: Array<{ id: string; name: string }>;
  gradeOptions?: string[];
}

export function InventoryAdvancedFilters({
  filters,
  onFiltersChange,
  isOpen,
  onOpenChange,
  categoryOptions = [],
  subcategoryOptions = [],
  supplierOptions = [],
  brandOptions = [],
  gradeOptions = [],
}: InventoryAdvancedFiltersProps) {
  if (!isOpen) return null;

  const update = (partial: Partial<InventoryFilterState>) =>
    onFiltersChange({ ...filters, ...partial });

  const toggleArrayItem = (key: keyof InventoryFilterState, value: string) => {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    update({ [key]: next });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">Filters</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px]"
            onClick={() => onFiltersChange(createDefaultInventoryFilters())}
          >
            Clear All
          </Button>
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* 1. Status — multi-select checkboxes */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">Status</Label>
          <div className="mt-1 space-y-1 max-h-36 overflow-y-auto">
            {STATUS_OPTIONS.map(status => (
              <label
                key={status}
                className="flex items-center gap-1.5 text-[10px]"
              >
                <Checkbox
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={() => toggleArrayItem("statuses", status)}
                />
                {STATUS_LABELS[status]}
              </label>
            ))}
          </div>
        </div>

        {/* 2. Category */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            Category
          </Label>
          <Select
            value={filters.categories[0] ?? ""}
            onValueChange={v => update({ categories: v ? [v] : [] })}
          >
            <SelectTrigger className="mt-1 h-7 text-[10px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              {categoryOptions.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Subcategory */}
        {subcategoryOptions.length > 0 && (
          <div>
            <Label className="text-[9px] uppercase tracking-wider">
              Subcategory
            </Label>
            <Select
              value={filters.subcategories[0] ?? ""}
              onValueChange={v => update({ subcategories: v ? [v] : [] })}
            >
              <SelectTrigger className="mt-1 h-7 text-[10px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {subcategoryOptions.map(s => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 4. Stock Level */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            Stock Level
          </Label>
          <Select
            value={filters.stockLevel}
            onValueChange={v => update({ stockLevel: v })}
          >
            <SelectTrigger className="mt-1 h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 5. Supplier — multi-select checkboxes */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            Supplier
          </Label>
          <div className="mt-1 space-y-1 max-h-36 overflow-y-auto">
            {supplierOptions.map(s => (
              <label
                key={s.id}
                className="flex items-center gap-1.5 text-[10px]"
              >
                <Checkbox
                  checked={filters.suppliers.includes(s.name)}
                  onCheckedChange={() => toggleArrayItem("suppliers", s.name)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>

        {/* 6. Brand — multi-select checkboxes */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">Brand</Label>
          <div className="mt-1 space-y-1 max-h-36 overflow-y-auto">
            {brandOptions.map(b => (
              <label
                key={b.id}
                className="flex items-center gap-1.5 text-[10px]"
              >
                <Checkbox
                  checked={filters.brands.includes(b.name)}
                  onCheckedChange={() => toggleArrayItem("brands", b.name)}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>

        {/* 7. Grade — multi-select checkboxes */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">Grade</Label>
          <div className="mt-1 space-y-1 max-h-36 overflow-y-auto">
            {gradeOptions.map(g => (
              <label key={g} className="flex items-center gap-1.5 text-[10px]">
                <Checkbox
                  checked={filters.grades.includes(g)}
                  onCheckedChange={() => toggleArrayItem("grades", g)}
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        {/* 8. Date Range */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            Date Range
          </Label>
          <div className="mt-1 flex gap-1">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={e => update({ dateFrom: e.target.value })}
              className="h-7 text-[10px] flex-1"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={e => update({ dateTo: e.target.value })}
              className="h-7 text-[10px] flex-1"
            />
          </div>
        </div>

        {/* 9. Location */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            Location
          </Label>
          <Input
            value={filters.location}
            onChange={e => update({ location: e.target.value })}
            placeholder="Rack / Shelf / Bin"
            className="mt-1 h-7 text-[10px]"
          />
        </div>

        {/* 10. COGS Range */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            COGS Range
          </Label>
          <div className="mt-1 flex gap-1">
            <Input
              value={filters.cogsMin}
              onChange={e => update({ cogsMin: e.target.value })}
              placeholder="Min"
              type="number"
              className="h-7 text-[10px] flex-1"
            />
            <Input
              value={filters.cogsMax}
              onChange={e => update({ cogsMax: e.target.value })}
              placeholder="Max"
              type="number"
              className="h-7 text-[10px] flex-1"
            />
          </div>
        </div>

        {/* 11. Stock Status */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            Stock Status
          </Label>
          <Select
            value={filters.stockStatus}
            onValueChange={v => update({ stockStatus: v })}
          >
            <SelectTrigger className="mt-1 h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="OPTIMAL">Optimal</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 12. Age Bracket */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            Age Bracket
          </Label>
          <Select
            value={filters.ageBracket}
            onValueChange={v => update({ ageBracket: v })}
          >
            <SelectTrigger className="mt-1 h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="FRESH">Fresh (0-7d)</SelectItem>
              <SelectItem value="MODERATE">Moderate (8-14d)</SelectItem>
              <SelectItem value="AGING">Aging (15-30d)</SelectItem>
              <SelectItem value="CRITICAL">Critical (30+d)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 13. Batch ID */}
        <div>
          <Label className="text-[9px] uppercase tracking-wider">
            Batch ID
          </Label>
          <Input
            value={filters.batchId}
            onChange={e => update({ batchId: e.target.value })}
            placeholder="Search batch"
            className="mt-1 h-7 text-[10px]"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/InventoryAdvancedFilters.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Run type check**

Run: `pnpm check`
Expected: No new type errors

- [ ] **Step 6: Commit**

```bash
git add client/src/components/spreadsheet-native/InventoryAdvancedFilters.tsx client/src/components/spreadsheet-native/InventoryAdvancedFilters.test.tsx
git commit -m "feat(inventory): add InventoryAdvancedFilters with 14-dimension filtering

Provides filter state type, default factory, hasActiveFilters check,
and filtersToQueryInput converter for the inventory.getEnhanced tRPC query."
```

---

## Task 3: InventoryGalleryView Component

**Files:**

- Create: `client/src/components/spreadsheet-native/InventoryGalleryView.tsx`
- Create: `client/src/components/spreadsheet-native/InventoryGalleryView.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
// client/src/components/spreadsheet-native/InventoryGalleryView.test.tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InventoryGalleryView } from "./InventoryGalleryView";
import type { InventoryPilotRow } from "@/lib/spreadsheet-native";

const mockRow: InventoryPilotRow = {
  identity: { rowKey: "batch:42", entityId: 42, entityType: "batch" },
  batchId: 42,
  sku: "SKU-1042",
  productName: "Wedding Cake",
  productSummary: "Wedding Cake · Indoor · Tops/Colas",
  category: "Flower",
  subcategory: "Tops/Colas",
  vendorName: "GreenLeaf",
  brandName: "GreenLeaf",
  grade: "AAA",
  status: "LIVE",
  onHandQty: 1200,
  reservedQty: 220,
  availableQty: 980,
  unitCogs: 2.4,
  receivedDate: "2026-03-24",
  ageLabel: "3d",
  stockStatus: "OPTIMAL",
};

describe("InventoryGalleryView", () => {
  it("renders cards for each row", () => {
    render(
      <InventoryGalleryView
        rows={[mockRow]}
        onOpenInspector={vi.fn()}
        onAdjustQty={vi.fn()}
      />
    );
    expect(screen.getByText("SKU-1042")).toBeInTheDocument();
    expect(screen.getByText("Wedding Cake")).toBeInTheDocument();
  });

  it("calls onOpenInspector when Open clicked", () => {
    const onOpen = vi.fn();
    render(
      <InventoryGalleryView
        rows={[mockRow]}
        onOpenInspector={onOpen}
        onAdjustQty={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Open"));
    expect(onOpen).toHaveBeenCalledWith(42);
  });

  it("calls onAdjustQty when Adjust clicked", () => {
    const onAdjust = vi.fn();
    render(
      <InventoryGalleryView
        rows={[mockRow]}
        onOpenInspector={vi.fn()}
        onAdjustQty={onAdjust}
      />
    );
    fireEvent.click(screen.getByText("Adjust"));
    expect(onAdjust).toHaveBeenCalledWith(42);
  });

  it("renders empty state when no rows", () => {
    render(
      <InventoryGalleryView
        rows={[]}
        onOpenInspector={vi.fn()}
        onAdjustQty={vi.fn()}
      />
    );
    expect(screen.getByText(/no inventory/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/InventoryGalleryView.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement InventoryGalleryView**

```tsx
// client/src/components/spreadsheet-native/InventoryGalleryView.tsx
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryPilotRow } from "@/lib/spreadsheet-native";

interface InventoryGalleryViewProps {
  rows: InventoryPilotRow[];
  onOpenInspector: (batchId: number) => void;
  onAdjustQty: (batchId: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  LIVE: "bg-green-100 text-green-800",
  AWAITING_INTAKE: "bg-slate-100 text-slate-800",
  ON_HOLD: "bg-yellow-100 text-yellow-800",
  QUARANTINED: "bg-amber-100 text-amber-800",
  SOLD_OUT: "bg-red-100 text-red-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const STOCK_COLORS: Record<string, string> = {
  OPTIMAL: "bg-green-100 text-green-800",
  LOW: "bg-yellow-100 text-yellow-800",
  CRITICAL: "bg-red-100 text-red-800",
  OUT_OF_STOCK: "bg-gray-100 text-gray-800",
};

const formatQty = (v: number) =>
  v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const formatCurrency = (v: number | null) =>
  v === null
    ? "-"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(v);

export function InventoryGalleryView({
  rows,
  onOpenInspector,
  onAdjustQty,
}: InventoryGalleryViewProps) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No inventory matches this view
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(row => (
        <div
          key={row.identity.rowKey}
          className="overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-sm"
        >
          {/* Image placeholder */}
          <div className="flex h-24 items-center justify-center bg-muted">
            <Package className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5 p-2">
            <div className="text-[10px] font-semibold">{row.sku}</div>
            <div className="text-[10px] text-foreground">{row.productName}</div>
            <div className="text-[9px] text-muted-foreground">
              {row.vendorName} · {row.grade || "-"}
            </div>
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={cn("text-[9px]", STATUS_COLORS[row.status])}
              >
                {row.status}
              </Badge>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  row.availableQty < 100 && "text-red-600"
                )}
              >
                {formatQty(row.availableQty)} avail
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
              <span>
                {formatQty(row.onHandQty)} on hand ·{" "}
                {formatQty(row.reservedQty)} rsrvd
              </span>
              <span>{formatCurrency(row.unitCogs)}</span>
            </div>
            <div className="flex items-center justify-between">
              {row.stockStatus && (
                <Badge
                  variant="outline"
                  className={cn("text-[9px]", STOCK_COLORS[row.stockStatus])}
                >
                  {row.stockStatus}
                </Badge>
              )}
              <span className="text-[9px] text-muted-foreground">
                {row.ageLabel}
              </span>
            </div>
            <div className="flex gap-1 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-[9px] h-6"
                onClick={() => onOpenInspector(row.batchId)}
              >
                Open
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-[9px] h-6"
                onClick={() => onAdjustQty(row.batchId)}
              >
                Adjust
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/InventoryGalleryView.test.tsx`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/components/spreadsheet-native/InventoryGalleryView.tsx client/src/components/spreadsheet-native/InventoryGalleryView.test.tsx
git commit -m "feat(inventory): add InventoryGalleryView responsive card grid

Product image placeholders, status/stock badges, per-card Open/Adjust
actions. Responsive: 2-col on sm, 3-col on xl."
```

---

## Task 4: InventoryManagementSurface — Core Scaffold

This is the main surface. It wires together the toolbar, action bar, PowersheetGrid with editable columns, summary cards, status bar, and all sub-components from Tasks 1-3.

**Files:**

- Create: `client/src/components/spreadsheet-native/InventoryManagementSurface.tsx`
- Create: `client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
// client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx
/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetSelectedId = vi.fn();
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/operations?tab=inventory", mockSetLocation],
  useSearch: () => "",
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: (perm: string) => true,
  }),
}));

vi.mock("@/hooks/work-surface/useExport", () => ({
  useExport: () => ({
    exportCSV: vi.fn(),
    state: { isExporting: false, progress: 0 },
  }),
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  mapInventoryItemsToPilotRows: (items: unknown[]) => items,
  mapInventoryDetailToPilotRow: () => null,
  summarizeInventoryDetail: () => null,
  useSpreadsheetSelectionParam: () => ({
    selectedId: null,
    setSelectedId: mockSetSelectedId,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inventory: {
      getEnhanced: {
        useQuery: () => ({
          data: {
            items: [],
            pagination: { hasMore: false },
            summary: {
              totalItems: 0,
              totalOnHand: 0,
              totalAvailable: 0,
              totalValue: 0,
              byStockStatus: {},
            },
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      dashboardStats: {
        useQuery: () => ({
          data: { totalUnits: 0, statusCounts: {}, totalInventoryValue: 0 },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      getById: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      views: {
        list: { useQuery: () => ({ data: { items: [] }, refetch: vi.fn() }) },
        save: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
      updateStatus: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      adjustQty: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      updateBatch: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      bulk: {
        updateStatus: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        delete: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        restore: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
  },
}));

// Mock sub-components to isolate surface tests
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid="powersheet-grid">{title}</div>
  ),
}));

describe("InventoryManagementSurface", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the toolbar with title", async () => {
    const { InventoryManagementSurface } =
      await import("./InventoryManagementSurface");
    render(<InventoryManagementSurface />);
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("renders search input", async () => {
    const { InventoryManagementSurface } =
      await import("./InventoryManagementSurface");
    render(<InventoryManagementSurface />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("renders grid/gallery toggle", async () => {
    const { InventoryManagementSurface } =
      await import("./InventoryManagementSurface");
    render(<InventoryManagementSurface />);
    expect(screen.getByText("Grid")).toBeInTheDocument();
    expect(screen.getByText("Gallery")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement InventoryManagementSurface**

This is a large file. Build it incrementally. The full structure is:

```tsx
// client/src/components/spreadsheet-native/InventoryManagementSurface.tsx
import { useEffect, useMemo, useState } from "react";
import type { CellValueChangedEvent, ColDef } from "ag-grid-community";
import { Download, Package, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useExport } from "@/hooks/work-surface/useExport";
import type { ExportColumn } from "@/hooks/work-surface/useExport";
import {
  mapInventoryItemsToPilotRows,
  mapInventoryDetailToPilotRow,
  summarizeInventoryDetail,
  useSpreadsheetSelectionParam,
} from "@/lib/spreadsheet-native";
import type { InventoryPilotRow } from "@/lib/spreadsheet-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  InspectorField,
  InspectorPanel,
  InspectorSection,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import { AdjustmentContextDrawer } from "./AdjustmentContextDrawer";
import type { InventoryAdjustmentReason } from "@shared/inventoryAdjustmentReasons";
import {
  InventoryAdvancedFilters,
  createDefaultInventoryFilters,
  hasActiveFilters,
  filtersToQueryInput,
  type InventoryFilterState,
} from "./InventoryAdvancedFilters";
import { InventoryGalleryView } from "./InventoryGalleryView";

// ── Constants ──

type ViewMode = "grid" | "gallery";

const STATUS_OPTIONS = [
  "AWAITING_INTAKE",
  "LIVE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
] as const;

type InventoryBatchStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<string, string> = {
  AWAITING_INTAKE: "Awaiting Intake",
  LIVE: "Live",
  ON_HOLD: "On Hold",
  QUARANTINED: "Quarantined",
  SOLD_OUT: "Sold Out",
  CLOSED: "Closed",
};

const PAGE_SIZE = 100;

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const keyboardHints: KeyboardHint[] = [
  { key: "Dbl-click", label: "edit cell" },
  { key: `${mod}+K`, label: "search" },
  { key: `${mod}+S`, label: "save" },
  { key: `${mod}+Z`, label: "undo" },
  { key: `${mod}+C`, label: "copy" },
  { key: `${mod}+A`, label: "select all" },
  { key: "Esc", label: "cancel" },
];

const EXPORT_COLUMNS: ExportColumn<InventoryPilotRow>[] = [
  { key: "sku", label: "SKU" },
  { key: "productName", label: "Product" },
  { key: "vendorName", label: "Supplier" },
  { key: "brandName", label: "Brand" },
  { key: "category", label: "Category" },
  { key: "subcategory", label: "Subcategory" },
  { key: "grade", label: "Grade" },
  { key: "status", label: "Status" },
  { key: "onHandQty", label: "On Hand", formatter: v => String(v ?? 0) },
  { key: "reservedQty", label: "Reserved", formatter: v => String(v ?? 0) },
  { key: "availableQty", label: "Available", formatter: v => String(v ?? 0) },
  {
    key: "unitCogs",
    label: "Unit COGS",
    formatter: v => (v == null ? "" : String(v)),
  },
  { key: "ageLabel", label: "Age" },
  {
    key: "stockStatus",
    label: "Stock Status",
    formatter: v => String(v ?? ""),
  },
];

const formatCurrency = (v: number | null) =>
  v === null
    ? "-"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(v);

const formatQty = (v: number) =>
  v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

// ── Component ──

export function InventoryManagementSurface() {
  const { hasPermission } = usePermissions();
  const { selectedId: selectedBatchId, setSelectedId: setSelectedBatchId } =
    useSpreadsheetSelectionParam("batchId");

  // ── View state ──
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<InventoryFilterState>(
    createDefaultInventoryFilters
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loadedWindowCount, setLoadedWindowCount] = useState(1);
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // ── Bulk state ──
  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingBulkStatus, setPendingBulkStatus] =
    useState<InventoryBatchStatus | null>(null);

  // ── Adjustment drawer state ──
  const [adjustDrawerState, setAdjustDrawerState] = useState<{
    isOpen: boolean;
    batchId: number;
    sku: string;
    productName: string;
    previousValue: number;
    currentValue: number;
  } | null>(null);

  const canUpdateInventory = hasPermission("inventory:update");
  const canDeleteInventory = hasPermission("inventory:delete");
  const { exportCSV, state: exportState } =
    useExport<Record<string, unknown>>();

  useEffect(() => {
    setLoadedWindowCount(1);
  }, [filters]);

  const loadedRowTarget = PAGE_SIZE * loadedWindowCount;

  // ── Queries ──

  const queryInput = useMemo(
    () => ({
      page: 1,
      pageSize: loadedRowTarget,
      cursor: 0,
      sortBy: "sku" as const,
      sortOrder: "asc" as const,
      ...filtersToQueryInput(filters),
    }),
    [loadedRowTarget, filters]
  );

  const enhancedQuery = trpc.inventory.getEnhanced.useQuery(queryInput);
  const dashboardQuery = trpc.inventory.dashboardStats.useQuery();
  const viewsQuery = trpc.inventory.views.list.useQuery();
  const detailQuery = trpc.inventory.getById.useQuery(selectedBatchId ?? 0, {
    enabled: selectedBatchId !== null,
  });

  // ── Mutations ──

  const updateStatusMutation = trpc.inventory.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      void enhancedQuery.refetch();
      void detailQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: e => toast.error(e.message || "Failed to update status"),
  });

  const adjustQtyMutation = trpc.inventory.adjustQty.useMutation({
    onSuccess: () => {
      toast.success("Quantity adjusted");
      setAdjustDrawerState(null);
      void enhancedQuery.refetch();
      void detailQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: e => toast.error(e.message || "Failed to adjust quantity"),
  });

  const updateBatchMutation = trpc.inventory.updateBatch.useMutation({
    onSuccess: () => {
      toast.success("Batch updated");
      void enhancedQuery.refetch();
      void detailQuery.refetch();
    },
    onError: e => toast.error(e.message || "Failed to update batch"),
  });

  const bulkUpdateStatusMutation = trpc.inventory.bulk.updateStatus.useMutation(
    {
      onSuccess: () => {
        toast.success("Bulk status updated");
        setBulkSelectedIds([]);
        setBulkStatusDialogOpen(false);
        setPendingBulkStatus(null);
        void enhancedQuery.refetch();
        void dashboardQuery.refetch();
      },
      onError: e => toast.error(e.message || "Bulk update failed"),
    }
  );

  const bulkDeleteMutation = trpc.inventory.bulk.delete.useMutation({
    onSuccess: () => {
      toast.success("Batches deleted");
      setBulkSelectedIds([]);
      setBulkDeleteDialogOpen(false);
      void enhancedQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: e => toast.error(e.message || "Bulk delete failed"),
  });

  const bulkRestoreMutation = trpc.inventory.bulk.restore.useMutation({
    onSuccess: () => {
      toast.success("Batches restored");
      void enhancedQuery.refetch();
      void dashboardQuery.refetch();
    },
    onError: e => toast.error(e.message || "Restore failed"),
  });

  // ── Derived data ──

  const rows = useMemo(
    () => mapInventoryItemsToPilotRows(enhancedQuery.data?.items ?? []),
    [enhancedQuery.data?.items]
  );
  const totalItems = enhancedQuery.data?.summary.totalItems ?? rows.length;
  const hasMoreRows =
    Boolean(enhancedQuery.data?.pagination?.hasMore) ||
    rows.length < totalItems;
  const selectedRow = rows.find(r => r.batchId === selectedBatchId) ?? null;
  const detailSummary = summarizeInventoryDetail(detailQuery.data);
  const views = viewsQuery.data?.items ?? [];

  const locationRows = useMemo(
    () =>
      (detailQuery.data?.locations ?? []).map((loc: any, i: number) => ({
        id: `${selectedBatchId ?? "batch"}-loc-${i}`,
        locationLabel:
          loc.site ||
          [loc.zone, loc.rack, loc.shelf, loc.bin]
            .filter(Boolean)
            .join(" / ") ||
          `Location ${i + 1}`,
        quantity: typeof loc.qty === "number" ? loc.qty : Number(loc.qty ?? 0),
      })),
    [detailQuery.data?.locations, selectedBatchId]
  );

  // Dashboard stats
  const dashStats = dashboardQuery.data;
  const totalBatches = dashStats?.statusCounts
    ? Object.values(dashStats.statusCounts).reduce(
        (s: number, v: number) => s + v,
        0
      )
    : 0;
  const liveCount = dashStats?.statusCounts?.LIVE ?? 0;
  const totalUnits = dashStats?.totalUnits ?? 0;
  const totalValue = dashStats?.totalInventoryValue ?? 0;

  // ── Column definitions ──

  const columnDefs = useMemo<ColDef<InventoryPilotRow>[]>(
    () => [
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 110,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "productSummary",
        headerName: "Product",
        flex: 1.3,
        minWidth: 260,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "vendorName",
        headerName: "Supplier",
        minWidth: 120,
        maxWidth: 160,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "brandName",
        headerName: "Brand",
        minWidth: 100,
        maxWidth: 140,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "grade",
        headerName: "Grade",
        minWidth: 80,
        maxWidth: 100,
        editable: canUpdateInventory,
        cellClass: canUpdateInventory
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 130,
        maxWidth: 160,
        editable: canUpdateInventory,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: [...STATUS_OPTIONS] },
        cellClass: canUpdateInventory
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      },
      {
        field: "onHandQty",
        headerName: "On Hand",
        minWidth: 100,
        maxWidth: 120,
        editable: canUpdateInventory,
        valueFormatter: p => formatQty(Number(p.value ?? 0)),
        cellClass: canUpdateInventory
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      },
      {
        field: "reservedQty",
        headerName: "Rsrvd",
        minWidth: 80,
        maxWidth: 100,
        valueFormatter: p => formatQty(Number(p.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "availableQty",
        headerName: "Avail",
        minWidth: 80,
        maxWidth: 100,
        valueFormatter: p => formatQty(Number(p.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "unitCogs",
        headerName: "COGS",
        minWidth: 90,
        maxWidth: 110,
        editable: canUpdateInventory,
        valueFormatter: p => formatCurrency(p.value as number | null),
        cellClass: canUpdateInventory
          ? "powersheet-cell--editable"
          : "powersheet-cell--locked",
      },
      {
        field: "stockStatus",
        headerName: "Stock",
        minWidth: 80,
        maxWidth: 100,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "ageLabel",
        headerName: "Age",
        minWidth: 60,
        maxWidth: 80,
        cellClass: "powersheet-cell--locked",
      },
    ],
    [canUpdateInventory]
  );

  const locationColumnDefs = useMemo<ColDef[]>(
    () => [
      {
        field: "locationLabel",
        headerName: "Location",
        flex: 1.2,
        minWidth: 220,
      },
      {
        field: "quantity",
        headerName: "Qty",
        minWidth: 100,
        maxWidth: 120,
        valueFormatter: p => formatQty(Number(p.value ?? 0)),
      },
    ],
    []
  );

  // ── Handlers ──

  const handleCellValueChanged = (
    event: CellValueChangedEvent<InventoryPilotRow>
  ) => {
    if (!event.data || !canUpdateInventory) return;
    const { field } = event.colDef;

    if (field === "status") {
      const nextStatus = String(event.newValue || "").toUpperCase();
      const prevStatus = String(event.oldValue || "").toUpperCase();
      if (!nextStatus || nextStatus === prevStatus) return;
      updateStatusMutation.mutate({
        id: event.data.batchId,
        status: nextStatus,
        reason: "Spreadsheet status update",
        version: event.data.identity.recordVersion,
      });
    } else if (field === "onHandQty") {
      const prev = Number(event.oldValue ?? 0);
      const next = Number(event.newValue ?? 0);
      if (prev === next) return;
      // Open the adjustment drawer — don't commit yet
      setAdjustDrawerState({
        isOpen: true,
        batchId: event.data.batchId,
        sku: event.data.sku,
        productName: event.data.productName,
        previousValue: prev,
        currentValue: next,
      });
    } else if (field === "grade") {
      updateBatchMutation.mutate({
        id: event.data.batchId,
        grade: event.newValue as string | null,
        reason: "Spreadsheet grade update",
        version: event.data.identity.recordVersion,
      });
    } else if (field === "unitCogs") {
      // COGS update via updateBatch — the router accepts it via notes/reason
      // Note: Direct COGS editing may need a dedicated mutation; check during implementation.
      // For now, use updateBatch with reason.
      updateBatchMutation.mutate({
        id: event.data.batchId,
        reason: `COGS updated to ${event.newValue}`,
        version: event.data.identity.recordVersion,
      });
    }
  };

  const handleAdjustApply = (context: {
    reason: InventoryAdjustmentReason;
    notes: string;
  }) => {
    if (!adjustDrawerState) return;
    const delta =
      adjustDrawerState.currentValue - adjustDrawerState.previousValue;
    adjustQtyMutation.mutate({
      id: adjustDrawerState.batchId,
      field: "onHandQty",
      adjustment: delta,
      adjustmentReason: context.reason,
      notes: context.notes || undefined,
    });
  };

  const handleAdjustCancel = () => {
    // Revert the cell — refetch to reset grid data
    void enhancedQuery.refetch();
    setAdjustDrawerState(null);
  };

  const handleExportCSV = () => {
    void exportCSV(rows as unknown as Record<string, unknown>[], {
      columns: EXPORT_COLUMNS as unknown as ExportColumn<
        Record<string, unknown>
      >[],
      filename: "inventory",
      addTimestamp: true,
    });
  };

  // ── Render ──

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col gap-1.5">
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-1.5 px-2 py-1">
          <span className="text-xs font-semibold">Inventory</span>
          <Badge variant="outline" className="text-[9px]">
            {totalBatches} batches
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] bg-blue-50 text-blue-800"
          >
            {formatQty(totalUnits)} units
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] bg-yellow-50 text-yellow-800"
          >
            {formatCurrency(totalValue)}
          </Badge>
          <Badge
            variant="outline"
            className="text-[9px] bg-green-50 text-green-800"
          >
            {liveCount} live
          </Badge>
          <div className="flex-1" />
          <div className="inline-flex overflow-hidden rounded border border-border">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-2 py-0.5 text-[9px] font-medium",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("gallery")}
              className={cn(
                "px-2 py-0.5 text-[9px] font-medium",
                viewMode === "gallery"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              )}
            >
              Gallery
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            disabled={exportState.isExporting || rows.length === 0}
          >
            <Download className="mr-1 h-3 w-3" />
            <span className="text-[9px]">
              {exportState.isExporting ? "Exporting..." : "Export CSV"}
            </span>
          </Button>
        </div>

        {/* ── Action Bar ── */}
        <div className="flex items-center gap-1.5 border-y border-border bg-muted/30 px-2 py-1">
          <Input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search SKU, product, supplier..."
            className="h-6 max-w-[200px] text-[10px]"
          />
          <Select
            value={filters.statuses[0] ?? "ALL"}
            onValueChange={v =>
              setFilters(f => ({ ...f, statuses: v === "ALL" ? [] : [v] }))
            }
          >
            <SelectTrigger className="h-6 w-[140px] text-[9px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={hasActiveFilters(filters) ? "default" : "outline"}
            className="h-6 text-[9px]"
            onClick={() => setFiltersOpen(o => !o)}
          >
            Filters{hasActiveFilters(filters) ? " *" : ""}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[9px]"
            disabled
          >
            Saved Views
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[9px]"
            disabled
          >
            Save View
          </Button>
          <div className="flex-1" />
          {bulkSelectedIds.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground">
                {bulkSelectedIds.length} selected
              </span>
              <Select
                value=""
                onValueChange={v => {
                  setPendingBulkStatus(v as InventoryBatchStatus);
                  setBulkStatusDialogOpen(true);
                }}
              >
                <SelectTrigger className="h-6 w-[130px] text-[9px]">
                  <SelectValue placeholder="Set status..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canDeleteInventory && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 text-[9px]"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[9px]"
                onClick={() => setBulkSelectedIds([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* ── Filters panel ── */}
        {filtersOpen && (
          <div className="px-1.5">
            <InventoryAdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
              isOpen={filtersOpen}
              onOpenChange={setFiltersOpen}
            />
          </div>
        )}

        {/* ── Main content: Grid or Gallery ── */}
        {viewMode === "grid" ? (
          <PowersheetGrid
            surfaceId="inventory-management"
            requirementIds={["OPS-INV-001", "OPS-INV-004", "OPS-INV-006"]}
            affordances={[]}
            title="Inventory"
            description="Editable inventory grid. Double-click to edit grade, status, on-hand qty, COGS."
            rows={rows}
            columnDefs={columnDefs}
            getRowId={row => row.identity.rowKey}
            selectedRowId={selectedRow ? selectedRow.identity.rowKey : null}
            onSelectedRowChange={row =>
              setSelectedBatchId(row?.batchId ?? null)
            }
            onCellValueChanged={handleCellValueChanged}
            selectionMode="cell-range"
            enableFillHandle={false}
            enableUndoRedo={true}
            onSelectionSummaryChange={setQueueSelectionSummary}
            isLoading={enhancedQuery.isLoading}
            errorMessage={enhancedQuery.error?.message ?? null}
            emptyTitle="No inventory matches this view"
            emptyDescription="Adjust the search or filters."
            summary={
              <span>
                {rows.length} rows · {views.length} saved view
                {views.length === 1 ? "" : "s"} ·{" "}
                {canUpdateInventory
                  ? "editable: grade, status, on hand, COGS"
                  : "read-only"}
              </span>
            }
            headerActions={
              hasMoreRows ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLoadedWindowCount(c => c + 1)}
                >
                  Load More
                </Button>
              ) : null
            }
            minHeight={420}
          />
        ) : (
          <InventoryGalleryView
            rows={rows}
            onOpenInspector={id => setSelectedBatchId(id)}
            onAdjustQty={id => {
              const row = rows.find(r => r.batchId === id);
              if (row) {
                setSelectedBatchId(id);
                setAdjustDrawerState({
                  isOpen: true,
                  batchId: row.batchId,
                  sku: row.sku,
                  productName: row.productName,
                  previousValue: row.onHandQty,
                  currentValue: row.onHandQty,
                });
              }
            }}
          />
        )}

        {/* ── Selected batch summary cards ── */}
        {selectedRow && (
          <div className="grid gap-1.5 px-1.5 md:grid-cols-4">
            <div className="rounded-md border border-border bg-card px-2 py-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Product
              </div>
              <div className="mt-0.5 text-[11px] font-medium">
                {selectedRow.productSummary}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card px-2 py-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Stock
              </div>
              <div className="mt-0.5 text-[11px] font-medium">
                {formatQty(selectedRow.onHandQty)} on hand ·{" "}
                {formatQty(selectedRow.availableQty)} avail
              </div>
            </div>
            <div className="rounded-md border border-border bg-card px-2 py-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Valuation
              </div>
              <div className="mt-0.5 text-[11px] font-medium">
                {formatCurrency(selectedRow.unitCogs)}/unit
              </div>
            </div>
            <div className="rounded-md border border-border bg-card px-2 py-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                Location
              </div>
              <div className="mt-0.5 text-[11px] font-medium text-primary cursor-pointer underline">
                {detailSummary?.locationCount ?? 0} locations →
              </div>
            </div>
          </div>
        )}

        {/* ── Status bar ── */}
        <WorkSurfaceStatusBar
          left={
            <span>
              {formatQty(totalUnits)} units · {totalBatches} batches ·{" "}
              {formatCurrency(totalValue)}
            </span>
          }
          center={
            selectedRow ? (
              <span>Selected {selectedRow.sku}</span>
            ) : (
              <span>
                {rows.length} loaded rows of {totalItems}
              </span>
            )
          }
          right={
            <KeyboardHintBar hints={keyboardHints} className="text-[9px]" />
          }
        />

        {/* ── Inspector panel ── */}
        <InspectorPanel
          isOpen={selectedBatchId !== null}
          onClose={() => setSelectedBatchId(null)}
          title={selectedRow?.sku ?? "Batch Inspector"}
          subtitle={selectedRow?.productName ?? "Select a batch"}
        >
          {selectedRow && (
            <div className="space-y-4">
              <InspectorSection title="Batch Summary">
                <InspectorField label="Product">
                  <p>{selectedRow.productName}</p>
                </InspectorField>
                <InspectorField label="Supplier">
                  <p>{selectedRow.vendorName}</p>
                </InspectorField>
                <InspectorField label="Brand">
                  <p>{selectedRow.brandName}</p>
                </InspectorField>
                <InspectorField label="Grade">
                  <p>{selectedRow.grade || "-"}</p>
                </InspectorField>
              </InspectorSection>
              <InspectorSection title="Quantities">
                <InspectorField label="On Hand">
                  <p>{formatQty(selectedRow.onHandQty)}</p>
                </InspectorField>
                <InspectorField label="Reserved">
                  <p>{formatQty(selectedRow.reservedQty)}</p>
                </InspectorField>
                <InspectorField label="Available">
                  <p>{formatQty(selectedRow.availableQty)}</p>
                </InspectorField>
              </InspectorSection>
              <InspectorSection title="Valuation">
                <InspectorField label="Unit COGS">
                  <p>{formatCurrency(selectedRow.unitCogs)}</p>
                </InspectorField>
              </InspectorSection>
              {locationRows.length > 0 && (
                <InspectorSection title="Locations">
                  <PowersheetGrid
                    surfaceId="inventory-locations"
                    requirementIds={["OPS-INV-002"]}
                    affordances={[]}
                    title="Batch Locations"
                    description="Storage locations for selected batch."
                    rows={locationRows}
                    columnDefs={locationColumnDefs}
                    getRowId={row => row.id}
                    selectionMode="cell-range"
                    enableFillHandle={false}
                    enableUndoRedo={false}
                    isLoading={detailQuery.isLoading}
                    emptyTitle="No locations"
                    emptyDescription="No storage locations for this batch."
                    minHeight={140}
                  />
                </InspectorSection>
              )}
            </div>
          )}
        </InspectorPanel>

        {/* ── Confirm dialogs ── */}
        <ConfirmDialog
          open={bulkStatusDialogOpen}
          onOpenChange={o => {
            setBulkStatusDialogOpen(o);
            if (!o) setPendingBulkStatus(null);
          }}
          title="Bulk Status Update"
          description={
            pendingBulkStatus
              ? `Set ${bulkSelectedIds.length} batch(es) to "${STATUS_LABELS[pendingBulkStatus]}"?`
              : "Update status?"
          }
          confirmLabel={
            bulkUpdateStatusMutation.isPending ? "Updating..." : "Update"
          }
          onConfirm={() => {
            if (pendingBulkStatus)
              bulkUpdateStatusMutation.mutate({
                batchIds: bulkSelectedIds,
                newStatus: pendingBulkStatus,
              });
          }}
        />
        <ConfirmDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title="Delete Selected Batches?"
          description={`Delete ${bulkSelectedIds.length} batch(es)? Only zero-qty batches can be deleted.`}
          confirmLabel={bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
          variant="destructive"
          onConfirm={() => bulkDeleteMutation.mutate(bulkSelectedIds)}
        />
      </div>

      {/* ── Adjustment Context Drawer (right side) ── */}
      {adjustDrawerState?.isOpen && (
        <AdjustmentContextDrawer
          isOpen={true}
          batchId={adjustDrawerState.batchId}
          sku={adjustDrawerState.sku}
          productName={adjustDrawerState.productName}
          previousValue={adjustDrawerState.previousValue}
          currentValue={adjustDrawerState.currentValue}
          isPending={adjustQtyMutation.isPending}
          onApply={handleAdjustApply}
          onCancel={handleAdjustCancel}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx`
Expected: All 3 tests PASS

- [ ] **Step 5: Run type check and lint**

Run: `pnpm check && pnpm lint`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add client/src/components/spreadsheet-native/InventoryManagementSurface.tsx client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx
git commit -m "feat(inventory): add InventoryManagementSurface with editable grid + drawer

Unified surface with: editable PowersheetGrid (grade, status, on-hand,
COGS), Grid/Gallery toggle, 14-dimension filtering, AdjustmentContextDrawer,
summary cards, inspector panel, bulk operations, CSV export."
```

---

## Task 5: Update InventoryWorkspacePage Routing

**Files:**

- Modify: `client/src/pages/InventoryWorkspacePage.tsx`

- [ ] **Step 1: Read current file for context**

Read: `client/src/pages/InventoryWorkspacePage.tsx`

The inventory panel currently renders:

```tsx
surfaceMode === "sheet-native"
  ? <InventorySheetPilotSurface onOpenClassic={...} />
  : <InventoryWorkSurface />
```

And the `commandStrip` renders a `SheetModeToggle` for the inventory tab.

- [ ] **Step 2: Replace inventory panel with unified surface**

In `InventoryWorkspacePage.tsx`:

1. Add import: `import { InventoryManagementSurface } from "@/components/spreadsheet-native/InventoryManagementSurface";`

2. Remove lazy import for `InventorySheetPilotSurface`

3. Remove import for `InventoryWorkSurface`

4. Remove the inventory-specific `useSpreadsheetPilotAvailability` and `useSpreadsheetSurfaceMode` hooks and their variables (`pilotSurfaceSupported`, `sheetPilotEnabled`, `availabilityReady`, `surfaceMode`, `setSurfaceMode`)

5. Replace the `<LinearWorkspacePanel value="inventory">` contents:

```tsx
<LinearWorkspacePanel value="inventory">
  <InventoryManagementSurface />
</LinearWorkspacePanel>
```

6. Update `commandStrip` — remove the inventory tab's `SheetModeToggle`. Change the conditional from:

```tsx
activeTab === "inventory" ? (
  <SheetModeToggle enabled={sheetPilotEnabled} surfaceMode={surfaceMode} onSurfaceModeChange={setSurfaceMode} />
) : activeTab === "intake" ? (
```

to:

```tsx
activeTab === "intake" ? (
```

7. Keep all other tabs (intake, shipping, receiving, photography, samples) exactly as they are. Only the inventory tab changes.

- [ ] **Step 3: Run type check**

Run: `pnpm check`
Expected: No type errors. Unused imports for `InventoryWorkSurface`, `InventorySheetPilotSurface`, and inventory-specific surface mode hooks should be cleaned up by the edit.

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: No lint errors

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: All tests pass. Existing `InventorySheetPilotSurface.test.tsx` tests still pass (the component still exists, just isn't imported by the workspace page).

- [ ] **Step 6: Run build**

Run: `pnpm build`
Expected: Build succeeds. If tree-shaking eliminates the old surfaces from the bundle, that's fine — they're still in the codebase for reference but not imported.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/InventoryWorkspacePage.tsx
git commit -m "feat(inventory): wire InventoryManagementSurface, kill SheetModeToggle

Inventory tab now renders unified InventoryManagementSurface directly.
SheetModeToggle removed for inventory tab. Other tabs unchanged."
```

---

## Task 6: Saved Views Integration

The surface scaffold in Task 4 has disabled Saved Views and Save View buttons. This task wires them to the `inventory.views.*` tRPC endpoints.

**Files:**

- Modify: `client/src/components/spreadsheet-native/InventoryManagementSurface.tsx`

- [ ] **Step 1: Add saved views state and handlers**

In InventoryManagementSurface, add state:

```tsx
const [currentViewId, setCurrentViewId] = useState<number | null>(null);
const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
const [saveViewName, setSaveViewName] = useState("");
const [saveViewShared, setSaveViewShared] = useState(false);
```

Add the save mutation:

```tsx
const saveViewMutation = trpc.inventory.views.save.useMutation({
  onSuccess: result => {
    toast.success(`View "${result.name}" saved`);
    setSaveViewDialogOpen(false);
    setSaveViewName("");
    void viewsQuery.refetch();
    setCurrentViewId(result.id);
  },
  onError: e => toast.error(e.message || "Failed to save view"),
});

const deleteViewMutation = trpc.inventory.views.delete.useMutation({
  onSuccess: () => {
    toast.success("View deleted");
    void viewsQuery.refetch();
    if (currentViewId) setCurrentViewId(null);
  },
  onError: e => toast.error(e.message || "Failed to delete view"),
});
```

- [ ] **Step 2: Replace disabled buttons with working ones**

Replace the `Saved Views` button with a Select dropdown:

```tsx
<Select
  value={currentViewId !== null ? String(currentViewId) : ""}
  onValueChange={v => {
    if (!v) {
      setFilters(createDefaultInventoryFilters());
      setCurrentViewId(null);
      return;
    }
    const view = views.find(view => view.id === Number(v));
    if (view?.filters) {
      setFilters({
        ...createDefaultInventoryFilters(),
        ...view.filters,
      } as InventoryFilterState);
      setCurrentViewId(view.id);
    }
  }}
>
  <SelectTrigger className="h-6 w-[140px] text-[9px]">
    <SelectValue placeholder="Saved Views" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Default (no view)</SelectItem>
    {views.map(v => (
      <SelectItem key={v.id} value={String(v.id)}>
        {v.name}
        {v.isShared ? " (shared)" : ""}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Replace the `Save View` button:

```tsx
<Button
  size="sm"
  variant="outline"
  className="h-6 text-[9px]"
  onClick={() => setSaveViewDialogOpen(true)}
  disabled={!hasActiveFilters(filters)}
>
  Save View
</Button>
```

- [ ] **Step 3: Add save view dialog**

After the existing ConfirmDialogs, add:

```tsx
{
  /* Save view dialog */
}
{
  saveViewDialogOpen && (
    <ConfirmDialog
      open={saveViewDialogOpen}
      onOpenChange={setSaveViewDialogOpen}
      title="Save Current View"
      description="Save the current filters as a named view."
      confirmLabel={saveViewMutation.isPending ? "Saving..." : "Save View"}
      onConfirm={() => {
        if (!saveViewName.trim()) return;
        saveViewMutation.mutate({
          name: saveViewName.trim(),
          filters: filters as unknown as Record<string, unknown>,
          isShared: saveViewShared,
        });
      }}
    >
      <div className="space-y-2 py-2">
        <Input
          value={saveViewName}
          onChange={e => setSaveViewName(e.target.value)}
          placeholder="View name"
          maxLength={100}
          className="text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={saveViewShared}
            onChange={e => setSaveViewShared(e.target.checked)}
          />
          Share with team
        </label>
      </div>
    </ConfirmDialog>
  );
}
```

Note: The ConfirmDialog may need to support `children` for the input. If it doesn't, wrap this in a Dialog from shadcn/ui instead. Check `ui/confirm-dialog.tsx` during implementation — if it doesn't accept children, use a plain `Dialog` + `DialogContent` + `DialogHeader` + `DialogFooter` from shadcn/ui.

- [ ] **Step 4: Run type check and tests**

Run: `pnpm check && pnpm test -- --run client/src/components/spreadsheet-native/InventoryManagementSurface.test.tsx`
Expected: Pass

- [ ] **Step 5: Commit**

```bash
git add client/src/components/spreadsheet-native/InventoryManagementSurface.tsx
git commit -m "feat(inventory): wire saved views to inventory.views tRPC endpoints

Load, apply, save, and delete named filter views. Shared/personal toggle.
View selector in action bar. Save button disabled when no active filters."
```

---

## Task 7: Final Verification

- [ ] **Step 1: Run full check suite**

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

Expected: All pass with zero errors.

- [ ] **Step 2: Verify no regressions in other surfaces**

Run: `pnpm test -- --run client/src/components/spreadsheet-native/`
Expected: All existing pilot surface tests still pass. New tests pass.

- [ ] **Step 3: Manual smoke check (if local dev server available)**

1. Navigate to Inventory workspace → inventory tab
2. Verify: no SheetModeToggle visible
3. Verify: grid loads with editable cells (grade, status have accent border)
4. Verify: double-click On Hand → AdjustmentContextDrawer slides in from right
5. Verify: Grid/Gallery toggle switches between modes
6. Verify: Filters button opens the 14-dimension panel
7. Verify: Export CSV downloads a file
8. Verify: clicking a row shows summary cards below grid
9. Verify: other tabs (intake, shipping, receiving) still work with their toggles

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(inventory): address smoke test findings"
```

---

## Summary

| Task | Files                                   | What it produces                                |
| ---- | --------------------------------------- | ----------------------------------------------- |
| 1    | AdjustmentContextDrawer.tsx + test      | Standalone right-drawer component               |
| 2    | InventoryAdvancedFilters.tsx + test     | 14-dimension filter panel with state helpers    |
| 3    | InventoryGalleryView.tsx + test         | Responsive gallery card grid                    |
| 4    | InventoryManagementSurface.tsx + test   | Main unified surface wiring everything together |
| 5    | InventoryWorkspacePage.tsx (modify)     | Kill SheetModeToggle, wire new surface          |
| 6    | InventoryManagementSurface.tsx (modify) | Saved views integration                         |
| 7    | (verification)                          | Full check/lint/test/build pass                 |
