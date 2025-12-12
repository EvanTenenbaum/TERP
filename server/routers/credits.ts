/**
 * Credits Router
 * API endpoints for customer credit management (store credits, promotional credits, etc.)
 * 
 * Note: This is separate from the credit.ts router which handles credit limit calculations
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as creditsDb from "../creditsDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const creditsRouter = router({
  // Create a new credit
  create: protectedProcedure.use(requirePermission("credits:create"))
    .input(z.object({
      clientId: z.number(),
      creditAmount: z.string(),
      creditReason: z.string().optional(),
      expirationDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      // Generate credit number
      const creditNumber = await creditsDb.generateCreditNumber();
      
      return await creditsDb.createCredit({
        creditNumber,
        clientId: input.clientId,
        creditAmount: input.creditAmount,
        amountRemaining: input.creditAmount,
        amountUsed: "0",
        creditReason: input.creditReason,
        expirationDate: input.expirationDate,
        notes: input.notes,
        createdBy: ctx.user.id,
        creditStatus: "ACTIVE"
      });
    }),

  // Get credit by ID
  getById: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({ creditId: z.number() }))
    .query(async ({ input }) => {
      return await creditsDb.getCreditById(input.creditId);
    }),

  // Get credit by number
  getByNumber: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({ creditNumber: z.string() }))
    .query(async ({ input }) => {
      return await creditsDb.getCreditByNumber(input.creditNumber);
    }),

  // Get all credits for a client
  getByClient: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({
      clientId: z.number(),
      activeOnly: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      return await creditsDb.getCreditsByClient(input.clientId, input.activeOnly);
    }),

  // Get client credit balance
  getBalance: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await creditsDb.getClientCreditBalance(input.clientId);
    }),

  // Apply credit to an invoice
  applyCredit: protectedProcedure.use(requirePermission("credits:update"))
    .input(z.object({
      creditId: z.number(),
      invoiceId: z.number(),
      amountToApply: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      return await creditsDb.applyCredit(
        input.creditId,
        input.invoiceId,
        input.amountToApply,
        ctx.user.id,
        input.notes
      );
    }),

  // Get applications for a credit
  getApplications: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({ creditId: z.number() }))
    .query(async ({ input }) => {
      return await creditsDb.getCreditApplications(input.creditId);
    }),

  // Get credits applied to an invoice
  getInvoiceApplications: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({ invoiceId: z.number() }))
    .query(async ({ input }) => {
      return await creditsDb.getInvoiceCreditApplications(input.invoiceId);
    }),

  // Get credit history for a client
  getHistory: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await creditsDb.getClientCreditHistory(input.clientId);
    }),

  // Void a credit
  void: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({ creditId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await creditsDb.voidCredit(input.creditId);
    }),

  // Mark expired credits (admin function, could be run as cron job)
  markExpired: protectedProcedure.use(requirePermission("credits:read"))
    .mutation(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const count = await creditsDb.markExpiredCredits();
      return { expiredCount: count };
    }),
});

