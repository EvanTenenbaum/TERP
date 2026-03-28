/**
 * InventoryAdvancedFilters
 *
 * 14-dimension filter panel for the inventory grid.
 * Used by InventorySheetPilotSurface and future inventory surfaces.
 */

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { STATUS_OPTIONS, STATUS_LABELS } from "./inventoryConstants";

// ============================================================================
// Types
// ============================================================================

export interface InventoryFilterState {
  search: string;
  statuses: string[];
  categories: string[];
  subcategories: string[];
  stockLevel: string; // "all" | "in_stock" | "low_stock" | "out_of_stock"
  suppliers: string[];
  brands: string[];
  grades: string[];
  dateFrom: string; // ISO date or ""
  dateTo: string;
  location: string;
  cogsMin: string; // string for input binding
  cogsMax: string;
  stockStatus: string; // "ALL" | "OPTIMAL" | "LOW" | "CRITICAL" | "OUT_OF_STOCK"
  ageBracket: string; // "ALL" | "FRESH" | "MODERATE" | "AGING" | "CRITICAL"
  batchId: string;
}

export interface InventoryAdvancedFiltersProps {
  filters: InventoryFilterState;
  onFiltersChange: (filters: InventoryFilterState) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryOptions?: string[];
  subcategoryOptions?: string[];
  supplierOptions?: Array<{ id: string; name: string }>;
  brandOptions?: Array<{ id: string; name: string }>;
  gradeOptions?: string[];
}

// ============================================================================
// Helpers
// ============================================================================

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
  const defaults = createDefaultInventoryFilters();
  return (
    filters.search !== defaults.search ||
    filters.statuses.length > 0 ||
    filters.categories.length > 0 ||
    filters.subcategories.length > 0 ||
    filters.stockLevel !== defaults.stockLevel ||
    filters.suppliers.length > 0 ||
    filters.brands.length > 0 ||
    filters.grades.length > 0 ||
    filters.dateFrom !== defaults.dateFrom ||
    filters.dateTo !== defaults.dateTo ||
    filters.location !== defaults.location ||
    filters.cogsMin !== defaults.cogsMin ||
    filters.cogsMax !== defaults.cogsMax ||
    filters.stockStatus !== defaults.stockStatus ||
    filters.ageBracket !== defaults.ageBracket ||
    filters.batchId !== defaults.batchId
  );
}

type QueryStockStatus = "CRITICAL" | "LOW" | "OPTIMAL" | "OUT_OF_STOCK";
type QueryAgeBracket = "FRESH" | "MODERATE" | "AGING" | "CRITICAL";
type QueryStockLevel = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryQueryInput {
  search?: string;
  status?: string[];
  category?: string;
  subcategory?: string;
  stockLevel?: QueryStockLevel;
  vendor?: string[];
  brand?: string[];
  grade?: string[];
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  minCogs?: number;
  maxCogs?: number;
  stockStatus?: QueryStockStatus;
  ageBracket?: QueryAgeBracket;
  batchId?: string;
}

export function filtersToQueryInput(
  filters: InventoryFilterState
): InventoryQueryInput {
  const input: InventoryQueryInput = {};

  if (filters.search) input.search = filters.search;
  if (filters.statuses.length > 0) input.status = filters.statuses;
  if (filters.categories.length > 0) input.category = filters.categories[0];
  if (filters.subcategories.length > 0)
    input.subcategory = filters.subcategories[0];
  if (filters.stockLevel !== "all")
    input.stockLevel = filters.stockLevel as QueryStockLevel;
  if (filters.suppliers.length > 0) input.vendor = filters.suppliers;
  if (filters.brands.length > 0) input.brand = filters.brands;
  if (filters.grades.length > 0) input.grade = filters.grades;
  if (filters.dateFrom) input.dateFrom = filters.dateFrom;
  if (filters.dateTo) input.dateTo = filters.dateTo;
  if (filters.location) input.location = filters.location;
  if (filters.cogsMin !== "") input.minCogs = parseFloat(filters.cogsMin);
  if (filters.cogsMax !== "") input.maxCogs = parseFloat(filters.cogsMax);
  if (filters.stockStatus !== "ALL")
    input.stockStatus = filters.stockStatus as QueryStockStatus;
  if (filters.ageBracket !== "ALL")
    input.ageBracket = filters.ageBracket as QueryAgeBracket;
  if (filters.batchId) input.batchId = filters.batchId;

  return input;
}

// ============================================================================
// Sub-components
// ============================================================================

