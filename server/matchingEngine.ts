import { eq, and, or, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { clientNeeds, vendorSupply, batches, orders } from "../drizzle/schema";
import type { ClientNeed, VendorSupply } from "../drizzle/schema";

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
  sourceData: any;
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

  // Strain match (40 points)
  if (need.strain && candidate.strain) {
    if (need.strain.toLowerCase() === candidate.strain.toLowerCase()) {
      confidence += 40;
      reasons.push("Exact strain match");
    } else if (
      need.strain.toLowerCase().includes(candidate.strain.toLowerCase()) ||
      candidate.strain.toLowerCase().includes(need.strain.toLowerCase())
    ) {
      confidence += 20;
      reasons.push("Partial strain match");
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
    if (need.subcategory.toLowerCase() === candidate.subcategory.toLowerCase()) {
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

  // Price check (5 points bonus if within budget)
  if (need.priceMax) {
    const maxPrice = parseFloat(need.priceMax);
    const itemPrice = candidate.unitPrice
      ? parseFloat(candidate.unitPrice)
      : candidate.pricePerUnit
      ? parseFloat(candidate.pricePerUnit)
      : null;

    if (itemPrice !== null && itemPrice <= maxPrice) {
      confidence += 5;
      reasons.push("Within price budget");
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
    throw new Error(`Failed to find matches: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Find potential buyers for inventory item
 * @param batchId - Inventory batch ID
 * @returns Array of match results
 */
export async function findBuyersForInventory(batchId: number): Promise<MatchResult[]> {
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
    throw new Error(`Failed to find buyers: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Find potential buyers for vendor supply
 * @param supplyId - Vendor supply ID
 * @returns Array of match results
 */
export async function findBuyersForVendorSupply(supplyId: number): Promise<MatchResult[]> {
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
    throw new Error(`Failed to find buyers: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    throw new Error(`Failed to get active needs with matches: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

