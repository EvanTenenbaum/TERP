/**
 * WS-004: Referrals Router
 * Handles referral credit management for VIP customers
 *
 * NOTE: Client tier-based referral percentages disabled - clients.tier doesn't exist.
 * Uses global default percentage for all referrals.
 */

import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  clients,
  orders,
  referralCredits,
  referralSettings,
} from "../../drizzle/schema";
import { adminProcedure, router } from "../_core/trpc";

export const referralsRouter = router({
  /**
   * Get referral settings (global and per-tier)
   */
  getSettings: adminProcedure.query(async () => {
    const settings = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.isActive, true))
      .orderBy(referralSettings.clientTier);

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
      // Update global setting
      if (input.globalPercentage !== undefined) {
        await db
          .insert(referralSettings)
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
            .insert(referralSettings)
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
    }),

  /**
   * Get pending and available credits for a client (VIP)
   */
  getPendingCredits: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
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

      // Get referral percentage (global setting only - clients.tier doesn't exist)
      let creditPercentage = 10.0; // Default

      const globalSetting = await db
        .select()
        .from(referralSettings)
        .where(
          and(
            isNull(referralSettings.clientTier),
            eq(referralSettings.isActive, true)
          )
        )
        .limit(1);

      if (globalSetting[0]) {
        creditPercentage = parseFloat(globalSetting[0].creditPercentage);
      }

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
    }),

  /**
   * Mark referral credit as available (called when referred order is finalized)
   */
  markCreditAvailable: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input }) => {
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
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Get available credits for this client
      const availableCreditsQuery = db
        .select()
        .from(referralCredits)
        .where(
          and(
            eq(referralCredits.referrerClientId, order.clientId),
            eq(referralCredits.status, "AVAILABLE"),
            input.creditIds
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
      const appliedCredits: { creditId: number; appliedAmount: number }[] = [];

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
    }),
});
