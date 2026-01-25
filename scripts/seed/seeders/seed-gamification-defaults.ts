/**
 * Gamification Defaults Seeder
 *
 * Seeds default achievements, reward catalog items, and referral settings.
 * DATA-013: Seed Gamification Module Defaults
 *
 * Dependencies: drizzle/schema-gamification.ts
 * Usage: npx tsx scripts/seed/seeders/seed-gamification-defaults.ts
 */

import { db } from "../../../server/_core/db";
import {
  achievements,
  rewardCatalog,
  referralSettings,
} from "../../../drizzle/schema-gamification";
import { eq } from "drizzle-orm";

// ============================================================================
// Achievement Definitions
// ============================================================================

interface AchievementDefinition {
  code: string;
  name: string;
  description: string;
  category:
    | "SPENDING"
    | "ORDERS"
    | "LOYALTY"
    | "REFERRALS"
    | "ENGAGEMENT"
    | "SPECIAL";
  medal: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  icon: string;
  color: string;
  requirementType:
    | "TOTAL_SPENT"
    | "ORDER_COUNT"
    | "CONSECUTIVE_MONTHS"
    | "ACCOUNT_AGE_DAYS"
    | "REFERRAL_COUNT"
    | "REFERRAL_REVENUE"
    | "ACTIVITY_SCORE"
    | "MANUAL";
  requirementValue: number;
  pointsAwarded: number;
  markupDiscountPercent?: number;
  parentCode?: string; // For tiered achievements
  isSecret?: boolean;
}

