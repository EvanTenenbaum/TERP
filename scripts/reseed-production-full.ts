/**
 * Full Production Re-Seeding Script
 *
 * Re-seeds the complete data chain with improved generators:
 * - Clients (CA-focused, cannabis-themed)
 * - Lots (vendor receiving)
 * - Batches (inventory with Pareto weights)
 * - Orders (with Pareto distribution and anomalies)
 *
 * Preserves: strains (12,762), products (560), brands, users
 *
 * Usage:
 *   tsx scripts/reseed-production-full.ts
 */

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";
import { generateAllClients } from "./generators/clients.js";
import { generateLots, generateBatches } from "./generators/inventory.js";
import { generateOrders } from "./generators/orders.js";

async function reseedFull() {
  console.log("\n🔄 TERP Full Production Re-Seeding");
  console.log("=".repeat(60));
  console.log("✅ Preserves: strains (12,762), products (560)");
  console.log("🔄 Re-generates: clients, lots, batches, orders");
  console.log("=".repeat(60) + "\n");

  try {
    // Step 1: Clear existing data (cascade will handle orders/invoices)
    console.log("🗑️  Clearing old data...");
    await db.execute(sql`DELETE FROM batches`);
    console.log("   ✓ Cleared batches");
    await db.execute(sql`DELETE FROM lots`);
    console.log("   ✓ Cleared lots");
    await db.execute(sql`DELETE FROM clients`);
    console.log("   ✓ Cleared clients\n");

    // Step 2: Verify preserved data
    const strainCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM strains`
    );
    const productCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM products`
    );
    const strains = (strainCount[0] as unknown as Array<{ count: number }>)[0]
      .count;
    const products = (productCount[0] as unknown as Array<{ count: number }>)[0]
      .count;
    console.log(`🌿 Verified: ${strains} strains preserved`);
    console.log(`📦 Verified: ${products} products preserved\n`);

    // Step 3: Generate clients
    console.log("👥 Generating clients (CA-focused, cannabis-themed)...");
    const allClients = generateAllClients();

    // Get vendor clients for lots
    const vendorClients = allClients.filter(c => c.isSeller);

    // Insert clients
    for (const client of allClients) {
      await db.execute(sql`
        INSERT INTO clients (
          teri_code, name, email, phone, address,
          is_buyer, is_seller, is_brand,
          tags, created_at
        ) VALUES (
          ${client.teriCode},
          ${client.name},
          ${client.email},
          ${client.phone},
          ${client.address},
          ${client.isBuyer ? 1 : 0},
          ${client.isSeller ? 1 : 0},
          ${client.isBrand ? 1 : 0},
          ${JSON.stringify(client.tags)},
          ${client.createdAt}
        )
      `);
    }
    console.log(`   ✓ ${allClients.length} clients inserted`);
    console.log(`   ✓ ${vendorClients.length} vendors for inventory\n`);

    // Step 4: Get client IDs from database
    const clientsResult = await db.execute(
      sql`SELECT id, is_seller FROM clients ORDER BY id`
    );
    const clientIds = clientsResult[0] as unknown as Array<{
      id: number;
      is_seller: number;
    }>;
    const vendorIds = clientIds.filter(c => c.is_seller === 1).map(c => c.id);

    console.log(`   ✓ Retrieved ${clientIds.length} client IDs`);
    console.log(`   ✓ ${vendorIds.length} vendor IDs for lots\n`);

    // Step 5: Generate lots
    console.log("📦 Generating lots (vendor receiving)...");
    const lotsData = generateLots(vendorIds);

    for (const lot of lotsData) {
      await db.execute(sql`
        INSERT INTO lots (code, vendorId, date, notes, createdAt)
        VALUES (
          ${lot.code},
          ${lot.vendorId},
          ${lot.date},
          ${lot.notes},
          ${lot.createdAt}
        )
      `);
    }
    console.log(`   ✓ ${lotsData.length} lots inserted\n`);

    // Step 6: Get lot and product IDs
    const lotsResult = await db.execute(sql`SELECT id FROM lots ORDER BY id`);
    const lotIds = (lotsResult[0] as unknown as Array<{ id: number }>).map(
      l => l.id
    );

    const productsResult = await db.execute(
      sql`SELECT id FROM products ORDER BY id`
    );
    const productIds = (
      productsResult[0] as unknown as Array<{ id: number }>
    ).map(p => p.id);

    console.log(`   ✓ Retrieved ${lotIds.length} lot IDs`);
    console.log(`   ✓ Retrieved ${productIds.length} product IDs\n`);

    // Step 7: Generate batches
    console.log("📦 Generating batches (inventory)...");
    const batchesData = generateBatches(productIds, lotIds, vendorIds);

    for (const batch of batchesData) {
      await db.execute(sql`
        INSERT INTO batches (
          code, sku, productId, lotId, batchStatus, grade,
          isSample, sampleOnly, sampleAvailable,
          cogsMode, unitCogs, unitCogsMin, unitCogsMax,
          paymentTerms, amountPaid,
          onHandQty, sampleQty, reservedQty, quarantineQty, holdQty, defectiveQty,
          publishEcom, publishB2b, createdAt
        ) VALUES (
          ${batch.code},
          ${batch.sku},
          ${batch.productId},
          ${batch.lotId},
          ${batch.status},
          ${batch.grade},
          ${batch.isSample},
          ${batch.sampleOnly},
          ${batch.sampleAvailable},
          ${batch.cogsMode},
          ${batch.unitCogs},
          ${batch.unitCogsMin},
          ${batch.unitCogsMax},
          ${batch.paymentTerms},
          ${batch.amountPaid},
          ${batch.onHandQty},
          ${batch.sampleQty},
          ${batch.reservedQty},
          ${batch.quarantineQty},
          ${batch.holdQty},
          ${batch.defectiveQty},
          ${batch.publishEcom},
          ${batch.publishB2b},
          ${batch.createdAt}
        )
      `);
    }
    console.log(`   ✓ ${batchesData.length} batches inserted\n`);

    // Step 8: Get batch IDs
    const batchesResult = await db.execute(
      sql`SELECT id FROM batches ORDER BY id`
    );
    const batchIds = (batchesResult[0] as unknown as Array<{ id: number }>).map(
      b => b.id
    );
    console.log(`   ✓ Retrieved ${batchIds.length} batch IDs\n`);

    // Step 9: Generate orders with Pareto distribution
    console.log("📋 Generating orders (Pareto distribution + anomalies)...");

    // Separate whale and regular clients
    const whaleClientIds = clientIds
      .filter(c => c.is_seller === 0)
      .slice(0, 10)
      .map(c => c.id);
    const regularClientIds = clientIds
      .filter(c => c.is_seller === 0)
      .slice(10)
      .map(c => c.id);

    console.log(`   ✓ ${whaleClientIds.length} whale clients`);
    console.log(`   ✓ ${regularClientIds.length} regular clients`);

    // Create batch objects for order generator
    const batchObjects = batchIds.map((id, index) => ({
      id,
      productId: productIds[index % productIds.length],
      unitCogs: batchesData[index % batchesData.length].unitCogs,
      paymentTerms: batchesData[index % batchesData.length].paymentTerms,
    }));

    const ordersData = generateOrders(
      whaleClientIds,
      regularClientIds,
      batchObjects
    );

    console.log(`   ✓ ${ordersData.length} orders generated`);
    console.log("   ⏳ Inserting orders (this may take a few minutes)...\n");

    // Insert orders (this is the slow part)
    let inserted = 0;
    for (const order of ordersData) {
      await db.execute(sql`
        INSERT INTO orders (
          order_number, orderType, client_id, items,
          subtotal, tax, discount, total,
          total_cogs, total_margin, avg_margin_percent,
          paymentTerms, saleStatus, fulfillmentStatus,
          created_by, created_at, is_draft
        ) VALUES (
          ${order.orderNumber},
          ${order.orderType},
          ${order.clientId},
          ${JSON.stringify(order.items)},
          ${order.subtotal},
          ${order.tax},
          ${order.discount},
          ${order.total},
          ${order.totalCogs},
          ${order.totalMargin},
          ${order.avgMarginPercent},
          ${order.paymentTerms},
          ${order.saleStatus},
          ${order.fulfillmentStatus},
          1,
          ${order.createdAt},
          0
        )
      `);

      inserted++;
      if (inserted % 100 === 0) {
        console.log(
          `   ⏳ Inserted ${inserted}/${ordersData.length} orders...`
        );
      }
    }
    console.log(`   ✓ ${ordersData.length} orders inserted\n`);

    // Final summary
    console.log("=".repeat(60));
    console.log("✅ Full production re-seeding complete!");
    console.log("=".repeat(60));
    console.log(`🌿 Strains: ${strains} (preserved)`);
    console.log(`📦 Products: ${products} (preserved)`);
    console.log(`👥 Clients: ${allClients.length} (new, CA-focused)`);
    console.log(`📦 Lots: ${lotsData.length} (new)`);
    console.log(`📦 Batches: ${batchesData.length} (new)`);
    console.log(`📋 Orders: ${ordersData.length} (new, Pareto distribution)`);
    console.log("=".repeat(60));
    console.log("\n✨ Improvements applied:");
    console.log(
      "   ✅ Pareto distribution (80/20 rule) for product popularity"
    );
    console.log("   ✅ Long-tail item counts (2-5 items per order)");
    console.log("   ✅ Margin outliers (high and low)");
    console.log("   ✅ Small and large order edge cases");
    console.log("   ✅ CA-focused client addresses");
    console.log("   ✅ Cannabis-themed business names\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during re-seeding:");
    console.error(error);
    process.exit(1);
  }
}

reseedFull();
