/**
 * HOTFIX: Add ownership_type column to batches table
 * 
 * Root Cause: Migration 0027_add_payables_and_ownership_tracking.sql was never
 * applied to production. The schema has ownershipType but the column doesn't exist.
 * 
 * Impact: Inventory page shows 0 batches, order creation broken.
 * 
 * Usage:
 *   npx tsx scripts/hotfix-add-ownership-type.ts           # Dry run
 *   npx tsx scripts/hotfix-add-ownership-type.ts --apply   # Apply to production
 * 
 * Created: 2026-02-02
 * Ticket: HOTFIX-OWNERSHIP-TYPE
 */

import { config } from "dotenv";
import * as mysql from "mysql2/promise";

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
};

if (needsSSL) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

async function main() {
  const applyMode = process.argv.includes("--apply");
  
  console.log("🔧 HOTFIX: Add ownership_type column to batches table");
  console.log(`Mode: ${applyMode ? "APPLY" : "DRY RUN"}`);
  console.log("");
  
  const pool = mysql.createPool(poolConfig);
  
  try {
    // Step 1: Check if column already exists
    console.log("📋 Step 1: Checking if ownership_type column exists...");
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'batches' 
        AND COLUMN_NAME = 'ownership_type'
    `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    
    if (columns.length > 0) {
      console.log("✅ Column ownership_type already exists. No action needed.");
      await pool.end();
      return;
    }
    
    console.log("❌ Column ownership_type does NOT exist. Migration needed.");
    console.log("");
    
    // Step 2: Check if payment_terms column exists (we add AFTER it)
    console.log("📋 Step 2: Checking for payment_terms column (position reference)...");
    const [paymentTermsCol] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'batches' 
        AND COLUMN_NAME = 'payment_terms'
    `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    
    // Build the ALTER statement
    let alterStatement: string;
    if (paymentTermsCol.length > 0) {
      alterStatement = `
        ALTER TABLE batches
        ADD COLUMN ownership_type ENUM('CONSIGNED', 'OFFICE_OWNED', 'SAMPLE') NOT NULL DEFAULT 'CONSIGNED'
        AFTER payment_terms
      `;
      console.log("✅ payment_terms column exists. Will add ownership_type AFTER it.");
    } else {
      // Fallback: add after paymentTerms (camelCase variant)
      const [paymentTermsCamel] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'batches' 
          AND COLUMN_NAME = 'paymentTerms'
      `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      
      if (paymentTermsCamel.length > 0) {
        alterStatement = `
          ALTER TABLE batches
          ADD COLUMN ownership_type ENUM('CONSIGNED', 'OFFICE_OWNED', 'SAMPLE') NOT NULL DEFAULT 'CONSIGNED'
          AFTER paymentTerms
        `;
        console.log("✅ paymentTerms column exists. Will add ownership_type AFTER it.");
      } else {
        // Last resort: just add the column without position
        alterStatement = `
          ALTER TABLE batches
          ADD COLUMN ownership_type ENUM('CONSIGNED', 'OFFICE_OWNED', 'SAMPLE') NOT NULL DEFAULT 'CONSIGNED'
        `;
        console.log("⚠️ Neither payment_terms nor paymentTerms found. Adding column at end.");
      }
    }
    
    console.log("");
    console.log("📝 SQL to execute:");
    console.log(alterStatement.trim());
    console.log("");
    
    if (!applyMode) {
      console.log("🔍 DRY RUN - No changes made. Run with --apply to execute.");
      await pool.end();
      return;
    }
    
    // Step 3: Apply the migration
    console.log("🚀 Step 3: Applying migration...");
    await pool.query(alterStatement);
    console.log("✅ ALTER TABLE executed successfully.");
    console.log("");
    
    // Step 4: Verify the column was added
    console.log("📋 Step 4: Verifying column was added...");
    const [verifyColumns] = await pool.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'batches' 
        AND COLUMN_NAME = 'ownership_type'
    `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    
    if (verifyColumns.length > 0) {
      console.log("✅ Verification successful!");
      console.log(`   Column: ${verifyColumns[0].COLUMN_NAME}`);
      console.log(`   Type: ${verifyColumns[0].COLUMN_TYPE}`);
      console.log(`   Nullable: ${verifyColumns[0].IS_NULLABLE}`);
      console.log(`   Default: ${verifyColumns[0].COLUMN_DEFAULT}`);
    } else {
      console.log("❌ Verification FAILED - column not found after migration!");
      process.exit(1);
    }
    
    // Step 5: Count batches to confirm query works
    console.log("");
    console.log("📋 Step 5: Testing batch query...");
    const [batchCount] = await pool.query(`
      SELECT COUNT(*) as count FROM batches WHERE deleted_at IS NULL
    `) as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    console.log(`✅ Batch query successful. Found ${batchCount[0].count} active batches.`);
    
    console.log("");
    console.log("🎉 HOTFIX COMPLETE - Inventory should now be visible!");
    
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
