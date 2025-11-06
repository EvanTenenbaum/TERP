/**
 * Realistic Mock Data Generator - Main Orchestrator
 *
 * Supports multiple scenarios for different testing needs:
 * - light: Fast seed for integration tests (~30s)
 * - full: Complete dataset for E2E tests (~2min)
 * - edgeCases: Extreme scenarios for stress testing (~45s)
 * - chaos: Random anomalies for chaos testing (~60s)
 *
 * Usage:
 *   pnpm seed                    # Uses "full" scenario (default)
 *   pnpm seed light              # Uses "light" scenario
 *   pnpm seed edgeCases          # Uses "edgeCases" scenario
 *   pnpm seed chaos              # Uses "chaos" scenario
 */

import { db } from "./db-sync.js";
import {
  clients,
  strains,
  products,
  lots,
  batches,
  orders,
  invoices,
  brands,
  users,
  returns,
} from "../drizzle/schema.js";
import { CONFIG, applyScenario } from "./generators/config.js";
import { getScenario } from "./generators/scenarios.js";
import { generateAllClients } from "./generators/clients.js";
import { generateStrains } from "./generators/strains.js";
import { generateProducts } from "./generators/products.js";
import { generateLots, generateBatches } from "./generators/inventory.js";
import { generateOrders } from "./generators/orders.js";
import {
  generateInvoices,
  calculateARAgingSummary,
} from "./generators/invoices.js";
import {
  generateReturns,
  generateRefunds,
} from "./generators/returns-refunds.js";
import { formatCurrency } from "./generators/utils.js";
import { faker } from "@faker-js/faker";