const ACHIEVEMENTS: AchievementDefinition[] = [
  // Spending Achievements (Tiered)
  {
    code: "SPENT_1K",
    name: "First Steps",
    description: "Spend your first $1,000 with us",
    category: "SPENDING",
    medal: "BRONZE",
    icon: "dollar-sign",
    color: "#CD7F32",
    requirementType: "TOTAL_SPENT",
    requirementValue: 1000,
    pointsAwarded: 100,
  },
  {
    code: "SPENT_5K",
    name: "Regular Customer",
    description: "Spend $5,000 in total purchases",
    category: "SPENDING",
    medal: "SILVER",
    icon: "trending-up",
    color: "#C0C0C0",
    requirementType: "TOTAL_SPENT",
    requirementValue: 5000,
    pointsAwarded: 250,
    markupDiscountPercent: 1.0,
    parentCode: "SPENT_1K",
  },
  {
    code: "SPENT_10K",
    name: "High Roller",
    description: "Spend $10,000 in total purchases",
    category: "SPENDING",
    medal: "GOLD",
    icon: "award",
    color: "#FFD700",
    requirementType: "TOTAL_SPENT",
    requirementValue: 10000,
    pointsAwarded: 500,
    markupDiscountPercent: 2.0,
    parentCode: "SPENT_5K",
  },
  {
    code: "SPENT_50K",
    name: "Elite Buyer",
    description: "Spend $50,000 in total purchases",
    category: "SPENDING",
    medal: "PLATINUM",
    icon: "crown",
    color: "#E5E4E2",
    requirementType: "TOTAL_SPENT",
    requirementValue: 50000,
    pointsAwarded: 1000,
    markupDiscountPercent: 3.0,
    parentCode: "SPENT_10K",
  },

  // Order Count Achievements
  {
    code: "FIRST_ORDER",
    name: "First Sale",
    description: "Complete your first purchase",
    category: "ORDERS",
    medal: "BRONZE",
    icon: "shopping-cart",
    color: "#CD7F32",
    requirementType: "ORDER_COUNT",
    requirementValue: 1,
    pointsAwarded: 50,
  },
  {
    code: "ORDERS_10",
    name: "Repeat Customer",
    description: "Complete 10 orders",
    category: "ORDERS",
    medal: "SILVER",
    icon: "repeat",
    color: "#C0C0C0",
    requirementType: "ORDER_COUNT",
    requirementValue: 10,
    pointsAwarded: 150,
    parentCode: "FIRST_ORDER",
  },
  {
    code: "ORDERS_50",
    name: "Loyal Buyer",
    description: "Complete 50 orders",
    category: "ORDERS",
    medal: "GOLD",
    icon: "heart",
    color: "#FFD700",
    requirementType: "ORDER_COUNT",
    requirementValue: 50,
    pointsAwarded: 400,
    markupDiscountPercent: 1.5,
    parentCode: "ORDERS_10",
  },
  {
    code: "ORDERS_100",
    name: "Century Club",
    description: "Complete 100 orders",
    category: "ORDERS",
    medal: "PLATINUM",
    icon: "star",
    color: "#E5E4E2",
    requirementType: "ORDER_COUNT",
    requirementValue: 100,
    pointsAwarded: 800,
    markupDiscountPercent: 2.5,
    parentCode: "ORDERS_50",
  },

  // Loyalty Achievements
  {
    code: "LOYAL_3M",
    name: "Quarterly Regular",
    description: "Be an active customer for 3 consecutive months",
    category: "LOYALTY",
    medal: "BRONZE",
    icon: "calendar",
    color: "#CD7F32",
    requirementType: "CONSECUTIVE_MONTHS",
    requirementValue: 3,
    pointsAwarded: 100,
  },
  {
    code: "LOYAL_6M",
    name: "Half Year Partner",
    description: "Be an active customer for 6 consecutive months",
    category: "LOYALTY",
    medal: "SILVER",
    icon: "calendar-check",
    color: "#C0C0C0",
    requirementType: "CONSECUTIVE_MONTHS",
    requirementValue: 6,
    pointsAwarded: 250,
    parentCode: "LOYAL_3M",
  },
  {
    code: "LOYAL_12M",
    name: "Annual Partner",
    description: "Be an active customer for 12 consecutive months",
    category: "LOYALTY",
    medal: "GOLD",
    icon: "clock",
    color: "#FFD700",
    requirementType: "CONSECUTIVE_MONTHS",
    requirementValue: 12,
    pointsAwarded: 500,
    markupDiscountPercent: 1.0,
    parentCode: "LOYAL_6M",
  },

  // Referral Achievements
  {
    code: "FIRST_REFERRAL",
    name: "Ambassador",
    description: "Successfully refer your first customer",
    category: "REFERRALS",
    medal: "BRONZE",
    icon: "users",
    color: "#CD7F32",
    requirementType: "REFERRAL_COUNT",
    requirementValue: 1,
    pointsAwarded: 200,
  },
  {
    code: "REFERRALS_5",
    name: "Influencer",
    description: "Refer 5 new customers",
    category: "REFERRALS",
    medal: "SILVER",
    icon: "user-plus",
    color: "#C0C0C0",
    requirementType: "REFERRAL_COUNT",
    requirementValue: 5,
    pointsAwarded: 500,
    parentCode: "FIRST_REFERRAL",
  },
  {
    code: "REFERRALS_10",
    name: "Network Builder",
    description: "Refer 10 new customers",
    category: "REFERRALS",
    medal: "GOLD",
    icon: "network",
    color: "#FFD700",
    requirementType: "REFERRAL_COUNT",
    requirementValue: 10,
    pointsAwarded: 1000,
    markupDiscountPercent: 2.0,
    parentCode: "REFERRALS_5",
  },

  // Special Achievements
  {
    code: "EARLY_ADOPTER",
    name: "Early Adopter",
    description: "Joined during our launch period",
    category: "SPECIAL",
    medal: "GOLD",
    icon: "zap",
    color: "#FFD700",
    requirementType: "MANUAL",
    requirementValue: 1,
    pointsAwarded: 300,
    isSecret: true,
  },
  {
    code: "VIP_MEMBER",
    name: "VIP Member",
    description: "Achieved VIP status",
    category: "SPECIAL",
    medal: "PLATINUM",
    icon: "gem",
    color: "#E5E4E2",
    requirementType: "MANUAL",
    requirementValue: 1,
    pointsAwarded: 500,
    markupDiscountPercent: 2.0,
  },
];

// ============================================================================
// Reward Catalog Definitions
// ============================================================================

interface RewardDefinition {
  code: string;
  name: string;
  description: string;
  pointsCost: number;
  rewardType:
    | "MARKUP_DISCOUNT"
    | "FIXED_DISCOUNT"
    | "FREE_SHIPPING"
    | "PRIORITY_SERVICE"
    | "EXCLUSIVE_ACCESS"
    | "CUSTOM";
  rewardValue: number;
  icon: string;
  color: string;
  minTierRequired?: string;
  minAchievementsRequired?: number;
}

