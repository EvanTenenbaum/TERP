/**
 * Credits Router
 * API endpoints for customer credit management (store credits, promotional credits, etc.)
 *
 * Note: This is separate from the credit.ts router which handles credit limit calculations
 *
 * Wave 5C Enhancement: Added comprehensive credit management features
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as creditsDb from "../creditsDb";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { credits, creditApplications, clients, invoices } from "../../drizzle/schema";
import { eq, and, desc, sql, or, inArray, like, gte, lte } from "drizzle-orm";
import { logger } from "../_core/logger";
import { createSafeUnifiedResponse } from "../_core/pagination";

// Credit reason enum for issuing credits
const creditReasonEnum = z.enum([
  "RETURN",
  "PRICE_ADJUSTMENT",
  "GOODWILL",
  "PROMOTIONAL",
  "REFUND",
  "DAMAGE_CLAIM",
  "BILLING_ERROR",
  "OTHER"
]);

export const creditsRouter = router({
  // List all credits with filtering and pagination
  list: protectedProcedure.use(requirePermission("credits:read"))
    .input(z.object({
      clientId: z.number().optional(),
      status: z.enum(["ACTIVE", "PARTIALLY_USED", "FULLY_USED", "EXPIRED", "VOID"]).optional(),
      reason: creditReasonEnum.optional(),
      searchTerm: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({ msg: "[Credits] Listing credits", filters: input });

      const conditions = [];

      if (input.clientId) {
        conditions.push(eq(credits.clientId, input.clientId));
      }
      if (input.status) {
        conditions.push(eq(credits.creditStatus, input.status));
      }
      if (input.reason) {
        conditions.push(eq(credits.creditReason, input.reason));
      }
      if (input.searchTerm) {
        // Escape SQL LIKE special characters to prevent injection
        const escapedTerm = input.searchTerm.replace(/[%_\\]/g, '\\$&');
        conditions.push(
          or(
            like(credits.creditNumber, `%${escapedTerm}%`),
            like(credits.notes, `%${escapedTerm}%`)
          )!
        );
      }

      // Get credits with client info
      let query = db
        .select({
          id: credits.id,
          creditNumber: credits.creditNumber,
          clientId: credits.clientId,
          clientName: clients.name,
          creditAmount: credits.creditAmount,
          amountUsed: credits.amountUsed,
          amountRemaining: credits.amountRemaining,
          creditReason: credits.creditReason,
          creditStatus: credits.creditStatus,
          expirationDate: credits.expirationDate,
          notes: credits.notes,
          createdAt: credits.createdAt,
        })
        .from(credits)
        .leftJoin(clients, eq(credits.clientId, clients.id));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      query = query.orderBy(desc(credits.createdAt)) as typeof query;
      query = query.limit(input.limit).offset(input.offset) as typeof query;

      const creditList = await query;

      // Get total count
      const countConditions = conditions.length > 0 ? and(...conditions) : undefined;
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(credits)
        .where(countConditions);

      return createSafeUnifiedResponse(
        creditList.map(c => ({
          ...c,
          creditAmount: Number(c.creditAmount),
          amountUsed: Number(c.amountUsed),
          amountRemaining: Number(c.amountRemaining),
        })),
        Number(countResult[0]?.count || 0),
        input.limit,
        input.offset
      );
    }),

  // Get credit summary statistics
  getSummary: protectedProcedure.use(requirePermission("credits:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({ msg: "[Credits] Getting credit summary" });

      // Get totals by status
      const statusTotals = await db
        .select({
          status: credits.creditStatus,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(CAST(${credits.creditAmount} AS DECIMAL(15,2)))`,
          totalRemaining: sql<number>`SUM(CAST(${credits.amountRemaining} AS DECIMAL(15,2)))`,
        })
        .from(credits)
        .groupBy(credits.creditStatus);

      // Get totals by reason
      const reasonTotals = await db
        .select({
          reason: credits.creditReason,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(CAST(${credits.creditAmount} AS DECIMAL(15,2)))`,
        })
        .from(credits)
        .groupBy(credits.creditReason);

      // Calculate overall totals
      const overallTotals = statusTotals.reduce(
        (acc, s) => ({
          totalCreditsIssued: acc.totalCreditsIssued + Number(s.totalAmount || 0),
          totalCreditsRemaining: acc.totalCreditsRemaining + Number(s.totalRemaining || 0),
          creditCount: acc.creditCount + Number(s.count || 0),
        }),
        { totalCreditsIssued: 0, totalCreditsRemaining: 0, creditCount: 0 }
      );

      // Get active credits that are expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringCredits = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(CAST(${credits.amountRemaining} AS DECIMAL(15,2)))`,
        })
        .from(credits)
        .where(
          and(
            or(
              eq(credits.creditStatus, "ACTIVE"),
              eq(credits.creditStatus, "PARTIALLY_USED")
            ),
            sql`${credits.expirationDate} IS NOT NULL`,
            sql`${credits.expirationDate} <= ${thirtyDaysFromNow}`
          )
        );

      return {
        ...overallTotals,
        totalCreditsUsed: overallTotals.totalCreditsIssued - overallTotals.totalCreditsRemaining,
        byStatus: statusTotals.reduce((acc, s) => {
          acc[s.status] = {
            count: Number(s.count),
            totalAmount: Number(s.totalAmount || 0),
            totalRemaining: Number(s.totalRemaining || 0),
          };
          return acc;
        }, {} as Record<string, { count: number; totalAmount: number; totalRemaining: number }>),
        byReason: reasonTotals.reduce((acc, r) => {
          const reason = r.reason || "OTHER";
          acc[reason] = {
            count: Number(r.count),
            totalAmount: Number(r.totalAmount || 0),
          };
          return acc;
        }, {} as Record<string, { count: number; totalAmount: number }>),
        expiringWithin30Days: {
          count: Number(expiringCredits[0]?.count || 0),
          totalAmount: Number(expiringCredits[0]?.totalAmount || 0),
        },
      };
    }),

  // Issue a new credit with enhanced options
  issue: protectedProcedure.use(requirePermission("credits:create"))
    .input(z.object({
      clientId: z.number(),
      amount: z.number().positive(),
      reason: creditReasonEnum,
      description: z.string().optional(),
      expiresAt: z.date().optional(),
      relatedInvoiceId: z.number().optional(),
      relatedReturnId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({ msg: "[Credits] Issuing credit", clientId: input.clientId, amount: input.amount, reason: input.reason });

      // Validate client exists
      const [client] = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(eq(clients.id, input.clientId));

      if (!client) {
        throw new Error("Client not found");
      }

      // Generate credit number
      const creditNumber = await creditsDb.generateCreditNumber();

      // Build description/notes
      const creditNotes = [
        input.description || `Credit issued for ${input.reason.toLowerCase().replace(/_/g, " ")}`,
        input.relatedInvoiceId ? `Related Invoice ID: ${input.relatedInvoiceId}` : null,
        input.relatedReturnId ? `Related Return ID: ${input.relatedReturnId}` : null,
        input.notes,
      ].filter(Boolean).join(" | ");

      const credit = await creditsDb.createCredit({
        creditNumber,
        clientId: input.clientId,
        creditAmount: input.amount.toFixed(2),
        amountRemaining: input.amount.toFixed(2),
        amountUsed: "0",
        creditReason: input.reason,
        expirationDate: input.expiresAt,
        notes: creditNotes,
        createdBy: ctx.user.id,
        creditStatus: "ACTIVE"
      });

      logger.info({ msg: "[Credits] Credit issued", creditId: credit.id, creditNumber });

      return credit;
    }),

  // Create a new credit (legacy endpoint - kept for backwards compatibility)
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
  void: protectedProcedure.use(requirePermission("credits:delete"))
    .input(z.object({ creditId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await creditsDb.voidCredit(input.creditId);
    }),

  // Mark expired credits (admin function, could be run as cron job)
  markExpired: protectedProcedure.use(requirePermission("credits:update"))
    .mutation(async ({ ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const count = await creditsDb.markExpiredCredits();
      return { expiredCount: count };
    }),
});

