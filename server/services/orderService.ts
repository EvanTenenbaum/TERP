/**
 * Order Service
 *
 * Service for creating and managing orders from various sources.
 * Used by VIP Portal Admin to convert interest lists to orders.
 *
 * @module server/services/orderService
 */

import { getDb } from "../db";
import { orders } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface InterestListItem {
  id: number;
  batchId?: number;
  productId?: number;
  quantity?: number;
  price?: number;
}

interface CreateOrderFromInterestListInput {
  clientId: number;
  items: InterestListItem[];
  source?: string;
}

interface AddItemsToOrderInput {
  orderId: number;
  items: InterestListItem[];
}

interface Order {
  id: number;
  orderNumber: string;
  clientId: number;
  status: string;
}

/**
 * Creates a new order from an interest list
 */
export async function createOrderFromInterestList(
  input: CreateOrderFromInterestListInput
): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ORD-002: Validate positive quantities and non-negative prices
  for (const item of input.items) {
    if (item.quantity !== undefined && item.quantity <= 0) {
      throw new Error(`Invalid quantity ${item.quantity} for item ${item.id}. Quantity must be greater than 0.`);
    }
    if (item.price !== undefined && item.price < 0) {
      throw new Error(`Invalid price ${item.price} for item ${item.id}. Price cannot be negative.`);
    }
  }

  // Generate order number
  const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Convert interest list items to order items format
  const orderItemsJson = input.items.map((item) => ({
    batchId: item.batchId || null,
    productId: item.productId || null,
    quantity: item.quantity || 1,
    unitPrice: item.price || 0,
  }));

  // Calculate totals
  const subtotal = orderItemsJson.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity),
    0
  );

  // Create the order
  const [result] = await db.insert(orders).values({
    clientId: input.clientId,
    orderNumber,
    orderType: "QUOTE",
    isDraft: true,
    items: orderItemsJson,
    subtotal: subtotal.toFixed(2),
    total: subtotal.toFixed(2),
    notes: input.source ? `Created from ${input.source}` : null,
    createdBy: 1, // System user - should be passed from context in production
  });

  const orderId = result.insertId;

  return {
    id: orderId,
    orderNumber,
    clientId: input.clientId,
    status: "QUOTE",
  };
}

/**
 * Adds items to an existing order
 */
export async function addItemsToOrder(input: AddItemsToOrderInput): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (input.items.length === 0) return;

  // ORD-002: Validate positive quantities and non-negative prices
  for (const item of input.items) {
    if (item.quantity !== undefined && item.quantity <= 0) {
      throw new Error(`Invalid quantity ${item.quantity} for item ${item.id}. Quantity must be greater than 0.`);
    }
    if (item.price !== undefined && item.price < 0) {
      throw new Error(`Invalid price ${item.price} for item ${item.id}. Price cannot be negative.`);
    }
  }

  // Get existing order
  const existingOrder = await db.query.orders.findFirst({
    where: eq(orders.id, input.orderId),
  });

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  // Parse existing items
  const existingItems = (existingOrder.items as Array<{ unitPrice?: number; quantity?: number }>) || [];

  // Add new items
  const newItems = input.items.map((item) => ({
    batchId: item.batchId || null,
    productId: item.productId || null,
    quantity: item.quantity || 1,
    unitPrice: item.price || 0,
  }));

  const allItems = [...existingItems, ...newItems];

  // Recalculate totals
  const subtotal = allItems.reduce(
    (sum: number, item) =>
      sum + ((item.unitPrice || 0) * (item.quantity || 1)),
    0
  );

  // Update order
  await db
    .update(orders)
    .set({
      items: allItems,
      subtotal: subtotal.toFixed(2),
      total: subtotal.toFixed(2),
    })
    .where(eq(orders.id, input.orderId));
}

/**
 * Gets an order by ID
 */
export async function getOrderById(orderId: number): Promise<Order | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!result) return null;

  return {
    id: result.id,
    orderNumber: result.orderNumber || `ORD-${result.id}`,
    clientId: result.clientId,
    status: result.orderType || "QUOTE",
  };
}
