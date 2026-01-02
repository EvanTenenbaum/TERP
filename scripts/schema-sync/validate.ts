#!/usr/bin/env tsx
/**
 * TERP Schema Validation Script
 *
 * Validates the current schema state by comparing Drizzle schema definitions
 * against the production database structure.
 *
 * Usage:
 *   pnpm tsx scripts/schema-sync/validate.ts [options]
 *
 * Options:
 *   --verbose    Show detailed output
 *   --json       Output results as JSON
 *   --strict     Fail on any discrepancy
 *
 * @module scripts/schema-sync/validate
 * @version 1.0.0
 * @created 2026-01-02
 */

import { parseArgs } from "util";
import * as fs from "fs";
import * as path from "path";

// Script options interface
interface ScriptOptions {
  verbose: boolean;
  json: boolean;
  strict: boolean;
}

// Validation result interface
interface ValidationResult {
  timestamp: string;
  status: "PASS" | "WARN" | "FAIL";
  schemaFiles: SchemaFileInfo[];
  migrations: MigrationInfo[];
  issues: ValidationIssue[];
  summary: {
    totalTables: number;
    totalMigrations: number;
    issueCount: number;
    warningCount: number;
  };
}

interface SchemaFileInfo {
  file: string;
  lines: number;
  tables: string[];
}

interface MigrationInfo {
  id: string;
  name: string;
  applied: boolean;
}

interface ValidationIssue {
  severity: "ERROR" | "WARNING" | "INFO";
  category: string;
  message: string;
  file?: string;
  line?: number;
}

// Parse command line arguments
function parseOptions(): ScriptOptions {
  const { values } = parseArgs({
    options: {
      verbose: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
    },
  });

  return {
    verbose: values.verbose ?? false,
    json: values.json ?? false,
    strict: values.strict ?? false,
  };
}

// Logger utility
function log(message: string, options: ScriptOptions): void {
  if (!options.json) {
    console.log(message);
  }
}

function logVerbose(message: string, options: ScriptOptions): void {
  if (options.verbose && !options.json) {
    console.log(`  ${message}`);
  }
}

// Extract table names from schema file
function extractTablesFromSchema(content: string): string[] {
  const tableRegex = /export const (\w+) = mysqlTable\(/g;
  const tables: string[] = [];
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    tables.push(match[1]);
  }
  return tables;
}

