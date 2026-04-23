import { eq, and, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { getDb } from "./db";
import {
  clientNeeds,
  vendorSupply,
  batches,
  products,
  clients,
  vendors,
} from "../drizzle/schema";
import {
  getClientPricingRules,
  calculateRetailPrice,
  type InventoryItem,
} from "./pricingEngine";
import { findHistoricalBuyers } from "./historicalAnalysis";
import { recordMatch } from "./matchRecordsDb";
import { strainService } from "./services/strainService";
import { logger } from "./_core/logger";
import { calculateSubcategoryScore, getSubcategoryMatchReason } from "./utils/subcategoryMatcher";

/**
 * Match types and confidence levels
 */
export type MatchType = "EXACT" | "CLOSE" | "HISTORICAL";

export interface Match {
  type: MatchType;
  confidence: number; // 0-100
  reasons: string[];
  source: "INVENTORY" | "VENDOR" | "HISTORICAL";
  sourceId: number;
  sourceData: EnhancedBatchSourceData | EnhancedVendorSourceData | EnhancedHistoricalSourceData;
  calculatedPrice?: number; // For inventory matches with pricing
  availableQuantity?: number; // For inventory/vendor matches
}

// Typed source data interfaces for enhanced matching
export interface EnhancedBatchSourceData {
  batch?: {
    id: number;
    code?: string;
    sku?: string;
    grade?: string;
    onHandQty?: string;
    unitCogs?: string;
    cogsMode?: string;
    unitCogsMin?: string;
    unitCogsMax?: string;
  };
  product?: {
    id: number;
    name?: string;
    nameCanonical?: string;
    category?: string;
    subcategory?: string;
    strainId?: number;
  };
  client?: {
    id: number;
    name?: string;
  };
}

export interface EnhancedVendorSourceData {
  id: number;
  strain?: string | null;
  strainType?: string | null;
  category?: string | null;
  subcategory?: string | null;
  grade?: string | null;
  unitPrice?: string | null;
  quantityAvailable?: string;
  vendorId?: number;
}

export interface EnhancedHistoricalSourceData {
  client?: {
    id: number;
    name?: string;
  };
  purchaseCount?: number;
  lastPurchaseDate?: Date;
  totalQuantity?: number;
  averageQuantity?: number;
}

export interface MatchResult {
  clientNeedId?: number;
  clientId: number;
  matches: Match[];
}

const matchingBatchSelection = {
  id: batches.id,
  code: batches.code,
  sku: batches.sku,
  grade: batches.grade,
  cogsMode: batches.cogsMode,
  unitCogs: batches.unitCogs,
  unitCogsMin: batches.unitCogsMin,
  unitCogsMax: batches.unitCogsMax,
  onHandQty: batches.onHandQty,
};

const matchingProductSelection = {
  id: products.id,
  nameCanonical: products.nameCanonical,
  category: products.category,
  subcategory: products.subcategory,
  strainId: products.strainId,
};

/** Shape returned by drizzle for matchingBatchSelection rows */
type MatchingBatch = {
  id: number;
  code: string;
  sku: string;
  grade: string | null;
  cogsMode: "FIXED" | "RANGE";
  unitCogs: string | null;
  unitCogsMin: string | null;
  unitCogsMax: string | null;
  onHandQty: string;
};

/** Shape returned by drizzle for matchingProductSelection rows (nullable due to leftJoin) */
type MatchingProduct = {
  id: number;
  nameCanonical: string | null;
  category: string | null;
  subcategory: string | null;
  strainId: number | null;
} | null;

/**
 * Calculate match confidence based on field matches
 * Enhanced version with quantity and price validation
 */
async function calculateMatchConfidence(
  need: {
    strain?: string | null;
    productName?: string | null;
    strainId?: number | null;
    strainType?: string | null;
    category?: string | null;
    subcategory?: string | null;
    grade?: string | null;
    priceMax?: string | null;
    quantityMin?: string | null;
    quantityMax?: string | null;
  },
  candidate: {
    strain?: string | null;
    productName?: string | null;
    strainId?: number | null;
    strainType?: string | null;
    category?: string | null;
    subcategory?: string | null;
    grade?: string | null;
    calculatedPrice?: number | null;
    availableQuantity?: number | null;
  }
): Promise<{ confidence: number; reasons: string[] }> {
  let confidence = 0;
  const reasons: string[] = [];

  // Product Name match for non-flower (25 points)
  const isFlower = need.category?.toLowerCase() === 'flower' || need.category?.toLowerCase() === 'flowers';
  
  if (!isFlower && (need.productName || candidate.productName)) {
    if (need.productName && candidate.productName) {
      const needProduct = need.productName.toLowerCase().trim();
      const candidateProduct = candidate.productName.toLowerCase().trim();
      
      if (needProduct === candidateProduct) {
        confidence += 25;
        reasons.push("Exact product name match");
      } else if (needProduct.includes(candidateProduct) || candidateProduct.includes(needProduct)) {
        confidence += 15;
        reasons.push("Partial product name match");
      } else {
        // Check for common words
        const needWords = needProduct.split(/\s+/);
        const candidateWords = candidateProduct.split(/\s+/);
        const commonWords = needWords.filter(w => candidateWords.includes(w));
        
        if (commonWords.length >= 2) {
          confidence += 10;
          reasons.push("Similar product name");
        }
      }
    }
  }
  
  // Strain match (40 points for flower, 20 points for non-flower) - Use strainId for family matching
  const strainWeight = isFlower ? 40 : 20;
  if (need.strainId && candidate.strainId) {
    // Exact strain ID match
    if (need.strainId === candidate.strainId) {
      confidence += strainWeight;
      reasons.push("Exact strain match");
    } else {
      // Check if they're in the same strain family
      try {
        const needFamily = await strainService.getStrainFamily(need.strainId);
        const candidateFamily = await strainService.getStrainFamily(
          candidate.strainId
        );

        const needFamilyId = needFamily?.parent?.id || need.strainId;
        const candidateFamilyId =
          candidateFamily?.parent?.id || candidate.strainId;

        if (needFamilyId === candidateFamilyId) {
          confidence += Math.floor(strainWeight * 0.75);
          reasons.push(
            `Same strain family (${needFamily?.parent?.name || "Unknown"})`
          );
        }
      } catch (error) {
        logger.error({
          msg: "Error checking strain family",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
  } else if (need.strain && candidate.strain) {
    // Fallback to text matching for backward compatibility
    const needStrain = need.strain.toLowerCase().trim();
    const candidateStrain = candidate.strain.toLowerCase().trim();

    if (needStrain === candidateStrain) {
      confidence += strainWeight;
      reasons.push("Exact strain match (text)");
    } else if (
      needStrain.includes(candidateStrain) ||
      candidateStrain.includes(needStrain)
    ) {
      confidence += Math.floor(strainWeight * 0.5);
      reasons.push("Partial strain match (text)");
    }
  }

  // Strain Type match (15 points) - Indica, Sativa, Hybrid, CBD
  if (need.strainType || candidate.strainType) {
    if (need.strainType && need.strainType.toUpperCase() === "ANY") {
      // Client accepts any strain type
      confidence += 12;
      reasons.push("Flexible strain type criteria (any type accepted)");
    } else if (need.strainType && candidate.strainType) {
      const needType = need.strainType.toUpperCase();
      const candidateType = candidate.strainType.toUpperCase();

      if (needType === candidateType) {
        // Perfect strain type match
        confidence += 15;
        reasons.push(`Strain type match (${candidateType})`);
      } else if (needType === "HYBRID" || candidateType === "HYBRID") {
        // Hybrid can partially match Indica or Sativa
        confidence += 7;
        reasons.push("Partial strain type match (Hybrid compatibility)");
      }
    }
  }

  // Category match (30 points)
  if (need.category && candidate.category) {
    if (need.category.toLowerCase() === candidate.category.toLowerCase()) {
      confidence += 30;
      reasons.push("Category match");
    }
  }

  // Subcategory match (15 points) - FEAT-020: Enhanced with related subcategory scoring
  if (need.subcategory && candidate.subcategory) {
    const subcategoryScore = calculateSubcategoryScore(need.subcategory, candidate.subcategory);

    if (subcategoryScore === 100) {
      // Exact match
      confidence += 15;
      reasons.push("Subcategory match");
    } else if (subcategoryScore === 50) {
      // Related subcategories (e.g., Smalls and Trim)
      confidence += 7.5; // Half points for related match
      const reason = getSubcategoryMatchReason(need.subcategory, candidate.subcategory);
      if (reason) reasons.push(reason);
    } else if (subcategoryScore === 30) {
      // Partial match
      confidence += 4.5; // Partial credit
      const reason = getSubcategoryMatchReason(need.subcategory, candidate.subcategory);
      if (reason) reasons.push(reason);
    }
  }

  // Grade match (10 points)
  if (need.grade && candidate.grade) {
    if (need.grade.toLowerCase() === candidate.grade.toLowerCase()) {
      confidence += 10;
      reasons.push("Grade match");
    }
  }

  // Price validation (5 points bonus, or penalty if over budget)
  if (
    need.priceMax &&
    candidate.calculatedPrice !== null &&
    candidate.calculatedPrice !== undefined
  ) {
    const maxPrice = parseFloat(need.priceMax);

    if (candidate.calculatedPrice <= maxPrice) {
      confidence += 5;
      reasons.push("Within price budget");
    } else {
      confidence -= 10;
      reasons.push(
        `Over budget ($${candidate.calculatedPrice.toFixed(2)} > $${maxPrice.toFixed(2)})`
      );
    }
  }

  // Quantity validation with tolerance (±10-20%)
  if (
    candidate.availableQuantity !== null &&
    candidate.availableQuantity !== undefined
  ) {
    const available = candidate.availableQuantity;
    const minQty = need.quantityMin ? parseFloat(need.quantityMin) : 0;
    const maxQty = need.quantityMax ? parseFloat(need.quantityMax) : Infinity;

    if (available >= minQty && available <= maxQty) {
      // Perfect - within requested range
      confidence += 5;
      reasons.push(`Quantity in range (${available} units)`);
    } else if (minQty > 0) {
      // Check tolerance for minimum
      const minTolerance10 = minQty * 0.9; // 10% under
      const minTolerance20 = minQty * 0.8; // 20% under

      if (available >= minTolerance10 && available < minQty) {
        // Within 10% tolerance
        confidence += 2;
        reasons.push(
          `Slightly under quantity (${available} vs ${minQty} min, within 10%)`
        );
      } else if (available >= minTolerance20 && available < minTolerance10) {
        // Within 20% tolerance
        confidence += 0;
        reasons.push(
          `Under quantity (${available} vs ${minQty} min, within 20%)`
        );
      } else if (available < minQty) {
        // More than 20% under
        confidence -= 10;
        reasons.push(`Significantly under quantity (${available} < ${minQty})`);
      }

      // Check tolerance for maximum
      if (maxQty !== Infinity) {
        const maxTolerance10 = maxQty * 1.1; // 10% over
        const maxTolerance20 = maxQty * 1.2; // 20% over

        if (available > maxQty && available <= maxTolerance10) {
          // Within 10% over tolerance
          confidence += 2;
          reasons.push(
            `Slightly over quantity (${available} vs ${maxQty} max, within 10%)`
          );
        } else if (available > maxTolerance10 && available <= maxTolerance20) {
          // Within 20% over tolerance
          confidence += 0;
          reasons.push(
            `Over quantity (${available} vs ${maxQty} max, within 20%)`
          );
        } else if (available > maxTolerance20) {
          // More than 20% over
          reasons.push(
            `Significantly over quantity (${available} > ${maxQty})`
          );
        }
      }
    }
  }

  // Ensure confidence stays within 0-100 range
  confidence = Math.max(0, Math.min(100, confidence));

  return { confidence, reasons };
}

/**
 * Get batch with product details for matching
 */
async function getBatchWithProduct(db: MySql2Database<Record<string, unknown>>, batchId: number) {
  const [batch] = await db
    .select({
      batch: matchingBatchSelection,
      product: matchingProductSelection,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .where(eq(batches.id, batchId));

  return batch;
}

/**
 * Calculate selling price for a batch for a specific client
 */
async function calculateBatchSellingPrice(
  batch: MatchingBatch,
  product: MatchingProduct,
  clientId: number
): Promise<number | null> {
  try {
    // Get client pricing rules
    const rules = await getClientPricingRules(clientId);

    // Determine base price (COGS)
    let basePrice = 0;
    if (batch.cogsMode === "FIXED" && batch.unitCogs) {
      basePrice = parseFloat(batch.unitCogs);
    } else if (batch.cogsMode === "RANGE" && batch.unitCogsMin) {
      // Use average of range
      const min = parseFloat(batch.unitCogsMin);
      const max = batch.unitCogsMax ? parseFloat(batch.unitCogsMax) : min;
      basePrice = (min + max) / 2;
    }

    if (basePrice === 0) return null;

    // Create inventory item for pricing calculation
    const inventoryItem: InventoryItem = {
      id: batch.id,
      name: product?.nameCanonical ?? "Unknown",
      category: product?.category ?? undefined,
      subcategory: product?.subcategory ?? undefined,
      strain: product?.strainId ? String(product.strainId) : undefined, // Would need strain name lookup
      basePrice,
      grade: batch.grade ?? undefined,
    };

    // Calculate retail price
    const priced = await calculateRetailPrice(inventoryItem, rules);
    return priced.retailPrice;
  } catch (error) {
    logger.error({
      msg: "Error calculating batch selling price",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Find matches for a specific client need (ENHANCED VERSION)
 */
export async function findMatchesForNeed(needId: number): Promise<MatchResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get the client need
    const [need] = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.id, needId));

    if (!need) {
      throw new Error("Client need not found");
    }

    const matches: Match[] = [];

    // 1. Check inventory (batches with available quantity) - ENHANCED
    const inventoryResults = await db
      .select({
        batch: matchingBatchSelection,
        product: matchingProductSelection,
      })
      .from(batches)
      .leftJoin(products, eq(batches.productId, products.id))
      .where(
        and(
          eq(batches.batchStatus, "LIVE"),
          sql`CAST(${batches.onHandQty} AS DECIMAL) > 0`
        )
      );

    for (const result of inventoryResults) {
      const batch = result.batch;
      const product = result.product;

      // Calculate selling price for this client
      const calculatedPrice = await calculateBatchSellingPrice(
        batch,
        product,
        need.clientId
      );
      const availableQuantity = parseFloat(batch.onHandQty);

      const { confidence, reasons } = await calculateMatchConfidence(need, {
        strain: product?.nameCanonical, // Using product name as proxy for strain
        strainId: product?.strainId,
        category: product?.category,
        subcategory: product?.subcategory,
        grade: batch.grade,
        calculatedPrice,
        availableQuantity,
      });

      if (confidence >= 50) {
        const match: Match = {
          type: confidence >= 80 ? "EXACT" : "CLOSE",
          confidence,
          reasons,
          source: "INVENTORY",
          sourceId: batch.id,
          sourceData: { 
            batch: {
              id: batch.id,
              code: batch.code,
              sku: batch.sku,
              grade: batch.grade ?? undefined,
              onHandQty: batch.onHandQty,
              unitCogs: batch.unitCogs ?? undefined,
              cogsMode: batch.cogsMode ?? undefined,
              unitCogsMin: batch.unitCogsMin ?? undefined,
              unitCogsMax: batch.unitCogsMax ?? undefined,
            }, 
            product: product ? {
              id: product.id,
              nameCanonical: product.nameCanonical,
              category: product.category,
              subcategory: product.subcategory ?? undefined,
              strainId: product.strainId ?? undefined,
            } : undefined,
          },
          calculatedPrice: calculatedPrice || undefined,
          availableQuantity,
        };

        matches.push(match);

        // Record match for learning
        await recordMatch({
          clientNeedId: needId,
          clientId: need.clientId,
          inventoryBatchId: batch.id,
          matchType: match.type,
          confidenceScore: confidence.toString(),
          matchReasons: reasons,
        });
      }
    }

    // 2. Check vendor supply - ENHANCED
    const vendorMatches = await db
      .select()
      .from(vendorSupply)
      .where(eq(vendorSupply.status, "AVAILABLE"));

    for (const supply of vendorMatches) {
      const availableQuantity = parseFloat(supply.quantityAvailable);
      const unitPrice = supply.unitPrice ? parseFloat(supply.unitPrice) : null;

      const { confidence, reasons } = await calculateMatchConfidence(need, {
        strain: supply.strain,
        strainType: supply.strainType,
        category: supply.category,
        subcategory: supply.subcategory,
        grade: supply.grade,
        calculatedPrice: unitPrice,
        availableQuantity,
      });

      if (confidence >= 50) {
        const match: Match = {
          type: confidence >= 80 ? "EXACT" : "CLOSE",
          confidence,
          reasons,
          source: "VENDOR",
          sourceId: supply.id,
          sourceData: supply,
          calculatedPrice: unitPrice || undefined,
          availableQuantity,
        };

        matches.push(match);

        // Record match for learning
        await recordMatch({
          clientNeedId: needId,
          clientId: need.clientId,
          vendorSupplyId: supply.id,
          matchType: match.type,
          confidenceScore: confidence.toString(),
          matchReasons: reasons,
        });
      }
    }

    // 3. Check historical buyers - NEW INTEGRATION
    const historicalMatches = await findHistoricalBuyers({
      strain: need.strain,
      category: need.category,
      subcategory: need.subcategory,
      grade: need.grade,
    });

    // Helper to check if sourceData has client property (type guard)
    const hasClient = (data: unknown): data is { client?: { id: number; name?: string } } => {
      return typeof data === 'object' && data !== null && 'client' in data;
    };

    // Filter to only this client's historical patterns
    const clientHistoricalMatches = historicalMatches.filter(
      hm => hasClient(hm.sourceData) && hm.sourceData?.client?.id === need.clientId
    );

    for (const histMatch of clientHistoricalMatches) {
      matches.push({
        type: "HISTORICAL",
        confidence: histMatch.confidence,
        reasons: histMatch.reasons,
        source: "HISTORICAL",
        sourceId: histMatch.sourceId,
        sourceData: histMatch.sourceData,
      });

      // Record historical match
      await recordMatch({
        clientNeedId: needId,
        clientId: need.clientId,
        matchType: "HISTORICAL",
        confidenceScore: histMatch.confidence.toString(),
        matchReasons: histMatch.reasons,
      });
    }

    // Sort matches by confidence (highest first)
    matches.sort((a, b) => b.confidence - a.confidence);

    return {
      clientNeedId: needId,
      clientId: need.clientId,
      matches,
    };
  } catch (error) {
    logger.error({
      msg: "Error finding matches for need",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to find matches: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Find potential buyers for inventory item (ENHANCED)
 */
export async function findBuyersForInventory(
  batchId: number
): Promise<MatchResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get batch with product details
    const batchData = await getBatchWithProduct(db, batchId);
    if (!batchData) {
      throw new Error("Batch not found");
    }

    const batch = batchData.batch;
    const product = batchData.product;
    const availableQuantity = parseFloat(batch.onHandQty);

    // Look up strain type from strain library if available
    let strainType: string | null = null;
    if (product?.strainId) {
      try {
        const strainData = await strainService.getStrainWithFamily(product.strainId);
        strainType = strainData?.category || null;
      } catch (error) {
        logger.warn({
          msg: "[MatchingEngine] Failed to lookup strain type",
          strainId: product.strainId,
          error
        });
        // Continue without strain type - not critical to matching
      }
    }

    // Find active client needs that might match
    const activeNeeds = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.status, "ACTIVE"));

    const results: MatchResult[] = [];

    for (const need of activeNeeds) {
      // Calculate selling price for this specific client
      const calculatedPrice = await calculateBatchSellingPrice(
        batch,
        product,
        need.clientId
      );

      const { confidence, reasons } = await calculateMatchConfidence(need, {
        strain: product?.nameCanonical,
        strainId: product?.strainId,
        strainType,
        category: product?.category,
        subcategory: product?.subcategory,
        grade: batch.grade,
        calculatedPrice,
        availableQuantity,
      });

      if (confidence >= 50) {
        const match: Match = {
          type: confidence >= 80 ? "EXACT" : "CLOSE",
          confidence,
          reasons,
          source: "INVENTORY",
          sourceId: batchId,
          sourceData: { 
            batch: {
              id: batch.id,
              code: batch.code,
              sku: batch.sku,
              grade: batch.grade ?? undefined,
              onHandQty: batch.onHandQty,
              unitCogs: batch.unitCogs ?? undefined,
              cogsMode: batch.cogsMode ?? undefined,
              unitCogsMin: batch.unitCogsMin ?? undefined,
              unitCogsMax: batch.unitCogsMax ?? undefined,
            }, 
            product: product ? {
              id: product.id,
              nameCanonical: product.nameCanonical,
              category: product.category,
              subcategory: product.subcategory ?? undefined,
              strainId: product.strainId ?? undefined,
            } : undefined,
          },
          calculatedPrice: calculatedPrice || undefined,
          availableQuantity,
        };

        results.push({
          clientNeedId: need.id,
          clientId: need.clientId,
          matches: [match],
        });

        // Record match
        await recordMatch({
          clientNeedId: need.id,
          clientId: need.clientId,
          inventoryBatchId: batchId,
          matchType: match.type,
          confidenceScore: confidence.toString(),
          matchReasons: reasons,
        });
      }
    }

    // Also check historical buyers (clients without explicit needs)
    const historicalBuyers = await findHistoricalBuyers({
      strain: product?.nameCanonical,
      category: product?.category,
      subcategory: product?.subcategory,
      grade: batch.grade,
    });

    // Helper to check if sourceData has client property (type guard)
    const hasClientData = (data: unknown): data is { client?: { id: number; name?: string } } => {
      return typeof data === 'object' && data !== null && 'client' in data;
    };

    for (const histMatch of historicalBuyers) {
      const clientId = hasClientData(histMatch.sourceData) ? histMatch.sourceData?.client?.id : undefined;
      if (!clientId) continue;

      // Skip if already matched via explicit need
      if (results.some(r => r.clientId === clientId)) continue;

      results.push({
        clientId,
        matches: [
          {
            type: "HISTORICAL",
            confidence: histMatch.confidence,
            reasons: histMatch.reasons,
            source: "HISTORICAL",
            sourceId: batchId,
            sourceData: histMatch.sourceData,
            availableQuantity,
          },
        ],
      });

      // Record historical match
      await recordMatch({
        clientId,
        inventoryBatchId: batchId,
        matchType: "HISTORICAL",
        confidenceScore: histMatch.confidence.toString(),
        matchReasons: histMatch.reasons,
      });
    }

    // Sort by confidence
    results.sort((a, b) => b.matches[0].confidence - a.matches[0].confidence);

    return results;
  } catch (error) {
    logger.error({
      msg: "Error finding buyers for inventory",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to find buyers: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Find potential buyers for vendor supply (ENHANCED)
 */
export async function findBuyersForVendorSupply(
  supplyId: number
): Promise<MatchResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get the vendor supply
    const [supply] = await db
      .select()
      .from(vendorSupply)
      .where(eq(vendorSupply.id, supplyId));

    if (!supply) {
      throw new Error("Vendor supply not found");
    }

    const availableQuantity = parseFloat(supply.quantityAvailable);
    const unitPrice = supply.unitPrice ? parseFloat(supply.unitPrice) : null;

    // Find active client needs that might match
    const activeNeeds = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.status, "ACTIVE"));

    const results: MatchResult[] = [];

    for (const need of activeNeeds) {
      const { confidence, reasons } = await calculateMatchConfidence(need, {
        strain: supply.strain,
        strainType: supply.strainType,
        category: supply.category,
        subcategory: supply.subcategory,
        grade: supply.grade,
        calculatedPrice: unitPrice,
        availableQuantity,
      });

      if (confidence >= 50) {
        const match: Match = {
          type: confidence >= 80 ? "EXACT" : "CLOSE",
          confidence,
          reasons,
          source: "VENDOR",
          sourceId: supplyId,
          sourceData: supply,
          calculatedPrice: unitPrice || undefined,
          availableQuantity,
        };

        results.push({
          clientNeedId: need.id,
          clientId: need.clientId,
          matches: [match],
        });

        // Record match
        await recordMatch({
          clientNeedId: need.id,
          clientId: need.clientId,
          vendorSupplyId: supplyId,
          matchType: match.type,
          confidenceScore: confidence.toString(),
          matchReasons: reasons,
        });
      }
    }

    // Sort by confidence
    results.sort((a, b) => b.matches[0].confidence - a.matches[0].confidence);

    return results;
  } catch (error) {
    logger.error({
      msg: "Error finding buyers for vendor supply",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to find buyers: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get all active needs with their best matches (ENHANCED)
 */
export async function getAllActiveNeedsWithMatches(): Promise<MatchResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const activeNeeds = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.status, "ACTIVE"));

    const results: MatchResult[] = [];

    for (const need of activeNeeds) {
      const matchResult = await findMatchesForNeed(need.id);
      results.push(matchResult);
    }

    // Sort by number of matches and confidence
    results.sort((a, b) => {
      if (b.matches.length !== a.matches.length) {
        return b.matches.length - a.matches.length;
      }
      const aMaxConfidence = a.matches[0]?.confidence || 0;
      const bMaxConfidence = b.matches[0]?.confidence || 0;
      return bMaxConfidence - aMaxConfidence;
    });

    return results;
  } catch (error) {
    logger.error({
      msg: "Error getting all active needs with matches",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to get active needs with matches: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Find client needs that match a specific inventory batch
 * (Inlined from matchingEngineReverseSimplified — TER-1250)
 */
export async function findClientNeedsForBatch(batchId: number) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available");
      return [];
    }

    // Get batch with product details
    const batchData = await db
      .select({
        batch: batches,
        product: products,
      })
      .from(batches)
      .leftJoin(products, eq(batches.productId, products.id))
      .where(eq(batches.id, batchId))
      .limit(1);

    if (batchData.length === 0 || !batchData[0].product) {
      return [];
    }

    const { batch, product } = batchData[0];

    // Get all active client needs
    const activeNeeds = await db
      .select({
        need: clientNeeds,
        client: clients,
      })
      .from(clientNeeds)
      .leftJoin(clients, eq(clientNeeds.clientId, clients.id))
      .where(eq(clientNeeds.status, "ACTIVE"));

    interface BatchMatchResult {
      clientId: number;
      clientName: string;
      clientNeedId: number;
      needDescription: string;
      matchType: string;
      confidence: number;
      reasons: string[];
      priority: string | null;
      quantityNeeded: string | null;
      maxPrice: string | null;
      neededBy: Date | null;
      availableQuantity: number;
      daysSinceCreated: number | undefined;
    }

    const matches: BatchMatchResult[] = [];

    for (const { need, client } of activeNeeds) {
      if (!client) continue;

      // Simple matching based on category and grade
      let confidence = 0;
      const reasons: string[] = [];

      // Category match (50 points)
      if (need.category && product.category) {
        if (need.category.toLowerCase() === product.category.toLowerCase()) {
          confidence += 50;
          reasons.push("Category match");
        }
      }

      // Subcategory match (30 points)
      if (need.subcategory && product.subcategory) {
        if (need.subcategory.toLowerCase() === product.subcategory.toLowerCase()) {
          confidence += 30;
          reasons.push("Subcategory match");
        }
      }

      // Grade match (20 points)
      if (need.grade && batch.grade) {
        if (need.grade.toLowerCase() === batch.grade.toLowerCase()) {
          confidence += 20;
          reasons.push("Grade match");
        }
      }

      // Only include matches with confidence >= 50
      if (confidence >= 50) {
        const matchType = confidence >= 80 ? "EXACT" : "CLOSE";
        const availableQty = parseFloat(batch.onHandQty || "0");

        matches.push({
          clientId: need.clientId,
          clientName: client.name,
          clientNeedId: need.id,
          needDescription: [need.strain, need.category, need.subcategory, need.grade]
            .filter(Boolean)
            .join(" \u2022 "),
          matchType,
          confidence,
          reasons,
          priority: need.priority,
          quantityNeeded: need.quantityMin,
          maxPrice: need.priceMax,
          neededBy: need.neededBy,
          availableQuantity: availableQty,
          daysSinceCreated: need.createdAt
            ? Math.floor((Date.now() - new Date(need.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : undefined,
        });
      }
    }

    // Sort by confidence (highest first) then by priority
    const priorityOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    matches.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return (priorityOrder[b.priority || ""] || 0) - (priorityOrder[a.priority || ""] || 0);
    });

    return matches;
  } catch (error) {
    logger.error({ error }, "Error finding client needs for batch");
    return []; // Return empty array instead of throwing
  }
}

/**
 * Find client needs that match a specific vendor supply
 * (Inlined from matchingEngineReverseSimplified — TER-1250)
 */
export async function findClientNeedsForVendorSupply(vendorSupplyId: number) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available");
      return [];
    }

    // Get vendor supply with vendor details
    const supplyData = await db
      .select({
        supply: vendorSupply,
        vendor: vendors,
      })
      .from(vendorSupply)
      .leftJoin(vendors, eq(vendorSupply.vendorId, vendors.id))
      .where(eq(vendorSupply.id, vendorSupplyId))
      .limit(1);

    if (supplyData.length === 0 || !supplyData[0].supply) {
      return [];
    }

    const { supply, vendor } = supplyData[0];

    // Only match against AVAILABLE vendor supply
    if (supply.status !== "AVAILABLE") {
      return [];
    }

    // Get all active client needs
    const activeNeeds = await db
      .select({
        need: clientNeeds,
        client: clients,
      })
      .from(clientNeeds)
      .leftJoin(clients, eq(clientNeeds.clientId, clients.id))
      .where(eq(clientNeeds.status, "ACTIVE"));

    interface VendorMatchResult {
      clientId: number;
      clientName: string;
      clientNeedId: number;
      needDescription: string;
      matchType: string;
      confidence: number;
      reasons: string[];
      priority: string | null;
      quantityNeeded: string | null;
      maxPrice: string | null;
      neededBy: Date | null;
      availableQuantity: string;
      vendorName: string;
      unitPrice: string | null;
      daysSinceCreated: number | undefined;
    }

    const matches: VendorMatchResult[] = [];

    for (const { need, client } of activeNeeds) {
      if (!client) continue;

      let confidence = 0;
      const reasons: string[] = [];

      // Category match (50 points)
      if (need.category && supply.category) {
        if (need.category.toLowerCase() === supply.category.toLowerCase()) {
          confidence += 50;
          reasons.push("Category match");
        }
      }

      // Subcategory match (30 points)
      if (need.subcategory && supply.subcategory) {
        if (need.subcategory.toLowerCase() === supply.subcategory.toLowerCase()) {
          confidence += 30;
          reasons.push("Subcategory match");
        }
      }

      // Grade match (20 points)
      if (need.grade && supply.grade) {
        if (need.grade.toLowerCase() === supply.grade.toLowerCase()) {
          confidence += 20;
          reasons.push("Grade match");
        }
      }

      // Strain match (bonus 15 points)
      if (need.strain && supply.strain) {
        if (need.strain.toLowerCase() === supply.strain.toLowerCase()) {
          confidence += 15;
          reasons.push("Strain match");
        }
      }

      // Strain type match (bonus 10 points)
      if (need.strainType && supply.strainType && need.strainType !== "ANY") {
        if (need.strainType === supply.strainType) {
          confidence += 10;
          reasons.push("Strain type match");
        }
      }

      // Price compatibility check (bonus 10 points if within budget)
      if (need.priceMax && supply.unitPrice) {
        const maxPrice = parseFloat(need.priceMax);
        const unitPrice = parseFloat(supply.unitPrice);
        if (!isNaN(maxPrice) && !isNaN(unitPrice)) {
          if (unitPrice <= maxPrice) {
            confidence += 10;
            reasons.push("Within price budget");
          } else {
            // Price too high - deduct points
            confidence -= 10;
            reasons.push("Price exceeds budget");
          }
        }
      }

      // Quantity compatibility check (bonus 5 points if enough available)
      if (need.quantityMin && supply.quantityAvailable) {
        const minNeeded = parseFloat(need.quantityMin);
        const available = parseFloat(supply.quantityAvailable);
        if (!isNaN(minNeeded) && !isNaN(available)) {
          if (available >= minNeeded) {
            confidence += 5;
            reasons.push("Sufficient quantity available");
          } else {
            // Not enough quantity - note but don't deduct
            reasons.push("Partial quantity available");
          }
        }
      }

      // Only include matches with confidence >= 50
      if (confidence >= 50) {
        const matchType = confidence >= 80 ? "EXACT" : "CLOSE";

        matches.push({
          clientId: need.clientId,
          clientName: client.name,
          clientNeedId: need.id,
          needDescription: [need.strain, need.category, need.subcategory, need.grade]
            .filter(Boolean)
            .join(" \u2022 "),
          matchType,
          confidence,
          reasons,
          priority: need.priority,
          quantityNeeded: need.quantityMin,
          maxPrice: need.priceMax,
          neededBy: need.neededBy,
          availableQuantity: supply.quantityAvailable,
          vendorName: vendor?.name || "Unknown",
          unitPrice: supply.unitPrice,
          daysSinceCreated: need.createdAt
            ? Math.floor((Date.now() - new Date(need.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : undefined,
        });
      }
    }

    // Sort by confidence (highest first) then by priority
    const priorityOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    matches.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return (priorityOrder[b.priority || ""] || 0) - (priorityOrder[a.priority || ""] || 0);
    });

    return matches;
  } catch (error) {
    logger.error({ error }, "Error finding client needs for vendor supply");
    return []; // Return empty array instead of throwing
  }
}
