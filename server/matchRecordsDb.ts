import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { matchRecords } from "../drizzle/schema";
import type { MatchRecord, InsertMatchRecord } from "../drizzle/schema";
import { logger } from "./_core/logger";

/**
 * Record a match for tracking and learning
 * @param match - Match data to record
 * @returns The created match record
 */
export async function recordMatch(match: InsertMatchRecord): Promise<MatchRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [inserted] = await db.insert(matchRecords).values(match);
    const [created] = await db
      .select()
      .from(matchRecords)
      .where(eq(matchRecords.id, inserted.insertId as number));
    
    return created;
  } catch (error) {
    logger.error({
      msg: "Error recording match",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to record match: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get match record by ID
 * @param id - Match record ID
 * @returns The match record or null
 */
export async function getMatchRecordById(id: number): Promise<MatchRecord | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [record] = await db
      .select()
      .from(matchRecords)
      .where(eq(matchRecords.id, id));
    
    return record || null;
  } catch (error) {
    logger.error({
      msg: "Error fetching match record",
      matchRecordId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch match record: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get all match records with optional filters
 * @param filters - Optional filters
 * @returns Array of match records
 */
export async function getMatchRecords(filters?: {
  clientId?: number;
  clientNeedId?: number;
  matchType?: "EXACT" | "CLOSE" | "HISTORICAL";
  userAction?: "CREATED_QUOTE" | "CONTACTED_VENDOR" | "DISMISSED" | "NONE";
}): Promise<MatchRecord[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    let query = db.select().from(matchRecords);
    
    const conditions = [];
    if (filters?.clientId) {
      conditions.push(eq(matchRecords.clientId, filters.clientId));
    }
    if (filters?.clientNeedId) {
      conditions.push(eq(matchRecords.clientNeedId, filters.clientNeedId));
    }
    if (filters?.matchType) {
      conditions.push(eq(matchRecords.matchType, filters.matchType));
    }
    if (filters?.userAction) {
      conditions.push(eq(matchRecords.userAction, filters.userAction));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const records = await query.orderBy(desc(matchRecords.createdAt));
    return records;
  } catch (error) {
    logger.error({
      msg: "Error fetching match records",
      filters,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch match records: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Update match record with user action
 * @param id - Match record ID
 * @param action - User action taken
 * @param actionedBy - User ID who took the action
 * @returns Updated match record
 */
export async function updateMatchAction(
  id: number,
  action: "CREATED_QUOTE" | "CONTACTED_VENDOR" | "DISMISSED" | "NONE",
  actionedBy: number
): Promise<MatchRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(matchRecords)
      .set({
        userAction: action,
        actionedAt: new Date(),
        actionedBy,
      })
      .where(eq(matchRecords.id, id));
    
    const [updated] = await db
      .select()
      .from(matchRecords)
      .where(eq(matchRecords.id, id));
    
    if (!updated) {
      throw new Error("Match record not found after update");
    }
    
    return updated;
  } catch (error) {
    logger.error({
      msg: "Error updating match action",
      matchRecordId: id,
      action,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to update match action: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Mark match as resulted in sale
 * @param id - Match record ID
 * @param saleOrderId - Sale order ID
 * @returns Updated match record
 */
export async function markMatchAsConverted(
  id: number,
  saleOrderId: number
): Promise<MatchRecord> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(matchRecords)
      .set({
        resultedInSale: true,
        saleOrderId,
      })
      .where(eq(matchRecords.id, id));
    
    const [updated] = await db
      .select()
      .from(matchRecords)
      .where(eq(matchRecords.id, id));
    
    if (!updated) {
      throw new Error("Match record not found after update");
    }
    
    return updated;
  } catch (error) {
    logger.error({
      msg: "Error marking match as converted",
      matchRecordId: id,
      saleOrderId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to mark match as converted: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get match conversion analytics
 * @returns Analytics data
 */
export async function getMatchAnalytics(): Promise<{
  totalMatches: number;
  matchesByType: Record<string, number>;
  matchesByAction: Record<string, number>;
  conversionRate: number;
  avgConfidenceScore: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const allMatches = await db.select().from(matchRecords);

    const totalMatches = allMatches.length;
    
    const matchesByType: Record<string, number> = {
      EXACT: 0,
      CLOSE: 0,
      HISTORICAL: 0,
    };
    
    const matchesByAction: Record<string, number> = {
      CREATED_QUOTE: 0,
      CONTACTED_VENDOR: 0,
      DISMISSED: 0,
      NONE: 0,
    };

    let totalConfidence = 0;
    let conversions = 0;

    for (const match of allMatches) {
      matchesByType[match.matchType] = (matchesByType[match.matchType] || 0) + 1;
      
      if (match.userAction) {
        matchesByAction[match.userAction] = (matchesByAction[match.userAction] || 0) + 1;
      } else {
        matchesByAction.NONE += 1;
      }

      if (match.confidenceScore) {
        totalConfidence += parseFloat(match.confidenceScore);
      }

      if (match.resultedInSale) {
        conversions += 1;
      }
    }

    const avgConfidenceScore = totalMatches > 0 ? totalConfidence / totalMatches : 0;
    const conversionRate = totalMatches > 0 ? (conversions / totalMatches) * 100 : 0;

    return {
      totalMatches,
      matchesByType,
      matchesByAction,
      conversionRate,
      avgConfidenceScore,
    };
  } catch (error) {
    logger.error({
      msg: "Error getting match analytics",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to get match analytics: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get matches for a specific client need
 * @param clientNeedId - Client need ID
 * @returns Array of match records
 */
export async function getMatchesForNeed(clientNeedId: number): Promise<MatchRecord[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const matches = await db
      .select()
      .from(matchRecords)
      .where(eq(matchRecords.clientNeedId, clientNeedId))
      .orderBy(desc(matchRecords.confidenceScore));
    
    return matches;
  } catch (error) {
    logger.error({
      msg: "Error fetching matches for need",
      clientNeedId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch matches for need: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get top performing matches (highest conversion rate)
 * @param limit - Number of results to return
 * @returns Array of match patterns with conversion rates
 */
export async function getTopPerformingMatches(limit: number = 10): Promise<Array<{
  matchType: string;
  avgConfidence: number;
  totalMatches: number;
  conversions: number;
  conversionRate: number;
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const allMatches = await db.select().from(matchRecords);

    const typeStats = new Map<string, {
      totalConfidence: number;
      count: number;
      conversions: number;
    }>();

    for (const match of allMatches) {
      const type = match.matchType;
      const existing = typeStats.get(type) || { totalConfidence: 0, count: 0, conversions: 0 };
      
      existing.count += 1;
      existing.totalConfidence += parseFloat(match.confidenceScore || "0");
      if (match.resultedInSale) {
        existing.conversions += 1;
      }

      typeStats.set(type, existing);
    }

    const results = Array.from(typeStats.entries()).map(([type, stats]) => ({
      matchType: type,
      avgConfidence: stats.count > 0 ? stats.totalConfidence / stats.count : 0,
      totalMatches: stats.count,
      conversions: stats.conversions,
      conversionRate: stats.count > 0 ? (stats.conversions / stats.count) * 100 : 0,
    }));

    // Sort by conversion rate
    results.sort((a, b) => b.conversionRate - a.conversionRate);

    return results.slice(0, limit);
  } catch (error) {
    logger.error({
      msg: "Error getting top performing matches",
      limit,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to get top performing matches: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

