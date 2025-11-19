import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== SEEDING INVOICES FROM ORDERS ===\n");

async function seedInvoices() {
  try {
    console.log("📋 Phase 1: Fetching existing orders...");

    // Get all orders
    const ordersResult = await db.execute(sql`
      SELECT 
        o.id,
        o.order_number,
        o.client_id,
        o.subtotal,
        o.tax,
        o.total,
        o.fulfillmentStatus,
        o.created_at
      FROM orders o
      ORDER BY o.created_at DESC
    `);
    const orders = ordersResult[0] as {
      id: number;
      order_number: string;
      client_id: number;
      subtotal: string;
      tax: string;
      total: string;
      fulfillmentStatus: string;
      created_at: Date;
    }[];

    console.log(`✓ Found ${orders.length} orders\n`);

    if (orders.length === 0) {
      console.log("⚠️  No orders found to create invoices from");
      process.exit(0);
    }

    console.log("📦 Phase 2: Creating invoices from orders...");

    let createdCount = 0;
    let paidCount = 0;
    let sentCount = 0;

    for (const order of orders) {
      // Generate invoice number from order number
      const invoiceNumber = order.order_number.replace("ORD-", "INV-");

      // Set invoice date to order date
      const invoiceDate = new Date(order.created_at);

      // Set due date to 30 days after invoice date
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Determine invoice status based on order fulfillment status
      // SHIPPED orders → PAID invoices (70%)
      // PACKED orders → SENT invoices (20%)
      // PENDING orders → DRAFT invoices (10%)
      let status: string;
      let amountPaid: number;
      let amountDue: number;

      if (order.fulfillmentStatus === "SHIPPED") {
        // 70% of shipped orders are paid
        if (Math.random() < 0.7) {
          status = "PAID";
          amountPaid = parseFloat(order.total);
          amountDue = 0;
          paidCount++;
        } else {
          status = "SENT";
          amountPaid = 0;
          amountDue = parseFloat(order.total);
          sentCount++;
        }
      } else if (order.fulfillmentStatus === "PACKED") {
        status = "SENT";
        amountPaid = 0;
        amountDue = parseFloat(order.total);
        sentCount++;
      } else {
        status = "DRAFT";
        amountPaid = 0;
        amountDue = parseFloat(order.total);
      }

      // Insert invoice
      await db.execute(sql`
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
          notes,
          referenceType,
          referenceId,
          createdBy
        ) VALUES (
          ${invoiceNumber},
          ${order.client_id},
          ${invoiceDate.toISOString().slice(0, 10)},
          ${dueDate.toISOString().slice(0, 10)},
          ${order.subtotal},
          ${order.tax},
          0.00,
          ${order.total},
          ${amountPaid},
          ${amountDue},
          ${status},
          'Net 30',
          ${`Auto-generated from order ${order.order_number}`},
          'order',
          ${order.id},
          1
        )
      `);

      createdCount++;
    }

    console.log(`✓ Created ${createdCount} invoices`);
    console.log(`  - ${paidCount} PAID`);
    console.log(`  - ${sentCount} SENT`);
    console.log(`  - ${createdCount - paidCount - sentCount} DRAFT\n`);

    // Phase 3: Validation
    console.log("✅ Phase 3: Validating seeded data...");

    const invoiceCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM invoices`
    );
    const statusDist = await db.execute(sql`
      SELECT status, COUNT(*) as count 
      FROM invoices 
      GROUP BY status
    `);

    console.log("📊 Summary:");
    console.log(
      `  - Total Invoices: ${(invoiceCount[0] as { count: number }[])[0].count}`
    );

    console.log("\n📈 Invoices by Status:");
    (statusDist[0] as { status: string; count: number }[]).forEach(row => {
      console.log(`  - ${row.status}: ${row.count}`);
    });

    // Show sample invoices
    const sampleInvoices = await db.execute(sql`
      SELECT 
        invoiceNumber,
        totalAmount,
        amountPaid,
        amountDue,
        status
      FROM invoices
      LIMIT 5
    `);
    console.log("\n📦 Sample Invoices:");
    (
      sampleInvoices[0] as {
        invoiceNumber: string;
        totalAmount: string;
        amountPaid: string;
        amountDue: string;
        status: string;
      }[]
    ).forEach(inv => {
      console.log(
        `  - ${inv.invoiceNumber}: $${inv.totalAmount} (Paid: $${inv.amountPaid}, Due: $${inv.amountDue}) [${inv.status}]`
      );
    });
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedInvoices();