async function seedRealisticData() {
  // Get scenario from command line args (default to "full")
  const scenarioName = process.argv[2] || "full";

  console.log("\n🚀 TERP Realistic Data Generator");
  console.log("=".repeat(50));

  try {
    const scenario = getScenario(scenarioName);
    console.log(`📋 Scenario: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);

    // Apply scenario to CONFIG
    applyScenario(scenario);

    // Set deterministic seed for Faker if provided
    if (CONFIG.seed) {
      faker.seed(CONFIG.seed);
      console.log(`🎲 Random seed: ${CONFIG.seed} (deterministic)`);
    } else {
      console.log(`🎲 Random seed: ${Date.now()} (non-deterministic)`);
    }

    console.log("=".repeat(50));
    console.log(
      `📅 Period: ${CONFIG.startDate.toLocaleDateString()} - ${CONFIG.endDate.toLocaleDateString()}`
    );
    console.log(`💰 Target Revenue: ${formatCurrency(CONFIG.totalRevenue)}`);
    console.log(
      `👥 Clients: ${CONFIG.totalClients} (${CONFIG.whaleClients} whales, ${CONFIG.regularClients} regular)`
    );
    console.log(`🏭 Vendors: ${CONFIG.totalVendors}`);
    console.log(`📦 Orders: ~${CONFIG.ordersPerMonth * CONFIG.totalMonths}`);
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error(`❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }

  try {
    // Step 0: Create Default User
    console.log("👤 Creating default user...");
    await db.insert(users).values({
      openId: "admin-seed-user",
      name: "Seed Admin",
      email: "admin@terp.local",
      role: "admin",
      lastSignedIn: new Date(2023, 10, 1),
    });
    console.log("   ✓ Default user created\n");

    // Step 1: Generate Clients
    console.log("👥 Generating clients...");
    const allClients = generateAllClients();
    const whaleClients = allClients.slice(0, CONFIG.whaleClients);
    const regularClients = allClients.slice(
      CONFIG.whaleClients,
      CONFIG.whaleClients + CONFIG.regularClients
    );
    const vendorClients = allClients.slice(
      CONFIG.whaleClients + CONFIG.regularClients
    );

    console.log(`   ✓ ${whaleClients.length} whale clients`);
    console.log(`   ✓ ${regularClients.length} regular clients`);
    console.log(`   ✓ ${vendorClients.length} vendor clients`);
    console.log(`   ✓ ${allClients.length} total clients\n`);

    // Insert clients in batches of 10 to avoid query size limits
    const batchSize = 10;
    for (let i = 0; i < allClients.length; i += batchSize) {
      const batch = allClients.slice(i, i + batchSize);
      await db.insert(clients).values(batch);
    }

    // Step 2: Create Default Brand
    console.log("🏷️  Creating default brand...");
    await db.insert(brands).values({
      name: "TERP House Brand",
      description: "Default brand for all products",
      createdAt: new Date(2023, 10, 1),
    });
    console.log("   ✓ Default brand created\n");

    // Step 3: Generate Strains
    console.log("🌿 Generating strains...");
    const strainsData = generateStrains();
    console.log(`   ✓ ${strainsData.length} strains with normalized names\n`);

    await db.insert(strains).values(strainsData);

    // Step 4: Generate Products
    console.log("📦 Generating products...");
    const productsData = generateProducts();
    const flowerProducts = productsData.filter(p => p.category === "Flower");
    const nonFlowerProducts = productsData.filter(p => p.category !== "Flower");
    console.log(`   ✓ ${flowerProducts.length} flower products`);
    console.log(`   ✓ ${nonFlowerProducts.length} non-flower products`);
    console.log(`   ✓ ${productsData.length} total products\n`);

    await db.insert(products).values(productsData);

    // Step 5: Generate Lots
    console.log("📊 Generating lots...");
    const vendorIds = vendorClients.map(
      (_, index) => CONFIG.whaleClients + CONFIG.regularClients + index + 1
    );
    const lotsData = generateLots(vendorIds);
    console.log(`   ✓ ${lotsData.length} lots created\n`);

    await db.insert(lots).values(lotsData);

    // Step 6: Generate Batches
    console.log("📦 Generating batches...");
    const productIds = Array.from(
      { length: productsData.length },
      (_, i) => i + 1
    );
    const lotIds = Array.from({ length: lotsData.length }, (_, i) => i + 1);
    const batchesData = generateBatches(productIds, lotIds, vendorIds);
    console.log(`   ✓ ${batchesData.length} batches created\n`);

    await db.insert(batches).values(batchesData);

    // Step 7: Generate Orders
    console.log("🛍️ Generating orders...");
    const whaleClientIds = Array.from(
      { length: whaleClients.length },
      (_, i) => i + 1
    );
    const regularClientIds = Array.from(
      { length: regularClients.length },
      (_, i) => whaleClients.length + i + 1
    );
    const ordersData = generateOrders(
      whaleClientIds,
      regularClientIds,
      batchesData
    );
    console.log(`   ✓ ${ordersData.length} orders created\n`);

    for (let i = 0; i < ordersData.length; i += batchSize) {
      const batch = ordersData.slice(i, i + batchSize);
      await db.insert(orders).values(batch);
    }

    // Step 8: Generate Invoices
    console.log("💵 Generating invoices...");
    const invoicesData = generateInvoices(ordersData);
    console.log(`   ✓ ${invoicesData.length} invoices created\n`);

    for (let i = 0; i < invoicesData.length; i += batchSize) {
      const batch = invoicesData.slice(i, i + batchSize);
      await db.insert(invoices).values(batch);
    }

    // Step 9: Generate Returns
    console.log("↩️  Generating returns...");
    const returnsData = generateReturns(ordersData);
    console.log(`   ✓ ${returnsData.length} returns created\n`);

    if (returnsData.length > 0) {
      for (let i = 0; i < returnsData.length; i += batchSize) {
        const batch = returnsData.slice(i, i + batchSize);
        await db.insert(returns).values(batch);
      }
    }

    // Step 10: Generate Refunds
    // TODO: Refunds should be inserted into transactions table, not orders
    // Commenting out for now until proper refunds implementation
    console.log("💸 Generating refunds...");
    const refundsData = generateRefunds(ordersData);
    console.log(
      `   ✓ ${refundsData.length} refunds created (not inserted - needs transactions table)\n`
    );

    // if (refundsData.length > 0) {
    //   for (let i = 0; i < refundsData.length; i += batchSize) {
    //     const batch = refundsData.slice(i, i + batchSize);
    //     await db.insert(transactions).values(batch);  // TODO: Map RefundData to transaction format
    //   }
    // }

    // Step 11: Calculate Summary Statistics
    console.log("📊 Calculating summary statistics...");
    const arSummary = calculateARAgingSummary(invoicesData);

    console.log("\n" + "=".repeat(50));
    console.log("✅ DATA GENERATION COMPLETE");
    console.log("=".repeat(50));
    console.log(`📋 Scenario: ${getScenario(process.argv[2] || "full").name}`);
    console.log(`👥 Clients: ${allClients.length}`);
    console.log(`🌿 Strains: ${strainsData.length}`);
    console.log(`📦 Products: ${productsData.length}`);
    console.log(`📊 Lots: ${lotsData.length}`);
    console.log(`📦 Batches: ${batchesData.length}`);
    console.log(`🛒 Orders: ${ordersData.length}`);
    console.log(`💵 Invoices: ${invoicesData.length}`);
    console.log(`↩️  Returns: ${returnsData.length}`);
    console.log(`💸 Refunds: ${refundsData.length}`);
    console.log("\n💰 AR Aging Summary:");
    console.log(`   Current: ${formatCurrency(arSummary.current)}`);
    console.log(`   1-30 days: ${formatCurrency(arSummary.days30)}`);
    console.log(`   31-60 days: ${formatCurrency(arSummary.days60)}`);
    console.log(`   61-90 days: ${formatCurrency(arSummary.days90)}`);
    console.log(`   91-120 days: ${formatCurrency(arSummary.days120)}`);
    console.log(`   120+ days: ${formatCurrency(arSummary.days120Plus)}`);
    console.log(`   Total: ${formatCurrency(arSummary.total)}`);
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

// Run the seed function
seedRealisticData()
  .then(() => {
    console.log("✅ Seeding completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
