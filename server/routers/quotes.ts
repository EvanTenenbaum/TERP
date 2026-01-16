/**
 * Quotes Router
 * Specialized router for quote management in the sales workflow
 *
 * Wave 5A: Sales Workflow Completion
 * - Quote creation and management
 * - Quote to order conversion
 * - Quote status management
 */

import { z } from "zod";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { orders, clients } from "../../drizzle/schema";
import { eq, desc, and, sql, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";
import * as ordersDb from "../ordersDb";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const quoteItemSchema = z.object({
  batchId: z.number(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  displayName: z.string().optional(),
  isSample: z.boolean().default(false),
  overrideCogs: z.number().optional(),
});

const createQuoteSchema = z.object({
  clientId: z.number(),
  items: z.array(quoteItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
  terms: z.string().optional(),
});

const listQuotesSchema = z.object({
  status: z
    .enum([
      "DRAFT",
      "SENT",
      "VIEWED",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CONVERTED",
    ])
    .optional(),
  clientId: z.number().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique quote number
 * Reserved for future use when creating quotes independently
 */
async function _generateQuoteNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const year = new Date().getFullYear();
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(eq(orders.orderType, "QUOTE"), sql`YEAR(created_at) = ${year}`));

  const count = Number(result[0]?.count || 0) + 1;
  return `Q-${year}-${String(count).padStart(5, "0")}`;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================================================
// QUOTES ROUTER
// ============================================================================

export const quotesRouter = router({
  /**
   * List quotes with optional filters
   */
  list: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(listQuotesSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(orders.orderType, "QUOTE"),
        isNull(orders.deletedAt),
      ];

      if (input.status) {
        conditions.push(eq(orders.quoteStatus, input.status));
      }

      if (input.clientId) {
        conditions.push(eq(orders.clientId, input.clientId));
      }

      // BUG-079: Explicitly select columns from both tables to avoid ambiguous column names
      const results = await db
        .select({
          orders: orders,
          clients: clients,
        })
        .from(orders)
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count for proper pagination
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count || 0);

      return {
        items: results.map(row => {
          let parsedItems;
          try {
            parsedItems =
              typeof row.orders.items === "string"
                ? JSON.parse(row.orders.items)
                : row.orders.items;
          } catch {
            parsedItems = [];
          }
          return {
            ...row.orders,
            client: row.clients,
            items: parsedItems,
          };
        }),
        total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get quote by ID
   */
  getById: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // BUG-079: Explicitly select columns from both tables to avoid ambiguous column names
      const [result] = await db
        .select({
          orders: orders,
          clients: clients,
        })
        .from(orders)
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .where(
          and(
            eq(orders.id, input.id),
            eq(orders.orderType, "QUOTE"),
            isNull(orders.deletedAt)
          )
        )
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      let parsedItems;
      try {
        parsedItems =
          typeof result.orders.items === "string"
            ? JSON.parse(result.orders.items)
            : result.orders.items;
      } catch {
        parsedItems = [];
      }

      return {
        ...result.orders,
        client: result.clients,
        items: parsedItems,
      };
    }),

  /**
   * Create a new quote
   */
  create: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(createQuoteSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);

      logger.info({
        msg: "[Quotes] Creating quote",
        clientId: input.clientId,
        itemCount: input.items.length,
      });

      // Use the ordersDb createOrder function with QUOTE type
      const order = await ordersDb.createOrder({
        orderType: "QUOTE",
        isDraft: true,
        clientId: input.clientId,
        items: input.items.map(item => ({
          batchId: item.batchId,
          displayName: item.displayName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          isSample: item.isSample,
          overrideCogs: item.overrideCogs,
        })),
        validUntil: input.validUntil || addDays(new Date(), 30).toISOString(),
        notes: input.notes,
        createdBy: userId,
      });

      logger.info({
        msg: "[Quotes] Quote created",
        quoteId: order.id,
        orderNumber: order.orderNumber,
      });

      return order;
    }),

  /**
   * Update quote status to SENT
   */
  send: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [quote] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.id), eq(orders.orderType, "QUOTE")))
        .limit(1);

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      if (quote.quoteStatus === "CONVERTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send a converted quote",
        });
      }

      await db
        .update(orders)
        .set({
          quoteStatus: "SENT",
          // Using a workaround since sentAt doesn't exist in schema
          // We can add this to notes or use updatedAt
        })
        .where(eq(orders.id, input.id));

      logger.info({ msg: "[Quotes] Quote sent", quoteId: input.id });

      // TODO: Send email notification to client
      // Email integration not configured - requires FEATURE_EMAIL_ENABLED=true
      // and email service provider configuration (Resend/SendGrid)

      // Refetch the updated quote
      const [updated] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.id))
        .limit(1);

      return updated || quote;
    }),

  /**
   * Accept a quote
   */
  accept: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [quote] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.id), eq(orders.orderType, "QUOTE")))
        .limit(1);

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      if (quote.quoteStatus === "CONVERTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Quote already converted to order",
        });
      }

      // Check if quote has expired
      if (quote.validUntil) {
        const expirationDate = new Date(quote.validUntil);
        if (expirationDate < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Quote has expired. Please create a new quote.",
          });
        }
      }

      await db
        .update(orders)
        .set({ quoteStatus: "ACCEPTED" })
        .where(eq(orders.id, input.id));

      logger.info({ msg: "[Quotes] Quote accepted", quoteId: input.id });

      return { success: true, quoteId: input.id };
    }),

  /**
   * Reject a quote
   */
  reject: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [quote] = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.id), eq(orders.orderType, "QUOTE")))
        .limit(1);

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      if (quote.quoteStatus === "CONVERTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot reject a converted quote",
        });
      }

      await db
        .update(orders)
        .set({
          quoteStatus: "REJECTED",
          notes: input.reason
            ? `${quote.notes || ""}\n[Rejected]: ${input.reason}`.trim()
            : quote.notes,
        })
        .where(eq(orders.id, input.id));

      logger.info({
        msg: "[Quotes] Quote rejected",
        quoteId: input.id,
        reason: input.reason,
      });

      return { success: true, quoteId: input.id };
    }),

  /**
   * Convert quote to order (sale)
   * This creates a new SALE order from the quote
   */
  convertToOrder: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        id: z.number(),
        paymentTerms: z
          .enum(["NET_7", "NET_15", "NET_30", "COD", "PARTIAL", "CONSIGNMENT"])
          .optional(),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      logger.info({
        msg: "[Quotes] Converting quote to order",
        quoteId: input.id,
      });

      // Use the existing ordersDb function
      const order = await ordersDb.convertQuoteToSale({
        quoteId: input.id,
        paymentTerms: input.paymentTerms || "NET_30",
        cashPayment: input.cashPayment,
        notes: input.notes,
      });

      logger.info({
        msg: "[Quotes] Quote converted to order",
        quoteId: input.id,
        orderId: order.id,
      });

      return order;
    }),

  /**
   * Check and update expired quotes
   */
  checkExpired: protectedProcedure
    .use(requirePermission("orders:update"))
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const today = new Date();

      // Find and update expired quotes
      const result = await db
        .update(orders)
        .set({ quoteStatus: "EXPIRED" })
        .where(
          and(
            eq(orders.orderType, "QUOTE"),
            eq(orders.quoteStatus, "SENT"),
            sql`valid_until < ${today}`
          )
        );

      logger.info({
        msg: "[Quotes] Checked for expired quotes",
        updatedCount: result[0]?.affectedRows || 0,
      });

      return {
        success: true,
        expiredCount: result[0]?.affectedRows || 0,
      };
    }),
});