const REWARDS: RewardDefinition[] = [
  {
    code: "DISCOUNT_1PCT",
    name: "1% Markup Discount",
    description: "Get 1% off your next order's markup",
    pointsCost: 500,
    rewardType: "MARKUP_DISCOUNT",
    rewardValue: 1.0,
    icon: "percent",
    color: "#10B981",
  },
  {
    code: "DISCOUNT_2PCT",
    name: "2% Markup Discount",
    description: "Get 2% off your next order's markup",
    pointsCost: 900,
    rewardType: "MARKUP_DISCOUNT",
    rewardValue: 2.0,
    icon: "percent",
    color: "#10B981",
    minAchievementsRequired: 3,
  },
  {
    code: "DISCOUNT_5PCT",
    name: "5% Markup Discount",
    description: "Get 5% off your next order's markup",
    pointsCost: 2000,
    rewardType: "MARKUP_DISCOUNT",
    rewardValue: 5.0,
    icon: "percent",
    color: "#10B981",
    minTierRequired: "Gold",
    minAchievementsRequired: 5,
  },
  {
    code: "FIXED_25",
    name: "$25 Credit",
    description: "$25 off your next order",
    pointsCost: 500,
    rewardType: "FIXED_DISCOUNT",
    rewardValue: 25.0,
    icon: "gift",
    color: "#3B82F6",
  },
  {
    code: "FIXED_50",
    name: "$50 Credit",
    description: "$50 off your next order",
    pointsCost: 900,
    rewardType: "FIXED_DISCOUNT",
    rewardValue: 50.0,
    icon: "gift",
    color: "#3B82F6",
    minAchievementsRequired: 2,
  },
  {
    code: "FIXED_100",
    name: "$100 Credit",
    description: "$100 off your next order",
    pointsCost: 1600,
    rewardType: "FIXED_DISCOUNT",
    rewardValue: 100.0,
    icon: "gift",
    color: "#3B82F6",
    minAchievementsRequired: 5,
  },
  {
    code: "PRIORITY_HANDLING",
    name: "Priority Handling",
    description: "Get your next order processed with priority",
    pointsCost: 300,
    rewardType: "PRIORITY_SERVICE",
    rewardValue: 1,
    icon: "zap",
    color: "#F59E0B",
  },
  {
    code: "EARLY_ACCESS",
    name: "Early Access Pass",
    description: "Get early access to new product drops for 30 days",
    pointsCost: 1500,
    rewardType: "EXCLUSIVE_ACCESS",
    rewardValue: 30,
    icon: "clock",
    color: "#8B5CF6",
    minTierRequired: "Silver",
  },
];

// ============================================================================
// Referral Settings
// ============================================================================

const DEFAULT_REFERRAL_SETTINGS = {
  isActive: true,
  defaultCouchTaxPercent: "5.00",
  defaultCouchTaxOrderLimit: 3,
  minOrderValueForCouch: "100.00",
  minReferrerAccountAgeDays: 30,
  attributionWindowDays: 30,
  pointsPerReferral: 500,
  pointsPerReferralOrder: 100,
  maxPayoutPerMonth: null, // Unlimited
  maxActiveReferrals: null, // Unlimited
};

// ============================================================================
// Seeder Functions
// ============================================================================

/**
 * Seed achievements with parent achievement linking
 */
