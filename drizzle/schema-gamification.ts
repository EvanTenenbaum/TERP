/**
 * Sprint 5 Track B: Gamification Schema
 * TASK-IDs: MEET-044, MEET-045, FEAT-006
 *
 * Features:
 * - Anonymized VIP Leaderboard (MEET-044)
 * - Rewards System with Medals and Markup % (MEET-045)
 * - Full Referral (Couch Tax) Workflow (FEAT-006)
 */

import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  date,
  index,
  unique,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { users, clients, orders } from "./schema";

// ============================================================================
// MEET-044: Anonymized Leaderboard
// ============================================================================

/**
 * Leaderboard Periods
 * Defines time periods for leaderboard tracking
 */
export const leaderboardPeriodEnum = mysqlEnum("leaderboard_period", [
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "ALL_TIME",
]);

/**
 * Leaderboard Types
 * Different ranking criteria
 */
export const leaderboardTypeEnum = mysqlEnum("leaderboard_type", [
  "TOTAL_SPENT",
  "ORDER_COUNT",
  "REFERRALS",
  "ACTIVITY",
  "ACHIEVEMENTS",
]);

/**
 * VIP Leaderboard Snapshots
 * Stores periodic snapshots of client rankings for leaderboard display
 */
export const vipLeaderboardSnapshots = mysqlTable(
  "vip_leaderboard_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),

    // Period information
    period: leaderboardPeriodEnum.notNull(),
    periodStartDate: date("period_start_date").notNull(),
    periodEndDate: date("period_end_date").notNull(),

    // Ranking type
    leaderboardType: leaderboardTypeEnum.notNull(),

    // Client ranking data
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Anonymization
    anonymizedName: varchar("anonymized_name", { length: 100 }).notNull(), // e.g., "Gold Member #42"

    // Ranking
    rank: int("rank").notNull(),
    previousRank: int("previous_rank"),
    rankChange: int("rank_change"), // positive = moved up, negative = moved down

    // Score/Value
    score: decimal("score", { precision: 15, scale: 2 }).notNull(),

    // Percentile
    percentile: decimal("percentile", { precision: 5, scale: 2 }).notNull(), // 0-100

    // Metadata
    snapshotTakenAt: timestamp("snapshot_taken_at").defaultNow().notNull(),
  },
  table => ({
    periodIdx: index("idx_vip_lb_period").on(table.period),
    typeIdx: index("idx_vip_lb_type").on(table.leaderboardType),
    clientIdx: index("idx_vip_lb_client").on(table.clientId),
    rankIdx: index("idx_vip_lb_rank").on(table.rank),
    dateRangeIdx: index("idx_vip_lb_date_range").on(
      table.periodStartDate,
      table.periodEndDate
    ),
    uniqueEntry: unique("idx_vip_lb_unique").on(
      table.clientId,
      table.period,
      table.leaderboardType,
      table.periodStartDate
    ),
  })
);

export type VipLeaderboardSnapshot =
  typeof vipLeaderboardSnapshots.$inferSelect;
export type InsertVipLeaderboardSnapshot =
  typeof vipLeaderboardSnapshots.$inferInsert;

/**
 * Leaderboard Display Settings
 * Per-client settings for how they appear on leaderboards
 */
export const leaderboardDisplaySettings = mysqlTable(
  "leaderboard_display_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .unique()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Display preferences
    optOutOfLeaderboard: boolean("opt_out_of_leaderboard")
      .default(false)
      .notNull(),
    preferredAnonymousPrefix: varchar("preferred_anonymous_prefix", {
      length: 50,
    }).default("VIP Member"),
    showTierBadge: boolean("show_tier_badge").default(true).notNull(),
    showAchievementCount: boolean("show_achievement_count")
      .default(true)
      .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_lb_display_client").on(table.clientId),
  })
);

export type LeaderboardDisplaySettings =
  typeof leaderboardDisplaySettings.$inferSelect;
export type InsertLeaderboardDisplaySettings =
  typeof leaderboardDisplaySettings.$inferInsert;

// ============================================================================
// MEET-045: Rewards System (Medals, Markup %)
// ============================================================================

/**
 * Achievement Medal Types
 */
export const achievementMedalEnum = mysqlEnum("achievement_medal", [
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
]);

/**
 * Achievement Categories
 */
