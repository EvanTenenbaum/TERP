/**
 * QA Test Data Seeder
 * TERP-0011: Create QA test data seeding script and registry
 *
 * Creates deterministic QA-prefixed entities for automated testing.
 * This script is idempotent - running it multiple times will skip existing entities.
 *
 * Usage:
 *   pnpm seed:qa-data
 *   tsx scripts/seed-qa-data.ts
 *
 * Entities Created:
 *   - QA_LOCATION_* : Warehouse locations
 *   - QA_CUSTOMER_* : Buyer clients
 *   - QA_SUPPLIER_* : Seller clients
 *   - QA_BRAND_*    : Product brands
 *   - QA_PRODUCT_*  : Products
 *
 * Registry File:
 *   docs/qa/qa-data-registry.json - Contains all seeded entity IDs
 *
 * @module scripts/seed-qa-data
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, isNull } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

/**
 * Registry of all seeded QA data IDs
 */
interface QARegistry {
  createdAt: string;
  updatedAt: string;
  locations: Array<{ id: number; site: string }>;
  clients: {
    customers: Array<{ id: number; teriCode: string; name: string }>;
    suppliers: Array<{ id: number; teriCode: string; name: string }>;
  };
  brands: Array<{ id: number; name: string }>;
  products: Array<{ id: number; name: string; brandId: number }>;
}

/**
 * QA Location definitions
 */
const QA_LOCATIONS = [
  {
    site: "QA_LOCATION_MAIN",
    zone: "Zone-A",
    rack: "R1",
    shelf: "S1",
    bin: "B1",
  },
  {
    site: "QA_LOCATION_WAREHOUSE",
    zone: "Zone-B",
    rack: "R2",
    shelf: "S1",
    bin: "B1",
  },
  {
    site: "QA_LOCATION_COLD",
    zone: "Cold-Zone",
    rack: "R1",
    shelf: "S1",
    bin: "B1",
  },
  {
    site: "QA_LOCATION_STAGING",
    zone: "Staging",
    rack: "R1",
    shelf: "S1",
    bin: "B1",
  },
  {
    site: "QA_LOCATION_RETURNS",
    zone: "Returns",
    rack: "R1",
    shelf: "S1",
    bin: "B1",
  },
];

/**
 * QA Customer (Buyer) definitions
 */
const QA_CUSTOMERS = [
  {
    teriCode: "QA_CUSTOMER_01",
    name: "QA Test Dispensary Alpha",
    email: "qa.customer1@terp.test",
    phone: "555-0101",
  },
  {
    teriCode: "QA_CUSTOMER_02",
    name: "QA Test Retail Beta",
    email: "qa.customer2@terp.test",
    phone: "555-0102",
  },
  {
    teriCode: "QA_CUSTOMER_03",
    name: "QA Test Wholesale Gamma",
    email: "qa.customer3@terp.test",
    phone: "555-0103",
  },
  {
    teriCode: "QA_CUSTOMER_CREDIT",
    name: "QA Test Credit Customer",
    email: "qa.credit@terp.test",
    phone: "555-0110",
  },
  {
    teriCode: "QA_CUSTOMER_VIP",
    name: "QA Test VIP Customer",
    email: "qa.vip@terp.test",
    phone: "555-0111",
  },
];

/**
 * QA Supplier (Seller) definitions
 */
const QA_SUPPLIERS = [
  {
    teriCode: "QA_SUPPLIER_01",
    name: "QA Test Farm Delta",
    email: "qa.supplier1@terp.test",
    phone: "555-0201",
  },
  {
    teriCode: "QA_SUPPLIER_02",
    name: "QA Test Cultivator Epsilon",
    email: "qa.supplier2@terp.test",
    phone: "555-0202",
  },
  {
    teriCode: "QA_SUPPLIER_03",
    name: "QA Test Manufacturer Zeta",
    email: "qa.supplier3@terp.test",
    phone: "555-0203",
  },
];

/**
 * QA Brand definitions
 */
const QA_BRANDS = [
  { name: "QA_BRAND_PREMIUM", description: "QA test brand - premium tier" },
  { name: "QA_BRAND_STANDARD", description: "QA test brand - standard tier" },
  { name: "QA_BRAND_BUDGET", description: "QA test brand - budget tier" },
];

/**
 * QA Product definitions
 */
const QA_PRODUCTS = [
  {
    nameCanonical: "QA_PRODUCT_FLOWER_A",
    category: "Flower",
    subcategory: "Indoor",
    brandIndex: 0,
  },
  {
    nameCanonical: "QA_PRODUCT_FLOWER_B",
    category: "Flower",
    subcategory: "Outdoor",
    brandIndex: 1,
  },
  {
    nameCanonical: "QA_PRODUCT_PREROLL",
    category: "Pre-Roll",
    subcategory: "Singles",
    brandIndex: 0,
  },
  {
    nameCanonical: "QA_PRODUCT_EDIBLE",
    category: "Edibles",
    subcategory: "Gummies",
    brandIndex: 2,
  },
  {
    nameCanonical: "QA_PRODUCT_CONCENTRATE",
    category: "Concentrates",
    subcategory: "Wax",
    brandIndex: 0,
  },
  {
    nameCanonical: "QA_PRODUCT_VAPE",
    category: "Vapes",
    subcategory: "Cartridges",
    brandIndex: 1,
  },
];

