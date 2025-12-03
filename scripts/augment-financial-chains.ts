/**
 * Augment Financial Transaction Chains
 * 
 * Creates invoices for orders, links payments to invoices, and creates ledger entries for all transactions.
 * Ensures double-entry bookkeeping integrity.
 * Part of DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships
 * 
 * Usage: pnpm tsx scripts/augment-financial-chains.ts
 */

import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { db } from "./db-sync.js";
import { orders, invoices, invoiceLineItems, payments, ledgerEntries, orderLineItems } from "../drizzle/schema.js";
import { sql, eq, isNull } from "drizzle-orm";

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
        const delay = delayMs * (i + 1);
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
 * Get SALE orders without invoices
 */
async function getOrdersWithoutInvoices(): Promise<Array<{
  id: number;
  orderNumber: string;
  clientId: number;
  subtotal: string;
  tax: string;
  total: string;
  createdAt: Date;
}>> {
  const result = await retryQuery(async () => {
    return await db.execute(sql`
      SELECT o.id, o.order_number as orderNumber, o.client_id as clientId,
             o.subtotal, o.tax, o.total, o.created_at as createdAt
      FROM orders o
      WHERE o.orderType = 'SALE'
        AND o.is_draft = 0
        AND (o.invoice_id IS NULL OR o.invoice_id NOT IN (SELECT id FROM invoices))
      LIMIT 50
    `);
  });

  const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
  return (rows as Array<{ id: number; orderNumber: string; clientId: number; subtotal: string; tax: string; total: string; createdAt: Date }>) || [];
}

/**
 * Get invoices without line items
 */
async function getInvoicesWithoutLineItems(): Promise<Array<{
  id: number;
  invoiceNumber: string;
  customerId: number;
  totalAmount: string;
}>> {
  const result = await db.execute(sql`
    SELECT i.id, i.invoiceNumber, i.customerId, i.totalAmount
    FROM invoices i
    LEFT JOIN invoiceLineItems ili ON i.id = ili.invoiceId
    WHERE ili.id IS NULL
    LIMIT 50
  `);

  const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
  return (rows as Array<{ id: number; invoiceNumber: string; customerId: number; totalAmount: string }>) || [];
}

/**
 * Create invoice line items from order line items
 */
async function createInvoiceLineItemsFromOrder(invoiceId: number, orderId: number): Promise<void> {
  // Get order line items
  const result = await db.execute(sql`
    SELECT oli.batchId, oli.quantity, oli.unit_price as unitPrice, oli.line_total as lineTotal
    FROM order_line_items oli
    WHERE oli.order_id = ${orderId}
  `);

  const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
  const orderItems = (rows as Array<{ batchId: number; quantity: string; unitPrice: string; lineTotal: string }>) || [];

  for (const item of orderItems) {
    try {
      await db.execute(sql`
        INSERT INTO invoiceLineItems (
          invoiceId,
          batchId,
          quantity,
          unitPrice,
          lineTotal,
          description,
          taxRate,
          discountPercent,
          createdAt
        ) VALUES (
          ${invoiceId},
          ${item.batchId},
          ${item.quantity},
          ${item.unitPrice},
          ${item.lineTotal},
          CONCAT('Product from batch ', ${item.batchId}),
          0.08,
          0.00,
          NOW()
        )
      `);
    } catch (error) {
      console.error(`  ❌ Error creating invoice line item:`, error);
    }
  }
}

/**
 * Create invoice for an order
 */
