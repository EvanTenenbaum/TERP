/**
 * Strain Matching Service (FEAT-020)
 * Provides strain and subcategory-based product matching and grouping
 */

import { getDb } from "../db";
import { batches, products, strains } from "../../drizzle/schema";
import { eq, and, like, or, gt, sql, desc } from "drizzle-orm";
import { strainService } from "./strainService";
import { logger } from "../_core/logger";

interface ProductMatch {
  batchId: number;
  batchCode: string;
  productId: number;
  productName: string;
  strainId: number | null;
  strainName: string | null;
  category: string | null;
  subcategory: string | null;
  grade: string | null;
  onHandQty: string;
  unitCogs: string | null;
  matchType: "exact" | "family" | "related";
  matchConfidence: number;
}

interface SubcategoryGroup {
  subcategory: string;
  subcategoryId: number | null;
  category: string | null;
  productCount: number;
  products: Array<{
    batchId: number;
    batchCode: string;
    productId: number;
    productName: string;
    strainName: string | null;
    grade: string | null;
    onHandQty: string;
    unitCogs: string | null;
  }>;
}

interface SimilarStrain {
  id: number;
  name: string;
  standardizedName: string;
  category: string | null;
  similarity: number;
  matchReason: string;
}

/**
 * Find products by strain name or ID
 * Includes related strains from the same family if requested
 */
export async function findProductsByStrain(options: {
  strainName?: string;
  strainId?: number;
  includeRelated?: boolean;
}): Promise<ProductMatch[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const results: ProductMatch[] = [];
    let targetStrainIds: number[] = [];

    // Get strain ID(s) to search for
    if (options.strainId) {
      targetStrainIds.push(options.strainId);

      // Get related strains if requested
      if (options.includeRelated) {
        const family = await strainService.getStrainFamily(options.strainId);
        if (family?.variants) {
          targetStrainIds.push(
            ...family.variants.map((c: { id: number }) => c.id)
          );
        }
        if (family?.parent) {
          targetStrainIds.push(family.parent.id);
          // Also get siblings (other variants of the parent)
          const parentFamily = await strainService.getStrainFamily(
            family.parent.id
          );
          if (parentFamily?.variants) {
            targetStrainIds.push(
              ...parentFamily.variants.map((c: { id: number }) => c.id)
            );
          }
        }
      }
    } else if (options.strainName) {
      // Search by strain name
      const matchingStrains = await db
        .select()
        .from(strains)
        .where(
          or(
            like(strains.name, `%${options.strainName}%`),
            like(
              strains.standardizedName,
              `%${options.strainName.toLowerCase().replace(/\s+/g, "-")}%`
            )
          )
        )
        .limit(20);

      targetStrainIds = matchingStrains.map(s => s.id);

      // Get related strains if requested
      if (options.includeRelated && targetStrainIds.length > 0) {
        const relatedIds = new Set<number>(targetStrainIds);
        for (const strainId of targetStrainIds) {
          const family = await strainService.getStrainFamily(strainId);
          if (family?.variants) {
            family.variants.forEach((c: { id: number }) =>
              relatedIds.add(c.id)
            );
          }
          if (family?.parent) {
            relatedIds.add(family.parent.id);
          }
        }
        targetStrainIds = Array.from(relatedIds);
      }
    }

    if (targetStrainIds.length === 0) {
      return [];
    }

    // Remove duplicates
    targetStrainIds = [...new Set(targetStrainIds)];

    // Get products with these strains
    // BUG-114: Added fallback for schema drift (strainId may not exist in production)
    let batchProducts: Array<{
      batch: typeof batches.$inferSelect;
      product: typeof products.$inferSelect | null;
      strain: typeof strains.$inferSelect | null;
    }>;
    try {
      batchProducts = await db
        .select({
          batch: batches,
          product: products,
          strain: strains,
        })
        .from(batches)
        .leftJoin(products, eq(batches.productId, products.id))
        .leftJoin(strains, eq(products.strainId, strains.id))
        .where(
          and(
            sql`${products.strainId} IN (${sql.join(
              targetStrainIds.map(id => sql`${id}`),
              sql`, `
            )})`,
            gt(batches.onHandQty, "0")
          )
        )
        .orderBy(desc(batches.onHandQty));
    } catch (queryError) {
      // If strainId column doesn't exist, this feature cannot work
      // Return empty results with a warning
      logger.warn(
        { error: queryError },
        "findProductsByStrain: Query failed due to schema drift (strainId column may not exist). Returning empty results."
      );
      return [];
    }

    // Determine match type based on strain relationship
    const primaryStrainId = options.strainId || targetStrainIds[0];

    for (const row of batchProducts) {
      const strainId = row.product?.strainId;
      let matchType: "exact" | "family" | "related" = "related";
      let matchConfidence = 60;

      if (strainId === primaryStrainId) {
        matchType = "exact";
        matchConfidence = 100;
      } else if (strainId) {
        // Check if it's in the same family
        const family = await strainService.getStrainFamily(strainId);
        const familyIds = [
          family?.parent?.id,
          ...(family?.variants?.map((c: { id: number }) => c.id) || []),
        ].filter(Boolean);

        if (familyIds.includes(primaryStrainId)) {
          matchType = "family";
          matchConfidence = 85;
        }
      }

      results.push({
        batchId: row.batch.id,
        batchCode: row.batch.code ?? "",
        productId: row.product?.id ?? 0,
        productName: row.product?.nameCanonical ?? "",
        strainId: row.product?.strainId ?? null,
        strainName: row.strain?.name ?? null,
        category: row.product?.category ?? null,
        subcategory: row.product?.subcategory ?? null,
        grade: row.batch.grade ?? null,
        onHandQty: row.batch.onHandQty ?? "0",
        unitCogs: row.batch.unitCogs ?? null,
        matchType,
        matchConfidence,
      });
    }

    // Sort by match confidence then by quantity
    results.sort((a, b) => {
      if (b.matchConfidence !== a.matchConfidence) {
        return b.matchConfidence - a.matchConfidence;
      }
      return parseFloat(b.onHandQty) - parseFloat(a.onHandQty);
    });

    return results;
  } catch (error) {
    logger.error({ error }, "Error finding products by strain");
    throw error;
  }
}

