/**
 * Catalog Publishing Service
 *
 * Handles publishing batches to the live catalog for sale.
 * Manages the transition from "ready_for_sale" (PHOTOGRAPHY_COMPLETE) to "published" (LIVE with catalog entry).
 */

import { getDb } from "../db";
import { batches, products, productImages, productMedia, brands, strains } from "../../drizzle/schema";
import { eq, and, gt, inArray, isNull, desc } from "drizzle-orm";
import { logger } from "../_core/logger";
import { safeInArray } from "../lib/sqlSafety";

// ============================================================================
// TYPES
// ============================================================================

export interface CatalogEntry {
  batchId: number;
  batchCode: string;
  sku: string;
  productId: number;
  productName: string;
  category: string;
  subcategory?: string;
  brandName?: string;
  strainName?: string;
  availableQuantity: number;
  unitOfMeasure: string;
  primaryPhotoUrl?: string;
  photos: Array<{ url: string; isPrimary: boolean; caption?: string }>;
  grade?: string;
  publishedAt: Date;
  isActive: boolean;
}

export interface PublishResult {
  success: boolean;
  batchId: number;
  batchCode: string;
  message: string;
}

// ============================================================================
// PUBLISHING FUNCTIONS
// ============================================================================

/**
 * Publish a batch to the live catalog
 * Changes batch from PHOTOGRAPHY_COMPLETE to LIVE with publishB2b/publishEcom flags
 */
export async function publishBatchToCatalog(
  batchId: number,
  publishedById: number,
  options: {
    publishB2b?: boolean;
    publishEcom?: boolean;
  } = { publishB2b: true, publishEcom: true }
): Promise<PublishResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  logger.info({ batchId, publishedById }, "[Catalog] Publishing batch to catalog");

  // Get batch with related data
  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId));

  if (!batch) {
    return {
      success: false,
      batchId,
      batchCode: "",
      message: "Batch not found",
    };
  }

  // Validate batch is ready to publish (PHOTOGRAPHY_COMPLETE status)
  if (batch.batchStatus !== "PHOTOGRAPHY_COMPLETE") {
    return {
      success: false,
      batchId,
      batchCode: batch.code,
      message: `Batch cannot be published from ${batch.batchStatus} status. Photography must be completed first.`,
    };
  }

  // Check quantity is available
  const availableQty = parseFloat(batch.onHandQty || "0") - parseFloat(batch.reservedQty || "0");
  if (availableQty <= 0) {
    return {
      success: false,
      batchId,
      batchCode: batch.code,
      message: "Batch has no available quantity to publish",
    };
  }

  // Get photos - require at least one
  const photos = await db
    .select()
    .from(productImages)
    .where(eq(productImages.batchId, batchId));

  if (photos.length === 0) {
    return {
      success: false,
      batchId,
      batchCode: batch.code,
      message: "Batch must have at least one photo to publish",
    };
  }

  // Update batch to LIVE status with publish flags
  const metadata = batch.metadata ? JSON.parse(batch.metadata) : {};
  metadata.publishedAt = new Date().toISOString();
  metadata.publishedBy = publishedById;

  await db
    .update(batches)
    .set({
      batchStatus: "LIVE",
      publishB2b: options.publishB2b ? 1 : 0,
      publishEcom: options.publishEcom ? 1 : 0,
      metadata: JSON.stringify(metadata),
      updatedAt: new Date(),
    })
    .where(eq(batches.id, batchId));

  logger.info(
    { batchId, batchCode: batch.code, publishB2b: options.publishB2b, publishEcom: options.publishEcom },
    "[Catalog] Batch published to catalog"
  );

  return {
    success: true,
    batchId,
    batchCode: batch.code,
    message: "Batch published successfully",
  };
}

/**
 * Unpublish a batch from the catalog
 * Sets publishB2b and publishEcom to false but keeps LIVE status
 */
export async function unpublishBatchFromCatalog(batchId: number): Promise<PublishResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  logger.info({ batchId }, "[Catalog] Unpublishing batch from catalog");

  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId));

  if (!batch) {
    return {
      success: false,
      batchId,
      batchCode: "",
      message: "Batch not found",
    };
  }

  // Update publish flags
  const metadata = batch.metadata ? JSON.parse(batch.metadata) : {};
  metadata.unpublishedAt = new Date().toISOString();

  await db
    .update(batches)
    .set({
      publishB2b: 0,
      publishEcom: 0,
      metadata: JSON.stringify(metadata),
      updatedAt: new Date(),
    })
    .where(eq(batches.id, batchId));

  logger.info({ batchId, batchCode: batch.code }, "[Catalog] Batch unpublished");

  return {
    success: true,
    batchId,
    batchCode: batch.code,
    message: "Batch unpublished successfully",
  };
}

