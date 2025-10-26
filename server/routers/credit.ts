import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as creditEngine from "../creditEngine";

export const creditRouter = router({
    // Calculate credit limit for a client
    calculate: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        customWeights: z.object({
          revenueMomentumWeight: z.number().min(0).max(100).optional(),
          cashCollectionWeight: z.number().min(0).max(100).optional(),
          profitabilityWeight: z.number().min(0).max(100).optional(),
          debtAgingWeight: z.number().min(0).max(100).optional(),
          repaymentVelocityWeight: z.number().min(0).max(100).optional(),
          tenureWeight: z.number().min(0).max(100).optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const result = await creditEngine.calculateCreditLimit(input.clientId, input.customWeights);
        // Save to database if no custom weights (i.e., this is the real calculation)
        if (!input.customWeights) {
          await creditEngine.saveCreditLimit(input.clientId, result, ctx.user.id);
        }
        return result;
      }),

    // Get credit limit for a client
    getByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { clientCreditLimits } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db.select().from(clientCreditLimits).where(eq(clientCreditLimits.clientId, input.clientId)).limit(1);
        return result[0] || null;
      }),

    // Get signal history for a client
    getSignalHistory: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(30),
      }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditSignalHistory } = await import("../../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        return await db
          .select()
          .from(creditSignalHistory)
          .where(eq(creditSignalHistory.clientId, input.clientId))
          .orderBy(desc(creditSignalHistory.calculatedAt))
          .limit(input.limit);
      }),

    // Get system settings
    getSettings: protectedProcedure
      .query(async () => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditSystemSettings } = await import("../../drizzle/schema");
        let settings = await db.select().from(creditSystemSettings).limit(1);
        if (settings.length === 0) {
          // Create default settings
          await db.insert(creditSystemSettings).values({});
          settings = await db.select().from(creditSystemSettings).limit(1);
        }
        return settings[0];
      }),

    // Update system settings
    updateSettings: protectedProcedure
      .input(z.object({
        revenueMomentumWeight: z.number().min(0).max(100),
        cashCollectionWeight: z.number().min(0).max(100),
        profitabilityWeight: z.number().min(0).max(100),
        debtAgingWeight: z.number().min(0).max(100),
        repaymentVelocityWeight: z.number().min(0).max(100),
        tenureWeight: z.number().min(0).max(100),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        
        // Validate weights sum to 100
        const sum = input.revenueMomentumWeight + input.cashCollectionWeight + 
                    input.profitabilityWeight + input.debtAgingWeight + 
                    input.repaymentVelocityWeight + input.tenureWeight;
        if (Math.abs(sum - 100) > 0.01) {
          throw new Error("Weights must sum to 100");
        }

        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditSystemSettings } = await import("../../drizzle/schema");
        
        // Update or create settings
        const existing = await db.select().from(creditSystemSettings).limit(1);
        if (existing.length > 0) {
          await db.update(creditSystemSettings).set({
            ...input,
            updatedBy: ctx.user.id,
          });
        } else {
          await db.insert(creditSystemSettings).values({
            ...input,
            updatedBy: ctx.user.id,
          });
        }
        
        return { success: true };
      }),

    // Get audit log for a client
    getAuditLog: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditAuditLog } = await import("../../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        return await db
          .select()
          .from(creditAuditLog)
          .where(eq(creditAuditLog.clientId, input.clientId))
          .orderBy(desc(creditAuditLog.createdAt))
          .limit(input.limit);
      }),
  })
