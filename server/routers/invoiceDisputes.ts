/**
 * Invoice Disputes Router (MEET-017)
 * Sprint 5 Track D.1: Invoice History (Debt Disputes)
 *
 * Provides searchable invoice history for disputes with:
 * - Full invoice search by number, date, amount
 * - Dispute status tracking (open, resolved, rejected)
 * - Notes and attachments for disputes
 * - Resolution workflow
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  invoices,
  clients,
  users,
} from "../../drizzle/schema";
import {
  invoiceDisputes,
  disputeAttachments,
  disputeNotes,
} from "../../drizzle/schema-sprint5-trackd";
import { eq, and, sql, isNull, like, desc, gte, lte } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Input Schemas
// ============================================================================

const searchInvoicesSchema = z.object({
  invoiceNumber: z.string().optional(),
  clientId: z.number().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "VIEWED", "PARTIAL", "PAID", "OVERDUE", "VOID"]).optional(),
  hasDispute: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createDisputeSchema = z.object({
  invoiceId: z.number(),
  disputeReason: z.string().min(10, "Please provide a detailed reason"),
  disputedAmount: z.number().positive(),
});

const updateDisputeSchema = z.object({
  disputeId: z.number(),
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED", "ESCALATED"]).optional(),
  resolutionNotes: z.string().optional(),
  adjustmentAmount: z.number().optional(),
  assignedTo: z.number().optional(),
});

const addDisputeNoteSchema = z.object({
  disputeId: z.number(),
  note: z.string().min(1),
  isInternal: z.boolean().default(true),
});

// ============================================================================
// Helper Functions
// ============================================================================

async function generateDisputeNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(invoiceDisputes)
    .where(sql`YEAR(created_at) = ${year} AND MONTH(created_at) = ${today.getMonth() + 1}`);

  const count = Number(result[0]?.count || 0) + 1;
  return `DSP-${year}${month}-${String(count).padStart(5, "0")}`;
}

// ============================================================================
// Router
// ============================================================================

export const invoiceDisputesRouter = router({
  /**
   * Search invoices with full-text search capabilities
   */
  searchInvoices: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(searchInvoicesSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [isNull(invoices.deletedAt)];

      if (input.invoiceNumber) {
        conditions.push(like(invoices.invoiceNumber, `%${input.invoiceNumber}%`));
      }

      if (input.clientId) {
        conditions.push(eq(invoices.customerId, input.clientId));
      }

      if (input.minAmount !== undefined) {
        conditions.push(gte(invoices.totalAmount, input.minAmount.toString()));
      }

      if (input.maxAmount !== undefined) {
        conditions.push(lte(invoices.totalAmount, input.maxAmount.toString()));
      }

      if (input.startDate) {
        conditions.push(gte(invoices.invoiceDate, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(invoices.invoiceDate, new Date(input.endDate)));
      }

      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }

      const results = await db
        .select({
          invoice: invoices,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.customerId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.invoiceDate))
        .limit(input.limit)
        .offset(input.offset);

      // Get dispute count for each invoice
      const invoiceIds = results.map(r => r.invoice.id);
      let disputeCounts: Record<number, number> = {};

      if (invoiceIds.length > 0) {
        const disputes = await db
          .select({
            invoiceId: invoiceDisputes.invoiceId,
            count: sql<number>`COUNT(*)`,
          })
          .from(invoiceDisputes)
          .where(
            and(
              sql`invoice_id IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`,
              isNull(invoiceDisputes.deletedAt)
            )
          )
          .groupBy(invoiceDisputes.invoiceId);

        disputeCounts = disputes.reduce((acc, d) => {
          acc[d.invoiceId] = Number(d.count);
          return acc;
        }, {} as Record<number, number>);
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(invoices)
        .where(and(...conditions));

      return {
        items: results.map(r => ({
          ...r.invoice,
          client: r.client,
          disputeCount: disputeCounts[r.invoice.id] || 0,
        })),
        total: Number(countResult[0]?.count || 0),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * List all disputes with filtering
   */
  list: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({
      clientId: z.number().optional(),
      invoiceId: z.number().optional(),
      status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED", "ESCALATED"]).optional(),
      assignedTo: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [isNull(invoiceDisputes.deletedAt)];

      if (input.clientId) {
        conditions.push(eq(invoiceDisputes.clientId, input.clientId));
      }

      if (input.invoiceId) {
        conditions.push(eq(invoiceDisputes.invoiceId, input.invoiceId));
      }

      if (input.status) {
        conditions.push(eq(invoiceDisputes.disputeStatus, input.status));
      }

      if (input.assignedTo) {
        conditions.push(eq(invoiceDisputes.assignedTo, input.assignedTo));
      }

      const results = await db
        .select({
          dispute: invoiceDisputes,
          invoice: {
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            totalAmount: invoices.totalAmount,
          },
          client: {
            id: clients.id,
            name: clients.name,
          },
          creator: {
            id: users.id,
            name: users.name,
          },
        })
        .from(invoiceDisputes)
        .leftJoin(invoices, eq(invoiceDisputes.invoiceId, invoices.id))
        .leftJoin(clients, eq(invoiceDisputes.clientId, clients.id))
        .leftJoin(users, eq(invoiceDisputes.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(invoiceDisputes.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(invoiceDisputes)
        .where(and(...conditions));

      return {
        items: results.map(r => ({
          ...r.dispute,
          invoice: r.invoice,
          client: r.client,
          creator: r.creator,
        })),
        total: Number(countResult[0]?.count || 0),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get dispute by ID with full details
   */
  getById: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ disputeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [result] = await db
        .select({
          dispute: invoiceDisputes,
          invoice: invoices,
          client: clients,
          creator: {
            id: users.id,
            name: users.name,
          },
        })
        .from(invoiceDisputes)
        .leftJoin(invoices, eq(invoiceDisputes.invoiceId, invoices.id))
        .leftJoin(clients, eq(invoiceDisputes.clientId, clients.id))
        .leftJoin(users, eq(invoiceDisputes.createdBy, users.id))
        .where(eq(invoiceDisputes.id, input.disputeId))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dispute not found" });
      }

      // Get notes
      const notes = await db
        .select({
          note: disputeNotes,
          creator: {
            id: users.id,
            name: users.name,
          },
        })
        .from(disputeNotes)
        .leftJoin(users, eq(disputeNotes.createdBy, users.id))
        .where(eq(disputeNotes.disputeId, input.disputeId))
        .orderBy(desc(disputeNotes.createdAt));

      // Get attachments
      const attachments = await db
        .select()
        .from(disputeAttachments)
        .where(eq(disputeAttachments.disputeId, input.disputeId));

      return {
        ...result.dispute,
        invoice: result.invoice,
        client: result.client,
        creator: result.creator,
        notes: notes.map(n => ({ ...n.note, creator: n.creator })),
        attachments,
      };
    }),

  /**
   * Create a new dispute
   */
  create: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(createDisputeSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);

      // Verify invoice exists
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      // Check if disputed amount is reasonable
      const invoiceTotal = parseFloat(invoice.totalAmount?.toString() || "0");
      if (input.disputedAmount > invoiceTotal) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Disputed amount cannot exceed invoice total",
        });
      }

      const disputeNumber = await generateDisputeNumber();

      const result = await db.insert(invoiceDisputes).values({
        invoiceId: input.invoiceId,
        clientId: invoice.customerId,
        disputeNumber,
        disputeReason: input.disputeReason,
        disputedAmount: input.disputedAmount.toFixed(2),
        createdBy: userId,
      });

      logger.info({
        msg: "[Disputes] Created new dispute",
        disputeNumber,
        invoiceId: input.invoiceId,
        disputedAmount: input.disputedAmount,
        userId,
      });

      return {
        id: Number(result[0].insertId),
        disputeNumber,
        invoiceId: input.invoiceId,
        status: "OPEN",
      };
    }),

  /**
   * Update dispute status and details
   */
  update: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(updateDisputeSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);

      const { disputeId, ...updates } = input;

      // Check if dispute exists
      const [existing] = await db
        .select()
        .from(invoiceDisputes)
        .where(eq(invoiceDisputes.id, disputeId))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dispute not found" });
      }

      const updateData: Record<string, unknown> = {};

      if (updates.status) {
        updateData.disputeStatus = updates.status;

        // If resolving, set resolution fields
        if (updates.status === "RESOLVED" || updates.status === "REJECTED") {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = userId;
        }
      }

      if (updates.resolutionNotes !== undefined) {
        updateData.resolutionNotes = updates.resolutionNotes;
      }

      if (updates.adjustmentAmount !== undefined) {
        updateData.adjustmentAmount = updates.adjustmentAmount.toFixed(2);
      }

      if (updates.assignedTo !== undefined) {
        updateData.assignedTo = updates.assignedTo;
      }

      await db
        .update(invoiceDisputes)
        .set(updateData)
        .where(eq(invoiceDisputes.id, disputeId));

      logger.info({
        msg: "[Disputes] Updated dispute",
        disputeId,
        updates: Object.keys(updateData),
        userId,
      });

      return { success: true, disputeId };
    }),

  /**
   * Add note to dispute
   */
  addNote: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(addDisputeNoteSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);

      const result = await db.insert(disputeNotes).values({
        disputeId: input.disputeId,
        note: input.note,
        isInternal: input.isInternal,
        createdBy: userId,
      });

      return {
        id: Number(result[0].insertId),
        disputeId: input.disputeId,
      };
    }),

  /**
   * Get dispute statistics
   */
  getStats: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({
      clientId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [isNull(invoiceDisputes.deletedAt)];

      if (input?.clientId) {
        conditions.push(eq(invoiceDisputes.clientId, input.clientId));
      }

      const stats = await db
        .select({
          status: invoiceDisputes.disputeStatus,
          count: sql<number>`COUNT(*)`,
          totalDisputed: sql<string>`SUM(disputed_amount)`,
          totalAdjusted: sql<string>`SUM(COALESCE(adjustment_amount, 0))`,
        })
        .from(invoiceDisputes)
        .where(and(...conditions))
        .groupBy(invoiceDisputes.disputeStatus);

      return {
        byStatus: stats.map(s => ({
          status: s.status,
          count: Number(s.count),
          totalDisputed: parseFloat(s.totalDisputed || "0"),
          totalAdjusted: parseFloat(s.totalAdjusted || "0"),
        })),
        totals: stats.reduce(
          (acc, s) => {
            acc.totalCount += Number(s.count);
            acc.totalDisputed += parseFloat(s.totalDisputed || "0");
            acc.totalAdjusted += parseFloat(s.totalAdjusted || "0");
            return acc;
          },
          { totalCount: 0, totalDisputed: 0, totalAdjusted: 0 }
        ),
      };
    }),

  /**
   * Resolve dispute with adjustment
   */
  resolve: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(z.object({
      disputeId: z.number(),
      resolution: z.enum(["RESOLVED", "REJECTED"]),
      adjustmentAmount: z.number().optional(),
      resolutionNotes: z.string().min(1, "Resolution notes are required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);

      // Get dispute
      const [dispute] = await db
        .select()
        .from(invoiceDisputes)
        .where(eq(invoiceDisputes.id, input.disputeId))
        .limit(1);

      if (!dispute) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Dispute not found" });
      }

      if (dispute.disputeStatus === "RESOLVED" || dispute.disputeStatus === "REJECTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dispute has already been resolved",
        });
      }

      await db
        .update(invoiceDisputes)
        .set({
          disputeStatus: input.resolution,
          adjustmentAmount: input.adjustmentAmount?.toFixed(2) || "0",
          resolutionNotes: input.resolutionNotes,
          resolvedAt: new Date(),
          resolvedBy: userId,
        })
        .where(eq(invoiceDisputes.id, input.disputeId));

      // If resolved with adjustment, create ledger adjustment
      if (input.resolution === "RESOLVED" && input.adjustmentAmount && input.adjustmentAmount > 0) {
        // Note: Would integrate with client ledger adjustment here
        logger.info({
          msg: "[Disputes] Dispute resolved with adjustment",
          disputeId: input.disputeId,
          adjustmentAmount: input.adjustmentAmount,
        });
      }

      logger.info({
        msg: "[Disputes] Dispute resolved",
        disputeId: input.disputeId,
        resolution: input.resolution,
        adjustmentAmount: input.adjustmentAmount,
        userId,
      });

      return { success: true, disputeId: input.disputeId, resolution: input.resolution };
    }),
});
