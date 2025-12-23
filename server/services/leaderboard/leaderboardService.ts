/**
 * Leaderboard Service
 * Main service for leaderboard operations including ranking, caching, and weight management
 */

import { db } from "../../db";
import {
  clients,
  leaderboardWeightConfigs,
  leaderboardDefaultWeights,
  leaderboardMetricCache,
  leaderboardRankHistory,
} from "../../../drizzle/schema";
import { eq, and, isNull, or, sql, desc, asc, like, gte } from "drizzle-orm";
import type {
  MetricType,
  MetricResult,
  WeightConfig,
  LeaderboardParams,
  LeaderboardResult,
  RankedClient,
  ClientRankingResult,
  MasterScoreBreakdown,
  MetricContribution,
  RankHistoryEntry,
  ClientType,
} from "./types";
import {
  METRIC_CONFIGS,
  CUSTOMER_DEFAULT_WEIGHTS,
  SUPPLIER_DEFAULT_WEIGHTS,
  ALL_DEFAULT_WEIGHTS,
  CACHE_TTL,
  MIN_CLIENTS_FOR_SIGNIFICANCE,
} from "./constants";
import { calculateAllMetrics, getClientType } from "./metricCalculator";
import { normalizeWeights, redistributeWeights } from "./weightNormalizer";

// ============================================================================
// MASTER SCORE CALCULATION
// ============================================================================

/**
 * Calculate master score from metrics and weights
 */
export function calculateMasterScore(
  metrics: Partial<Record<MetricType, MetricResult>>,
  weights: WeightConfig
): { score: number | null; breakdown: MasterScoreBreakdown } {
  const contributions: MetricContribution[] = [];
  const excludedMetrics: MetricType[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // First pass: identify which metrics can be included
  for (const [metricType, weight] of Object.entries(weights)) {
    const metric = metrics[metricType as MetricType];

    if (!metric || metric.value === null || !metric.isSignificant) {
      excludedMetrics.push(metricType as MetricType);
      contributions.push({
        metricType: metricType as MetricType,
        weight,
        normalizedValue: 0,
        contribution: 0,
        isIncluded: false,
        excludeReason: !metric
          ? "No data"
          : metric.value === null
          ? "Insufficient data"
          : "Below significance threshold",
      });
      continue;
    }

    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return {
      score: null,
      breakdown: {
        totalScore: 0,
        contributions,
        excludedMetrics,
        effectiveWeights: {},
      },
    };
  }

  // Redistribute weights among included metrics
  const effectiveWeights = redistributeWeights(weights, excludedMetrics);

  // Second pass: calculate normalized values and contributions
  for (const [metricType, effectiveWeight] of Object.entries(effectiveWeights)) {
    const metric = metrics[metricType as MetricType];
    const config = METRIC_CONFIGS[metricType as MetricType];

    if (!metric || metric.value === null) continue;

    // Normalize value to 0-100 scale
    let normalizedValue: number;

    if (config.direction === "optimal_range" && config.optimalMin !== undefined && config.optimalMax !== undefined) {
      // For optimal range metrics (like credit utilization)
      if (metric.value >= config.optimalMin && metric.value <= config.optimalMax) {
        normalizedValue = 100;
      } else {
        const distanceFromOptimal =
          metric.value < config.optimalMin
            ? config.optimalMin - metric.value
            : metric.value - config.optimalMax;
        normalizedValue = Math.max(0, 100 - distanceFromOptimal * 2);
      }
    } else if (config.direction === "lower_better") {
      // For metrics where lower is better (recency, days to pay)
      // Invert the scale - assume max reasonable value is 365 days
      const maxValue = 365;
      normalizedValue = Math.max(0, Math.min(100, ((maxValue - metric.value) / maxValue) * 100));
    } else {
      // For metrics where higher is better
      // Use a logarithmic scale for currency values to handle wide ranges
      if (config.format === "currency") {
        // Log scale: $0 = 0, $1M = 100
        normalizedValue = Math.min(100, (Math.log10(Math.max(1, metric.value)) / 6) * 100);
      } else if (config.format === "percentage") {
        normalizedValue = Math.min(100, metric.value);
      } else {
        // Count-based metrics
        normalizedValue = Math.min(100, metric.value * 10); // 10 orders = 100
      }
    }

    const contribution = (normalizedValue * effectiveWeight) / 100;
    totalScore += contribution;

    // Update contribution record
    const existingContribution = contributions.find(c => c.metricType === metricType);
    if (existingContribution) {
      existingContribution.normalizedValue = normalizedValue;
      existingContribution.contribution = contribution;
      existingContribution.isIncluded = true;
      existingContribution.weight = effectiveWeight;
    } else {
      contributions.push({
        metricType: metricType as MetricType,
        weight: effectiveWeight,
        normalizedValue,
        contribution,
        isIncluded: true,
      });
    }
  }

  return {
    score: Math.round(totalScore * 100) / 100,
    breakdown: {
      totalScore: Math.round(totalScore * 100) / 100,
      contributions,
      excludedMetrics,
      effectiveWeights,
    },
  };
}

// ============================================================================
// LEADERBOARD QUERIES
// ============================================================================

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

  // Get all matching clients - clients table doesn't have deletedAt
  let allClients;
  if (search) {
    allClients = await db
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
  } else {
    allClients = await db
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

  // Calculate metrics for all clients
  const clientTypes = new Map<number, "CUSTOMER" | "SUPPLIER" | "DUAL">();
  for (const client of allClients) {
    clientTypes.set(client.id, getClientType(client));
  }

  // Get or calculate metrics
  const metricsMap = new Map<number, Partial<Record<MetricType, MetricResult>>>();
  
  for (const client of allClients) {
    const cached = forceRefresh ? null : await getCachedMetrics(client.id);
    if (cached) {
      metricsMap.set(client.id, cached);
    } else {
      const metrics = await calculateAllMetrics(client.id, clientTypes.get(client.id)!);
      metricsMap.set(client.id, metrics);
      // Cache the results
      await cacheMetrics(client.id, metrics);
    }
  }

  // Calculate master scores and rank
  const rankedClients: RankedClient[] = [];
  const significanceWarnings: string[] = [];

  for (const client of allClients) {
    const metrics = metricsMap.get(client.id) || {};
    const { score } = calculateMasterScore(metrics, weights);

    // Get trend from history
    const trend = await getClientTrend(client.id);

    const clientTypeValue = clientTypes.get(client.id);
    rankedClients.push({
      clientId: client.id,
      clientName: client.name,
      teriCode: client.teriCode,
      clientType: clientTypeValue === "DUAL" ? "DUAL" : 
                  clientTypeValue === "SUPPLIER" ? "SUPPLIER" : "CUSTOMER",
      rank: 0, // Will be set after sorting
      percentile: 0, // Will be set after sorting
      masterScore: score,
      metrics,
      trend: trend.direction,
      trendAmount: trend.amount,
    });
  }

  // Sort by master score (or specific metric)
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

    // Handle nulls
    if (aValue === null && bValue === null) return 0;
    if (aValue === null) return 1;
    if (bValue === null) return -1;

    return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
  });

  // Assign ranks and percentiles
  rankedClients.forEach((client, index) => {
    client.rank = index + 1;
    client.percentile = ((index + 1) / rankedClients.length) * 100;
  });

  // Check for significance warnings
  if (rankedClients.length < MIN_CLIENTS_FOR_SIGNIFICANCE) {
    significanceWarnings.push(
      `Only ${rankedClients.length} clients in leaderboard. Rankings may not be statistically significant.`
    );
  }

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
// WEIGHT MANAGEMENT
// ============================================================================

