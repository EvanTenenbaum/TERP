/**
 * Orphan Detection Script
 *
 * Detects orphaned records where FK-like columns reference non-existent records.
 * This is a critical pre-migration audit to identify data integrity issues.
 *
 * Usage: npx tsx scripts/audit/detect-orphans.ts
 * Output: docs/audits/orphan-records.csv
 */

import { getDb } from "../../server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface OrphanRecord {
  table: string;
  column: string;
  orphanValue: number | string;
  count: number;
  referencedTable: string;
}

interface OrphanSummary {
  table: string;
  column: string;
  totalOrphans: number;
  distinctValues: number;
  referencedTable: string;
}

// FK-like columns to check for orphans
const FK_COLUMNS_TO_CHECK = [
  // customerId columns -> clients.id
  {
    table: "invoices",
    column: "customerId",
    referencedTable: "clients",
    referencedColumn: "id",
  },
  {
    table: "sales",
    column: "customerId",
    referencedTable: "clients",
    referencedColumn: "id",
  },
  {
    table: "payments",
    column: "customerId",
    referencedTable: "clients",
    referencedColumn: "id",
  },

  // vendorId columns -> vendors.id (legacy) or clients.id
  {
    table: "lots",
    column: "vendorId",
    referencedTable: "vendors",
    referencedColumn: "id",
  },
  {
    table: "bills",
    column: "vendorId",
    referencedTable: "vendors",
    referencedColumn: "id",
  },
  {
    table: "payments",
    column: "vendorId",
    referencedTable: "vendors",
    referencedColumn: "id",
  },
  {
    table: "brands",
    column: "vendorId",
    referencedTable: "vendors",
    referencedColumn: "id",
  },
  {
    table: "expenses",
    column: "vendorId",
    referencedTable: "vendors",
    referencedColumn: "id",
  },
  {
    table: "payment_history",
    column: "vendorId",
    referencedTable: "vendors",
    referencedColumn: "id",
  },

  // createdBy/updatedBy columns -> users.id
  {
    table: "invoices",
    column: "createdBy",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "sales",
    column: "createdBy",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "cogs_history",
    column: "changedBy",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "audit_logs",
    column: "actorId",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "payment_history",
    column: "recordedBy",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "product_media",
    column: "uploadedBy",
    referencedTable: "users",
    referencedColumn: "id",
  },

  // Other FK-like columns
  {
    table: "invoice_line_items",
    column: "invoiceId",
    referencedTable: "invoices",
    referencedColumn: "id",
  },
  {
    table: "invoice_line_items",
    column: "productId",
    referencedTable: "products",
    referencedColumn: "id",
  },
  {
    table: "invoice_line_items",
    column: "batchId",
    referencedTable: "batches",
    referencedColumn: "id",
  },
  {
    table: "payments",
    column: "invoiceId",
    referencedTable: "invoices",
    referencedColumn: "id",
  },
  {
    table: "payments",
    column: "billId",
    referencedTable: "bills",
    referencedColumn: "id",
  },
  {
    table: "payments",
    column: "bankAccountId",
    referencedTable: "bank_accounts",
    referencedColumn: "id",
  },
  {
    table: "payment_history",
    column: "batchId",
    referencedTable: "batches",
    referencedColumn: "id",
  },
  {
    table: "cogs_history",
    column: "batchId",
    referencedTable: "batches",
    referencedColumn: "id",
  },
  {
    table: "product_media",
    column: "productId",
    referencedTable: "products",
    referencedColumn: "id",
  },
  {
    table: "product_synonyms",
    column: "productId",
    referencedTable: "products",
    referencedColumn: "id",
  },
  {
    table: "product_tags",
    column: "productId",
    referencedTable: "products",
    referencedColumn: "id",
  },
  {
    table: "product_tags",
    column: "tagId",
    referencedTable: "tags",
    referencedColumn: "id",
  },
];

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
    `);
    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = (rows as unknown as Array<{ cnt: number }>)[0]?.cnt ?? 0;
    return count > 0;
  } catch {
    return false;
  }
}

async function checkColumnExists(
  tableName: string,
  columnName: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const result = await db.execute(sql`
      SELECT COUNT(*) as cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
        AND COLUMN_NAME = ${columnName}
    `);
    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = (rows as unknown as Array<{ cnt: number }>)[0]?.cnt ?? 0;
    return count > 0;
  } catch {
    return false;
  }
}

async function detectOrphans(
  table: string,
  column: string,
  referencedTable: string,
  referencedColumn: string
): Promise<OrphanSummary | null> {
  // Check if both tables and columns exist
  const tableExists = await checkTableExists(table);
  const refTableExists = await checkTableExists(referencedTable);

  if (!tableExists) {
    console.log(`  Skipping ${table}.${column} - table does not exist`);
    return null;
  }

  if (!refTableExists) {
    console.log(
      `  Skipping ${table}.${column} - referenced table ${referencedTable} does not exist`
    );
    return null;
  }

  const columnExists = await checkColumnExists(table, column);
  if (!columnExists) {
    // Try snake_case version
    const snakeColumn = column.replace(/([A-Z])/g, "_$1").toLowerCase();
    const snakeColumnExists = await checkColumnExists(table, snakeColumn);
    if (!snakeColumnExists) {
      console.log(`  Skipping ${table}.${column} - column does not exist`);
      return null;
    }
    // Use snake_case version
    return detectOrphansQuery(
      table,
      snakeColumn,
      referencedTable,
      referencedColumn
    );
  }

  return detectOrphansQuery(table, column, referencedTable, referencedColumn);
}

async function detectOrphansQuery(
  table: string,
  column: string,
  referencedTable: string,
  referencedColumn: string
): Promise<OrphanSummary | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    // Build dynamic SQL query
    const query = sql.raw(`
      SELECT COUNT(*) as totalOrphans, COUNT(DISTINCT \`${column}\`) as distinctValues
      FROM \`${table}\`
      WHERE \`${column}\` IS NOT NULL
        AND \`${column}\` NOT IN (SELECT \`${referencedColumn}\` FROM \`${referencedTable}\`)
    `);

    const result = await db.execute(query);
    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    const row = (
      rows as unknown as Array<{ totalOrphans: number; distinctValues: number }>
    )[0];

    if (!row || row.totalOrphans === 0) {
      return null;
    }

    return {
      table,
      column,
      totalOrphans: Number(row.totalOrphans),
      distinctValues: Number(row.distinctValues),
      referencedTable,
    };
  } catch (error) {
    console.error(`  Error checking ${table}.${column}:`, error);
    return null;
  }
}

