/**
 * Leaderboard Service
 * Main orchestration service for leaderboard operations
 */

import { db } from "../../db";
import { clients } from "../../../drizzle/schema";
import { eq, and, or, sql, like } from "drizzle-orm";
import type {
  MetricType,
  MetricResult,
  WeightConfig,
  LeaderboardParams,
  LeaderboardResult,
  RankedClient,
  ClientRankingResult,
  ClientType,
} from "./types";
import { MIN_CLIENTS_FOR_SIGNIFICANCE } from "./constants";
import { calculateAllMetrics, getClientType } from "./metricCalculator";
import { calculateMasterScore } from "./scoringService";
import { getEffectiveWeights } from "./weightService";
import { getCachedMetrics, cacheMetrics } from "./cacheService";
import { getClientTrend, getCategoryRanks, getGapToNextRank, getRankHistory } from "./rankingService";

// Re-export from sub-services for convenience
export { calculateMasterScore } from "./scoringService";
export { getEffectiveWeights, getDefaultWeights, saveUserWeights, resetUserWeights } from "./weightService";
export { invalidateCache } from "./cacheService";
export { saveRankHistorySnapshot } from "./rankingService";

/**
 * Get the full leaderboard with rankings
 */
export async function getLeaderboard(
  params: LeaderboardParams,
  userId?: number
): Promise<LeaderboardResult> {
  if (!db) {
    throw new Error("Database not available");
  }

  const {
    clientType = "ALL",
    weights: customWeights,
    search,
    sortBy = "master_score",
    sortOrder = "desc",
    limit = 25,
    offset = 0,
    forceRefresh = false,
  } = params;

  // Get weights to use
  const weights = customWeights || (await getEffectiveWeights(userId, clientType));

  // Build client filter
  const clientFilter = buildClientTypeFilter(clientType);

  // Get all matching clients
  const allClients = await fetchClients(clientFilter, search);

  // Calculate metrics for all clients
  const clientTypes = new Map<number, "CUSTOMER" | "SUPPLIER" | "DUAL">();
  for (const client of allClients) {
    clientTypes.set(client.id, getClientType(client));
  }

  // Get or calculate metrics
  const metricsMap = await getMetricsForClients(allClients, clientTypes, forceRefresh);

  // Calculate master scores and rank
  const { rankedClients, significanceWarnings } = await buildRankedClients(
    allClients,
    metricsMap,
    clientTypes,
    weights
  );

  // Sort by master score (or specific metric)
  sortRankedClients(rankedClients, sortBy, sortOrder);

  // Assign ranks and percentiles
  assignRanksAndPercentiles(rankedClients);

  // Apply pagination
  const paginatedClients = rankedClients.slice(offset, offset + limit);

  return {
    clients: paginatedClients,
    totalCount: rankedClients.length,
    metadata: {
      calculatedAt: new Date(),
      cacheHit: false,
      weightsApplied: weights,
      significanceWarnings,
    },
  };
}

/**
 * Get ranking context for a single client (for profile page)
 */