export const achievementCategoryEnum = mysqlEnum("achievement_category", [
  "SPENDING", // Total amount spent
  "ORDERS", // Number of orders
  "LOYALTY", // Account age, consecutive months
  "REFERRALS", // Referral achievements
  "ENGAGEMENT", // Activity-based achievements
  "SPECIAL", // Limited-time or special achievements
]);

/**
 * Achievement Definitions
 * Defines all possible achievements in the system
 */
export const achievements = mysqlTable(
  "achievements",
  {
    id: int("id").autoincrement().primaryKey(),

    // Identification
    code: varchar("code", { length: 50 }).notNull().unique(), // e.g., "FIRST_PURCHASE", "SPENT_10K"
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description").notNull(),

    // Categorization
    category: achievementCategoryEnum.notNull(),
    medal: achievementMedalEnum.notNull(),

    // Display
    icon: varchar("icon", { length: 50 }).notNull().default("award"), // Lucide icon name
    color: varchar("color", { length: 7 }).notNull().default("#6B7280"), // Hex color

    // Requirements
    requirementType: mysqlEnum("requirement_type", [
      "TOTAL_SPENT",
      "ORDER_COUNT",
      "CONSECUTIVE_MONTHS",
      "ACCOUNT_AGE_DAYS",
      "REFERRAL_COUNT",
      "REFERRAL_REVENUE",
      "ACTIVITY_SCORE",
      "MANUAL",
    ]).notNull(),
    requirementValue: decimal("requirement_value", {
      precision: 15,
      scale: 2,
    }).notNull(),

    // Rewards
    pointsAwarded: int("points_awarded").default(0).notNull(),
    markupDiscountPercent: decimal("markup_discount_percent", {
      precision: 5,
      scale: 2,
    }).default("0"),

    // Progression (for tiered achievements)
    parentAchievementId: int("parent_achievement_id"), // Previous tier in progression

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    isSecret: boolean("is_secret").default(false).notNull(), // Hidden until unlocked

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    codeIdx: index("idx_achievements_code").on(table.code),
    categoryIdx: index("idx_achievements_category").on(table.category),
    medalIdx: index("idx_achievements_medal").on(table.medal),
    activeIdx: index("idx_achievements_active").on(table.isActive),
  })
);

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

/**
 * Client Achievements
 * Tracks which achievements clients have earned
 */
export const clientAchievements = mysqlTable(
  "client_achievements",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    achievementId: int("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),

    // Earning details
    earnedAt: timestamp("earned_at").defaultNow().notNull(),
    earnedValue: decimal("earned_value", { precision: 15, scale: 2 }), // Actual value when earned

    // Progress tracking (for progressive achievements)
    progressValue: decimal("progress_value", {
      precision: 15,
      scale: 2,
    }).default("0"),
    progressPercent: decimal("progress_percent", {
      precision: 5,
      scale: 2,
    }).default("0"),

    // Display preferences
    isPinned: boolean("is_pinned").default(false).notNull(), // Show prominently
    isHidden: boolean("is_hidden").default(false).notNull(), // Hidden by user

    // Notification
    notificationSent: boolean("notification_sent").default(false).notNull(),
    viewedAt: timestamp("viewed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    clientIdx: index("idx_client_achievements_client").on(table.clientId),
    achievementIdx: index("idx_client_achievements_achievement").on(
      table.achievementId
    ),
    earnedAtIdx: index("idx_client_achievements_earned").on(table.earnedAt),
    uniqueClientAchievement: unique("idx_client_achievement_unique").on(
      table.clientId,
      table.achievementId
    ),
  })
);

export type ClientAchievement = typeof clientAchievements.$inferSelect;
export type InsertClientAchievement = typeof clientAchievements.$inferInsert;

/**
 * Points Ledger
 * Tracks all point transactions (earning and spending)
 */
export const pointsLedger = mysqlTable(
  "points_ledger",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Transaction type
    transactionType: mysqlEnum("transaction_type", [
      "EARNED_ACHIEVEMENT",
      "EARNED_PURCHASE",
      "EARNED_REFERRAL",
      "EARNED_BONUS",
      "REDEEMED",
      "EXPIRED",
      "ADJUSTED",
    ]).notNull(),

    // Amount (positive = earning, negative = spending/expiration)
    points: int("points").notNull(),

    // Running balance after this transaction
    balanceAfter: int("balance_after").notNull(),

    // References
    referenceType: varchar("reference_type", { length: 50 }), // e.g., "achievement", "order", "referral"
    referenceId: int("reference_id"),

    // Details
    description: varchar("description", { length: 255 }).notNull(),
    notes: text("notes"),

    // For expirations
    expiresAt: timestamp("expires_at"),

    // Processing
    processedById: int("processed_by_id").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    clientIdx: index("idx_points_ledger_client").on(table.clientId),
    typeIdx: index("idx_points_ledger_type").on(table.transactionType),
    createdAtIdx: index("idx_points_ledger_created").on(table.createdAt),
    expiresIdx: index("idx_points_ledger_expires").on(table.expiresAt),
    referenceIdx: index("idx_points_ledger_reference").on(
      table.referenceType,
      table.referenceId
    ),
  })
);

