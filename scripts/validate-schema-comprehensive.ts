/**
 * Comprehensive Schema Validation Tool
 *
 * Compares Drizzle ORM schema definitions against actual MySQL database structure.
 * Detects schema drift and generates detailed reports.
 *
 * Usage: pnpm validate:schema
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";

// Load environment variables - try .env first, then .env.production
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

// Create database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.error("\n💡 Next steps:");
  console.error("   1. Set DATABASE_URL in .env or .env.production");
  console.error("   2. Ensure the database is accessible");
  console.error("   3. For production database, ensure SSL is configured");
  process.exit(1);
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
import {
  getTableList,
  getTableColumns,
  snakeToCamel,
  normalizeDataType,
  type ColumnMetadata,
} from "./utils/schema-introspection";
import * as fs from "fs/promises";
import * as path from "path";

// ============================================================================
// Type Definitions
// ============================================================================

interface ValidationIssue {
  table: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  category:
    | "ColumnName"
    | "DataType"
    | "Enum"
    | "Nullable"
    | "Default"
    | "ForeignKey"
    | "Missing"
    | "Extra";
  column: string;
  dbValue: unknown;
  drizzleValue: unknown;
  description: string;
}

interface ValidationReport {
  timestamp: string;
  totalTables: number;
  totalColumns: number;
  totalIssues: number;
  issuesBySeverity: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  criticalTables: {
    [tableName: string]: ValidationIssue[];
  };
  allIssues: ValidationIssue[];
}

// Critical tables for seeding (using actual database table names)
const CRITICAL_TABLES = [
  "inventoryMovements", // Database uses camelCase
  "order_status_history", // Database uses snake_case
  "invoices",
  "ledgerEntries", // Database uses camelCase
  "payments",
  "client_activity", // Database uses snake_case
] as const;

// ============================================================================
// Schema Parsing (Simplified - reads from actual schema files)
// ============================================================================

/**
 * Parse Drizzle schema files to extract table and column definitions
 * This is a simplified version that reads the actual schema structure
 */
interface DrizzleColumnDefinition {
  propertyKey: string;
  columnName: string;
  dataType?: string;
  notNull: boolean;
}

interface DrizzleTableDefinition {
  tableName: string;
  columns: DrizzleColumnDefinition[];
}

function extractDrizzleColumns(
  tableValue: Record<string | symbol, unknown>
): DrizzleColumnDefinition[] {
  const columnsValue = tableValue[Symbol.for("drizzle:Columns")];
  if (!columnsValue || typeof columnsValue !== "object") {
    return [];
  }

  const columnEntries = Object.entries(
    columnsValue as Record<string, unknown>
  );

  return columnEntries.map(([propertyKey, rawColumn]) => {
    const columnRecord =
      rawColumn && typeof rawColumn === "object"
        ? (rawColumn as Record<string, unknown>)
        : {};

    const rawColumnName = columnRecord.name;
    const rawDataType = columnRecord.dataType;

    return {
      propertyKey,
      columnName: typeof rawColumnName === "string" ? rawColumnName : propertyKey,
      dataType: typeof rawDataType === "string" ? rawDataType : undefined,
      notNull: Boolean(columnRecord.notNull),
    };
  });
}

async function parseDrizzleSchemas(): Promise<
  Map<string, DrizzleTableDefinition>
> {
  // Import the schema
  const schemaModule = await import("../drizzle/schema");

  const tables = new Map<string, DrizzleTableDefinition>();

  // Extract table definitions from schema
  for (const [key, value] of Object.entries(schemaModule)) {
    if (value && typeof value === "object" && "getSQL" in value) {
      const tableValue = value as Record<string | symbol, unknown>;
      // This is a Drizzle table
      const tableName =
        (tableValue[
          Symbol.for("drizzle:Name") as unknown as string
        ] as string) || key;

      tables.set(tableName, {
        tableName,
        columns: extractDrizzleColumns(tableValue),
      });
    }
  }

  return tables;
}