export async function getClientRanking(
  clientId: number,
  userId?: number
): Promise<ClientRankingResult | null> {
  if (!db) {
    throw new Error("Database not available");
  }

  // Get client info
  const clientResult = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  const client = clientResult[0];
  if (!client) return null;

  const clientTypeValue = getClientType(client);
  const weights = await getEffectiveWeights(userId, clientTypeValue === "DUAL" ? "ALL" : clientTypeValue);

  // Get full leaderboard to determine rank
  const leaderboard = await getLeaderboard({
    clientType: clientTypeValue === "DUAL" ? "ALL" : clientTypeValue,
    weights,
  });

  const clientEntry = leaderboard.clients.find(c => c.clientId === clientId);
  if (!clientEntry) return null;

  // Get category ranks
  const categoryRanks = await getCategoryRanks(clientId, clientTypeValue);

  // Get gap to next rank
  const gapToNext = getGapToNextRank(clientEntry, leaderboard.clients);

  // Get history
  const history = await getRankHistory(clientId, 6);

  return {
    clientId,
    rank: clientEntry.rank,
    percentile: clientEntry.percentile,
    totalClients: leaderboard.totalCount,
    masterScore: clientEntry.masterScore,
    categoryRanks,
    metrics: clientEntry.metrics,
    trend: clientEntry.trend,
    trendAmount: clientEntry.trendAmount,
    gapToNextRank: gapToNext,
    history,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build SQL filter for client type
 */
function buildClientTypeFilter(clientType: ClientType) {
  switch (clientType) {
    case "CUSTOMER":
      return eq(clients.isBuyer, true);
    case "SUPPLIER":
      return eq(clients.isSeller, true);
    case "DUAL":
      return and(eq(clients.isBuyer, true), eq(clients.isSeller, true));
    default:
      return sql`1=1`; // All clients
  }
}

/**
 * Fetch clients with optional search filter
 */
async function fetchClients(
  clientFilter: ReturnType<typeof buildClientTypeFilter>,
  search?: string
) {
  if (!db) throw new Error("Database not available");

  if (search) {
    return db
      .select({
        id: clients.id,
        name: clients.name,
        teriCode: clients.teriCode,
        isBuyer: clients.isBuyer,
        isSeller: clients.isSeller,
      })
      .from(clients)
      .where(
        and(
          clientFilter,
          or(
            like(clients.name, `%${search}%`),
            like(clients.teriCode, `%${search}%`)
          )
        )
      );
  }

  return db
    .select({
      id: clients.id,
      name: clients.name,
      teriCode: clients.teriCode,
      isBuyer: clients.isBuyer,
      isSeller: clients.isSeller,
    })
    .from(clients)
    .where(clientFilter);
}

/**
 * Get metrics for all clients (from cache or calculate)
 */
async function getMetricsForClients(
  allClients: Array<{ id: number; isBuyer: boolean | null; isSeller: boolean | null }>,
  clientTypes: Map<number, "CUSTOMER" | "SUPPLIER" | "DUAL">,
  forceRefresh: boolean
): Promise<Map<number, Partial<Record<MetricType, MetricResult>>>> {
  const metricsMap = new Map<number, Partial<Record<MetricType, MetricResult>>>();

  for (const client of allClients) {
    const cached = forceRefresh ? null : await getCachedMetrics(client.id);
    if (cached) {
      metricsMap.set(client.id, cached);
    } else {
      const metrics = await calculateAllMetrics(client.id, clientTypes.get(client.id)!);
      metricsMap.set(client.id, metrics);
      await cacheMetrics(client.id, metrics);
    }
  }

  return metricsMap;
}

/**
 * Build ranked clients array with scores and trends
 */
async function buildRankedClients(
  allClients: Array<{ id: number; name: string; teriCode: string | null; isBuyer: boolean | null; isSeller: boolean | null }>,
  metricsMap: Map<number, Partial<Record<MetricType, MetricResult>>>,
  clientTypes: Map<number, "CUSTOMER" | "SUPPLIER" | "DUAL">,
  weights: WeightConfig
): Promise<{ rankedClients: RankedClient[]; significanceWarnings: string[] }> {
  const rankedClients: RankedClient[] = [];
  const significanceWarnings: string[] = [];

  for (const client of allClients) {
    const metrics = metricsMap.get(client.id) || {};
    const { score } = calculateMasterScore(metrics, weights);
    const trend = await getClientTrend(client.id);
    const clientTypeValue = clientTypes.get(client.id);

    rankedClients.push({
      clientId: client.id,
      clientName: client.name,
      teriCode: client.teriCode ?? "",
      clientType: clientTypeValue === "DUAL" ? "DUAL" : 
                  clientTypeValue === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER",
      rank: 0,
      percentile: 0,
      masterScore: score,
      metrics,
      trend: trend.direction,
      trendAmount: trend.amount,
    });
  }

  if (rankedClients.length < MIN_CLIENTS_FOR_SIGNIFICANCE) {
    significanceWarnings.push(
      `Only ${rankedClients.length} clients in leaderboard. Rankings may not be statistically significant.`
    );
  }

  return { rankedClients, significanceWarnings };
}

/**
 * Sort ranked clients by specified field
 */
function sortRankedClients(
  rankedClients: RankedClient[],
  sortBy: string,
  sortOrder: "asc" | "desc"
): void {
  rankedClients.sort((a, b) => {
    let aValue: number | null;
    let bValue: number | null;

    if (sortBy === "master_score") {
      aValue = a.masterScore;
      bValue = b.masterScore;
    } else {
      aValue = a.metrics[sortBy as MetricType]?.value ?? null;
      bValue = b.metrics[sortBy as MetricType]?.value ?? null;
    }

    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
  });
}

/**
 * Assign ranks and percentiles to sorted clients
 */
function assignRanksAndPercentiles(rankedClients: RankedClient[]): void {
  rankedClients.forEach((client, index) => {
    client.rank = index + 1;
    client.percentile = ((index + 1) / rankedClients.length) * 100;
  });
}