export type PointsLedgerEntry = typeof pointsLedger.$inferSelect;
export type InsertPointsLedgerEntry = typeof pointsLedger.$inferInsert;

/**
 * Client Points Summary
 * Cached summary of client points for quick access
 */
export const clientPointsSummary = mysqlTable(
  "client_points_summary",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .unique()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Current balance
    currentBalance: int("current_balance").default(0).notNull(),

    // Lifetime stats
    lifetimeEarned: int("lifetime_earned").default(0).notNull(),
    lifetimeRedeemed: int("lifetime_redeemed").default(0).notNull(),
    lifetimeExpired: int("lifetime_expired").default(0).notNull(),

    // Achievement counts
    totalAchievements: int("total_achievements").default(0).notNull(),
    bronzeCount: int("bronze_count").default(0).notNull(),
    silverCount: int("silver_count").default(0).notNull(),
    goldCount: int("gold_count").default(0).notNull(),
    platinumCount: int("platinum_count").default(0).notNull(),

    // Cumulative markup discount from achievements
    achievementMarkupDiscount: decimal("achievement_markup_discount", {
      precision: 5,
      scale: 2,
    }).default("0"),

    // Last update
    lastCalculatedAt: timestamp("last_calculated_at").defaultNow().notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdx: index("idx_points_summary_client").on(table.clientId),
    balanceIdx: index("idx_points_summary_balance").on(table.currentBalance),
  })
);

export type ClientPointsSummary = typeof clientPointsSummary.$inferSelect;
export type InsertClientPointsSummary = typeof clientPointsSummary.$inferInsert;

/**
 * Reward Catalog
 * Items that can be redeemed with points
 */
export const rewardCatalog = mysqlTable(
  "reward_catalog",
  {
    id: int("id").autoincrement().primaryKey(),

    // Identification
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description").notNull(),

    // Cost
    pointsCost: int("points_cost").notNull(),

    // Reward type
    rewardType: mysqlEnum("reward_type", [
      "MARKUP_DISCOUNT", // Percentage off markup
      "FIXED_DISCOUNT", // Fixed dollar amount off
      "FREE_SHIPPING", // Free shipping on next order
      "PRIORITY_SERVICE", // Priority handling
      "EXCLUSIVE_ACCESS", // Early access to products
      "CUSTOM", // Custom reward
    ]).notNull(),

    // Value
    rewardValue: decimal("reward_value", { precision: 10, scale: 2 }).notNull(), // Meaning depends on type

    // Display
    icon: varchar("icon", { length: 50 }).default("gift"),
    color: varchar("color", { length: 7 }).default("#10B981"),
    imageUrl: varchar("image_url", { length: 500 }),

    // Availability
    isActive: boolean("is_active").default(true).notNull(),
    availableFrom: timestamp("available_from"),
    availableUntil: timestamp("available_until"),
    quantityAvailable: int("quantity_available"), // null = unlimited
    quantityRedeemed: int("quantity_redeemed").default(0).notNull(),

    // Requirements
    minTierRequired: varchar("min_tier_required", { length: 50 }), // e.g., "Gold", "Platinum"
    minAchievementsRequired: int("min_achievements_required").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    codeIdx: index("idx_reward_catalog_code").on(table.code),
    activeIdx: index("idx_reward_catalog_active").on(table.isActive),
    typeIdx: index("idx_reward_catalog_type").on(table.rewardType),
    costIdx: index("idx_reward_catalog_cost").on(table.pointsCost),
  })
);

export type RewardCatalogItem = typeof rewardCatalog.$inferSelect;
export type InsertRewardCatalogItem = typeof rewardCatalog.$inferInsert;

/**
 * Reward Redemptions
 * Tracks when clients redeem rewards
 */
