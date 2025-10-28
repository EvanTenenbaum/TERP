import { z } from "zod";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import * as salesSheetsDb from "../salesSheetsDb";

export const salesSheetsRouter = router({
    // Inventory with Pricing
    getInventory: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await salesSheetsDb.getInventoryWithPricing(input.clientId);
      }),

    // History
    save: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        items: z.array(z.any()),
        totalValue: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await salesSheetsDb.saveSalesSheet({
          ...input,
          createdBy: ctx.user?.id,
        });
      }),

    getHistory: protectedProcedure
      .input(z.object({ 
        clientId: z.number(), 
        limit: z.number().optional() 
      }))
      .query(async ({ input }) => {
        return await salesSheetsDb.getSalesSheetHistory(input.clientId, input.limit);
      }),

    getById: protectedProcedure
      .input(z.object({ sheetId: z.number() }))
      .query(async ({ input }) => {
        return await salesSheetsDb.getSalesSheetById(input.sheetId);
      }),

    delete: protectedProcedure
      .input(z.object({ sheetId: z.number() }))
      .mutation(async ({ input }) => {
        await salesSheetsDb.deleteSalesSheet(input.sheetId);
        return { success: true };
      }),

    // Templates
    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string(),
        clientId: z.number().optional(),
        isUniversal: z.boolean(),
        items: z.array(z.any()),
        columnConfig: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await salesSheetsDb.createTemplate({
          ...input,
          createdBy: ctx.user?.id || 1,
        });
      }),

    getTemplates: protectedProcedure
      .input(z.object({ 
        clientId: z.number().optional(), 
        includeUniversal: z.boolean().optional() 
      }))
      .query(async ({ input }) => {
        return await salesSheetsDb.getTemplates(input.clientId, input.includeUniversal);
      }),

    loadTemplate: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return await salesSheetsDb.loadTemplate(input.templateId);
      }),

    deleteTemplate: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ input }) => {
        await salesSheetsDb.deleteTemplate(input.templateId);
        return { success: true };
      }),
    })
