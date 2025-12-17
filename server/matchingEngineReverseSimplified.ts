import { getDb } from "./db";
import { clientNeeds, batches, products, clients } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "./_core/logger";

/**
 * Simplified Reverse Matching Engine
 * Finds client needs that match a given inventory batch
 * Note: This is a simplified version that works with the actual TERP schema
 */

/**
 * Find client needs that match a specific inventory batch
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

    interface MatchResult {
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
    
    const matches: MatchResult[] = [];

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
            .join(" • "),
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
      return (priorityOrder[b.priority || ''] || 0) - (priorityOrder[a.priority || ''] || 0);
    });

    return matches;
  } catch (error) {
    logger.error("Error finding client needs for batch", { error });
    return []; // Return empty array instead of throwing
  }
}

/**
 * Find client needs that match a specific vendor supply
 */
export async function findClientNeedsForVendorSupply(vendorSupplyId: number) {
  // TODO: Implement similar logic for vendor supply
  return [];
}

