/**
 * WS-004: Referrals Router
 * Handles referral credit management for VIP customers
 *
 * NOTE: Client tier-based referral percentages disabled - clients.tier doesn't exist.
 * Uses global default percentage for all referrals.
 *
 * TER-579: Legacy Schema Compatibility
 * The referral_credits and referral_settings tables may not exist on older DB schemas.
 * All endpoints that touch these tables are wrapped with isLegacySchemaError() guards:
 *   - Read endpoints return empty/default results with a logged warning
 *   - Write endpoints throw PRECONDITION_FAILED with a clear user-facing message
 */

import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../_core/logger";
import { isSchemaDriftError } from "../_core/dbErrors";
import {
  clients,
  orders,
  referralCredits,
  referralCreditSettings,
} from "../../drizzle/schema";
import { adminProcedure, router } from "../_core/trpc";

/**
 * Detects MySQL errors caused by missing tables or columns in a legacy schema.
 * Delegates to the shared isSchemaDriftError helper so nested/wrapped errors
 * (drizzle query wraps, errors exposing only `errno`, etc.) are also caught —
 * TER-1147 surfaced cases where the original narrow `.code`-only check missed
 * these, causing /orders/new to 500.
 */
function isLegacySchemaError(error: unknown): boolean {
  return isSchemaDriftError(error, [
    "referral_credits",
    "referral_credit_settings",
    "referral_settings",
  ]);
}

/**
 * TER-575: Retrieve the active referral credit percentage from DB settings.
 * Falls back to the documented default (10%) when the settings table is missing
 * or empty (legacy schema). Logs a warning when the fallback is used so operators
 * know a migration is required.
 *
 * Exported so orders.ts (and any future callers) can use the same logic
 * without duplicating the fallback behaviour.
 */
export async function getReferralPercentage(): Promise<number> {
  const DEFAULT_PERCENTAGE = 10.0;
  try {
    const [globalSetting] = await db
      .select()
      .from(referralCreditSettings)
      .where(
        and(
          isNull(referralCreditSettings.clientTier),
          eq(referralCreditSettings.isActive, true)
        )
      )
      .limit(1);

    if (globalSetting) {
      return parseFloat(globalSetting.creditPercentage);
    }

    // Settings table exists but has no global row yet — use default
    logger.warn(
      { context: "getReferralPercentage" },
      "No global referral setting found in referral_settings table — using default 10%"
    );
    return DEFAULT_PERCENTAGE;
  } catch (error: unknown) {
    if (isLegacySchemaError(error)) {
      logger.warn(
        { error, context: "getReferralPercentage" },
        "Referral settings table/columns missing (legacy schema) — using default 10%"
      );
      return DEFAULT_PERCENTAGE;
    }
    throw error;
  }
}

