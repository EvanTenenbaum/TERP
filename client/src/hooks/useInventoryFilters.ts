/**
 * useInventoryFilters Hook
 * Manages inventory filter state and logic
 */

import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";

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
};

export function useInventoryFilters() {
  const [location] = useLocation();
  
  // Initialize filters from URL parameters
  const getInitialFilters = (): InventoryFilters => {
    const params = new URLSearchParams(window.location.search);
    const initialFilters = { ...defaultFilters };
    
    // Check for stockLevel parameter (from data cards)
    const stockLevel = params.get('stockLevel');
    if (stockLevel && ['in_stock', 'low_stock', 'out_of_stock'].includes(stockLevel)) {
      initialFilters.stockLevel = stockLevel as any;
    }
    
    // Check for status parameter
    const status = params.get('status');
    if (status) {
      initialFilters.status = status.split(',');
    }
    
    // Check for category parameter
    const category = params.get('category');
    if (category) {
      initialFilters.category = category;
    }
    
    return initialFilters;
  };
  
  const [filters, setFilters] = useState<InventoryFilters>(getInitialFilters);

  const updateFilter = <K extends keyof InventoryFilters>(
    key: K,
    value: InventoryFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
      filters.paymentStatus.length > 0
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
    if (filters.cogsRange.min !== null || filters.cogsRange.max !== null) count++;
    if (filters.paymentStatus.length > 0) count++;
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