export const rewardRedemptions = mysqlTable(
  "reward_redemptions",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    rewardId: int("reward_id")
      .notNull()
      .references(() => rewardCatalog.id, { onDelete: "cascade" }),

    // Points spent
    pointsSpent: int("points_spent").notNull(),

    // Status
    status: mysqlEnum("status", [
      "PENDING",
      "APPROVED",
      "APPLIED",
      "EXPIRED",
      "CANCELLED",
    ])
      .notNull()
      .default("PENDING"),

    // Applied to order (if applicable)
    appliedToOrderId: int("applied_to_order_id").references(() => orders.id),

    // Expiration (rewards typically expire if not used)
    expiresAt: timestamp("expires_at"),

    // Processing
    approvedById: int("approved_by_id").references(() => users.id),
    approvedAt: timestamp("approved_at"),

    // Notes
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdx: index("idx_redemptions_client").on(table.clientId),
    rewardIdx: index("idx_redemptions_reward").on(table.rewardId),
    statusIdx: index("idx_redemptions_status").on(table.status),
    orderIdx: index("idx_redemptions_order").on(table.appliedToOrderId),
    expiresIdx: index("idx_redemptions_expires").on(table.expiresAt),
  })
);

export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
export type InsertRewardRedemption = typeof rewardRedemptions.$inferInsert;

// ============================================================================
// FEAT-006: Referral (Couch Tax) System
// ============================================================================

/**
 * Client Referral Codes
 * Unique referral codes for each client
 */
export const clientReferralCodes = mysqlTable(
  "client_referral_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .unique()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Referral code (unique, user-friendly)
    code: varchar("code", { length: 20 }).notNull().unique(), // e.g., "JOHN-X7K9"

    // Code generation info
    codeType: mysqlEnum("code_type", ["AUTO_GENERATED", "CUSTOM"])
      .notNull()
      .default("AUTO_GENERATED"),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Stats
    timesUsed: int("times_used").default(0).notNull(),
    totalReferralRevenue: decimal("total_referral_revenue", {
      precision: 15,
      scale: 2,
    }).default("0"),
    totalCouchTaxEarned: decimal("total_couch_tax_earned", {
      precision: 15,
      scale: 2,
    }).default("0"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdx: index("idx_referral_codes_client").on(table.clientId),
    codeIdx: index("idx_referral_codes_code").on(table.code),
    activeIdx: index("idx_referral_codes_active").on(table.isActive),
  })
);

export type ClientReferralCode = typeof clientReferralCodes.$inferSelect;
export type InsertClientReferralCode = typeof clientReferralCodes.$inferInsert;

/**
 * Referral Tracking
 * Tracks individual referrals and their conversion
 */
