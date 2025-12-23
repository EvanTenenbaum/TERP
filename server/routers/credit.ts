import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as creditEngine from "../creditEngine";
import { requirePermission } from "../_core/permissionMiddleware";
import { getAuthenticatedUserId } from "../_core/trpc";

export const creditRouter = router({
    // Calculate credit limit for a client
    calculate: protectedProcedure.use(requirePermission("credits:read"))
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
        const userId = getAuthenticatedUserId(ctx);
        const result = await creditEngine.calculateCreditLimit(input.clientId, input.customWeights);
        // Save to database if no custom weights (i.e., this is the real calculation)
        if (!input.customWeights) {
          await creditEngine.saveCreditLimit(input.clientId, result, userId);
        }
        return result;
      }),

    // Get credit limit for a client
    getByClientId: protectedProcedure.use(requirePermission("credits:read"))
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { clientCreditLimits } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db.select().from(clientCreditLimits).where(eq(clientCreditLimits.clientId, input.clientId)).limit(1);
        return result[0] || null;
      }),

    // Sync credit limit to clients table (for fast access)
    syncToClient: protectedProcedure.use(requirePermission("credits:update"))
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { clientCreditLimits } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // Get credit limit from client_credit_limits
        const creditData = await db
          .select()
          .from(clientCreditLimits)
          .where(eq(clientCreditLimits.clientId, input.clientId))
          .limit(1);
        
        if (creditData.length === 0) {
          throw new Error("No credit limit calculated for this client");
        }
        
        const creditLimit = Number(creditData[0].creditLimit || 0);
        await creditEngine.syncCreditToClient(input.clientId, creditLimit);
        
        return { success: true, creditLimit };
      }),

    // Manual override of credit limit
    manualOverride: protectedProcedure.use(requirePermission("credits:update"))
      .input(z.object({
        clientId: z.number(),
        newLimit: z.number().min(0),
        reason: z.string().min(10, "Reason must be at least 10 characters"),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = getAuthenticatedUserId(ctx);
        await creditEngine.setManualCreditLimit(
          input.clientId,
          input.newLimit,
          input.reason,
          userId
        );
        return { success: true };
      }),

    // Check credit for order creation (with override support)
    checkOrderCredit: protectedProcedure.use(requirePermission("credits:read"))
      .input(z.object({
        clientId: z.number(),
        orderTotal: z.number(),
        overrideReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { clients, creditVisibilitySettings, creditAuditLog } = await import("../../drizzle/schema");
        const { eq, isNull } = await import("drizzle-orm");
        
        // Get client credit data
        const client = await db
          .select({
            creditLimit: clients.creditLimit,
            totalOwed: clients.totalOwed,
            name: clients.name,
          })
          .from(clients)
          .where(eq(clients.id, input.clientId))
          .limit(1);
        
        if (client.length === 0) {
          throw new Error("Client not found");
        }
        
        const creditLimit = Number(client[0].creditLimit || 0);
        const currentExposure = Number(client[0].totalOwed || 0);
        const newExposure = currentExposure + input.orderTotal;
        const availableCredit = creditLimit - currentExposure;
        
        // Get visibility settings (global or location-specific)
        const settings = await db
          .select()
          .from(creditVisibilitySettings)
          .where(isNull(creditVisibilitySettings.locationId))
          .limit(1);
        
        const enforcementMode = settings[0]?.creditEnforcementMode || "WARNING";
        const warningThreshold = settings[0]?.warningThresholdPercent || 75;
        const alertThreshold = settings[0]?.alertThresholdPercent || 90;
        
        // Calculate utilization
        const utilizationPercent = creditLimit > 0 ? (newExposure / creditLimit) * 100 : 0;
        
        // Determine result
        let allowed = true;
        let warning: string | undefined;
        let requiresOverride = false;
        
        if (creditLimit === 0) {
          // No credit limit set - allow by default
          allowed = true;
        } else if (newExposure > creditLimit) {
          // Exceeds credit limit
          const overAmount = newExposure - creditLimit;
          warning = `This order exceeds the credit limit by $${overAmount.toFixed(2)}. Available credit: $${availableCredit.toFixed(2)}`;
          
          if (enforcementMode === "HARD_BLOCK") {
            allowed = false;
          } else if (enforcementMode === "SOFT_BLOCK") {
            requiresOverride = true;
            allowed = !!input.overrideReason;
          } else {
            // WARNING mode - allow with warning
            allowed = true;
          }
        } else if (utilizationPercent >= alertThreshold) {
          warning = `This order will push credit utilization to ${utilizationPercent.toFixed(0)}% (above ${alertThreshold}% alert threshold)`;
        } else if (utilizationPercent >= warningThreshold) {
          warning = `Credit utilization will be ${utilizationPercent.toFixed(0)}% after this order`;
        }
        
        // Log override if provided
        if (input.overrideReason && newExposure > creditLimit) {
          const userId = getAuthenticatedUserId(ctx);
          await db.insert(creditAuditLog).values({
            clientId: input.clientId,
            eventType: "EXPOSURE_EXCEEDED",
            oldValue: currentExposure.toString(),
            newValue: newExposure.toString(),
            reason: `Order override: ${input.overrideReason}`,
            triggeredBy: userId,
          });
        }
        
        return {
          allowed,
          warning,
          requiresOverride,
          creditLimit,
          currentExposure,
          newExposure,
          availableCredit,
          utilizationPercent,
          enforcementMode,
        };
      }),

    // Get visibility settings
    getVisibilitySettings: protectedProcedure.use(requirePermission("credits:read"))
      .input(z.object({ locationId: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditVisibilitySettings } = await import("../../drizzle/schema");
        const { eq, isNull, or } = await import("drizzle-orm");
        
        // Get location-specific settings, fall back to global
        const settings = await db
          .select()
          .from(creditVisibilitySettings)
          .where(
            input.locationId
              ? or(
                  eq(creditVisibilitySettings.locationId, input.locationId),
                  isNull(creditVisibilitySettings.locationId)
                )
              : isNull(creditVisibilitySettings.locationId)
          )
          .limit(2);
        
        // Prefer location-specific, fall back to global
        const locationSettings = settings.find(s => s.locationId === input.locationId);
        const globalSettings = settings.find(s => s.locationId === null);
        
        return locationSettings || globalSettings || {
          // Default settings if none exist
          showCreditInClientList: true,
          showCreditBannerInOrders: true,
          showCreditWidgetInProfile: true,
          showSignalBreakdown: true,
          showAuditLog: true,
          creditEnforcementMode: "WARNING" as const,
          warningThresholdPercent: 75,
          alertThresholdPercent: 90,
        };
      }),

    // Update visibility settings
    updateVisibilitySettings: protectedProcedure.use(requirePermission("credits:update"))
      .input(z.object({
        locationId: z.number().optional(),
        settings: z.object({
          showCreditInClientList: z.boolean().optional(),
          showCreditBannerInOrders: z.boolean().optional(),
          showCreditWidgetInProfile: z.boolean().optional(),
          showSignalBreakdown: z.boolean().optional(),
          showAuditLog: z.boolean().optional(),
          creditEnforcementMode: z.enum(["WARNING", "SOFT_BLOCK", "HARD_BLOCK"]).optional(),
          warningThresholdPercent: z.number().min(0).max(100).optional(),
          alertThresholdPercent: z.number().min(0).max(100).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditVisibilitySettings } = await import("../../drizzle/schema");
        const { eq, isNull } = await import("drizzle-orm");
        
        // Check if settings exist
        const existing = await db
          .select()
          .from(creditVisibilitySettings)
          .where(
            input.locationId
              ? eq(creditVisibilitySettings.locationId, input.locationId)
              : isNull(creditVisibilitySettings.locationId)
          )
          .limit(1);
        
        if (existing.length > 0) {
          // Update existing
          await db
            .update(creditVisibilitySettings)
            .set(input.settings)
            .where(eq(creditVisibilitySettings.id, existing[0].id));
        } else {
          // Insert new
          await db.insert(creditVisibilitySettings).values({
            locationId: input.locationId || null,
            ...input.settings,
          });
        }
        
        return { success: true };
      }),

    // Get signal history for a client
    getSignalHistory: protectedProcedure.use(requirePermission("credits:read"))
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
    getSettings: protectedProcedure.use(requirePermission("credits:update"))
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
    updateSettings: protectedProcedure.use(requirePermission("credits:update"))
      .input(z.object({
        revenueMomentumWeight: z.number().min(0).max(100),
        cashCollectionWeight: z.number().min(0).max(100),
        profitabilityWeight: z.number().min(0).max(100),
        debtAgingWeight: z.number().min(0).max(100),
        repaymentVelocityWeight: z.number().min(0).max(100),
        tenureWeight: z.number().min(0).max(100),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = getAuthenticatedUserId(ctx);
        
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
            updatedBy: userId,
          });
        } else {
          await db.insert(creditSystemSettings).values({
            ...input,
            updatedBy: userId,
          });
        }
        
        return { success: true };
      }),

    // Get audit log for a client
    getAuditLog: protectedProcedure.use(requirePermission("credits:read"))
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
