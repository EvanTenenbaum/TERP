/**
 * WSQA-003: Return Processing Service
 * Handles restocking items to inventory and returning to vendor
 */

import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  orders,
  orderLineItems,
  orderLineItemAllocations,
  batches,
  orderStatusHistory,
  vendorReturns,
  vendorReturnItems,
} from "../../drizzle/schema";
import { logger } from "../_core/logger";
import { withTransaction } from "../dbTransaction";

/**
 * Process restock - return items to inventory
 * Increases batch quantities based on order line item allocations
 */
export async function processRestock(orderId: number, userId: number): Promise<void> {
  await withTransaction(async (tx) => {
    // Get order
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.fulfillmentStatus !== "RETURNED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Order must be in RETURNED status to restock. Current status: ${order.fulfillmentStatus}`,
      });
    }

    // Get line items for this order
    const lineItems = await tx
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    let totalRestocked = 0;

    for (const item of lineItems) {
      // Get allocations for this line item
      const allocations = await tx
        .select()
        .from(orderLineItemAllocations)
        .where(eq(orderLineItemAllocations.orderLineItemId, item.id));

      for (const alloc of allocations) {
        const quantityToRestock = parseFloat(alloc.quantityAllocated || "0");

        // Increase batch quantity (with row lock)
        await tx
          .update(batches)
          .set({
            onHandQty: sql`${batches.onHandQty} + ${quantityToRestock}`,
          })
          .where(eq(batches.id, alloc.batchId));

        totalRestocked += quantityToRestock;

        logger.info({
          msg: "WSQA-003: Restocked batch quantity",
          batchId: alloc.batchId,
          quantity: quantityToRestock,
          orderId,
        });
      }

      // If no allocations, fall back to line item batch
      if (allocations.length === 0 && item.batchId) {
        const quantityToRestock = parseFloat(item.quantity || "0");

        await tx
          .update(batches)
          .set({
            onHandQty: sql`${batches.onHandQty} + ${quantityToRestock}`,
          })
          .where(eq(batches.id, item.batchId));

        totalRestocked += quantityToRestock;

        logger.info({
          msg: "WSQA-003: Restocked from line item (no allocations)",
          batchId: item.batchId,
          quantity: quantityToRestock,
          orderId,
        });
      }
    }

    // Update order status to RESTOCKED
    await tx
      .update(orders)
      .set({
        fulfillmentStatus: "RESTOCKED",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Log status change
    await tx.insert(orderStatusHistory).values({
      orderId,
      fulfillmentStatus: "RESTOCKED",
      changedBy: userId,
      notes: `Items restocked to inventory. Total quantity: ${totalRestocked}`,
    });

    logger.info({
      msg: "WSQA-003: Order restocked successfully",
      orderId,
      totalRestocked,
      userId,
    });
  });
}

/**
 * Process vendor return - create vendor return record and update order status
 */
export async function processVendorReturn(
  orderId: number,
  vendorId: number,
  returnReason: string,
  userId: number
): Promise<number> {
  return await withTransaction(async (tx) => {
    // Validate order status
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.fulfillmentStatus !== "RETURNED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Order must be in RETURNED status to return to vendor. Current status: ${order.fulfillmentStatus}`,
      });
    }

    // Get line items and calculate total value
    const lineItems = await tx
      .select()
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    let totalValue = 0;
    const itemsToReturn: { batchId: number; quantity: number; unitCost: number }[] = [];

    for (const item of lineItems) {
      // Check for allocations first
      const allocations = await tx
        .select()
        .from(orderLineItemAllocations)
        .where(eq(orderLineItemAllocations.orderLineItemId, item.id));

      if (allocations.length > 0) {
        for (const alloc of allocations) {
          const qty = parseFloat(alloc.quantityAllocated || "0");
          const cost = parseFloat(alloc.unitCost || "0");
          totalValue += qty * cost;
          itemsToReturn.push({
            batchId: alloc.batchId,
            quantity: qty,
            unitCost: cost,
          });
        }
      } else if (item.batchId) {
        // Fall back to line item
        const qty = parseFloat(item.quantity || "0");
        const cost = parseFloat(item.cogsPerUnit || "0");
        totalValue += qty * cost;
        itemsToReturn.push({
          batchId: item.batchId,
          quantity: qty,
          unitCost: cost,
        });
      }
    }

    // Create vendor return record
    const [vendorReturn] = await tx
      .insert(vendorReturns)
      .values({
        orderId,
        vendorId,
        status: "PENDING_VENDOR_CREDIT",
        returnReason,
        totalValue: totalValue.toFixed(2),
        createdBy: userId,
      })
      .$returningId();

    const vendorReturnId = vendorReturn.id;

    // Create return item records
    for (const item of itemsToReturn) {
      await tx.insert(vendorReturnItems).values({
        vendorReturnId,
        batchId: item.batchId,
        quantity: item.quantity.toString(),
        unitCost: item.unitCost.toFixed(4),
      });
    }

    // Update order status
    await tx
      .update(orders)
      .set({
        fulfillmentStatus: "RETURNED_TO_VENDOR",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Log status change
    await tx.insert(orderStatusHistory).values({
      orderId,
      fulfillmentStatus: "RETURNED_TO_VENDOR",
      changedBy: userId,
      notes: `Items returned to vendor. Vendor return #${vendorReturnId}. Total value: $${totalValue.toFixed(2)}`,
    });

    logger.info({
      msg: "WSQA-003: Vendor return created",
      orderId,
      vendorReturnId,
      vendorId,
      totalValue,
      itemCount: itemsToReturn.length,
      userId,
    });

    return vendorReturnId;
  });
}

/**
 * Record credit received for a vendor return
 */
export async function recordVendorCredit(
  vendorReturnId: number,
  creditAmount: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(vendorReturns)
    .set({
      creditReceived: creditAmount.toFixed(2),
      creditReceivedAt: new Date(),
      status: "CREDIT_RECEIVED",
    })
    .where(eq(vendorReturns.id, vendorReturnId));

  logger.info({
    msg: "WSQA-003: Vendor credit recorded",
    vendorReturnId,
    creditAmount,
    userId,
  });
}
