/**
 * Augment Orders & Line Items
 * 
 * Links existing orders to products and creates realistic order_line_items.
 * Part of DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships
 * 
 * Usage: pnpm tsx scripts/augment-orders.ts
 */

import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { db } from "./db-sync.js";
import { orders, orderLineItems, batches, products, clients } from "../drizzle/schema.js";
import { eq, sql, isNull, and } from "drizzle-orm";

interface OrderSummary {
  id: number;
  orderNumber: string;
  clientId: number;
  total: string;
  itemCount: number;
}

/**
 * Retry helper for database queries
 */
async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 5,
  delayMs: number = 3000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      const err = error as Error & { code?: string };
      const isTimeout = err.message?.includes("ETIMEDOUT") || err.code === "ETIMEDOUT";
      
      if (isTimeout && i < maxRetries - 1) {
        const delay = delayMs * (i + 1); // Exponential backoff
        console.log(`  ⚠️  Connection timeout, retry ${i + 1}/${maxRetries - 1} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Get orders without line items
 */
async function getOrdersWithoutItems(): Promise<OrderSummary[]> {
  const result = await retryQuery(async () => {
    return await db.execute(sql`
      SELECT o.id, o.order_number as orderNumber, o.client_id as clientId, o.total, 
             COUNT(oli.id) as itemCount
      FROM orders o
      LEFT JOIN order_line_items oli ON o.id = oli.order_id
      WHERE o.is_draft = 0
      GROUP BY o.id, o.order_number, o.client_id, o.total
      HAVING COUNT(oli.id) = 0
      LIMIT 100
    `);
  });

  const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
  return (rows as OrderSummary[]) || [];
}

/**
 * Get batches available for a client (based on product availability)
 */
async function getAvailableBatches(clientId: number, limit: number = 20): Promise<Array<{
  id: number;
  productId: number;
  unitCogs: string;
  onHandQty: number;
}>> {
  const result = await retryQuery(async () => {
    return await db.execute(sql`
      SELECT b.id, b.productId, b.unitCogs, b.onHandQty
      FROM batches b
      WHERE b.batchStatus = 'LIVE' 
        AND b.onHandQty > 0
      ORDER BY RAND()
      LIMIT ${limit}
    `);
  });

  const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
  return (rows as Array<{ id: number; productId: number; unitCogs: string; onHandQty: number }>) || [];
}

/**
 * Create line items for an order
 */
async function createLineItemsForOrder(
  orderId: number,
  clientId: number
): Promise<void> {
  // Get available batches
  const batches = await getAvailableBatches(clientId, 20);
  
  if (batches.length === 0) {
    console.log(`  ⚠️  No batches available for order ${orderId}`);
    return;
  }

  // Create 2-5 line items per order
  const itemCount = 2 + Math.floor(Math.random() * 4);
  let orderSubtotal = 0;

  for (let i = 0; i < itemCount && i < batches.length; i++) {
    const batch = batches[Math.floor(Math.random() * batches.length)];
    const quantity = Math.min(1 + Math.floor(Math.random() * 10), batch.onHandQty);
    const cogsPerUnit = parseFloat(batch.unitCogs);

    // Calculate margin (30-50%)
    const marginPercent = 30 + Math.random() * 20;
    const marginDollar = (cogsPerUnit * marginPercent) / 100;
    const unitPrice = cogsPerUnit + marginDollar;
    const lineTotal = unitPrice * quantity;

    orderSubtotal += lineTotal;

    try {
      await db.execute(sql`
        INSERT INTO order_line_items (
          order_id,
          batch_id,
          quantity,
          cogs_per_unit,
          original_cogs_per_unit,
          is_cogs_overridden,
          margin_percent,
          margin_dollar,
          is_margin_overridden,
          margin_source,
          unit_price,
          line_total,
          is_sample,
          created_at,
          updated_at
        ) VALUES (
          ${orderId},
          ${batch.id},
          ${quantity},
          ${cogsPerUnit},
          ${cogsPerUnit},
          0,
          ${marginPercent.toFixed(2)},
          ${marginDollar.toFixed(2)},
          0,
          'DEFAULT',
          ${unitPrice.toFixed(2)},
          ${lineTotal.toFixed(2)},
          0,
          NOW(),
          NOW()
        )
      `);
    } catch (error) {
      console.error(`  ❌ Error creating line item ${i + 1} for order ${orderId}:`, error);
    }
  }

  // Update order totals
  const tax = orderSubtotal * 0.08; // 8% tax
  const discount = 0;
  const total = orderSubtotal + tax - discount;

  try {
    await db.execute(sql`
      UPDATE orders
      SET subtotal = ${orderSubtotal.toFixed(2)},
          tax = ${tax.toFixed(2)},
          discount = ${discount.toFixed(2)},
          total = ${total.toFixed(2)},
          updated_at = NOW()
      WHERE id = ${orderId}
    `);
  } catch (error) {
    console.error(`  ❌ Error updating order ${orderId} totals:`, error);
  }
}

/**
 * Main augmentation function
 */
async function augmentOrders(): Promise<void> {
  console.log("🔧 Augmenting Orders & Line Items...\n");

  try {
    // Get orders without items
    const ordersWithoutItems = await getOrdersWithoutItems();
    
    console.log(`📊 Found ${ordersWithoutItems.length} orders without line items\n`);

    if (ordersWithoutItems.length === 0) {
      console.log("✅ All orders already have line items!");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const order of ordersWithoutItems) {
      try {
        console.log(`  Processing order ${order.orderNumber} (ID: ${order.id})...`);
        await createLineItemsForOrder(order.id, order.clientId);
        successCount++;
        console.log(`  ✅ Order ${order.orderNumber} augmented\n`);
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Error processing order ${order.orderNumber}:`, error);
      }
    }

    console.log("=".repeat(60));
    console.log(`✅ Augmentation complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Augmentation failed:", error);
    process.exit(1);
  }
}

// Main execution
augmentOrders()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