/**
 * Group products by subcategory
 * Returns products organized by their subcategory for catalog views
 */
export async function groupProductsBySubcategory(options: {
  category?: string;
  includeOutOfStock?: boolean;
}): Promise<Record<string, SubcategoryGroup>> {
  const db = await getDb();
  if (!db) return {};

  try {
    const groups: Record<string, SubcategoryGroup> = {};

    // Build where conditions
    const conditions = [];
    if (!options.includeOutOfStock) {
      conditions.push(gt(batches.onHandQty, "0"));
    }
    if (options.category) {
      conditions.push(eq(products.category, options.category));
    }

    // Get products with subcategory info
    // BUG-114: Added fallback for schema drift (strainId may not exist in production)
    let batchProducts: Array<{
      batch: typeof batches.$inferSelect;
      product: typeof products.$inferSelect | null;
      strain: typeof strains.$inferSelect | null;
    }>;
    try {
      batchProducts = await db
        .select({
          batch: batches,
          product: products,
          strain: strains,
        })
        .from(batches)
        .leftJoin(products, eq(batches.productId, products.id))
        .leftJoin(strains, eq(products.strainId, strains.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(products.subcategory, desc(batches.onHandQty));
    } catch (queryError) {
      // Fallback: Query without strains join if strainId column doesn't exist
      logger.warn(
        { error: queryError },
        "groupProductsBySubcategory: Query with strains join failed, falling back to simpler query"
      );
      const batchProductsNoStrain = await db
        .select({
          batch: batches,
          product: products,
        })
        .from(batches)
        .leftJoin(products, eq(batches.productId, products.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(products.subcategory, desc(batches.onHandQty));

      // Map to expected format with null strain
      batchProducts = batchProductsNoStrain.map(row => ({
        ...row,
        strain: null,
      }));
    }

    // Group by subcategory
    for (const row of batchProducts) {
      const subcategory = row.product?.subcategory || "Uncategorized";

      if (!groups[subcategory]) {
        groups[subcategory] = {
          subcategory,
          subcategoryId: null, // Could be enhanced to include actual subcategory ID
          category: row.product?.category ?? null,
          productCount: 0,
          products: [],
        };
      }

      groups[subcategory].productCount++;
      groups[subcategory].products.push({
        batchId: row.batch.id,
        batchCode: row.batch.code ?? "",
        productId: row.product?.id ?? 0,
        productName: row.product?.nameCanonical ?? "",
        strainName: row.strain?.name ?? null,
        grade: row.batch.grade ?? null,
        onHandQty: row.batch.onHandQty ?? "0",
        unitCogs: row.batch.unitCogs ?? null,
      });
    }

    return groups;
  } catch (error) {
    logger.error({ error }, "Error grouping products by subcategory");
    throw error;
  }
}

/**
 * Find similar strains based on characteristics
 */
export async function findSimilarStrains(
  strainId: number,
  limit: number = 10
): Promise<SimilarStrain[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Get the source strain
    const [sourceStrain] = await db
      .select()
      .from(strains)
      .where(eq(strains.id, strainId));

    if (!sourceStrain) {
      return [];
    }

    const results: SimilarStrain[] = [];

    // Get strains in the same family
    const family = await strainService.getStrainFamily(strainId);
    if (family?.parent) {
      results.push({
        id: family.parent.id,
        name: family.parent.name,
        standardizedName: family.parent.standardizedName,
        category: family.parent.category,
        similarity: 95,
        matchReason: "Parent strain",
      });
    }
    if (family?.variants) {
      for (const variant of family.variants) {
        if (variant.id !== strainId) {
          results.push({
            id: variant.id,
            name: variant.name,
            standardizedName: variant.standardizedName,
            category: variant.category,
            similarity: 90,
            matchReason: "Same strain family",
          });
        }
      }
    }

    // Get strains with the same category (Indica/Sativa/Hybrid)
    if (sourceStrain.category && results.length < limit) {
      const sameCategoryStrains = await db
        .select()
        .from(strains)
        .where(
          and(
            eq(strains.category, sourceStrain.category),
            sql`${strains.id} != ${strainId}`,
            sql`${strains.id} NOT IN (${
              sql.join(
                results.map(r => sql`${r.id}`),
                sql`, `
              ) || sql`0`
            })`
          )
        )
        .limit(limit - results.length);

      for (const strain of sameCategoryStrains) {
        results.push({
          id: strain.id,
          name: strain.name,
          standardizedName: strain.standardizedName,
          category: strain.category,
          similarity: 70,
          matchReason: `Same type (${sourceStrain.category})`,
        });
      }
    }

    // Get strains with similar names
    if (results.length < limit && sourceStrain.baseStrainName) {
      const similarNameStrains = await db
        .select()
        .from(strains)
        .where(
          and(
            like(strains.name, `%${sourceStrain.baseStrainName}%`),
            sql`${strains.id} != ${strainId}`,
            sql`${strains.id} NOT IN (${
              sql.join(
                results.map(r => sql`${r.id}`),
                sql`, `
              ) || sql`0`
            })`
          )
        )
        .limit(limit - results.length);

      for (const strain of similarNameStrains) {
        results.push({
          id: strain.id,
          name: strain.name,
          standardizedName: strain.standardizedName,
          category: strain.category,
          similarity: 60,
          matchReason: "Similar name",
        });
      }
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  } catch (error) {
    logger.error({ error }, "Error finding similar strains");
    throw error;
  }
}