/**
 * Registry file path
 */
const REGISTRY_PATH = path.join(
  process.cwd(),
  "docs",
  "qa",
  "qa-data-registry.json"
);

/**
 * Load existing registry or create new one
 */
function loadRegistry(): QARegistry {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const content = fs.readFileSync(REGISTRY_PATH, "utf-8");
      return JSON.parse(content);
    }
  } catch (_error) {
    console.warn("Warning: Could not load existing registry, creating new one");
  }

  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    locations: [],
    clients: { customers: [], suppliers: [] },
    brands: [],
    products: [],
  };
}

/**
 * Save registry to file
 */
function saveRegistry(registry: QARegistry): void {
  registry.updatedAt = new Date().toISOString();

  // Ensure directory exists
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  console.info(`\nRegistry saved to: ${REGISTRY_PATH}`);
}

/**
 * Main seeding function
 */
async function seedQAData(): Promise<void> {
  console.info("=".repeat(80));
  console.info("QA TEST DATA SEEDER");
  console.info("=".repeat(80));
  console.info("");
  console.info(
    "Purpose: Create deterministic QA-prefixed entities for automated testing"
  );
  console.info("Registry: docs/qa/qa-data-registry.json");
  console.info("");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  let connection: Awaited<ReturnType<typeof mysql.createConnection>> | null =
    null;

  try {
    connection = await mysql.createConnection(databaseUrl);
    const db = drizzle(connection, { schema, mode: "default" });

    const registry = loadRegistry();

    const stats = {
      locations: { created: 0, skipped: 0 },
      customers: { created: 0, skipped: 0 },
      suppliers: { created: 0, skipped: 0 },
      brands: { created: 0, skipped: 0 },
      products: { created: 0, skipped: 0 },
    };

    // ======================================================================
    // SEED LOCATIONS
    // ======================================================================
    console.info("\n1. Seeding QA Locations...");
    console.info("-".repeat(40));

    for (const loc of QA_LOCATIONS) {
      process.stdout.write(`   ${loc.site.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.locations)
        .where(
          and(
            eq(schema.locations.site, loc.site),
            isNull(schema.locations.deletedAt)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.locations.skipped++;
        // Update registry
        if (!registry.locations.find(l => l.site === loc.site)) {
          registry.locations.push({ id: existing[0].id, site: loc.site });
        }
        continue;
      }

      const result = await db.insert(schema.locations).values({
        site: loc.site,
        zone: loc.zone,
        rack: loc.rack,
        shelf: loc.shelf,
        bin: loc.bin,
        isActive: 1,
      });

      const insertId = Number(result[0].insertId);
      registry.locations.push({ id: insertId, site: loc.site });
      stats.locations.created++;
      console.info(`[OK] ID: ${insertId}`);
    }

    // ======================================================================
    // SEED CUSTOMER CLIENTS
    // ======================================================================
    console.info("\n2. Seeding QA Customers (Buyers)...");
    console.info("-".repeat(40));

    for (const cust of QA_CUSTOMERS) {
      process.stdout.write(`   ${cust.teriCode.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.teriCode, cust.teriCode),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.customers.skipped++;
        if (
          !registry.clients.customers.find(c => c.teriCode === cust.teriCode)
        ) {
          registry.clients.customers.push({
            id: existing[0].id,
            teriCode: cust.teriCode,
            name: cust.name,
          });
        }
        continue;
      }

      const result = await db.insert(schema.clients).values({
        teriCode: cust.teriCode,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        isBuyer: true,
        isSeller: false,
        paymentTerms: 30,
        creditLimit: "5000.00",
      });

      const insertId = Number(result[0].insertId);
      registry.clients.customers.push({
        id: insertId,
        teriCode: cust.teriCode,
        name: cust.name,
      });
      stats.customers.created++;
      console.info(`[OK] ID: ${insertId}`);
    }

    // ======================================================================
    // SEED SUPPLIER CLIENTS
    // ======================================================================
    console.info("\n3. Seeding QA Suppliers (Sellers)...");
    console.info("-".repeat(40));

    for (const supp of QA_SUPPLIERS) {
      process.stdout.write(`   ${supp.teriCode.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.teriCode, supp.teriCode),
            isNull(schema.clients.deletedAt)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.suppliers.skipped++;
        if (
          !registry.clients.suppliers.find(s => s.teriCode === supp.teriCode)
        ) {
          registry.clients.suppliers.push({
            id: existing[0].id,
            teriCode: supp.teriCode,
            name: supp.name,
          });
        }
        continue;
      }

      const result = await db.insert(schema.clients).values({
        teriCode: supp.teriCode,
        name: supp.name,
        email: supp.email,
        phone: supp.phone,
        isBuyer: false,
        isSeller: true,
        paymentTerms: 30,
      });

      const insertId = Number(result[0].insertId);
      registry.clients.suppliers.push({
        id: insertId,
        teriCode: supp.teriCode,
        name: supp.name,
      });
      stats.suppliers.created++;
      console.info(`[OK] ID: ${insertId}`);
    }

    // ======================================================================
    // SEED BRANDS
    // ======================================================================
    console.info("\n4. Seeding QA Brands...");
    console.info("-".repeat(40));

    const brandIds: number[] = [];

    for (const brand of QA_BRANDS) {
      process.stdout.write(`   ${brand.name.padEnd(30)}`);

      const existing = await db
        .select()
        .from(schema.brands)
        .where(
          and(
            eq(schema.brands.name, brand.name),
            isNull(schema.brands.deletedAt)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        console.info("[SKIP] Already exists");
        stats.brands.skipped++;
        brandIds.push(existing[0].id);
        if (!registry.brands.find(b => b.name === brand.name)) {
          registry.brands.push({ id: existing[0].id, name: brand.name });
        }
        continue;
      }

      const result = await db.insert(schema.brands).values({
        name: brand.name,
        description: brand.description,
      });

      const insertId = Number(result[0].insertId);
      brandIds.push(insertId);
      registry.brands.push({ id: insertId, name: brand.name });
      stats.brands.created++;
      console.info(`[OK] ID: ${insertId}`);
    }

    // ======================================================================
    // SEED PRODUCTS
    // ======================================================================
    console.info("\n5. Seeding QA Products...");
    console.info("-".repeat(40));

    if (brandIds.length === 0) {
      console.warn("   WARNING: No brands available, skipping products");
    } else {
      for (const prod of QA_PRODUCTS) {
        process.stdout.write(`   ${prod.nameCanonical.padEnd(30)}`);

        const existing = await db
          .select()
          .from(schema.products)
          .where(
            and(
              eq(schema.products.nameCanonical, prod.nameCanonical),
              isNull(schema.products.deletedAt)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          console.info("[SKIP] Already exists");
          stats.products.skipped++;
          if (!registry.products.find(p => p.name === prod.nameCanonical)) {
            registry.products.push({
              id: existing[0].id,
              name: prod.nameCanonical,
              brandId: existing[0].brandId,
            });
          }
          continue;
        }

        const brandId = brandIds[prod.brandIndex % brandIds.length];

        const result = await db.insert(schema.products).values({
          nameCanonical: prod.nameCanonical,
          category: prod.category,
          subcategory: prod.subcategory,
          brandId: brandId,
          uomSellable: "EA",
        });

        const insertId = Number(result[0].insertId);
        registry.products.push({
          id: insertId,
          name: prod.nameCanonical,
          brandId,
        });
        stats.products.created++;
        console.info(`[OK] ID: ${insertId}`);
      }
    }

    // Save registry
    saveRegistry(registry);

    // ======================================================================
    // SUMMARY
    // ======================================================================
    console.info("\n" + "=".repeat(80));
    console.info("SUMMARY");
    console.info("=".repeat(80));
    console.info(
      `   Locations:  ${stats.locations.created} created, ${stats.locations.skipped} skipped`
    );
    console.info(
      `   Customers:  ${stats.customers.created} created, ${stats.customers.skipped} skipped`
    );
    console.info(
      `   Suppliers:  ${stats.suppliers.created} created, ${stats.suppliers.skipped} skipped`
    );
    console.info(
      `   Brands:     ${stats.brands.created} created, ${stats.brands.skipped} skipped`
    );
    console.info(
      `   Products:   ${stats.products.created} created, ${stats.products.skipped} skipped`
    );
    console.info("");

    // Print QA entity reference
    console.info("QA ENTITY REFERENCE");
    console.info("=".repeat(80));
    console.info("\nLocations:");
    registry.locations.forEach(l =>
      console.info(`   ID: ${l.id.toString().padEnd(6)} | ${l.site}`)
    );
    console.info("\nCustomers (Buyers):");
    registry.clients.customers.forEach(c =>
      console.info(
        `   ID: ${c.id.toString().padEnd(6)} | ${c.teriCode.padEnd(20)} | ${c.name}`
      )
    );
    console.info("\nSuppliers (Sellers):");
    registry.clients.suppliers.forEach(s =>
      console.info(
        `   ID: ${s.id.toString().padEnd(6)} | ${s.teriCode.padEnd(20)} | ${s.name}`
      )
    );
    console.info("\nBrands:");
    registry.brands.forEach(b =>
      console.info(`   ID: ${b.id.toString().padEnd(6)} | ${b.name}`)
    );
    console.info("\nProducts:");
    registry.products.forEach(p =>
      console.info(`   ID: ${p.id.toString().padEnd(6)} | ${p.name}`)
    );
    console.info("");
  } catch (error) {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run seeder
seedQAData()
  .then(() => {
    console.info("QA data seeding complete!");
    process.exit(0);
  })
  .catch(err => {
    console.error("ERROR:", err.message);
    process.exit(1);
  });
