/**
 * CRITICAL: Apply All Missing Migrations to Production
 * 
 * Root Cause: Migrations 0020-0060 were never applied to production.
 * The database is stuck at migration 0019, but deployed code expects 0060.
 * 
 * Impact:
 * - Inventory page shows 0 batches (ownership_type column missing)
 * - Order creation flow broken
 * - Multiple tables missing (vendor_payables, invoice_payments, etc.)
 * 
 * Usage:
 *   npx tsx scripts/apply-critical-migrations.ts           # Dry run
 *   npx tsx scripts/apply-critical-migrations.ts --apply   # Apply to production
 * 
 * Created: 2026-02-02
 * Ticket: HOTFIX-SCHEMA-SYNC
 */

import { config } from "dotenv";
import * as mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
// Use process.cwd() for compatibility
const projectRoot = process.cwd();

// Load environment variables
if (!process.env.DATABASE_URL) {
  config();
  if (!process.env.DATABASE_URL) {
    config({ path: ".env.production" });
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Parse SSL configuration
const needsSSL = databaseUrl.includes('digitalocean.com') || 
                 databaseUrl.includes('ssl=') ||
                 databaseUrl.includes('ssl-mode=REQUIRED') || 
                 databaseUrl.includes('sslmode=require');

const cleanDatabaseUrl = databaseUrl
  .replace(/[?&]ssl=[^&]*/gi, '')
  .replace(/[?&]ssl-mode=[^&]*/gi, '')
  .replace(/[?&]sslmode=[^&]*/gi, '');

const poolConfig: mysql.PoolOptions = {
  uri: cleanDatabaseUrl,
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 2,
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  multipleStatements: true, // Allow multiple statements for migrations
};

if (needsSSL) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

interface MigrationCheck {
  name: string;
  type: "column" | "table";
  table: string;
  column?: string;
  verifyQuery: string;
  migrationFile: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
}

// Critical migrations to check and apply
const CRITICAL_MIGRATIONS: MigrationCheck[] = [
  {
    name: "ownership_type",
    type: "column",
    table: "batches",
    column: "ownership_type",
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batches' AND COLUMN_NAME = 'ownership_type'",
    migrationFile: "0027_add_payables_and_ownership_tracking.sql",
    priority: "CRITICAL"
  },
  {
    name: "vendor_payables",
    type: "table",
    table: "vendor_payables",
    verifyQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendor_payables'",
    migrationFile: "0027_add_payables_and_ownership_tracking.sql",
    priority: "HIGH"
  },
  {
    name: "payable_notifications",
    type: "table",
    table: "payable_notifications",
    verifyQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payable_notifications'",
    migrationFile: "0027_add_payables_and_ownership_tracking.sql",
    priority: "HIGH"
  },
  {
    name: "invoice_payments",
    type: "table",
    table: "invoice_payments",
    verifyQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_payments'",
    migrationFile: "0027_add_payables_and_ownership_tracking.sql",
    priority: "HIGH"
  },
];

async function main() {
  const applyMode = process.argv.includes("--apply");
  
  console.info("🔧 CRITICAL: Apply Missing Migrations to Production");
  console.info(`Mode: ${applyMode ? "APPLY" : "DRY RUN"}`);
  console.info("");
  
  const pool = mysql.createPool(poolConfig);
  
  try {
    // Step 1: Check current migration status
    console.info("📋 Step 1: Checking current migration status...");
    
    const missingMigrations: MigrationCheck[] = [];
    
    for (const migration of CRITICAL_MIGRATIONS) {
      const [rows] = await pool.query(migration.verifyQuery) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      
      if (rows.length === 0) {
        console.info(`  ❌ MISSING: ${migration.name} (${migration.type} in ${migration.table})`);
        missingMigrations.push(migration);
      } else {
        console.info(`  ✅ EXISTS: ${migration.name}`);
      }
    }
    
    console.info("");
    
    if (missingMigrations.length === 0) {
      console.info("✅ All critical migrations are already applied!");
      await pool.end();
      return;
    }
    
    console.info(`Found ${missingMigrations.length} missing migrations.`);
    console.info("");
    
    // Step 2: Group by migration file
    const migrationFiles = Array.from(new Set(missingMigrations.map(m => m.migrationFile)));
    console.info(`📋 Step 2: Migration files to apply: ${migrationFiles.join(", ")}`);
    console.info("");
    
    if (!applyMode) {
      console.info("🔍 DRY RUN - No changes made. Run with --apply to execute.");
      console.info("");
      console.info("To apply, run:");
      console.info("  npx tsx scripts/apply-critical-migrations.ts --apply");
      await pool.end();
      return;
    }
    
    // Step 3: Apply migrations
    console.info("🚀 Step 3: Applying migrations...");
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(projectRoot, "drizzle", "migrations", migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.error(`  ❌ Migration file not found: ${migrationPath}`);
        continue;
      }
      
      console.info(`  📄 Applying: ${migrationFile}`);
      
      const sql = fs.readFileSync(migrationPath, "utf-8");
      
      // Split by semicolons but handle edge cases
      const statements = sql
        .split(/;[\r\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));
      
      for (const statement of statements) {
        try {
          // Skip if it's just a comment
          if (statement.startsWith("--") || statement.length === 0) continue;
          
          await pool.query(statement);
          console.info(`    ✅ Executed: ${statement.substring(0, 60)}...`);
        } catch (err: unknown) {
          const error = err as { code?: string; message?: string };
          // Ignore "already exists" errors
          if (error.code === "ER_DUP_FIELDNAME" || 
              error.code === "ER_TABLE_EXISTS_ERROR" ||
              error.message?.includes("Duplicate column name") ||
              error.message?.includes("already exists")) {
            console.info(`    ⚠️ Already exists, skipping: ${statement.substring(0, 40)}...`);
          } else {
            console.error(`    ❌ Error: ${error.message}`);
          }
        }
      }
    }
    
    console.info("");
    
    // Step 4: Verify migrations were applied
    console.info("📋 Step 4: Verifying migrations...");
    
    let allSuccess = true;
    for (const migration of missingMigrations) {
      const [rows] = await pool.query(migration.verifyQuery) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      
      if (rows.length > 0) {
        console.info(`  ✅ Verified: ${migration.name}`);
      } else {
        console.error(`  ❌ Still missing: ${migration.name}`);
        allSuccess = false;
      }
    }
    
    console.info("");
    
    // Step 5: Test batch query
    console.info("📋 Step 5: Testing batch query...");
    const [batchCount] = await pool.query(`
      SELECT COUNT(*) as count FROM batches WHERE deleted_at IS NULL
    `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    console.info(`  ✅ Batch query successful. Found ${batchCount[0].count} active batches.`);
    
    console.info("");
    
    if (allSuccess) {
      console.info("🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY!");
      console.info("   Inventory should now be visible in the app.");
    } else {
      console.error("⚠️ Some migrations may have failed. Please check the logs above.");
    }
    
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
