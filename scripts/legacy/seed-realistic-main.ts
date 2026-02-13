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

import { db } from "../db-sync.js";
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
  vendors,
} from "../../drizzle/schema.js";
import { CONFIG, applyScenario } from "../generators/config.js";
import { getScenario } from "../generators/scenarios.js";
import { generateAllClients } from "../generators/clients.js";
import { generateStrains } from "../generators/strains.js";
import { generateProducts } from "../generators/products.js";
import { generateLots, generateBatches } from "../generators/inventory.js";
import { generateOrders } from "../generators/orders.js";
import {
  generateInvoices,
  calculateARAgingSummary,
} from "../generators/invoices.js";
import {
  generateReturns,
  generateRefunds,
} from "../generators/returns-refunds.js";
import { formatCurrency } from "../generators/utils.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

// Vendor data pool - use slice based on CONFIG.totalVendors
const ALL_VENDORS = [
  { name: "NorCal Farms", contactName: "Mike Johnson", contactEmail: "mike@norcalfarms.com", contactPhone: "530-555-0101", notes: "Premium flower supplier" },
  { name: "Emerald Triangle Growers", contactName: "Sarah Chen", contactEmail: "sarah@emeraldtriangle.com", contactPhone: "707-555-0102", notes: "Outdoor specialist" },
  { name: "Humboldt Harvest Co", contactName: "Dave Wilson", contactEmail: "dave@humboldtharvest.com", contactPhone: "707-555-0103", notes: "Legacy cultivator" },
  { name: "Mendocino Gardens", contactName: "Lisa Park", contactEmail: "lisa@mendogardens.com", contactPhone: "707-555-0104", notes: "Organic certified" },
  { name: "Trinity Alps Cultivation", contactName: "Tom Brown", contactEmail: "tom@trinityalps.com", contactPhone: "530-555-0105", notes: "Mountain grown" },
  { name: "Sacramento Valley Farms", contactName: "Amy Lee", contactEmail: "amy@sacvalleyfarms.com", contactPhone: "916-555-0106", notes: "Large scale greenhouse" },
  { name: "Central Coast Growers", contactName: "Chris Martinez", contactEmail: "chris@centralcoast.com", contactPhone: "805-555-0107", notes: "SLO county specialist" },
  { name: "SoCal Premium Supply", contactName: "Jordan Taylor", contactEmail: "jordan@socalpremium.com", contactPhone: "619-555-0108", notes: "San Diego distributor" },
];

