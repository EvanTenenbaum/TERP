/**
 * Returns Router
 * API endpoints for order return processing
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { returns, batches, inventoryMovements } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

export const returnsRouter = router({
  // Get all returns
  getAll: publicProcedure
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
      if (!db) throw new Error("Database not available");

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
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [returnRecord] = await db
      .select()
      .from(returns)
      .where(eq(returns.id, input.id));

    if (!returnRecord) {
      throw new Error("Return not found");
    }

    return returnRecord;
  }),

  // Process a return
  create: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        items: z.array(
          z.object({
            batchId: z.number(),
            quantity: z.string(),
            reason: z.string().optional(),
          })
        ),
        reason: z.enum(["DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED", "CUSTOMER_CHANGED_MIND", "OTHER"]),
        notes: z.string().optional(),
        restockInventory: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Wrap in transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Get authenticated user ID
        const userId = ctx.user?.id;
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Create return record
        const [returnRecord] = await tx.insert(returns).values({
          orderId: input.orderId,
          items: input.items as any,
          reason: input.reason,
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
              movementType: "RETURN",
              quantityChange: `+${returnQty}`,
              quantityBefore: currentQty.toString(),
              quantityAfter: newQty.toString(),
              referenceType: "RETURN",
              referenceId: returnRecord.insertId,
              notes: item.reason || input.notes,
              performedBy: userId,
            });
          }
        }

        return { id: returnRecord.insertId };
      });

      return result;
    }),

  // Get returns by order
  getByOrder: publicProcedure.input(z.object({ orderId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db
      .select()
      .from(returns)
      .where(eq(returns.orderId, input.orderId))
      .orderBy(desc(returns.processedAt));
  }),

  // Get return statistics
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const stats = await db
      .select({
        totalReturns: sql<number>`COUNT(*)`,
        defectiveCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'DEFECTIVE' THEN 1 ELSE 0 END)`,
        wrongItemCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'WRONG_ITEM' THEN 1 ELSE 0 END)`,
        notAsDescribedCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'NOT_AS_DESCRIBED' THEN 1 ELSE 0 END)`,
        customerChangedMindCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'CUSTOMER_CHANGED_MIND' THEN 1 ELSE 0 END)`,
        otherCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'OTHER' THEN 1 ELSE 0 END)`,
      })
      .from(returns);

    return stats[0] || {
      totalReturns: 0,
      defectiveCount: 0,
      wrongItemCount: 0,
      notAsDescribedCount: 0,
      customerChangedMindCount: 0,
      otherCount: 0,
    };
  }),
});
