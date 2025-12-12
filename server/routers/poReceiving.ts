/**
 * PO Receiving Router
 * API endpoints for receiving purchase orders and updating inventory
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { purchaseOrders, purchaseOrderItems, batches, inventoryMovements, intakeSessions } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

export const poReceivingRouter = router({
  // Receive a purchase order (create intake session and update inventory)
  receive: publicProcedure
    .input(
      z.object({
        poId: z.number(),
        receivedItems: z.array(
          z.object({
            poItemId: z.number(),
            receivedQuantity: z.string(),
            batchId: z.number().optional(), // If receiving into existing batch
            newBatchData: z
              .object({
                // If creating new batch
                productId: z.number(),
                lotCode: z.string(),
                costPerUnit: z.string(),
              })
              .optional(),
          })
        ),
        receivedBy: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error('Database not available');
      
      // Wrap in transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Verify PO exists
        const [po] = await tx
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, input.poId))
          .for("update");

        if (!po) {
          throw new Error("Purchase order not found");
        }

        // Create intake session for this receipt
        const [intakeSession] = await tx.insert(intakeSessions).values({
          vendorId: po.vendorId,
          sessionDate: new Date(),
          status: "COMPLETED",
          notes: input.notes || `Receiving PO #${po.poNumber}`,
          createdBy: input.receivedBy,
        });

        const intakeSessionId = intakeSession.insertId;

        // Process each received item
        for (const item of input.receivedItems) {
          let batchId = item.batchId;

          // Create new batch if needed
          if (!batchId && item.newBatchData) {
            const [newBatch] = await tx.insert(batches).values({
              productId: item.newBatchData.productId,
              lotCode: item.newBatchData.lotCode,
              onHandQty: item.receivedQuantity,
              costPerUnit: item.newBatchData.costPerUnit,
              intakeSessionId,
            });
            batchId = newBatch.insertId;
          } else if (batchId) {
            // Update existing batch quantity
            const [batch] = await tx
              .select()
              .from(batches)
              .where(eq(batches.id, batchId))
              .for("update");

            if (!batch) {
              throw new Error(`Batch ${batchId} not found`);
            }

            const currentQty = parseFloat(batch.onHandQty || "0");
            const receivedQty = parseFloat(item.receivedQuantity);
            const newQty = currentQty + receivedQty;

            await tx
              .update(batches)
              .set({ onHandQty: newQty.toString() })
              .where(eq(batches.id, batchId));

            // Record inventory movement
            await tx.insert(inventoryMovements).values({
              batchId,
              movementType: "INTAKE",
              quantityChange: `+${receivedQty}`,
              quantityBefore: currentQty.toString(),
              quantityAfter: newQty.toString(),
              referenceType: "PO_RECEIPT",
              referenceId: input.poId,
              notes: `Received from PO #${po.poNumber}`,
              performedBy: input.receivedBy,
            });
          }

          // Update PO item received quantity
          const [poItem] = await tx
            .select()
            .from(purchaseOrderItems)
            .where(eq(purchaseOrderItems.id, item.poItemId));

          if (poItem) {
            const currentReceived = parseFloat(poItem.quantityReceived || "0");
            const newReceived = currentReceived + parseFloat(item.receivedQuantity);

            await tx
              .update(purchaseOrderItems)
              .set({ quantityReceived: newReceived.toString() })
              .where(eq(purchaseOrderItems.id, item.poItemId));
          }
        }

        // Update PO status to RECEIVED if all items received
        const [poItems] = await tx
          .select({
            allReceived: sql<number>`
              SUM(CASE 
                WHEN CAST(${purchaseOrderItems.quantityReceived} AS DECIMAL(15,4)) >= CAST(${purchaseOrderItems.quantityOrdered} AS DECIMAL(15,4)) 
                THEN 1 
                ELSE 0 
              END) = COUNT(*)
            `,
          })
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, input.poId));

        if (poItems && poItems.allReceived) {
          await tx
            .update(purchaseOrders)
            .set({ purchaseOrderStatus: "RECEIVED" })
            .where(eq(purchaseOrders.id, input.poId));
        } else {
          // Partially received
          await tx
            .update(purchaseOrders)
            .set({ purchaseOrderStatus: "RECEIVING" })
            .where(eq(purchaseOrders.id, input.poId));
        }

        return { intakeSessionId, success: true };
      });

      return result;
    }),

  // Get receiving history for a PO
  getReceivingHistory: publicProcedure
    .input(z.object({ poId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const history = await db
        .select()
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.referenceType, "PO_RECEIPT"),
            eq(inventoryMovements.referenceId, input.poId)
          )
        )
        .orderBy(desc(inventoryMovements.createdAt));

      return history;
    }),

  // Get PO items with received quantities
  getPOItemsWithReceipts: publicProcedure
    .input(z.object({ poId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const items = await db
        .select({
          id: purchaseOrderItems.id,
          productId: purchaseOrderItems.productId,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: purchaseOrderItems.quantityReceived,
          unitCost: purchaseOrderItems.unitCost,
          remainingQuantity: sql<string>`
            CAST(${purchaseOrderItems.quantityOrdered} AS DECIMAL(15,4)) - 
            COALESCE(CAST(${purchaseOrderItems.quantityReceived} AS DECIMAL(15,4)), 0)
          `,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, input.poId));

      return items;
    }),

  // Get receiving statistics
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const stats = await db
      .select({
        totalReceipts: sql<number>`COUNT(DISTINCT ${inventoryMovements.referenceId})`,
        recentReceipts: sql<number>`
          COUNT(DISTINCT CASE 
            WHEN ${inventoryMovements.createdAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
            THEN ${inventoryMovements.referenceId} 
          END)
        `,
      })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.referenceType, "PO_RECEIPT"));

    return stats[0] || {
      totalReceipts: 0,
      recentReceipts: 0,
    };
  }),
});
