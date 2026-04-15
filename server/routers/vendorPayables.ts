/**
 * Vendor Payables Router (MEET-005, MEET-006)
 *
 * API endpoints for managing vendor payables.
 * Tracks amounts owed to vendors for consigned inventory.
 *
 * Key features:
 * - List and view payables with filtering
 * - Mark payables as due when inventory hits zero
 * - Record payments against payables
 * - Dashboard summary and statistics
 * - Office-owned inventory tracking (MEET-006)
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
  vendorPayables,
  payableNotifications,
  batches,
  lots,
  clients,
  users,
  orderLineItems,
  products,
} from "../../drizzle/schema";
import { eq, and, sql, isNull, desc, inArray, gte, lte } from "drizzle-orm";
import { logger } from "../_core/logger";
import * as payablesService from "../services/payablesService";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listPayablesSchema = z.object({
  vendorClientId: z.number().optional(),
  status: z.enum(["PENDING", "DUE", "PARTIAL", "PAID", "VOID"]).optional(),
  statuses: z
    .array(z.enum(["PENDING", "DUE", "PARTIAL", "PAID", "VOID"]))
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const recordPaymentSchema = z.object({
  payableId: z.number(),
  amount: z.number().positive("Amount must be positive"),
  notes: z.string().optional(),
});

const createPayableSchema = z.object({
  batchId: z.number(),
  lotId: z.number(),
  vendorClientId: z.number(),
  cogsPerUnit: z.number().positive(),
  gracePeriodHours: z.number().min(0).max(720).optional(), // Max 30 days
});

const rangeComplianceSchema = z.object({
  vendorClientId: z.number(),
});

type RangeComplianceStatus = "IN_RANGE" | "BELOW_RANGE" | "ABOVE_RANGE";

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseNumber(value: unknown): number {
  return parseNullableNumber(value) ?? 0;
}

// ============================================================================
// VENDOR PAYABLES ROUTER
// ============================================================================

export const vendorPayablesRouter = router({
  /**
   * List payables with optional filters
   */
  list: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(listPayablesSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [isNull(vendorPayables.deletedAt)];

      if (input.vendorClientId) {
        conditions.push(
          eq(vendorPayables.vendorClientId, input.vendorClientId)
        );
      }

      if (input.status) {
        conditions.push(eq(vendorPayables.status, input.status));
      }

      if (input.statuses && input.statuses.length > 0) {
        conditions.push(inArray(vendorPayables.status, input.statuses));
      }

      if (input.startDate) {
        conditions.push(
          gte(vendorPayables.createdAt, new Date(input.startDate))
        );
      }

      if (input.endDate) {
        conditions.push(lte(vendorPayables.createdAt, new Date(input.endDate)));
      }

      const results = await db
        .select({
          payable: vendorPayables,
          vendorName: clients.name,
          batchCode: batches.code,
          batchSku: batches.sku,
          lotCode: lots.code,
          createdByName: users.name,
        })
        .from(vendorPayables)
        .leftJoin(clients, eq(vendorPayables.vendorClientId, clients.id))
        .leftJoin(batches, eq(vendorPayables.batchId, batches.id))
        .leftJoin(lots, eq(vendorPayables.lotId, lots.id))
        .leftJoin(users, eq(vendorPayables.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(vendorPayables.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(vendorPayables)
        .where(and(...conditions));

      const items = results.map(r => ({
        ...r.payable,
        vendorName: r.vendorName || "Unknown Vendor",
        batchCode: r.batchCode || "Unknown",
        batchSku: r.batchSku || "Unknown",
        lotCode: r.lotCode || "Unknown",
        createdByName: r.createdByName || "System",
      }));

      return {
        items,
        total: Number(countResult?.count || 0),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get payable by ID
   */
  getById: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const payable = await payablesService.getPayableById(input.id);
      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }
      return payable;
    }),

  /**
   * Get payable by batch ID
   */
  getByBatchId: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      const payable = await payablesService.getPayableByBatchId(input.batchId);
      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No payable found for this batch",
        });
      }
      return payable;
    }),

  /**
   * Create a new payable for a consigned batch
   * Usually called automatically when a consigned batch is created
   */
  create: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(createPayableSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);

      logger.info({
        msg: "[VendorPayables] Creating payable",
        batchId: input.batchId,
        vendorClientId: input.vendorClientId,
      });

      try {
        const payableId = await payablesService.createPayable(input, userId);
        return { id: payableId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to create payable",
          cause: error,
        });
      }
    }),

  /**
   * Record a payment against a payable
   */
  recordPayment: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(recordPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);

      logger.info({
        msg: "[VendorPayables] Recording payment",
        payableId: input.payableId,
        amount: input.amount,
      });

      const payable = await payablesService.getPayableById(input.payableId);
      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      const amountDue = parseFloat(payable.amountDue || "0");
      if (input.amount > amountDue) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment amount ($${input.amount.toFixed(2)}) exceeds amount due ($${amountDue.toFixed(2)})`,
        });
      }

      await payablesService.recordPayablePayment(
        input.payableId,
        input.amount,
        userId,
        input.notes
      );

      // Get updated payable
      const updatedPayable = await payablesService.getPayableById(
        input.payableId
      );

      return {
        success: true,
        payableId: input.payableId,
        newAmountDue: parseFloat(updatedPayable?.amountDue || "0"),
        newStatus: updatedPayable?.status,
      };
    }),

  /**
   * Manually mark a payable as due (admin override)
   */
  markDue: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(z.object({ payableId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const payable = await payablesService.getPayableById(input.payableId);
      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      if (payable.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot mark payable as due - current status is ${payable.status}`,
        });
      }

      const now = new Date();
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + payable.gracePeriodHours);

      await db
        .update(vendorPayables)
        .set({
          status: "DUE",
          inventoryZeroAt: now,
          dueDate: dueDate,
        })
        .where(eq(vendorPayables.id, input.payableId));

      logger.info({
        msg: "[VendorPayables] Manually marked payable as due",
        payableId: input.payableId,
      });

      return { success: true };
    }),

  /**
   * Void a payable
   */
  void: protectedProcedure
    .use(requirePermission("accounting:delete"))
    .input(
      z.object({
        payableId: z.number(),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);
      const payable = await payablesService.getPayableById(input.payableId);
      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      if (payable.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot void a fully paid payable",
        });
      }

      await db
        .update(vendorPayables)
        .set({
          status: "VOID",
          notes:
            `${payable.notes || ""}\n[VOIDED by User ${userId} on ${new Date().toISOString()}]: ${input.reason}`.trim(),
        })
        .where(eq(vendorPayables.id, input.payableId));

      logger.info({
        msg: "[VendorPayables] Voided payable",
        payableId: input.payableId,
        reason: input.reason,
      });

      return { success: true };
    }),

  /**
   * Get payables summary statistics
   */
  getSummary: protectedProcedure
    .use(requirePermission("accounting:read"))
    .query(async () => {
      return payablesService.getPayablesSummary();
    }),

  /**
   * Get payables for a specific vendor
   */
  getByVendor: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        vendorClientId: z.number(),
        includeStatuses: z
          .array(z.enum(["PENDING", "DUE", "PARTIAL", "PAID", "VOID"]))
          .optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const result = await payablesService.listPayables({
        vendorClientId: input.vendorClientId,
        status: input.includeStatuses as
          | payablesService.PayableStatus[]
          | undefined,
        limit: input.limit,
      });
      return result;
    }),

  /**
   * Get per-batch consignment range compliance for a supplier payable view
   */
  getRangeCompliance: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(rangeComplianceSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const rows = await db
        .select({
          batchId: vendorPayables.batchId,
          productName: products.nameCanonical,
          batchCode: batches.code,
          payableCogsPerUnit: vendorPayables.cogsPerUnit,
          payableAmountDue: vendorPayables.amountDue,
          agreedRangeMinFromLines: sql<
            string | number | null
          >`MIN(CAST(${orderLineItems.originalRangeMin} AS DECIMAL(15,4)))`,
          agreedRangeMaxFromLines: sql<
            string | number | null
          >`MAX(CAST(${orderLineItems.originalRangeMax} AS DECIMAL(15,4)))`,
          actualAvgSalePrice: sql<
            string | number
          >`COALESCE(AVG(CAST(${orderLineItems.unitPrice} AS DECIMAL(15,2))), 0)`,
          unitsSold: sql<
            string | number
          >`COALESCE(SUM(CAST(${orderLineItems.quantity} AS DECIMAL(15,2))), 0)`,
          belowRangeFlagCount: sql<number>`COALESCE(SUM(CASE WHEN ${orderLineItems.isBelowVendorRange} = TRUE THEN 1 ELSE 0 END), 0)`,
          belowRangeReason: sql<
            string | null
          >`MIN(CASE WHEN ${orderLineItems.isBelowVendorRange} = TRUE AND ${orderLineItems.belowRangeReason} IS NOT NULL AND ${orderLineItems.belowRangeReason} <> '' THEN ${orderLineItems.belowRangeReason} ELSE NULL END)`,
        })
        .from(vendorPayables)
        .leftJoin(
          orderLineItems,
          eq(orderLineItems.batchId, vendorPayables.batchId)
        )
        .leftJoin(batches, eq(vendorPayables.batchId, batches.id))
        .leftJoin(products, eq(batches.productId, products.id))
        .where(
          and(
            eq(vendorPayables.vendorClientId, input.vendorClientId),
            isNull(vendorPayables.deletedAt)
          )
        )
        .groupBy(
          vendorPayables.batchId,
          products.nameCanonical,
          batches.code,
          vendorPayables.cogsPerUnit,
          vendorPayables.amountDue
        )
        .orderBy(products.nameCanonical, batches.code);

      const items = rows.map(row => {
        // Captured line-item ranges are the primary source; payable COGS is the fallback.
        const agreedRangeMin =
          parseNullableNumber(row.agreedRangeMinFromLines) ??
          parseNumber(row.payableCogsPerUnit);
        const agreedRangeMax =
          parseNullableNumber(row.agreedRangeMaxFromLines) ?? agreedRangeMin;
        const actualAvgSalePrice = parseNumber(row.actualAvgSalePrice);
        const unitsSold = parseNumber(row.unitsSold);
        const isBelowVendorRange = Number(row.belowRangeFlagCount ?? 0) > 0;

        let rangeComplianceStatus: RangeComplianceStatus = "IN_RANGE";
        if (isBelowVendorRange) {
          rangeComplianceStatus = "BELOW_RANGE";
        } else if (
          agreedRangeMax !== null &&
          actualAvgSalePrice > agreedRangeMax
        ) {
          rangeComplianceStatus = "ABOVE_RANGE";
        }

        return {
          batchId: row.batchId,
          productName: row.productName ?? "Unknown Product",
          batchCode: row.batchCode ?? "Unknown Batch",
          agreedRangeMin,
          agreedRangeMax,
          actualAvgSalePrice,
          unitsSold,
          isBelowVendorRange,
          belowRangeReason: row.belowRangeReason,
          payableAmountDue: parseNumber(row.payableAmountDue),
          rangeComplianceStatus,
        };
      });

      const summary = items.reduce(
        (acc, item) => {
          acc.totalBatchCount += 1;
          acc.totalUnitsSold += item.unitsSold;

          if (item.rangeComplianceStatus === "IN_RANGE") {
            acc.inRangeCount += 1;
            acc.inRangeUnitsSold += item.unitsSold;
          } else {
            acc.outOfRangeCount += 1;
            acc.outOfRangeUnitsSold += item.unitsSold;
          }

          if (item.rangeComplianceStatus === "BELOW_RANGE") {
            acc.belowRangeCount += 1;
            acc.belowRangeUnitsSold += item.unitsSold;
          }

          return acc;
        },
        {
          totalBatchCount: 0,
          inRangeCount: 0,
          outOfRangeCount: 0,
          belowRangeCount: 0,
          totalUnitsSold: 0,
          inRangeUnitsSold: 0,
          outOfRangeUnitsSold: 0,
          belowRangeUnitsSold: 0,
        }
      );

      return {
        items,
        summary,
      };
    }),

  /**
   * Get notification history for a payable
   */
  getNotifications: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ payableId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const notifications = await db
        .select({
          notification: payableNotifications,
          sentToUserName: users.name,
        })
        .from(payableNotifications)
        .leftJoin(users, eq(payableNotifications.sentToUserId, users.id))
        .where(eq(payableNotifications.payableId, input.payableId))
        .orderBy(desc(payableNotifications.sentAt));

      return notifications.map(n => ({
        ...n.notification,
        sentToUserName:
          n.sentToUserName ||
          "Role: " + (n.notification.sentToRole || "Unknown"),
      }));
    }),

  /**
   * Get office-owned inventory value (MEET-006)
   */
  getOfficeOwnedInventoryValue: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      return payablesService.getOfficeOwnedInventoryValue();
    }),

  /**
   * Trigger overdue notifications (admin/cron)
   */
  sendOverdueNotifications: protectedProcedure
    .use(requirePermission("admin"))
    .mutation(async () => {
      const count = await payablesService.sendOverdueNotifications();
      return { notificationsSent: count };
    }),
});
