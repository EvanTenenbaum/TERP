/**
 * Transaction Fees Router (MEET-018)
 * Sprint 5 Track D.2: Transaction Fee Per Client
 *
 * Configurable transaction fees:
 * - Fee percentage or flat amount per client
 * - Apply fee on orders automatically
 * - Override option per order
 * - Fee tracking in reports
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

import { clients, orders } from "../../drizzle/schema";
import {
  clientTransactionFees,
  orderTransactionFees,
} from "../../drizzle/schema-sprint5-trackd";
import { eq, and, sql, isNull, desc } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Input Schemas
// ============================================================================

const setClientFeeSchema = z.object({
  clientId: z.number(),
  feeType: z.enum(["PERCENTAGE", "FLAT"]),
  feeValue: z.number().min(0),
  minFee: z.number().min(0).optional(),
  maxFee: z.number().min(0).optional(),
  applyToAllOrders: z.boolean().default(true),
  notes: z.string().optional(),
});

const applyOrderFeeSchema = z.object({
  orderId: z.number(),
  override: z.boolean().default(false),
  overrideReason: z.string().optional(),
  customFeeAmount: z.number().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

function calculateFee(
  feeType: "PERCENTAGE" | "FLAT",
  feeValue: number,
  orderSubtotal: number,
  minFee?: number | null,
  maxFee?: number | null
): number {
  let fee: number;

  if (feeType === "PERCENTAGE") {
    fee = orderSubtotal * (feeValue / 100);
  } else {
    fee = feeValue;
  }

  // Apply min/max limits
  if (minFee !== null && minFee !== undefined && fee < minFee) {
    fee = minFee;
  }
  if (maxFee !== null && maxFee !== undefined && fee > maxFee) {
    fee = maxFee;
  }

  return Math.round(fee * 100) / 100; // Round to 2 decimal places
}

// ============================================================================
// Router
// ============================================================================

export const transactionFeesRouter = router({
  /**
   * Get client fee configuration
   */
  getClientFee: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [fee] = await db
        .select()
        .from(clientTransactionFees)
        .where(
          and(
            eq(clientTransactionFees.clientId, input.clientId),
            isNull(clientTransactionFees.deletedAt)
          )
        )
        .limit(1);

      return fee || null;
    }),

  /**
   * Set or update client fee configuration
   */
  setClientFee: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(setClientFeeSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Check if client exists
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Check if config already exists
      const [existing] = await db
        .select()
        .from(clientTransactionFees)
        .where(eq(clientTransactionFees.clientId, input.clientId))
        .limit(1);

      if (existing) {
        // Update existing
        await db
          .update(clientTransactionFees)
          .set({
            feeType: input.feeType,
            feeValue: input.feeValue.toFixed(4),
            minFee: input.minFee?.toFixed(2) || null,
            maxFee: input.maxFee?.toFixed(2) || null,
            applyToAllOrders: input.applyToAllOrders,
            notes: input.notes,
            deletedAt: null, // Restore if was deleted
          })
          .where(eq(clientTransactionFees.id, existing.id));

        logger.info({
          msg: "[TransactionFees] Updated client fee config",
          clientId: input.clientId,
          feeType: input.feeType,
          feeValue: input.feeValue,
          userId,
        });

        return { id: existing.id, updated: true };
      } else {
        // Create new
        const result = await db.insert(clientTransactionFees).values({
          clientId: input.clientId,
          feeType: input.feeType,
          feeValue: input.feeValue.toFixed(4),
          minFee: input.minFee?.toFixed(2),
          maxFee: input.maxFee?.toFixed(2),
          applyToAllOrders: input.applyToAllOrders,
          notes: input.notes,
          createdBy: userId,
        });

        logger.info({
          msg: "[TransactionFees] Created client fee config",
          clientId: input.clientId,
          feeType: input.feeType,
          feeValue: input.feeValue,
          userId,
        });

        return { id: Number(result[0].insertId), updated: false };
      }
    }),

  /**
   * Remove client fee configuration
   */
  removeClientFee: protectedProcedure
    .use(requirePermission("clients:delete"))
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(clientTransactionFees)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(clientTransactionFees.clientId, input.clientId));

      return { success: true };
    }),

  /**
   * Calculate fee for an order (preview)
   */
  calculateOrderFee: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number(),
        orderSubtotal: z.number().positive(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [feeConfig] = await db
        .select()
        .from(clientTransactionFees)
        .where(
          and(
            eq(clientTransactionFees.clientId, input.clientId),
            eq(clientTransactionFees.isActive, true),
            isNull(clientTransactionFees.deletedAt)
          )
        )
        .limit(1);

      if (!feeConfig) {
        return {
          hasFee: false,
          feeAmount: 0,
          feeType: null,
          feeRate: 0,
        };
      }

      const feeAmount = calculateFee(
        feeConfig.feeType as "PERCENTAGE" | "FLAT",
        parseFloat(feeConfig.feeValue || "0"),
        input.orderSubtotal,
        feeConfig.minFee ? parseFloat(feeConfig.minFee) : null,
        feeConfig.maxFee ? parseFloat(feeConfig.maxFee) : null
      );

      return {
        hasFee: true,
        feeAmount,
        feeType: feeConfig.feeType,
        feeRate: parseFloat(feeConfig.feeValue || "0"),
        minFee: feeConfig.minFee ? parseFloat(feeConfig.minFee) : null,
        maxFee: feeConfig.maxFee ? parseFloat(feeConfig.maxFee) : null,
      };
    }),

  /**
   * Apply fee to order
   */
  applyToOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(applyOrderFeeSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Get order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Get client fee config
      const [feeConfig] = await db
        .select()
        .from(clientTransactionFees)
        .where(
          and(
            eq(clientTransactionFees.clientId, order.clientId),
            eq(clientTransactionFees.isActive, true),
            isNull(clientTransactionFees.deletedAt)
          )
        )
        .limit(1);

      const orderSubtotal = parseFloat(order.subtotal || "0");
      let feeAmount: number;
      let feeType: "PERCENTAGE" | "FLAT";
      let feeRate: number;

      if (input.override && input.customFeeAmount !== undefined) {
        // Use custom fee
        feeAmount = input.customFeeAmount;
        feeType = "FLAT";
        feeRate = input.customFeeAmount;
      } else if (feeConfig) {
        // Calculate from config
        feeType = feeConfig.feeType as "PERCENTAGE" | "FLAT";
        feeRate = parseFloat(feeConfig.feeValue || "0");
        feeAmount = calculateFee(
          feeType,
          feeRate,
          orderSubtotal,
          feeConfig.minFee ? parseFloat(feeConfig.minFee) : null,
          feeConfig.maxFee ? parseFloat(feeConfig.maxFee) : null
        );
      } else {
        return { success: true, feeApplied: false, feeAmount: 0 };
      }

      // Check if fee already exists for this order
      const [existingFee] = await db
        .select()
        .from(orderTransactionFees)
        .where(eq(orderTransactionFees.orderId, input.orderId))
        .limit(1);

      if (existingFee) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fee already applied to this order",
        });
      }

      // Insert fee record
      await db.insert(orderTransactionFees).values({
        orderId: input.orderId,
        clientFeeConfigId: feeConfig?.id || null,
        feeType,
        feeRate: feeRate.toFixed(4),
        orderSubtotal: orderSubtotal.toFixed(2),
        feeAmount: feeAmount.toFixed(2),
        isOverridden: input.override,
        overrideReason: input.overrideReason,
        overriddenBy: input.override ? userId : null,
      });

      logger.info({
        msg: "[TransactionFees] Applied fee to order",
        orderId: input.orderId,
        feeAmount,
        isOverride: input.override,
        userId,
      });

      return {
        success: true,
        feeApplied: true,
        feeAmount,
        feeType,
        feeRate,
      };
    }),

  /**
   * Get order fee
   */
  getOrderFee: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [fee] = await db
        .select()
        .from(orderTransactionFees)
        .where(eq(orderTransactionFees.orderId, input.orderId))
        .limit(1);

      return fee || null;
    }),

  /**
   * List all client fee configurations
   */
  listClientFees: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        onlyActive: z.boolean().default(true),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [isNull(clientTransactionFees.deletedAt)];

      if (input.onlyActive) {
        conditions.push(eq(clientTransactionFees.isActive, true));
      }

      const results = await db
        .select({
          fee: clientTransactionFees,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(clientTransactionFees)
        .leftJoin(clients, eq(clientTransactionFees.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(clientTransactionFees.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(clientTransactionFees)
        .where(and(...conditions));

      return {
        items: results.map(r => ({
          ...r.fee,
          client: r.client,
        })),
        total: Number(countResult[0]?.count || 0),
      };
    }),

  /**
   * Get fee revenue report
   */
  getFeeReport: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        clientId: z.number().optional(),
      })
    )
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const query = sql`
        SELECT
          COUNT(*) as total_orders,
          SUM(fee_amount) as total_fees,
          AVG(fee_amount) as avg_fee,
          fee_type,
          COUNT(CASE WHEN is_overridden = 1 THEN 1 END) as override_count
        FROM order_transaction_fees
        WHERE 1=1
      `;

      const result = await db.execute(query);
      const rows = result[0] as unknown as {
        total_orders?: number;
        total_fees?: string;
        avg_fee?: string;
        override_count?: number;
      }[];

      return {
        totalOrders: Number(rows?.[0]?.total_orders || 0),
        totalFees: parseFloat(String(rows?.[0]?.total_fees || "0")),
        avgFee: parseFloat(String(rows?.[0]?.avg_fee || "0")),
        overrideCount: Number(rows?.[0]?.override_count || 0),
      };
    }),
});
