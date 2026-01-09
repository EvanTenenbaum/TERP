import { z } from "zod";
import { protectedProcedure, router, getAuthenticatedUserId } from "../_core/trpc";
import * as recurringOrdersDb from "../recurringOrdersDb";
import * as orderEnhancements from "../orderEnhancements";
import * as productRecommendations from "../productRecommendations";
import * as alertConfigurationDb from "../alertConfigurationDb";
import { requirePermission } from "../_core/permissionMiddleware";
import { TRPCError } from "@trpc/server";

export const orderEnhancementsRouter = router({
  // ===== RECURRING ORDERS =====

  createRecurringOrder: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        clientId: z.number(),
        frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY"]),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        orderTemplate: z.object({
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number(),
              notes: z.string().optional(),
            })
          ),
        }),
        startDate: z.string(),
        endDate: z.string().optional(),
        notifyClient: z.boolean().optional(),
        notifyEmail: z.string().optional(),
        // SECURITY FIX: Remove createdBy from input - will be derived from context
      })
    )
    .mutation(async ({ input, ctx }) => {
      // SECURITY FIX: Use authenticated user ID from context
      const userId = getAuthenticatedUserId(ctx);
      return await recurringOrdersDb.createRecurringOrder({
        ...input,
        createdBy: userId,
      });
    }),

  updateRecurringOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        recurringOrderId: z.number(),
        frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY"]).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        orderTemplate: z.any().optional(),
        endDate: z.string().optional(),
        notifyClient: z.boolean().optional(),
        notifyEmail: z.string().optional(),
        status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { recurringOrderId, ...data } = input;
      return await recurringOrdersDb.updateRecurringOrder(recurringOrderId, data);
    }),

  pauseRecurringOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({ recurringOrderId: z.number() }))
    .mutation(async ({ input }) => {
      return await recurringOrdersDb.pauseRecurringOrder(input.recurringOrderId);
    }),

  resumeRecurringOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({ recurringOrderId: z.number() }))
    .mutation(async ({ input }) => {
      return await recurringOrdersDb.resumeRecurringOrder(input.recurringOrderId);
    }),

  cancelRecurringOrder: protectedProcedure
    .use(requirePermission("orders:delete"))
    .input(z.object({ recurringOrderId: z.number() }))
    .mutation(async ({ input }) => {
      return await recurringOrdersDb.cancelRecurringOrder(input.recurringOrderId);
    }),

  listRecurringOrdersForClient: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await recurringOrdersDb.listRecurringOrdersForClient(input.clientId);
    }),

  listAllRecurringOrders: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return await recurringOrdersDb.listAllRecurringOrders(input?.status);
    }),

  getDueRecurringOrders: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      return await recurringOrdersDb.getDueRecurringOrders();
    }),

  markRecurringOrderGenerated: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({ recurringOrderId: z.number() }))
    .mutation(async ({ input }) => {
      return await recurringOrdersDb.markRecurringOrderGenerated(input.recurringOrderId);
    }),

  // ===== REORDER FUNCTIONALITY =====

  reorderFromPrevious: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        originalOrderId: z.number(),
        clientId: z.number(),
        // SECURITY FIX: Remove createdBy from input - will be derived from context
        modifications: z
          .array(
            z.object({
              productId: z.number(),
              quantity: z.number().optional(),
              remove: z.boolean().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // SECURITY FIX: Use authenticated user ID from context
      const userId = getAuthenticatedUserId(ctx);
      return await orderEnhancements.reorderFromPrevious({
        ...input,
        createdBy: userId,
      });
    }),

  getRecentOrdersForReorder: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().min(1).max(100).optional(), // SECURITY FIX: Add bounds validation
      })
    )
    .query(async ({ input }) => {
      return await orderEnhancements.getRecentOrdersForReorder(
        input.clientId,
        input.limit
      );
    }),

  // ===== PAYMENT TERMS =====

  updateClientPaymentTerms: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(
      z.object({
        clientId: z.number(),
        paymentTerms: z.string(),
        creditLimit: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await orderEnhancements.updateClientPaymentTerms(
        input.clientId,
        input.paymentTerms,
        input.creditLimit
      );
    }),

  getClientPaymentTerms: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await orderEnhancements.getClientPaymentTerms(input.clientId);
    }),

  // ===== PRODUCT RECOMMENDATIONS =====

  getProductRecommendations: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().min(1).max(100).optional(), // SECURITY FIX: Add bounds validation
      })
    )
    .query(async ({ input }) => {
      return await productRecommendations.getProductRecommendations(
        input.clientId,
        input.limit
      );
    }),

  getSimilarProducts: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        productId: z.number(),
        limit: z.number().min(1).max(100).optional(), // SECURITY FIX: Add bounds validation
      })
    )
    .query(async ({ input }) => {
      return await productRecommendations.getSimilarProducts(
        input.productId,
        input.limit
      );
    }),

  getFrequentlyBoughtTogether: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        productId: z.number(),
        limit: z.number().min(1).max(100).optional(), // SECURITY FIX: Add bounds validation
      })
    )
    .query(async ({ input }) => {
      return await productRecommendations.getFrequentlyBoughtTogether(
        input.productId,
        input.limit
      );
    }),

  // ===== ALERT CONFIGURATION =====

  createAlertConfiguration: protectedProcedure
    .use(requirePermission("alerts:create"))
    .input(
      z.object({
        // SECURITY FIX: Remove userId from input - will be derived from context
        alertType: z.enum([
          "LOW_STOCK",
          "EXPIRING_BATCH",
          "OVERDUE_PAYMENT",
          "HIGH_VALUE_ORDER",
          "SAMPLE_CONVERSION",
          "CUSTOM",
        ]),
        targetType: z.enum(["GLOBAL", "PRODUCT", "BATCH", "CLIENT", "CATEGORY"]),
        targetId: z.number().optional(),
        thresholdValue: z.number(),
        thresholdOperator: z.enum(["LESS_THAN", "GREATER_THAN", "EQUALS"]),
        deliveryMethod: z.enum(["DASHBOARD", "EMAIL", "BOTH"]).optional(),
        emailAddress: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // SECURITY FIX: Use authenticated user ID from context
      const userId = getAuthenticatedUserId(ctx);
      return await alertConfigurationDb.createAlertConfiguration({
        ...input,
        userId,
      });
    }),

  updateAlertConfiguration: protectedProcedure
    .use(requirePermission("alerts:update"))
    .input(
      z.object({
        alertConfigId: z.number(),
        thresholdValue: z.number().optional(),
        thresholdOperator: z.enum(["LESS_THAN", "GREATER_THAN", "EQUALS"]).optional(),
        deliveryMethod: z.enum(["DASHBOARD", "EMAIL", "BOTH"]).optional(),
        emailAddress: z.string().email().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { alertConfigId, ...data } = input;

      // SECURITY FIX: Validate ownership before update
      const userId = getAuthenticatedUserId(ctx);
      const existingConfig = await alertConfigurationDb.getAlertConfigurationById(alertConfigId);

      if (!existingConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert configuration not found",
        });
      }

      if (existingConfig.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only modify your own alert configurations",
        });
      }

      return await alertConfigurationDb.updateAlertConfiguration(alertConfigId, data);
    }),

  deleteAlertConfiguration: protectedProcedure
    .use(requirePermission("alerts:delete"))
    .input(z.object({ alertConfigId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // SECURITY FIX: Validate ownership before delete
      const userId = getAuthenticatedUserId(ctx);
      const existingConfig = await alertConfigurationDb.getAlertConfigurationById(input.alertConfigId);

      if (!existingConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert configuration not found",
        });
      }

      if (existingConfig.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own alert configurations",
        });
      }

      return await alertConfigurationDb.deleteAlertConfiguration(input.alertConfigId);
    }),

  getUserAlertConfigurations: protectedProcedure
    .use(requirePermission("alerts:read"))
    // SECURITY FIX: Remove userId from input - use context instead
    .query(async ({ ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await alertConfigurationDb.getUserAlertConfigurations(userId);
    }),

  getAllActiveAlertConfigurations: protectedProcedure
    .use(requirePermission("alerts:admin")) // SECURITY FIX: Require admin permission
    .query(async () => {
      return await alertConfigurationDb.getAllActiveAlertConfigurations();
    }),

  toggleAlertConfiguration: protectedProcedure
    .use(requirePermission("alerts:update"))
    .input(z.object({ alertConfigId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // SECURITY FIX: Validate ownership before toggle
      const userId = getAuthenticatedUserId(ctx);
      const existingConfig = await alertConfigurationDb.getAlertConfigurationById(input.alertConfigId);

      if (!existingConfig) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert configuration not found",
        });
      }

      if (existingConfig.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only toggle your own alert configurations",
        });
      }

      return await alertConfigurationDb.toggleAlertConfiguration(input.alertConfigId);
    }),
});