async function getOrphanDetails(
  table: string,
  column: string,
  referencedTable: string,
  referencedColumn: string,
  limit: number = 100
): Promise<OrphanRecord[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const query = sql.raw(`
      SELECT \`${column}\` as orphanValue, COUNT(*) as count
      FROM \`${table}\`
      WHERE \`${column}\` IS NOT NULL
        AND \`${column}\` NOT IN (SELECT \`${referencedColumn}\` FROM \`${referencedTable}\`)
      GROUP BY \`${column}\`
      ORDER BY count DESC
      LIMIT ${limit}
    `);

    const result = await db.execute(query);
    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;

    return (
      rows as unknown as Array<{ orphanValue: number | string; count: number }>
    ).map(row => ({
      table,
      column,
      orphanValue: row.orphanValue,
      count: Number(row.count),
      referencedTable,
    }));
  } catch {
    return [];
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("ORPHAN DETECTION AUDIT");
  console.log("=".repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log("");

  const summaries: OrphanSummary[] = [];
  const allOrphans: OrphanRecord[] = [];

  for (const check of FK_COLUMNS_TO_CHECK) {
    console.log(
      `Checking ${check.table}.${check.column} -> ${check.referencedTable}.${check.referencedColumn}...`
    );

    const summary = await detectOrphans(
      check.table,
      check.column,
      check.referencedTable,
      check.referencedColumn
    );

    if (summary) {
      summaries.push(summary);
      console.log(
        `  ⚠️  Found ${summary.totalOrphans} orphans (${summary.distinctValues} distinct values)`
      );

      // Get detailed orphan records
      const details = await getOrphanDetails(
        check.table,
        check.column,
        check.referencedTable,
        check.referencedColumn
      );
      allOrphans.push(...details);
    } else {
      console.log(`  ✅ No orphans found`);
    }
  }

  // Generate CSV report
  const outputDir = path.join(process.cwd(), "docs", "audits");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write detailed CSV
  const csvPath = path.join(outputDir, "orphan-records.csv");
  const csvHeader = "table,column,orphan_value,count,referenced_table\n";
  const csvRows = allOrphans
    .map(
      o =>
        `${o.table},${o.column},${o.orphanValue},${o.count},${o.referencedTable}`
    )
    .join("\n");
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  console.log(`\nDetailed report written to: ${csvPath}`);

  // Write summary JSON
  const summaryPath = path.join(outputDir, "orphan-summary.json");
  const summaryData = {
    timestamp: new Date().toISOString(),
    totalOrphanRecords: summaries.reduce((sum, s) => sum + s.totalOrphans, 0),
    tablesWithOrphans: summaries.length,
    summaries,
  };
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  console.log(`Summary report written to: ${summaryPath}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  if (summaries.length === 0) {
    console.log("✅ No orphaned records found!");
  } else {
    console.log(
      `⚠️  Found orphans in ${summaries.length} table/column combinations:`
    );
    console.log("");
    for (const s of summaries) {
      console.log(`  ${s.table}.${s.column}:`);
      console.log(`    Total orphans: ${s.totalOrphans}`);
      console.log(`    Distinct values: ${s.distinctValues}`);
      console.log(`    Should reference: ${s.referencedTable}`);
      console.log("");
    }
    console.log(
      "⚠️  IMPORTANT: Resolve orphaned records BEFORE adding FK constraints!"
    );
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);
  process.exit(summaries.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