/**
 * Get effective weights for a user (custom or default)
 */
export async function getEffectiveWeights(
  userId: number | undefined,
  clientType: ClientType
): Promise<WeightConfig> {
  if (!db) {
    return getDefaultWeights(clientType);
  }

  // Try to get user's custom weights
  if (userId) {
    const effectiveClientType = clientType === "DUAL" ? "ALL" : clientType;
    const userWeightsResult = await db
      .select()
      .from(leaderboardWeightConfigs)
      .where(
        and(
          eq(leaderboardWeightConfigs.userId, userId),
          eq(leaderboardWeightConfigs.clientType, effectiveClientType),
          eq(leaderboardWeightConfigs.isActive, true),
          isNull(leaderboardWeightConfigs.deletedAt)
        )
      )
      .limit(1);

    if (userWeightsResult[0]) {
      return userWeightsResult[0].weights as WeightConfig;
    }
  }

  // Fall back to system defaults
  return getDefaultWeights(clientType);
}

/**
 * Get default weights for a client type
 */
export async function getDefaultWeights(clientType: ClientType): Promise<WeightConfig> {
  if (!db) {
    // Fall back to hardcoded defaults
    switch (clientType) {
      case "SUPPLIER":
        return SUPPLIER_DEFAULT_WEIGHTS;
      case "CUSTOMER":
        return CUSTOMER_DEFAULT_WEIGHTS;
      default:
        return ALL_DEFAULT_WEIGHTS;
    }
  }

  // Try database defaults first
  const effectiveClientType = clientType === "DUAL" ? "ALL" : clientType;
  const dbDefaultsResult = await db
    .select()
    .from(leaderboardDefaultWeights)
    .where(eq(leaderboardDefaultWeights.clientType, effectiveClientType))
    .limit(1);

  if (dbDefaultsResult[0]) {
    return dbDefaultsResult[0].weights as WeightConfig;
  }

  // Fall back to hardcoded defaults
  switch (clientType) {
    case "SUPPLIER":
      return SUPPLIER_DEFAULT_WEIGHTS;
    case "CUSTOMER":
      return CUSTOMER_DEFAULT_WEIGHTS;
    default:
      return ALL_DEFAULT_WEIGHTS;
  }
}

/**
 * Save user's custom weights
 */