function FilterSection({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

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

  const update = (patch: Partial<InventoryFilterState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const toggleArrayValue = (
    key: keyof Pick<
      InventoryFilterState,
      | "statuses"
      | "categories"
      | "subcategories"
      | "suppliers"
      | "brands"
      | "grades"
    >,
    value: string
  ) => {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    update({ [key]: next });
  };

  return (
    <div className="border-b bg-muted/30 px-4 py-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Filters</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onFiltersChange(createDefaultInventoryFilters())}
          >
            Clear All
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Close filters"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
        {/* 1. Status */}
        <FilterSection label="Status">
          <div className="flex flex-col gap-1">
            {STATUS_OPTIONS.map(status => (
              <label
                key={status}
                className="flex cursor-pointer items-center gap-2 text-xs"
              >
                <Checkbox
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={() => toggleArrayValue("statuses", status)}
                  aria-label={STATUS_LABELS[status]}
                />
                <span>{STATUS_LABELS[status]}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* 2. Category */}
        <FilterSection label="Category">
          <Select
            value={filters.categories[0] ?? "__all__"}
            onValueChange={val =>
              update({ categories: val === "__all__" ? [] : [val] })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {categoryOptions.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>

        {/* 3. Subcategory — only if options provided */}
        {subcategoryOptions.length > 0 && (
          <FilterSection label="Subcategory">
            <Select
              value={filters.subcategories[0] ?? "__all__"}
              onValueChange={val =>
                update({ subcategories: val === "__all__" ? [] : [val] })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="All subcategories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All subcategories</SelectItem>
                {subcategoryOptions.map(sub => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterSection>
        )}

        {/* 4. Stock Level */}
        <FilterSection label="Stock Level">
          <Select
            value={filters.stockLevel}
            onValueChange={val => update({ stockLevel: val })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>

        {/* 5. Supplier */}
        {supplierOptions.length > 0 && (
          <FilterSection label="Supplier">
            <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
              {supplierOptions.map(s => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 text-xs"
                >
                  <Checkbox
                    checked={filters.suppliers.includes(s.id)}
                    onCheckedChange={() => toggleArrayValue("suppliers", s.id)}
                    aria-label={s.name}
                  />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* 6. Brand */}
        {brandOptions.length > 0 && (
          <FilterSection label="Brand">
            <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
              {brandOptions.map(b => (
                <label
                  key={b.id}
                  className="flex cursor-pointer items-center gap-2 text-xs"
                >
                  <Checkbox
                    checked={filters.brands.includes(b.id)}
                    onCheckedChange={() => toggleArrayValue("brands", b.id)}
                    aria-label={b.name}
                  />
                  <span>{b.name}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* 7. Grade */}
        {gradeOptions.length > 0 && (
          <FilterSection label="Grade">
            <div className="flex flex-col gap-1">
              {gradeOptions.map(g => (
                <label
                  key={g}
                  className="flex cursor-pointer items-center gap-2 text-xs"
                >
                  <Checkbox
                    checked={filters.grades.includes(g)}
                    onCheckedChange={() => toggleArrayValue("grades", g)}
                    aria-label={g}
                  />
                  <span>{g}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* 8. Date Range */}
        <FilterSection label="Date Range">
          <div className="flex flex-col gap-1">
            <Input
              type="date"
              className="h-7 text-xs"
              placeholder="From"
              value={filters.dateFrom}
              onChange={e => update({ dateFrom: e.target.value })}
              aria-label="Date from"
            />
            <Input
              type="date"
              className="h-7 text-xs"
              placeholder="To"
              value={filters.dateTo}
              onChange={e => update({ dateTo: e.target.value })}
              aria-label="Date to"
            />
          </div>
        </FilterSection>

        {/* 9. Location */}
        <FilterSection label="Location">
          <Input
            className="h-7 text-xs"
            placeholder="e.g. Vault A"
            value={filters.location}
            onChange={e => update({ location: e.target.value })}
          />
        </FilterSection>

        {/* 10. COGS Range */}
        <FilterSection label="COGS Range">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              className="h-7 text-xs"
              placeholder="Min"
              value={filters.cogsMin}
              onChange={e => update({ cogsMin: e.target.value })}
              aria-label="COGS min"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              className="h-7 text-xs"
              placeholder="Max"
              value={filters.cogsMax}
              onChange={e => update({ cogsMax: e.target.value })}
              aria-label="COGS max"
            />
          </div>
        </FilterSection>

        {/* 11. Stock Status */}
        <FilterSection label="Stock Status">
          <Select
            value={filters.stockStatus}
            onValueChange={val => update({ stockStatus: val })}
          >
            <SelectTrigger className="h-7 text-xs">
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
        </FilterSection>

        {/* 12. Age Bracket */}
        <FilterSection label="Age Bracket">
          <Select
            value={filters.ageBracket}
            onValueChange={val => update({ ageBracket: val })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="FRESH">Fresh (0–7d)</SelectItem>
              <SelectItem value="MODERATE">Moderate (8–14d)</SelectItem>
              <SelectItem value="AGING">Aging (15–30d)</SelectItem>
              <SelectItem value="CRITICAL">Critical (30+d)</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>

        {/* 13. Batch ID */}
        <FilterSection label="Batch ID">
          <Input
            className="h-7 text-xs"
            placeholder="e.g. BATCH-0042"
            value={filters.batchId}
            onChange={e => update({ batchId: e.target.value })}
          />
        </FilterSection>

        {/* Note: Payment Status filter requires server-side support (inventory.getEnhanced doesn't accept paymentStatus). Tracked as future enhancement. */}
      </div>
    </div>
  );
}
