import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import { clientNeeds, vendorSupply, batches } from "../drizzle/schema";
import {
  strainsMatch,
  strainsPartiallyMatch,
  normalizeGrade,
  normalizeCategory,
} from "./utils/strainAliases";

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
  sourceData: unknown; // Can be batch, vendor supply, or historical data
}

export interface MatchResult {
  clientNeedId?: number;
  clientId: number;
  matches: Match[];
}

/**
 * Calculate match confidence based on field matches
 * @param need - Client need
 * @param candidate - Candidate item (inventory, vendor supply, or order item)
 * @returns Confidence score (0-100) and match reasons
 */
function calculateMatchConfidence(
  need: {
    strain?: string | null;
    category?: string | null;
    subcategory?: string | null;
    grade?: string | null;
    priceMax?: string | null;
  },
  candidate: {
    strain?: string | null;
    category?: string | null;
    subcategory?: string | null;
    grade?: string | null;
    unitPrice?: string | null;
    pricePerUnit?: string | null;
  }
): { confidence: number; reasons: string[] } {
  let confidence = 0;
  const reasons: string[] = [];

  // Strain match (40 points) - Enhanced with alias matching
  if (need.strain || candidate.strain) {
    // Handle "any strain" flexible criteria
    if (need.strain && need.strain.toLowerCase().trim() === "any") {
      confidence += 30;
      reasons.push("Flexible strain criteria (any strain accepted)");
    } else if (need.strain && candidate.strain) {
      // Check for exact match (including aliases like GSC = Girl Scout Cookies)
      if (strainsMatch(need.strain, candidate.strain)) {
        confidence += 40;
        reasons.push("Exact strain match");
      } else if (strainsPartiallyMatch(need.strain, candidate.strain)) {
        // Partial match (e.g., "Blue Dream" matches "Blue Dream #5")
        confidence += 30;
        reasons.push("Strain variant match");
      }
    }
  }

  // Category match (30 points) - Enhanced with normalization and flexible criteria
  if (need.category || candidate.category) {
    if (need.category && need.category.toLowerCase().trim() === "any") {
      confidence += 25;
      reasons.push("Flexible category criteria (any category accepted)");
    } else if (need.category && candidate.category) {
      const needCat = normalizeCategory(need.category);
      const candidateCat = normalizeCategory(candidate.category);
      if (needCat === candidateCat) {
        confidence += 30;
        reasons.push("Category match");
      }
    }
  }

  // Subcategory match (15 points) - Enhanced with normalization
  if (need.subcategory && candidate.subcategory) {
    const needSub = normalizeCategory(need.subcategory); // Use same normalization
    const candidateSub = normalizeCategory(candidate.subcategory);
    if (needSub === candidateSub) {
      confidence += 15;
      reasons.push("Subcategory match");
    }
  }

  // Grade match (10 points) - Enhanced with normalization and proximity scoring
  if (need.grade || candidate.grade) {
    if (need.grade && need.grade.toLowerCase().trim() === "any") {
      confidence += 10;
      reasons.push("Flexible grade criteria (any grade accepted)");
    } else if (need.grade && candidate.grade) {
      const needGrade = normalizeGrade(need.grade);
      const candidateGrade = normalizeGrade(candidate.grade);

      if (needGrade === candidateGrade) {
        confidence += 10;
        reasons.push("Grade match");
      } else {
        // Grade proximity: A+ vs A = -5 pts instead of no points
        const gradeOrder = ["a+", "a", "a-", "b+", "b", "b-", "c+", "c", "c-"];
        const needIndex = gradeOrder.indexOf(needGrade);
        const candidateIndex = gradeOrder.indexOf(candidateGrade);

        if (needIndex !== -1 && candidateIndex !== -1) {
          const diff = Math.abs(needIndex - candidateIndex);
          if (diff === 1) {
            // One grade apart (A+ vs A, or A vs B+)
            confidence += 5;
            reasons.push("Close grade match");
          } else if (diff === 2) {
            // Two grades apart (A+ vs A-, or A vs B)
            confidence += 2;
            reasons.push("Similar grade");
          }
          // More than 2 grades apart = no points (but not negative)
        }
      }
    }
  }

  // Price check (5 points bonus if within budget) - Enhanced with tolerance
  if (need.priceMax) {
    const maxPrice = parseFloat(need.priceMax);
    const itemPrice = candidate.unitPrice
      ? parseFloat(candidate.unitPrice)
      : candidate.pricePerUnit
        ? parseFloat(candidate.pricePerUnit)
        : null;

    if (itemPrice !== null) {
      const pricePercent = (itemPrice / maxPrice) * 100;

      if (itemPrice <= maxPrice) {
        // Within budget
        confidence += 5;
        reasons.push("Within price budget");
      } else if (pricePercent <= 105) {
        // Within 5% tolerance (e.g., $1501 vs $1500 max)
        confidence += 2;
        reasons.push("Slightly over budget (within 5%)");
      } else if (pricePercent <= 110) {
        // 5-10% over budget - show but with warning
        confidence += 0; // No bonus, but don't penalize
        reasons.push("Over budget (5-10%)");
      }
      // More than 10% over budget = no points and may not show (depending on threshold)
    }
  }

  return { confidence, reasons };
}

