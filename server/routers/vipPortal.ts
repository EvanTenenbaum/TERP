import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { db } from "../_core/db";
import { 
  clients, 
  vipPortalAuth, 
  vipPortalConfigurations,
  clientNeeds,
  vendorSupply,
  orders,
  transactions
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

/**
 * VIP Portal Router
 * Client-facing endpoints for the VIP Client Portal
 */
export const vipPortalRouter = router({
  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  
  auth: router({
    // Login with email and password
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: eq(vipPortalAuth.email, input.email),
          with: {
            client: true,
          },
        });

        if (!authRecord || !authRecord.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        const isValid = await bcrypt.compare(input.password, authRecord.passwordHash);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Generate session token
        const sessionToken = crypto.randomUUID();
        const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Update auth record
        await db.update(vipPortalAuth)
          .set({
            sessionToken,
            sessionExpiresAt,
            lastLoginAt: new Date(),
            loginCount: sql`${vipPortalAuth.loginCount} + 1`,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        // Update client last login
        await db.update(clients)
          .set({ vipPortalLastLogin: new Date() })
          .where(eq(clients.id, authRecord.clientId));

        return {
          sessionToken,
          clientId: authRecord.clientId,
          clientName: authRecord.client?.name,
        };
      }),

    // Verify session token
    verifySession: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .query(async ({ input }) => {
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: and(
            eq(vipPortalAuth.sessionToken, input.sessionToken),
            gte(vipPortalAuth.sessionExpiresAt, new Date())
          ),
          with: {
            client: true,
          },
        });

        if (!authRecord) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired session",
          });
        }

        return {
          clientId: authRecord.clientId,
          clientName: authRecord.client?.name,
          email: authRecord.email,
        };
      }),

    // Logout
    logout: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.update(vipPortalAuth)
          .set({
            sessionToken: null,
            sessionExpiresAt: null,
          })
          .where(eq(vipPortalAuth.sessionToken, input.sessionToken));

        return { success: true };
      }),

    // Request password reset
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: eq(vipPortalAuth.email, input.email),
        });

        if (!authRecord) {
          // Don't reveal if email exists
          return { success: true };
        }

        const resetToken = crypto.randomUUID();
        const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.update(vipPortalAuth)
          .set({
            resetToken,
            resetTokenExpiresAt,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        // TODO: Send password reset email
        // For now, just return the token (in production, this would be emailed)
        return { success: true, resetToken };
      }),

    // Reset password with token
    resetPassword: publicProcedure
      .input(z.object({
        resetToken: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: and(
            eq(vipPortalAuth.resetToken, input.resetToken),
            gte(vipPortalAuth.resetTokenExpiresAt, new Date())
          ),
        });

        if (!authRecord) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired reset token",
          });
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 10);

        await db.update(vipPortalAuth)
          .set({
            passwordHash,
            resetToken: null,
            resetTokenExpiresAt: null,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        return { success: true };
      }),
  }),

  // ============================================================================
  // DASHBOARD
  // ============================================================================
  
  dashboard: router({
    // Get dashboard KPIs
    getKPIs: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const client = await db.query.clients.findFirst({
          where: eq(clients.id, input.clientId),
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        // Calculate YTD spend
        const ytdStart = new Date(new Date().getFullYear(), 0, 1);
        const ytdOrders = await db.query.orders.findMany({
          where: and(
            eq(orders.clientId, input.clientId),
            gte(orders.createdAt, ytdStart)
          ),
        });

        const ytdSpend = ytdOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);

        return {
          currentBalance: parseFloat(client.totalOwed || "0"),
          ytdSpend,
          creditUtilization: 0, // TODO: Calculate based on credit limit
          activeNeedsCount: 0, // TODO: Count active needs
          activeSupplyCount: 0, // TODO: Count active supply
        };
      }),
  }),

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================
  
  transactions: router({
    // List transactions with filters
    list: publicProcedure
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        type: z.enum(["INVOICE", "PAYMENT", "ORDER", "QUOTE"]).optional(),
        status: z.enum(["PAID", "PENDING", "OVERDUE", "CANCELLED"]).optional(),
      }))
      .query(async ({ input }) => {
        // TODO: Implement transaction listing
        return {
          transactions: [],
          total: 0,
        };
      }),
  }),

  // ============================================================================
  // ACCOUNTS RECEIVABLE
  // ============================================================================
  
  ar: router({
    // List outstanding AR
    list: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        // TODO: Implement AR listing
        return {
          invoices: [],
          totalOutstanding: 0,
          totalOverdue: 0,
        };
      }),
  }),

  // ============================================================================
  // ACCOUNTS PAYABLE
  // ============================================================================
  
  ap: router({
    // List outstanding AP
    list: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        // TODO: Implement AP listing
        return {
          bills: [],
          totalOwed: 0,
        };
      }),
  }),

  // ============================================================================
  // CREDIT CENTER
  // ============================================================================
  
  credit: router({
    // Get credit summary
    getSummary: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        // TODO: Implement credit summary
        return {
          creditLimit: 0,
          creditUsage: 0,
          availableCredit: 0,
          utilizationPercentage: 0,
          recommendations: [],
        };
      }),
  }),

  // ============================================================================
  // VIP TIER
  // ============================================================================
  
  tier: router({
    // Get tier status
    getStatus: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        // TODO: Implement tier status
        return {
          currentTier: "SILVER",
          nextTier: "GOLD",
          progress: 0,
          requirements: [],
          rewards: [],
          recommendations: [],
        };
      }),
  }),

  // ============================================================================
  // MARKETPLACE - NEEDS
  // ============================================================================
  
  marketplace: router({
    // List client needs
    listNeeds: publicProcedure
      .input(z.object({
        clientId: z.number(),
        status: z.enum(["ACTIVE", "FULFILLED", "EXPIRED", "CANCELLED"]).optional(),
      }))
      .query(async ({ input }) => {
        const needs = await db.query.clientNeeds.findMany({
          where: input.status 
            ? and(
                eq(clientNeeds.clientId, input.clientId),
                eq(clientNeeds.status, input.status)
              )
            : eq(clientNeeds.clientId, input.clientId),
          orderBy: [desc(clientNeeds.createdAt)],
        });

        return { needs };
      }),

    // Create client need
    createNeed: publicProcedure
      .input(z.object({
        clientId: z.number(),
        strain: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityMin: z.number().optional(),
        quantityMax: z.number().optional(),
        priceMax: z.number().optional(),
        expiresAt: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const [need] = await db.insert(clientNeeds).values({
          ...input,
          status: "ACTIVE",
          priority: "MEDIUM",
          createdBy: 1, // TODO: Get from session
        });

        return { needId: need.insertId };
      }),

    // Update client need
    updateNeed: publicProcedure
      .input(z.object({
        needId: z.number(),
        clientId: z.number(),
        strain: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityMin: z.number().optional(),
        quantityMax: z.number().optional(),
        priceMax: z.number().optional(),
        expiresAt: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { needId, clientId, ...updateData } = input;

        await db.update(clientNeeds)
          .set(updateData)
          .where(and(
            eq(clientNeeds.id, needId),
            eq(clientNeeds.clientId, clientId)
          ));

        return { success: true };
      }),

    // Cancel client need
    cancelNeed: publicProcedure
      .input(z.object({
        needId: z.number(),
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.update(clientNeeds)
          .set({ status: "CANCELLED" })
          .where(and(
            eq(clientNeeds.id, input.needId),
            eq(clientNeeds.clientId, input.clientId)
          ));

        return { success: true };
      }),

    // List vendor supply (client's own supply listings)
    listSupply: publicProcedure
      .input(z.object({
        clientId: z.number(),
        status: z.enum(["AVAILABLE", "RESERVED", "PURCHASED", "EXPIRED"]).optional(),
      }))
      .query(async ({ input }) => {
        // Note: vendorSupply uses vendorId, but for VIP clients we need to link to clientId
        // This may require a schema update or a junction table
        // For now, returning empty array as placeholder
        return { supply: [] };
      }),

    // Create supply listing
    createSupply: publicProcedure
      .input(z.object({
        clientId: z.number(),
        strain: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityAvailable: z.number(),
        unitPrice: z.number().optional(),
        availableUntil: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // TODO: Implement supply creation
        // This requires linking vendorSupply to clients
        return { supplyId: 0 };
      }),

    // Update supply listing
    updateSupply: publicProcedure
      .input(z.object({
        supplyId: z.number(),
        clientId: z.number(),
        strain: z.string().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantityAvailable: z.number().optional(),
        unitPrice: z.number().optional(),
        availableUntil: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // TODO: Implement supply update
        return { success: true };
      }),

    // Cancel supply listing
    cancelSupply: publicProcedure
      .input(z.object({
        supplyId: z.number(),
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // TODO: Implement supply cancellation
        return { success: true };
      }),
  }),

  // ============================================================================
  // PORTAL CONFIGURATION (Read-only for client)
  // ============================================================================
  
  config: router({
    // Get portal configuration for client
    get: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        if (!config) {
          // Return default configuration
          return {
            moduleDashboardEnabled: true,
            moduleArEnabled: true,
            moduleApEnabled: true,
            moduleTransactionHistoryEnabled: true,
            moduleVipTierEnabled: true,
            moduleCreditCenterEnabled: true,
            moduleMarketplaceNeedsEnabled: true,
            moduleMarketplaceSupplyEnabled: true,
            featuresConfig: {},
            advancedOptions: {},
          };
        }

        return config;
      }),
  }),
});
