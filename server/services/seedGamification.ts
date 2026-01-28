/**
 * Gamification Module Seed Data
 * DATA-013: Seeds the database with default gamification configuration
 *
 * Includes:
 * - Achievement definitions (10+)
 * - Reward catalog items (5+)
 * - Default referral settings (Couch Tax configuration)
 * - Leaderboard display settings
 */

import { getDb } from "../db";
import { achievements, rewardCatalog } from "../../drizzle/schema-gamification";
import { referralCreditSettings } from "../../drizzle/schema";
import { logger } from "../_core/logger";
import { eq, isNull } from "drizzle-orm";

/**
 * Default achievement definitions
 */
const DEFAULT_ACHIEVEMENTS = [
  // ========================================================================
  // SPENDING MILESTONES (Bronze → Platinum progression)
  // ========================================================================
  {
    code: "FIRST_PURCHASE",
    name: "First Purchase",
    description: "Completed your first order with us",
    category: "SPENDING" as const,
    medal: "BRONZE" as const,
    icon: "shopping-cart",
    color: "#CD7F32",
    requirementType: "ORDER_COUNT" as const,
    requirementValue: "1",
    pointsAwarded: 100,
    markupDiscountPercent: "0",
  },
  {
    code: "SPENT_1K",
    name: "Rising Star",
    description: "Spent $1,000 in total purchases",
    category: "SPENDING" as const,
    medal: "BRONZE" as const,
    icon: "trending-up",
    color: "#CD7F32",
    requirementType: "TOTAL_SPENT" as const,
    requirementValue: "1000",
    pointsAwarded: 250,
    markupDiscountPercent: "1.0",
  },
  {
    code: "SPENT_5K",
    name: "Power Buyer",
    description: "Spent $5,000 in total purchases",
    category: "SPENDING" as const,
    medal: "SILVER" as const,
    icon: "zap",
    color: "#C0C0C0",
    requirementType: "TOTAL_SPENT" as const,
    requirementValue: "5000",
    pointsAwarded: 500,
    markupDiscountPercent: "2.0",
  },
  {
    code: "SPENT_10K",
    name: "VIP Shopper",
    description: "Spent $10,000 in total purchases",
    category: "SPENDING" as const,
    medal: "GOLD" as const,
    icon: "crown",
    color: "#FFD700",
    requirementType: "TOTAL_SPENT" as const,
    requirementValue: "10000",
    pointsAwarded: 1000,
    markupDiscountPercent: "3.0",
  },
  {
    code: "SPENT_25K",
    name: "Elite Collector",
    description: "Spent $25,000 in total purchases - Elite status achieved",
    category: "SPENDING" as const,
    medal: "PLATINUM" as const,
    icon: "diamond",
    color: "#E5E4E2",
    requirementType: "TOTAL_SPENT" as const,
    requirementValue: "25000",
    pointsAwarded: 2500,
    markupDiscountPercent: "5.0",
  },

  // ========================================================================
  // LOYALTY ACHIEVEMENTS
  // ========================================================================
  {
    code: "LOYAL_3_MONTHS",
    name: "Loyal Customer",
    description: "Active customer for 3 consecutive months",
    category: "LOYALTY" as const,
    medal: "BRONZE" as const,
    icon: "heart",
    color: "#CD7F32",
    requirementType: "CONSECUTIVE_MONTHS" as const,
    requirementValue: "3",
    pointsAwarded: 300,
    markupDiscountPercent: "0.5",
  },
  {
    code: "LOYAL_6_MONTHS",
    name: "Dedicated Patron",
    description: "Active customer for 6 consecutive months",
    category: "LOYALTY" as const,
    medal: "SILVER" as const,
    icon: "shield",
    color: "#C0C0C0",
    requirementType: "CONSECUTIVE_MONTHS" as const,
    requirementValue: "6",
    pointsAwarded: 600,
    markupDiscountPercent: "1.0",
  },
  {
    code: "LOYAL_12_MONTHS",
    name: "Anniversary VIP",
    description: "Celebrating 1 year as our valued customer",
    category: "LOYALTY" as const,
    medal: "GOLD" as const,
    icon: "award",
    color: "#FFD700",
    requirementType: "CONSECUTIVE_MONTHS" as const,
    requirementValue: "12",
    pointsAwarded: 1500,
    markupDiscountPercent: "2.0",
  },

  // ========================================================================
  // REFERRAL ACHIEVEMENTS
  // ========================================================================
  {
    code: "FIRST_REFERRAL",
    name: "Brand Ambassador",
    description: "Successfully referred your first customer",
    category: "REFERRALS" as const,
    medal: "BRONZE" as const,
    icon: "users",
    color: "#CD7F32",
    requirementType: "REFERRAL_COUNT" as const,
    requirementValue: "1",
    pointsAwarded: 500,
    markupDiscountPercent: "0",
  },
  {
    code: "REFERRAL_5",
    name: "Influencer",
    description: "Referred 5 customers who made purchases",
    category: "REFERRALS" as const,
    medal: "SILVER" as const,
    icon: "megaphone",
    color: "#C0C0C0",
    requirementType: "REFERRAL_COUNT" as const,
    requirementValue: "5",
    pointsAwarded: 1000,
    markupDiscountPercent: "1.5",
  },
  {
    code: "REFERRAL_10K_REVENUE",
    name: "Network Builder",
    description: "Your referrals generated $10,000 in revenue",
    category: "REFERRALS" as const,
    medal: "GOLD" as const,
    icon: "network",
    color: "#FFD700",
    requirementType: "REFERRAL_REVENUE" as const,
    requirementValue: "10000",
    pointsAwarded: 2000,
    markupDiscountPercent: "2.5",
  },

  // ========================================================================
  // ENGAGEMENT ACHIEVEMENTS
  // ========================================================================
  {
    code: "EARLY_ADOPTER",
    name: "Early Adopter",
    description: "Joined during our first year of operation",
    category: "ENGAGEMENT" as const,
    medal: "GOLD" as const,
    icon: "rocket",
    color: "#FFD700",
    requirementType: "MANUAL" as const,
    requirementValue: "1",
    pointsAwarded: 1000,
    markupDiscountPercent: "2.0",
    isSecret: true,
  },
];