export const referralsRouter = router({
  /**
   * Get referral settings (global and per-tier)
   */
  getSettings: adminProcedure.query(async () => {
    try {
      const settings = await db
        .select()
        .from(referralCreditSettings)
        .where(eq(referralCreditSettings.isActive, true))
        .orderBy(referralCreditSettings.clientTier);

      const globalSetting = settings.find(s => s.clientTier === null);
      const tierSettings = settings.filter(s => s.clientTier !== null);

      return {
        globalPercentage: globalSetting
          ? parseFloat(globalSetting.creditPercentage)
          : 10.0,
        tierSettings: tierSettings.map(s => ({
          tier: s.clientTier,
          percentage: parseFloat(s.creditPercentage),
          minOrderAmount: s.minOrderAmount ? parseFloat(s.minOrderAmount) : 0,
          maxCreditAmount: s.maxCreditAmount
            ? parseFloat(s.maxCreditAmount)
            : null,
          creditExpiryDays: s.creditExpiryDays,
        })),
      };
    } catch (error: unknown) {
      // Only return defaults for schema-mismatch errors (legacy DB without expected columns).
      // Re-throw everything else so real failures (connection, permissions) surface properly.
      if (isLegacySchemaError(error)) {
        logger.warn(
          { error, context: "referrals.getSettings" },
          "Referral settings table/columns missing (legacy schema), using defaults"
        );
        return {
          globalPercentage: 10.0,
          tierSettings: [],
        };
      }
      throw error;
    }
  }),

  /**
   * Update referral settings
   */
  updateSettings: adminProcedure
    .input(
      z.object({
        globalPercentage: z.number().min(0).max(100).optional(),
        tierSettings: z
          .array(
            z.object({
              tier: z.string(),
              percentage: z.number().min(0).max(100),
              minOrderAmount: z.number().min(0).optional(),
              maxCreditAmount: z.number().min(0).optional(),
              creditExpiryDays: z.number().min(1).optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Update global setting
        if (input.globalPercentage !== undefined) {
          await db
            .insert(referralCreditSettings)
            .values({
              clientTier: null,
              creditPercentage: input.globalPercentage.toFixed(2),
              isActive: true,
            })
            .onDuplicateKeyUpdate({
              set: {
                creditPercentage: input.globalPercentage.toFixed(2),
                updatedAt: new Date(),
              },
            });
        }

        // Update tier settings
        if (input.tierSettings) {
          for (const tier of input.tierSettings) {
            await db
              .insert(referralCreditSettings)
              .values({
                clientTier: tier.tier,
                creditPercentage: tier.percentage.toFixed(2),
                minOrderAmount: tier.minOrderAmount?.toFixed(2),
                maxCreditAmount: tier.maxCreditAmount?.toFixed(2),
                creditExpiryDays: tier.creditExpiryDays,
                isActive: true,
              })
              .onDuplicateKeyUpdate({
                set: {
                  creditPercentage: tier.percentage.toFixed(2),
                  minOrderAmount: tier.minOrderAmount?.toFixed(2),
                  maxCreditAmount: tier.maxCreditAmount?.toFixed(2),
                  creditExpiryDays: tier.creditExpiryDays,
                  updatedAt: new Date(),
                },
              });
          }
        }

        return { success: true };
      } catch (error: unknown) {
        if (isLegacySchemaError(error)) {
          logger.error(
            { error, context: "referrals.updateSettings" },
            "Referral settings table/columns missing — cannot save settings on legacy schema"
          );
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Referral settings cannot be saved: the database schema needs migration. Contact support.",
          });
        }
        throw error;
      }
    }),

  /**
   * Get pending and available credits for a client (VIP)
   */
  getPendingCredits: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      try {
        const credits = await db
          .select({
            id: referralCredits.id,
            referredClientId: referralCredits.referredClientId,
            referredClientName: clients.name,
            referredOrderId: referralCredits.referredOrderId,
            referredOrderNumber: orders.orderNumber,
            creditAmount: referralCredits.creditAmount,
            status: referralCredits.status,
            createdAt: referralCredits.createdAt,
            expiresAt: referralCredits.expiresAt,
          })
          .from(referralCredits)
          .innerJoin(clients, eq(referralCredits.referredClientId, clients.id))
          .innerJoin(orders, eq(referralCredits.referredOrderId, orders.id))
          .where(
            and(
              eq(referralCredits.referrerClientId, input.clientId),
              or(
                eq(referralCredits.status, "PENDING"),
                eq(referralCredits.status, "AVAILABLE")
              )
            )
          )
          .orderBy(desc(referralCredits.createdAt));

        const totalPending = credits
          .filter(c => c.status === "PENDING")
          .reduce((sum, c) => sum + parseFloat(c.creditAmount), 0);

        const totalAvailable = credits
          .filter(c => c.status === "AVAILABLE")
          .reduce((sum, c) => sum + parseFloat(c.creditAmount), 0);

        return {
          totalPending,
          totalAvailable,
          credits: credits.map(c => ({
            id: c.id,
            referredClientName: c.referredClientName,
            referredOrderNumber: c.referredOrderNumber,
            creditAmount: parseFloat(c.creditAmount),
            status: c.status,
            createdAt: c.createdAt,
            expiresAt: c.expiresAt,
          })),
        };
      } catch (error: unknown) {
        if (isLegacySchemaError(error)) {
          logger.warn(
            {
              error,
              context: "referrals.getPendingCredits",
              clientId: input.clientId,
            },
            "Referral credits table/columns missing (legacy schema) — returning empty results"
          );
          return { totalPending: 0, totalAvailable: 0, credits: [] };
        }
        throw error;
      }
    }),

  /**
   * Get all credits for a client (including applied, for history)
   */
  getCreditHistory: adminProcedure
    .input(
      z.object({
        clientId: z.number(),
        includeApplied: z.boolean().default(true),
      })
    )
    .query(async ({ input }) => {
      try {
        const statusFilter = input.includeApplied
          ? undefined
          : or(
              eq(referralCredits.status, "PENDING"),
              eq(referralCredits.status, "AVAILABLE")
            );

        const credits = await db
          .select({
            id: referralCredits.id,
            referredClientId: referralCredits.referredClientId,
            referredClientName: clients.name,
            referredOrderId: referralCredits.referredOrderId,
            referredOrderNumber: orders.orderNumber,
            creditPercentage: referralCredits.creditPercentage,
            orderTotal: referralCredits.orderTotal,
            creditAmount: referralCredits.creditAmount,
            status: referralCredits.status,
            appliedToOrderId: referralCredits.appliedToOrderId,
            appliedAmount: referralCredits.appliedAmount,
            appliedAt: referralCredits.appliedAt,
            createdAt: referralCredits.createdAt,
            expiresAt: referralCredits.expiresAt,
            notes: referralCredits.notes,
          })
          .from(referralCredits)
          .innerJoin(clients, eq(referralCredits.referredClientId, clients.id))
          .innerJoin(orders, eq(referralCredits.referredOrderId, orders.id))
          .where(
            and(
              eq(referralCredits.referrerClientId, input.clientId),
              statusFilter
            )
          )
          .orderBy(desc(referralCredits.createdAt));

        return credits.map(c => ({
          id: c.id,
          referredClientName: c.referredClientName,
          referredOrderNumber: c.referredOrderNumber,
          creditPercentage: parseFloat(c.creditPercentage),
          orderTotal: parseFloat(c.orderTotal),
          creditAmount: parseFloat(c.creditAmount),
          status: c.status,
          appliedToOrderId: c.appliedToOrderId,
          appliedAmount: c.appliedAmount ? parseFloat(c.appliedAmount) : null,
          appliedAt: c.appliedAt,
          createdAt: c.createdAt,
          expiresAt: c.expiresAt,
          notes: c.notes,
        }));
      } catch (error: unknown) {
        if (isLegacySchemaError(error)) {
          logger.warn(
            {
              error,
              context: "referrals.getCreditHistory",
              clientId: input.clientId,
            },
            "Referral credits table/columns missing (legacy schema) — returning empty history"
          );
          return [];
        }
        throw error;
      }
    }),

  /**
   * Create a referral credit when a referred order is created
   * Called internally when an order with referredByClientId is created
   */
  createReferralCredit: adminProcedure
    .input(
      z.object({
        referrerClientId: z.number(),
        referredClientId: z.number(),
        referredOrderId: z.number(),
        orderTotal: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Prevent self-referral
      if (input.referrerClientId === input.referredClientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Self-referral is not allowed",
        });
      }

      try {
        // TER-575: Use the shared helper so the fallback logic is consistent
        const creditPercentage = await getReferralPercentage();
        const creditAmount = (input.orderTotal * creditPercentage) / 100;

        // Create pending credit
        const [result] = await db.insert(referralCredits).values({
          referrerClientId: input.referrerClientId,
          referredClientId: input.referredClientId,
          referredOrderId: input.referredOrderId,
          creditPercentage: creditPercentage.toFixed(2),
          orderTotal: input.orderTotal.toFixed(2),
          creditAmount: creditAmount.toFixed(2),
          status: "PENDING",
        });

        return {
          creditId: result.insertId,
          creditAmount,
          creditPercentage,
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        if (isLegacySchemaError(error)) {
          logger.error(
            { error, context: "referrals.createReferralCredit", input },
            "Referral credits table/columns missing — cannot create referral credit on legacy schema"
          );
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Referral credits cannot be recorded: the database schema needs migration. Contact support.",
          });
        }
        throw error;
      }
    }),

  /**
   * Mark referral credit as available (called when referred order is finalized)
   */
  markCreditAvailable: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await db
          .update(referralCredits)
          .set({
            status: "AVAILABLE",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(referralCredits.referredOrderId, input.orderId),
              eq(referralCredits.status, "PENDING")
            )
          );

        return { success: true };
      } catch (error: unknown) {
        if (isLegacySchemaError(error)) {
          logger.error(
            {
              error,
              context: "referrals.markCreditAvailable",
              orderId: input.orderId,
            },
            "Referral credits table/columns missing — cannot update credit status on legacy schema"
          );
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Referral credit status cannot be updated: the database schema needs migration. Contact support.",
          });
        }
        throw error;
      }
    }),

  /**
   * Cancel referral credit (called when referred order is cancelled)
   */
  cancelCredit: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db
          .update(referralCredits)
          .set({
            status: "CANCELLED",
            notes: input.reason || "Referred order cancelled",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(referralCredits.referredOrderId, input.orderId),
              or(
                eq(referralCredits.status, "PENDING"),
                eq(referralCredits.status, "AVAILABLE")
              )
            )
          );

        return { success: true };
      } catch (error: unknown) {
        if (isLegacySchemaError(error)) {
          logger.error(
            {
              error,
              context: "referrals.cancelCredit",
              orderId: input.orderId,
            },
            "Referral credits table/columns missing — cannot cancel referral credit on legacy schema"
          );
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Referral credit cannot be cancelled: the database schema needs migration. Contact support.",
          });
        }
        throw error;
      }
    }),

  /**
   * Apply referral credits to an order
   */
  applyCreditsToOrder: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        creditIds: z.array(z.number()).optional(), // Specific credits, or all available
        maxAmount: z.number().optional(), // Limit application amount
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the order
        const [order] = await db
          .select({
            id: orders.id,
            clientId: orders.clientId,
            total: orders.total,
            discount: orders.discount,
            isDraft: orders.isDraft,
          })
          .from(orders)
          .where(and(eq(orders.id, input.orderId), isNull(orders.deletedAt)))
          .limit(1);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }

        // Get available credits for this client
        // BUG-118 FIX: Check array length, not just truthiness (empty array [] is truthy but crashes inArray)
        const availableCreditsQuery = db
          .select()
          .from(referralCredits)
          .where(
            and(
              eq(referralCredits.referrerClientId, order.clientId),
              eq(referralCredits.status, "AVAILABLE"),
              input.creditIds?.length
                ? inArray(referralCredits.id, input.creditIds)
                : undefined
            )
          )
          .orderBy(referralCredits.createdAt); // FIFO

        const availableCredits = await availableCreditsQuery;

        if (availableCredits.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No available credits to apply",
          });
        }

        // Calculate total available credit
        const totalAvailableCredit = availableCredits.reduce(
          (sum, c) => sum + parseFloat(c.creditAmount),
          0
        );

        // Calculate maximum applicable amount
        const orderTotal = parseFloat(order.total);
        const currentDiscount = parseFloat(order.discount || "0");
        const maxApplicable = Math.min(
          totalAvailableCredit,
          orderTotal - currentDiscount, // Can't exceed order total
          input.maxAmount || Infinity
        );

        if (maxApplicable <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Credit cannot be applied (order total already covered)",
          });
        }

        // Apply credits (FIFO)
        let remainingToApply = maxApplicable;
        const appliedCredits: { creditId: number; appliedAmount: number }[] =
          [];

        for (const credit of availableCredits) {
          if (remainingToApply <= 0) break;

          const creditAmount = parseFloat(credit.creditAmount);
          const applyAmount = Math.min(creditAmount, remainingToApply);

          // Update credit status
          await db
            .update(referralCredits)
            .set({
              status: "APPLIED",
              appliedToOrderId: order.id,
              appliedAmount: applyAmount.toFixed(2),
              appliedAt: new Date(),
              appliedBy: ctx.user?.id,
              updatedAt: new Date(),
            })
            .where(eq(referralCredits.id, credit.id));

          appliedCredits.push({
            creditId: credit.id,
            appliedAmount: applyAmount,
          });

          remainingToApply -= applyAmount;

          // If partial application, create a new credit for remainder
          if (applyAmount < creditAmount) {
            const remainder = creditAmount - applyAmount;
            await db.insert(referralCredits).values({
              referrerClientId: credit.referrerClientId,
              referredClientId: credit.referredClientId,
              referredOrderId: credit.referredOrderId,
              creditPercentage: credit.creditPercentage,
              orderTotal: credit.orderTotal,
              creditAmount: remainder.toFixed(2),
              status: "AVAILABLE",
              notes: `Remainder from partial application to order ${order.id}`,
            });
          }
        }

        // Update order discount
        const totalApplied = appliedCredits.reduce(
          (sum, c) => sum + c.appliedAmount,
          0
        );
        const newDiscount = currentDiscount + totalApplied;
        const newTotal = orderTotal - totalApplied;

        await db
          .update(orders)
          .set({
            discount: newDiscount.toFixed(2),
            total: newTotal.toFixed(2),
          })
          .where(eq(orders.id, order.id));

        return {
          appliedAmount: totalApplied,
          remainingCredits: totalAvailableCredit - totalApplied,
          orderNewTotal: newTotal,
          appliedCredits,
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) throw error;
        if (isLegacySchemaError(error)) {
          logger.error(
            {
              error,
              context: "referrals.applyCreditsToOrder",
              orderId: input.orderId,
            },
            "Referral credits table/columns missing — cannot apply credits on legacy schema"
          );
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Referral credits cannot be applied: the database schema needs migration. Contact support.",
          });
        }
        throw error;
      }
    }),

  /**
   * Get eligible referrers (all clients) for dropdown
   * NOTE: clients.tier and clients.isActive don't exist in schema
   */
  getEligibleReferrers: adminProcedure
    .input(
      z.object({
        excludeClientId: z.number().optional(), // Exclude the customer being referred
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Get clients who can be referrers
      const eligibleClients = await db
        .select({
          id: clients.id,
          name: clients.name,
        })
        .from(clients)
        .where(
          and(
            input.excludeClientId
              ? sql`${clients.id} != ${input.excludeClientId}`
              : undefined,
            input.search
              ? sql`${clients.name} LIKE ${`%${input.search}%`}`
              : undefined
          )
        )
        .orderBy(clients.name)
        .limit(50);

      // Add tier field for frontend compatibility (always null - field doesn't exist)
      return eligibleClients.map(c => ({
        ...c,
        tier: null as string | null,
      }));
    }),

  /**
   * Get referral statistics for reporting
   */
  getStats: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const dateFilter =
          input.startDate && input.endDate
            ? and(
                sql`${referralCredits.createdAt} >= ${input.startDate}`,
                sql`${referralCredits.createdAt} <= ${input.endDate}`
              )
            : undefined;

        // Total credits created
        const [totalCreated] = await db
          .select({
            count: sql<number>`COUNT(*)`,
            totalAmount: sql<number>`SUM(${referralCredits.creditAmount})`,
          })
          .from(referralCredits)
          .where(dateFilter);

        // Credits by status
        const byStatus = await db
          .select({
            status: referralCredits.status,
            count: sql<number>`COUNT(*)`,
            totalAmount: sql<number>`SUM(${referralCredits.creditAmount})`,
          })
          .from(referralCredits)
          .where(dateFilter)
          .groupBy(referralCredits.status);

        // Top referrers
        const topReferrers = await db
          .select({
            clientId: referralCredits.referrerClientId,
            clientName: clients.name,
            referralCount: sql<number>`COUNT(*)`,
            totalEarned: sql<number>`SUM(${referralCredits.creditAmount})`,
          })
          .from(referralCredits)
          .innerJoin(clients, eq(referralCredits.referrerClientId, clients.id))
          .where(dateFilter)
          .groupBy(referralCredits.referrerClientId, clients.name)
          .orderBy(sql`SUM(${referralCredits.creditAmount}) DESC`)
          .limit(10);

        return {
          totalCreditsCreated: totalCreated.count || 0,
          totalCreditAmount: totalCreated.totalAmount || 0,
          byStatus: byStatus.map(s => ({
            status: s.status,
            count: s.count,
            totalAmount: s.totalAmount || 0,
          })),
          topReferrers: topReferrers.map(r => ({
            clientId: r.clientId,
            clientName: r.clientName,
            referralCount: r.referralCount,
            totalEarned: r.totalEarned || 0,
          })),
        };
      } catch (error: unknown) {
        if (isLegacySchemaError(error)) {
          logger.warn(
            { error, context: "referrals.getStats" },
            "Referral credits table/columns missing (legacy schema) — returning empty stats"
          );
          return {
            totalCreditsCreated: 0,
            totalCreditAmount: 0,
            byStatus: [],
            topReferrers: [],
          };
        }
        throw error;
      }
    }),
});
