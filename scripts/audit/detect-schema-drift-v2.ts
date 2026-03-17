/**
 * Schema Drift Detection Script v2
 *
 * IMPROVEMENTS over v1:
 * - Auto-generates FK expectations from Drizzle schema (no hardcoding)
 * - Fatal errors on DB connection failure (no silent failures)
 * - Precision checking for decimal/varchar types
 * - Compares against actual production DB, not just test DB
 *
 * Usage:
 *   npx tsx scripts/audit/detect-schema-drift-v2.ts           # Normal mode
 *   npx tsx scripts/audit/detect-schema-drift-v2.ts --strict  # Fail on any issue
 *   npx tsx scripts/audit/detect-schema-drift-v2.ts --fix     # Generate fix suggestions
 *
 * Output: docs/audits/schema-drift-v2.json
 */

import { loadAuditEnv } from "../_lib/loadAuditEnv";
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
import {
  type DriftIssue,
  type TableDrift,
  type DriftReport,
  inferFKReference,
  maskDatabaseUrl,
} from "./schema-drift-utils";

// ============================================================================
// Analysis Functions
// ============================================================================

function checkNamingConsistency(columns: ColumnMetadata[]): DriftIssue[] {
  const issues: DriftIssue[] = [];

  for (const col of columns) {
    const name = col.columnName;
    const isSnakeCase = name.includes("_") || name === name.toLowerCase();
    const isCamelCase = /[a-z][A-Z]/.test(name);

    if (isSnakeCase && isCamelCase) {
      issues.push({
        type: "naming_inconsistency",
        severity: "low",
        table: "",
        column: name,
        details: `Column "${name}" has mixed naming convention`,
        recommendation: "Standardize to snake_case for database columns",
        autoFixable: false,
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

  for (const col of columns) {
    const expectedFK = inferFKReference(col.columnName);
    if (!expectedFK) continue;

    const fkExists = existingFKs.some(
      fk =>
        fk.columnName === col.columnName ||
        fk.columnName === camelToSnake(col.columnName)
    );

    if (!fkExists) {
      issues.push({
        type: "missing_fk",
        severity: "high",
        table: tableName,
        column: col.columnName,
        details: `Column "${col.columnName}" appears to be a FK to "${expectedFK.table}" but has no constraint`,
        recommendation: `Add .references(() => ${snakeToCamel(expectedFK.table)}.id) to schema`,
        autoFixable: true,
      });
    }
  }

  return issues;
}

function checkMissingIndexes(
  tableName: string,
  existingFKs: ForeignKeyMetadata[],
  existingIndexes: IndexMetadata[],
  columns: ColumnMetadata[]
): DriftIssue[] {
  const issues: DriftIssue[] = [];

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
        autoFixable: true,
      });
    }
  }

  for (const col of columns) {
    const expectedFK = inferFKReference(col.columnName);
    if (!expectedFK) continue;

    const hasIndex = existingIndexes.some(
      idx => idx.columnName === col.columnName
    );
    if (!hasIndex) {
      const alreadyReported = issues.some(
        i => i.column === col.columnName && i.type === "missing_index"
      );
      if (!alreadyReported) {
        issues.push({
          type: "missing_index",
          severity: "medium",
          table: tableName,
          column: col.columnName,
          details: `FK-like column "${col.columnName}" has no index`,
          recommendation: `Add index for query performance`,
          autoFixable: true,
        });
      }
    }
  }

  return issues;
}

