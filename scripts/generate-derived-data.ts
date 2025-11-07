/**
 * Generate Derived Data for Production
 *
 * Creates all the data that would naturally exist alongside orders:
 * - Invoices (from orders)
 * - Payments (against invoices)
 * - Returns (5% of orders)
 * - Inventory movements (batch quantity reductions)
 * - Client metrics (balances, totals, AR aging)
 * - Order line items (denormalized)
 *
 * Usage:
 *   tsx scripts/generate-derived-data.ts
 */

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

async function generateDerivedData() {
  console.log("\n📊 Generating Derived Data for Production");
  console.log("=".repeat(60));
  console.log("This will create invoices, payments, returns, and metrics");
  console.log("=".repeat(60) + "\n");

  try {
    // Step 0: Clear existing derived data
    console.log("🗑️  Clearing existing derived data...");
    await db.execute(sql`DELETE FROM order_line_items`);
    console.log("   ✓ Cleared order_line_items");
    await db.execute(sql`DELETE FROM inventoryMovements`);
    console.log("   ✓ Cleared inventoryMovements");
    await db.execute(sql`DELETE FROM returns`);
    console.log("   ✓ Cleared returns");
    await db.execute(sql`DELETE FROM payments`);
    console.log("   ✓ Cleared payments");
    await db.execute(sql`DELETE FROM invoices`);
    console.log("   ✓ Cleared invoices\n");

    // Reset batch quantities
    await db.execute(sql`UPDATE batches SET onHandQty = '1000.00'`);
    console.log("   ✓ Reset batch quantities\n");

    // Step 1: Fetch all orders from production
    console.log("📋 Fetching orders from production...");
    const ordersResult = await db.execute(sql`
      SELECT 
        id, order_number, orderType, client_id, items,
        subtotal, tax, discount, total,
        total_cogs, total_margin,
        paymentTerms, created_at
      FROM orders
      WHERE orderType = 'SALE'
      ORDER BY id
    `);

    const orders = ordersResult[0] as unknown as Array<Record<string, unknown>>;
    console.log(`   ✓ Retrieved ${orders.length} orders\n`);

    // Step 2: Generate invoices directly from orders
    console.log("💰 Generating invoices...");
    let invoiceCount = 0;
    const invoiceIds: number[] = [];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const invoiceNumber = `INV-${String(i + 1).padStart(6, "0")}`;
      const invoiceDate = new Date(order.created_at);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30); // NET_30

      // 85% paid, 15% overdue
      const isPaid = Math.random() < 0.85;
      const status = isPaid ? "PAID" : "OVERDUE";
      const amountPaid = isPaid ? order.total : 0;
      const amountDue = isPaid ? 0 : order.total;

      const result = await db.execute(sql`
        INSERT INTO invoices (
          invoiceNumber, customerId,
          invoiceDate, dueDate,
          subtotal, taxAmount, discountAmount, totalAmount,
          amountPaid, amountDue, status,
          paymentTerms, referenceType, referenceId,
          createdBy, createdAt
        ) VALUES (
          ${invoiceNumber},
          ${order.client_id},
          ${invoiceDate},
          ${dueDate},
          ${order.subtotal},
          ${order.tax || 0},
          ${order.discount || 0},
          ${order.total},
          ${amountPaid},
          ${amountDue},
          ${status},
          ${order.paymentTerms},
          'ORDER',
          ${order.id},
          1,
          ${invoiceDate}
        )
      `);

      // Get the inserted invoice ID
      const insertId = (result[0] as Record<string, unknown>)
        .insertId as number;
      invoiceIds.push(insertId);
      invoiceCount++;

      if (invoiceCount % 500 === 0) {
        console.log(
          `   ⏳ Inserted ${invoiceCount}/${orders.length} invoices...`
        );
      }
    }
    console.log(`   ✓ ${invoiceCount} invoices inserted\n`);

    // Step 3: Generate payments (70% of paid invoices get payment records)
    console.log("💵 Generating payments...");
    let paymentCount = 0;

    const paidInvoicesResult = await db.execute(sql`
      SELECT id, customerId, totalAmount, invoiceDate
      FROM invoices
      WHERE status = 'PAID'
    `);
    const paidInvoices = paidInvoicesResult[0] as unknown as Array<
      Record<string, unknown>
    >;

    for (let i = 0; i < paidInvoices.length; i++) {
      const invoice = paidInvoices[i];
      if (Math.random() < 0.7) {
        const paymentNumber = `PAY-${String(paymentCount + 1).padStart(6, "0")}`;
        const paymentDate = new Date(invoice.invoiceDate);
        paymentDate.setDate(
          paymentDate.getDate() + Math.floor(Math.random() * 30)
        ); // 0-30 days later

        await db.execute(sql`
          INSERT INTO payments (
            paymentNumber, paymentType, invoiceId, customerId, amount,
            paymentDate, paymentMethod, notes, createdBy, createdAt
          ) VALUES (
            ${paymentNumber},
            'RECEIVED',
            ${invoice.id},
            ${invoice.customerId},
            ${invoice.totalAmount},
            ${paymentDate},
            ${Math.random() < 0.7 ? "CHECK" : "ACH"},
            'Auto-generated payment',
            1,
            ${paymentDate}
          )
        `);

        paymentCount++;
      }
    }
    console.log(`   ✓ ${paymentCount} payments inserted\n`);

    // Step 4: Generate returns (5% of orders)
    console.log("↩️  Generating returns...");
    const returnCount = Math.floor(orders.length * 0.05);
    let returnsCreated = 0;

    for (let i = 0; i < returnCount; i++) {
      const order = orders[Math.floor(Math.random() * orders.length)];
      const items =
        typeof order.items === "string" ? JSON.parse(order.items) : order.items;

      if (items && items.length > 0) {
        // Select random items to return (1-3 items)
        const itemsToReturn = items.slice(0, Math.floor(Math.random() * 3) + 1);
        const returnDate = new Date(order.created_at);
        returnDate.setDate(
          returnDate.getDate() + Math.floor(Math.random() * 14)
        ); // 0-14 days later

        await db.execute(sql`
          INSERT INTO returns (
            order_id, items, returnReason, notes,
            processed_by, processed_at, refund_status
          ) VALUES (
            ${order.id},
            ${JSON.stringify(itemsToReturn)},
            ${["DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED", "CUSTOMER_CHANGED_MIND"][Math.floor(Math.random() * 4)]},
            'Auto-generated return',
            1,
            ${returnDate},
            ${Math.random() < 0.8 ? "COMPLETED" : "PENDING"}
          )
        `);

        returnsCreated++;
      }
    }
    console.log(`   ✓ ${returnsCreated} returns inserted\n`);

    // Step 5: Generate inventory movements (reduce batch quantities)
    console.log("📦 Generating inventory movements...");
    let movementCount = 0;

    for (const order of orders) {
      const items =
        typeof order.items === "string" ? JSON.parse(order.items) : order.items;

      if (items && items.length > 0) {
        for (const item of items) {
          const quantityChange = -Math.abs(parseFloat(item.quantity));
          const quantityBefore = 1000; // We reset to 1000 earlier
          const quantityAfter = Math.max(0, quantityBefore + quantityChange);

          await db.execute(sql`
            INSERT INTO inventoryMovements (
              batchId, inventoryMovementType, quantityChange,
              quantityBefore, quantityAfter,
              referenceType, referenceId, reason,
              performedBy, createdAt
            ) VALUES (
              ${item.batchId},
              'SALE',
              ${quantityChange.toFixed(2)},
              ${quantityBefore.toFixed(2)},
              ${quantityAfter.toFixed(2)},
              'ORDER',
              ${order.id},
              ${`Order ${order.order_number}`},
              1,
              ${new Date(order.created_at)}
            )
          `);

          // Update batch onHandQty
          await db.execute(sql`
            UPDATE batches
            SET onHandQty = GREATEST(0, CAST(onHandQty AS DECIMAL(10,2)) - ${Math.abs(parseFloat(item.quantity))})
            WHERE id = ${item.batchId}
          `);

          movementCount++;
        }
      }

      if (movementCount % 1000 === 0) {
        console.log(`   ⏳ Created ${movementCount} movements...`);
      }
    }
    console.log(`   ✓ ${movementCount} inventory movements created\n`);

    // Step 6: Generate order_line_items (denormalized for reporting)
    console.log("📊 Generating order line items...");
    let lineItemCount = 0;

    for (const order of orders) {
      const items =
        typeof order.items === "string" ? JSON.parse(order.items) : order.items;

      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await db.execute(sql`
            INSERT INTO order_line_items (
              orderId, lineNumber, batchId, productId,
              quantity, unitPrice, unitCogs, lineTotal,
              createdAt
            ) VALUES (
              ${order.id},
              ${i + 1},
              ${item.batchId},
              ${item.productId},
              ${item.quantity},
              ${item.unitPrice},
              ${item.unitCogs || "0.00"},
              ${item.lineTotal},
              ${new Date(order.created_at)}
            )
          `);
          lineItemCount++;
        }
      }

      if (lineItemCount % 1000 === 0) {
        console.log(`   ⏳ Created ${lineItemCount} line items...`);
      }
    }
    console.log(`   ✓ ${lineItemCount} order line items created\n`);

    // Step 7: Update client metrics
    console.log("👥 Calculating client metrics...");

    const clientsResult = await db.execute(sql`SELECT id FROM clients`);
    const clients = clientsResult[0] as unknown as Array<{ id: number }>;

    for (const client of clients) {
      // Calculate total spent
      const spentResult = await db.execute(sql`
        SELECT COALESCE(SUM(total), 0) as total_spent
        FROM orders
        WHERE client_id = ${client.id} AND orderType = 'SALE'
      `);
      const totalSpent = (
        spentResult[0] as unknown as Array<{ total_spent: number }>
      )[0].total_spent;

      // Calculate total profit
      const profitResult = await db.execute(sql`
        SELECT COALESCE(SUM(total_margin), 0) as total_profit
        FROM orders
        WHERE client_id = ${client.id} AND orderType = 'SALE'
      `);
      const totalProfit = (
        profitResult[0] as unknown as Array<{ total_profit: number }>
      )[0].total_profit;

      // Calculate avg margin
      const avgMargin = totalSpent > 0 ? (totalProfit / totalSpent) * 100 : 0;

      // Calculate balance (total owed)
      const balanceResult = await db.execute(sql`
        SELECT COALESCE(SUM(amountDue), 0) as total_owed
        FROM invoices
        WHERE customerId = ${client.id}
      `);
      const totalOwed = (
        balanceResult[0] as unknown as Array<{ total_owed: number }>
      )[0].total_owed;

      // Calculate oldest debt
      const debtResult = await db.execute(sql`
        SELECT COALESCE(DATEDIFF(NOW(), MIN(dueDate)), 0) as oldest_debt
        FROM invoices
        WHERE customerId = ${client.id} AND amountDue > 0
      `);
      const oldestDebt = (
        debtResult[0] as unknown as Array<{ oldest_debt: number }>
      )[0].oldest_debt;

      // Update client
      await db.execute(sql`
        UPDATE clients
        SET 
          total_spent = ${totalSpent.toFixed(2)},
          total_profit = ${totalProfit.toFixed(2)},
          avg_profit_margin = ${avgMargin.toFixed(2)},
          total_owed = ${totalOwed.toFixed(2)},
          oldest_debt_days = ${oldestDebt},
          balance = ${totalOwed.toFixed(2)}
        WHERE id = ${client.id}
      `);
    }
    console.log(`   ✓ ${clients.length} client metrics updated\n`);

    // Final summary
    console.log("=".repeat(60));
    console.log("✅ Derived data generation complete!");
    console.log("=".repeat(60));
    console.log(`💰 Invoices: ${invoiceCount}`);
    console.log(`💵 Payments: ${paymentCount}`);
    console.log(`↩️  Returns: ${returnsCreated}`);
    console.log(`📦 Inventory Movements: ${movementCount}`);
    console.log(`📊 Order Line Items: ${lineItemCount}`);
    console.log(`👥 Client Metrics: ${clients.length} updated`);
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error generating derived data:");
    console.error(error);
    process.exit(1);
  }
}

generateDerivedData();