export async function seedRealisticData() {
  // Check if seeding is disabled via environment variable (case-insensitive)
  const skipSeeding = process.env.SKIP_SEEDING?.toUpperCase();
  if (skipSeeding === "TRUE" || skipSeeding === "1") {
    console.log("⚠️  Seeding is disabled via SKIP_SEEDING environment variable");
    console.log("   To enable seeding, remove SKIP_SEEDING or set it to false");
    return;
  }

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
    // Step 0: Clear existing data (ensures clean IDs)
    console.log("🗑️  Clearing existing data...");
    // Disable foreign key checks to allow deletion in any order
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    
    // Clear in reverse dependency order using TRUNCATE for speed and ID reset
    const tablesToClear = ['returns', 'invoices', 'orders', 'batches', 'lots', 'products', 'strains', 'clients', 'brands', 'vendors', 'users'];
    for (const tableName of tablesToClear) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE \`${tableName}\``));
      } catch (error: any) {
        // Table might not exist or be empty - continue
        if (error?.code !== 'ER_NO_SUCH_TABLE') {
          console.log(`   ⚠️  Warning clearing ${tableName}: ${error?.message || 'unknown error'}`);
        }
      }
    }
    
    // Re-enable foreign key checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    console.log("   ✓ Existing data cleared\n");

    // Step 1: Create Default User
    console.log("👤 Creating default user...");
    try {
      await db.insert(users).values({
        openId: "admin-seed-user",
        name: "Seed Admin",
        email: "admin@terp.local",
        role: "admin",
        lastSignedIn: new Date(2023, 10, 1),
      });
      console.log("   ✓ Default user created\n");
    } catch (error: any) {
      if (error?.cause?.code === 'ER_DUP_ENTRY') {
        console.log("   ✓ Default user already exists, skipping\n");
      } else {
        throw error;
      }
    }

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
    
    // Fetch actual inserted client IDs (critical for FK relationships)
    const insertedClients = await db.select({
      id: clients.id,
      name: clients.name
    }).from(clients).orderBy(clients.id);
    
    if (insertedClients.length !== allClients.length) {
      throw new Error(`Client insertion mismatch: expected ${allClients.length}, got ${insertedClients.length}`);
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

    // Step 5: Create Vendors (for lots FK relationship)
    console.log("🏭 Creating vendors...");
    // Use CONFIG.totalVendors to determine how many vendors to create
    // Use raw SQL to avoid schema mismatch (paymentTerms column doesn't exist in production)
    const vendorData = ALL_VENDORS.slice(0, CONFIG.totalVendors);
    for (const vendor of vendorData) {
      await db.execute(sql`
        INSERT INTO \`vendors\` (\`name\`, \`contactName\`, \`contactEmail\`, \`contactPhone\`, \`notes\`)
        VALUES (${vendor.name}, ${vendor.contactName}, ${vendor.contactEmail}, ${vendor.contactPhone}, ${vendor.notes})
      `);
    }
    
    // Fetch actual inserted vendor IDs (critical for FK relationships)
    const insertedVendors = await db.select({
      id: vendors.id,
      name: vendors.name
    }).from(vendors).orderBy(vendors.id);
    
    if (insertedVendors.length !== vendorData.length) {
      throw new Error(`Vendor insertion mismatch: expected ${vendorData.length}, got ${insertedVendors.length}`);
    }
    
    const vendorIds = insertedVendors.map(v => v.id);
    console.log(`   ✓ ${vendorData.length} vendors created\n`);

    // Step 6: Generate Lots
    console.log("📊 Generating lots...");
    const lotsData = generateLots(vendorIds);
    console.log(`   ✓ ${lotsData.length} lots created\n`);

    await db.insert(lots).values(lotsData);

    // Step 7: Generate Batches
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
    // Use actual inserted client IDs instead of assuming sequential IDs
    const whaleClientIds = insertedClients.slice(0, CONFIG.whaleClients).map(c => c.id);
    const regularClientIds = insertedClients.slice(
      CONFIG.whaleClients,
      CONFIG.whaleClients + CONFIG.regularClients
    ).map(c => c.id);
    
    if (whaleClientIds.length !== CONFIG.whaleClients) {
      throw new Error(`Whale client count mismatch: expected ${CONFIG.whaleClients}, got ${whaleClientIds.length}`);
    }
    if (regularClientIds.length !== CONFIG.regularClients) {
      throw new Error(`Regular client count mismatch: expected ${CONFIG.regularClients}, got ${regularClientIds.length}`);
    }
    
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
    
    // Fetch actual inserted order IDs (critical for returns FK relationship)
    const insertedOrders = await db.select({
      id: orders.id,
      clientId: orders.clientId,
      createdAt: orders.createdAt,
      total: orders.total,
      items: orders.items,
    }).from(orders).orderBy(orders.id);
    
    if (insertedOrders.length !== ordersData.length) {
      console.warn(`   ⚠️  Order insertion mismatch: expected ${ordersData.length}, got ${insertedOrders.length}`);
    }
    
    // Map database IDs back to ordersData for downstream use
    const ordersWithIds = insertedOrders.map((dbOrder, index) => ({
      ...ordersData[index],
      id: dbOrder.id,
    }));

    // Step 8: Generate Invoices
    console.log("💵 Generating invoices...");
    const invoicesData = generateInvoices(ordersWithIds);
    console.log(`   ✓ ${invoicesData.length} invoices created\n`);

    for (let i = 0; i < invoicesData.length; i += batchSize) {
      const batch = invoicesData.slice(i, i + batchSize);
      await db.insert(invoices).values(batch);
    }

    // Step 9: Generate Returns
    console.log("↩️  Generating returns...");
    const returnsData = generateReturns(ordersWithIds);
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
    const refundsData = generateRefunds(ordersWithIds);
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

    // Step 12: Validate FK integrity
    console.log("🔍 Validating data integrity...");
    const validationErrors: string[] = [];

    // Check lots → vendors FK
    const orphanedLots = await db.execute(sql`
      SELECT COUNT(*) as count FROM lots l
      LEFT JOIN vendors v ON l.vendorId = v.id
      WHERE v.id IS NULL
    `);
    const orphanedLotsCount = (orphanedLots[0] as any)?.[0]?.count || 0;
    if (orphanedLotsCount > 0) validationErrors.push(`${orphanedLotsCount} lots with invalid vendorId`);

    // Check invoices → orders FK (via referenceId)
    const orphanedInvoices = await db.execute(sql`
      SELECT COUNT(*) as count FROM invoices i
      LEFT JOIN orders o ON i.referenceId = o.id
      WHERE i.referenceType = 'ORDER' AND o.id IS NULL
    `);
    const orphanedInvoicesCount = (orphanedInvoices[0] as any)?.[0]?.count || 0;
    if (orphanedInvoicesCount > 0) validationErrors.push(`${orphanedInvoicesCount} invoices with invalid referenceId`);

    // Check batches → products FK
    const orphanedBatches = await db.execute(sql`
      SELECT COUNT(*) as count FROM batches b
      LEFT JOIN products p ON b.productId = p.id
      WHERE p.id IS NULL
    `);
    const orphanedBatchesCount = (orphanedBatches[0] as any)?.[0]?.count || 0;
    if (orphanedBatchesCount > 0) validationErrors.push(`${orphanedBatchesCount} batches with invalid productId`);

    if (validationErrors.length > 0) {
      console.error("   ❌ Validation FAILED:");
      validationErrors.forEach(err => console.error(`      - ${err}`));
    } else {
      console.log("   ✓ All FK relationships valid\n");
    }

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
    console.log(`   1-30 days: ${formatCurrency(arSummary.overdue1_30)}`);
    console.log(`   31-60 days: ${formatCurrency(arSummary.overdue31_60)}`);
    console.log(`   61-90 days: ${formatCurrency(arSummary.overdue61_90)}`);
    console.log(`   91-120 days: ${formatCurrency(arSummary.overdue91_120)}`);
    console.log(`   120+ days: ${formatCurrency(arSummary.overdue120Plus)}`);
    console.log(`   Total: ${formatCurrency(arSummary.totalAR)}`);
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

// IMPORTANT:
// Do NOT auto-run this module.
//
// This file is imported into the server bundle (see `server/routers/settings.ts`),
// and when bundled by esbuild into `dist/index.js`, "main module" checks can
// accidentally evaluate true and cause seeding to run during normal web startup.
//
// Use `scripts/seed-realistic-runner.ts` as the CLI entrypoint instead.
