/**
 * FilterChips Component
 * Displays active filters as removable chips
 * ENH-007: Uses dynamic Brand/Farmer terminology based on category filter
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { InventoryFilters } from "@/hooks/useInventoryFilters";
import { getBrandLabel } from "@/lib/nomenclature";

interface FilterChipsProps {
  filters: InventoryFilters;
  onRemoveFilter: (filterKey: keyof InventoryFilters, value?: string) => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemoveFilter, onClearAll }: FilterChipsProps) {
  const chips: Array<{ label: string; key: keyof InventoryFilters; value?: string }> = [];

  // Status filters
  filters.status.forEach((status) => {
    chips.push({
      label: `Status: ${status.replace(/_/g, " ")}`,
      key: "status",
      value: status,
    });
  });

  // Category filter
  if (filters.category) {
    chips.push({
      label: `Category: ${filters.category}`,
      key: "category",
    });
  }

  // Subcategory filter
  if (filters.subcategory) {
    chips.push({
      label: `Subcategory: ${filters.subcategory}`,
      key: "subcategory",
    });
  }

  // Vendor filters
  filters.vendor.forEach((vendor) => {
    chips.push({
      label: `Vendor: ${vendor}`,
      key: "vendor",
      value: vendor,
    });
  });

  // Brand/Farmer filters - ENH-007: Dynamic label based on category
  const brandLabel = getBrandLabel(filters.category);
  filters.brand.forEach((brand) => {
    chips.push({
      label: `${brandLabel}: ${brand}`,
      key: "brand",
      value: brand,
    });
  });

  // Grade filters
  filters.grade.forEach((grade) => {
    chips.push({
      label: `Grade: ${grade}`,
      key: "grade",
      value: grade,
    });
  });

  // Date range filter
  if (filters.dateRange.from || filters.dateRange.to) {
    const from = filters.dateRange.from?.toLocaleDateString() || "Start";
    const to = filters.dateRange.to?.toLocaleDateString() || "End";
    chips.push({
      label: `Date: ${from} - ${to}`,
      key: "dateRange",
    });
  }

  // Location filter
  if (filters.location) {
    chips.push({
      label: `Location: ${filters.location}`,
      key: "location",
    });
  }

  // Stock level filter
  if (filters.stockLevel !== "all") {
    chips.push({
      label: `Stock: ${filters.stockLevel.replace(/_/g, " ")}`,
      key: "stockLevel",
    });
  }

  // COGS range filter
  if (filters.cogsRange.min !== null || filters.cogsRange.max !== null) {
    const min = filters.cogsRange.min !== null ? `$${filters.cogsRange.min}` : "Min";
    const max = filters.cogsRange.max !== null ? `$${filters.cogsRange.max}` : "Max";
    chips.push({
      label: `COGS: ${min} - ${max}`,
      key: "cogsRange",
    });
  }

  // Payment status filters
  filters.paymentStatus.forEach((status) => {
    chips.push({
      label: `Payment: ${status}`,
      key: "paymentStatus",
      value: status,
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
      {chips.map((chip, index) => (
        <Badge
          key={`${chip.key}-${chip.value || 'no-value'}-${chip.label}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          {chip.label}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => onRemoveFilter(chip.key, chip.value)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs">
        Clear All
      </Button>
    </div>
  );
}

