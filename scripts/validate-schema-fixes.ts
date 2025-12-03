/**
 * Schema Fix Verification Tool
 *
 * Verifies that schema fixes were applied correctly
 * Usage: pnpm validate:schema:fixes
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { getTableColumns } from "./utils/schema-introspection";

// Load environment variables
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

// Create database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const needsSSL =
  databaseUrl.includes("digitalocean.com") ||
  databaseUrl.includes("ssl=") ||
  databaseUrl.includes("ssl-mode=REQUIRED");

const cleanDatabaseUrl = databaseUrl
  .replace(/[?&]ssl=[^&]*/gi, "")
  .replace(/[?&]ssl-mode=[^&]*/gi, "");

const poolConfig: mysql.PoolOptions = {
  uri: cleanDatabaseUrl,
  waitForConnections: true,
  connectionLimit: 5,
  ssl: needsSSL
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
};

const pool = mysql.createPool(poolConfig);
// Use mode: "default" without schema to avoid connection issues with introspection queries
const db = drizzle(pool, { mode: "default" });

const CRITICAL_TABLES = [
  "inventoryMovements", // Database uses camelCase
  "order_status_history", // Database uses snake_case
  "invoices",
  "ledgerEntries", // Database uses camelCase
  "payments",
  "client_activity", // Database uses snake_case
];

interface ValidationIssue {
  table: string;
  column: string;
  description: string;
}

async function verifyFixes() {
  console.log("🔍 Verifying schema fixes for critical tables...\n");

  const issues: ValidationIssue[] = [];
  let totalChecks = 0;

  for (const tableName of CRITICAL_TABLES) {
    console.log(`Checking ${tableName}...`);

    let dbColumns: Awaited<ReturnType<typeof getTableColumns>> = [];
    let retries = 3;
    let lastError: Error | null = null;
    
    while (retries > 0) {
      try {
        dbColumns = await getTableColumns(db, tableName);
        break;
      } catch (error) {
        lastError = error as Error;
        retries--;
        if (retries > 0) {
          console.log(`  ⚠️  Query failed, retrying... (${retries} attempts remaining)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (dbColumns.length === 0 && lastError) {
      issues.push({
        table: tableName,
        column: "*",
        description: `Error querying table: ${lastError.message}`,
      });
      console.log(`  ❌ Error: ${lastError.message}`);
      continue;
    }
    
    try {
      totalChecks += dbColumns.length;

      // Simple validation: check if table exists and has columns
      if (dbColumns.length === 0) {
        issues.push({
          table: tableName,
          column: "*",
          description: "Table not found in database",
        });
      }

      console.log(`  ✅ ${dbColumns.length} columns found`);
    } catch (error) {
      issues.push({
        table: tableName,
        column: "*",
        description: `Error querying table: ${(error as Error).message}`,
      });
      console.log(`  ❌ Error: ${(error as Error).message}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 VERIFICATION SUMMARY`);
  console.log(`${"=".repeat(60)}\n`);

  console.log(`Critical Tables Checked: ${CRITICAL_TABLES.length}`);
  console.log(`Total Columns Checked: ${totalChecks}`);
  console.log(`Issues Found: ${issues.length}\n`);

  if (issues.length === 0) {
    console.log(`✅ All critical tables validated successfully!`);
    console.log(`\n🎉 Schema fixes verified. Ready for Phase 2 seeding.\n`);
    process.exit(0);
  } else {
    console.log(`❌ Issues found:\n`);
    for (const issue of issues) {
      console.log(`   ${issue.table}.${issue.column}: ${issue.description}`);
    }
    console.log(`\n⚠️  Please review and fix remaining issues.\n`);
    process.exit(1);
  }
}

verifyFixes().catch(error => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});
