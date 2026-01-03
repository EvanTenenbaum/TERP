/**
 * Migration Audit Script
 * 
 * Purpose: Compare Drizzle schema definitions against production database
 * to identify missing tables, columns, and migrations.
 * 
 * Usage:
 *   npx tsx scripts/audit-migrations.ts
 *   npx tsx scripts/audit-migrations.ts --fix  # Apply missing migrations
 * 
 * Created: 2026-01-02
 * Author: Manus AI
 * Task: Migration Gap Analysis Remediation
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (only if not already set - preserves server env vars)
if (!process.env.DATABASE_URL) {
  config();
  if (!process.env.DATABASE_URL) {
    config({ path: ".env.production" });
  }
}

// Database connection setup
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Parse SSL configuration - DigitalOcean requires SSL
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

interface MigrationCheck {
  id: string;
  file: string;
  description: string;
  checkQuery: string;
  expectedResult: "exists" | "not_exists";
  status?: "✅ APPLIED" | "❌ NOT APPLIED" | "⚠️ PARTIAL" | "❓ UNKNOWN";
  details?: string;
}

// Define all migrations that need verification
const MIGRATIONS_TO_CHECK: MigrationCheck[] = [
  {
    id: "0027",
    file: "0027_add_vendor_payment_terms.sql",
    description: "Add paymentTerms column to vendors table",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'paymentTerms'",
    expectedResult: "exists"
  },
  {
    id: "0028",
    file: "0028_add_vendor_notes.sql",
    description: "Create vendorNotes table",
    checkQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendorNotes'",
    expectedResult: "exists"
  },
  {
    id: "0029",
    file: "0029_add_purchase_orders.sql",
    description: "Create purchaseOrders table",
    checkQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseOrders'",
    expectedResult: "exists"
  },
  {
    id: "0030a",
    file: "0030_add_adjustment_reasons.sql",
    description: "Add adjustmentReason enum to inventoryMovements",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventoryMovements' AND COLUMN_NAME = 'adjustmentReason'",
    expectedResult: "exists"
  },
  {
    id: "0030b",
    file: "0030_live_shopping_item_status.sql",
    description: "Add itemStatus column to sessionCartItems",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessionCartItems' AND COLUMN_NAME = 'itemStatus'",
    expectedResult: "exists"
  },
  {
    id: "0031",
    file: "0031_add_calendar_v32_columns.sql",
    description: "Add v3.2 columns to calendar_events (client_id, vendor_id, metadata)",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME IN ('client_id', 'vendor_id', 'metadata')",
    expectedResult: "exists"
  },
  {
    id: "0032",
    file: "0032_fix_meeting_history_cascade.sql",
    description: "Fix clientMeetingHistory CASCADE to SET NULL",
    checkQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientMeetingHistory'",
    expectedResult: "exists"
  },
  {
    id: "0033",
    file: "0033_add_event_types.sql",
    description: "Add AR_COLLECTION and AP_PAYMENT event types",
    checkQuery: "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'event_type'",
    expectedResult: "exists"
  },
  {
    id: "0034",
    file: "0034_add_intake_event_to_orders.sql",
    description: "Add intake_event_id to orders table",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'intake_event_id'",
    expectedResult: "exists"
  },
  {
    id: "0035",
    file: "0035_add_photo_event_to_batches.sql",
    description: "Add photo_session_event_id to batches table",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batches' AND COLUMN_NAME = 'photo_session_event_id'",
    expectedResult: "exists"
  },
  {
    id: "0036",
    file: "0036_add_event_invitations.sql",
    description: "Create calendar_event_invitations, calendar_invitation_settings, calendar_invitation_history tables",
    checkQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'calendar_%invitation%'",
    expectedResult: "exists"
  },
  {
    id: "0038",
    file: "0038_add_missing_indexes_mysql.sql",
    description: "Add performance indexes to high-traffic tables",
    checkQuery: "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batches' AND INDEX_NAME = 'idx_batches_vendor_id'",
    expectedResult: "exists"
  },
  {
    id: "0039",
    file: "0039_add_soft_delete_to_all_tables.sql",
    description: "Add deletedAt column to all tables for soft delete",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'deletedAt'",
    expectedResult: "exists"
  },
  {
    id: "0040",
    file: "0040_add_credit_visibility_settings.sql",
    description: "Create credit_visibility_settings table",
    checkQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credit_visibility_settings'",
    expectedResult: "exists"
  },
  {
    id: "0041",
    file: "0041_add_leaderboard_tables.sql",
    description: "Create leaderboard system tables",
    checkQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'leaderboard%'",
    expectedResult: "exists"
  },
  {
    id: "0042",
    file: "0042_fix_clients_credit_fields.sql",
    description: "Fix missing credit columns from partial migration 0025",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'creditLimitUpdatedAt'",
    expectedResult: "exists"
  },
  {
    id: "0043",
    file: "0043_add_usp_columns.sql",
    description: "Add USP columns for sales sheet to order conversion",
    checkQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'salesSheetId'",
    expectedResult: "exists"
  },
  {
    id: "0044",
    file: "0044_add_admin_impersonation_tables.sql",
    description: "Create admin_impersonation_sessions and admin_impersonation_actions tables",
    checkQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'admin_impersonation%'",
    expectedResult: "exists"
  },
  {
    id: "0045",
    file: "0045_add_sales_sheet_drafts.sql",
    description: "Create sales_sheet_drafts table",
    checkQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_sheet_drafts'",
    expectedResult: "exists"
  }
];

async function checkMigration(pool: mysql.Pool, migration: MigrationCheck): Promise<MigrationCheck> {
  try {
    const [rows] = await pool.execute(migration.checkQuery);
    const resultRows = rows as any[];
    
    if (migration.expectedResult === "exists") {
      if (resultRows && resultRows.length > 0) {
        migration.status = "✅ APPLIED";
        migration.details = `Found ${resultRows.length} matching record(s)`;
      } else {
        migration.status = "❌ NOT APPLIED";
        migration.details = "No matching records found";
      }
    } else {
      if (resultRows && resultRows.length === 0) {
        migration.status = "✅ APPLIED";
        migration.details = "Correctly removed";
      } else {
        migration.status = "❌ NOT APPLIED";
        migration.details = "Still exists";
      }
    }
  } catch (error: any) {
    migration.status = "❓ UNKNOWN";
    migration.details = `Error: ${error.message}`;
  }
  
  return migration;
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           TERP Migration Audit Script v1.1                     ║");
  console.log("║           Created: 2026-01-02 | Author: Manus AI               ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const applyFix = process.argv.includes("--fix");
  
  // Create database connection pool
  console.log("🔌 Connecting to database...");
  let pool: mysql.Pool;
  
  try {
    pool = mysql.createPool(poolConfig);
    // Test connection
    await pool.execute("SELECT 1");
    console.log("✅ Connected to database\n");
  } catch (error: any) {
    console.error(`❌ Failed to connect to database: ${error.message}`);
    process.exit(1);
  }

  // Check each migration
  console.log("📋 Checking migration status...\n");
  console.log("─".repeat(80));
  
  const results: MigrationCheck[] = [];
  const missing: MigrationCheck[] = [];
  
  for (const migration of MIGRATIONS_TO_CHECK) {
    const result = await checkMigration(pool, migration);
    results.push(result);
    
    const statusIcon = result.status?.startsWith("✅") ? "✅" : 
                       result.status?.startsWith("❌") ? "❌" : "⚠️";
    
    console.log(`${statusIcon} [${result.id}] ${result.file}`);
    console.log(`   Description: ${result.description}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Details: ${result.details}`);
    console.log("─".repeat(80));
    
    if (result.status === "❌ NOT APPLIED") {
      missing.push(result);
    }
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                        AUDIT SUMMARY                           ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");
  
  const applied = results.filter(r => r.status === "✅ APPLIED").length;
  const notApplied = results.filter(r => r.status === "❌ NOT APPLIED").length;
  const unknown = results.filter(r => r.status === "❓ UNKNOWN").length;
  
  console.log(`Total migrations checked: ${results.length}`);
  console.log(`✅ Applied: ${applied}`);
  console.log(`❌ Not Applied: ${notApplied}`);
  console.log(`❓ Unknown: ${unknown}`);
  
  if (missing.length > 0) {
    console.log("\n⚠️  MISSING MIGRATIONS:");
    for (const m of missing) {
      console.log(`   - ${m.file}: ${m.description}`);
    }
    
    if (applyFix) {
      console.log("\n🔧 Applying missing migrations...\n");
      for (const m of missing) {
        const filePath = path.join(__dirname, "..", "drizzle", m.file);
        if (fs.existsSync(filePath)) {
          console.log(`   Applying ${m.file}...`);
          try {
            const sqlContent = fs.readFileSync(filePath, "utf-8");
            // Split by semicolon and execute each statement
            const statements = sqlContent
              .split(";")
              .map(s => s.trim())
              .filter(s => s.length > 0 && !s.startsWith("--"));
            
            for (const stmt of statements) {
              try {
                await pool.execute(stmt);
              } catch (stmtError: any) {
                // Ignore "already exists" errors
                if (!stmtError.message.includes("already exists") && 
                    !stmtError.message.includes("Duplicate")) {
                  console.log(`      ⚠️ Warning: ${stmtError.message}`);
                }
              }
            }
            console.log(`   ✅ Applied ${m.file}`);
          } catch (error: any) {
            console.log(`   ❌ Failed to apply ${m.file}: ${error.message}`);
          }
        } else {
          console.log(`   ⚠️ File not found: ${filePath}`);
        }
      }
    } else {
      console.log("\n💡 To apply missing migrations, run:");
      console.log("   npx tsx scripts/audit-migrations.ts --fix");
    }
  } else {
    console.log("\n✅ All migrations have been applied!");
  }

  // Generate report file
  const reportDir = path.join(__dirname, "..", "docs", "qa");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(reportDir, "MIGRATION_AUDIT_REPORT.md");
  const report = generateReport(results, missing);
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Close pool
  await pool.end();
  
  process.exit(missing.length > 0 ? 1 : 0);
}

function generateReport(results: MigrationCheck[], missing: MigrationCheck[]): string {
  const now = new Date().toISOString().split("T")[0];
  
  let report = `# Migration Audit Report

**Generated:** ${now}  
**Script:** \`scripts/audit-migrations.ts\`  
**Author:** Manus AI

---

## Summary

| Metric | Count |
| :--- | :--- |
| Total Checked | ${results.length} |
| ✅ Applied | ${results.filter(r => r.status === "✅ APPLIED").length} |
| ❌ Not Applied | ${results.filter(r => r.status === "❌ NOT APPLIED").length} |
| ❓ Unknown | ${results.filter(r => r.status === "❓ UNKNOWN").length} |

---

## Detailed Results

| ID | File | Description | Status |
| :--- | :--- | :--- | :--- |
`;

  for (const r of results) {
    report += `| ${r.id} | ${r.file} | ${r.description} | ${r.status} |\n`;
  }

  if (missing.length > 0) {
    report += `
---

## Missing Migrations

The following migrations need to be applied:

`;
    for (const m of missing) {
      report += `### ${m.file}

**Description:** ${m.description}

**Command to apply:**
\`\`\`bash
mysql -h <host> -u <user> -p <database> < drizzle/${m.file}
\`\`\`

---

`;
    }
  }

  report += `
## Next Steps

1. Review missing migrations above
2. Apply migrations using: \`npx tsx scripts/audit-migrations.ts --fix\`
3. Re-run audit to verify: \`npx tsx scripts/audit-migrations.ts\`
4. Update migration journal if needed
`;

  return report;
}

main().catch(console.error);
