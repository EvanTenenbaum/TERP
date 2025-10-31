import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  clientNeeds,
  vendorSupply,
  batches,
  products,
} from "../drizzle/schema";
import {
  getClientPricingRules,
  calculateRetailPrice,
  type InventoryItem,
} from "./pricingEngine";
import { findHistoricalBuyers } from "./historicalAnalysis";
import { recordMatch } from "./matchRecordsDb";
import { strainService } from "./services/strainService";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sourceData: any; // Can be batch, vendor supply, or historical data - TODO: improve typing
  calculatedPrice?: number; // For inventory matches with pricing
  availableQuantity?: number; // For inventory/vendor matches
}

export interface MatchResult {
  clientNeedId?: number;
  clientId: number;
  matches: Match[];
}

/**
 * Calculate match confidence based on field matches
 * Enhanced version with quantity and price validation
 */
async function calculateMatchConfidence(
  need: {
    strain?: string | null;
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

  // Strain match (40 points) - Use strainId for family matching
  if (need.strainId && candidate.strainId) {
    // Exact strain ID match
    if (need.strainId === candidate.strainId) {
      confidence += 40;
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
          confidence += 30;
          reasons.push(
            `Same strain family (${needFamily?.parent?.name || "Unknown"})`
          );
        }
      } catch (error) {
        console.error("Error checking strain family:", error);
      }
    }
  } else if (need.strain && candidate.strain) {
    // Fallback to text matching for backward compatibility
    const needStrain = need.strain.toLowerCase().trim();
    const candidateStrain = candidate.strain.toLowerCase().trim();

    if (needStrain === candidateStrain) {
      confidence += 40;
      reasons.push("Exact strain match (text)");
    } else if (
      needStrain.includes(candidateStrain) ||
      candidateStrain.includes(needStrain)
    ) {
      confidence += 20;
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

  // Subcategory match (15 points)
  if (need.subcategory && candidate.subcategory) {
    if (
      need.subcategory.toLowerCase() === candidate.subcategory.toLowerCase()
    ) {
      confidence += 15;
      reasons.push("Subcategory match");
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBatchWithProduct(db: any, batchId: number) {
  const [batch] = await db
    .select({
      batch: batches,
      product: products,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  batch: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: any,
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
      name: product?.nameCanonical || "Unknown",
      category: product?.category,
      subcategory: product?.subcategory,
      strain: product?.strainId ? String(product.strainId) : undefined, // Would need strain name lookup
      basePrice,
      grade: batch.grade,
    };

    // Calculate retail price
    const priced = await calculateRetailPrice(inventoryItem, rules);
    return priced.retailPrice;
  } catch (error) {
    console.error("Error calculating batch selling price:", error);
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
        batch: batches,
        product: products,
      })
      .from(batches)
      .leftJoin(products, eq(batches.productId, products.id))
      .where(
        and(
          eq(batches.status, "LIVE"),
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
          sourceData: { batch, product },
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

    // Filter to only this client's historical patterns
    const clientHistoricalMatches = historicalMatches.filter(
      hm => hm.sourceData?.client?.id === need.clientId
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
    console.error("Error finding matches for need:", error);
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
        strainType: null, // TODO: Get from strain library via strainId
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
          sourceData: { batch, product },
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

    for (const histMatch of historicalBuyers) {
      const clientId = histMatch.sourceData?.client?.id;
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
    console.error("Error finding buyers for inventory:", error);
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
    console.error("Error finding buyers for vendor supply:", error);
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
    console.error("Error getting all active needs with matches:", error);
    throw new Error(
      `Failed to get active needs with matches: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Export reverse matching functions (simplified version)
export {
  findClientNeedsForBatch,
  findClientNeedsForVendorSupply,
} from "./matchingEngineReverseSimplified";