// ============================================================================
// Validation Logic
// ============================================================================

/**
 * Validate a single table
 */
async function validateTable(
  tableName: string,
  dbColumns: ColumnMetadata[],
  drizzleTable: DrizzleTableDefinition | undefined
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Get Drizzle columns
  const drizzleColumns = drizzleTable?.columns || [];

  // Check each database column
  for (const dbCol of dbColumns) {
    const dbColName = dbCol.columnName.toLowerCase();
    const dbColCamel = snakeToCamel(dbCol.columnName).toLowerCase();

    // Match by actual DB column name first, then by Drizzle property name fallback.
    const drizzleCol = drizzleColumns.find(
      dc =>
        dc.columnName.toLowerCase() === dbColName ||
        dc.propertyKey.toLowerCase() === dbColCamel
    );

    if (!drizzleCol) {
      // Column exists in DB but not in Drizzle
      issues.push({
        table: tableName,
        severity: CRITICAL_TABLES.includes(
          tableName as (typeof CRITICAL_TABLES)[number]
        )
          ? "Critical"
          : "High",
        category: "Missing",
        column: dbCol.columnName,
        dbValue: dbCol.dataType,
        drizzleValue: null,
        description: `Column "${dbCol.columnName}" exists in database but not in Drizzle schema`,
      });
      continue;
    }

    // Get Drizzle column definition
    const drizzleColDef = drizzleCol;

    // Check data type
    const typeComparison = normalizeDataType(
      dbCol.dataType,
      drizzleColDef?.dataType || "unknown"
    );

    if (!typeComparison.match) {
      issues.push({
        table: tableName,
        severity: "High",
        category: "DataType",
        column: dbCol.columnName,
        dbValue: dbCol.dataType,
        drizzleValue: drizzleColDef?.dataType || "unknown",
        description: `Data type mismatch: DB="${dbCol.dataType}" vs Drizzle="${drizzleColDef?.dataType || "unknown"}"`,
      });
    }

    // Check nullable - normalize to boolean (MySQL may return 0/1 instead of true/false)
    const dbNullable = Boolean(dbCol.isNullable);
    const drizzleNullable = !drizzleColDef?.notNull;

    if (dbNullable !== drizzleNullable) {
      issues.push({
        table: tableName,
        severity: "Medium",
        category: "Nullable",
        column: dbCol.columnName,
        dbValue: dbNullable,
        drizzleValue: drizzleNullable,
        description: `Nullable mismatch: DB=${dbNullable} vs Drizzle=${drizzleNullable}`,
      });
    }
  }

  // Check for extra columns in Drizzle that don't exist in DB
  for (const drizzleCol of drizzleColumns) {
    const dbCol = dbColumns.find(
      dc => dc.columnName.toLowerCase() === drizzleCol.columnName.toLowerCase()
    );

    if (!dbCol) {
      issues.push({
        table: tableName,
        severity: "Medium",
        category: "Extra",
        column: drizzleCol.columnName,
        dbValue: null,
        drizzleValue: "exists",
        description: `Column "${drizzleCol.columnName}" exists in Drizzle schema but not in database`,
      });
    }
  }

  return issues;
}

/**
 * Run comprehensive validation
 */
