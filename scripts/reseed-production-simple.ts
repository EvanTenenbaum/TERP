/**
 * Simple Production Re-Seeding Script
 *
 * This script re-seeds only clients and orders with the improved generators.
 * It preserves strains and uses existing products/batches.
 *
 * Usage:
 *   tsx scripts/reseed-production-simple.ts
 */

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";
import { generateAllClients } from "./generators/clients.js";

async function reseedSimple() {
  console.log("\n🔄 TERP Simple Production Re-Seeding");
  console.log("=".repeat(60));
  console.log("✅ Preserves: strains, products, batches, lots");
  console.log("🔄 Re-generates: clients only");
  console.log("=".repeat(60) + "\n");

  try {
    // Step 1: Clear clients (and cascading orders/invoices)
    console.log("🗑️  Clearing clients (and related orders/invoices)...");
    await db.execute(sql`DELETE FROM clients`);
    console.log("   ✓ Cleared\n");

    // Step 2: Verify strains preserved
    const strainCount = await db.execute(
      sql`SELECT COUNT(*) as count FROM strains`
    );
    const countResult = strainCount[0] as unknown as Array<{ count: number }>;
    const count = countResult[0].count;
    console.log(`🌿 Verified: ${count} strains preserved\n`);

    // Step 3: Generate improved client data
    console.log(
      "👥 Generating improved clients (CA-focused, cannabis-themed)..."
    );
    const allClients = generateAllClients();

    // Insert clients with raw SQL to handle schema differences
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

    console.log(`   ✓ ${allClients.length} clients inserted\n`);

    // Final summary
    console.log("=".repeat(60));
    console.log("✅ Simple re-seeding complete!");
    console.log("=".repeat(60));
    console.log(`🌿 Strains: ${count} (preserved)`);
    console.log(`👥 Clients: ${allClients.length} (new, CA-focused)`);
    console.log(`📦 Products: preserved`);
    console.log(`📦 Batches: preserved`);
    console.log("=".repeat(60));
    console.log("\n⚠️  Note: Orders will need to be regenerated separately");
    console.log("   using the existing batches and new clients.\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during re-seeding:");
    console.error(error);
    process.exit(1);
  }
}

reseedSimple();