export async function saveUserWeights(
  userId: number,
  clientType: ClientType,
  weights: WeightConfig
): Promise<void> {
  if (!db) {
    throw new Error("Database not available");
  }

  const normalizedWeights = normalizeWeights(weights);
  const effectiveClientType = clientType === "DUAL" ? "ALL" : clientType;

  // Check if config exists
  const existingResult = await db
    .select()
    .from(leaderboardWeightConfigs)
    .where(
      and(
        eq(leaderboardWeightConfigs.userId, userId),
        eq(leaderboardWeightConfigs.clientType, effectiveClientType),
        eq(leaderboardWeightConfigs.configName, "default"),
        isNull(leaderboardWeightConfigs.deletedAt)
      )
    )
    .limit(1);

  const existing = existingResult[0];

  if (existing) {
    await db
      .update(leaderboardWeightConfigs)
      .set({ weights: normalizedWeights, updatedAt: new Date() })
      .where(eq(leaderboardWeightConfigs.id, existing.id));
  } else {
    await db.insert(leaderboardWeightConfigs).values({
      userId,
      clientType: effectiveClientType,
      configName: "default",
      weights: normalizedWeights,
      isActive: true,
    });
  }
}

/**
 * Reset user's weights to default
 */
export async function resetUserWeights(
  userId: number,
  clientType: ClientType
): Promise<void> {
  if (!db) {
    throw new Error("Database not available");
  }

  const effectiveClientType = clientType === "DUAL" ? "ALL" : clientType;

  await db
    .update(leaderboardWeightConfigs)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(leaderboardWeightConfigs.userId, userId),
        eq(leaderboardWeightConfigs.clientType, effectiveClientType),
        isNull(leaderboardWeightConfigs.deletedAt)
      )
    );
}

// ============================================================================
// CACHING
// ============================================================================

/**
 * Get cached metrics for a client
 */
async function getCachedMetrics(
  clientId: number
): Promise<Partial<Record<MetricType, MetricResult>> | null> {
  if (!db) return null;

  const cached = await db
    .select()
    .from(leaderboardMetricCache)
    .where(
      and(
        eq(leaderboardMetricCache.clientId, clientId),
        gte(leaderboardMetricCache.expiresAt, new Date())
      )
    );

  if (cached.length === 0) return null;

  const metrics: Partial<Record<MetricType, MetricResult>> = {};
  for (const entry of cached) {
    metrics[entry.metricType as MetricType] = {
      value: entry.metricValue ? parseFloat(entry.metricValue) : null,
      sampleSize: entry.sampleSize,
      isSignificant: entry.isSignificant,
      calculatedAt: entry.calculatedAt,
      rawData: entry.rawData as MetricResult["rawData"],
    };
  }

  return metrics;
}

/**
 * Cache metrics for a client
 */
async function cacheMetrics(
  clientId: number,
  metrics: Partial<Record<MetricType, MetricResult>>
): Promise<void> {
  if (!db) return;

  const expiresAt = new Date(Date.now() + CACHE_TTL.clientMetrics);

  for (const [metricType, result] of Object.entries(metrics)) {
    if (!result) continue;

    // Upsert cache entry
    await db
      .insert(leaderboardMetricCache)
      .values({
        clientId,
        metricType,
        metricValue: result.value?.toString() ?? null,
        sampleSize: result.sampleSize,
        isSignificant: result.isSignificant,
        rawData: result.rawData,
        calculatedAt: result.calculatedAt,
        expiresAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          metricValue: result.value?.toString() ?? null,
          sampleSize: result.sampleSize,
          isSignificant: result.isSignificant,
          rawData: result.rawData,
          calculatedAt: result.calculatedAt,
          expiresAt,
        },
      });
  }
}

/**
 * Invalidate cache for a client
 */
export async function invalidateCache(clientId?: number): Promise<void> {
  if (!db) return;

  if (clientId) {
    await db
      .delete(leaderboardMetricCache)
      .where(eq(leaderboardMetricCache.clientId, clientId));
  } else {
    await db.delete(leaderboardMetricCache);
  }
}

// ============================================================================
// HELPERS
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
 * Get client's trend from history
 */
async function getClientTrend(
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
async function getCategoryRanks(
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
function getGapToNextRank(
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
async function getRankHistory(
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
export async function saveRankHistorySnapshot(): Promise<void> {
  if (!db) {
    throw new Error("Database not available");
  }

  const today = new Date();

  // Get current leaderboard
  const leaderboard = await getLeaderboard({ clientType: "ALL" });

  // Save snapshot for each client
  for (const client of leaderboard.clients) {
    await db
      .insert(leaderboardRankHistory)
      .values({
        clientId: client.clientId,
        snapshotDate: today,
        masterRank: client.rank,
        masterScore: client.masterScore?.toString() ?? null,
        totalClients: leaderboard.totalCount,
      })
      .onDuplicateKeyUpdate({
        set: {
          masterRank: client.rank,
          masterScore: client.masterScore?.toString() ?? null,
          totalClients: leaderboard.totalCount,
        },
      });
  }
}
