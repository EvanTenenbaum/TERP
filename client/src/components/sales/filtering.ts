import type { InventoryFilters, PricedInventoryItem } from "./types";

export interface PortableSalesCut {
  clientId: number;
  filters: InventoryFilters;
  viewId?: number | null;
  viewName?: string | null;
}

export const PORTABLE_SALES_CUT_STORAGE_KEY = "salesCataloguePortableCut";

function includesIgnoreCase(haystack: string | undefined, needle: string) {
  return haystack?.toLowerCase().includes(needle) ?? false;
}

export function normalizeSalesFilters(
  filters?: Partial<InventoryFilters> | null
): InventoryFilters {
  return {
    search: filters?.search ?? "",
    categories: filters?.categories ?? [],
    brands: filters?.brands ?? [],
    grades: filters?.grades ?? [],
    priceMin: filters?.priceMin ?? null,
    priceMax: filters?.priceMax ?? null,
    strainFamilies: filters?.strainFamilies ?? [],
    vendors: filters?.vendors ?? [],
    inStockOnly: filters?.inStockOnly ?? false,
  };
}

export function matchesSalesInventoryFilters(
  item: Pick<
    PricedInventoryItem,
    | "name"
    | "category"
    | "subcategory"
    | "grade"
    | "vendor"
    | "brand"
    | "strain"
    | "strainFamily"
    | "batchSku"
    | "retailPrice"
    | "quantity"
  >,
  filters: InventoryFilters
) {
  const lower = filters.search.trim().toLowerCase();

  if (
    lower &&
    ![
      item.name,
      item.category,
      item.subcategory,
      item.vendor,
      item.brand,
      item.strain,
      item.strainFamily,
      item.batchSku,
    ].some(value => includesIgnoreCase(value ?? undefined, lower))
  ) {
    return false;
  }

  if (
    filters.categories.length > 0 &&
    !filters.categories.includes(item.category ?? "")
  ) {
    return false;
  }

  if (filters.brands.length > 0 && !filters.brands.includes(item.brand ?? "")) {
    return false;
  }

  if (filters.grades.length > 0 && !filters.grades.includes(item.grade ?? "")) {
    return false;
  }

  if (
    filters.vendors.length > 0 &&
    !filters.vendors.includes(item.vendor ?? "")
  ) {
    return false;
  }

  if (
    filters.strainFamilies.length > 0 &&
    !filters.strainFamilies.includes(item.strainFamily ?? item.strain ?? "")
  ) {
    return false;
  }

  if (
    filters.priceMin !== null &&
    Number.isFinite(filters.priceMin) &&
    item.retailPrice < filters.priceMin
  ) {
    return false;
  }

  if (
    filters.priceMax !== null &&
    Number.isFinite(filters.priceMax) &&
    item.retailPrice > filters.priceMax
  ) {
    return false;
  }

  if (filters.inStockOnly && item.quantity <= 0) {
    return false;
  }

  return true;
}

export function countActiveSalesFilters(filters: InventoryFilters) {
  let count = 0;
  if (filters.search) count++;
  if (filters.categories.length > 0) count++;
  if (filters.brands.length > 0) count++;
  if (filters.grades.length > 0) count++;
  if (filters.strainFamilies.length > 0) count++;
  if (filters.vendors.length > 0) count++;
  if (filters.priceMin !== null || filters.priceMax !== null) count++;
  if (filters.inStockOnly) count++;
  return count;
}

export function summarizeSalesFilters(filters: InventoryFilters): string[] {
  const summary: string[] = [];

  if (filters.search.trim()) {
    summary.push(`Search: ${filters.search.trim()}`);
  }
  summary.push(...filters.categories);
  summary.push(...filters.brands.map(brand => `Grower: ${brand}`));
  summary.push(...filters.grades.map(grade => `Grade: ${grade}`));
  summary.push(...filters.strainFamilies);
  summary.push(...filters.vendors.map(vendor => `Supplier: ${vendor}`));

  if (filters.priceMin !== null || filters.priceMax !== null) {
    summary.push(`$${filters.priceMin ?? 0}-$${filters.priceMax ?? "max"}`);
  }

  if (filters.inStockOnly) {
    summary.push("In stock only");
  }

  return summary;
}

export function readPortableSalesCut(): PortableSalesCut | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PORTABLE_SALES_CUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortableSalesCut;
    if (
      typeof parsed?.clientId !== "number" ||
      typeof parsed?.filters !== "object" ||
      parsed?.filters === null
    ) {
      return null;
    }
    return {
      ...parsed,
      filters: normalizeSalesFilters(parsed.filters),
    };
  } catch {
    return null;
  }
}

export function writePortableSalesCut(cut: PortableSalesCut) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    PORTABLE_SALES_CUT_STORAGE_KEY,
    JSON.stringify({
      ...cut,
      filters: normalizeSalesFilters(cut.filters),
    })
  );
}

export function clearPortableSalesCut() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PORTABLE_SALES_CUT_STORAGE_KEY);
}
