/**
 * QA Data Seeder
 * TERP-0011: Create QA test data seeding script and registry
 *
 * Creates QA-prefixed test data for deterministic automated testing.
 * - QA_* locations
 * - QA_* customers (clients)
 * - QA_* SKUs (products and batches)
 * - QA_* vendor records (supplier clients)
 *
 * Usage:
 *   pnpm seed:qa-data
 *   tsx scripts/seed-qa-data.ts
 *   tsx scripts/seed-qa-data.ts --dry-run
 *
 * SECURITY: This data is for development/QA/staging only.
 *
 * @module scripts/seed-qa-data
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, like, and, isNull } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

// Registry file path
const REGISTRY_PATH = path.join(
  process.cwd(),
  "docs",
  "qa",
  "QA_DATA_REGISTRY.json"
);

interface QaDataRegistry {
  lastUpdated: string;
  locations: Array<{ id: number; name: string }>;
  clients: Array<{
    id: number;
    name: string;
    type: "buyer" | "seller" | "both";
  }>;
  products: Array<{ id: number; name: string; sku: string }>;
  batches: Array<{ id: number; sku: string; productName: string }>;
}

// Check for dry-run mode
const isDryRun = process.argv.includes("--dry-run");

/**
 * QA Location definitions
 */
const QA_LOCATIONS = [
  {
    name: "QA_Warehouse_Main",
    description: "Main QA warehouse for testing",
    locationType: "warehouse" as const,
  },
  {
    name: "QA_Warehouse_Overflow",
    description: "Overflow QA warehouse",
    locationType: "warehouse" as const,
  },
  {
    name: "QA_Staging_Area",
    description: "QA staging area for intake",
    locationType: "staging" as const,
  },
  {
    name: "QA_Quarantine",
    description: "QA quarantine zone for holds",
    locationType: "quarantine" as const,
  },
  {
    name: "QA_Vault",
    description: "QA secure vault storage",
    locationType: "vault" as const,
  },
];

/**
 * QA Customer (buyer) definitions
 */
const QA_CUSTOMERS = [
  {
    name: "QA_Customer_Standard",
    email: "qa.customer.standard@terp.test",
    isBuyer: true,
    isSeller: false,
  },
  {
    name: "QA_Customer_VIP",
    email: "qa.customer.vip@terp.test",
    isBuyer: true,
    isSeller: false,
  },
  {
    name: "QA_Customer_Wholesale",
    email: "qa.customer.wholesale@terp.test",
    isBuyer: true,
    isSeller: false,
  },
  {
    name: "QA_Customer_Retail",
    email: "qa.customer.retail@terp.test",
    isBuyer: true,
    isSeller: false,
  },
  {
    name: "QA_Customer_Credit_Test",
    email: "qa.customer.credit@terp.test",
    isBuyer: true,
    isSeller: false,
  },
];

/**
 * QA Vendor (seller) definitions
 */
const QA_VENDORS = [
  {
    name: "QA_Vendor_Primary",
    email: "qa.vendor.primary@terp.test",
    isBuyer: false,
    isSeller: true,
  },
  {
    name: "QA_Vendor_Backup",
    email: "qa.vendor.backup@terp.test",
    isBuyer: false,
    isSeller: true,
  },
  {
    name: "QA_Vendor_Premium",
    email: "qa.vendor.premium@terp.test",
    isBuyer: false,
    isSeller: true,
  },
  {
    name: "QA_Vendor_Wholesale",
    email: "qa.vendor.wholesale@terp.test",
    isBuyer: false,
    isSeller: true,
  },
];

/**
 * QA Product definitions
 */
const QA_PRODUCTS = [
  {
    name: "QA_Product_Flower_Indica",
    sku: "QA-FLW-IND-001",
    category: "Flower",
    thcPercent: "22.5",
  },
  {
    name: "QA_Product_Flower_Sativa",
    sku: "QA-FLW-SAT-001",
    category: "Flower",
    thcPercent: "24.0",
  },
  {
    name: "QA_Product_Flower_Hybrid",
    sku: "QA-FLW-HYB-001",
    category: "Flower",
    thcPercent: "21.0",
  },
  {
    name: "QA_Product_Concentrate_Wax",
    sku: "QA-CON-WAX-001",
    category: "Concentrate",
    thcPercent: "85.0",
  },
  {
    name: "QA_Product_Edible_Gummy",
    sku: "QA-EDI-GUM-001",
    category: "Edible",
    thcPercent: "10.0",
  },
  {
    name: "QA_Product_Preroll_Single",
    sku: "QA-PRE-SIN-001",
    category: "Preroll",
    thcPercent: "20.0",
  },
  {
    name: "QA_Product_Low_Stock",
    sku: "QA-LOW-STK-001",
    category: "Flower",
    thcPercent: "18.0",
  },
  {
    name: "QA_Product_Out_Of_Stock",
    sku: "QA-OUT-STK-001",
    category: "Flower",
    thcPercent: "19.0",
  },
];

