/**
 * Gamification Router
 * Sprint 5 Track B: MEET-044, MEET-045, FEAT-006
 *
 * Provides CRUD operations for:
 * - Anonymized VIP Leaderboard
 * - Rewards System (Achievements, Points, Medals)
 * - Referral (Couch Tax) Workflow
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  adminProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { getDb } from "../db";
import {
  vipLeaderboardSnapshots,
  leaderboardDisplaySettings,
  achievements,
  clientAchievements,
  pointsLedger,
  clientPointsSummary,
  rewardCatalog,
  rewardRedemptions,
  clientReferralCodes,
  referralTracking,
  couchTaxPayouts,
  referralSettings,
} from "../../drizzle/schema-gamification";
import { clients, orders } from "../../drizzle/schema";
import { clientVipStatus, vipTiers } from "../../drizzle/schema-vip-portal";
import {
  eq,
  and,
  desc,
  asc,
  gte,
  lte,
  sql,
  isNull,
  inArray,
  or,
} from "drizzle-orm";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique referral code for a client
 */
function generateReferralCode(clientName: string): string {
  const prefix = clientName
    .split(" ")[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

/**
 * Generate an anonymized name for leaderboard display
 */
function generateAnonymizedName(
  tierName: string | null,
  clientId: number
): string {
  const tier = tierName || "VIP";
  return `${tier} Member #${clientId % 1000}`;
}

/**
 * Get start of current week
 */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get start of current month
 */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Get start of current year
 */
function getYearStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const leaderboardPeriodSchema = z.enum([
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "ALL_TIME",
]);
const leaderboardTypeSchema = z.enum([
  "TOTAL_SPENT",
  "ORDER_COUNT",
  "REFERRALS",
  "ACTIVITY",
  "ACHIEVEMENTS",
]);
const achievementMedalSchema = z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]);
const achievementCategorySchema = z.enum([
  "SPENDING",
  "ORDERS",
  "LOYALTY",
  "REFERRALS",
  "ENGAGEMENT",
  "SPECIAL",
]);

// ============================================================================
// ROUTER
// ============================================================================