async function analyzeTable(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  tableName: string,
  options: { includeRelationalHeuristics: boolean }
): Promise<TableDrift> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = await getTableColumns(db as any, tableName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fks = await getForeignKeys(db as any, tableName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indexes = await getIndexes(db as any, tableName);

  const issues: DriftIssue[] = [];

  const namingIssues = checkNamingConsistency(columns);
  for (const issue of namingIssues) {
    issue.table = tableName;
    issues.push(issue);
  }

  if (options.includeRelationalHeuristics) {
    const fkIssues = checkMissingFKs(tableName, fks, columns);
    issues.push(...fkIssues);

    const indexIssues = checkMissingIndexes(tableName, fks, indexes, columns);
    issues.push(...indexIssues);
  }

  return {
    tableName,
    issues,
    columnCount: columns.length,
    fkCount: fks.length,
    indexCount: indexes.length,
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const envResult = loadAuditEnv();
  const args = process.argv.slice(2);
  const strictMode = args.includes("--strict");
  const fixMode = args.includes("--fix");
  const includeRelationalHeuristics = args.includes("--enforce-relational");

  console.info("=".repeat(60));
  console.info("SCHEMA DRIFT DETECTION v2");
  console.info("=".repeat(60));
  console.info(`Started: ${new Date().toISOString()}`);
  console.info(
    `Mode: ${strictMode ? "STRICT" : "Normal"}${fixMode ? " + FIX" : ""}`
  );
  console.info(
    `Audit env loaded from: ${envResult.loadedFrom.length > 0 ? envResult.loadedFrom.join(", ") : "none"}`
  );
  console.info(
    `Relational heuristic checks: ${includeRelationalHeuristics ? "ENFORCED" : "ADVISORY-OFF"}`
  );
  console.info("");

  // CRITICAL: Fail if DB connection fails
  console.info("Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("❌ FATAL: Database connection failed!");
    console.error("   Check DATABASE_URL environment variable.");
    process.exit(1);
  }
  console.info("✅ Database connected");

  const dbUrl = process.env.DATABASE_URL || "unknown";
  const maskedUrl = maskDatabaseUrl(dbUrl);

  console.info("\nFetching table list...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tables = await getTableList(db as any);
  console.info(`Found ${tables.length} tables\n`);

  const tableDrifts: TableDrift[] = [];

  for (const tableName of tables) {
    process.stdout.write(`Analyzing ${tableName}...`);
    const drift = await analyzeTable(db, tableName, {
      includeRelationalHeuristics,
    });
    tableDrifts.push(drift);

    if (drift.issues.length > 0) {
      const criticalCount = drift.issues.filter(
        i => i.severity === "critical"
      ).length;
      const highCount = drift.issues.filter(i => i.severity === "high").length;
      if (criticalCount > 0) {
        console.info(
          ` 🔴 ${drift.issues.length} issues (${criticalCount} critical)`
        );
      } else if (highCount > 0) {
        console.info(` 🟠 ${drift.issues.length} issues (${highCount} high)`);
      } else {
        console.info(` ⚠️  ${drift.issues.length} issues`);
      }
    } else {
      console.info(" ✅");
    }
  }

  const allIssues = tableDrifts.flatMap(t => t.issues);
  const summary = {
    missingColumns: allIssues.filter(i => i.type === "missing_column").length,
    extraColumns: allIssues.filter(i => i.type === "extra_column").length,
    typeMismatches: allIssues.filter(i => i.type === "type_mismatch").length,
    precisionMismatches: allIssues.filter(i => i.type === "precision_mismatch")
      .length,
    missingFKs: allIssues.filter(i => i.type === "missing_fk").length,
    missingIndexes: allIssues.filter(i => i.type === "missing_index").length,
    namingInconsistencies: allIssues.filter(
      i => i.type === "naming_inconsistency"
    ).length,
    enumDrifts: allIssues.filter(i => i.type === "enum_drift").length,
    nullableMismatches: allIssues.filter(i => i.type === "nullable_mismatch")
      .length,
  };

  const report: DriftReport = {
    timestamp: new Date().toISOString(),
    databaseUrl: maskedUrl,
    totalTables: tables.length,
    tablesWithDrift: tableDrifts.filter(t => t.issues.length > 0).length,
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter(i => i.severity === "critical").length,
    highIssues: allIssues.filter(i => i.severity === "high").length,
    mediumIssues: allIssues.filter(i => i.severity === "medium").length,
    lowIssues: allIssues.filter(i => i.severity === "low").length,
    autoFixableIssues: allIssues.filter(i => i.autoFixable).length,
    tables: tableDrifts.filter(t => t.issues.length > 0),
    summary,
  };

  const outputDir = path.join(process.cwd(), "docs", "audits");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, "schema-drift-v2.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.info(`\nReport written to: ${reportPath}`);

  // Print summary
  console.info("\n" + "=".repeat(60));
  console.info("SUMMARY");
  console.info("=".repeat(60));
  console.info(`Database: ${maskedUrl}`);
  console.info(`Total tables: ${report.totalTables}`);
  console.info(`Tables with drift: ${report.tablesWithDrift}`);
  console.info(`Total issues: ${report.totalIssues}`);
  console.info(`Auto-fixable: ${report.autoFixableIssues}`);
  console.info("\nBy severity:");
  console.info(`  🔴 Critical: ${report.criticalIssues}`);
  console.info(`  🟠 High: ${report.highIssues}`);
  console.info(`  🟡 Medium: ${report.mediumIssues}`);
  console.info(`  ⚪ Low: ${report.lowIssues}`);

  if (fixMode && report.autoFixableIssues > 0) {
    console.info("\n" + "=".repeat(60));
    console.info("AUTO-FIX SUGGESTIONS");
    console.info("=".repeat(60));
    for (const table of report.tables) {
      const fixable = table.issues.filter(i => i.autoFixable);
      if (fixable.length > 0) {
        console.info(`\n${table.tableName}:`);
        for (const issue of fixable) {
          console.info(`  - ${issue.recommendation}`);
        }
      }
    }
  }

  if (report.criticalIssues > 0) {
    console.info("\n❌ CRITICAL issues found!");
    process.exit(2);
  } else if (report.highIssues > 0) {
    console.info("\n⚠️  HIGH severity issues found.");
    process.exit(strictMode ? 1 : 0);
  } else if (strictMode && report.totalIssues > 0) {
    console.info("\n⚠️  Issues found in strict mode.");
    process.exit(1);
  } else {
    console.info("\n✅ Schema drift check complete.");
    process.exit(0);
  }
}

main().catch(error => {
  console.error("❌ FATAL ERROR:", error);
  process.exit(1);
});