/**
 * Find matches for a specific client need
 * @param needId - Client need ID
 * @returns Match results
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

    // 1. Check inventory (batches with available quantity)
    const inventoryMatches = await db
      .select()
      .from(batches)
      .where(
        and(
          eq(batches.status, "LIVE"),
          sql`CAST(${batches.onHandQty} AS DECIMAL) > 0`
        )
      );

    for (const batch of inventoryMatches) {
      // Note: Batches don't directly store strain/category - they link to products
      // For now, we'll use grade as the main matching field
      const { confidence, reasons } = calculateMatchConfidence(need, {
        strain: null, // Would need to join with products table
        category: null, // Would need to join with products table
        subcategory: null,
        grade: batch.grade,
        unitPrice: null, // Batches store COGS, not selling price
      });

      if (confidence >= 50) {
        matches.push({
          type: confidence >= 80 ? "EXACT" : "CLOSE",
          confidence,
          reasons,
          source: "INVENTORY",
          sourceId: batch.id,
          sourceData: batch,
        });
      }
    }

    // 2. Check vendor supply
    const vendorMatches = await db
      .select()
      .from(vendorSupply)
      .where(eq(vendorSupply.status, "AVAILABLE"));

    for (const supply of vendorMatches) {
      const { confidence, reasons } = calculateMatchConfidence(need, {
        strain: supply.strain,
        category: supply.category,
        subcategory: supply.subcategory,
        grade: supply.grade,
        unitPrice: supply.unitPrice?.toString() || null,
      });

      if (confidence >= 50) {
        matches.push({
          type: confidence >= 80 ? "EXACT" : "CLOSE",
          confidence,
          reasons,
          source: "VENDOR",
          sourceId: supply.id,
          sourceData: supply,
        });
      }
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
 * Find potential buyers for inventory item
 * @param batchId - Inventory batch ID
 * @returns Array of match results
 */
export async function findBuyersForInventory(
  batchId: number
): Promise<MatchResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get the batch
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));

    if (!batch) {
      throw new Error("Batch not found");
    }

    // Find active client needs that might match
    const activeNeeds = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.status, "ACTIVE"));

    const results: MatchResult[] = [];

    for (const need of activeNeeds) {
      const { confidence, reasons } = calculateMatchConfidence(need, {
        strain: null, // Would need to join with products table
        category: null, // Would need to join with products table
        subcategory: null,
        grade: batch.grade,
        unitPrice: null, // Batches store COGS, not selling price
      });

      if (confidence >= 50) {
        results.push({
          clientNeedId: need.id,
          clientId: need.clientId,
          matches: [
            {
              type: confidence >= 80 ? "EXACT" : "CLOSE",
              confidence,
              reasons,
              source: "INVENTORY",
              sourceId: batchId,
              sourceData: batch,
            },
          ],
        });
      }
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
 * Find potential buyers for vendor supply
 * @param supplyId - Vendor supply ID
 * @returns Array of match results
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

    // Find active client needs that might match
    const activeNeeds = await db
      .select()
      .from(clientNeeds)
      .where(eq(clientNeeds.status, "ACTIVE"));

    const results: MatchResult[] = [];

    for (const need of activeNeeds) {
      const { confidence, reasons } = calculateMatchConfidence(need, {
        strain: supply.strain,
        category: supply.category,
        subcategory: supply.subcategory,
        grade: supply.grade,
        unitPrice: supply.unitPrice?.toString() || null,
      });

      if (confidence >= 50) {
        results.push({
          clientNeedId: need.id,
          clientId: need.clientId,
          matches: [
            {
              type: confidence >= 80 ? "EXACT" : "CLOSE",
              confidence,
              reasons,
              source: "VENDOR",
              sourceId: supplyId,
              sourceData: supply,
            },
          ],
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
 * Get all active needs with their best matches
 * @returns Array of match results
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
