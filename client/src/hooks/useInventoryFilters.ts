/**
 * useInventoryFilters Hook
 * Manages inventory filter state and logic
 * Honors explicit URL deep links but otherwise starts from a clean workspace.
 */

import { useState, useMemo } from "react";

export interface InventoryFilters {
  status: string[];
  category: string | null;
  subcategory: string | null;
  vendor: string[];
  brand: string[];
  grade: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  location: string | null;
  stockLevel: "all" | "in_stock" | "low_stock" | "out_of_stock";
  cogsRange: {
    min: number | null;
    max: number | null;
  };
  paymentStatus: string[];
  // Sprint 4 Track A: 4.A.2 ENH-001 - Enhanced filters
  stockStatus: "ALL" | "CRITICAL" | "LOW" | "OPTIMAL" | "OUT_OF_STOCK";
  ageBracket: "ALL" | "FRESH" | "MODERATE" | "AGING" | "CRITICAL";
  batchId: string | null;
}

export const defaultFilters: InventoryFilters = {
  status: [],
  category: null,
  subcategory: null,
  vendor: [],
  brand: [],
  grade: [],
  dateRange: {
    from: null,
    to: null,
  },
  location: null,
  stockLevel: "all",
  cogsRange: {
    min: null,
    max: null,
  },
  paymentStatus: [],
  // Sprint 4 Track A: 4.A.2 ENH-001 - Enhanced filters
  stockStatus: "ALL",
  ageBracket: "ALL",
  batchId: null,
};

export function useInventoryFilters() {
  // Deep links may pre-seed filters, but routine entry should stay clean.
  const getInitialFilters = (): InventoryFilters => {
    const params = new URLSearchParams(window.location.search);
    const hasUrlParams =
      params.has("stockLevel") ||
      params.has("status") ||
      params.has("category") ||
      params.has("stockStatus") ||
      params.has("ageBracket") ||
      params.has("batchId");

    // If URL params exist, use those (for deep linking)
    if (hasUrlParams) {
      const initialFilters = { ...defaultFilters };

      // Check for stockLevel parameter (from data cards)
      const stockLevel = params.get("stockLevel");
      if (
        stockLevel &&
        ["in_stock", "low_stock", "out_of_stock"].includes(stockLevel)
      ) {
        initialFilters.stockLevel =
          stockLevel as InventoryFilters["stockLevel"];
      }

      // Check for status parameter
      const status = params.get("status");
      if (status) {
        initialFilters.status = status.split(",");
      }

      // Check for category parameter
      const category = params.get("category");
      if (category) {
        initialFilters.category = category;
      }

      const stockStatus = params.get("stockStatus");
      if (
        stockStatus &&
        ["CRITICAL", "LOW", "OPTIMAL", "OUT_OF_STOCK"].includes(stockStatus)
      ) {
        initialFilters.stockStatus =
          stockStatus as InventoryFilters["stockStatus"];
      }

      const ageBracket = params.get("ageBracket");
      if (
        ageBracket &&
        ["FRESH", "MODERATE", "AGING", "CRITICAL"].includes(ageBracket)
      ) {
        initialFilters.ageBracket =
          ageBracket as InventoryFilters["ageBracket"];
      }

      const batchId = params.get("batchId");
      if (batchId?.trim()) {
        initialFilters.batchId = batchId.trim();
      }

      return initialFilters;
    }

    return defaultFilters;
  };

  const [filters, setFilters] = useState<InventoryFilters>(getInitialFilters);

  const updateFilter = <K extends keyof InventoryFilters>(
    key: K,
    value: InventoryFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters(defaultFilters);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status.length > 0 ||
      filters.category !== null ||
      filters.subcategory !== null ||
      filters.vendor.length > 0 ||
      filters.brand.length > 0 ||
      filters.grade.length > 0 ||
      filters.dateRange.from !== null ||
      filters.dateRange.to !== null ||
      filters.location !== null ||
      filters.stockLevel !== "all" ||
      filters.cogsRange.min !== null ||
      filters.cogsRange.max !== null ||
      filters.paymentStatus.length > 0 ||
      // Sprint 4 Track A: 4.A.2 ENH-001 - Enhanced filters
      filters.stockStatus !== "ALL" ||
      filters.ageBracket !== "ALL" ||
      filters.batchId !== null
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.category) count++;
    if (filters.subcategory) count++;
    if (filters.vendor.length > 0) count++;
    if (filters.brand.length > 0) count++;
    if (filters.grade.length > 0) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.location) count++;
    if (filters.stockLevel !== "all") count++;
    if (filters.cogsRange.min !== null || filters.cogsRange.max !== null)
      count++;
    if (filters.paymentStatus.length > 0) count++;
    // Sprint 4 Track A: 4.A.2 ENH-001 - Enhanced filters
    if (filters.stockStatus !== "ALL") count++;
    if (filters.ageBracket !== "ALL") count++;
    if (filters.batchId) count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
