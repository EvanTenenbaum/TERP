export interface PurchaseOrderCategoryRecord {
  id: number;
  name: string;
}

export interface PurchaseOrderSubcategoryRecord {
  id: number;
  categoryId: number;
  name: string;
}

export const FALLBACK_PURCHASE_ORDER_CATEGORY_OPTIONS = [
  { value: "Flower", label: "Flower" },
  { value: "Deps", label: "Deps" },
  { value: "Concentrate", label: "Concentrate" },
  { value: "Edible", label: "Edible" },
  { value: "PreRoll", label: "Pre-Roll" },
  { value: "Vape", label: "Vape" },
  { value: "Other", label: "Other" },
] as const;

const FALLBACK_PURCHASE_ORDER_SUBCATEGORY_OPTIONS: Record<string, string[]> = {
  Flower: [
    "Tops/Colas",
    "Smalls/Popcorn",
    "Trim",
    "Shake",
    "Larf",
    "Machine Trim",
    "Hand Trim",
    "Outdoor",
    "Deps",
    "Indoor",
  ],
  Deps: ["Deps"],
  Concentrate: [
    "Shatter",
    "Wax",
    "Live Resin",
    "Rosin",
    "Diamonds",
    "Distillate",
    "Crumble",
    "Budder",
  ],
  Edible: ["Gummies", "Chocolates", "Beverages", "Baked Goods"],
  PreRoll: ["Single", "Multi-Pack", "Infused"],
  Vape: ["Cartridge", "All in One"],
  Other: [],
};

export function buildPurchaseOrderCategoryOptions(
  categoriesData?: PurchaseOrderCategoryRecord[] | null
) {
  if (categoriesData && categoriesData.length > 0) {
    return categoriesData.map(category => ({
      value: category.name,
      label: category.name,
    }));
  }

  return [...FALLBACK_PURCHASE_ORDER_CATEGORY_OPTIONS];
}

export function getPurchaseOrderSubcategoryOptions(
  categoryName: string,
  categoriesData?: PurchaseOrderCategoryRecord[] | null,
  subcategoriesData?: PurchaseOrderSubcategoryRecord[] | null
) {
  if (!categoryName) {
    return [];
  }

  const categoryId = categoriesData?.find(
    category => category.name === categoryName
  )?.id;

  if (categoryId && subcategoriesData && subcategoriesData.length > 0) {
    return subcategoriesData
      .filter(subcategory => subcategory.categoryId === categoryId)
      .map(subcategory => subcategory.name);
  }

  return FALLBACK_PURCHASE_ORDER_SUBCATEGORY_OPTIONS[categoryName] ?? [];
}

export function normalizePurchaseOrderSubcategory(
  subcategory: string,
  allowedSubcategories: string[]
) {
  if (!subcategory) {
    return "";
  }

  if (allowedSubcategories.length === 0) {
    return "";
  }

  return allowedSubcategories.includes(subcategory) ? subcategory : "";
}
