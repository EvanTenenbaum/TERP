/**
 * QA-W2-009: Unit tests for useInventoryFilters hook
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInventoryFilters, defaultFilters } from "./useInventoryFilters";

describe("useInventoryFilters", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("initializes with default filters", () => {
      const { result } = renderHook(() => useInventoryFilters());

      expect(result.current.filters.status).toEqual([]);
      expect(result.current.filters.category).toBeNull();
      expect(result.current.filters.stockLevel).toBe("all");
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe("updateFilter", () => {
    it("updates a single filter value", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("category", "Concentrates");
      });

      expect(result.current.filters.category).toBe("Concentrates");
    });

    it("updates array filters", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("status", ["LIVE", "QUARANTINED"]);
      });

      expect(result.current.filters.status).toEqual(["LIVE", "QUARANTINED"]);
    });

    it("updates nested date range filter", () => {
      const { result } = renderHook(() => useInventoryFilters());
      const fromDate = new Date("2024-01-01");
      const toDate = new Date("2024-12-31");

      act(() => {
        result.current.updateFilter("dateRange", {
          from: fromDate,
          to: toDate,
        });
      });

      expect(result.current.filters.dateRange.from).toEqual(fromDate);
      expect(result.current.filters.dateRange.to).toEqual(toDate);
    });

    it("updates stock level filter", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("stockLevel", "out_of_stock");
      });

      expect(result.current.filters.stockLevel).toBe("out_of_stock");
    });
  });

  describe("clearAllFilters", () => {
    it("resets all filters to defaults", () => {
      const { result } = renderHook(() => useInventoryFilters());

      // Set some filters first
      act(() => {
        result.current.updateFilter("status", ["LIVE"]);
        result.current.updateFilter("category", "Flower");
        result.current.updateFilter("stockLevel", "low_stock");
      });

      expect(result.current.hasActiveFilters).toBe(true);

      // Clear all filters
      act(() => {
        result.current.clearAllFilters();
      });

      expect(result.current.filters).toEqual(defaultFilters);
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("hasActiveFilters", () => {
    it("returns false when no filters are active", () => {
      const { result } = renderHook(() => useInventoryFilters());
      expect(result.current.hasActiveFilters).toBe(false);
    });

    it("returns true when status filter is active", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("status", ["LIVE"]);
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when stockLevel is not 'all'", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("stockLevel", "in_stock");
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when date range is set", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("dateRange", {
          from: new Date("2024-01-01"),
          to: null,
        });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("returns true when COGS range is set", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("cogsRange", { min: 10, max: null });
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe("activeFilterCount", () => {
    it("returns 0 when no filters are active", () => {
      const { result } = renderHook(() => useInventoryFilters());
      expect(result.current.activeFilterCount).toBe(0);
    });

    it("counts each active filter category", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("status", ["LIVE"]);
        result.current.updateFilter("category", "Flower");
        result.current.updateFilter("stockLevel", "low_stock");
      });

      expect(result.current.activeFilterCount).toBe(3);
    });

    it("counts date range as single filter", () => {
      const { result } = renderHook(() => useInventoryFilters());

      act(() => {
        result.current.updateFilter("dateRange", {
          from: new Date("2024-01-01"),
          to: new Date("2024-12-31"),
        });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it("increments count for each filter type independently", () => {
      const { result } = renderHook(() => useInventoryFilters());

      // Start with 0
      expect(result.current.activeFilterCount).toBe(0);

      // Add vendor filter
      act(() => {
        result.current.updateFilter("vendor", ["Vendor A"]);
      });
      expect(result.current.activeFilterCount).toBe(1);

      // Add brand filter
      act(() => {
        result.current.updateFilter("brand", ["Brand X"]);
      });
      expect(result.current.activeFilterCount).toBe(2);
    });
  });
});