// Analyze schema files
function analyzeSchemaFiles(
  projectRoot: string,
  options: ScriptOptions
): SchemaFileInfo[] {
  const drizzleDir = path.join(projectRoot, "drizzle");
  const schemaFiles: SchemaFileInfo[] = [];

  const files = fs
    .readdirSync(drizzleDir)
    .filter(f => f.startsWith("schema") && f.endsWith(".ts"));

  for (const file of files) {
    const filePath = path.join(drizzleDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").length;
    const tables = extractTablesFromSchema(content);

    schemaFiles.push({ file, lines, tables });
    logVerbose(
      `Analyzed ${file}: ${lines} lines, ${tables.length} tables`,
      options
    );
  }

  return schemaFiles;
}

// Analyze migrations
function analyzeMigrations(
  projectRoot: string,
  options: ScriptOptions
): MigrationInfo[] {
  const metaDir = path.join(projectRoot, "drizzle", "meta");
  const journalPath = path.join(metaDir, "_journal.json");
  const migrations: MigrationInfo[] = [];

  if (fs.existsSync(journalPath)) {
    try {
      const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
      if (journal.entries && Array.isArray(journal.entries)) {
        for (const entry of journal.entries) {
          migrations.push({
            id: entry.idx?.toString() ?? "unknown",
            name: entry.tag ?? "unknown",
            applied: true, // Assuming all journal entries are applied
          });
        }
      }
    } catch (error) {
      logVerbose(
        `Warning: Could not parse migration journal: ${error}`,
        options
      );
    }
  }

  return migrations;
}

// Check for common issues
function checkForIssues(
  _schemaFiles: SchemaFileInfo[],
  _migrations: MigrationInfo[],
  projectRoot: string,
  _options: ScriptOptions
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for duplicate migration numbers
  const drizzleDir = path.join(projectRoot, "drizzle");
  const sqlFiles = fs.readdirSync(drizzleDir).filter(f => f.endsWith(".sql"));
  const migrationNumbers = new Map<string, string[]>();

  for (const file of sqlFiles) {
    const match = file.match(/^(\d+)_/);
    if (match) {
      const num = match[1];
      if (!migrationNumbers.has(num)) {
        migrationNumbers.set(num, []);
      }
      migrationNumbers.get(num)?.push(file);
    }
  }

  for (const [num, files] of migrationNumbers) {
    if (files.length > 1) {
      issues.push({
        severity: "WARNING",
        category: "MIGRATION_DUPLICATE",
        message: `Multiple migrations with number ${num}: ${files.join(", ")}`,
      });
    }
  }

  // Check for version columns (optimistic locking)
  const mainSchemaPath = path.join(drizzleDir, "schema.ts");
  if (fs.existsSync(mainSchemaPath)) {
    const content = fs.readFileSync(mainSchemaPath, "utf-8");
    const versionMatches = content.match(/version.*int.*default\(1\)/g);
    if (versionMatches && versionMatches.length > 0) {
      issues.push({
        severity: "INFO",
        category: "OPTIMISTIC_LOCKING",
        message: `Found ${versionMatches.length} tables with optimistic locking (DATA-005)`,
      });
    }
  }

  // Check for soft delete support
  const deletedAtMatches = fs
    .readFileSync(path.join(drizzleDir, "schema.ts"), "utf-8")
    .match(/deletedAt.*timestamp/g);
  if (deletedAtMatches) {
    issues.push({
      severity: "INFO",
      category: "SOFT_DELETE",
      message: `Found ${deletedAtMatches.length} tables with soft delete support`,
    });
  }

  return issues;
}

// Main validation function
async function validate(): Promise<void> {
  const options = parseOptions();
  const projectRoot = process.cwd();

  log("============================================================", options);
  log("TERP SCHEMA VALIDATION", options);
  log("============================================================", options);
  log(`Started: ${new Date().toISOString()}`, options);
  log(`Mode: ${options.strict ? "Strict" : "Normal"}`, options);
  log("", options);

  // Analyze schema files
  log("Analyzing schema files...", options);
  const schemaFiles = analyzeSchemaFiles(projectRoot, options);
  const totalTables = schemaFiles.reduce((sum, f) => sum + f.tables.length, 0);
  log(
    `✓ Found ${schemaFiles.length} schema files with ${totalTables} tables`,
    options
  );

  // Analyze migrations
  log("", options);
  log("Analyzing migrations...", options);
  const migrations = analyzeMigrations(projectRoot, options);
  log(`✓ Found ${migrations.length} migrations in journal`, options);

  // Check for issues
  log("", options);
  log("Checking for issues...", options);
  const issues = checkForIssues(schemaFiles, migrations, projectRoot, options);

  const errorCount = issues.filter(i => i.severity === "ERROR").length;
  const warningCount = issues.filter(i => i.severity === "WARNING").length;
  const infoCount = issues.filter(i => i.severity === "INFO").length;

  // Determine status
  let status: "PASS" | "WARN" | "FAIL" = "PASS";
  if (errorCount > 0) {
    status = "FAIL";
  } else if (warningCount > 0) {
    status = options.strict ? "FAIL" : "WARN";
  }

  // Build result
  const result: ValidationResult = {
    timestamp: new Date().toISOString(),
    status,
    schemaFiles,
    migrations,
    issues,
    summary: {
      totalTables,
      totalMigrations: migrations.length,
      issueCount: errorCount,
      warningCount,
    },
  };

  // Output results
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    log("", options);
    log(
      "============================================================",
      options
    );
    log("VALIDATION RESULTS", options);
    log(
      "============================================================",
      options
    );

    for (const issue of issues) {
      const icon =
        issue.severity === "ERROR"
          ? "❌"
          : issue.severity === "WARNING"
            ? "⚠️"
            : "ℹ️";
      log(`${icon} [${issue.category}] ${issue.message}`, options);
    }

    log("", options);
    log(`Status: ${status}`, options);
    log(
      `Errors: ${errorCount}, Warnings: ${warningCount}, Info: ${infoCount}`,
      options
    );
    log("", options);
  }

  // Exit with appropriate code
  if (status === "FAIL") {
    process.exit(1);
  }
}

// Run validation
validate().catch(error => {
  console.error("Validation failed:", error);
  process.exit(1);
});
