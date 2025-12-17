#!/usr/bin/env npx tsx
/**
 * Apply Supplier Profiles Migration
 * 
 * Creates only the supplier_profiles table needed for vendor migration.
 * This is a targeted migration to avoid applying all pending migrations at once.
 * 
 * Usage:
 *   npx tsx scripts/apply-supplier-profiles-migration.ts --dry-run
 *   npx tsx scripts/apply-supplier-profiles-migration.ts --confirm-production
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.production" });

const PROD_DATABASE_URL = process.env.DATABASE_URL || "";

const CREATE_SUPPLIER_PROFILES_SQL = `
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id int AUTO_INCREMENT NOT NULL,
  client_id int NOT NULL,
  contact_name varchar(255),
  contact_email varchar(320),
  contact_phone varchar(50),
  payment_terms varchar(100),
  supplier_notes text,
  legacy_vendor_id int,
  preferred_payment_method enum('CASH','CHECK','WIRE','ACH','CREDIT_CARD','OTHER'),
  tax_id varchar(50),
  license_number varchar(100),
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT supplier_profiles_id PRIMARY KEY(id),
  CONSTRAINT supplier_profiles_client_id_unique UNIQUE(client_id),
  CONSTRAINT supplier_profiles_client_id_fk FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
`;

const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_client_id ON supplier_profiles (client_id);
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_legacy_vendor ON supplier_profiles (legacy_vendor_id);
`;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const confirmProduction = args.includes("--confirm-production");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     SUPPLIER PROFILES TABLE MIGRATION                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  if (!confirmProduction && !dryRun) {
    console.error("❌ ERROR: Must specify --dry-run or --confirm-production");
    process.exit(1);
  }

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - Showing SQL that would be executed:\n");
    console.log(CREATE_SUPPLIER_PROFILES_SQL);
    console.log(CREATE_INDEXES_SQL);
    console.log("\n✅ Dry run complete. Use --confirm-production to apply.");
    process.exit(0);
  }

  console.log("⚠️  PRODUCTION MODE - Applying migration...\n");

  const connection = await mysql.createConnection({
    uri: PROD_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
  });

  try {
    // Check if table already exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'supplier_profiles'"
    ) as any;

    if (tables.length > 0) {
      console.log("✅ supplier_profiles table already exists!");
      await connection.end();
      return;
    }

    // Create the table
    console.log("Creating supplier_profiles table...");
    await connection.query(CREATE_SUPPLIER_PROFILES_SQL);
    console.log("✅ Table created");

    // Create indexes (MySQL doesn't support IF NOT EXISTS for indexes, so we handle errors)
    console.log("Creating indexes...");
    try {
      await connection.query(
        "CREATE INDEX idx_supplier_profiles_client_id ON supplier_profiles (client_id)"
      );
    } catch (e: any) {
      if (!e.message.includes("Duplicate")) throw e;
    }
    try {
      await connection.query(
        "CREATE INDEX idx_supplier_profiles_legacy_vendor ON supplier_profiles (legacy_vendor_id)"
      );
    } catch (e: any) {
      if (!e.message.includes("Duplicate")) throw e;
    }
    console.log("✅ Indexes created");

    // Verify
    const [verify] = await connection.query("DESCRIBE supplier_profiles") as any;
    console.log(`\n✅ Migration complete! Table has ${verify.length} columns.`);

  } catch (error: any) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
