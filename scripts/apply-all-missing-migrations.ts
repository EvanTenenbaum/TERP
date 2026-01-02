/**
 * Apply All Missing Migrations Script
 * 
 * Purpose: Apply all migrations that are missing from the production database
 * in the correct order, with verification before and after each migration.
 * 
 * Usage:
 *   npx tsx scripts/apply-all-missing-migrations.ts           # Dry run (show what would be applied)
 *   npx tsx scripts/apply-all-missing-migrations.ts --apply   # Actually apply migrations
 *   npx tsx scripts/apply-all-missing-migrations.ts --force   # Apply even if verification fails
 * 
 * Created: 2026-01-02
 * Author: Manus AI
 * Task: Migration Gap Analysis Remediation
 */

import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// Import database connection
const getDb = async () => {
  const { getDb: getDatabase } = await import("../server/db.js");
  return getDatabase();
};

interface Migration {
  id: string;
  file: string;
  description: string;
  dependencies: string[];
  verifyQuery: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  feature?: string;
}

// Ordered list of migrations to apply
const MIGRATIONS: Migration[] = [
  {
    id: "0027",
    file: "0027_add_vendor_payment_terms.sql",
    description: "Add paymentTerms column to vendors table",
    dependencies: [],
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND COLUMN_NAME = 'paymentTerms'",
    priority: "MEDIUM",
    feature: "MF-015"
  },
  {
    id: "0028",
    file: "0028_add_vendor_notes.sql",
    description: "Create vendorNotes table",
    dependencies: ["0027"],
    verifyQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vendorNotes'",
    priority: "MEDIUM",
    feature: "MF-016"
  },
  {
    id: "0029",
    file: "0029_add_purchase_orders.sql",
    description: "Create purchaseOrders table",
    dependencies: [],
    verifyQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchaseOrders'",
    priority: "MEDIUM",
    feature: "Purchase Orders"
  },
  {
    id: "0030a",
    file: "0030_add_adjustment_reasons.sql",
    description: "Add adjustmentReason enum to inventoryMovements",
    dependencies: [],
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inventoryMovements' AND COLUMN_NAME = 'adjustmentReason'",
    priority: "MEDIUM",
    feature: "Inventory"
  },
  {
    id: "0030b",
    file: "0030_live_shopping_item_status.sql",
    description: "Add itemStatus column to sessionCartItems",
    dependencies: [],
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sessionCartItems' AND COLUMN_NAME = 'itemStatus'",
    priority: "MEDIUM",
    feature: "Live Shopping"
  },
  {
    id: "0031",
    file: "0031_add_calendar_v32_columns.sql",
    description: "Add v3.2 columns to calendar_events",
    dependencies: [],
    verifyQuery: "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME IN ('client_id', 'vendor_id', 'metadata')",
    priority: "HIGH",
    feature: "Calendar v3.2"
  },
  {
    id: "0032",
    file: "0032_fix_meeting_history_cascade.sql",
    description: "Fix clientMeetingHistory CASCADE to SET NULL",
    dependencies: ["0031"],
    verifyQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientMeetingHistory'",
    priority: "HIGH",
    feature: "Calendar v3.2"
  },
  {
    id: "0033",
    file: "0033_add_event_types.sql",
    description: "Add AR_COLLECTION and AP_PAYMENT event types",
    dependencies: ["0031"],
    verifyQuery: "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_events' AND COLUMN_NAME = 'event_type'",
    priority: "HIGH",
    feature: "Calendar v3.2"
  },
  {
    id: "0034",
    file: "0034_add_intake_event_to_orders.sql",
    description: "Add intake_event_id to orders table",
    dependencies: ["0031"],
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'intake_event_id'",
    priority: "HIGH",
    feature: "Calendar v3.2"
  },
  {
    id: "0035",
    file: "0035_add_photo_event_to_batches.sql",
    description: "Add photo_session_event_id to batches table",
    dependencies: ["0031"],
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batches' AND COLUMN_NAME = 'photo_session_event_id'",
    priority: "HIGH",
    feature: "Calendar v3.2"
  },
  {
    id: "0036",
    file: "0036_add_event_invitations.sql",
    description: "Create event invitation tables (QA-044)",
    dependencies: ["0031"],
    verifyQuery: "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('calendar_event_invitations', 'calendar_invitation_settings', 'calendar_invitation_history')",
    priority: "CRITICAL",
    feature: "QA-044"
  },
  {
    id: "0038",
    file: "0038_add_missing_indexes_mysql.sql",
    description: "Add performance indexes to high-traffic tables",
    dependencies: [],
    verifyQuery: "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batches' AND INDEX_NAME = 'idx_batches_vendor_id'",
    priority: "MEDIUM",
    feature: "ST-005"
  },
  {
    id: "0039",
    file: "0039_add_soft_delete_to_all_tables.sql",
    description: "Add deletedAt column to all tables for soft delete",
    dependencies: [],
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'deletedAt'",
    priority: "MEDIUM",
    feature: "ST-013"
  },
  {
    id: "0040",
    file: "0040_add_credit_visibility_settings.sql",
    description: "Create credit_visibility_settings table",
    dependencies: [],
    verifyQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credit_visibility_settings'",
    priority: "HIGH",
    feature: "Credit System"
  },
  {
    id: "0041",
    file: "0041_add_leaderboard_tables.sql",
    description: "Create leaderboard system tables",
    dependencies: [],
    verifyQuery: "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'leaderboard%'",
    priority: "LOW",
    feature: "Leaderboard"
  },
  {
    id: "0042",
    file: "0042_fix_clients_credit_fields.sql",
    description: "Fix missing credit columns from partial migration 0025",
    dependencies: ["0040"],
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'creditLimitUpdatedAt'",
    priority: "HIGH",
    feature: "Credit System"
  },
  {
    id: "0043",
    file: "0043_add_usp_columns.sql",
    description: "Add USP columns for sales sheet to order conversion",
    dependencies: [],
    verifyQuery: "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'salesSheetId'",
    priority: "MEDIUM",
    feature: "Sales Portal"
  },
  {
    id: "0044",
    file: "0044_add_admin_impersonation_tables.sql",
    description: "Create admin impersonation tables (FEATURE-012)",
    dependencies: [],
    verifyQuery: "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'admin_impersonation%'",
    priority: "CRITICAL",
    feature: "FEATURE-012"
  },
  {
    id: "0045",
    file: "0045_add_sales_sheet_drafts.sql",
    description: "Create sales_sheet_drafts table",
    dependencies: [],
    verifyQuery: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_sheet_drafts'",
    priority: "MEDIUM",
    feature: "QA-062"
  }
];

