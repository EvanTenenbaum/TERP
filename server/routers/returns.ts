/**
 * Returns Router
 * API endpoints for order return processing
 *
 * Wave 5C Enhancement: Full returns workflow with approval, receiving, and processing stages
 * Includes credit issuance integration
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  returns,
  batches,
  inventoryMovements,
  clients,
  orders,
} from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";
import { logger } from "../_core/logger";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { TRPCError } from "@trpc/server";
import * as creditsDb from "../creditsDb";

// Extended return reason enum for API input (includes values that map to database values)
const returnReasonInputEnum = z.enum([
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "CUSTOMER_CHANGED_MIND",
  "DAMAGED_IN_TRANSIT", // Maps to DEFECTIVE
  "QUALITY_ISSUE", // Maps to DEFECTIVE
  "OTHER",
]);

// Database-compatible return reason type
type DbReturnReason =
  | "DEFECTIVE"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "CUSTOMER_CHANGED_MIND"
  | "OTHER";

// Map extended reasons to database-compatible values
function mapReturnReason(
  reason: z.infer<typeof returnReasonInputEnum>
): DbReturnReason {
  switch (reason) {
    case "DAMAGED_IN_TRANSIT":
    case "QUALITY_ISSUE":
      return "DEFECTIVE";
    default:
      return reason;
  }
}

// Return item condition enum
const itemConditionEnum = z.enum([
  "SELLABLE",
  "DAMAGED",
  "DESTROYED",
  "QUARANTINE",
]);

// Return status enum
const returnStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "PROCESSED",
  "CANCELLED",
]);

// Return item schema for creating returns
const returnItemSchema = z.object({
  batchId: z.number(),
  quantity: z.string(),
  reason: z.string().optional(),
  expectedCondition: itemConditionEnum.optional(),
});

export const returnsRouter = router({
  // List returns with filtering and pagination
  list: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        status: returnStatusEnum.optional(),
        orderId: z.number().optional(),
        clientId: z.number().optional(),
        searchTerm: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      logger.info({ msg: "[Returns] Listing returns", filters: input });

      const conditions = [];

      if (input.orderId) {
        conditions.push(eq(returns.orderId, input.orderId));
      }
      // Note: status and clientId filtering would require schema changes
      // For now, we'll fetch all and filter in-memory for status if provided

      let query = db
        .select({
          id: returns.id,
          orderId: returns.orderId,
          items: returns.items,
          returnReason: returns.returnReason,
          notes: returns.notes,
          processedBy: returns.processedBy,
          processedAt: returns.processedAt,
        })
        .from(returns);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      query = query.orderBy(desc(returns.processedAt)) as typeof query;
      query = query.limit(input.limit).offset(input.offset) as typeof query;

      const returnList = await query;

      // Get total count
      const countConditions =
        conditions.length > 0 ? and(...conditions) : undefined;
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(returns)
        .where(countConditions);

      return createSafeUnifiedResponse(
        returnList,
        Number(countResult[0]?.count || 0),
        input.limit,
        input.offset
      );
    }),

  // Get all returns (legacy endpoint)
  getAll: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z
        .object({
          orderId: z.number().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

      let query = db
        .select()
        .from(returns)
        .orderBy(desc(returns.processedAt))
        .limit(limit)
        .offset(offset);

      if (input?.orderId) {
        query = query.where(eq(returns.orderId, input.orderId)) as typeof query;
      }

      return await query;
    }),

  // Get return by ID
  getById: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // Get order details
      const [order] = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          clientId: orders.clientId,
          total: orders.total,
        })
        .from(orders)
        .where(eq(orders.id, returnRecord.orderId));

      // Get client details if order exists
      let client = null;
      if (order?.clientId) {
        const [clientResult] = await db
          .select({
            id: clients.id,
            name: clients.name,
          })
          .from(clients)
          .where(eq(clients.id, order.clientId));
        client = clientResult;
      }

      return {
        ...returnRecord,
        order,
        client,
      };
    }),

  // Create a return request
  create: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        items: z.array(returnItemSchema).min(1),
        reason: returnReasonInputEnum,
        notes: z.string().optional(),
        restockInventory: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      logger.info({
        msg: "[Returns] Creating return",
        orderId: input.orderId,
        itemCount: input.items.length,
      });

      // Wrap in transaction to ensure atomicity
      const result = await db.transaction(async tx => {
        // Get authenticated user ID
        const userId = ctx.user?.id;
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Verify order exists
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId));

        if (!order) {
          throw new Error("Order not found");
        }

        // Create return record - map extended reasons to database-compatible values
        const mappedReason = mapReturnReason(input.reason);
        const [returnRecord] = await tx.insert(returns).values({
          orderId: input.orderId,
          items: input.items as unknown,
          returnReason: mappedReason,
          notes: input.notes,
          processedBy: userId,
        });

        // If restocking inventory, create inventory movements
        if (input.restockInventory) {
          for (const item of input.items) {
            // Get current batch quantity
            const [batch] = await tx
              .select()
              .from(batches)
              .where(eq(batches.id, item.batchId))
              .for("update"); // Row-level lock

            if (!batch) {
              throw new Error(`Batch ${item.batchId} not found`);
            }

            const currentQty = parseFloat(batch.onHandQty || "0");
            const returnQty = parseFloat(item.quantity);
            const newQty = currentQty + returnQty;

            // Update batch quantity
            await tx
              .update(batches)
              .set({ onHandQty: newQty.toString() })
              .where(eq(batches.id, item.batchId));

            // Record inventory movement
            await tx.insert(inventoryMovements).values({
              batchId: item.batchId,
              inventoryMovementType: "RETURN",
              quantityChange: `+${returnQty}`,
              quantityBefore: currentQty.toString(),
              quantityAfter: newQty.toString(),
              referenceType: "RETURN",
              referenceId: returnRecord.insertId,
              reason: item.reason || input.notes,
              performedBy: userId,
            });
          }
        }

        logger.info({
          msg: "[Returns] Return created",
          returnId: returnRecord.insertId,
        });

        return { id: returnRecord.insertId };
      });

      return result;
    }),

  // Approve a return (updates status from PENDING to APPROVED)
  approve: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        approvalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      logger.info({ msg: "[Returns] Approving return", returnId: input.id });

      // Get the return
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // Update notes with approval info
      const updatedNotes = [
        returnRecord.notes,
        `[APPROVED by User #${userId} at ${new Date().toISOString()}]`,
        input.approvalNotes ? `Approval notes: ${input.approvalNotes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      // Update the return record (note: current schema doesn't have status field)
      // For now, we append to notes as a workaround
      await db
        .update(returns)
        .set({ notes: updatedNotes })
        .where(eq(returns.id, input.id));

      logger.info({ msg: "[Returns] Return approved", returnId: input.id });

      return { success: true, returnId: input.id };
    }),

  // Reject a return
  reject: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        rejectionReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      logger.info({ msg: "[Returns] Rejecting return", returnId: input.id });

      // Get the return
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // Update notes with rejection info
      const updatedNotes = [
        returnRecord.notes,
        `[REJECTED by User #${userId} at ${new Date().toISOString()}]`,
        `Rejection reason: ${input.rejectionReason}`,
      ]
        .filter(Boolean)
        .join(" | ");

      await db
        .update(returns)
        .set({ notes: updatedNotes })
        .where(eq(returns.id, input.id));

      logger.info({ msg: "[Returns] Return rejected", returnId: input.id });

      return { success: true, returnId: input.id };
    }),

  // Receive items from a return
  receive: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        receivedItems: z.array(
          z.object({
            batchId: z.number(),
            receivedQuantity: z.string(),
            actualCondition: itemConditionEnum,
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      logger.info({
        msg: "[Returns] Receiving return items",
        returnId: input.id,
      });

      // Get the return
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // Process each received item
      await db.transaction(async tx => {
        for (const item of input.receivedItems) {
          const receivedQty = parseFloat(item.receivedQuantity);

          // If sellable, ensure inventory was restored
          if (item.actualCondition === "SELLABLE" && receivedQty > 0) {
            // Get current batch quantity
            const [batch] = await tx
              .select()
              .from(batches)
              .where(eq(batches.id, item.batchId))
              .for("update");

            if (batch) {
              const currentQty = parseFloat(batch.onHandQty || "0");

              // Record inventory movement for condition verification
              await tx.insert(inventoryMovements).values({
                batchId: item.batchId,
                inventoryMovementType: "ADJUSTMENT",
                quantityChange: "0",
                quantityBefore: currentQty.toString(),
                quantityAfter: currentQty.toString(),
                referenceType: "RETURN_RECEIVE",
                referenceId: input.id,
                reason: `Return received - Condition: ${item.actualCondition}. ${item.notes || ""}`,
                performedBy: userId,
              });

              logger.info({
                msg: "[Returns] Item received",
                returnId: input.id,
                batchId: item.batchId,
                condition: item.actualCondition,
              });
            }
          } else if (
            item.actualCondition === "DAMAGED" ||
            item.actualCondition === "DESTROYED"
          ) {
            // For damaged/destroyed items, reverse the inventory if it was previously restored
            const [batch] = await tx
              .select()
              .from(batches)
              .where(eq(batches.id, item.batchId))
              .for("update");

            if (batch) {
              const currentQty = parseFloat(batch.onHandQty || "0");
              const newQty = Math.max(0, currentQty - receivedQty);

              await tx
                .update(batches)
                .set({ onHandQty: newQty.toString() })
                .where(eq(batches.id, item.batchId));

              await tx.insert(inventoryMovements).values({
                batchId: item.batchId,
                inventoryMovementType: "DISPOSAL",
                quantityChange: `-${receivedQty}`,
                quantityBefore: currentQty.toString(),
                quantityAfter: newQty.toString(),
                referenceType: "RETURN_RECEIVE",
                referenceId: input.id,
                reason: `Return received - Item ${item.actualCondition.toLowerCase()}. ${item.notes || ""}`,
                performedBy: userId,
              });

              logger.info({
                msg: "[Returns] Damaged item - inventory adjusted",
                returnId: input.id,
                batchId: item.batchId,
                quantityRemoved: receivedQty,
              });
            }
          }
        }

        // Update return notes with receiving info
        const receivingDetails = input.receivedItems
          .map(
            item =>
              `Batch #${item.batchId}: ${item.receivedQuantity} units (${item.actualCondition})`
          )
          .join(", ");

        const updatedNotes = [
          returnRecord.notes,
          `[RECEIVED by User #${userId} at ${new Date().toISOString()}]`,
          `Received items: ${receivingDetails}`,
        ]
          .filter(Boolean)
          .join(" | ");

        await tx
          .update(returns)
          .set({ notes: updatedNotes })
          .where(eq(returns.id, input.id));
      });

      logger.info({
        msg: "[Returns] Return items received",
        returnId: input.id,
      });

      return { success: true, returnId: input.id };
    }),

  // Process a return and optionally issue credit
  process: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        issueCredit: z.boolean().default(true),
        creditAmount: z.number().optional(),
        creditNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      logger.info({
        msg: "[Returns] Processing return",
        returnId: input.id,
        issueCredit: input.issueCredit,
      });

      // Get the return with order details
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // Get order to find client
      const [order] = await db
        .select({
          id: orders.id,
          clientId: orders.clientId,
          total: orders.total,
        })
        .from(orders)
        .where(eq(orders.id, returnRecord.orderId));

      if (!order) {
        throw new Error("Order not found for this return");
      }

      if (!order.clientId) {
        throw new Error("Order has no client associated");
      }

      let creditId: number | null = null;

      // Issue credit if requested
      if (input.issueCredit) {
        // Calculate credit amount based on returned items
        let calculatedAmount = input.creditAmount;

        if (!calculatedAmount) {
          // Calculate from items - this is a simplified calculation
          const items = returnRecord.items as Array<{ quantity: string }>;
          const totalQty = items.reduce(
            (sum, item) => sum + parseFloat(item.quantity || "0"),
            0
          );
          const orderTotal = parseFloat(order.total || "0");
          // Proportional calculation (simplified)
          calculatedAmount =
            orderTotal > 0 ? Math.min(orderTotal, totalQty * 10) : 0;
        }

        if (calculatedAmount > 0) {
          // Generate credit number
          const creditNumber = await creditsDb.generateCreditNumber();

          // Create the credit
          const credit = await creditsDb.createCredit({
            creditNumber,
            clientId: order.clientId,
            creditAmount: calculatedAmount.toFixed(2),
            amountRemaining: calculatedAmount.toFixed(2),
            amountUsed: "0",
            creditReason: "RETURN",
            notes: input.creditNotes || `Credit for return #${input.id}`,
            createdBy: userId,
            creditStatus: "ACTIVE",
          });

          creditId = credit.id;

          logger.info({
            msg: "[Returns] Credit issued for return",
            returnId: input.id,
            creditId: credit.id,
            creditAmount: calculatedAmount,
          });
        }
      }

      // Update return notes with processing info
      const updatedNotes = [
        returnRecord.notes,
        `[PROCESSED by User #${userId} at ${new Date().toISOString()}]`,
        creditId ? `Credit issued: Credit #${creditId}` : "No credit issued",
        input.creditNotes,
      ]
        .filter(Boolean)
        .join(" | ");

      await db
        .update(returns)
        .set({ notes: updatedNotes })
        .where(eq(returns.id, input.id));

      logger.info({
        msg: "[Returns] Return processed",
        returnId: input.id,
        creditId,
      });

      return {
        success: true,
        returnId: input.id,
        creditId,
      };
    }),

  // Get returns by order
  getByOrder: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      return await db
        .select()
        .from(returns)
        .where(eq(returns.orderId, input.orderId))
        .orderBy(desc(returns.processedAt));
    }),

  // Get return statistics
  getStats: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const stats = await db
      .select({
        totalReturns: sql<number>`COUNT(*)`,
        defectiveCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'DEFECTIVE' THEN 1 ELSE 0 END)`,
        wrongItemCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'WRONG_ITEM' THEN 1 ELSE 0 END)`,
        notAsDescribedCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'NOT_AS_DESCRIBED' THEN 1 ELSE 0 END)`,
        customerChangedMindCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'CUSTOMER_CHANGED_MIND' THEN 1 ELSE 0 END)`,
        damagedInTransitCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'DAMAGED_IN_TRANSIT' THEN 1 ELSE 0 END)`,
        qualityIssueCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'QUALITY_ISSUE' THEN 1 ELSE 0 END)`,
        otherCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'OTHER' THEN 1 ELSE 0 END)`,
      })
      .from(returns);

    // Get returns by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await db
      .select({
        month: sql<string>`DATE_FORMAT(${returns.processedAt}, '%Y-%m')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(returns)
      .where(sql`${returns.processedAt} >= ${sixMonthsAgo}`)
      .groupBy(sql`DATE_FORMAT(${returns.processedAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${returns.processedAt}, '%Y-%m')`);

    return {
      totalReturns: Number(stats[0]?.totalReturns || 0),
      defectiveCount: Number(stats[0]?.defectiveCount || 0),
      wrongItemCount: Number(stats[0]?.wrongItemCount || 0),
      notAsDescribedCount: Number(stats[0]?.notAsDescribedCount || 0),
      customerChangedMindCount: Number(stats[0]?.customerChangedMindCount || 0),
      damagedInTransitCount: Number(stats[0]?.damagedInTransitCount || 0),
      qualityIssueCount: Number(stats[0]?.qualityIssueCount || 0),
      otherCount: Number(stats[0]?.otherCount || 0),
      byReason: {
        DEFECTIVE: Number(stats[0]?.defectiveCount || 0),
        WRONG_ITEM: Number(stats[0]?.wrongItemCount || 0),
        NOT_AS_DESCRIBED: Number(stats[0]?.notAsDescribedCount || 0),
        CUSTOMER_CHANGED_MIND: Number(stats[0]?.customerChangedMindCount || 0),
        DAMAGED_IN_TRANSIT: Number(stats[0]?.damagedInTransitCount || 0),
        QUALITY_ISSUE: Number(stats[0]?.qualityIssueCount || 0),
        OTHER: Number(stats[0]?.otherCount || 0),
      },
      monthly: monthlyStats.map(m => ({
        month: m.month,
        count: Number(m.count),
      })),
    };
  }),

  // Get returns summary for dashboard
  getSummary: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      logger.info({ msg: "[Returns] Getting returns summary" });

      // Get total counts
      const [totalCounts] = await db
        .select({
          totalReturns: sql<number>`COUNT(*)`,
        })
        .from(returns);

      // Get returns from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [recentCounts] = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(returns)
        .where(sql`${returns.processedAt} >= ${thirtyDaysAgo}`);

      // Get top return reasons
      const topReasons = await db
        .select({
          reason: returns.returnReason,
          count: sql<number>`COUNT(*)`,
        })
        .from(returns)
        .groupBy(returns.returnReason)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(5);

      return {
        totalReturns: Number(totalCounts?.totalReturns || 0),
        returnsLast30Days: Number(recentCounts?.count || 0),
        topReasons: topReasons.map(r => ({
          reason: r.reason,
          count: Number(r.count),
        })),
      };
    }),
});
