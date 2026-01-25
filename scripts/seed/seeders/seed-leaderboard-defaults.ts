/**
 * Leaderboard Default Weights Seeder
 * Seeds the default weight configurations for the leaderboard system
 */

import { db } from "../../db-sync";
import { leaderboardDefaultWeights } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Default weights for customer leaderboard (isBuyer=true)
 * Total: 100%
 */
const CUSTOMER_DEFAULT_WEIGHTS: Record<string, number> = {
  ytd_revenue: 25,
  on_time_payment_rate: 20,
  order_frequency: 15,
  profit_margin: 15,
  credit_utilization: 10,
  yoy_growth: 10,
  recency: 5,
};

/**
 * Default weights for supplier leaderboard (isSeller=true)
 * Total: 100%
 */
const SUPPLIER_DEFAULT_WEIGHTS: Record<string, number> = {
  ytd_purchase_volume: 25,
  delivery_reliability: 25,
  quality_score: 20,
  product_variety: 15,
  response_time: 10,
  return_rate: 5,
};

/**
 * Default weights for all clients (combined view)
 * Uses customer weights as the base
 * Total: 100%
 */
const ALL_DEFAULT_WEIGHTS: Record<string, number> = {
  ytd_revenue: 25,
  on_time_payment_rate: 20,
  order_frequency: 15,
  profit_margin: 15,
  credit_utilization: 10,
  yoy_growth: 10,
  recency: 5,
};

export async function seedLeaderboardDefaults(): Promise<void> {
  console.info("🏆 Seeding leaderboard default weights...");

  const configs = [
    { clientType: "CUSTOMER" as const, weights: CUSTOMER_DEFAULT_WEIGHTS },
    { clientType: "SUPPLIER" as const, weights: SUPPLIER_DEFAULT_WEIGHTS },
    { clientType: "ALL" as const, weights: ALL_DEFAULT_WEIGHTS },
  ];

  for (const config of configs) {
    // Check if already exists
    const existing = await db.query.leaderboardDefaultWeights.findFirst({
      where: eq(leaderboardDefaultWeights.clientType, config.clientType),
    });

    if (existing) {
      console.info(`  ✓ ${config.clientType} weights already exist, skipping`);
      continue;
    }

    // Insert new default weights
    await db.insert(leaderboardDefaultWeights).values({
      clientType: config.clientType,
      weights: config.weights,
      updatedBy: null, // System-generated
    });

    console.info(`  ✓ Created ${config.clientType} default weights`);
  }

  console.info("✅ Leaderboard default weights seeded successfully");
}

// Allow running directly
if (require.main === module) {
  seedLeaderboardDefaults()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Failed to seed leaderboard defaults:", err);
      process.exit(1);
    });
}