async function runValidation(): Promise<ValidationReport> {
  console.log("🔍 Starting comprehensive schema validation...\n");

  // Get all tables from database with retry logic
  console.log("📊 Querying database structure...");
  let dbTables: string[] = [];
  let retries = 3;
  let lastError: Error | null = null;
  
  while (retries > 0) {
    try {
      dbTables = await getTableList(db);
      break;
    } catch (error) {
      lastError = error as Error;
      retries--;
      if (retries > 0) {
        console.log(`   ⚠️  Connection failed, retrying... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }
  }
  
  if (dbTables.length === 0) {
    throw lastError || new Error("Failed to query database after retries");
  }
  
  console.log(`   Found ${dbTables.length} tables in database\n`);

  // Parse Drizzle schemas
  console.log("📖 Parsing Drizzle schema definitions...");
  const drizzleTables = await parseDrizzleSchemas();
  console.log(`   Found ${drizzleTables.size} tables in Drizzle schema\n`);

  // Validate each table
  console.log("🔎 Validating tables...\n");
  const allIssues: ValidationIssue[] = [];
  let totalColumns = 0;

  for (const tableName of dbTables) {
    const dbColumns = await getTableColumns(db, tableName);
    totalColumns += dbColumns.length;

    const drizzleTable =
      drizzleTables.get(tableName) ||
      drizzleTables.get(snakeToCamel(tableName));

    const issues = await validateTable(tableName, dbColumns, drizzleTable);

    if (issues.length > 0) {
      const isCritical = CRITICAL_TABLES.includes(
        tableName as (typeof CRITICAL_TABLES)[number]
      );
      const icon = isCritical ? "🔴" : issues.length > 5 ? "🟠" : "🟡";
      console.log(`${icon} ${tableName}: ${issues.length} issue(s)`);
      allIssues.push(...issues);
    } else {
      console.log(`✅ ${tableName}: No issues`);
    }
  }

  // Organize issues by severity
  const issuesBySeverity = {
    Critical: allIssues.filter(i => i.severity === "Critical").length,
    High: allIssues.filter(i => i.severity === "High").length,
    Medium: allIssues.filter(i => i.severity === "Medium").length,
    Low: allIssues.filter(i => i.severity === "Low").length,
  };

  // Organize critical tables
  const criticalTables: { [tableName: string]: ValidationIssue[] } = {};
  for (const tableName of CRITICAL_TABLES) {
    const tableIssues = allIssues.filter(i => i.table === tableName);
    if (tableIssues.length > 0) {
      criticalTables[tableName] = tableIssues;
    }
  }

  // Create report
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    totalTables: dbTables.length,
    totalColumns,
    totalIssues: allIssues.length,
    issuesBySeverity,
    criticalTables,
    allIssues,
  };

  return report;
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate JSON report
 */
async function generateJsonReport(report: ValidationReport): Promise<void> {
  const jsonPath = path.join(process.cwd(), "schema-validation-report.json");
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 JSON report saved to: schema-validation-report.json`);
}

/**
 * Generate Markdown report
 */
async function generateMarkdownReport(report: ValidationReport): Promise<void> {
  let markdown = `# Schema Validation Report\n\n`;
  markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;

  // Executive Summary
  markdown += `## Executive Summary\n\n`;
  markdown += `- **Total Tables:** ${report.totalTables}\n`;
  markdown += `- **Total Columns:** ${report.totalColumns}\n`;
  markdown += `- **Total Issues:** ${report.totalIssues}\n\n`;

  markdown += `### Issues by Severity\n\n`;
  markdown += `- 🔴 **Critical:** ${report.issuesBySeverity.Critical}\n`;
  markdown += `- 🟠 **High:** ${report.issuesBySeverity.High}\n`;
  markdown += `- 🟡 **Medium:** ${report.issuesBySeverity.Medium}\n`;
  markdown += `- ⚪ **Low:** ${report.issuesBySeverity.Low}\n\n`;

  // Critical Tables Section
  if (Object.keys(report.criticalTables).length > 0) {
    markdown += `## Critical Tables (Seeding Priority)\n\n`;
    markdown += `These tables must be fixed before Phase 2 seeding can proceed.\n\n`;

    for (const [tableName, issues] of Object.entries(report.criticalTables)) {
      markdown += `### ${tableName}\n\n`;
      markdown += `**Issues:** ${issues.length}\n\n`;

      for (const issue of issues) {
        markdown += `- **${issue.category}** (${issue.severity}): ${issue.description}\n`;
        markdown += `  - Column: \`${issue.column}\`\n`;
        markdown += `  - DB Value: \`${JSON.stringify(issue.dbValue)}\`\n`;
        markdown += `  - Drizzle Value: \`${JSON.stringify(issue.drizzleValue)}\`\n\n`;
      }
    }
  }

  // All Issues by Category
  markdown += `## All Issues by Category\n\n`;

  const categories = [
    "Missing",
    "Extra",
    "DataType",
    "Nullable",
    "Default",
    "Enum",
    "ForeignKey",
  ];
  for (const category of categories) {
    const categoryIssues = report.allIssues.filter(
      i => i.category === category
    );
    if (categoryIssues.length > 0) {
      markdown += `### ${category} (${categoryIssues.length})\n\n`;

      for (const issue of categoryIssues.slice(0, 10)) {
        // Show first 10
        markdown += `- **${issue.table}.${issue.column}**: ${issue.description}\n`;
      }

      if (categoryIssues.length > 10) {
        markdown += `\n_... and ${categoryIssues.length - 10} more_\n`;
      }

      markdown += `\n`;
    }
  }

  const mdPath = path.join(process.cwd(), "SCHEMA_VALIDATION_REPORT.md");
  await fs.writeFile(mdPath, markdown);
  console.log(`📄 Markdown report saved to: SCHEMA_VALIDATION_REPORT.md`);
}

/**
 * Display console summary
 */
function displaySummary(report: ValidationReport): void {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 VALIDATION SUMMARY`);
  console.log(`${"=".repeat(60)}\n`);

  console.log(`Tables Checked: ${report.totalTables}`);
  console.log(`Columns Checked: ${report.totalColumns}`);
  console.log(`Total Issues: ${report.totalIssues}\n`);

  console.log(`Issues by Severity:`);
  console.log(`  🔴 Critical: ${report.issuesBySeverity.Critical}`);
  console.log(`  🟠 High:     ${report.issuesBySeverity.High}`);
  console.log(`  🟡 Medium:   ${report.issuesBySeverity.Medium}`);
  console.log(`  ⚪ Low:      ${report.issuesBySeverity.Low}\n`);

  if (Object.keys(report.criticalTables).length > 0) {
    console.log(`🔴 Critical Tables with Issues:`);
    for (const tableName of Object.keys(report.criticalTables)) {
      const issueCount = report.criticalTables[tableName].length;
      console.log(`   - ${tableName}: ${issueCount} issue(s)`);
    }
    console.log();
  }

  if (report.totalIssues > 0) {
    console.log(`⚠️  Next Steps:`);
    console.log(`   1. Review SCHEMA_VALIDATION_REPORT.md for details`);
    console.log(`   2. Run: pnpm fix:schema:report`);
    console.log(`   3. Apply recommended fixes to drizzle/schema.ts`);
    console.log(`   4. Run: pnpm validate:schema:fixes\n`);
  } else {
    console.log(`✅ No schema drift detected! All tables match.\n`);
  }

  console.log(`${"=".repeat(60)}\n`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    const report = await runValidation();

    await generateJsonReport(report);
    await generateMarkdownReport(report);

    displaySummary(report);

    // Exit with appropriate code
    process.exit(report.totalIssues > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Validation failed");
    if (error instanceof Error) {
      console.error(`   Error: ${error.message}`);
      console.error(`   Name: ${error.name}`);
      if (error.stack) {
        console.error(`   Stack (first 10 lines):`);
        console.error(error.stack.split("\n").slice(0, 10).join("\n"));
      }
      if ("cause" in error && error.cause) {
        console.error(`   Cause: ${error.cause}`);
      }
      if (error.message.includes("ETIMEDOUT") || error.message.includes("connect")) {
        console.error("\n💡 Database connection issue detected:");
        console.error("   1. Check DATABASE_URL is correct");
        console.error("   2. Verify database is accessible from this network");
        console.error("   3. For DigitalOcean databases, ensure SSL is configured");
        console.error("   4. Check firewall rules allow connections");
      }
    } else {
      console.error("   Unknown error:", error);
    }
    console.error("\n📖 See docs/DATABASE_SCHEMA_SYNC.md for troubleshooting");
    process.exit(1);
  }
}

main();
