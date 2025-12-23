/**
 * Ranking Service
 * Handles rank calculations, history, and trends
 */

import { db } from "../../db";
import { leaderboardRankHistory } from "../../../drizzle/schema";
import { eq, and, gte, desc, asc } from "drizzle-orm";
import type { RankedClient, RankHistoryEntry, MetricType } from "./types";

/**
 * Get client's trend from history
 */
export async function getClientTrend(
  clientId: number
): Promise<{ direction: "up" | "down" | "stable"; amount: number }> {
  if (!db) return { direction: "stable", amount: 0 };

  const history = await db
    .select()
    .from(leaderboardRankHistory)
    .where(eq(leaderboardRankHistory.clientId, clientId))
    .orderBy(desc(leaderboardRankHistory.snapshotDate))
    .limit(2);

  if (history.length < 2) {
    return { direction: "stable", amount: 0 };
  }

  const current = history[0].masterRank;
  const previous = history[1].masterRank;

  if (current === null || previous === null) {
    return { direction: "stable", amount: 0 };
  }

  const diff = previous - current; // Positive = improved (lower rank is better)

  if (diff > 0) return { direction: "up", amount: diff };
  if (diff < 0) return { direction: "down", amount: Math.abs(diff) };
  return { direction: "stable", amount: 0 };
}

/**
 * Get category ranks for a client
 */
export async function getCategoryRanks(
  clientId: number,
  _clientType: "CUSTOMER" | "SUPPLIER" | "DUAL"
): Promise<{
  financial: number | null;
  engagement: number | null;
  reliability: number | null;
  growth: number | null;
}> {
  if (!db) {
    return {
      financial: null,
      engagement: null,
      reliability: null,
      growth: null,
    };
  }

  // Get latest history entry
  const historyResult = await db
    .select()
    .from(leaderboardRankHistory)
    .where(eq(leaderboardRankHistory.clientId, clientId))
    .orderBy(desc(leaderboardRankHistory.snapshotDate))
    .limit(1);

  const history = historyResult[0];

  return {
    financial: history?.financialRank ?? null,
    engagement: history?.engagementRank ?? null,
    reliability: history?.reliabilityRank ?? null,
    growth: history?.growthRank ?? null,
  };
}

/**
 * Get gap to next rank
 */
export function getGapToNextRank(
  client: RankedClient,
  allClients: RankedClient[]
): { metric: MetricType; gap: number; nextRank: number } | null {
  if (client.rank === 1) return null;

  const nextClient = allClients.find(c => c.rank === client.rank - 1);
  if (!nextClient) return null;

  // Find the metric with the smallest gap
  let bestMetric: MetricType | null = null;
  let smallestGap = Infinity;

  for (const [metricType, result] of Object.entries(client.metrics)) {
    if (!result?.value) continue;
    const nextValue = nextClient.metrics[metricType as MetricType]?.value;
    if (!nextValue) continue;

    const gap = Math.abs(nextValue - result.value);
    if (gap < smallestGap) {
      smallestGap = gap;
      bestMetric = metricType as MetricType;
    }
  }

  if (!bestMetric) return null;

  return {
    metric: bestMetric,
    gap: smallestGap,
    nextRank: client.rank - 1,
  };
}

/**
 * Get rank history for a client
 */
export async function getRankHistory(
  clientId: number,
  months: number
): Promise<RankHistoryEntry[]> {
  if (!db) return [];

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const history = await db
    .select()
    .from(leaderboardRankHistory)
    .where(
      and(
        eq(leaderboardRankHistory.clientId, clientId),
        gte(leaderboardRankHistory.snapshotDate, startDate)
      )
    )
    .orderBy(asc(leaderboardRankHistory.snapshotDate));

  return history.map(h => ({
    date: h.snapshotDate instanceof Date 
      ? h.snapshotDate.toISOString().split("T")[0] 
      : String(h.snapshotDate),
    rank: h.masterRank ?? 0,
    score: h.masterScore ? parseFloat(h.masterScore) : null,
  }));
}

/**
 * Save rank history snapshot (called by scheduled job)
 */
export async function saveRankHistorySnapshot(
  clients: Array<{
    clientId: number;
    rank: number;
    masterScore: number | null;
  }>,
  totalCount: number
): Promise<void> {
  if (!db) {
    throw new Error("Database not available");
  }

  const today = new Date();

  // Save snapshot for each client
  for (const client of clients) {
    await db
      .insert(leaderboardRankHistory)
      .values({
        clientId: client.clientId,
        snapshotDate: today,
        masterRank: client.rank,
        masterScore: client.masterScore?.toString() ?? null,
        totalClients: totalCount,
      })
      .onDuplicateKeyUpdate({
        set: {
          masterRank: client.rank,
          masterScore: client.masterScore?.toString() ?? null,
          totalClients: totalCount,
        },
      });
  }
}