/**
 * Default reward catalog items
 */
const DEFAULT_REWARDS = [
  {
    code: "DISCOUNT_5_PERCENT",
    name: "5% Off Next Order",
    description: "Get 5% off your next purchase",
    pointsCost: 500,
    rewardType: "MARKUP_DISCOUNT" as const,
    rewardValue: "5.00",
    icon: "percent",
    color: "#10B981",
  },
  {
    code: "DISCOUNT_10_PERCENT",
    name: "10% Off Next Order",
    description: "Get 10% off your next purchase",
    pointsCost: 900,
    rewardType: "MARKUP_DISCOUNT" as const,
    rewardValue: "10.00",
    icon: "percent",
    color: "#059669",
  },
  {
    code: "DISCOUNT_50_FIXED",
    name: "$50 Store Credit",
    description: "Apply $50 credit to any order",
    pointsCost: 1000,
    rewardType: "FIXED_DISCOUNT" as const,
    rewardValue: "50.00",
    icon: "dollar-sign",
    color: "#3B82F6",
  },
  {
    code: "PRIORITY_SERVICE",
    name: "Priority Handling",
    description: "Get priority processing on your next 3 orders",
    pointsCost: 750,
    rewardType: "PRIORITY_SERVICE" as const,
    rewardValue: "3.00",
    icon: "zap",
    color: "#F59E0B",
  },
  {
    code: "EXCLUSIVE_ACCESS",
    name: "Early Access Pass",
    description: "Get 48-hour early access to new product releases",
    pointsCost: 1500,
    rewardType: "EXCLUSIVE_ACCESS" as const,
    rewardValue: "48.00",
    icon: "key",
    color: "#8B5CF6",
    minTierRequired: "Gold",
  },
];

/**
 * Default referral settings (Couch Tax configuration)
 */
