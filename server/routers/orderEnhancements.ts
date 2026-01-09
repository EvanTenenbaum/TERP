import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as recurringOrdersDb from "../recurringOrdersDb";
import * as orderEnhancements from "../orderEnhancements";
import * as productRecommendations from "../productRecommendations";
import * as alertConfigurationDb from "../alertConfigurationDb";
import { requirePermission } from "../_core/permissionMiddleware";

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
        createdBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await recurringOrdersDb.createRecurringOrder(input);
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
        createdBy: z.number(),
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
    .mutation(async ({ input }) => {
      return await orderEnhancements.reorderFromPrevious(input);
    }),

  getRecentOrdersForReorder: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().optional(),
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
        limit: z.number().optional(),
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
        limit: z.number().optional(),
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
        limit: z.number().optional(),
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
    .use(requirePermission("orders:manage_alerts"))
    .input(
      z.object({
        userId: z.number(),
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
        emailAddress: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await alertConfigurationDb.createAlertConfiguration(input);
    }),

  updateAlertConfiguration: protectedProcedure
    .use(requirePermission("orders:manage_alerts"))
    .input(
      z.object({
        alertConfigId: z.number(),
        thresholdValue: z.number().optional(),
        thresholdOperator: z.enum(["LESS_THAN", "GREATER_THAN", "EQUALS"]).optional(),
        deliveryMethod: z.enum(["DASHBOARD", "EMAIL", "BOTH"]).optional(),
        emailAddress: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { alertConfigId, ...data } = input;
      return await alertConfigurationDb.updateAlertConfiguration(alertConfigId, data);
    }),

  deleteAlertConfiguration: protectedProcedure
    .use(requirePermission("orders:manage_alerts"))
    .input(z.object({ alertConfigId: z.number() }))
    .mutation(async ({ input }) => {
      return await alertConfigurationDb.deleteAlertConfiguration(input.alertConfigId);
    }),

  getUserAlertConfigurations: protectedProcedure
    .use(requirePermission("alerts:read"))
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await alertConfigurationDb.getUserAlertConfigurations(input.userId);
    }),

  getAllActiveAlertConfigurations: protectedProcedure
    .use(requirePermission("alerts:read"))
    .query(async () => {
      return await alertConfigurationDb.getAllActiveAlertConfigurations();
    }),

  toggleAlertConfiguration: protectedProcedure
    .use(requirePermission("orders:manage_alerts"))
    .input(z.object({ alertConfigId: z.number() }))
    .mutation(async ({ input }) => {
      return await alertConfigurationDb.toggleAlertConfiguration(input.alertConfigId);
    }),
});

