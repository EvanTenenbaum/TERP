import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { orders, clients } from "../drizzle/schema";
import type { Match } from "./matchingEngine";
import { logger } from "./_core/logger";

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
      .where(and(eq(orders.clientId, clientId), eq(orders.orderType, "SALE")))
      .orderBy(desc(orders.createdAt));

    // Aggregate by strain/category/subcategory/grade
    const patternMap = new Map<string, PurchasePattern>();

    for (const order of clientOrders) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          existing.avgPrice =
            (existing.avgPrice * (existing.purchaseCount - 1) + price) /
            existing.purchaseCount;

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
            lastPurchaseDate: order.createdAt
              ? new Date(order.createdAt)
              : new Date(),
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
    logger.error({
      msg: "Error analyzing client purchase history",
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to analyze purchase history: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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
          if (
            batchData.category.toLowerCase() === pattern.category.toLowerCase()
          ) {
            confidence += 30;
            if (!reasons.length) {
              reasons.push(
                `Previously purchased similar items ${pattern.purchaseCount}x`
              );
            }
          }
        }

        // Subcategory match (15 points)
        if (batchData.subcategory && pattern.subcategory) {
          if (
            batchData.subcategory.toLowerCase() ===
            pattern.subcategory.toLowerCase()
          ) {
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
    logger.error({
      msg: "Error finding historical buyers",
      batchData,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to find historical buyers: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get lapsed buyers (clients who haven't purchased in X days)
 * @param daysThreshold - Days since last purchase (default: 90)
 * @returns Array of client IDs with their last purchase date
 */
export async function getLapsedBuyers(daysThreshold: number = 90): Promise<
  Array<{
    clientId: number;
    daysSinceLastPurchase: number;
    lastPurchaseDate: Date;
  }>
> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all clients with their last order
    const allClients = await db.select().from(clients);
    const lapsedBuyers: Array<{
      clientId: number;
      daysSinceLastPurchase: number;
      lastPurchaseDate: Date;
    }> = [];

    for (const client of allClients) {
      const [lastOrder] = await db
        .select()
        .from(orders)
        .where(
          and(eq(orders.clientId, client.id), eq(orders.orderType, "SALE"))
        )
        .orderBy(desc(orders.createdAt))
        .limit(1);

      if (lastOrder && lastOrder.createdAt) {
        const lastPurchaseDate = new Date(lastOrder.createdAt);
        const daysSince = Math.floor(
          (new Date().getTime() - lastPurchaseDate.getTime()) /
            (1000 * 60 * 60 * 24)
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
    lapsedBuyers.sort(
      (a, b) => b.daysSinceLastPurchase - a.daysSinceLastPurchase
    );

    return lapsedBuyers;
  } catch (error) {
    logger.error({
      msg: "Error getting lapsed buyers",
      daysThreshold,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to get lapsed buyers: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get proactive opportunities (lapsed buyers + available inventory they used to buy)
 * @param daysThreshold - Days since last purchase (default: 90)
 * @returns Array of opportunities
 */
export async function getProactiveOpportunities(
  daysThreshold: number = 90
): Promise<
  Array<{
    clientId: number;
    clientName: string;
    daysSinceLastPurchase: number;
    pattern: PurchasePattern;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    availableInventory: any[];
  }>
> {
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
    logger.error({
      msg: "Error getting proactive opportunities",
      daysThreshold,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to get proactive opportunities: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Reorder prediction result
 */
export interface ReorderPrediction {
  clientId: number;
  clientName: string;
  strain?: string;
  category?: string;
  subcategory?: string;
  grade?: string;
  avgQuantity: number;
  avgPrice: number;
  orderFrequencyDays: number;
  daysSinceLastOrder: number;
  predictedNextOrderDate: Date;
  daysUntilPredictedOrder: number;
  confidence: number; // 0-100
  reasons: string[];
}

/**
 * Calculate reorder frequency for a client's purchase pattern
 * @param clientId - Client ID
 * @param strain - Strain name
 * @param category - Category
 * @returns Reorder prediction or null if insufficient data
 */
export async function predictReorder(
  clientId: number,
  strain?: string,
  category?: string
): Promise<ReorderPrediction | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all orders for this client with the specific item
    const clientOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.clientId, clientId), eq(orders.orderType, "SALE")))
      .orderBy(orders.createdAt);

    if (clientOrders.length < 2) {
      // Need at least 2 orders to calculate frequency
      return null;
    }

    // Filter orders that contain the target item
    const relevantOrders: Array<{
      date: Date;
      quantity: number;
      price: number;
    }> = [];

    for (const order of clientOrders) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = order.items as any[];
      if (!items || !Array.isArray(items)) continue;

      for (const item of items) {
        const matchesStrain =
          !strain ||
          (item.strain && item.strain.toLowerCase() === strain.toLowerCase());
        const matchesCategory =
          !category ||
          (item.category &&
            item.category.toLowerCase() === category.toLowerCase());

        if (matchesStrain && matchesCategory) {
          relevantOrders.push({
            date: new Date(order.createdAt || new Date()),
            quantity: parseFloat(item.quantity || "0"),
            price: parseFloat(item.price || "0"),
          });
          break; // Only count order once
        }
      }
    }

    if (relevantOrders.length < 2) {
      return null;
    }

    // Calculate average days between orders
    const daysBetween: number[] = [];
    for (let i = 1; i < relevantOrders.length; i++) {
      const days = Math.floor(
        (relevantOrders[i].date.getTime() -
          relevantOrders[i - 1].date.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      daysBetween.push(days);
    }

    const avgFrequency =
      daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;
    const lastOrder = relevantOrders[relevantOrders.length - 1];
    const daysSinceLast = Math.floor(
      (new Date().getTime() - lastOrder.date.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Predict next order date
    const predictedNextOrderDate = new Date(
      lastOrder.date.getTime() + avgFrequency * 24 * 60 * 60 * 1000
    );
    const daysUntilPredicted = Math.floor(
      (predictedNextOrderDate.getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Calculate confidence based on consistency
    const stdDev = Math.sqrt(
      daysBetween
        .map(x => Math.pow(x - avgFrequency, 2))
        .reduce((a, b) => a + b, 0) / daysBetween.length
    );
    const coefficientOfVariation = stdDev / avgFrequency;

    let confidence = 100 - coefficientOfVariation * 50; // More variation = less confidence
    confidence = Math.max(30, Math.min(100, confidence)); // Clamp between 30-100

    // Adjust confidence based on how close we are to predicted date
    if (daysUntilPredicted < 0) {
      // Overdue
      confidence += Math.min(20, Math.abs(daysUntilPredicted) * 2);
    } else if (daysUntilPredicted <= 7) {
      // Within 7 days
      confidence += 15;
    } else if (daysUntilPredicted <= 14) {
      // Within 14 days
      confidence += 10;
    }

    confidence = Math.min(100, confidence);

    const reasons: string[] = [];
    reasons.push(
      `Orders ${relevantOrders.length}x every ${Math.round(avgFrequency)} days on average`
    );

    if (daysUntilPredicted < 0) {
      reasons.push(`OVERDUE by ${Math.abs(daysUntilPredicted)} days`);
    } else if (daysUntilPredicted <= 7) {
      reasons.push(`Predicted reorder in ${daysUntilPredicted} days`);
    } else if (daysUntilPredicted <= 14) {
      reasons.push(`Predicted reorder in ${daysUntilPredicted} days`);
    } else {
      reasons.push(`Next order predicted in ${daysUntilPredicted} days`);
    }

    if (coefficientOfVariation < 0.3) {
      reasons.push("Consistent ordering pattern");
    }

    // Get client name
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));

    // Calculate averages
    const avgQuantity =
      relevantOrders.reduce((sum, o) => sum + o.quantity, 0) /
      relevantOrders.length;
    const avgPrice =
      relevantOrders.reduce((sum, o) => sum + o.price, 0) /
      relevantOrders.length;

    return {
      clientId,
      clientName: client?.name || "Unknown",
      strain,
      category,
      subcategory: undefined,
      grade: undefined,
      avgQuantity,
      avgPrice,
      orderFrequencyDays: Math.round(avgFrequency),
      daysSinceLastOrder: daysSinceLast,
      predictedNextOrderDate,
      daysUntilPredictedOrder: daysUntilPredicted,
      confidence,
      reasons,
    };
  } catch (error) {
    logger.error({
      msg: "Error predicting reorder",
      clientId,
      strain,
      category,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

/**
 * Get all predictive reorder opportunities
 * @param lookAheadDays - How many days ahead to predict (default: 30)
 * @param minOrderCount - Minimum orders required to predict (default: 3)
 * @returns Array of reorder predictions
 */
export async function getPredictiveReorderOpportunities(
  lookAheadDays: number = 30,
  minOrderCount: number = 3
): Promise<ReorderPrediction[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const allClients = await db.select().from(clients);
    const predictions: ReorderPrediction[] = [];

    for (const client of allClients) {
      // Get purchase patterns for this client
      const patterns = await analyzeClientPurchaseHistory(
        client.id,
        minOrderCount
      );

      for (const pattern of patterns) {
        const prediction = await predictReorder(
          client.id,
          pattern.strain,
          pattern.category
        );

        if (
          prediction &&
          prediction.daysUntilPredictedOrder <= lookAheadDays &&
          prediction.confidence >= 50
        ) {
          predictions.push(prediction);
        }
      }
    }

    // Sort by days until predicted order (most urgent first)
    predictions.sort(
      (a, b) => a.daysUntilPredictedOrder - b.daysUntilPredictedOrder
    );

    return predictions;
  } catch (error) {
    logger.error({
      msg: "Error getting predictive reorder opportunities",
      lookAheadDays,
      minOrderCount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to get predictive reorder opportunities: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