const DEFAULT_REFERRAL_SETTINGS = [
  {
    // Global default
    clientTier: null,
    creditPercentage: "10.00",
    minOrderAmount: "100.00",
    maxCreditAmount: "500.00",
    creditExpiryDays: 90,
    isActive: true,
  },
  {
    // Bronze tier
    clientTier: "Bronze",
    creditPercentage: "10.00",
    minOrderAmount: "100.00",
    maxCreditAmount: "250.00",
    creditExpiryDays: 60,
    isActive: true,
  },
  {
    // Silver tier
    clientTier: "Silver",
    creditPercentage: "12.00",
    minOrderAmount: "75.00",
    maxCreditAmount: "500.00",
    creditExpiryDays: 90,
    isActive: true,
  },
  {
    // Gold tier
    clientTier: "Gold",
    creditPercentage: "15.00",
    minOrderAmount: "50.00",
    maxCreditAmount: "1000.00",
    creditExpiryDays: 120,
    isActive: true,
  },
  {
    // Platinum tier
    clientTier: "Platinum",
    creditPercentage: "20.00",
    minOrderAmount: "0.00",
    maxCreditAmount: null, // No limit
    creditExpiryDays: null, // No expiry
    isActive: true,
  },
];

/**
 * Seed gamification data into the database
 *
 * This function is idempotent - it will only create entries that don't exist.
 * Existing entries will not be modified.
 *
 * @returns Object with counts of created and skipped items
 */
export async function seedGamification(): Promise<{
  achievements: { created: number; skipped: number };
  rewards: { created: number; skipped: number };
  referralCreditSettings: { created: number; skipped: number };
  errors: string[];
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = {
    achievements: { created: 0, skipped: 0 },
    rewards: { created: 0, skipped: 0 },
    referralCreditSettings: { created: 0, skipped: 0 },
    errors: [] as string[],
  };

  logger.info("[Gamification] Starting seed");

  // Seed achievements
  for (const achievement of DEFAULT_ACHIEVEMENTS) {
    try {
      const [existing] = await db
        .select()
        .from(achievements)
        .where(eq(achievements.code, achievement.code))
        .limit(1);

      if (existing) {
        result.achievements.skipped++;
        continue;
      }

      await db.insert(achievements).values(achievement);
      result.achievements.created++;
      logger.debug(
        { code: achievement.code },
        "[Gamification] Achievement created"
      );
    } catch (error) {
      const msg = `Failed to seed achievement ${achievement.code}: ${error}`;
      logger.error({ error }, msg);
      result.errors.push(msg);
    }
  }

  // Seed reward catalog
  for (const reward of DEFAULT_REWARDS) {
    try {
      const [existing] = await db
        .select()
        .from(rewardCatalog)
        .where(eq(rewardCatalog.code, reward.code))
        .limit(1);

      if (existing) {
        result.rewards.skipped++;
        continue;
      }

      await db.insert(rewardCatalog).values(reward);
      result.rewards.created++;
      logger.debug({ code: reward.code }, "[Gamification] Reward created");
    } catch (error) {
      const msg = `Failed to seed reward ${reward.code}: ${error}`;
      logger.error({ error }, msg);
      result.errors.push(msg);
    }
  }

  // Seed referral settings
  for (const setting of DEFAULT_REFERRAL_SETTINGS) {
    try {
      // Check for existing setting with same tier (or null for global)
      const [existing] = await db
        .select()
        .from(referralCreditSettings)
        .where(
          setting.clientTier
            ? eq(referralCreditSettings.clientTier, setting.clientTier)
            : isNull(referralCreditSettings.clientTier)
        )
        .limit(1);

      if (existing) {
        result.referralCreditSettings.skipped++;
        continue;
      }

      await db.insert(referralCreditSettings).values(setting);
      result.referralCreditSettings.created++;
      logger.debug(
        { tier: setting.clientTier || "global" },
        "[Gamification] Referral setting created"
      );
    } catch (error) {
      const msg = `Failed to seed referral setting for ${setting.clientTier || "global"}: ${error}`;
      logger.error({ error }, msg);
      result.errors.push(msg);
    }
  }

  logger.info(
    {
      achievements: result.achievements,
      rewards: result.rewards,
      referralCreditSettings: result.referralCreditSettings,
      errorCount: result.errors.length,
    },
    "[Gamification] Seed complete"
  );

  return result;
}

// Allow running directly
if (require.main === module) {
  seedGamification()
    .then(result => {
      console.info(
        "Gamification seed complete:",
        JSON.stringify(result, null, 2)
      );
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error("Gamification seed failed:", error);
      process.exit(1);
    });
}
