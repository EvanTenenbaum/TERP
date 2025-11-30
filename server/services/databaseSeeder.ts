// server/services/databaseSeeder.ts
/**
 * Realistic Mock Data Generator - Main Orchestrator
 */

import { db } from "../scripts/db-sync.js";
import { applyScenario, CONFIG } from "../scripts/generators/config.js";
import { getScenario } from "../scripts/generators/scenarios.js";
import { generateAllClients } from "../scripts/generators/clients.js";
import { generateStrains } from "../scripts/generators/strains.js";
import { generateProducts } from "../scripts/generators/products.js";
import { generateLots, generateBatches } from "../scripts/generators/inventory.js";
import { generateOrders } from "../scripts/generators/orders.js";
import { generateInvoices } from "../scripts/generators/invoices.js";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { formatCurrency } from "../scripts/generators/utils.js";

export async function seedDatabase(scenarioName: string) {
  try {
    console.log("\n🚀 TERP Realistic Data Generator");
    console.log("=".repeat(50));

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

    // Step 0: Clear existing data (ensures clean IDs)
    console.log("🗑️  Clearing existing data...");
    // Disable foreign key checks to allow deletion in any order
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

    // Clear in reverse dependency order using TRUNCATE for speed and ID reset
    const tablesToClear = [
      "returns",
      "invoices",
      "orders",
      "batches",
      "lots",
      "products",
      "strains",
      "clients",
      "brands",
      "vendors",
      "users",
    ];
    for (const tableName of tablesToClear) {
      try {
        await db.execute(sql.raw(`TRUNCATE TABLE \`${tableName}\``));
      } catch (error: any) {
        // Table might not exist or be empty - continue
        if (error?.message?.includes("doesn't exist")) {
          console.warn(`Table ${tableName} does not exist. Skipping...`);
        } else {
          console.error(`Error truncating table ${tableName}:`, error);
          throw new Error(`Failed to truncate table ${tableName}: ${error.message}`);
        }
      }
    }
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

    console.log("🌱 Generating clients...");
    await generateAllClients();

    console.log("🌱 Generating strains...");
    await generateStrains();

    console.log("🌱 Generating products...");
    await generateProducts();

    console.log("🌱 Generating batches and lots...");
    await generateBatches();
    await generateLots();

    console.log("🌱 Generating orders...");
    await generateOrders();

    console.log("🌱 Generating invoices...");
    await generateInvoices();

    console.log("✅ Database seeded successfully!");

    return {
      success: true,
      message: `Database seeded successfully with ${scenarioName} scenario`,
    };
  } catch (error: any) {
    console.error("❌ Database seeding failed:", error);
    return {
      success: false,
      message: `Database seeding failed: ${error.message}`,
    };
  }
}
