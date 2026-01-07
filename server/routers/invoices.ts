/**
 * Invoices Router
 * Handles invoice management for the sales workflow
 *
 * Wave 5A: Sales Workflow Completion
 * - Invoice listing and retrieval
 * - Invoice generation from orders
 * - Invoice status management
 */

import { z } from "zod";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  invoices,
  invoiceLineItems,
  payments,
  clients,
  orders,
  users,
} from "../../drizzle/schema";
import { eq, desc, and, sql, isNull, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";
import { createInvoiceFromOrder } from "../services/orderAccountingService";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listInvoicesSchema = z.object({
  status: z
    .enum(["DRAFT", "SENT", "VIEWED", "PARTIAL", "PAID", "OVERDUE", "VOID"])
    .optional(),
  clientId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const generateFromOrderSchema = z.object({
  orderId: z.number(),
});

const updateInvoiceStatusSchema = z.object({
  id: z.number(),
  status: z.enum([
    "DRAFT",
    "SENT",
    "VIEWED",
    "PARTIAL",
    "PAID",
    "OVERDUE",
    "VOID",
  ]),
  notes: z.string().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check and update overdue invoices
 */
async function checkOverdueInvoices(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const today = new Date();

  const result = await db
    .update(invoices)
    .set({ status: "OVERDUE" })
    .where(
      and(
        sql`status IN ('SENT', 'VIEWED', 'PARTIAL')`,
        sql`due_date < ${today}`,
        isNull(invoices.deletedAt)
      )
    );

  return result[0]?.affectedRows || 0;
}

// ============================================================================
// INVOICES ROUTER
// ============================================================================

export const invoicesRouter = router({
  /**
   * List invoices with optional filters
   */
  list: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(listInvoicesSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [isNull(invoices.deletedAt)];

      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }

      if (input.clientId) {
        conditions.push(eq(invoices.customerId, input.clientId));
      }

      if (input.startDate) {
        conditions.push(gte(invoices.invoiceDate, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(invoices.invoiceDate, new Date(input.endDate)));
      }

      const results = await db
        .select({
          invoice: invoices,
          client: clients,
          createdByUser: {
            id: users.id,
            name: users.name,
          },
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.customerId, clients.id))
        .leftJoin(users, eq(invoices.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(invoices)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count || 0);

      return {
        items: results.map(row => ({
          ...row.invoice,
          client: row.client,
          createdBy: row.createdByUser,
        })),
        total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get invoice by ID with line items
   */
  getById: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get invoice with client
      const [result] = await db
        .select({
          invoice: invoices,
          client: clients,
          createdByUser: {
            id: users.id,
            name: users.name,
          },
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.customerId, clients.id))
        .leftJoin(users, eq(invoices.createdBy, users.id))
        .where(and(eq(invoices.id, input.id), isNull(invoices.deletedAt)))
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Get line items
      const lineItems = await db
        .select()
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, input.id));

      // Get payments
      const invoicePayments = await db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, input.id))
        .orderBy(desc(payments.paymentDate));

      return {
        ...result.invoice,
        client: result.client,
        createdBy: result.createdByUser,
        lineItems,
        payments: invoicePayments,
      };
    }),

  /**
   * Generate invoice from order
   * Creates an invoice for a shipped/delivered order
   */
  generateFromOrder: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(generateFromOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      logger.info({
        msg: "[Invoices] Generating invoice from order",
        orderId: input.orderId,
      });

      // Get the order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Verify order is a SALE
      if (order.orderType !== "SALE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only generate invoice from SALE orders",
        });
      }

      // Verify order status allows invoicing
      const allowedStatuses = ["PENDING", "PACKED", "SHIPPED"];
      if (
        !order.fulfillmentStatus ||
        !allowedStatuses.includes(order.fulfillmentStatus)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Order must be in status: ${allowedStatuses.join(", ")}. Current: ${order.fulfillmentStatus}`,
        });
      }

      // Check if invoice already exists
      const [existing] = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.referenceType, "ORDER"),
            eq(invoices.referenceId, input.orderId),
            isNull(invoices.deletedAt)
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invoice already exists for this order: ${existing.invoiceNumber}`,
        });
      }

      // Parse order items
      const orderItems =
        typeof order.items === "string" ? JSON.parse(order.items) : order.items;

      // Calculate due date based on payment terms
      const paymentTermsDays: Record<string, number> = {
        COD: 0,
        NET_7: 7,
        NET_15: 15,
        NET_30: 30,
        PARTIAL: 30,
        CONSIGNMENT: 60,
      };
      const daysToAdd = paymentTermsDays[order.paymentTerms || "NET_30"] || 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      // Create the invoice using the accounting service
      const invoiceId = await createInvoiceFromOrder({
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientId: order.clientId,
        items: orderItems,
        subtotal: parseFloat(order.subtotal || "0"),
        tax: parseFloat(order.tax || "0"),
        total: parseFloat(order.total || "0"),
        dueDate,
        createdBy: userId,
      });

      // Update order with invoice reference
      await db
        .update(orders)
        .set({ invoiceId })
        .where(eq(orders.id, input.orderId));

      logger.info({
        msg: "[Invoices] Invoice generated from order",
        invoiceId,
        orderId: input.orderId,
      });

      // Return the created invoice
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1);

      return invoice;
    }),

  /**
   * Update invoice status
   */
  updateStatus: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(updateInvoiceStatusSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // Validate status transition
      if (invoice.status === "VOID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update a voided invoice",
        });
      }

      if (invoice.status === "PAID" && input.status !== "VOID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paid invoices can only be voided",
        });
      }

      await db
        .update(invoices)
        .set({
          status: input.status,
          notes: input.notes
            ? `${invoice.notes || ""}\n[Status Update]: ${input.notes}`.trim()
            : invoice.notes,
        })
        .where(eq(invoices.id, input.id));

      logger.info({
        msg: "[Invoices] Invoice status updated",
        invoiceId: input.id,
        oldStatus: invoice.status,
        newStatus: input.status,
      });

      return { success: true, invoiceId: input.id, status: input.status };
    }),

  /**
   * Mark invoice as sent
   */
  markSent: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(invoices)
        .set({ status: "SENT" })
        .where(eq(invoices.id, input.id));

      logger.info({
        msg: "[Invoices] Invoice marked as sent",
        invoiceId: input.id,
      });

      return { success: true, invoiceId: input.id };
    }),

  /**
   * Void an invoice
   */
  void: protectedProcedure
    .use(requirePermission("accounting:delete"))
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (invoice.status === "VOID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice is already voided",
        });
      }

      await db
        .update(invoices)
        .set({
          status: "VOID",
          notes:
            `${invoice.notes || ""}\n[VOIDED]: ${input.reason} on ${new Date().toISOString()}`.trim(),
        })
        .where(eq(invoices.id, input.id));

      logger.info({
        msg: "[Invoices] Invoice voided",
        invoiceId: input.id,
        reason: input.reason,
      });

      return { success: true, invoiceId: input.id };
    }),

  /**
   * Get invoice summary statistics
   */
  getSummary: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z
        .object({
          clientId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [isNull(invoices.deletedAt)];

      if (input?.clientId) {
        conditions.push(eq(invoices.customerId, input.clientId));
      }

      // Get counts by status
      const statusCounts = await db
        .select({
          status: invoices.status,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<string>`SUM(total_amount)`,
          amountDue: sql<string>`SUM(amount_due)`,
        })
        .from(invoices)
        .where(and(...conditions))
        .groupBy(invoices.status);

      // Calculate totals
      const totals = statusCounts.reduce(
        (acc, row) => {
          acc.totalInvoices += Number(row.count);
          acc.totalAmount += parseFloat(row.totalAmount || "0");
          if (row.status !== "VOID" && row.status !== "PAID") {
            acc.totalOutstanding += parseFloat(row.amountDue || "0");
          }
          if (row.status === "OVERDUE") {
            acc.overdueAmount += parseFloat(row.amountDue || "0");
          }
          return acc;
        },
        {
          totalInvoices: 0,
          totalAmount: 0,
          totalOutstanding: 0,
          overdueAmount: 0,
        }
      );

      return {
        byStatus: statusCounts.map(row => ({
          status: row.status,
          count: Number(row.count),
          totalAmount: parseFloat(row.totalAmount || "0"),
          amountDue: parseFloat(row.amountDue || "0"),
        })),
        totals,
      };
    }),

  /**
   * Check and update overdue invoices
   */
  checkOverdue: protectedProcedure
    .use(requirePermission("accounting:update"))
    .mutation(async () => {
      const count = await checkOverdueInvoices();

      logger.info({
        msg: "[Invoices] Checked for overdue invoices",
        updatedCount: count,
      });

      return { success: true, overdueCount: count };
    }),
});
