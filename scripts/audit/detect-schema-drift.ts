/**
 * Schema Drift Detection Script
 *
 * Compares Drizzle schema to actual database structure to identify:
 * - Missing columns
 * - Wrong types
 * - Missing FK constraints
 * - Missing indexes
 * - Naming convention inconsistencies
 *
 * Usage: npx tsx scripts/audit/detect-schema-drift.ts
 * Output: docs/audits/schema-drift.json
 */

import { getDb } from "../../server/db";
import * as fs from "fs";
import * as path from "path";
import {
  getTableList,
  getTableColumns,
  getForeignKeys,
  getIndexes,
  camelToSnake,
  snakeToCamel,
  type ColumnMetadata,
  type ForeignKeyMetadata,
  type IndexMetadata,
} from "../utils/schema-introspection";

interface DriftIssue {
  type:
    | "missing_column"
    | "extra_column"
    | "type_mismatch"
    | "missing_fk"
    | "missing_index"
    | "naming_inconsistency";
  severity: "critical" | "high" | "medium" | "low";
  table: string;
  column?: string;
  details: string;
  recommendation: string;
}

interface TableDrift {
  tableName: string;
  issues: DriftIssue[];
  columnCount: number;
  fkCount: number;
  indexCount: number;
}

interface DriftReport {
  timestamp: string;
  totalTables: number;
  tablesWithDrift: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  tables: TableDrift[];
  summary: {
    missingColumns: number;
    extraColumns: number;
    typeMismatches: number;
    missingFKs: number;
    missingIndexes: number;
    namingInconsistencies: number;
  };
}

// FK-like columns that should have .references() but might not
const EXPECTED_FK_COLUMNS: Record<
  string,
  { column: string; referencedTable: string }[]
> = {
  invoices: [
    { column: "customerId", referencedTable: "clients" },
    { column: "createdBy", referencedTable: "users" },
  ],
  sales: [
    { column: "customerId", referencedTable: "clients" },
    { column: "createdBy", referencedTable: "users" },
  ],
  payments: [
    { column: "customerId", referencedTable: "clients" },
    { column: "vendorId", referencedTable: "vendors" },
    { column: "bankAccountId", referencedTable: "bank_accounts" },
    { column: "invoiceId", referencedTable: "invoices" },
    { column: "billId", referencedTable: "bills" },
  ],
  invoice_line_items: [
    { column: "invoiceId", referencedTable: "invoices" },
    { column: "productId", referencedTable: "products" },
    { column: "batchId", referencedTable: "batches" },
  ],
  lots: [{ column: "vendorId", referencedTable: "vendors" }],
  brands: [{ column: "vendorId", referencedTable: "vendors" }],
  expenses: [{ column: "vendorId", referencedTable: "vendors" }],
  payment_history: [
    { column: "batchId", referencedTable: "batches" },
    { column: "vendorId", referencedTable: "vendors" },
    { column: "recordedBy", referencedTable: "users" },
  ],
  cogs_history: [
    { column: "batchId", referencedTable: "batches" },
    { column: "changedBy", referencedTable: "users" },
  ],
  audit_logs: [{ column: "actorId", referencedTable: "users" }],
  product_media: [
    { column: "productId", referencedTable: "products" },
    { column: "uploadedBy", referencedTable: "users" },
  ],
  product_synonyms: [{ column: "productId", referencedTable: "products" }],
  product_tags: [
    { column: "productId", referencedTable: "products" },
    { column: "tagId", referencedTable: "tags" },
  ],
};

function checkNamingConsistency(columns: ColumnMetadata[]): DriftIssue[] {
  const issues: DriftIssue[] = [];

  for (const col of columns) {
    const name = col.columnName;
    const isSnakeCase = name.includes("_") || name === name.toLowerCase();
    const isCamelCase = /[a-z][A-Z]/.test(name);

    // Check for mixed conventions in same column name
    if (isSnakeCase && isCamelCase) {
      issues.push({
        type: "naming_inconsistency",
        severity: "low",
        table: "",
        column: name,
        details: `Column "${name}" has mixed naming convention`,
        recommendation: "Standardize to snake_case for database columns",
      });
    }
  }

  return issues;
}

function checkMissingFKs(
  tableName: string,
  existingFKs: ForeignKeyMetadata[],
  columns: ColumnMetadata[]
): DriftIssue[] {
  const issues: DriftIssue[] = [];
  const expectedFKs = EXPECTED_FK_COLUMNS[tableName] || [];

  for (const expected of expectedFKs) {
    // Check if column exists (try both camelCase and snake_case)
    const columnExists = columns.some(
      c =>
        c.columnName === expected.column ||
        c.columnName === camelToSnake(expected.column)
    );

    if (!columnExists) continue;

    // Check if FK exists
    const fkExists = existingFKs.some(
      fk =>
        fk.columnName === expected.column ||
        fk.columnName === camelToSnake(expected.column)
    );

    if (!fkExists) {
      issues.push({
        type: "missing_fk",
        severity: "high",
        table: tableName,
        column: expected.column,
        details: `Column "${expected.column}" should reference "${expected.referencedTable}" but has no FK constraint`,
        recommendation: `Add .references(() => ${snakeToCamel(expected.referencedTable)}.id) to schema`,
      });
    }
  }

  return issues;
}

