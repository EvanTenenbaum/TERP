import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import * as pricingEngine from "../pricingEngine";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  nameSchema,
  descriptionSchema,
  idSchema,
  prioritySchema,
  flexiblePricingConditionsSchema,
} from "../_core/validationSchemas";
import * as orderPricingService from "../services/orderPricingService";
import { getDb } from "../db";
import { users, variableMarkupRules } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Pricing Router
 * QUAL-002: Updated with proper validation schemas (no z.any())
 * FEAT-004-BE: Added pricing context, order pricing, credit checking endpoints
 */
export const pricingRouter = router({
    // =========================================================================
    // FEAT-004-BE: Client Pricing Context
    // =========================================================================

    /**
     * Get client pricing context for order creation
     * Returns pricing profile, rules, credit info, and user permissions
     */
    getClientContext: protectedProcedure
      .use(requirePermission("pricing:read"))
      .input(z.object({
        clientId: idSchema,
      }))
      .query(async ({ input, ctx }) => {
        const userId = getAuthenticatedUserId(ctx);
        return await orderPricingService.getClientPricingContext(input.clientId, userId);
      }),

    /**
     * Calculate order pricing with all adjustment types
     */
    calculateOrderPricing: protectedProcedure
      .use(requirePermission("orders:create"))
      .input(z.object({
        clientId: idSchema,
        lineItems: z.array(z.object({
          batchId: idSchema,
          quantity: z.number().positive(),
          priceOverride: z.number().positive().optional(),
        })),
        categoryAdjustments: z.array(z.object({
          category: z.string(),
          adjustmentMode: z.enum(["PERCENT", "FIXED"]),
          adjustmentValue: z.number(),
        })).optional(),
        orderAdjustment: z.object({
          adjustmentMode: z.enum(["PERCENT", "FIXED"]),
          adjustmentValue: z.number(),
        }).optional(),
      }))
      .query(async ({ input }) => {
        return await orderPricingService.calculateOrderPricing(input);
      }),

    /**
     * Apply price adjustment during order creation
     */
    applyAdjustment: protectedProcedure
      .use(requirePermission("pricing:adjust"))
      .input(z.object({
        orderId: idSchema,
        adjustmentType: z.enum(["ITEM", "CATEGORY", "ORDER"]),
        targetId: idSchema.optional(),
        targetCategory: z.string().optional(),
        adjustmentMode: z.enum(["PERCENT", "FIXED"]),
        adjustmentValue: z.number(),
        reason: z.string().optional(),
        notes: z.string().optional(), // MEET-038: Notes on product pricing
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = getAuthenticatedUserId(ctx);
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Get user role
        const userResult = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        const userRole = userResult[0]?.role || "user";

        return await orderPricingService.applyPriceAdjustment({
          ...input,
          userId,
          userRole,
        });
      }),

    /**
     * Check credit limit for an order
     */
    checkCredit: protectedProcedure
      .use(requirePermission("orders:create"))
      .input(z.object({
        clientId: idSchema,
        orderTotal: z.number().nonnegative(),
      }))
      .query(async ({ input }) => {
        const result = await orderPricingService.checkClientCredit(input.clientId, input.orderTotal);
        return {
          allowed: !result.exceedsCredit,
          availableCredit: result.availableCredit,
          shortfall: result.shortfall,
          requiresOverride: result.requiresOverride,
        };
      }),

    /**
     * Request credit override (rep/manager)
     */
    requestCreditOverride: protectedProcedure
      .use(requirePermission("orders:create"))
      .input(z.object({
        orderId: idSchema,
        reason: z.string().min(10, "Please provide a detailed reason (min 10 characters)"),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = getAuthenticatedUserId(ctx);
        return await orderPricingService.requestCreditOverride({
          ...input,
          userId,
        });
      }),

    /**
     * Approve or reject credit override (admin only)
     */
    approveCreditOverride: protectedProcedure
      .use(requirePermission("admin:credit-override"))
      .input(z.object({
        orderId: idSchema,
        approved: z.boolean(),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = getAuthenticatedUserId(ctx);
        return await orderPricingService.approveCreditOverride({
          ...input,
          userId,
        });
      }),

    /**
     * Get order price adjustments (audit trail)
     */
    getOrderAdjustments: protectedProcedure
      .use(requirePermission("pricing:read"))
      .input(z.object({
        orderId: idSchema,
      }))
      .query(async ({ input }) => {
        return await orderPricingService.getOrderAdjustments(input.orderId);
      }),

    // =========================================================================
    // MEET-061: Suggested Purchase Price (History)
    // =========================================================================

    /**
     * Get suggested purchase price based on history
     */
    getSuggestedPurchasePrice: protectedProcedure
      .use(requirePermission("pricing:read"))
      .input(z.object({
        productId: idSchema,
        supplierId: idSchema.optional(),
      }))
      .query(async ({ input }) => {
        return await orderPricingService.getSuggestedPurchasePrice(input);
      }),

    // =========================================================================
    // MEET-062: Last Sale Price Lookup
    // =========================================================================

    /**
     * Get last sale price for a product (to client or overall)
     */
    getLastSalePrice: protectedProcedure
      .use(requirePermission("pricing:read"))
      .input(z.object({
        productId: idSchema,
        clientId: idSchema.optional(),
      }))
      .query(async ({ input }) => {
        return await orderPricingService.getLastSalePrice(input);
      }),

    // =========================================================================
    // MEET-063: Farmer Receipt History Link
    // =========================================================================

    /**
     * Get supplier/farmer receipt history for pricing reference
     */
    getSupplierReceiptHistory: protectedProcedure
      .use(requirePermission("pricing:read"))
      .input(z.object({
        supplierId: idSchema,
        productId: idSchema.optional(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(async ({ input }) => {
        return await orderPricingService.getSupplierReceiptHistory(input);
      }),

    // =========================================================================
    // MEET-014: Variable Markup Rules (Age/Quantity)
    // =========================================================================

    /**
     * List variable markup rules for a profile
     */
    listVariableMarkupRules: protectedProcedure
      .use(requirePermission("pricing:read"))
      .input(z.object({
        profileId: idSchema,
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        return await db
          .select()
          .from(variableMarkupRules)
          .where(eq(variableMarkupRules.profileId, input.profileId));
      }),

    /**
     * Create variable markup rule
     */
    createVariableMarkupRule: protectedProcedure
      .use(requirePermission("pricing:create"))
      .input(z.object({
        profileId: idSchema,
        ruleType: z.enum(["AGE", "QUANTITY"]),
        thresholdMin: z.number().nonnegative(),
        thresholdMax: z.number().positive().optional(),
        adjustmentMode: z.enum(["PERCENT", "FIXED"]),
        adjustmentValue: z.number(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [result] = await db.insert(variableMarkupRules).values({
          profileId: input.profileId,
          ruleType: input.ruleType,
          thresholdMin: input.thresholdMin,
          thresholdMax: input.thresholdMax || null,
          adjustmentMode: input.adjustmentMode,
          adjustmentValue: input.adjustmentValue.toString(),
          category: input.category || null,
          isActive: true,
        });

        return { id: result.insertId };
      }),

    /**
     * Update variable markup rule
     */
    updateVariableMarkupRule: protectedProcedure
      .use(requirePermission("pricing:update"))
      .input(z.object({
        id: idSchema,
        thresholdMin: z.number().nonnegative().optional(),
        thresholdMax: z.number().positive().nullable().optional(),
        adjustmentMode: z.enum(["PERCENT", "FIXED"]).optional(),
        adjustmentValue: z.number().optional(),
        category: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { id, ...data } = input;
        const updateData: Record<string, unknown> = {};

        if (data.thresholdMin !== undefined) updateData.thresholdMin = data.thresholdMin;
        if (data.thresholdMax !== undefined) updateData.thresholdMax = data.thresholdMax;
        if (data.adjustmentMode !== undefined) updateData.adjustmentMode = data.adjustmentMode;
        if (data.adjustmentValue !== undefined) updateData.adjustmentValue = data.adjustmentValue.toString();
        if (data.category !== undefined) updateData.category = data.category;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        await db
          .update(variableMarkupRules)
          .set(updateData)
          .where(eq(variableMarkupRules.id, id));

        return { success: true };
      }),

    /**
     * Delete variable markup rule
     */
    deleteVariableMarkupRule: protectedProcedure
      .use(requirePermission("pricing:delete"))
      .input(z.object({
        id: idSchema,
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .delete(variableMarkupRules)
          .where(eq(variableMarkupRules.id, input.id));

        return { success: true };
      }),

    // =========================================================================
    // Original Pricing Rules CRUD
    // =========================================================================

    // Pricing Rules
    listRules: protectedProcedure.use(requirePermission("pricing:read"))
      .query(async () => {
        return await pricingEngine.getPricingRules();
      }),

    getRuleById: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ ruleId: idSchema }))
      .query(async ({ input }) => {
        return await pricingEngine.getPricingRuleById(input.ruleId);
      }),

    createRule: protectedProcedure.use(requirePermission("pricing:create"))
      .input(z.object({
        name: nameSchema,
        description: descriptionSchema,
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]),
        adjustmentValue: z.number().min(-100, "Adjustment value cannot be less than -100%").max(1000, "Adjustment value cannot exceed 1000%"),
        conditions: flexiblePricingConditionsSchema,
        logicType: z.enum(["AND", "OR"]).optional(),
        priority: prioritySchema.optional(),
      }))
      .mutation(async ({ input }) => {
        return await pricingEngine.createPricingRule(input);
      }),

    updateRule: protectedProcedure.use(requirePermission("pricing:update"))
      .input(z.object({
        ruleId: idSchema,
        name: nameSchema.optional(),
        description: descriptionSchema,
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]).optional(),
        adjustmentValue: z.number().min(-100, "Adjustment value cannot be less than -100%").max(1000, "Adjustment value cannot exceed 1000%").optional(),
        conditions: flexiblePricingConditionsSchema.optional(),
        logicType: z.enum(["AND", "OR"]).optional(),
        priority: prioritySchema.optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ruleId, ...data } = input;
        await pricingEngine.updatePricingRule(ruleId, data);
        return { success: true };
      }),

    deleteRule: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ ruleId: idSchema }))
      .mutation(async ({ input }) => {
        await pricingEngine.deletePricingRule(input.ruleId);
        return { success: true };
      }),

    // Pricing Profiles
    listProfiles: protectedProcedure.use(requirePermission("pricing:read"))
      .query(async () => {
        return await pricingEngine.getPricingProfiles();
      }),

    getProfileById: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ profileId: idSchema }))
      .query(async ({ input }) => {
        return await pricingEngine.getPricingProfileById(input.profileId);
      }),

    createProfile: protectedProcedure.use(requirePermission("pricing:create"))
      .input(z.object({
        name: nameSchema,
        description: descriptionSchema,
        rules: z.array(z.object({ 
          ruleId: idSchema, 
          priority: prioritySchema 
        })).min(1, "At least one rule is required"),
      }))
      .mutation(async ({ input, ctx }) => {
        return await pricingEngine.createPricingProfile({
          ...input,
          createdBy: ctx.user?.id,
        });
      }),

    updateProfile: protectedProcedure.use(requirePermission("pricing:update"))
      .input(z.object({
        profileId: idSchema,
        name: nameSchema.optional(),
        description: descriptionSchema,
        rules: z.array(z.object({ 
          ruleId: idSchema, 
          priority: prioritySchema 
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { profileId, ...data } = input;
        await pricingEngine.updatePricingProfile(profileId, data);
        return { success: true };
      }),

    deleteProfile: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ profileId: idSchema }))
      .mutation(async ({ input }) => {
        await pricingEngine.deletePricingProfile(input.profileId);
        return { success: true };
      }),

    applyProfileToClient: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ 
        clientId: idSchema, 
        profileId: idSchema 
      }))
      .mutation(async ({ input }) => {
        await pricingEngine.applyProfileToClient(input.clientId, input.profileId);
        return { success: true };
      }),

    // Client Pricing
    getClientPricingRules: protectedProcedure.use(requirePermission("pricing:read"))
      .input(z.object({ clientId: idSchema }))
      .query(async ({ input }) => {
        return await pricingEngine.getClientPricingRules(input.clientId);
      }),
  })