export const gamificationRouter = router({
  // ==========================================================================
  // ANONYMIZED LEADERBOARD - MEET-044
  // ==========================================================================

  leaderboard: router({
    /**
     * Get anonymized VIP leaderboard
     * Shows rankings without revealing client identities
     */
    getAnonymized: protectedProcedure
      .input(
        z.object({
          period: leaderboardPeriodSchema.default("MONTHLY"),
          type: leaderboardTypeSchema.default("TOTAL_SPENT"),
          limit: z.number().min(1).max(100).default(25),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Get current period dates
        let periodStart: Date;
        const periodEnd = new Date();

        switch (input.period) {
          case "WEEKLY":
            periodStart = getWeekStart();
            break;
          case "MONTHLY":
            periodStart = getMonthStart();
            break;
          case "YEARLY":
            periodStart = getYearStart();
            break;
          case "ALL_TIME":
            periodStart = new Date(2000, 0, 1); // Far back date
            break;
          default:
            periodStart = getMonthStart();
        }

        // Get latest snapshots for the period
        const snapshots = await db
          .select({
            snapshot: vipLeaderboardSnapshots,
            displaySettings: leaderboardDisplaySettings,
          })
          .from(vipLeaderboardSnapshots)
          .leftJoin(
            leaderboardDisplaySettings,
            eq(
              vipLeaderboardSnapshots.clientId,
              leaderboardDisplaySettings.clientId
            )
          )
          .where(
            and(
              eq(vipLeaderboardSnapshots.period, input.period),
              eq(vipLeaderboardSnapshots.leaderboardType, input.type),
              gte(vipLeaderboardSnapshots.periodStartDate, periodStart),
              lte(vipLeaderboardSnapshots.periodEndDate, periodEnd),
              or(
                isNull(leaderboardDisplaySettings.optOutOfLeaderboard),
                eq(leaderboardDisplaySettings.optOutOfLeaderboard, false)
              )
            )
          )
          .orderBy(asc(vipLeaderboardSnapshots.rank))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const [countResult] = await db
          .select({
            count: sql<number>`COUNT(DISTINCT ${vipLeaderboardSnapshots.clientId})`,
          })
          .from(vipLeaderboardSnapshots)
          .leftJoin(
            leaderboardDisplaySettings,
            eq(
              vipLeaderboardSnapshots.clientId,
              leaderboardDisplaySettings.clientId
            )
          )
          .where(
            and(
              eq(vipLeaderboardSnapshots.period, input.period),
              eq(vipLeaderboardSnapshots.leaderboardType, input.type),
              gte(vipLeaderboardSnapshots.periodStartDate, periodStart),
              or(
                isNull(leaderboardDisplaySettings.optOutOfLeaderboard),
                eq(leaderboardDisplaySettings.optOutOfLeaderboard, false)
              )
            )
          );

        return {
          entries: snapshots.map(s => ({
            rank: s.snapshot.rank,
            previousRank: s.snapshot.previousRank,
            rankChange: s.snapshot.rankChange,
            anonymizedName: s.snapshot.anonymizedName,
            score: Number(s.snapshot.score),
            percentile: Number(s.snapshot.percentile),
            showTierBadge: s.displaySettings?.showTierBadge ?? true,
            showAchievementCount:
              s.displaySettings?.showAchievementCount ?? true,
          })),
          totalCount: countResult?.count ?? 0,
          period: input.period,
          type: input.type,
        };
      }),

    /**
     * Get current user's position in the leaderboard
     * VIP Portal: Shows their own ranking
     */
    getMyPosition: protectedProcedure
      .input(
        z.object({
          clientId: z.number().int(),
          period: leaderboardPeriodSchema.default("MONTHLY"),
          type: leaderboardTypeSchema.default("TOTAL_SPENT"),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        let periodStart: Date;
        switch (input.period) {
          case "WEEKLY":
            periodStart = getWeekStart();
            break;
          case "MONTHLY":
            periodStart = getMonthStart();
            break;
          case "YEARLY":
            periodStart = getYearStart();
            break;
          case "ALL_TIME":
            periodStart = new Date(2000, 0, 1);
            break;
          default:
            periodStart = getMonthStart();
        }

        const [snapshot] = await db
          .select()
          .from(vipLeaderboardSnapshots)
          .where(
            and(
              eq(vipLeaderboardSnapshots.clientId, input.clientId),
              eq(vipLeaderboardSnapshots.period, input.period),
              eq(vipLeaderboardSnapshots.leaderboardType, input.type),
              gte(vipLeaderboardSnapshots.periodStartDate, periodStart)
            )
          )
          .orderBy(desc(vipLeaderboardSnapshots.snapshotTakenAt))
          .limit(1);

        if (!snapshot) {
          return null;
        }

        // Get total participants count
        const [countResult] = await db
          .select({
            count: sql<number>`COUNT(DISTINCT ${vipLeaderboardSnapshots.clientId})`,
          })
          .from(vipLeaderboardSnapshots)
          .where(
            and(
              eq(vipLeaderboardSnapshots.period, input.period),
              eq(vipLeaderboardSnapshots.leaderboardType, input.type),
              gte(vipLeaderboardSnapshots.periodStartDate, periodStart)
            )
          );

        return {
          rank: snapshot.rank,
          previousRank: snapshot.previousRank,
          rankChange: snapshot.rankChange,
          score: Number(snapshot.score),
          percentile: Number(snapshot.percentile),
          totalParticipants: countResult?.count ?? 0,
        };
      }),

    /**
     * Update leaderboard display settings
     */
    updateDisplaySettings: protectedProcedure
      .input(
        z.object({
          clientId: z.number().int(),
          optOutOfLeaderboard: z.boolean().optional(),
          preferredAnonymousPrefix: z.string().max(50).optional(),
          showTierBadge: z.boolean().optional(),
          showAchievementCount: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const { clientId, ...updateData } = input;

        // Check if settings exist
        const [existing] = await db
          .select()
          .from(leaderboardDisplaySettings)
          .where(eq(leaderboardDisplaySettings.clientId, clientId))
          .limit(1);

        if (existing) {
          await db
            .update(leaderboardDisplaySettings)
            .set(updateData)
            .where(eq(leaderboardDisplaySettings.clientId, clientId));
        } else {
          await db.insert(leaderboardDisplaySettings).values({
            clientId,
            ...updateData,
          });
        }

        return { success: true };
      }),

    /**
     * Refresh leaderboard snapshot (admin only)
     */
    refreshSnapshot: adminProcedure
      .input(
        z.object({
          period: leaderboardPeriodSchema,
          type: leaderboardTypeSchema,
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Get period dates
        let periodStart: Date;
        const periodEnd = new Date();

        switch (input.period) {
          case "WEEKLY":
            periodStart = getWeekStart();
            break;
          case "MONTHLY":
            periodStart = getMonthStart();
            break;
          case "YEARLY":
            periodStart = getYearStart();
            break;
          case "ALL_TIME":
            periodStart = new Date(2000, 0, 1);
            break;
          default:
            periodStart = getMonthStart();
        }

        // Calculate rankings based on type
        let clientScores: Array<{
          clientId: number;
          score: number;
          tierName: string | null;
        }>;

        if (input.type === "TOTAL_SPENT") {
          const result = await db
            .select({
              clientId: clients.id,
              score: sql<number>`COALESCE(${clients.totalSpent}, 0)`,
              tierName: vipTiers.name,
            })
            .from(clients)
            .leftJoin(clientVipStatus, eq(clients.id, clientVipStatus.clientId))
            .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
            .where(
              and(
                eq(clients.isBuyer, true),
                isNull(clients.deletedAt),
                eq(clients.vipPortalEnabled, true)
              )
            )
            .orderBy(desc(sql`COALESCE(${clients.totalSpent}, 0)`));

          clientScores = result.map(r => ({
            clientId: r.clientId,
            score: Number(r.score),
            tierName: r.tierName,
          }));
        } else if (input.type === "ORDER_COUNT") {
          const result = await db
            .select({
              clientId: clients.id,
              score: sql<number>`COUNT(${orders.id})`,
              tierName: vipTiers.name,
            })
            .from(clients)
            .leftJoin(orders, eq(clients.id, orders.clientId))
            .leftJoin(clientVipStatus, eq(clients.id, clientVipStatus.clientId))
            .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
            .where(
              and(
                eq(clients.isBuyer, true),
                isNull(clients.deletedAt),
                eq(clients.vipPortalEnabled, true)
              )
            )
            .groupBy(clients.id)
            .orderBy(desc(sql`COUNT(${orders.id})`));

          clientScores = result.map(r => ({
            clientId: r.clientId,
            score: Number(r.score),
            tierName: r.tierName,
          }));
        } else if (input.type === "REFERRALS") {
          const result = await db
            .select({
              clientId: clientReferralCodes.clientId,
              score: clientReferralCodes.timesUsed,
              tierName: vipTiers.name,
            })
            .from(clientReferralCodes)
            .leftJoin(clients, eq(clientReferralCodes.clientId, clients.id))
            .leftJoin(clientVipStatus, eq(clients.id, clientVipStatus.clientId))
            .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
            .where(
              and(isNull(clients.deletedAt), eq(clients.vipPortalEnabled, true))
            )
            .orderBy(desc(clientReferralCodes.timesUsed));

          clientScores = result.map(r => ({
            clientId: r.clientId,
            score: Number(r.score),
            tierName: r.tierName,
          }));
        } else if (input.type === "ACHIEVEMENTS") {
          const result = await db
            .select({
              clientId: clientPointsSummary.clientId,
              score: clientPointsSummary.totalAchievements,
              tierName: vipTiers.name,
            })
            .from(clientPointsSummary)
            .leftJoin(clients, eq(clientPointsSummary.clientId, clients.id))
            .leftJoin(clientVipStatus, eq(clients.id, clientVipStatus.clientId))
            .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
            .where(
              and(isNull(clients.deletedAt), eq(clients.vipPortalEnabled, true))
            )
            .orderBy(desc(clientPointsSummary.totalAchievements));

          clientScores = result.map(r => ({
            clientId: r.clientId,
            score: Number(r.score),
            tierName: r.tierName,
          }));
        } else {
          // Default: activity (could be based on logins, interactions, etc.)
          clientScores = [];
        }

        // Calculate rankings and insert snapshots
        const totalClients = clientScores.length;
        const snapshots = clientScores.map((cs, index) => ({
          period: input.period,
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          leaderboardType: input.type,
          clientId: cs.clientId,
          anonymizedName: generateAnonymizedName(cs.tierName, cs.clientId),
          rank: index + 1,
          score: cs.score.toFixed(2),
          percentile:
            totalClients > 0
              ? (((totalClients - index) / totalClients) * 100).toFixed(2)
              : "0",
        }));

        // Delete old snapshots for this period and type
        await db
          .delete(vipLeaderboardSnapshots)
          .where(
            and(
              eq(vipLeaderboardSnapshots.period, input.period),
              eq(vipLeaderboardSnapshots.leaderboardType, input.type),
              gte(vipLeaderboardSnapshots.periodStartDate, periodStart)
            )
          );

        // Insert new snapshots
        if (snapshots.length > 0) {
          await db.insert(vipLeaderboardSnapshots).values(snapshots);
        }

        return {
          success: true,
          clientsRanked: snapshots.length,
          period: input.period,
          type: input.type,
        };
      }),
  }),

  // ==========================================================================
  // ACHIEVEMENTS & REWARDS - MEET-045
  // ==========================================================================

  achievements: router({
    /**
     * List all achievement definitions
     */
    list: protectedProcedure
      .input(
        z
          .object({
            category: achievementCategorySchema.optional(),
            medal: achievementMedalSchema.optional(),
            includeSecret: z.boolean().default(false),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const conditions = [eq(achievements.isActive, true)];

        if (input?.category) {
          conditions.push(eq(achievements.category, input.category));
        }
        if (input?.medal) {
          conditions.push(eq(achievements.medal, input.medal));
        }
        if (!input?.includeSecret) {
          conditions.push(eq(achievements.isSecret, false));
        }

        const result = await db
          .select()
          .from(achievements)
          .where(and(...conditions))
          .orderBy(
            achievements.category,
            achievements.medal,
            achievements.name
          );

        return result;
      }),

    /**
     * Get client's achievements
     */
    getForClient: protectedProcedure
      .input(
        z.object({
          clientId: z.number().int(),
          includeProgress: z.boolean().default(true),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Get earned achievements
        const earned = await db
          .select({
            clientAchievement: clientAchievements,
            achievement: achievements,
          })
          .from(clientAchievements)
          .innerJoin(
            achievements,
            eq(clientAchievements.achievementId, achievements.id)
          )
          .where(eq(clientAchievements.clientId, input.clientId))
          .orderBy(desc(clientAchievements.earnedAt));

        // Get points summary
        const [pointsSummary] = await db
          .select()
          .from(clientPointsSummary)
          .where(eq(clientPointsSummary.clientId, input.clientId))
          .limit(1);

        return {
          achievements: earned.map(e => ({
            id: e.clientAchievement.id,
            achievementId: e.achievement.id,
            code: e.achievement.code,
            name: e.achievement.name,
            description: e.achievement.description,
            category: e.achievement.category,
            medal: e.achievement.medal,
            icon: e.achievement.icon,
            color: e.achievement.color,
            earnedAt: e.clientAchievement.earnedAt,
            isPinned: e.clientAchievement.isPinned,
            pointsAwarded: e.achievement.pointsAwarded,
          })),
          summary: pointsSummary
            ? {
                totalAchievements: pointsSummary.totalAchievements,
                bronzeCount: pointsSummary.bronzeCount,
                silverCount: pointsSummary.silverCount,
                goldCount: pointsSummary.goldCount,
                platinumCount: pointsSummary.platinumCount,
                currentPoints: pointsSummary.currentBalance,
                achievementMarkupDiscount: Number(
                  pointsSummary.achievementMarkupDiscount
                ),
              }
            : null,
        };
      }),

    /**
     * Award achievement to client (admin or system)
     */
    award: adminProcedure
      .input(
        z.object({
          clientId: z.number().int(),
          achievementCode: z.string(),
          earnedValue: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Get achievement by code
        const [achievement] = await db
          .select()
          .from(achievements)
          .where(eq(achievements.code, input.achievementCode))
          .limit(1);

        if (!achievement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Achievement with code '${input.achievementCode}' not found`,
          });
        }

        // Check if already earned
        const [existing] = await db
          .select()
          .from(clientAchievements)
          .where(
            and(
              eq(clientAchievements.clientId, input.clientId),
              eq(clientAchievements.achievementId, achievement.id)
            )
          )
          .limit(1);

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Client has already earned this achievement",
          });
        }

        const userId = getAuthenticatedUserId(ctx);

        // Award achievement
        const [result] = await db.insert(clientAchievements).values({
          clientId: input.clientId,
          achievementId: achievement.id,
          earnedValue: input.earnedValue?.toFixed(2),
          notificationSent: false,
        });

        // Award points if applicable
        if (achievement.pointsAwarded > 0) {
          // Get current balance
          const [summary] = await db
            .select()
            .from(clientPointsSummary)
            .where(eq(clientPointsSummary.clientId, input.clientId))
            .limit(1);

          const currentBalance = summary?.currentBalance ?? 0;
          const newBalance = currentBalance + achievement.pointsAwarded;

          // Insert ledger entry
          await db.insert(pointsLedger).values({
            clientId: input.clientId,
            transactionType: "EARNED_ACHIEVEMENT",
            points: achievement.pointsAwarded,
            balanceAfter: newBalance,
            referenceType: "achievement",
            referenceId: achievement.id,
            description: `Earned achievement: ${achievement.name}`,
            processedById: userId,
          });

          // Update points summary
          if (summary) {
            const medalField =
              `${achievement.medal.toLowerCase()}Count` as keyof typeof summary;
            await db
              .update(clientPointsSummary)
              .set({
                currentBalance: newBalance,
                lifetimeEarned:
                  summary.lifetimeEarned + achievement.pointsAwarded,
                totalAchievements: summary.totalAchievements + 1,
                [medalField]: (summary[medalField] as number) + 1,
                achievementMarkupDiscount: (
                  Number(summary.achievementMarkupDiscount) +
                  Number(achievement.markupDiscountPercent || 0)
                ).toString(),
              })
              .where(eq(clientPointsSummary.clientId, input.clientId));
          } else {
            await db.insert(clientPointsSummary).values({
              clientId: input.clientId,
              currentBalance: achievement.pointsAwarded,
              lifetimeEarned: achievement.pointsAwarded,
              totalAchievements: 1,
              [`${achievement.medal.toLowerCase()}Count`]: 1,
              achievementMarkupDiscount:
                achievement.markupDiscountPercent?.toString() || "0",
            });
          }
        }

        return {
          success: true,
          achievementId: result.insertId,
          pointsAwarded: achievement.pointsAwarded,
        };
      }),

    /**
     * Create achievement definition (admin only)
     */
    create: adminProcedure
      .input(
        z.object({
          code: z.string().min(1).max(50),
          name: z.string().min(1).max(100),
          description: z.string(),
          category: achievementCategorySchema,
          medal: achievementMedalSchema,
          icon: z.string().default("award"),
          color: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .default("#6B7280"),
          requirementType: z.enum([
            "TOTAL_SPENT",
            "ORDER_COUNT",
            "CONSECUTIVE_MONTHS",
            "ACCOUNT_AGE_DAYS",
            "REFERRAL_COUNT",
            "REFERRAL_REVENUE",
            "ACTIVITY_SCORE",
            "MANUAL",
          ]),
          requirementValue: z.number(),
          pointsAwarded: z.number().int().default(0),
          markupDiscountPercent: z.number().default(0),
          isSecret: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [result] = await db.insert(achievements).values({
          code: input.code,
          name: input.name,
          description: input.description,
          category: input.category,
          medal: input.medal,
          icon: input.icon,
          color: input.color,
          requirementType: input.requirementType,
          requirementValue: input.requirementValue.toFixed(2),
          pointsAwarded: input.pointsAwarded,
          markupDiscountPercent: input.markupDiscountPercent.toFixed(2),
          isSecret: input.isSecret,
        });

        return { id: result.insertId, success: true };
      }),
  }),

  // ==========================================================================
  // POINTS & REWARDS
  // ==========================================================================

  points: router({
    /**
     * Get client's points balance and history
     */
    getBalance: protectedProcedure
      .input(z.object({ clientId: z.number().int() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [summary] = await db
          .select()
          .from(clientPointsSummary)
          .where(eq(clientPointsSummary.clientId, input.clientId))
          .limit(1);

        return summary
          ? {
              currentBalance: summary.currentBalance,
              lifetimeEarned: summary.lifetimeEarned,
              lifetimeRedeemed: summary.lifetimeRedeemed,
              lifetimeExpired: summary.lifetimeExpired,
            }
          : {
              currentBalance: 0,
              lifetimeEarned: 0,
              lifetimeRedeemed: 0,
              lifetimeExpired: 0,
            };
      }),

    /**
     * Get points history
     */
    getHistory: protectedProcedure
      .input(
        z.object({
          clientId: z.number().int(),
          limit: z.number().min(1).max(100).default(25),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const history = await db
          .select()
          .from(pointsLedger)
          .where(eq(pointsLedger.clientId, input.clientId))
          .orderBy(desc(pointsLedger.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(pointsLedger)
          .where(eq(pointsLedger.clientId, input.clientId));

        return {
          entries: history,
          totalCount: countResult?.count ?? 0,
        };
      }),
  }),

  rewards: router({
    /**
     * List available rewards
     */
    listCatalog: protectedProcedure
      .input(
        z
          .object({
            clientId: z.number().int().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const now = new Date();

        const rewards = await db
          .select()
          .from(rewardCatalog)
          .where(
            and(
              eq(rewardCatalog.isActive, true),
              or(
                isNull(rewardCatalog.availableFrom),
                lte(rewardCatalog.availableFrom, now)
              ),
              or(
                isNull(rewardCatalog.availableUntil),
                gte(rewardCatalog.availableUntil, now)
              )
            )
          )
          .orderBy(rewardCatalog.pointsCost);

        // Get client's points if clientId provided
        let clientPoints = 0;
        if (input?.clientId) {
          const [summary] = await db
            .select()
            .from(clientPointsSummary)
            .where(eq(clientPointsSummary.clientId, input.clientId))
            .limit(1);
          clientPoints = summary?.currentBalance ?? 0;
        }

        return {
          rewards: rewards.map(r => ({
            ...r,
            canAfford: clientPoints >= r.pointsCost,
            inStock:
              r.quantityAvailable === null ||
              r.quantityAvailable > r.quantityRedeemed,
          })),
          clientPoints,
        };
      }),

    /**
     * Redeem a reward
     */
    redeem: protectedProcedure
      .input(
        z.object({
          clientId: z.number().int(),
          rewardId: z.number().int(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Get reward
        const [reward] = await db
          .select()
          .from(rewardCatalog)
          .where(eq(rewardCatalog.id, input.rewardId))
          .limit(1);

        if (!reward || !reward.isActive) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Reward not found or not available",
          });
        }

        // Check stock
        if (
          reward.quantityAvailable !== null &&
          reward.quantityRedeemed >= reward.quantityAvailable
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Reward is out of stock",
          });
        }

        // Get client's points
        const [summary] = await db
          .select()
          .from(clientPointsSummary)
          .where(eq(clientPointsSummary.clientId, input.clientId))
          .limit(1);

        const currentBalance = summary?.currentBalance ?? 0;

        if (currentBalance < reward.pointsCost) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient points. Need ${reward.pointsCost}, have ${currentBalance}`,
          });
        }

        // Calculate expiration (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Create redemption
        const [redemption] = await db.insert(rewardRedemptions).values({
          clientId: input.clientId,
          rewardId: input.rewardId,
          pointsSpent: reward.pointsCost,
          status: "PENDING",
          expiresAt,
          notes: input.notes,
        });

        // Deduct points
        const newBalance = currentBalance - reward.pointsCost;

        await db.insert(pointsLedger).values({
          clientId: input.clientId,
          transactionType: "REDEEMED",
          points: -reward.pointsCost,
          balanceAfter: newBalance,
          referenceType: "reward_redemption",
          referenceId: redemption.insertId,
          description: `Redeemed: ${reward.name}`,
        });

        // Update summary
        if (summary) {
          await db
            .update(clientPointsSummary)
            .set({
              currentBalance: newBalance,
              lifetimeRedeemed: summary.lifetimeRedeemed + reward.pointsCost,
            })
            .where(eq(clientPointsSummary.clientId, input.clientId));
        }

        // Update reward quantity
        await db
          .update(rewardCatalog)
          .set({
            quantityRedeemed: reward.quantityRedeemed + 1,
          })
          .where(eq(rewardCatalog.id, input.rewardId));

        return {
          success: true,
          redemptionId: redemption.insertId,
          newBalance,
          expiresAt,
        };
      }),

    /**
     * Get client's redemption history
     */
    getRedemptions: protectedProcedure
      .input(
        z.object({
          clientId: z.number().int(),
          status: z
            .enum(["PENDING", "APPROVED", "APPLIED", "EXPIRED", "CANCELLED"])
            .optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const conditions = [eq(rewardRedemptions.clientId, input.clientId)];
        if (input.status) {
          conditions.push(eq(rewardRedemptions.status, input.status));
        }

        const redemptions = await db
          .select({
            redemption: rewardRedemptions,
            reward: rewardCatalog,
          })
          .from(rewardRedemptions)
          .innerJoin(
            rewardCatalog,
            eq(rewardRedemptions.rewardId, rewardCatalog.id)
          )
          .where(and(...conditions))
          .orderBy(desc(rewardRedemptions.createdAt));

        return redemptions.map(r => ({
          id: r.redemption.id,
          rewardName: r.reward.name,
          rewardType: r.reward.rewardType,
          rewardValue: Number(r.reward.rewardValue),
          pointsSpent: r.redemption.pointsSpent,
          status: r.redemption.status,
          expiresAt: r.redemption.expiresAt,
          createdAt: r.redemption.createdAt,
        }));
      }),
  }),

  // ==========================================================================
  // REFERRAL SYSTEM - FEAT-006
  // ==========================================================================

  referrals: router({
    /**
     * Get or create referral code for a client
     */
    getCode: protectedProcedure
      .input(z.object({ clientId: z.number().int() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Check if code exists
        const [existing] = await db
          .select()
          .from(clientReferralCodes)
          .where(eq(clientReferralCodes.clientId, input.clientId))
          .limit(1);

        if (existing) {
          return existing;
        }

        // Get client name for code generation
        const [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, input.clientId))
          .limit(1);

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        // Generate and insert new code
        const code = generateReferralCode(client.name);

        const [result] = await db.insert(clientReferralCodes).values({
          clientId: input.clientId,
          code,
          codeType: "AUTO_GENERATED",
        });

        return {
          id: result.insertId,
          clientId: input.clientId,
          code,
          codeType: "AUTO_GENERATED" as const,
          isActive: true,
          timesUsed: 0,
          totalReferralRevenue: "0",
          totalCouchTaxEarned: "0",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),

    /**
     * Validate a referral code
     */
    validateCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [referralCode] = await db
          .select({
            code: clientReferralCodes,
            client: clients,
          })
          .from(clientReferralCodes)
          .innerJoin(clients, eq(clientReferralCodes.clientId, clients.id))
          .where(
            and(
              eq(clientReferralCodes.code, input.code.toUpperCase()),
              eq(clientReferralCodes.isActive, true)
            )
          )
          .limit(1);

        if (!referralCode) {
          return { valid: false, message: "Invalid or inactive referral code" };
        }

        return {
          valid: true,
          referrerName: referralCode.client.name,
          referrerClientId: referralCode.client.id,
        };
      }),

    /**
     * Record a referral when a new client is created
     */
    recordReferral: protectedProcedure
      .input(
        z.object({
          referrerClientId: z.number().int(),
          referredClientId: z.number().int(),
          referralCode: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Get referral settings
        const [settings] = await db
          .select()
          .from(referralSettings)
          .where(eq(referralSettings.isActive, true))
          .limit(1);

        const couchTaxPercent = settings?.defaultCouchTaxPercent ?? "5.00";
        const couchTaxOrderLimit = settings?.defaultCouchTaxOrderLimit ?? 3;
        const attributionWindowDays = settings?.attributionWindowDays ?? 30;

        // Calculate attribution expiration
        let attributionExpires: Date | null = null;
        if (attributionWindowDays > 0) {
          attributionExpires = new Date();
          attributionExpires.setDate(
            attributionExpires.getDate() + attributionWindowDays
          );
        }

        // Create referral tracking record
        const [result] = await db.insert(referralTracking).values({
          referrerClientId: input.referrerClientId,
          referredClientId: input.referredClientId,
          referralCodeUsed: input.referralCode?.toUpperCase(),
          status: "PENDING",
          couchTaxPercent,
          couchTaxOrderLimit,
          attributionExpiresAt: attributionExpires,
        });

        // Update referral code stats
        if (input.referralCode) {
          await db
            .update(clientReferralCodes)
            .set({
              timesUsed: sql`${clientReferralCodes.timesUsed} + 1`,
            })
            .where(
              eq(clientReferralCodes.code, input.referralCode.toUpperCase())
            );
        }

        // Update client's referredByClientId
        await db
          .update(clients)
          .set({ referredByClientId: input.referrerClientId })
          .where(eq(clients.id, input.referredClientId));

        return { id: result.insertId, success: true };
      }),

    /**
     * Get referral dashboard for a client (who they referred)
     */
    getDashboard: protectedProcedure
      .input(z.object({ clientId: z.number().int() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Get referral code stats
        const [codeStats] = await db
          .select()
          .from(clientReferralCodes)
          .where(eq(clientReferralCodes.clientId, input.clientId))
          .limit(1);

        // Get all referrals made by this client
        const referrals = await db
          .select({
            tracking: referralTracking,
            referred: clients,
          })
          .from(referralTracking)
          .innerJoin(clients, eq(referralTracking.referredClientId, clients.id))
          .where(eq(referralTracking.referrerClientId, input.clientId))
          .orderBy(desc(referralTracking.createdAt));

        // Get total payouts
        const [payoutStats] = await db
          .select({
            totalPending: sql<number>`COALESCE(SUM(CASE WHEN ${couchTaxPayouts.status} = 'PENDING' THEN ${couchTaxPayouts.payoutAmount} ELSE 0 END), 0)`,
            totalPaid: sql<number>`COALESCE(SUM(CASE WHEN ${couchTaxPayouts.status} = 'PAID' THEN ${couchTaxPayouts.payoutAmount} ELSE 0 END), 0)`,
          })
          .from(couchTaxPayouts)
          .where(eq(couchTaxPayouts.referrerClientId, input.clientId));

        return {
          referralCode: codeStats?.code ?? null,
          totalReferrals: codeStats?.timesUsed ?? 0,
          totalRevenue: Number(codeStats?.totalReferralRevenue ?? 0),
          totalEarned: Number(codeStats?.totalCouchTaxEarned ?? 0),
          pendingPayouts: Number(payoutStats?.totalPending ?? 0),
          paidPayouts: Number(payoutStats?.totalPaid ?? 0),
          referrals: referrals.map(r => ({
            id: r.tracking.id,
            referredName: r.referred.name,
            status: r.tracking.status,
            convertedAt: r.tracking.convertedAt,
            couchTaxPercent: Number(r.tracking.couchTaxPercent),
            ordersCompleted: r.tracking.couchTaxOrderCount,
            orderLimit: r.tracking.couchTaxOrderLimit,
            createdAt: r.tracking.createdAt,
          })),
        };
      }),

    /**
     * Process couch tax for an order
     * Called when an order is completed for a referred client
     */
    processCouchTax: adminProcedure
      .input(
        z.object({
          orderId: z.number().int(),
          orderTotal: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Get order to find client
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .limit(1);

        if (!order || !order.clientId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order or client not found",
          });
        }

        // Check if client was referred and referral is active
        const [referral] = await db
          .select()
          .from(referralTracking)
          .where(
            and(
              eq(referralTracking.referredClientId, order.clientId),
              inArray(referralTracking.status, [
                "CONVERTED",
                "COUCH_TAX_ACTIVE",
              ])
            )
          )
          .limit(1);

        if (!referral) {
          return {
            success: true,
            message: "No active referral for this client",
          };
        }

        // Check if we've reached the order limit
        if (referral.couchTaxOrderCount >= (referral.couchTaxOrderLimit || 3)) {
          return {
            success: true,
            message: "Couch tax order limit reached",
          };
        }

        // Get settings for minimum order value
        const [settings] = await db
          .select()
          .from(referralSettings)
          .where(eq(referralSettings.isActive, true))
          .limit(1);

        const minOrderValue = Number(settings?.minOrderValueForCouch ?? 100);

        if (input.orderTotal < minOrderValue) {
          return {
            success: true,
            message: `Order total ${input.orderTotal} below minimum ${minOrderValue} for couch tax`,
          };
        }

        // Calculate payout
        const couchTaxPercent = Number(referral.couchTaxPercent);
        const payoutAmount = (input.orderTotal * couchTaxPercent) / 100;

        const userId = getAuthenticatedUserId(ctx);

        // Create payout record
        await db.insert(couchTaxPayouts).values({
          referralTrackingId: referral.id,
          referrerClientId: referral.referrerClientId,
          orderId: input.orderId,
          orderSequence: referral.couchTaxOrderCount + 1,
          orderTotal: input.orderTotal.toFixed(2),
          couchTaxPercent: couchTaxPercent.toFixed(2),
          payoutAmount: payoutAmount.toFixed(2),
          status: "PENDING",
          processedById: userId,
        });

        // Update referral tracking
        const newOrderCount = referral.couchTaxOrderCount + 1;
        const newStatus =
          newOrderCount >= (referral.couchTaxOrderLimit || 3)
            ? "COMPLETED"
            : "COUCH_TAX_ACTIVE";

        await db
          .update(referralTracking)
          .set({
            status: newStatus,
            couchTaxOrderCount: newOrderCount,
            convertedAt: referral.convertedAt || new Date(),
            firstOrderId: referral.firstOrderId || input.orderId,
          })
          .where(eq(referralTracking.id, referral.id));

        // Update referral code totals
        await db
          .update(clientReferralCodes)
          .set({
            totalReferralRevenue: sql`${clientReferralCodes.totalReferralRevenue} + ${input.orderTotal}`,
            totalCouchTaxEarned: sql`${clientReferralCodes.totalCouchTaxEarned} + ${payoutAmount}`,
          })
          .where(eq(clientReferralCodes.clientId, referral.referrerClientId));

        // Award points to referrer
        if (settings?.pointsPerReferralOrder) {
          const [summary] = await db
            .select()
            .from(clientPointsSummary)
            .where(eq(clientPointsSummary.clientId, referral.referrerClientId))
            .limit(1);

          const currentBalance = summary?.currentBalance ?? 0;
          const points = settings.pointsPerReferralOrder;
          const newBalance = currentBalance + points;

          await db.insert(pointsLedger).values({
            clientId: referral.referrerClientId,
            transactionType: "EARNED_REFERRAL",
            points,
            balanceAfter: newBalance,
            referenceType: "order",
            referenceId: input.orderId,
            description: `Referral order bonus`,
            processedById: userId,
          });

          if (summary) {
            await db
              .update(clientPointsSummary)
              .set({
                currentBalance: newBalance,
                lifetimeEarned: summary.lifetimeEarned + points,
              })
              .where(
                eq(clientPointsSummary.clientId, referral.referrerClientId)
              );
          }
        }

        return {
          success: true,
          payoutAmount,
          orderSequence: newOrderCount,
          status: newStatus,
        };
      }),

    /**
     * Get pending couch tax payouts (admin)
     */
    getPendingPayouts: adminProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(25),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const payouts = await db
          .select({
            payout: couchTaxPayouts,
            referrer: clients,
            order: orders,
          })
          .from(couchTaxPayouts)
          .innerJoin(clients, eq(couchTaxPayouts.referrerClientId, clients.id))
          .innerJoin(orders, eq(couchTaxPayouts.orderId, orders.id))
          .where(eq(couchTaxPayouts.status, "PENDING"))
          .orderBy(desc(couchTaxPayouts.createdAt))
          .limit(input?.limit ?? 25)
          .offset(input?.offset ?? 0);

        const [countResult] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(couchTaxPayouts)
          .where(eq(couchTaxPayouts.status, "PENDING"));

        return {
          payouts: payouts.map(p => ({
            id: p.payout.id,
            referrerName: p.referrer.name,
            referrerClientId: p.payout.referrerClientId,
            orderId: p.payout.orderId,
            orderNumber: p.order.orderNumber,
            orderTotal: Number(p.payout.orderTotal),
            payoutAmount: Number(p.payout.payoutAmount),
            couchTaxPercent: Number(p.payout.couchTaxPercent),
            orderSequence: p.payout.orderSequence,
            createdAt: p.payout.createdAt,
          })),
          totalCount: countResult?.count ?? 0,
        };
      }),

    /**
     * Approve and pay couch tax payout
     */
    approvePayout: adminProcedure
      .input(
        z.object({
          payoutId: z.number().int(),
          paymentMethod: z.string().max(50),
          paymentReference: z.string().max(100).optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const userId = getAuthenticatedUserId(ctx);

        await db
          .update(couchTaxPayouts)
          .set({
            status: "PAID",
            paidAt: new Date(),
            paymentMethod: input.paymentMethod,
            paymentReference: input.paymentReference,
            processedById: userId,
            notes: input.notes,
          })
          .where(eq(couchTaxPayouts.id, input.payoutId));

        return { success: true };
      }),

    /**
     * Get/update referral settings (admin)
     */
    getSettings: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [settings] = await db
        .select()
        .from(referralSettings)
        .where(eq(referralSettings.isActive, true))
        .limit(1);

      return settings ?? null;
    }),

    updateSettings: adminProcedure
      .input(
        z.object({
          defaultCouchTaxPercent: z.number().min(0).max(100).optional(),
          defaultCouchTaxOrderLimit: z.number().int().min(1).optional(),
          minOrderValueForCouch: z.number().min(0).optional(),
          minReferrerAccountAgeDays: z.number().int().min(0).optional(),
          attributionWindowDays: z.number().int().min(0).optional(),
          pointsPerReferral: z.number().int().min(0).optional(),
          pointsPerReferralOrder: z.number().int().min(0).optional(),
          maxPayoutPerMonth: z.number().min(0).nullable().optional(),
          maxActiveReferrals: z.number().int().min(1).nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const userId = getAuthenticatedUserId(ctx);

        // Check if settings exist
        const [existing] = await db
          .select()
          .from(referralSettings)
          .where(eq(referralSettings.isActive, true))
          .limit(1);

        const updateData = {
          ...input,
          defaultCouchTaxPercent: input.defaultCouchTaxPercent?.toFixed(2),
          minOrderValueForCouch: input.minOrderValueForCouch?.toFixed(2),
          maxPayoutPerMonth: input.maxPayoutPerMonth?.toFixed(2),
          updatedById: userId,
        };

        if (existing) {
          await db
            .update(referralSettings)
            .set(updateData)
            .where(eq(referralSettings.id, existing.id));
        } else {
          await db.insert(referralSettings).values({
            ...updateData,
            isActive: true,
          });
        }

        return { success: true };
      }),
  }),
});

export type GamificationRouter = typeof gamificationRouter;
