/**
 * Bad Debt Router
 * API endpoints for bad debt write-off management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as badDebtDb from "../badDebtDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const badDebtRouter = router({
  // Write off bad debt
  writeOff: protectedProcedure.use(requirePermission("accounting:manage"))
    .input(z.object({
      transactionId: z.number(),
      writeOffAmount: z.string(),
      reason: z.string().min(1),
      createGLEntry: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      return await badDebtDb.writeOffBadDebt(
        input.transactionId,
        input.writeOffAmount,
        input.reason,
        ctx.user.id,
        input.createGLEntry
      );
    }),

  // Reverse a write-off
  reverse: protectedProcedure.use(requirePermission("accounting:manage"))
    .input(z.object({
      writeOffTransactionId: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      return await badDebtDb.reverseBadDebtWriteOff(
        input.writeOffTransactionId,
        input.reason,
        ctx.user.id
      );
    }),

  // Get write-offs for a client
  getByClient: protectedProcedure.use(requirePermission("accounting:manage"))
    .input(z.object({
      clientId: z.number(),
      includeReversed: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      return await badDebtDb.getClientWriteOffs(input.clientId, input.includeReversed);
    }),

  // Get total write-offs for a client
  getClientTotal: protectedProcedure.use(requirePermission("accounting:manage"))
    .input(z.object({
      clientId: z.number(),
      includeReversed: z.boolean().optional().default(false),
    }))
    .query(async ({ input }) => {
      return await badDebtDb.getClientTotalWriteOffs(input.clientId, input.includeReversed);
    }),

  // Get bad debt aging report
  getAgingReport: protectedProcedure.use(requirePermission("accounting:manage"))
    .input(z.object({
      daysThreshold: z.number().optional().default(90),
    }))
    .query(async ({ input }) => {
      return await badDebtDb.getBadDebtAgingReport(input.daysThreshold);
    }),
});