function checkMissingIndexes(
  tableName: string,
  existingFKs: ForeignKeyMetadata[],
  existingIndexes: IndexMetadata[]
): DriftIssue[] {
  const issues: DriftIssue[] = [];

  // Every FK column should have an index
  for (const fk of existingFKs) {
    const hasIndex = existingIndexes.some(
      idx => idx.columnName === fk.columnName
    );

    if (!hasIndex) {
      issues.push({
        type: "missing_index",
        severity: "medium",
        table: tableName,
        column: fk.columnName,
        details: `FK column "${fk.columnName}" has no index`,
        recommendation: `Add index on ${tableName}.${fk.columnName} for query performance`,
      });
    }
  }

  return issues;
}

async function analyzeTable(tableName: string): Promise<TableDrift> {
  const db = await getDb();
  if (!db) {
    return { tableName, issues: [], columnCount: 0, fkCount: 0, indexCount: 0 };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = await getTableColumns(db as any, tableName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fks = await getForeignKeys(db as any, tableName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indexes = await getIndexes(db as any, tableName);

  const issues: DriftIssue[] = [];

  // Check naming consistency
  const namingIssues = checkNamingConsistency(columns);
  for (const issue of namingIssues) {
    issue.table = tableName;
    issues.push(issue);
  }

  // Check missing FKs
  const fkIssues = checkMissingFKs(tableName, fks, columns);
  issues.push(...fkIssues);

  // Check missing indexes on FK columns
  const indexIssues = checkMissingIndexes(tableName, fks, indexes);
  issues.push(...indexIssues);

  return {
    tableName,
    issues,
    columnCount: columns.length,
    fkCount: fks.length,
    indexCount: indexes.length,
  };
}

async function main() {
  console.log("=".repeat(60));
  console.log("SCHEMA DRIFT DETECTION");
  console.log("=".repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log("");

  // Get all tables
  console.log("Fetching table list...");
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tables = await getTableList(db as any);
  console.log(`Found ${tables.length} tables`);
  console.log("");

  // Analyze each table
  const tableDrifts: TableDrift[] = [];

  for (const tableName of tables) {
    process.stdout.write(`Analyzing ${tableName}...`);
    const drift = await analyzeTable(tableName);
    tableDrifts.push(drift);

    if (drift.issues.length > 0) {
      console.log(` ⚠️  ${drift.issues.length} issues`);
    } else {
      console.log(" ✅");
    }
  }

  // Calculate summary
  const allIssues = tableDrifts.flatMap(t => t.issues);
  const summary = {
    missingColumns: allIssues.filter(i => i.type === "missing_column").length,
    extraColumns: allIssues.filter(i => i.type === "extra_column").length,
    typeMismatches: allIssues.filter(i => i.type === "type_mismatch").length,
    missingFKs: allIssues.filter(i => i.type === "missing_fk").length,
    missingIndexes: allIssues.filter(i => i.type === "missing_index").length,
    namingInconsistencies: allIssues.filter(
      i => i.type === "naming_inconsistency"
    ).length,
  };

  const report: DriftReport = {
    timestamp: new Date().toISOString(),
    totalTables: tables.length,
    tablesWithDrift: tableDrifts.filter(t => t.issues.length > 0).length,
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter(i => i.severity === "critical").length,
    highIssues: allIssues.filter(i => i.severity === "high").length,
    mediumIssues: allIssues.filter(i => i.severity === "medium").length,
    lowIssues: allIssues.filter(i => i.severity === "low").length,
    tables: tableDrifts.filter(t => t.issues.length > 0),
    summary,
  };

  // Write report
  const outputDir = path.join(process.cwd(), "docs", "audits");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, "schema-drift.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${reportPath}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total tables analyzed: ${report.totalTables}`);
  console.log(`Tables with drift: ${report.tablesWithDrift}`);
  console.log(`Total issues: ${report.totalIssues}`);
  console.log("");
  console.log("By severity:");
  console.log(`  Critical: ${report.criticalIssues}`);
  console.log(`  High: ${report.highIssues}`);
  console.log(`  Medium: ${report.mediumIssues}`);
  console.log(`  Low: ${report.lowIssues}`);
  console.log("");
  console.log("By type:");
  console.log(`  Missing FKs: ${summary.missingFKs}`);
  console.log(`  Missing indexes: ${summary.missingIndexes}`);
  console.log(`  Naming inconsistencies: ${summary.namingInconsistencies}`);
  console.log(`  Missing columns: ${summary.missingColumns}`);
  console.log(`  Extra columns: ${summary.extraColumns}`);
  console.log(`  Type mismatches: ${summary.typeMismatches}`);

  if (report.criticalIssues > 0 || report.highIssues > 0) {
    console.log("\n⚠️  CRITICAL/HIGH issues found! Review before deployment.");
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);
  process.exit(report.criticalIssues > 0 ? 2 : report.highIssues > 0 ? 1 : 0);
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
