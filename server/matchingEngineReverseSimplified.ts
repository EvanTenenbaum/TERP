import { getDb } from "./db";
import { clientNeeds, batches, products, clients, vendorSupply, vendors } from "../drizzle/schema";
import { eq, and, or, lte, gte } from "drizzle-orm";
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
    logger.error({ error }, "Error finding client needs for batch");
    return []; // Return empty array instead of throwing
  }
}

/**
 * Find client needs that match a specific vendor supply
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
      availableQuantity: string;
      vendorName: string;
      unitPrice: string | null;
      daysSinceCreated: number | undefined;
    }

    const matches: MatchResult[] = [];

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
            .join(" • "),
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