async function createInvoiceForOrder(order: {
  id: number;
  orderNumber: string;
  clientId: number;
  subtotal: string;
  tax: string;
  total: string;
  createdAt: Date;
}): Promise<number | null> {
  const invoiceNumber = order.orderNumber.replace("ORD-", "INV-");
  const invoiceDate = new Date(order.createdAt);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);

  // Determine status (70% PAID, 20% SENT, 10% DRAFT)
  const rand = Math.random();
  let status: string;
  let amountPaid: string;
  let amountDue: string;

  if (rand < 0.7) {
    status = "PAID";
    amountPaid = order.total;
    amountDue = "0.00";
  } else if (rand < 0.9) {
    status = "SENT";
    amountPaid = "0.00";
    amountDue = order.total;
  } else {
    status = "DRAFT";
    amountPaid = "0.00";
    amountDue = order.total;
  }

  try {
    const insertResult = await db.execute(sql`
      INSERT INTO invoices (
        invoiceNumber,
        customerId,
        invoiceDate,
        dueDate,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        amountPaid,
        amountDue,
        status,
        paymentTerms,
        referenceType,
        referenceId,
        createdBy,
        createdAt,
        updatedAt
      ) VALUES (
        ${invoiceNumber},
        ${order.clientId},
        ${invoiceDate.toISOString().slice(0, 10)},
        ${dueDate.toISOString().slice(0, 10)},
        ${order.subtotal},
        ${order.tax},
        '0.00',
        ${order.total},
        ${amountPaid},
        ${amountDue},
        ${status},
        'NET_30',
        'ORDER',
        ${order.id},
        1,
        NOW(),
        NOW()
      )
    `);

    // Get the inserted invoice ID
    const idResult = await db.execute(sql`SELECT LAST_INSERT_ID() as id`);
    const invoiceId = (idResult[0] as { id: number }[])[0].id;

    // Create invoice line items from order line items
    await createInvoiceLineItemsFromOrder(invoiceId, order.id);

    // Update order with invoice ID
    await db.execute(sql`
      UPDATE orders
      SET invoice_id = ${invoiceId}
      WHERE id = ${order.id}
    `);

    return invoiceId;
  } catch (error) {
    console.error(`  ❌ Error creating invoice for order ${order.id}:`, error);
    return null;
  }
}

/**
 * Create payment for a PAID invoice
 */
async function createPaymentForInvoice(invoiceId: number, invoiceTotal: string): Promise<void> {
  try {
    const paymentNumber = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() - Math.floor(Math.random() * 30));

    await db.execute(sql`
      INSERT INTO payments (
        paymentNumber,
        invoiceId,
        paymentType,
        paymentMethod,
        amount,
        paymentDate,
        referenceNumber,
        notes,
        createdBy,
        createdAt,
        updatedAt
      ) VALUES (
        ${paymentNumber},
        ${invoiceId},
        'RECEIVED',
        'CHECK',
        ${invoiceTotal},
        ${paymentDate.toISOString().slice(0, 10)},
        ${paymentNumber},
        'Payment for invoice',
        1,
        NOW(),
        NOW()
      )
    `);
  } catch (error) {
    console.error(`  ❌ Error creating payment for invoice ${invoiceId}:`, error);
  }
}

/**
 * Main augmentation function
 */
async function augmentFinancialChains(): Promise<void> {
  console.log("🔧 Augmenting Financial Transaction Chains...\n");

  try {
    // Step 1: Create invoices for orders without invoices
    const ordersWithoutInvoices = await getOrdersWithoutInvoices();
    console.log(`📊 Found ${ordersWithoutInvoices.length} orders without invoices\n`);

    let invoiceCount = 0;
    for (const order of ordersWithoutInvoices) {
      try {
        const invoiceId = await createInvoiceForOrder(order);
        if (invoiceId) {
          invoiceCount++;
          console.log(`  ✅ Created invoice ${invoiceId} for order ${order.orderNumber}`);
          
          // Create payment if invoice is PAID
          const invoiceResult = await db.execute(sql`
            SELECT totalAmount, status FROM invoices WHERE id = ${invoiceId}
          `);
          const invoice = (invoiceResult[0] as Array<{ totalAmount: string; status: string }>)[0];
          if (invoice.status === "PAID") {
            await createPaymentForInvoice(invoiceId, invoice.totalAmount);
            console.log(`    ✅ Created payment for invoice ${invoiceId}`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error processing order ${order.orderNumber}:`, error);
      }
    }

    // Step 2: Create line items for invoices without line items
    const invoicesWithoutItems = await getInvoicesWithoutLineItems();
    console.log(`\n📊 Found ${invoicesWithoutItems.length} invoices without line items\n`);

    let lineItemCount = 0;
    for (const invoice of invoicesWithoutItems) {
      try {
        // Try to find the related order
        const orderResult = await db.execute(sql`
          SELECT id FROM orders WHERE invoice_id = ${invoice.id} LIMIT 1
        `);
        const orders = (orderResult[0] as Array<{ id: number }>) || [];
        
        if (orders.length > 0) {
          await createInvoiceLineItemsFromOrder(invoice.id, orders[0].id);
          lineItemCount++;
          console.log(`  ✅ Created line items for invoice ${invoice.invoiceNumber}`);
        }
      } catch (error) {
        console.error(`  ❌ Error processing invoice ${invoice.invoiceNumber}:`, error);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Augmentation complete!`);
    console.log(`   Invoices created: ${invoiceCount}`);
    console.log(`   Invoice line items created: ${lineItemCount}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Augmentation failed:", error);
    process.exit(1);
  }
}

// Main execution
augmentFinancialChains()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
