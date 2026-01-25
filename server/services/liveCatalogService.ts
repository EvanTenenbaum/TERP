/**
 * Live Catalog Service
 *
 * Business logic for the VIP Portal Live Catalog feature.
 * Handles inventory filtering, pricing, and change detection.
 *
 * SPRINT-A: Updated to use structured Pino logging (Task 5)
 */

import { getDb } from "../db";
import { batches, products, productMedia, brands } from "../../drizzle/schema";
import {
  vipPortalConfigurations,
  clientDraftInterests,
} from "../../drizzle/schema-vip-portal";
import { eq, and, inArray, notInArray, sql, isNull } from "drizzle-orm";
import * as pricingEngine from "../pricingEngine";
import { vipPortalLogger, logger } from "../_core/logger";

// ============================================================================
// CONSTANTS (BUG-513: Extract magic numbers)
// ============================================================================

/** Maximum batches to query for filter options */
const FILTER_OPTIONS_BATCH_LIMIT = 1000;

/** Threshold for low stock level indicator */
const STOCK_LEVEL_LOW_THRESHOLD = 10;

/** Cache TTL for filter options in milliseconds (5 minutes) */
const CACHE_TTL_MS = 300000;

/** Query timeout in milliseconds (30 seconds) */
const QUERY_TIMEOUT_MS = 30000;

/** Maximum allowed retail price */
const MAX_PRICE = 999999.99;

/** Maximum allowed markup multiplier (100x) */
const MAX_MARKUP_MULTIPLIER = 100;

/** Minimum allowed markup multiplier (0.01x) */
const MIN_MARKUP_MULTIPLIER = 0.01;

/** Maximum cache entries to prevent memory leak (P1-013 fix) */
const MAX_CACHE_ENTRIES = 10000;

// ============================================================================
// CACHE (BUG-508: Filter options cache with TTL)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const filterOptionsCache = new Map<number, CacheEntry<FilterOptions>>();

/**
 * Get cached filter options if still valid
 */
function getCachedFilterOptions(clientId: number): FilterOptions | null {
  const entry = filterOptionsCache.get(clientId);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    filterOptionsCache.delete(clientId);
    return null;
  }

  return entry.data;
}

/**
 * Set filter options in cache with LRU eviction when size limit exceeded
 * P1-013 FIX: Added max size limit to prevent memory leak
 */
