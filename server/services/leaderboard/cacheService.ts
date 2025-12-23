/**
 * Cache Service
 * Manages leaderboard metric caching
 */

import { db } from "../../db";
import { leaderboardMetricCache } from "../../../drizzle/schema";
import { eq, and, gte } from "drizzle-orm";
import type { MetricType, MetricResult } from "./types";
import { CACHE_TTL } from "./constants";

/**
 * Get cached metrics for a client
 */
export async function getCachedMetrics(
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
export async function cacheMetrics(
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
 * Invalidate cache for a client or all clients
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
