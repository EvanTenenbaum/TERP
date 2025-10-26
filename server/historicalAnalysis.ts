import { eq, and, sql, desc, gte } from "drizzle-orm";
import { getDb } from "./db";
import { orders, clients } from "../drizzle/schema";
import type { Match } from "./matchingEngine";

/**
 * Purchase pattern analysis result
 */
export interface PurchasePattern {
  clientId: number;
  strain?: string;
  category?: string;
  subcategory?: string;
  grade?: string;
  purchaseCount: number;
  totalQuantity: number;
  avgPrice: number;
  lastPurchaseDate: Date;
  daysSinceLastPurchase: number;
}

/**
 * Historical match result
 */
export interface HistoricalMatch extends Match {
  pattern: PurchasePattern;
  isLapsedBuyer: boolean;
}

/**
 * Analyze purchase history for a client
 * @param clientId - Client ID
 * @param minPurchases - Minimum number of purchases to consider (default: 3)
 * @returns Array of purchase patterns
 */
export async function analyzeClientPurchaseHistory(
  clientId: number,
  minPurchases: number = 3
): Promise<PurchasePattern[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all completed sales for this client
    const clientOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.clientId, clientId),
          eq(orders.orderType, "SALE")
        )
      )
      .orderBy(desc(orders.createdAt));

    // Aggregate by strain/category/subcategory/grade
    const patternMap = new Map<string, PurchasePattern>();

    for (const order of clientOrders) {
      const items = order.items as any[];
      
      if (!items || !Array.isArray(items)) continue;

      for (const item of items) {
        const key = `${item.strain || ""}|${item.category || ""}|${item.subcategory || ""}|${item.grade || ""}`;
        
        const existing = patternMap.get(key);
        const quantity = parseFloat(item.quantity || "0");
        const price = parseFloat(item.price || "0");

        if (existing) {
          existing.purchaseCount += 1;
          existing.totalQuantity += quantity;
          existing.avgPrice = (existing.avgPrice * (existing.purchaseCount - 1) + price) / existing.purchaseCount;
          
          if (order.createdAt) {
            const orderDate = new Date(order.createdAt);
            if (orderDate > existing.lastPurchaseDate) {
              existing.lastPurchaseDate = orderDate;
            }
          }
        } else {
          patternMap.set(key, {
            clientId,
            strain: item.strain || undefined,
            category: item.category || undefined,
            subcategory: item.subcategory || undefined,
            grade: item.grade || undefined,
            purchaseCount: 1,
            totalQuantity: quantity,
            avgPrice: price,
            lastPurchaseDate: order.createdAt ? new Date(order.createdAt) : new Date(),
            daysSinceLastPurchase: 0,
          });
        }
      }
    }

    // Calculate days since last purchase
    const now = new Date();
    const patterns = Array.from(patternMap.values())
      .filter(p => p.purchaseCount >= minPurchases)
      .map(p => ({
        ...p,
        daysSinceLastPurchase: Math.floor(
          (now.getTime() - p.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));

    // Sort by purchase count (most frequent first)
    patterns.sort((a, b) => b.purchaseCount - a.purchaseCount);

    return patterns;
  } catch (error) {
    console.error("Error analyzing client purchase history:", error);
    throw new Error(`Failed to analyze purchase history: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Find historical matches for inventory item
 * @param batchData - Batch data with strain, category, etc.
 * @param lapsedDaysThreshold - Days since last purchase to consider "lapsed" (default: 90)
 * @returns Array of historical matches
 */
export async function findHistoricalBuyers(
  batchData: {
    strain?: string | null;
    category?: string | null;
    subcategory?: string | null;
    grade?: string | null;
  },
  lapsedDaysThreshold: number = 90
): Promise<HistoricalMatch[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all clients
    const allClients = await db.select().from(clients);

    const matches: HistoricalMatch[] = [];

    for (const client of allClients) {
      const patterns = await analyzeClientPurchaseHistory(client.id, 3);

      for (const pattern of patterns) {
        let confidence = 0;
        const reasons: string[] = [];

        // Strain match (40 points)
        if (batchData.strain && pattern.strain) {
          if (batchData.strain.toLowerCase() === pattern.strain.toLowerCase()) {
            confidence += 40;
            reasons.push(`Previously purchased ${pattern.purchaseCount}x`);
          }
        }

        // Category match (30 points)
        if (batchData.category && pattern.category) {
          if (batchData.category.toLowerCase() === pattern.category.toLowerCase()) {
            confidence += 30;
            if (!reasons.length) {
              reasons.push(`Previously purchased similar items ${pattern.purchaseCount}x`);
            }
          }
        }

        // Subcategory match (15 points)
        if (batchData.subcategory && pattern.subcategory) {
          if (batchData.subcategory.toLowerCase() === pattern.subcategory.toLowerCase()) {
            confidence += 15;
          }
        }

        // Grade match (10 points)
        if (batchData.grade && pattern.grade) {
          if (batchData.grade.toLowerCase() === pattern.grade.toLowerCase()) {
            confidence += 10;
          }
        }

        // Recency bonus/penalty
        if (pattern.daysSinceLastPurchase < 30) {
          confidence += 5;
          reasons.push("Recent buyer");
        } else if (pattern.daysSinceLastPurchase > lapsedDaysThreshold) {
          reasons.push(`Lapsed buyer (${pattern.daysSinceLastPurchase} days)`);
        }

        if (confidence >= 50) {
          matches.push({
            type: "HISTORICAL",
            confidence,
            reasons,
            source: "HISTORICAL",
            sourceId: client.id,
            sourceData: {
              client,
              pattern,
            },
            pattern,
            isLapsedBuyer: pattern.daysSinceLastPurchase > lapsedDaysThreshold,
          });
        }
      }
    }

    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  } catch (error) {
    console.error("Error finding historical buyers:", error);
    throw new Error(`Failed to find historical buyers: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get lapsed buyers (clients who haven't purchased in X days)
 * @param daysThreshold - Days since last purchase (default: 90)
 * @returns Array of client IDs with their last purchase date
 */
export async function getLapsedBuyers(
  daysThreshold: number = 90
): Promise<Array<{ clientId: number; daysSinceLastPurchase: number; lastPurchaseDate: Date }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all clients with their last order
    const allClients = await db.select().from(clients);
    const lapsedBuyers: Array<{ clientId: number; daysSinceLastPurchase: number; lastPurchaseDate: Date }> = [];

    for (const client of allClients) {
      const [lastOrder] = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.clientId, client.id),
            eq(orders.orderType, "SALE")
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(1);

      if (lastOrder && lastOrder.createdAt) {
        const lastPurchaseDate = new Date(lastOrder.createdAt);
        const daysSince = Math.floor(
          (new Date().getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSince >= daysThreshold) {
          lapsedBuyers.push({
            clientId: client.id,
            daysSinceLastPurchase: daysSince,
            lastPurchaseDate,
          });
        }
      }
    }

    // Sort by days since last purchase (most lapsed first)
    lapsedBuyers.sort((a, b) => b.daysSinceLastPurchase - a.daysSinceLastPurchase);

    return lapsedBuyers;
  } catch (error) {
    console.error("Error getting lapsed buyers:", error);
    throw new Error(`Failed to get lapsed buyers: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get proactive opportunities (lapsed buyers + available inventory they used to buy)
 * @param daysThreshold - Days since last purchase (default: 90)
 * @returns Array of opportunities
 */
export async function getProactiveOpportunities(
  daysThreshold: number = 90
): Promise<Array<{
  clientId: number;
  clientName: string;
  daysSinceLastPurchase: number;
  pattern: PurchasePattern;
  availableInventory: any[];
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const lapsedBuyers = await getLapsedBuyers(daysThreshold);
    const opportunities = [];

    for (const lapsed of lapsedBuyers) {
      const patterns = await analyzeClientPurchaseHistory(lapsed.clientId, 2);
      
      if (patterns.length === 0) continue;

      // Get client details
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, lapsed.clientId));

      if (!client) continue;

      // For each pattern, check if we have matching inventory
      for (const pattern of patterns) {
        // This would check against batches, but we'll simplify for now
        opportunities.push({
          clientId: lapsed.clientId,
          clientName: client.name,
          daysSinceLastPurchase: lapsed.daysSinceLastPurchase,
          pattern,
          availableInventory: [], // Would be populated with matching batches
        });
      }
    }

    return opportunities;
  } catch (error) {
    console.error("Error getting proactive opportunities:", error);
    throw new Error(`Failed to get proactive opportunities: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

