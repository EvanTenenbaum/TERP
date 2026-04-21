/**
 * useTableUrlState
 *
 * Generic hook for syncing table state (filters, sort, pagination) to URL search params.
 * Enables shareable links and state persistence across page refresh and browser navigation.
 *
 * Usage:
 * ```tsx
 * const { filters, setFilters, sort, setSort, page, setPage } = useTableUrlState({
 *   defaultFilters: { search: "", status: [] },
 *   defaultSort: { field: "createdAt", order: "desc" },
 *   defaultPage: 1,
 * });
 * ```
 *
 * TER-1212: URL-persist table state (filters/sort/pagination)
 */

import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";

// ============================================================================
// Types
// ============================================================================

export interface TableSort {
  field: string;
  order: "asc" | "desc";
}

export interface UseTableUrlStateOptions<TFilters extends Record<string, unknown>> {
  defaultFilters?: TFilters;
  defaultSort?: TableSort;
  defaultPage?: number;
  defaultPageSize?: number;
}

export interface UseTableUrlStateReturn<TFilters extends Record<string, unknown>> {
  filters: TFilters;
  setFilters: (filters: TFilters | ((prev: TFilters) => TFilters)) => void;
  sort: TableSort | null;
  setSort: (sort: TableSort | null) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  resetAllState: () => void;
}

// ============================================================================
// Serialization helpers
// ============================================================================

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.join(",");
  return JSON.stringify(value);
}

function deserializeValue(value: string, defaultValue: unknown): unknown {
  if (!value) return defaultValue;
  
  // Handle arrays
  if (Array.isArray(defaultValue)) {
    return value ? value.split(",").filter(Boolean) : defaultValue;
  }
  
  // Handle booleans
  if (typeof defaultValue === "boolean") {
    return value === "true";
  }
  
  // Handle numbers
  if (typeof defaultValue === "number") {
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  // Handle strings
  if (typeof defaultValue === "string") {
    return value;
  }
  
  // Try JSON parse for objects
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useTableUrlState<TFilters extends Record<string, unknown>>({
  defaultFilters = {} as TFilters,
  defaultSort,
  defaultPage = 1,
  defaultPageSize = 50,
}: UseTableUrlStateOptions<TFilters> = {}): UseTableUrlStateReturn<TFilters> {
  const [location, setLocation] = useLocation();
  const search = useSearch();

  // Parse URL params into state
  const urlState = useMemo(() => {
    const params = new URLSearchParams(search);
    
    // Parse filters
    const filters = { ...defaultFilters };
    for (const key in defaultFilters) {
      const paramValue = params.get(`f_${key}`);
      if (paramValue !== null) {
        filters[key] = deserializeValue(
          paramValue,
          defaultFilters[key]
        ) as TFilters[Extract<keyof TFilters, string>];
      }
    }
    
    // Parse sort
    const sortField = params.get("sort");
    const sortOrder = params.get("order");
    const sort: TableSort | null =
      sortField && (sortOrder === "asc" || sortOrder === "desc")
        ? { field: sortField, order: sortOrder }
        : defaultSort ?? null;
    
    // Parse pagination
    const pageParam = params.get("page");
    const page = pageParam ? Number(pageParam) : defaultPage;
    
    const pageSizeParam = params.get("pageSize");
    const pageSize = pageSizeParam ? Number(pageSizeParam) : defaultPageSize;
    
    return { filters, sort, page, pageSize };
  }, [search, defaultFilters, defaultSort, defaultPage, defaultPageSize]);

  // Update URL with new state (using replace to avoid polluting browser history)
  const updateUrl = useCallback(
    (updates: {
      filters?: TFilters;
      sort?: TableSort | null;
      page?: number;
      pageSize?: number;
    }) => {
      const params = new URLSearchParams(search);
      
      // Update filters
      if (updates.filters !== undefined) {
        // Clear old filter params
        for (const key in defaultFilters) {
          params.delete(`f_${key}`);
        }
        
        // Set new filter params (only if not default)
        for (const key in updates.filters) {
          const value = updates.filters[key];
          const defaultValue = defaultFilters[key];
          
          // Skip if equal to default value
          if (JSON.stringify(value) === JSON.stringify(defaultValue)) {
            continue;
          }
          
          const serialized = serializeValue(value);
          
          if (serialized) {
            params.set(`f_${key}`, serialized);
          }
        }
      }
      
      // Update sort
      if (updates.sort !== undefined) {
        if (updates.sort === null) {
          params.delete("sort");
          params.delete("order");
        } else {
          params.set("sort", updates.sort.field);
          params.set("order", updates.sort.order);
        }
      }
      
      // Update page
      if (updates.page !== undefined) {
        if (updates.page === defaultPage) {
          params.delete("page");
        } else {
          params.set("page", String(updates.page));
        }
      }
      
      // Update pageSize
      if (updates.pageSize !== undefined) {
        if (updates.pageSize === defaultPageSize) {
          params.delete("pageSize");
        } else {
          params.set("pageSize", String(updates.pageSize));
        }
      }
      
      const newSearch = params.toString();
      const newUrl = `${location.split("?")[0]}${newSearch ? `?${newSearch}` : ""}`;
      
      // Use replace to avoid polluting browser history
      window.history.replaceState({}, "", newUrl);
      setLocation(newUrl);
    },
    [
      search,
      location,
      setLocation,
      defaultFilters,
      defaultPage,
      defaultPageSize,
    ]
  );

  // Setters
  const setFilters = useCallback(
    (filtersOrUpdater: TFilters | ((prev: TFilters) => TFilters)) => {
      const newFilters =
        typeof filtersOrUpdater === "function"
          ? filtersOrUpdater(urlState.filters)
          : filtersOrUpdater;
      updateUrl({ filters: newFilters, page: defaultPage }); // Reset to page 1 when filters change
    },
    [urlState.filters, updateUrl, defaultPage]
  );

  const setSort = useCallback(
    (sort: TableSort | null) => {
      updateUrl({ sort, page: defaultPage }); // Reset to page 1 when sort changes
    },
    [updateUrl, defaultPage]
  );

  const setPage = useCallback(
    (page: number) => {
      updateUrl({ page });
    },
    [updateUrl]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      updateUrl({ pageSize, page: defaultPage }); // Reset to page 1 when page size changes
    },
    [updateUrl, defaultPage]
  );

  const resetAllState = useCallback(() => {
    updateUrl({
      filters: defaultFilters,
      sort: defaultSort ?? null,
      page: defaultPage,
      pageSize: defaultPageSize,
    });
  }, [updateUrl, defaultFilters, defaultSort, defaultPage, defaultPageSize]);

  return {
    filters: urlState.filters,
    setFilters,
    sort: urlState.sort,
    setSort,
    page: urlState.page,
    setPage,
    pageSize: urlState.pageSize,
    setPageSize,
    resetAllState,
  };
}
