import { normalizePurchaseOrderSubcategory } from "@/components/work-surface/purchaseOrderCategoryOptions";

export interface PurchaseOrdersSliceFormItem {
  productId: string;
  category: string;
  subcategory: string;
  quantityOrdered: string;
  unitCost: string;
}

export interface PurchaseOrdersSliceProductRecord {
  id: number;
  category?: string | null;
  subcategory?: string | null;
}

export function applySliceProductSelection<T extends PurchaseOrdersSliceFormItem>(
  item: T,
  productId: string,
  product: PurchaseOrdersSliceProductRecord | undefined,
  getSubcategoryOptions: (categoryName: string) => string[]
): T {
  const nextCategory = product?.category ?? "";
  return {
    ...item,
    productId,
    category: nextCategory,
    subcategory: normalizePurchaseOrderSubcategory(
      product?.subcategory ?? "",
      getSubcategoryOptions(nextCategory)
    ),
  } as T;
}

export function applySliceCategorySelection<T extends PurchaseOrdersSliceFormItem>(
  item: T,
  category: string,
  getSubcategoryOptions: (categoryName: string) => string[]
): T {
  return {
    ...item,
    category,
    subcategory: normalizePurchaseOrderSubcategory(
      item.subcategory,
      getSubcategoryOptions(category)
    ),
  } as T;
}

export function buildSliceCreatePayloadItem(item: PurchaseOrdersSliceFormItem) {
  if (!item.productId || !item.quantityOrdered || !item.unitCost) {
    return null;
  }

  return {
    productId: Number(item.productId),
    category: item.category || undefined,
    subcategory: item.subcategory || undefined,
    quantityOrdered: Number(item.quantityOrdered),
    unitCost: Number(item.unitCost),
  };
}