/**
 * Get batches ready for publishing (PHOTOGRAPHY_COMPLETE status)
 */
export async function getBatchesReadyForPublishing(
  limit: number = 50
): Promise<Array<{
  id: number;
  code: string;
  sku: string;
  productName: string;
  category: string;
  quantity: number;
  photoCount: number;
  createdAt: Date | null;
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const readyBatches = await db
    .select({
      id: batches.id,
      code: batches.code,
      sku: batches.sku,
      onHandQty: batches.onHandQty,
      reservedQty: batches.reservedQty,
      createdAt: batches.createdAt,
      productName: products.nameCanonical,
      category: products.category,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .where(
      and(
        eq(batches.batchStatus, "PHOTOGRAPHY_COMPLETE"),
        isNull(batches.deletedAt)
      )
    )
    .orderBy(desc(batches.createdAt))
    .limit(limit);

  // Get photo counts
  const batchIds = readyBatches.map(b => b.id);
  const photoCounts = new Map<number, number>();

  if (batchIds.length > 0) {
    const photos = await db
      .select({
        batchId: productImages.batchId,
      })
      .from(productImages)
      .where(safeInArray(productImages.batchId, batchIds));

    for (const photo of photos) {
      if (photo.batchId) {
        photoCounts.set(photo.batchId, (photoCounts.get(photo.batchId) || 0) + 1);
      }
    }
  }

  return readyBatches.map(b => ({
    id: b.id,
    code: b.code,
    sku: b.sku,
    productName: b.productName || "Unknown Product",
    category: b.category || "Unknown",
    quantity: parseFloat(b.onHandQty || "0") - parseFloat(b.reservedQty || "0"),
    photoCount: photoCounts.get(b.id) || 0,
    createdAt: b.createdAt,
  }));
}

/**
 * Get published catalog items (LIVE batches with publishB2b or publishEcom = 1)
 */
export async function getPublishedCatalog(options: {
  category?: string;
  search?: string;
  publishedFor?: "b2b" | "ecom" | "all";
  limit?: number;
  offset?: number;
}): Promise<{
  items: CatalogEntry[];
  total: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = options.limit || 50;
  const offset = options.offset || 0;

  // Build conditions
  const conditions = [
    eq(batches.batchStatus, "LIVE"),
    isNull(batches.deletedAt),
  ];

  // Filter by publish channel
  if (options.publishedFor === "b2b") {
    conditions.push(eq(batches.publishB2b, 1));
  } else if (options.publishedFor === "ecom") {
    conditions.push(eq(batches.publishEcom, 1));
  } else {
    // Default: at least one channel published
    // Note: Using a raw SQL condition for OR
  }

  // Get batches with product info
  const publishedBatches = await db
    .select({
      batch: batches,
      product: products,
      brand: brands,
      strain: strains,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(strains, eq(products.strainId, strains.id))
    .where(and(...conditions))
    .orderBy(desc(batches.updatedAt))
    .limit(limit)
    .offset(offset);

  // Apply search filter
  let filteredBatches = publishedBatches;
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filteredBatches = publishedBatches.filter(
      ({ batch, product, strain }) =>
        batch.sku?.toLowerCase().includes(searchLower) ||
        batch.code?.toLowerCase().includes(searchLower) ||
        product?.nameCanonical?.toLowerCase().includes(searchLower) ||
        strain?.name?.toLowerCase().includes(searchLower)
    );
  }

  // Apply category filter
  if (options.category) {
    filteredBatches = filteredBatches.filter(
      ({ product }) => product?.category === options.category
    );
  }

  // Get photos for all batches
  const batchIds = filteredBatches.map(({ batch }) => batch.id);
  const photoMap = new Map<number, Array<{ url: string; isPrimary: boolean; caption?: string }>>();

  if (batchIds.length > 0) {
    const photos = await db
      .select({
        batchId: productImages.batchId,
        imageUrl: productImages.imageUrl,
        isPrimary: productImages.isPrimary,
        caption: productImages.caption,
      })
      .from(productImages)
      .where(safeInArray(productImages.batchId, batchIds))
      .orderBy(desc(productImages.isPrimary), productImages.sortOrder);

    for (const photo of photos) {
      if (photo.batchId) {
        if (!photoMap.has(photo.batchId)) {
          photoMap.set(photo.batchId, []);
        }
        photoMap.get(photo.batchId)!.push({
          url: photo.imageUrl,
          isPrimary: photo.isPrimary || false,
          caption: photo.caption || undefined,
        });
      }
    }
  }

  // Build catalog entries
  const catalogItems: CatalogEntry[] = filteredBatches.map(({ batch, product, brand, strain }) => {
    const photos = photoMap.get(batch.id) || [];
    const primaryPhoto = photos.find(p => p.isPrimary);
    const metadata = batch.metadata ? JSON.parse(batch.metadata) : {};

    return {
      batchId: batch.id,
      batchCode: batch.code,
      sku: batch.sku,
      productId: batch.productId,
      productName: product?.nameCanonical || "Unknown Product",
      category: product?.category || "Unknown",
      subcategory: product?.subcategory || undefined,
      brandName: brand?.name || undefined,
      strainName: strain?.name || undefined,
      availableQuantity: parseFloat(batch.onHandQty || "0") - parseFloat(batch.reservedQty || "0"),
      unitOfMeasure: product?.uomSellable || "EA",
      primaryPhotoUrl: primaryPhoto?.url,
      photos,
      grade: batch.grade || undefined,
      publishedAt: metadata.publishedAt ? new Date(metadata.publishedAt) : batch.updatedAt || new Date(),
      isActive: batch.publishB2b === 1 || batch.publishEcom === 1,
    };
  });

  return {
    items: catalogItems,
    total: catalogItems.length,
  };
}

/**
 * Sync catalog quantities
 * Auto-unpublishes batches with no available quantity
 */
export async function syncCatalogQuantities(): Promise<{
  synced: number;
  unpublished: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  logger.info("[Catalog] Starting catalog quantity sync");

  // Get all published batches
  const publishedBatches = await db
    .select({
      id: batches.id,
      code: batches.code,
      onHandQty: batches.onHandQty,
      reservedQty: batches.reservedQty,
      publishB2b: batches.publishB2b,
      publishEcom: batches.publishEcom,
    })
    .from(batches)
    .where(
      and(
        eq(batches.batchStatus, "LIVE"),
        isNull(batches.deletedAt)
      )
    );

  let synced = 0;
  let unpublished = 0;

  for (const batch of publishedBatches) {
    const availableQty = parseFloat(batch.onHandQty || "0") - parseFloat(batch.reservedQty || "0");

    // If no available quantity and currently published, unpublish
    if (availableQty <= 0 && (batch.publishB2b === 1 || batch.publishEcom === 1)) {
      await db
        .update(batches)
        .set({
          publishB2b: 0,
          publishEcom: 0,
          batchStatus: "SOLD_OUT",
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batch.id));

      logger.info({ batchId: batch.id, batchCode: batch.code }, "[Catalog] Auto-unpublished sold out batch");
      unpublished++;
    }

    synced++;
  }

  logger.info({ synced, unpublished }, "[Catalog] Catalog sync complete");

  return { synced, unpublished };
}

/**
 * Bulk publish batches
 */
export async function bulkPublishBatches(
  batchIds: number[],
  publishedById: number,
  options: {
    publishB2b?: boolean;
    publishEcom?: boolean;
  } = { publishB2b: true, publishEcom: true }
): Promise<{
  successful: number;
  failed: number;
  results: PublishResult[];
}> {
  const results: PublishResult[] = [];
  let successful = 0;
  let failed = 0;

  for (const batchId of batchIds) {
    const result = await publishBatchToCatalog(batchId, publishedById, options);
    results.push(result);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  return { successful, failed, results };
}

/**
 * Get catalog statistics
 */
export async function getCatalogStats(): Promise<{
  totalPublished: number;
  publishedB2b: number;
  publishedEcom: number;
  readyToPublish: number;
  soldOut: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Count published B2B
  const [b2bCount] = await db
    .select({ count: batches.id })
    .from(batches)
    .where(
      and(
        eq(batches.batchStatus, "LIVE"),
        eq(batches.publishB2b, 1),
        isNull(batches.deletedAt)
      )
    );

  // Count published Ecom
  const [ecomCount] = await db
    .select({ count: batches.id })
    .from(batches)
    .where(
      and(
        eq(batches.batchStatus, "LIVE"),
        eq(batches.publishEcom, 1),
        isNull(batches.deletedAt)
      )
    );

  // Count ready to publish
  const [readyCount] = await db
    .select({ count: batches.id })
    .from(batches)
    .where(
      and(eq(batches.batchStatus, "PHOTOGRAPHY_COMPLETE"), isNull(batches.deletedAt))
    );

  // Count sold out
  const [soldOutCount] = await db
    .select({ count: batches.id })
    .from(batches)
    .where(and(eq(batches.batchStatus, "SOLD_OUT"), isNull(batches.deletedAt)));

  // Count total published (either channel)
  const [totalCount] = await db
    .select({ count: batches.id })
    .from(batches)
    .where(
      and(
        eq(batches.batchStatus, "LIVE"),
        isNull(batches.deletedAt)
      )
    );

  return {
    totalPublished: Number(totalCount?.count || 0),
    publishedB2b: Number(b2bCount?.count || 0),
    publishedEcom: Number(ecomCount?.count || 0),
    readyToPublish: Number(readyCount?.count || 0),
    soldOut: Number(soldOutCount?.count || 0),
  };
}
