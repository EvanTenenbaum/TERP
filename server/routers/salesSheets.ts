import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import * as salesSheetsDb from "../salesSheetsDb";
import { requirePermission } from "../_core/permissionMiddleware";

// Sales sheet item schema with full validation
const salesSheetItemSchema = z.object({
  id: z.number(),
  name: z.string().max(255),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  strain: z.string().optional(),
  basePrice: z.number().min(0).finite(),
  retailPrice: z.number().min(0).finite(),
  finalPrice: z.number().min(0).finite().optional(),
  quantity: z.number().min(0).finite(),
  grade: z.string().optional(),
  vendor: z.string().optional(),
  priceMarkup: z.number().finite(),
  appliedRules: z
    .array(
      z.object({
        ruleId: z.number(),
        ruleName: z.string(),
        adjustment: z.string(),
      })
    )
    .optional(),
});

// Column config schema
const columnConfigSchema = z
  .object({
    showCategory: z.boolean().optional(),
    showBasePrice: z.boolean().optional(),
    showRetailPrice: z.boolean().optional(),
    showQuantity: z.boolean().optional(),
    showGrade: z.boolean().optional(),
    showVendor: z.boolean().optional(),
  })
  .optional();

export const salesSheetsRouter = router({
  // Inventory with Pricing
  getInventory: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ clientId: z.number().positive() }))
    .query(async ({ input }) => {
      return await salesSheetsDb.getInventoryWithPricing(input.clientId);
    }),

  // History
  save: protectedProcedure.use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number().positive(),
        items: z.array(salesSheetItemSchema).min(1).max(1000),
        totalValue: z.number().min(0).finite(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify total matches items
      const calculatedTotal = input.items.reduce(
        (sum, item) => sum + (item.finalPrice || item.retailPrice),
        0
      );

      if (Math.abs(calculatedTotal - input.totalValue) > 0.01) {
        throw new Error("Total value mismatch");
      }

      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetsDb.saveSalesSheet({
        ...input,
        createdBy: userId,
      });
    }),

  getHistory: protectedProcedure.use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number().positive(),
        limit: z.number().positive().max(1000).optional(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetsDb.getSalesSheetHistory(
        input.clientId,
        input.limit
      );
    }),

  getById: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ sheetId: z.number().positive() }))
    .query(async ({ input }) => {
      return await salesSheetsDb.getSalesSheetById(input.sheetId);
    }),

  delete: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ sheetId: z.number().positive() }))
    .mutation(async ({ input }) => {
      await salesSheetsDb.deleteSalesSheet(input.sheetId);
      return { success: true };
    }),

  // Templates
  createTemplate: protectedProcedure.use(requirePermission("orders:create"))
    .input(
      z.object({
        name: z.string().min(1).max(255),
        clientId: z.number().positive().optional(),
        isUniversal: z.boolean(),
        items: z.array(salesSheetItemSchema).min(1).max(1000),
        columnConfig: columnConfigSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetsDb.createTemplate({
        ...input,
        createdBy: userId,
      });
    }),

  getTemplates: protectedProcedure.use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number().positive().optional(),
        includeUniversal: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetsDb.getTemplates(
        input.clientId,
        input.includeUniversal
      );
    }),

  loadTemplate: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ templateId: z.number().positive() }))
    .query(async ({ input }) => {
      return await salesSheetsDb.loadTemplate(input.templateId);
    }),

  deleteTemplate: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ templateId: z.number().positive() }))
    .mutation(async ({ input }) => {
      await salesSheetsDb.deleteTemplate(input.templateId);
      return { success: true };
    }),
});
