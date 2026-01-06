/**
 * useInventoryFilters Hook
 * Manages inventory filter state and logic
 * CHAOS-023: Persists filter state to localStorage
 */

import { useState, useMemo, useEffect } from "react";

const STORAGE_KEY = "terp-inventory-filters";

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

/**
 * Load filters from localStorage
 */
function loadFiltersFromStorage(): Partial<InventoryFilters> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Convert date strings back to Date objects
    if (parsed.dateRange) {
      parsed.dateRange = {
        from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : null,
        to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : null,
      };
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save filters to localStorage
 */
function saveFiltersToStorage(filters: InventoryFilters): void {
  try {
    // Convert Date objects to ISO strings for storage
    const toStore = {
      ...filters,
      dateRange: {
        from: filters.dateRange.from?.toISOString() ?? null,
        to: filters.dateRange.to?.toISOString() ?? null,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}

export function useInventoryFilters() {
  // Initialize filters from URL parameters first, then localStorage
  const getInitialFilters = (): InventoryFilters => {
    const params = new URLSearchParams(window.location.search);
    const hasUrlParams = params.has('stockLevel') || params.has('status') || params.has('category');

    // If URL params exist, use those (for deep linking)
    if (hasUrlParams) {
      const initialFilters = { ...defaultFilters };

      // Check for stockLevel parameter (from data cards)
      const stockLevel = params.get('stockLevel');
      if (stockLevel && ['in_stock', 'low_stock', 'out_of_stock'].includes(stockLevel)) {
        initialFilters.stockLevel = stockLevel as InventoryFilters['stockLevel'];
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
    }

    // Otherwise, try to load from localStorage
    const storedFilters = loadFiltersFromStorage();
    if (storedFilters) {
      return { ...defaultFilters, ...storedFilters };
    }

    return defaultFilters;
  };

  const [filters, setFilters] = useState<InventoryFilters>(getInitialFilters);

  // Persist filters to localStorage whenever they change
  useEffect(() => {
    saveFiltersToStorage(filters);
  }, [filters]);

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

