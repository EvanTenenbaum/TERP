import {
  DEFAULT_FILTERS as DEFAULT_SALES_FILTERS,
  type InventoryFilters as SalesInventoryFilters,
} from "@/components/sales/types";
import type { InventoryFilters as InventorySavedFilters } from "@/hooks/useInventoryFilters";

export function adaptInventorySavedViewToSalesFilters(
  savedFilters: Partial<InventorySavedFilters>
): SalesInventoryFilters {
  return {
    ...DEFAULT_SALES_FILTERS,
    categories: savedFilters.category ? [savedFilters.category] : [],
    brands: savedFilters.brand ?? [],
    grades: savedFilters.grade ?? [],
    vendors: savedFilters.vendor ?? [],
    inStockOnly:
      savedFilters.stockLevel === "in_stock" ||
      savedFilters.stockLevel === "low_stock",
  };
}

export function shouldIncludeUnavailableInventory(
  savedFilters: Partial<InventorySavedFilters>
): boolean {
  const activeStatuses = savedFilters.status ?? [];
  if (activeStatuses.length === 0) {
    return true;
  }

  return activeStatuses.some(status => status !== "LIVE");
}
