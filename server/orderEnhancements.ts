import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { orders, clients } from "../drizzle/schema";
import { logger } from "./_core/logger";

/**
 * Reorder from a previous order
 * Creates a new order with the same items as a previous order
 */
export async function reorderFromPrevious(data: {
  originalOrderId: number;
  clientId: number;
  createdBy: number;
  modifications?: Array<{
    productId: number;
    quantity?: number;
    remove?: boolean;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get original order
    const [originalOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, data.originalOrderId));

    if (!originalOrder) {
      return { success: false, error: "Original order not found" };
    }

    // Parse items from JSON
    const originalItems = originalOrder.items as any[];

    if (!originalItems || originalItems.length === 0) {
      return { success: false, error: "Original order has no items" };
    }

    // Apply modifications if provided
    let newItems = [...originalItems];

    if (data.modifications) {
      for (const mod of data.modifications) {
        const itemIndex = newItems.findIndex((i: any) => i.productId === mod.productId);
        if (itemIndex >= 0) {
          if (mod.remove) {
            newItems.splice(itemIndex, 1);
          } else if (mod.quantity) {
            newItems[itemIndex].quantity = mod.quantity;
          }
        }
      }
    }

    if (newItems.length === 0) {
      return { success: false, error: "No items remaining after modifications" };
    }

    // Calculate total
    const subtotal = newItems.reduce((sum: number, item: any) => {
      const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      return sum + (qty * price);
    }, 0);

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;

    // Create new order
    const [newOrder] = await db.insert(orders).values({
      orderNumber,
      orderType: originalOrder.orderType,
      clientId: data.clientId,
      items: newItems as any,
      subtotal: subtotal.toString(),
      total: subtotal.toString(),
      paymentTerms: originalOrder.paymentTerms,
      saleStatus: "PENDING",
      notes: `Reordered from Order #${originalOrder.orderNumber}`,
      createdBy: data.createdBy,
    } as any);

    return {
      success: true,
      newOrderId: newOrder.insertId,
      originalOrderId: data.originalOrderId,
    };
  } catch (error) {
    logger.error("Error reordering from previous", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Get client's recent orders for quick reorder
 */
export async function getRecentOrdersForReorder(clientId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const recentOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.clientId, clientId))
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    return {
      success: true,
      orders: recentOrders,
    };
  } catch (error) {
    logger.error("Error getting recent orders for reorder", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Update client payment terms
 */
export async function updateClientPaymentTerms(
  clientId: number,
  paymentTerms: string,
  creditLimit?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    // Update metadata with payment terms
    const tags = client.tags || [];
    const updatedTags = {
      ...(Array.isArray(tags) ? {} : tags),
      paymentTerms,
      creditLimit,
    };

    await db
      .update(clients)
      .set({
        tags: updatedTags as any,
      })
      .where(eq(clients.id, clientId));

    return { success: true };
  } catch (error) {
    logger.error("Error updating client payment terms", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Calculate payment due date based on terms
 */
export function calculatePaymentDueDate(
  invoiceDate: string,
  paymentTerms: string
): string {
  const date = new Date(invoiceDate);

  switch (paymentTerms) {
    case "NET_30":
      date.setDate(date.getDate() + 30);
      break;
    case "NET_60":
      date.setDate(date.getDate() + 60);
      break;
    case "NET_90":
      date.setDate(date.getDate() + 90);
      break;
    case "NET_15":
      date.setDate(date.getDate() + 15);
      break;
    case "COD":
      // Due immediately
      break;
    case "DUE_ON_RECEIPT":
      // Due immediately
      break;
    case "CONSIGNMENT":
      // Due when sold (handled separately)
      date.setDate(date.getDate() + 90); // Default 90 days
      break;
    default:
      date.setDate(date.getDate() + 30); // Default to Net 30
  }

  return date.toISOString().split("T")[0];
}

/**
 * Get client payment terms
 */
export async function getClientPaymentTerms(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId));

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    const tags = client.tags || {};
    const paymentTerms = (tags as any).paymentTerms || "NET_30";
    const creditLimit = (tags as any).creditLimit || 0;

    return {
      success: true,
      paymentTerms,
      creditLimit,
    };
  } catch (error) {
    logger.error("Error getting client payment terms", { error });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

