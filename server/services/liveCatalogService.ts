/**
 * Live Catalog Service
 *
 * Business logic for the VIP Portal Live Catalog feature.
 * Handles inventory filtering, pricing, and change detection.
 *
 * SPRINT-A: Updated to use structured Pino logging (Task 5)
 */

import { getDb } from "../db";
import { batches, products, productMedia } from "../../drizzle/schema";
import { vipPortalConfigurations, clientDraftInterests } from "../../drizzle/schema-vip-portal";
import { eq, and, or, inArray, notInArray, gte, lte, like, sql, desc, asc, isNull } from "drizzle-orm";
import * as pricingEngine from "../pricingEngine";
import { vipPortalLogger } from "../_core/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface CatalogItem {
  batchId: number;
  itemName: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  grade?: string;
  date?: Date;
  retailPrice: string;
  basePrice?: string;
  markup?: string;
  quantity?: string;
  stockLevel: 'in_stock' | 'low_stock' | 'out_of_stock';
  inDraft: boolean;
  imageUrl?: string; // Primary product image URL
}

export interface CatalogFilters {
  category?: string;
  brand?: string[];
  grade?: string[];
  stockLevel?: 'all' | 'in_stock' | 'low_stock';
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sortBy?: 'name' | 'price' | 'category' | 'date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface FilterOptions {
  categories: Array<{ id: number; name: string }>;
  brands: string[];
  grades: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get brand name from inventory item
 */
function getBrandName(item: { vendor?: string; category?: string }): string | undefined {
  // Brand info may come from vendor field or be derived from product data
  return item.vendor ?? undefined;
}

/**
 * Get date from inventory item (creation or intake date)
 */
function getItemDate(item: { id: number }): Date | undefined {
  // Date would come from batch creation - for now return undefined
  // In a full implementation, this would be batch.createdAt or batch.intakeDate
  return undefined;
}

// ============================================================================
// CATALOG QUERY
// ============================================================================

/**
 * Get filtered catalog with personalized pricing
 */
export async function getCatalog(
  clientId: number,
  filters: CatalogFilters
): Promise<{ items: CatalogItem[]; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get client configuration
  const config = await db.query.vipPortalConfigurations.findFirst({
    where: eq(vipPortalConfigurations.clientId, clientId),
  });

  if (!config || !config.moduleLiveCatalogEnabled) {
    return { items: [], total: 0 };
  }

  const liveCatalogConfig = (config.featuresConfig as { liveCatalog?: { visibleCategories?: number[]; hiddenItems?: number[]; visibleItems?: number[]; showBasePrice?: boolean; showMarkup?: boolean; showQuantity?: boolean } } | undefined)?.liveCatalog;

  // Build WHERE clause for batches
  const conditions = [
    inArray(batches.batchStatus, ["LIVE", "PHOTOGRAPHY_COMPLETE"]),
  ];

  // Apply visibility filters from configuration
  if (liveCatalogConfig?.visibleCategories && liveCatalogConfig.visibleCategories.length > 0) {
    // If specific categories are visible, filter by them
    // Note: This requires joining with products to get category
  }

  if (liveCatalogConfig?.hiddenItems && liveCatalogConfig.hiddenItems.length > 0) {
    // Exclude hidden items
    // SQL Safety: Use parameterized notInArray instead of raw SQL join
    conditions.push(notInArray(batches.id, liveCatalogConfig.hiddenItems));
  }

  if (liveCatalogConfig?.visibleItems && liveCatalogConfig.visibleItems.length > 0) {
    // If specific items are visible, only show those
    conditions.push(inArray(batches.id, liveCatalogConfig.visibleItems));
  }

  // Apply user filters
  if (filters.grade && filters.grade.length > 0) {
    conditions.push(inArray(batches.grade, filters.grade));
  }

  if (filters.stockLevel && filters.stockLevel !== 'all') {
    if (filters.stockLevel === 'in_stock') {
      conditions.push(sql`CAST(${batches.onHandQty} AS DECIMAL) > 10`);
    } else if (filters.stockLevel === 'low_stock') {
      conditions.push(sql`CAST(${batches.onHandQty} AS DECIMAL) > 0 AND CAST(${batches.onHandQty} AS DECIMAL) <= 10`);
    }
  }

  // Query batches with products
  const batchesWithProducts = await db
    .select({
      batch: batches,
      product: products,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .where(and(...conditions))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  // Apply category filter (after join)
  let filteredBatches = batchesWithProducts;
  if (filters.category) {
    filteredBatches = filteredBatches.filter(
      item => item.product?.category === filters.category
    );
  }

  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredBatches = filteredBatches.filter(item => {
      const sku = item.batch.sku?.toLowerCase() || '';
      const productName = item.product?.nameCanonical?.toLowerCase() || '';
      return sku.includes(searchLower) || productName.includes(searchLower);
    });
  }

  // Get client pricing rules
  const clientRules = await pricingEngine.getClientPricingRules(clientId);

  // Get draft items for this client
  const draftItems = await db.query.clientDraftInterests.findMany({
    where: eq(clientDraftInterests.clientId, clientId),
  });
  const draftBatchIds = new Set(draftItems.map(d => d.batchId));

  // Get product images for all products in the result set
  const productIds = filteredBatches
    .map(({ product }) => product?.id)
    .filter((id): id is number => id !== undefined && id !== null);
  
  const productImagesMap = new Map<number, string>();
  if (productIds.length > 0) {
    const productImages = await db
      .select({
        productId: productMedia.productId,
        url: productMedia.url,
      })
      .from(productMedia)
      .where(
        and(
          inArray(productMedia.productId, productIds),
          eq(productMedia.type, "image"),
          isNull(productMedia.deletedAt)
        )
      );
    
    // Store first image for each product (primary image)
    for (const img of productImages) {
      if (!productImagesMap.has(img.productId)) {
        productImagesMap.set(img.productId, img.url);
      }
    }
  }

  // Convert to inventory items format for pricing (include productId for image lookup)
  const inventoryItems = filteredBatches.map(({ batch, product }) => ({
    id: batch.id,
    productId: product?.id,
    name: batch.sku || `Batch #${batch.id}`,
    category: product?.category,
    subcategory: product?.subcategory ?? undefined,
    strain: undefined,
    basePrice: parseFloat(batch.unitCogs || '0'),
    quantity: parseFloat(batch.onHandQty || '0'),
    grade: batch.grade || undefined,
    vendor: undefined,
  }));

  // Calculate retail prices
  let pricedItems;
  try {
    pricedItems = await pricingEngine.calculateRetailPrices(inventoryItems, clientRules);
  } catch (error) {
    // SPRINT-A: Use structured logging instead of console.error
    vipPortalLogger.operationFailure("calculateRetailPrices", error, {
      clientId,
      itemCount: inventoryItems.length,
    });
    // Fallback: use base prices
    pricedItems = inventoryItems.map(item => ({
      ...item,
      retailPrice: item.basePrice,
      priceMarkup: 0,
      appliedRules: [],
    }));
  }

  // Apply price range filter
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    pricedItems = pricedItems.filter(item => {
      const price = item.retailPrice;
      if (filters.priceMin !== undefined && price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && price > filters.priceMax) return false;
      return true;
    });
  }

  // Sort items
  if (filters.sortBy) {
    pricedItems.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.retailPrice - b.retailPrice;
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'date':
          // Batches don't have a date field, use ID as proxy
          comparison = a.id - b.id;
          break;
      }
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  // Calculate total count before pagination filters
  const totalCount = pricedItems.length;

  // Convert to catalog items
  const catalogItems: CatalogItem[] = pricedItems.map(item => {
    const quantity = item.quantity || 0;
    let stockLevel: 'in_stock' | 'low_stock' | 'out_of_stock' = 'out_of_stock';
    if (quantity > 10) stockLevel = 'in_stock';
    else if (quantity > 0) stockLevel = 'low_stock';

    // Get image URL from the map using productId
    const imageUrl = item.productId ? productImagesMap.get(item.productId) : undefined;

    return {
      batchId: item.id,
      itemName: item.name,
      category: item.category,
      subcategory: item.subcategory ?? undefined,
      brand: getBrandName(item),
      grade: item.grade,
      date: getItemDate(item),
      retailPrice: item.retailPrice.toFixed(2),
      basePrice: liveCatalogConfig?.showBasePrice ? item.basePrice.toFixed(2) : undefined,
      markup: liveCatalogConfig?.showMarkup ? item.priceMarkup.toFixed(2) : undefined,
      quantity: liveCatalogConfig?.showQuantity ? quantity.toFixed(2) : undefined,
      stockLevel,
      inDraft: draftBatchIds.has(item.id),
      imageUrl,
    };
  });

  return {
    items: catalogItems,
    total: totalCount,
  };
}

/**
 * Get available filter options based on visible inventory
 */
export async function getFilterOptions(clientId: number): Promise<FilterOptions> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get client configuration
  const config = await db.query.vipPortalConfigurations.findFirst({
    where: eq(vipPortalConfigurations.clientId, clientId),
  });

