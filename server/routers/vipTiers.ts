/**
 * VIP Tiers Router (FEAT-019)
 * Enhanced for Sprint 5 Track A - Task 5.A.1: MEET-043 - VIP Status (Debt Cycling Tiers)
 *
 * Handles VIP tier management, client tier status, and tier calculations
 * Includes debt cycling behavior-based tier calculations
 */

import { z } from "zod";
import {
  router,
  protectedProcedure,
  adminProcedure,
  vipPortalProcedure,
} from "../_core/trpc";
import { getDb } from "../db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import {
  vipTiers,
  clientVipStatus,
  vipTierHistory,
} from "../../drizzle/schema-vip-portal";
import { TRPCError } from "@trpc/server";
import * as vipTierService from "../services/vipTierService";

export const vipTiersRouter = router({
  /**
   * List all VIP tiers
   */
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    const tiers = await db
      .select()
      .from(vipTiers)
      .where(eq(vipTiers.isActive, true))
      .orderBy(vipTiers.level);
    return tiers;
  }),

  /**
   * Get all tiers (including inactive) for admin
   */
  listAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    const tiers = await db.select().from(vipTiers).orderBy(vipTiers.level);
    return tiers;
  }),

  /**
   * Get a specific tier by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const [tier] = await db
        .select()
        .from(vipTiers)
        .where(eq(vipTiers.id, input.id));
      return tier || null;
    }),

  /**
   * Create a new VIP tier
   */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        displayName: z.string().min(1).max(100),
        description: z.string().optional(),
        level: z.number().int().min(0),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        icon: z.string().optional(),
        minSpendYtd: z.string().optional(),
        minOrdersYtd: z.number().int().optional(),
        minAccountAgeDays: z.number().int().optional(),
        minPaymentOnTimeRate: z.string().optional(),
        discountPercentage: z.string().optional(),
        creditLimitMultiplier: z.string().optional(),
        prioritySupport: z.boolean().optional(),
        earlyAccessToProducts: z.boolean().optional(),
        freeShipping: z.boolean().optional(),
        dedicatedRep: z.boolean().optional(),
        customBenefits: z
          .array(
            z.object({
              name: z.string(),
              description: z.string(),
              value: z.string().optional(),
            })
          )
          .optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      // If this tier is set as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(vipTiers)
          .set({ isDefault: false })
          .where(eq(vipTiers.isDefault, true));
      }

      const [newTier] = await db.insert(vipTiers).values({
        ...input,
        isActive: true,
      });

      return { success: true, id: newTier.insertId };
    }),

  /**
   * Update a VIP tier
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(50).optional(),
        displayName: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        level: z.number().int().min(0).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        icon: z.string().optional(),
        minSpendYtd: z.string().optional(),
        minOrdersYtd: z.number().int().optional(),
        minAccountAgeDays: z.number().int().optional(),
        minPaymentOnTimeRate: z.string().optional(),
        discountPercentage: z.string().optional(),
        creditLimitMultiplier: z.string().optional(),
        prioritySupport: z.boolean().optional(),
        earlyAccessToProducts: z.boolean().optional(),
        freeShipping: z.boolean().optional(),
        dedicatedRep: z.boolean().optional(),
        customBenefits: z
          .array(
            z.object({
              name: z.string(),
              description: z.string(),
              value: z.string().optional(),
            })
          )
          .optional(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const { id, ...updates } = input;

      // If this tier is set as default, unset other defaults
      if (updates.isDefault === true) {
        await db
          .update(vipTiers)
          .set({ isDefault: false })
          .where(
            and(eq(vipTiers.isDefault, true), sql`${vipTiers.id} != ${id}`)
          );
      }

      await db.update(vipTiers).set(updates).where(eq(vipTiers.id, id));

      return { success: true };
    }),

  /**
   * Delete (deactivate) a VIP tier
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      await db
        .update(vipTiers)
        .set({ isActive: false })
        .where(eq(vipTiers.id, input.id));
      return { success: true };
    }),

  /**
   * Get client's VIP status
   */
  getClientStatus: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const [status] = await db
        .select({
          status: clientVipStatus,
          currentTier: vipTiers,
        })
        .from(clientVipStatus)
        .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
        .where(eq(clientVipStatus.clientId, input.clientId));

      if (!status) {
        // Get default tier if no status exists
        const [defaultTier] = await db
          .select()
          .from(vipTiers)
          .where(
            and(eq(vipTiers.isActive, true), eq(vipTiers.isDefault, true))
          );

        return {
          status: null,
          currentTier: defaultTier || null,
          nextTier: null,
          progress: 0,
        };
      }

      // Calculate next tier
      let nextTier = null;
      if (status.currentTier) {
        const [next] = await db
          .select()
          .from(vipTiers)
          .where(
            and(
              eq(vipTiers.isActive, true),
              gte(vipTiers.level, status.currentTier.level + 1)
            )
          )
          .orderBy(vipTiers.level)
          .limit(1);
        nextTier = next || null;
      }

      return {
        status: status.status,
        currentTier: status.currentTier,
        nextTier,
        progress: Number(status.status?.nextTierProgress || 0),
      };
    }),

  /**
   * Override client's VIP tier manually
   */
  overrideClientTier: adminProcedure
    .input(
      z.object({
        clientId: z.number(),
        tierId: z.number(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      // Get current status
      const [currentStatus] = await db
        .select()
        .from(clientVipStatus)
        .where(eq(clientVipStatus.clientId, input.clientId));

      const previousTierId = currentStatus?.currentTierId || null;

      // Upsert client VIP status
      if (currentStatus) {
        await db
          .update(clientVipStatus)
          .set({
            currentTierId: input.tierId,
            manualTierOverride: true,
            overrideReason: input.reason,
            overrideBy: ctx.user?.id,
            overrideAt: new Date(),
            lastTierChangeAt: new Date(),
          })
          .where(eq(clientVipStatus.clientId, input.clientId));
      } else {
        await db.insert(clientVipStatus).values({
          clientId: input.clientId,
          currentTierId: input.tierId,
          manualTierOverride: true,
          overrideReason: input.reason,
          overrideBy: ctx.user?.id,
          overrideAt: new Date(),
          lastTierChangeAt: new Date(),
        });
      }

      // Record in history
      await db.insert(vipTierHistory).values({
        clientId: input.clientId,
        previousTierId,
        newTierId: input.tierId,
        changeReason: "MANUAL",
        changeDetails: input.reason,
        changedBy: ctx.user?.id,
      });

      return { success: true };
    }),

  /**
   * Get tier change history for a client
   */
  getClientHistory: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const history = await db
        .select({
          history: vipTierHistory,
          previousTier: sql<string>`prev_tier.display_name`.as(
            "previousTierName"
          ),
          newTier: sql<string>`new_tier.display_name`.as("newTierName"),
        })
        .from(vipTierHistory)
        .leftJoin(
          sql`${vipTiers} as prev_tier`,
          sql`prev_tier.id = ${vipTierHistory.previousTierId}`
        )
        .leftJoin(
          sql`${vipTiers} as new_tier`,
          sql`new_tier.id = ${vipTierHistory.newTierId}`
        )
        .where(eq(vipTierHistory.clientId, input.clientId))
        .orderBy(desc(vipTierHistory.createdAt));

      return history;
    }),

  /**
   * Seed default VIP tiers
   */
  seedDefaults: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    const defaultTiers = [
      {
        name: "bronze",
        displayName: "Bronze",
        description: "Entry-level VIP tier for valued customers",
        level: 1,
        color: "#CD7F32",
        icon: "medal",
        minSpendYtd: "0",
        minOrdersYtd: 0,
        minAccountAgeDays: 0,
        discountPercentage: "0",
        creditLimitMultiplier: "1.00",
        prioritySupport: false,
        freeShipping: false,
        isDefault: true,
      },
      {
        name: "silver",
        displayName: "Silver",
        description: "For regular customers with consistent orders",
        level: 2,
        color: "#C0C0C0",
        icon: "star",
        minSpendYtd: "10000",
        minOrdersYtd: 5,
        minAccountAgeDays: 30,
        discountPercentage: "2",
        creditLimitMultiplier: "1.10",
        prioritySupport: false,
        freeShipping: false,
        isDefault: false,
      },
      {
        name: "gold",
        displayName: "Gold",
        description: "Premium tier for high-value customers",
        level: 3,
        color: "#FFD700",
        icon: "crown",
        minSpendYtd: "50000",
        minOrdersYtd: 15,
        minAccountAgeDays: 90,
        discountPercentage: "5",
        creditLimitMultiplier: "1.25",
        prioritySupport: true,
        freeShipping: false,
        isDefault: false,
      },
      {
        name: "platinum",
        displayName: "Platinum",
        description: "Elite tier for top-performing customers",
        level: 4,
        color: "#E5E4E2",
        icon: "gem",
        minSpendYtd: "100000",
        minOrdersYtd: 30,
        minAccountAgeDays: 180,
        discountPercentage: "7.5",
        creditLimitMultiplier: "1.50",
        prioritySupport: true,
        freeShipping: true,
        dedicatedRep: true,
        isDefault: false,
      },
      {
        name: "diamond",
        displayName: "Diamond",
        description: "Exclusive tier for our most valued partners",
        level: 5,
        color: "#B9F2FF",
        icon: "gem",
        minSpendYtd: "250000",
        minOrdersYtd: 50,
        minAccountAgeDays: 365,
        discountPercentage: "10",
        creditLimitMultiplier: "2.00",
        prioritySupport: true,
        earlyAccessToProducts: true,
        freeShipping: true,
        dedicatedRep: true,
        isDefault: false,
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const tier of defaultTiers) {
      const [existing] = await db
        .select()
        .from(vipTiers)
        .where(eq(vipTiers.name, tier.name));

      if (existing) {
        skipped++;
      } else {
        await db.insert(vipTiers).values(tier);
        created++;
      }
    }

    return { created, skipped };
  }),

  // ============================================================================
  // Sprint 5 Track A - Task 5.A.1: MEET-043 - Debt Cycling VIP Tiers
  // ============================================================================

  /**
   * Get comprehensive VIP metrics for a client (used in VIP Portal)
   */
  getClientMetrics: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await vipTierService.calculateVipTierMetrics(input.clientId);
    }),

  /**
   * Get complete VIP status with tier details and metrics for portal display
   */
  getClientStatusDetailed: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await vipTierService.getClientVipStatusWithDetails(input.clientId);
    }),

  /**
   * VIP Portal endpoint - Get current client's VIP status
   */
  getMyVipStatus: vipPortalProcedure.query(async ({ ctx }) => {
    const clientId = ctx.clientId;
    if (!clientId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "VIP session required",
      });
    }
    return await vipTierService.getClientVipStatusWithDetails(clientId);
  }),

  /**
   * Calculate recommended tier for a client (admin preview)
   */
  calculateTier: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await vipTierService.calculateRecommendedTier(input.clientId);
    }),

  /**
   * Recalculate and update client's VIP tier
   */
  recalculateClientTier: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await vipTierService.updateClientVipStatus(
        input.clientId,
        ctx.user?.id
      );
    }),

  /**
   * Batch recalculate all VIP tiers
   */
  recalculateAllTiers: adminProcedure.mutation(async () => {
    return await vipTierService.recalculateAllVipTiers();
  }),

  /**
   * Remove manual tier override
   */
  removeOverride: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [existingStatus] = await db
        .select()
        .from(clientVipStatus)
        .where(eq(clientVipStatus.clientId, input.clientId));

      if (!existingStatus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client VIP status not found",
        });
      }

      if (!existingStatus.manualTierOverride) {
        return { success: true, message: "No manual override to remove" };
      }

      await db
        .update(clientVipStatus)
        .set({
          manualTierOverride: false,
          overrideReason: null,
          overrideBy: null,
          overrideAt: null,
        })
        .where(eq(clientVipStatus.clientId, input.clientId));

      // Trigger recalculation
      const result = await vipTierService.updateClientVipStatus(
        input.clientId,
        ctx.user?.id
      );

      return {
        success: true,
        message: "Override removed and tier recalculated",
        newTierId: result.newTierId,
      };
    }),

  /**
   * Get tier badge info for display
   */
  getTierBadge: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [status] = await db
        .select({
          tier: vipTiers,
        })
        .from(clientVipStatus)
        .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
        .where(eq(clientVipStatus.clientId, input.clientId));

      if (!status?.tier) {
        // Get default tier
        const [defaultTier] = await db
          .select()
          .from(vipTiers)
          .where(
            and(eq(vipTiers.isActive, true), eq(vipTiers.isDefault, true))
          );

        return defaultTier
          ? {
              name: defaultTier.displayName,
              color: defaultTier.color,
              icon: defaultTier.icon,
              level: defaultTier.level,
            }
          : null;
      }

      return {
        name: status.tier.displayName,
        color: status.tier.color,
        icon: status.tier.icon,
        level: status.tier.level,
      };
    }),
});

export type VipTiersRouter = typeof vipTiersRouter;
