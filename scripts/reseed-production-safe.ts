/**
 * Safe Production Re-Seeding Script
 *
 * This script safely re-seeds the production database with improved data
 * while preserving the existing 12,762 strain records.
 *
 * What it does:
 * 1. Clears: clients, products, orders, batches, lots, invoices, returns
 * 2. Preserves: strains (12,762 records), brands, users
 * 3. Re-seeds with improved generators (Pareto distribution, CA addresses, etc.)
 *
 * Usage:
 *   tsx scripts/reseed-production-safe.ts
 */

import { db } from "./db-sync.js";
import {
  clients,
  products,
  lots,
  batches,
  orders,
  invoices,
  returns,
} from "../drizzle/schema.js";

import { generateAllClients } from "./generators/clients.js";
import { generateProducts } from "./generators/products.js";
import { generateLots, generateBatches } from "./generators/inventory.js";
import { generateOrders } from "./generators/orders.js";
import { generateInvoices } from "./generators/invoices.js";
import { generateReturns } from "./generators/returns-refunds.js";

import { sql } from "drizzle-orm";

async function reseedProduction() {
  console.log("\n🔄 TERP Production Re-Seeding (Safe Mode)");
  console.log("=".repeat(60));
  console.log("⚠️  This will clear and re-seed production data");
  console.log("✅ Strains will be PRESERVED (12,762 records)");
  console.log("=".repeat(60) + "\n");

  try {
    // Step 1: Clear tables (preserve strains, brands, users)
    console.log("🗑️  Clearing old data...");

    await db.delete(returns);
    console.log("   ✓ Cleared returns");

    await db.delete(invoices);
    console.log("   ✓ Cleared invoices");

    await db.delete(orders);
    console.log("   ✓ Cleared orders");

    await db.delete(batches);
    console.log("   ✓ Cleared batches");

    await db.delete(lots);
    console.log("   ✓ Cleared lots");

    await db.delete(products);
    console.log("   ✓ Cleared products");

    await db.delete(clients);
    console.log("   ✓ Cleared clients");

    console.log("   ✅ Old data cleared (strains preserved)\n");

    // Step 2: Verify strains are still there
    const strainCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM strains`
    );
    const count = (strainCount.rows[0] as { count: number }).count;
    console.log(`🌿 Verified: ${count} strains preserved\n`);

    // Step 3: Generate improved client data
    console.log(
      "👥 Generating improved clients (CA-focused, cannabis-themed)..."
    );
    const allClients = generateAllClients();

    // Convert to snake_case for production schema
    const clientsForDb = allClients.map(client => ({
      teri_code: client.teriCode,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      is_buyer: client.isBuyer ? 1 : 0,
      is_seller: client.isSeller ? 1 : 0,
      is_brand: client.isBrand ? 1 : 0,
      tags: JSON.stringify(client.tags),
      created_at: client.createdAt,
    }));

    console.log(`   ✓ ${allClients.length} clients generated`);

    // Insert in batches
    const batchSize = 10;
    for (let i = 0; i < clientsForDb.length; i += batchSize) {
      const batch = clientsForDb.slice(i, i + batchSize);
      await db.execute(sql`
        INSERT INTO clients (teri_code, name, email, phone, address, is_buyer, is_seller, is_brand, tags, created_at)
        VALUES ${sql.join(
          batch.map(
            c =>
              sql`(${c.teri_code}, ${c.name}, ${c.email}, ${c.phone}, ${c.address}, ${c.is_buyer}, ${c.is_seller}, ${c.is_brand}, ${c.tags}, ${c.created_at})`
          ),
          sql`, `
        )}
      `);
    }
    console.log("   ✅ Clients inserted\n");

    // Step 4: Generate products (using existing strains)
    console.log("📦 Generating products (using existing strains)...");
    const productsData = generateProducts();

    // Map to existing strain IDs (1-12762)
    const productsForDb = productsData.map(product => ({
      ...product,
      strainId: Math.floor(Math.random() * count) + 1, // Random strain from existing
    }));

    await db.insert(products).values(productsForDb);
    console.log(`   ✓ ${productsData.length} products generated\n`);

    // Step 5: Generate inventory (lots and batches)
    console.log("📦 Generating inventory...");
    const lotsData = generateLots(productsData);
    await db.insert(lots).values(lotsData);
    console.log(`   ✓ ${lotsData.length} lots generated`);

    const batchesData = generateBatches(lotsData, productsData);

    // Insert batches in smaller batches
    for (let i = 0; i < batchesData.length; i += 50) {
      const batch = batchesData.slice(i, i + 50);
      await db.insert(batches).values(batch);
    }
    console.log(`   ✓ ${batchesData.length} batches generated\n`);

    // Step 6: Generate orders (with Pareto distribution)
    console.log("📋 Generating orders (with Pareto distribution)...");
    const ordersData = generateOrders(allClients, batchesData);

    for (let i = 0; i < ordersData.length; i += 50) {
      const batch = ordersData.slice(i, i + 50);
      await db.insert(orders).values(batch);
    }
    console.log(`   ✓ ${ordersData.length} orders generated\n`);

    // Step 7: Generate invoices
    console.log("💰 Generating invoices...");
    const invoicesData = generateInvoices(ordersData, allClients);

    for (let i = 0; i < invoicesData.length; i += 50) {
      const batch = invoicesData.slice(i, i + 50);
      await db.insert(invoices).values(batch);
    }
    console.log(`   ✓ ${invoicesData.length} invoices generated\n`);

    // Step 8: Generate returns
    console.log("↩️  Generating returns...");
    const returnsData = generateReturns(ordersData, batchesData);

    if (returnsData.length > 0) {
      for (let i = 0; i < returnsData.length; i += 50) {
        const batch = returnsData.slice(i, i + 50);
        await db.insert(returns).values(batch);
      }
    }
    console.log(`   ✓ ${returnsData.length} returns generated\n`);

    // Final summary
    console.log("=".repeat(60));
    console.log("✅ Production re-seeding complete!");
    console.log("=".repeat(60));
    console.log(`🌿 Strains: ${count} (preserved)`);
    console.log(`👥 Clients: ${allClients.length} (new, CA-focused)`);
    console.log(`📦 Products: ${productsData.length} (new)`);
    console.log(`📦 Batches: ${batchesData.length} (new)`);
    console.log(`📋 Orders: ${ordersData.length} (new, Pareto distribution)`);
    console.log(`💰 Invoices: ${invoicesData.length} (new)`);
    console.log(`↩️  Returns: ${returnsData.length} (new)`);
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during re-seeding:");
    console.error(error);
    process.exit(1);
  }
}

reseedProduction();