function setCachedFilterOptions(clientId: number, data: FilterOptions): void {
  // Evict oldest entries if cache is at capacity
  if (filterOptionsCache.size >= MAX_CACHE_ENTRIES) {
    // Map maintains insertion order, so first key is oldest
    const firstKey = filterOptionsCache.keys().next().value;
    if (firstKey !== undefined) {
      filterOptionsCache.delete(firstKey);
    }
  }

  filterOptionsCache.set(clientId, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Clear cache entry for a client
 */
function clearFilterOptionsCache(clientId: number): void {
  filterOptionsCache.delete(clientId);
}

// ============================================================================
// TIMEOUT UTILITY (BUG-506: Query timeout protection)
// ============================================================================

/**
 * Wrap a promise with timeout protection
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
  context?: Record<string, unknown>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        logger.warn(
          { operationName, timeoutMs, ...context },
          `Operation timed out after ${timeoutMs}ms`
        );
        reject(
          new Error(
            `Operation '${operationName}' timed out after ${timeoutMs}ms`
          )
        );
      }
    }, timeoutMs);

    promise
      .then(result => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          resolve(result);
        }
      })
      .catch(error => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      });
  });
}

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
  stockLevel: "in_stock" | "low_stock" | "out_of_stock";
  inDraft: boolean;
  imageUrl?: string; // Primary product image URL
}

export interface CatalogFilters {
  category?: string;
  brand?: string[];
  grade?: string[];
  stockLevel?: "all" | "in_stock" | "low_stock";
  priceMin?: number;
  priceMax?: number;
  search?: string;
  sortBy?: "name" | "price" | "category" | "date";
  sortOrder?: "asc" | "desc";
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
function getBrandName(item: {
  vendor?: string;
  category?: string;
}): string | undefined {
  // Brand info may come from vendor field or be derived from product data
  return item.vendor ?? undefined;
}

/**
 * Get date from inventory item (creation or intake date)
 */
function getItemDate(_item: { id: number }): Date | undefined {
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
  // BUG-506: Wrap entire operation with timeout protection
  return withTimeout(
    getCatalogInternal(clientId, filters),
    QUERY_TIMEOUT_MS,
    "getCatalog",
    { clientId }
  );
}

/**
 * Internal implementation of getCatalog (wrapped with timeout)
 */
async function getCatalogInternal(
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

  const liveCatalogConfig = (
    config.featuresConfig as
      | {
          liveCatalog?: {
            visibleCategories?: number[];
            hiddenItems?: number[];
            visibleItems?: number[];
            showBasePrice?: boolean;
            showMarkup?: boolean;
            showQuantity?: boolean;
          };
        }
      | undefined
  )?.liveCatalog;

  // Build WHERE clause for batches
  const conditions = [
    inArray(batches.batchStatus, ["LIVE", "PHOTOGRAPHY_COMPLETE"]),
  ];

  // Apply visibility filters from configuration
  if (
    liveCatalogConfig?.visibleCategories &&
    liveCatalogConfig.visibleCategories.length > 0
  ) {
    // If specific categories are visible, filter by them
    // Note: This requires joining with products to get category
  }

  if (
    liveCatalogConfig?.hiddenItems &&
    liveCatalogConfig.hiddenItems.length > 0
  ) {
    // Exclude hidden items
    // SQL Safety: Use parameterized notInArray instead of raw SQL join
    conditions.push(notInArray(batches.id, liveCatalogConfig.hiddenItems));
  }

  if (
    liveCatalogConfig?.visibleItems &&
    liveCatalogConfig.visibleItems.length > 0
  ) {
    // If specific items are visible, only show those
    conditions.push(inArray(batches.id, liveCatalogConfig.visibleItems));
  }

  // Apply user filters
  if (filters.grade && filters.grade.length > 0) {
    conditions.push(inArray(batches.grade, filters.grade));
  }

  if (filters.stockLevel && filters.stockLevel !== "all") {
    if (filters.stockLevel === "in_stock") {
      conditions.push(
        sql`CAST(${batches.onHandQty} AS DECIMAL) > ${STOCK_LEVEL_LOW_THRESHOLD}`
      );
    } else if (filters.stockLevel === "low_stock") {
      conditions.push(
        sql`CAST(${batches.onHandQty} AS DECIMAL) > 0 AND CAST(${batches.onHandQty} AS DECIMAL) <= ${STOCK_LEVEL_LOW_THRESHOLD}`
      );
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
      const sku = item.batch.sku?.toLowerCase() || "";
      const productName = item.product?.nameCanonical?.toLowerCase() || "";
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
    basePrice: parseFloat(batch.unitCogs || "0"),
    quantity: parseFloat(batch.onHandQty || "0"),
    grade: batch.grade || undefined,
    vendor: undefined,
  }));

  // Calculate retail prices
  let pricedItems;
  try {
    pricedItems = await pricingEngine.calculateRetailPrices(
      inventoryItems,
      clientRules
    );
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
      if (filters.priceMin !== undefined && price < filters.priceMin)
        return false;
      if (filters.priceMax !== undefined && price > filters.priceMax)
        return false;
      return true;
    });
  }

  // Sort items
  if (filters.sortBy) {
    pricedItems.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "price":
          comparison = a.retailPrice - b.retailPrice;
          break;
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "");
          break;
        case "date":
          // Batches don't have a date field, use ID as proxy
          comparison = a.id - b.id;
          break;
      }
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });
  }

  // Calculate total count before pagination filters
  const totalCount = pricedItems.length;

  // Convert to catalog items
  const catalogItems: CatalogItem[] = pricedItems.map(item => {
    const quantity = item.quantity || 0;
    let stockLevel: "in_stock" | "low_stock" | "out_of_stock" = "out_of_stock";
    if (quantity > STOCK_LEVEL_LOW_THRESHOLD) stockLevel = "in_stock";
    else if (quantity > 0) stockLevel = "low_stock";

    // Get image URL from the map using productId
    const imageUrl = item.productId
      ? productImagesMap.get(item.productId)
      : undefined;

    return {
      batchId: item.id,
      itemName: item.name,
      category: item.category,
      subcategory: item.subcategory ?? undefined,
      brand: getBrandName(item),
      grade: item.grade,
      date: getItemDate(item),
      retailPrice: item.retailPrice.toFixed(2),
      basePrice: liveCatalogConfig?.showBasePrice
        ? item.basePrice.toFixed(2)
        : undefined,
      markup: liveCatalogConfig?.showMarkup
        ? item.priceMarkup.toFixed(2)
        : undefined,
      quantity: liveCatalogConfig?.showQuantity
        ? quantity.toFixed(2)
        : undefined,
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
export async function getFilterOptions(
  clientId: number
): Promise<FilterOptions> {
  // BUG-508: Check cache first
  const cached = getCachedFilterOptions(clientId);
  if (cached) {
    return cached;
  }

  // BUG-506: Wrap entire operation with timeout protection
  try {
    const result = await withTimeout(
      getFilterOptionsInternal(clientId),
      QUERY_TIMEOUT_MS,
      "getFilterOptions",
      { clientId }
    );
    // BUG-508: Cache successful results
    setCachedFilterOptions(clientId, result);
    return result;
  } catch (error) {
    // BUG-508: Clear cache entry on timeout/error
    clearFilterOptionsCache(clientId);
    throw error;
  }
}

/**
 * Internal implementation of getFilterOptions (wrapped with timeout)
 */
async function getFilterOptionsInternal(
  clientId: number
): Promise<FilterOptions> {
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

  // Query distinct values from visible inventory with brand info
  // Note: brands are associated with products, not batches directly
  // BUG-409: Limit to 1000 batches to prevent unbounded query performance issues
  // BUG-513: Use module-level constant
  const batchesWithProducts = await db
    .select({
      batch: batches,
      product: products,
      brand: brands,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(inArray(batches.batchStatus, ["LIVE", "PHOTOGRAPHY_COMPLETE"]))
    .limit(FILTER_OPTIONS_BATCH_LIMIT);

  // BUG-409: Log if we hit the limit (indicates filter options may be incomplete)
  if (batchesWithProducts.length >= FILTER_OPTIONS_BATCH_LIMIT) {
    logger.info(
      {
        clientId,
        batchCount: batchesWithProducts.length,
        limit: FILTER_OPTIONS_BATCH_LIMIT,
      },
      "Filter options query hit batch limit - some filter options may be incomplete"
    );
  }

  // Extract unique categories
  const categoryMap = new Map<string, number>();
  batchesWithProducts.forEach(({ product }) => {
    if (product?.category) {
      if (!categoryMap.has(product.category)) {
        categoryMap.set(product.category, categoryMap.size + 1);
      }
    }
  });

  const categories = Array.from(categoryMap.entries()).map(([name, id]) => ({
    id,
    name,
  }));

  // STUB-001: Extract unique brands from joined brand table
  const brandSet = new Set<string>();
  batchesWithProducts.forEach(({ brand }) => {
    if (brand?.name) {
      brandSet.add(brand.name);
    }
  });
  const extractedBrands = Array.from(brandSet).sort();

  // Extract unique grades
  const gradeSet = new Set<string>();
  batchesWithProducts.forEach(({ batch }) => {
    if (batch.grade) gradeSet.add(batch.grade);
  });
  const grades = Array.from(gradeSet);

  // STUB-002: Calculate actual price range from batch COGS with default margin
  // Uses a simplified calculation based on COGS with 30% default margin for filter UI
  let minPrice = Infinity;
  let maxPrice = 0;

  // BUG-308: Add error handling for pricing rules fetch
  let pricingRules: Awaited<
    ReturnType<typeof pricingEngine.getClientPricingRules>
  > = [];
  try {
    pricingRules = await pricingEngine.getClientPricingRules(clientId);
  } catch (error) {
    logger.warn(
      {
        clientId,
        error: error instanceof Error ? error.message : String(error),
      },
      "Failed to get pricing rules for filter calculation, using defaults"
    );
  }

  const defaultMargin = 0.3; // 30% default margin
  // BUG-311: Use consistent COGS threshold
  const COGS_THRESHOLD = 0.01;
  // BUG-324: Track skipped batches
  let skippedBatches = 0;

  for (const { batch } of batchesWithProducts) {
    const unitCogs = parseFloat(batch.unitCogs || "0");

    // BUG-311: Use consistent threshold check
    if (Number.isNaN(unitCogs) || unitCogs < COGS_THRESHOLD) {
      skippedBatches++;
      continue;
    }

    // Calculate estimated retail price
    // If client has pricing rules, use average markup from rules, otherwise use default
    let estimatedRetailPrice: number;

    if (pricingRules.length > 0) {
      // BUG-410: Process ALL pricing rules (markups AND markdowns) separately
      // BUG-411: Include MARKDOWN rules - discount clients see lower prices
      const markupRules = pricingRules.filter(
        r =>
          r.adjustmentType === "PERCENT_MARKUP" ||
          r.adjustmentType === "DOLLAR_MARKUP"
      );
      const markdownRules = pricingRules.filter(
        r =>
          r.adjustmentType === "PERCENT_MARKDOWN" ||
          r.adjustmentType === "DOLLAR_MARKDOWN"
      );

      if (markupRules.length > 0 || markdownRules.length > 0) {
        // BUG-309: Track valid rules for accurate calculation
        let totalMarkupPercent = 0;
        let markupCount = 0;
        let totalMarkdownPercent = 0;
        let markdownCount = 0;

        // Process markup rules
        for (const r of markupRules) {
          const val = parseFloat(r.adjustmentValue?.toString() || "0");
          if (Number.isNaN(val)) {
            logger.debug(
              { ruleId: r.id, adjustmentValue: r.adjustmentValue },
              "Skipping markup rule with invalid adjustmentValue"
            );
            continue;
          }

          if (r.adjustmentType === "PERCENT_MARKUP") {
            // BUG-410: PERCENT values are stored as whole numbers (30 = 30%)
            totalMarkupPercent += val / 100;
            markupCount++;
          } else {
            // DOLLAR_MARKUP: convert to percentage relative to COGS
            const dollarMarkupPercent = val / unitCogs;
            if (Number.isNaN(dollarMarkupPercent)) {
              logger.debug(
                { unitCogs, val },
                "Skipping DOLLAR_MARKUP due to NaN"
              );
              continue;
            }
            // Cap at 500% to prevent extreme values
            const cappedPercent = Math.min(dollarMarkupPercent, 5);
            if (dollarMarkupPercent > 5) {
              logger.debug(
                { unitCogs, val, originalPercent: dollarMarkupPercent },
                "Capped extreme DOLLAR_MARKUP at 500%"
              );
            }
            totalMarkupPercent += cappedPercent;
            markupCount++;
          }
        }

        // BUG-411: Process markdown rules (reduce price)
        for (const r of markdownRules) {
          const val = parseFloat(r.adjustmentValue?.toString() || "0");
          if (Number.isNaN(val)) {
            logger.debug(
              { ruleId: r.id, adjustmentValue: r.adjustmentValue },
              "Skipping markdown rule with invalid adjustmentValue"
            );
            continue;
          }

          if (r.adjustmentType === "PERCENT_MARKDOWN") {
            // PERCENT_MARKDOWN: 30 = 30% discount
            totalMarkdownPercent += val / 100;
            markdownCount++;
          } else {
            // DOLLAR_MARKDOWN: convert to percentage relative to COGS
            const dollarMarkdownPercent = val / unitCogs;
            if (Number.isNaN(dollarMarkdownPercent)) {
              logger.debug(
                { unitCogs, val },
                "Skipping DOLLAR_MARKDOWN due to NaN"
              );
              continue;
            }
            // Cap markdown at 100% (can't go below zero)
            totalMarkdownPercent += Math.min(dollarMarkdownPercent, 1);
            markdownCount++;
          }
        }

        // Calculate net price adjustment
        const avgMarkup =
          markupCount > 0 ? totalMarkupPercent / markupCount : defaultMargin;
        const avgMarkdown =
          markdownCount > 0 ? totalMarkdownPercent / markdownCount : 0;

        // Net multiplier: (1 + markup) * (1 - markdown)
        // BUG-504: Clamp multiplier to reasonable range to prevent overflow
        const rawMultiplier = (1 + avgMarkup) * (1 - avgMarkdown);
        const netMultiplier = Math.max(
          MIN_MARKUP_MULTIPLIER,
          Math.min(MAX_MARKUP_MULTIPLIER, rawMultiplier)
        );

        if (rawMultiplier !== netMultiplier) {
          logger.debug(
            { rawMultiplier, netMultiplier, avgMarkup, avgMarkdown },
            "Clamped extreme markup multiplier"
          );
        }

        estimatedRetailPrice = unitCogs * netMultiplier;
      } else {
        estimatedRetailPrice = unitCogs * (1 + defaultMargin);
      }
    } else {
      estimatedRetailPrice = unitCogs * (1 + defaultMargin);
    }

    // BUG-504: Clamp final price to max allowed value
    if (estimatedRetailPrice > MAX_PRICE) {
      logger.debug(
        {
          originalPrice: estimatedRetailPrice,
          clampedPrice: MAX_PRICE,
          unitCogs,
        },
        "Clamped extreme retail price to maximum"
      );
      estimatedRetailPrice = MAX_PRICE;
    }

    if (estimatedRetailPrice < minPrice) minPrice = estimatedRetailPrice;
    if (estimatedRetailPrice > maxPrice) maxPrice = estimatedRetailPrice;
  }

  // BUG-324: Log skipped batches summary
  if (skippedBatches > 0) {
    logger.info(
      { skippedBatches, clientId },
      "Batches skipped due to invalid COGS in filter calculation"
    );
  }

  // Handle case where no prices were found
  if (minPrice === Infinity) minPrice = 0;
  if (maxPrice === 0) maxPrice = 1000;

  // Round prices for cleaner UI
  const priceRange = {
    min: Math.floor(minPrice),
    max: Math.ceil(maxPrice),
  };

  return {
    categories,
    brands: extractedBrands,
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