/**
 * Ensure directory exists for registry file
 */
function ensureRegistryDir(): void {
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load existing registry or create new one
 */
function loadRegistry(): QaDataRegistry {
  ensureRegistryDir();
  if (fs.existsSync(REGISTRY_PATH)) {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  }
  return {
    lastUpdated: new Date().toISOString(),
    locations: [],
    clients: [],
    products: [],
    batches: [],
  };
}

/**
 * Save registry to file
 */
function saveRegistry(registry: QaDataRegistry): void {
  ensureRegistryDir();
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

/**
 * Main seeder function
 */
async function seedQaData(): Promise<void> {
  console.info("=".repeat(80));
  console.info("QA DATA SEEDER - TERP-0011");
  console.info("=".repeat(80));
  console.info("");
  console.info("Purpose: Create QA-prefixed test data for automated testing");
  if (isDryRun) {
    console.info("MODE: DRY RUN (no changes will be made)");
  }
  console.info("");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection, { schema, mode: "default" });

  const registry = loadRegistry();
  const stats = {
    locations: { created: 0, skipped: 0 },
    clients: { created: 0, skipped: 0 },
    products: { created: 0, skipped: 0 },
    batches: { created: 0, skipped: 0 },
  };

  try {
    // ========================================================================
    // SEED LOCATIONS
    // ========================================================================
    console.info("SEEDING LOCATIONS...\n");

    for (const loc of QA_LOCATIONS) {
      process.stdout.write(`  ${loc.name.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.name, loc.name))
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.locations.skipped++;
        if (!registry.locations.find(l => l.id === existing[0].id)) {
          registry.locations.push({ id: existing[0].id, name: loc.name });
        }
        continue;
      }

      if (isDryRun) {
        console.info("[DRY-RUN] Would create");
        stats.locations.created++;
        continue;
      }

      const [result] = await db.insert(schema.locations).values({
        name: loc.name,
        description: loc.description,
        locationType: loc.locationType,
        isActive: true,
      });

      registry.locations.push({ id: result.insertId, name: loc.name });
      console.info(`[OK] Created (ID: ${result.insertId})`);
      stats.locations.created++;
    }
    console.info("");

    // ========================================================================
    // SEED CLIENTS (Customers and Vendors)
    // ========================================================================
    console.info("SEEDING CLIENTS (Customers)...\n");

    for (const customer of QA_CUSTOMERS) {
      process.stdout.write(`  ${customer.name.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.name, customer.name),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.clients.skipped++;
        if (!registry.clients.find(c => c.id === existing[0].id)) {
          registry.clients.push({
            id: existing[0].id,
            name: customer.name,
            type: "buyer",
          });
        }
        continue;
      }

      if (isDryRun) {
        console.info("[DRY-RUN] Would create");
        stats.clients.created++;
        continue;
      }

      const [result] = await db.insert(schema.clients).values({
        name: customer.name,
        email: customer.email,
        isBuyer: customer.isBuyer,
        isSeller: customer.isSeller,
        creditLimit: "5000.00",
      });

      registry.clients.push({
        id: result.insertId,
        name: customer.name,
        type: "buyer",
      });
      console.info(`[OK] Created (ID: ${result.insertId})`);
      stats.clients.created++;
    }
    console.info("");

    console.info("SEEDING CLIENTS (Vendors/Suppliers)...\n");

    for (const vendor of QA_VENDORS) {
      process.stdout.write(`  ${vendor.name.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.name, vendor.name),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.clients.skipped++;
        if (!registry.clients.find(c => c.id === existing[0].id)) {
          registry.clients.push({
            id: existing[0].id,
            name: vendor.name,
            type: "seller",
          });
        }
        continue;
      }

      if (isDryRun) {
        console.info("[DRY-RUN] Would create");
        stats.clients.created++;
        continue;
      }

      const [result] = await db.insert(schema.clients).values({
        name: vendor.name,
        email: vendor.email,
        isBuyer: vendor.isBuyer,
        isSeller: vendor.isSeller,
      });

      // Create supplier profile for vendors
      await db.insert(schema.supplierProfiles).values({
        clientId: result.insertId,
        paymentTerms: "Net 30",
      });

      registry.clients.push({
        id: result.insertId,
        name: vendor.name,
        type: "seller",
      });
      console.info(`[OK] Created (ID: ${result.insertId})`);
      stats.clients.created++;
    }
    console.info("");

    // ========================================================================
    // SEED PRODUCTS
    // ========================================================================
    console.info("SEEDING PRODUCTS...\n");

    for (const prod of QA_PRODUCTS) {
      process.stdout.write(`  ${prod.sku.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.products)
        .where(
          and(
            eq(schema.products.sku, prod.sku),
            isNull(schema.products.deletedAt)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.products.skipped++;
        if (!registry.products.find(p => p.id === existing[0].id)) {
          registry.products.push({
            id: existing[0].id,
            name: prod.name,
            sku: prod.sku,
          });
        }
        continue;
      }

      if (isDryRun) {
        console.info("[DRY-RUN] Would create");
        stats.products.created++;
        continue;
      }

      const [result] = await db.insert(schema.products).values({
        name: prod.name,
        nameCanonical: prod.name.toUpperCase(),
        sku: prod.sku,
        category: prod.category,
        thcPercent: prod.thcPercent,
        isActive: true,
      });

      registry.products.push({
        id: result.insertId,
        name: prod.name,
        sku: prod.sku,
      });
      console.info(`[OK] Created (ID: ${result.insertId})`);
      stats.products.created++;
    }
    console.info("");

    // ========================================================================
    // SEED BATCHES (SKUs)
    // ========================================================================
    console.info("SEEDING BATCHES...\n");

    // First get the seeded products
    const qaProducts = await db
      .select()
      .from(schema.products)
      .where(like(schema.products.sku, "QA-%"));

    // Get a QA location
    const qaLocation = await db
      .select()
      .from(schema.locations)
      .where(like(schema.locations.name, "QA_%"))
      .limit(1);

    // Use first QA location; skip batch creation if none exists
    if (!qaLocation[0]?.id) {
      console.warn("  WARNING: No QA location found. Create locations first.");
      console.warn("  Skipping batch creation until locations exist.\n");
      stats.batches.skipped = qaProducts.length;
    }
    const locationId = qaLocation[0]?.id ?? undefined;

    for (const prod of qaProducts) {
      // Skip if no location available
      if (!locationId) {
        continue;
      }
      const batchSku = `${prod.sku}-B001`;
      process.stdout.write(`  ${batchSku.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.batches)
        .where(eq(schema.batches.sku, batchSku))
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.batches.skipped++;
        if (!registry.batches.find(b => b.id === existing[0].id)) {
          registry.batches.push({
            id: existing[0].id,
            sku: batchSku,
            productName: prod.name || "",
          });
        }
        continue;
      }

      if (isDryRun) {
        console.info("[DRY-RUN] Would create");
        stats.batches.created++;
        continue;
      }

      // Determine quantity based on product name (for low stock testing)
      let onHandQty = "100.000";
      if (prod.sku?.includes("LOW-STK")) {
        onHandQty = "5.000"; // Low stock for testing alerts
      } else if (prod.sku?.includes("OUT-STK")) {
        onHandQty = "0.000"; // Out of stock for testing
      }

      const [result] = await db.insert(schema.batches).values({
        sku: batchSku,
        code: `QA-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        productId: prod.id,
        locationId,
        batchStatus: "LIVE",
        onHandQty,
        reservedQty: "0.000",
        quarantineQty: "0.000",
        holdQty: "0.000",
        unitCost: "10.00",
      });

      registry.batches.push({
        id: result.insertId,
        sku: batchSku,
        productName: prod.name || "",
      });
      console.info(`[OK] Created (ID: ${result.insertId})`);
      stats.batches.created++;
    }
    console.info("");

    // ========================================================================
    // SAVE REGISTRY
    // ========================================================================
    if (!isDryRun) {
      saveRegistry(registry);
      console.info(`Registry saved to: ${REGISTRY_PATH}\n`);
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.info("=".repeat(80));
    console.info("SUMMARY");
    console.info("=".repeat(80));
    console.info(
      `  Locations: ${stats.locations.created} created, ${stats.locations.skipped} skipped`
    );
    console.info(
      `  Clients:   ${stats.clients.created} created, ${stats.clients.skipped} skipped`
    );
    console.info(
      `  Products:  ${stats.products.created} created, ${stats.products.skipped} skipped`
    );
    console.info(
      `  Batches:   ${stats.batches.created} created, ${stats.batches.skipped} skipped`
    );
    console.info("");

    if (isDryRun) {
      console.info("DRY RUN COMPLETE - No changes were made to the database");
    } else {
      console.info("QA DATA REFERENCE");
      console.info("=".repeat(80));
      console.info(
        "Locations:  QA_Warehouse_Main, QA_Warehouse_Overflow, QA_Staging_Area, QA_Quarantine, QA_Vault"
      );
      console.info(
        "Customers:  QA_Customer_Standard, QA_Customer_VIP, QA_Customer_Wholesale, QA_Customer_Retail, QA_Customer_Credit_Test"
      );
      console.info(
        "Vendors:    QA_Vendor_Primary, QA_Vendor_Backup, QA_Vendor_Premium, QA_Vendor_Wholesale"
      );
      console.info(
        "Products:   QA-FLW-*, QA-CON-*, QA-EDI-*, QA-PRE-*, QA-LOW-STK-001, QA-OUT-STK-001"
      );
      console.info("");
      console.info(`Full registry available at: ${REGISTRY_PATH}`);
    }
    console.info("");
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// Run seeder
seedQaData()
  .then(() => {
    console.info("QA data seeding complete!");
    process.exit(0);
  })
  .catch(err => {
    console.error("ERROR:", err.message);
    process.exit(1);
  });
