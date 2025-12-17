#!/usr/bin/env tsx
/**
 * Migration Runner: Add deletedAt indexes
 *
 * This script runs the 0011_add_deleted_at_indexes.sql migration
 * using the application's database connection pool.
 *
 * Usage: tsx scripts/run-migration-0011.ts
 */

import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

async function runMigration() {
  console.log("🔄 Starting migration: 0011_add_deleted_at_indexes");
  console.log("=".repeat(60));

  try {
    // Get database connection
    const db = await getDb();
    if (!db) {
      throw new Error("❌ Database connection not available");
    }
    console.log("✅ Database connection established");

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "../drizzle/migrations/0011_add_deleted_at_indexes.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");
    console.log("✅ Migration file loaded");
    console.log("");

    // Split SQL statements (each CREATE INDEX is a separate statement)
    const statements = migrationSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    console.log("");

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing:`);
      console.log(`   ${statement.substring(0, 80)}...`);

      try {
        await db.execute(sql.raw(statement));
        console.log(`   ✅ Success`);
      } catch (error: unknown) {
        // Check if error is "duplicate key" (index already exists)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate key name")) {
          console.log(`   ⚠️  Index already exists (skipping)`);
        } else {
          throw error;
        }
      }
      console.log("");
    }

    // Verify indexes were created
    console.log("🔍 Verifying indexes...");
    console.log("");

    const indexChecks = [
      { table: "invoices", index: "idx_invoices_deleted_at" },
      { table: "payments", index: "idx_payments_deleted_at" },
      { table: "bills", index: "idx_bills_deleted_at" },
    ];

    for (const check of indexChecks) {
      const result = await db.execute(
        sql.raw(`
        SHOW INDEX FROM ${check.table} WHERE Key_name = '${check.index}'
      `)
      );

      if (result && result.length > 0) {
        console.log(`   ✅ ${check.index} exists on ${check.table}`);
      } else {
        console.log(`   ❌ ${check.index} NOT FOUND on ${check.table}`);
      }
    }

    console.log("");
    console.log("=".repeat(60));
    console.log("✅ Migration completed successfully!");
    console.log("");
    console.log("Next steps:");
    console.log("1. Monitor application logs for any errors");
    console.log("2. Verify dashboard loads correctly");
    console.log("3. Check AR/AP pages for data accuracy");
    console.log("");

    process.exit(0);
  } catch (error: unknown) {
    console.error("");
    console.error("=".repeat(60));
    console.error("❌ Migration failed!");
    console.error("");
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error:", errorMessage);
    console.error("");
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:");
      console.error(error.stack);
    }
    console.error("");
    process.exit(1);
  }
}

// Run migration
runMigration();
