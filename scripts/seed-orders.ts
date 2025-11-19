import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING ORDERS & LINE ITEMS ===\n");

async function seedOrders() {
  try {
    // Phase 1: Verify prerequisites
    console.log("📋 Phase 1: Verifying prerequisites...");

    const tablesResult = await db.execute(sql`
      SELECT TABLE_NAME FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'defaultdb' 
      AND TABLE_NAME IN ('orders', 'order_line_items', 'order_status_history', 'clients', 'batches', 'users')
    `);
    const tables = (tablesResult[0] as { TABLE_NAME: string }[]).map(
      t => t.TABLE_NAME
    );
    console.log(
      `✓ Found ${tables.length}/6 required tables: ${tables.join(", ")}\n`
    );

    // Get existing data
    const clientsResult = await db.execute(
      sql`SELECT id FROM clients LIMIT 30`
    );
    const clients = clientsResult[0] as { id: number }[];

    const batchesResult = await db.execute(sql`
      SELECT b.id, b.productId, b.unitCogs, b.onHandQty 
      FROM batches b 
      WHERE b.batchStatus = 'LIVE' AND b.onHandQty > 0
      LIMIT 50
    `);
    const batches = batchesResult[0] as {
      id: number;
      productId: number;
      unitCogs: string;
      onHandQty: number;
    }[];

    const usersResult = await db.execute(sql`SELECT id FROM users LIMIT 5`);
    const users = usersResult[0] as { id: number }[];

    console.log(`✓ Found ${clients.length} clients`);
    console.log(`✓ Found ${batches.length} batches (LIVE with inventory)`);
    console.log(`✓ Found ${users.length} users\n`);

    if (clients.length === 0 || batches.length === 0 || users.length === 0) {
      console.error("❌ Missing required data");
      process.exit(1);
    }

    // Phase 2: Seed Orders
    console.log("📦 Phase 2: Seeding orders...");

    const orderStatuses = ["PENDING", "PACKED", "SHIPPED"];
    const orderCount = 25; // Target 25 orders
    const createdOrders: number[] = [];

    for (let i = 0; i < orderCount; i++) {
      const client = clients[i % clients.length];
      const user = users[i % users.length];
      const fulfillmentStatus = orderStatuses[i % orderStatuses.length];

      // Random date in past 90 days
      const daysAgo = Math.floor(Math.random() * 90);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      // Generate order number
      const orderNumber = `ORD-${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(4, "0")}`;

      // Determine order type and status
      const orderType = "SALE";
      const saleStatus = "PAID";

      // Insert order with empty items JSON (will populate via order_line_items)
      await db.execute(sql`
        INSERT INTO orders (
          order_number,
          orderType,
          client_id,
          items,
          subtotal,
          tax,
          discount,
          total,
          paymentTerms,
          saleStatus,
          fulfillmentStatus,
          created_by,
          created_at,
          is_draft
        ) VALUES (
          ${orderNumber},
          ${orderType},
          ${client.id},
          '[]',
          0,
          0,
          0,
          0,
          'NET_30',
          ${saleStatus},
          ${fulfillmentStatus},
          ${user.id},
          ${orderDate.toISOString().slice(0, 19).replace("T", " ")},
          0
        )
      `);

      // Get the inserted order ID
      const orderIdResult = await db.execute(
        sql`SELECT LAST_INSERT_ID() as id`
      );
      const orderId = (orderIdResult[0] as { id: number }[])[0].id;
      createdOrders.push(orderId);

      // Add line items (2-5 per order)
      const lineItemCount = 2 + Math.floor(Math.random() * 4);
      let orderSubtotal = 0;

      for (let j = 0; j < lineItemCount; j++) {
        const batch = batches[Math.floor(Math.random() * batches.length)];
        const quantity = 1 + Math.floor(Math.random() * 10);
        const cogsPerUnit = parseFloat(batch.unitCogs);

        // Calculate margin (30-50%)
        const marginPercent = 30 + Math.random() * 20;
        const marginDollar = (cogsPerUnit * marginPercent) / 100;
        const unitPrice = cogsPerUnit + marginDollar;
        const lineTotal = unitPrice * quantity;

        orderSubtotal += lineTotal;

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
            is_sample
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
            0
          )
        `);
      }

      // Calculate tax (10% of subtotal)
      const tax = orderSubtotal * 0.1;
      const total = orderSubtotal + tax;

      // Update order totals
      await db.execute(sql`
        UPDATE orders 
        SET 
          subtotal = ${orderSubtotal.toFixed(2)},
          tax = ${tax.toFixed(2)},
          total = ${total.toFixed(2)}
        WHERE id = ${orderId}
      `);

      // Add status history entry
      await db.execute(sql`
        INSERT INTO order_status_history (
          order_id,
          fulfillmentStatus,
          changed_at,
          changed_by
        ) VALUES (
          ${orderId},
          ${fulfillmentStatus},
          ${orderDate.toISOString().slice(0, 19).replace("T", " ")},
          ${user.id}
        )
      `);
    }

    console.log(`✓ Created ${orderCount} orders\n`);

    // Phase 3: Validation
    console.log("✅ Phase 3: Validating seeded data...");

    const ordersCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM orders`
    );
    const lineItemsCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM order_line_items`
    );
    const statusHistoryCount = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM order_status_history 
      WHERE order_id IN (${sql.join(createdOrders, sql`, `)})
    `);

    console.log("📊 Summary:");
    console.log(
      `  - Orders: ${(ordersCount[0] as { count: number }[])[0].count}`
    );
    console.log(
      `  - Order Line Items: ${(lineItemsCount[0] as { count: number }[])[0].count}`
    );
    console.log(
      `  - Status History Entries: ${(statusHistoryCount[0] as { count: number }[])[0].count}`
    );

    // Show order distribution by status
    const statusDist = await db.execute(sql`
      SELECT fulfillmentStatus, COUNT(*) as count 
      FROM orders 
      GROUP BY fulfillmentStatus
    `);
    console.log("\n📈 Orders by Status:");
    (statusDist[0] as { fulfillmentStatus: string; count: number }[]).forEach(
      row => {
        console.log(`  - ${row.fulfillmentStatus}: ${row.count}`);
      }
    );

    // Show sample orders
    const sampleOrders = await db.execute(sql`
      SELECT 
        o.id,
        o.order_number,
        o.total,
        COUNT(oli.id) as line_items
      FROM orders o
      LEFT JOIN order_line_items oli ON o.id = oli.order_id
      GROUP BY o.id
      LIMIT 5
    `);
    console.log("\n📦 Sample Orders:");
    (
      sampleOrders[0] as {
        id: number;
        order_number: string;
        total: string;
        line_items: number;
      }[]
    ).forEach(order => {
      console.log(
        `  - ${order.order_number}: $${order.total} (${order.line_items} items)`
      );
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedOrders();