export const referralTracking = mysqlTable(
  "referral_tracking",
  {
    id: int("id").autoincrement().primaryKey(),

    // Referrer (who made the referral)
    referrerClientId: int("referrer_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    referralCodeUsed: varchar("referral_code_used", { length: 20 }),

    // Referred (who was referred)
    referredClientId: int("referred_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Status
    status: mysqlEnum("status", [
      "PENDING", // Client created but hasn't ordered
      "CONVERTED", // First order placed
      "COUCH_TAX_ACTIVE", // Currently earning couch tax
      "COMPLETED", // All couch tax orders fulfilled
      "CANCELLED", // Referral cancelled
    ])
      .notNull()
      .default("PENDING"),

    // Conversion
    convertedAt: timestamp("converted_at"), // When first order was placed
    firstOrderId: int("first_order_id").references(() => orders.id),

    // Couch tax configuration
    couchTaxPercent: decimal("couch_tax_percent", {
      precision: 5,
      scale: 2,
    }).default("5.00"), // Default 5%
    couchTaxOrderLimit: int("couch_tax_order_limit").default(3), // Number of orders that earn couch tax
    couchTaxOrderCount: int("couch_tax_order_count").default(0).notNull(), // Orders that have paid couch tax

    // Attribution window
    attributionExpiresAt: timestamp("attribution_expires_at"), // If null, no expiration

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    referrerIdx: index("idx_referral_tracking_referrer").on(
      table.referrerClientId
    ),
    referredIdx: index("idx_referral_tracking_referred").on(
      table.referredClientId
    ),
    statusIdx: index("idx_referral_tracking_status").on(table.status),
    codeUsedIdx: index("idx_referral_tracking_code").on(table.referralCodeUsed),
    uniqueReferral: unique("idx_referral_tracking_unique").on(
      table.referrerClientId,
      table.referredClientId
    ),
  })
);

export type ReferralTracking = typeof referralTracking.$inferSelect;
export type InsertReferralTracking = typeof referralTracking.$inferInsert;

/**
 * Couch Tax Payouts
 * Tracks individual couch tax payments from referred orders
 */
export const couchTaxPayouts = mysqlTable(
  "couch_tax_payouts",
  {
    id: int("id").autoincrement().primaryKey(),

    // Link to referral tracking
    referralTrackingId: int("referral_tracking_id")
      .notNull()
      .references(() => referralTracking.id, { onDelete: "cascade" }),

    // Referrer who receives the payout
    referrerClientId: int("referrer_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Order that triggered this payout
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    // Order number for the payout (e.g., 1st, 2nd, 3rd order of referred client)
    orderSequence: int("order_sequence").notNull(),

    // Amounts
    orderTotal: decimal("order_total", { precision: 15, scale: 2 }).notNull(),
    couchTaxPercent: decimal("couch_tax_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    payoutAmount: decimal("payout_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),

    // Status
    status: mysqlEnum("status", [
      "PENDING", // Calculated but not yet processed
      "APPROVED", // Approved for payout
      "PAID", // Paid to referrer
      "VOID", // Order cancelled/returned
    ])
      .notNull()
      .default("PENDING"),

    // Payment tracking
    paidAt: timestamp("paid_at"),
    paymentMethod: varchar("payment_method", { length: 50 }), // e.g., "CREDIT", "CHECK", "CASH"
    paymentReference: varchar("payment_reference", { length: 100 }),

    // Processing
    processedById: int("processed_by_id").references(() => users.id),

    // Notes
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    referralIdx: index("idx_couch_tax_referral").on(table.referralTrackingId),
    referrerIdx: index("idx_couch_tax_referrer").on(table.referrerClientId),
    orderIdx: index("idx_couch_tax_order").on(table.orderId),
    statusIdx: index("idx_couch_tax_status").on(table.status),
    uniquePayout: unique("idx_couch_tax_unique").on(
      table.referralTrackingId,
      table.orderId
    ),
  })
);

export type CouchTaxPayout = typeof couchTaxPayouts.$inferSelect;
export type InsertCouchTaxPayout = typeof couchTaxPayouts.$inferInsert;

/**
 * Referral Settings
 * Global configuration for the referral program
 */
// ⚠️ SCHEMA CONFLICT: This table ("referral_settings") has a DUAL DEFINITION.
// See also: drizzle/schema.ts ~line 6690 (referralCreditSettings)
// Both Drizzle objects point to the same physical DB table with different column sets.
// Resolution: Merge into a single definition in a future migration (RED mode).
// Tracked: P1-2 in Schema Audit Report 2026-02-19
// SCHEMA-010 FIX: Renamed export from referralSettings to referralGamificationSettings
// NOTE: Table name kept as "referral_settings" to match existing migration 0050
// The schema.ts referralCreditSettings uses the same table name but different columns
// This is a pre-existing schema conflict that needs a separate migration to resolve
export const referralGamificationSettings = mysqlTable("referral_settings", {
  id: int("id").autoincrement().primaryKey(),

  // Only one active settings record
  isActive: boolean("is_active").default(true).notNull(),

  // Default couch tax configuration
  defaultCouchTaxPercent: decimal("default_couch_tax_percent", {
    precision: 5,
    scale: 2,
  }).default("5.00"),
  defaultCouchTaxOrderLimit: int("default_couch_tax_order_limit").default(3),

  // Minimum requirements
  minOrderValueForCouch: decimal("min_order_value_for_couch", {
    precision: 10,
    scale: 2,
  }).default("100.00"),
  minReferrerAccountAgeDays: int("min_referrer_account_age_days").default(30),

  // Attribution
  attributionWindowDays: int("attribution_window_days").default(30), // 0 = no expiration

  // Points for referrals
  pointsPerReferral: int("points_per_referral").default(500),
  pointsPerReferralOrder: int("points_per_referral_order").default(100),

  // Cap limits
  maxPayoutPerMonth: decimal("max_payout_per_month", {
    precision: 10,
    scale: 2,
  }), // null = unlimited
  maxActiveReferrals: int("max_active_referrals"), // null = unlimited

  updatedById: int("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ReferralGamificationSettings =
  typeof referralGamificationSettings.$inferSelect;
export type InsertReferralGamificationSettings =
  typeof referralGamificationSettings.$inferInsert;
// Backwards compatibility aliases for gamification settings
export type ReferralSettings = ReferralGamificationSettings;
export type InsertReferralSettings = InsertReferralGamificationSettings;

// ============================================================================
// Relations
// ============================================================================

export const vipLeaderboardSnapshotsRelations = relations(
  vipLeaderboardSnapshots,
  ({ one }) => ({
    client: one(clients, {
      fields: [vipLeaderboardSnapshots.clientId],
      references: [clients.id],
    }),
  })
);

export const leaderboardDisplaySettingsRelations = relations(
  leaderboardDisplaySettings,
  ({ one }) => ({
    client: one(clients, {
      fields: [leaderboardDisplaySettings.clientId],
      references: [clients.id],
    }),
  })
);

export const achievementsRelations = relations(
  achievements,
  ({ one, many }) => ({
    parentAchievement: one(achievements, {
      fields: [achievements.parentAchievementId],
      references: [achievements.id],
      relationName: "achievementProgression",
    }),
    childAchievements: many(achievements, {
      relationName: "achievementProgression",
    }),
    clientAchievements: many(clientAchievements),
  })
);

export const clientAchievementsRelations = relations(
  clientAchievements,
  ({ one }) => ({
    client: one(clients, {
      fields: [clientAchievements.clientId],
      references: [clients.id],
    }),
    achievement: one(achievements, {
      fields: [clientAchievements.achievementId],
      references: [achievements.id],
    }),
  })
);

export const pointsLedgerRelations = relations(pointsLedger, ({ one }) => ({
  client: one(clients, {
    fields: [pointsLedger.clientId],
    references: [clients.id],
  }),
  processedBy: one(users, {
    fields: [pointsLedger.processedById],
    references: [users.id],
  }),
}));

export const clientPointsSummaryRelations = relations(
  clientPointsSummary,
  ({ one }) => ({
    client: one(clients, {
      fields: [clientPointsSummary.clientId],
      references: [clients.id],
    }),
  })
);

export const rewardCatalogRelations = relations(rewardCatalog, ({ many }) => ({
  redemptions: many(rewardRedemptions),
}));

export const rewardRedemptionsRelations = relations(
  rewardRedemptions,
  ({ one }) => ({
    client: one(clients, {
      fields: [rewardRedemptions.clientId],
      references: [clients.id],
    }),
    reward: one(rewardCatalog, {
      fields: [rewardRedemptions.rewardId],
      references: [rewardCatalog.id],
    }),
    appliedToOrder: one(orders, {
      fields: [rewardRedemptions.appliedToOrderId],
      references: [orders.id],
    }),
    approvedBy: one(users, {
      fields: [rewardRedemptions.approvedById],
      references: [users.id],
    }),
  })
);

export const clientReferralCodesRelations = relations(
  clientReferralCodes,
  ({ one }) => ({
    client: one(clients, {
      fields: [clientReferralCodes.clientId],
      references: [clients.id],
    }),
  })
);

export const referralTrackingRelations = relations(
  referralTracking,
  ({ one, many }) => ({
    referrer: one(clients, {
      fields: [referralTracking.referrerClientId],
      references: [clients.id],
      relationName: "referrer",
    }),
    referred: one(clients, {
      fields: [referralTracking.referredClientId],
      references: [clients.id],
      relationName: "referred",
    }),
    firstOrder: one(orders, {
      fields: [referralTracking.firstOrderId],
      references: [orders.id],
    }),
    payouts: many(couchTaxPayouts),
  })
);

export const couchTaxPayoutsRelations = relations(
  couchTaxPayouts,
  ({ one }) => ({
    referralTracking: one(referralTracking, {
      fields: [couchTaxPayouts.referralTrackingId],
      references: [referralTracking.id],
    }),
    referrer: one(clients, {
      fields: [couchTaxPayouts.referrerClientId],
      references: [clients.id],
    }),
    order: one(orders, {
      fields: [couchTaxPayouts.orderId],
      references: [orders.id],
    }),
    processedBy: one(users, {
      fields: [couchTaxPayouts.processedById],
      references: [users.id],
    }),
  })
);

export const referralGamificationSettingsRelations = relations(
  referralGamificationSettings,
  ({ one }) => ({
    updatedBy: one(users, {
      fields: [referralGamificationSettings.updatedById],
      references: [users.id],
    }),
  })
);
