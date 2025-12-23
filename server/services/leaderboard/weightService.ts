/**
 * Weight Service
 * Manages leaderboard weight configurations
 */

import { db } from "../../db";
import {
  leaderboardWeightConfigs,
  leaderboardDefaultWeights,
} from "../../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { WeightConfig, ClientType } from "./types";
import {
  CUSTOMER_DEFAULT_WEIGHTS,
  SUPPLIER_DEFAULT_WEIGHTS,
  ALL_DEFAULT_WEIGHTS,
} from "./constants";
import { normalizeWeights } from "./weightNormalizer";

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
    return getHardcodedDefaults(clientType);
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
  return getHardcodedDefaults(clientType);
}

/**
 * Get hardcoded default weights
 */
function getHardcodedDefaults(clientType: ClientType): WeightConfig {
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