async function checkMigrationApplied(db: any, migration: Migration): Promise<boolean> {
  try {
    const result = await db.execute(sql.raw(migration.verifyQuery));
    const rows = result[0] as any[];
    
    // Handle COUNT queries
    if (rows && rows.length > 0 && 'cnt' in rows[0]) {
      return rows[0].cnt > 0;
    }
    
    return rows && rows.length > 0;
  } catch (error) {
    return false;
  }
}

async function applyMigration(db: any, migration: Migration): Promise<{ success: boolean; error?: string }> {
  const filePath = path.join(__dirname, "..", "drizzle", migration.file);
  
  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }
  
  try {
    const sqlContent = fs.readFileSync(filePath, "utf-8");
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));
    
    for (const stmt of statements) {
      try {
        await db.execute(sql.raw(stmt));
      } catch (stmtError: any) {
        // Ignore "already exists" errors
        if (!stmtError.message.includes("already exists") && 
            !stmtError.message.includes("Duplicate") &&
            !stmtError.message.includes("doesn't exist")) {
          console.log(`      ⚠️ Statement warning: ${stmtError.message.substring(0, 100)}`);
        }
      }
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║        TERP Apply All Missing Migrations Script v1.0           ║");
  console.log("║        Created: 2026-01-02 | Author: Manus AI                  ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const applyMode = process.argv.includes("--apply");
  const forceMode = process.argv.includes("--force");
  
  if (!applyMode) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
    console.log("   Use --apply to actually apply migrations\n");
  } else {
    console.log("⚠️  APPLY MODE - Migrations will be applied to the database\n");
  }

  // Get database connection
  console.log("🔌 Connecting to database...");
  const db = await getDb();
  
  if (!db) {
    console.error("❌ Failed to connect to database");
    process.exit(1);
  }
  console.log("✅ Connected to database\n");

  // Check which migrations need to be applied
  console.log("📋 Checking migration status...\n");
  
  const toApply: Migration[] = [];
  const alreadyApplied: Migration[] = [];
  
  for (const migration of MIGRATIONS) {
    const isApplied = await checkMigrationApplied(db, migration);
    
    if (isApplied) {
      alreadyApplied.push(migration);
      console.log(`✅ [${migration.id}] ${migration.file} - Already applied`);
    } else {
      toApply.push(migration);
      console.log(`❌ [${migration.id}] ${migration.file} - Needs to be applied`);
    }
  }

  console.log("\n" + "─".repeat(80));
  console.log(`\n📊 Summary: ${alreadyApplied.length} applied, ${toApply.length} pending\n`);

  if (toApply.length === 0) {
    console.log("✅ All migrations have been applied! Nothing to do.");
    process.exit(0);
  }

  // Sort by priority
  const priorityOrder = { "CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3 };
  toApply.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  console.log("📋 Migrations to apply (sorted by priority):\n");
  for (const m of toApply) {
    const priorityIcon = m.priority === "CRITICAL" ? "🔴" : 
                         m.priority === "HIGH" ? "🟠" : 
                         m.priority === "MEDIUM" ? "🟡" : "🟢";
    console.log(`   ${priorityIcon} [${m.id}] ${m.file}`);
    console.log(`      ${m.description}`);
    if (m.feature) console.log(`      Feature: ${m.feature}`);
  }

  if (!applyMode) {
    console.log("\n💡 To apply these migrations, run:");
    console.log("   npx tsx scripts/apply-all-missing-migrations.ts --apply\n");
    process.exit(0);
  }

  // Apply migrations
  console.log("\n🚀 Applying migrations...\n");
  
  let successCount = 0;
  let failCount = 0;
  const results: { migration: Migration; success: boolean; error?: string }[] = [];

  for (const migration of toApply) {
    console.log(`\n📦 Applying [${migration.id}] ${migration.file}...`);
    
    const result = await applyMigration(db, migration);
    results.push({ migration, ...result });
    
    if (result.success) {
      // Verify the migration was applied
      const verified = await checkMigrationApplied(db, migration);
      if (verified) {
        console.log(`   ✅ Successfully applied and verified`);
        successCount++;
      } else {
        console.log(`   ⚠️ Applied but verification failed`);
        if (!forceMode) {
          console.log(`   ❌ Stopping due to verification failure. Use --force to continue.`);
          break;
        }
        failCount++;
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
      failCount++;
      if (!forceMode) {
        console.log(`   ❌ Stopping due to failure. Use --force to continue.`);
        break;
      }
    }
  }

  // Final summary
  console.log("\n" + "═".repeat(80));
  console.log("\n📊 FINAL RESULTS:\n");
  console.log(`   ✅ Successfully applied: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⏭️ Skipped: ${toApply.length - successCount - failCount}`);

  // Generate report
  const reportPath = path.join(__dirname, "..", "docs", "qa", "MIGRATION_APPLICATION_REPORT.md");
  const report = generateReport(results, alreadyApplied);
  
  // Ensure directory exists
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved to: ${reportPath}`);

  process.exit(failCount > 0 ? 1 : 0);
}

function generateReport(
  results: { migration: Migration; success: boolean; error?: string }[],
  alreadyApplied: Migration[]
): string {
  const now = new Date().toISOString();
  
  let report = `# Migration Application Report

**Generated:** ${now}  
**Script:** \`scripts/apply-all-missing-migrations.ts\`  
**Author:** Manus AI

---

## Summary

| Metric | Count |
| :--- | :--- |
| Already Applied | ${alreadyApplied.length} |
| Newly Applied | ${results.filter(r => r.success).length} |
| Failed | ${results.filter(r => !r.success).length} |

---

## Already Applied Migrations

| ID | File | Feature |
| :--- | :--- | :--- |
`;

  for (const m of alreadyApplied) {
    report += `| ${m.id} | ${m.file} | ${m.feature || '-'} |\n`;
  }

  report += `
---

## Newly Applied Migrations

| ID | File | Status | Notes |
| :--- | :--- | :--- | :--- |
`;

  for (const r of results) {
    const status = r.success ? "✅ Success" : "❌ Failed";
    const notes = r.error || "-";
    report += `| ${r.migration.id} | ${r.migration.file} | ${status} | ${notes} |\n`;
  }

  report += `
---

## Next Steps

1. Verify all migrations applied correctly: \`npx tsx scripts/audit-migrations.ts\`
2. Test affected features in staging environment
3. Update migration journal if needed
4. Deploy to production
`;

  return report;
}

main().catch(console.error);