async function seedAchievements(): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
}> {
  console.info("\n🏆 Seeding achievements...");

  // Build a map of codes to IDs for parent linking
  const codeToIdMap = new Map<string, number>();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // First pass: insert all achievements without parent links
  for (const achievement of ACHIEVEMENTS) {
    const existing = await db.query.achievements.findFirst({
      where: eq(achievements.code, achievement.code),
    });

    if (existing) {
      codeToIdMap.set(achievement.code, existing.id);
      // Update if description changed
      if (existing.description !== achievement.description) {
        await db
          .update(achievements)
          .set({
            name: achievement.name,
            description: achievement.description,
            pointsAwarded: achievement.pointsAwarded,
            markupDiscountPercent:
              achievement.markupDiscountPercent?.toString() ?? "0",
          })
          .where(eq(achievements.code, achievement.code));
        updated++;
        console.info(`  ↻ Updated: ${achievement.code}`);
      } else {
        skipped++;
      }
    } else {
      const [result] = await db.insert(achievements).values({
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        medal: achievement.medal,
        icon: achievement.icon,
        color: achievement.color,
        requirementType: achievement.requirementType,
        requirementValue: achievement.requirementValue.toString(),
        pointsAwarded: achievement.pointsAwarded,
        markupDiscountPercent:
          achievement.markupDiscountPercent?.toString() ?? "0",
        isSecret: achievement.isSecret ?? false,
        isActive: true,
      });
      codeToIdMap.set(achievement.code, Number(result.insertId));
      inserted++;
      console.info(`  ✓ Created: ${achievement.code}`);
    }
  }

  // Second pass: update parent achievement links
  for (const achievement of ACHIEVEMENTS) {
    if (achievement.parentCode) {
      const parentId = codeToIdMap.get(achievement.parentCode);
      const currentId = codeToIdMap.get(achievement.code);
      if (parentId && currentId) {
        await db
          .update(achievements)
          .set({ parentAchievementId: parentId })
          .where(eq(achievements.id, currentId));
      }
    }
  }

  return { inserted, updated, skipped };
}

/**
 * Seed reward catalog
 */
async function seedRewardCatalog(): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
}> {
  console.info("\n🎁 Seeding reward catalog...");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const reward of REWARDS) {
    const existing = await db.query.rewardCatalog.findFirst({
      where: eq(rewardCatalog.code, reward.code),
    });

    if (existing) {
      if (
        existing.description !== reward.description ||
        existing.pointsCost !== reward.pointsCost
      ) {
        await db
          .update(rewardCatalog)
          .set({
            name: reward.name,
            description: reward.description,
            pointsCost: reward.pointsCost,
            rewardValue: reward.rewardValue.toString(),
          })
          .where(eq(rewardCatalog.code, reward.code));
        updated++;
        console.info(`  ↻ Updated: ${reward.code}`);
      } else {
        skipped++;
      }
    } else {
      await db.insert(rewardCatalog).values({
        code: reward.code,
        name: reward.name,
        description: reward.description,
        pointsCost: reward.pointsCost,
        rewardType: reward.rewardType,
        rewardValue: reward.rewardValue.toString(),
        icon: reward.icon,
        color: reward.color,
        minTierRequired: reward.minTierRequired,
        minAchievementsRequired: reward.minAchievementsRequired ?? 0,
        isActive: true,
      });
      inserted++;
      console.info(`  ✓ Created: ${reward.code}`);
    }
  }

  return { inserted, updated, skipped };
}

/**
 * Seed referral settings
 */
async function seedReferralSettings(): Promise<boolean> {
  console.info("\n🤝 Seeding referral settings...");

  // Check if any active settings exist
  const existing = await db.query.referralSettings.findFirst({
    where: eq(referralSettings.isActive, true),
  });

  if (existing) {
    console.info("  ⏭ Referral settings already exist, skipping");
    return false;
  }

  await db.insert(referralSettings).values(DEFAULT_REFERRAL_SETTINGS);
  console.info("  ✓ Created default referral settings");
  return true;
}

// ============================================================================
// Main Seeder
// ============================================================================

export async function seedGamificationDefaults(): Promise<void> {
  console.info("🎮 Seeding gamification defaults...");

  const achievementResults = await seedAchievements();
  const rewardResults = await seedRewardCatalog();
  const referralCreated = await seedReferralSettings();

  console.info(`\n✅ Gamification seeding complete:`);
  console.info(
    `   Achievements: ${achievementResults.inserted} created, ${achievementResults.updated} updated, ${achievementResults.skipped} skipped`
  );
  console.info(
    `   Rewards: ${rewardResults.inserted} created, ${rewardResults.updated} updated, ${rewardResults.skipped} skipped`
  );
  console.info(
    `   Referral Settings: ${referralCreated ? "created" : "skipped (exists)"}`
  );
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  seedGamificationDefaults()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Failed to seed gamification defaults:", err);
      process.exit(1);
    });
}