  if (!config || !config.moduleLiveCatalogEnabled) {
    return {
      categories: [],
      brands: [],
      grades: [],
      priceRange: { min: 0, max: 0 },
    };
  }

  // Query distinct values from visible inventory
  const batchesWithProducts = await db
    .select({
      batch: batches,
      product: products,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .where(inArray(batches.batchStatus, ["LIVE", "PHOTOGRAPHY_COMPLETE"]));

  // Extract unique categories
  const categoryMap = new Map<string, number>();
  batchesWithProducts.forEach(({ product }) => {
    if (product?.category) {
      if (!categoryMap.has(product.category)) {
        categoryMap.set(product.category, categoryMap.size + 1);
      }
    }
  });

  const categories = Array.from(categoryMap.entries()).map(([name, id]) => ({ id, name }));

  // Extract unique brands (TODO: implement when brand data is available)
  const brands: string[] = [];

  // Extract unique grades
  const gradeSet = new Set<string>();
  batchesWithProducts.forEach(({ batch }) => {
    if (batch.grade) gradeSet.add(batch.grade);
  });
  const grades = Array.from(gradeSet);

  // Calculate price range (TODO: implement with pricing engine)
  const priceRange = { min: 0, max: 1000 };

  return {
    categories,
    brands,
    grades,
    priceRange,
  };
}

// ============================================================================
// CHANGE DETECTION
// ============================================================================

/**
 * Compare current batch state with snapshot data
 */
export function detectChanges(
  currentPrice: number,
  currentQuantity: number | null,
  currentlyAvailable: boolean,
  snapshotPrice: number,
  snapshotQuantity: number | null
): {
  priceChanged: boolean;
  quantityChanged: boolean;
  stillAvailable: boolean;
} {
  return {
    priceChanged: Math.abs(currentPrice - snapshotPrice) > 0.01,
    quantityChanged: currentQuantity !== snapshotQuantity,
    stillAvailable: currentlyAvailable,
  };
}
