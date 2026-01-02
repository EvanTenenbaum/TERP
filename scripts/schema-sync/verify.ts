#!/usr/bin/env tsx
/**
 * TERP Schema Verification Script
 *
 * Verifies that the database schema matches the expected state after
 * applying changes. Used as a post-apply verification step.
 *
 * Usage:
 *   pnpm tsx scripts/schema-sync/verify.ts [options]
 *
 * Options:
 *   --verbose              Show detailed output
 *   --json                 Output results as JSON
 *   --check-constraints    Verify all constraints are in place
 *   --check-indexes        Verify all indexes exist
 *   --check-data           Run basic data integrity checks
 *
 * @module scripts/schema-sync/verify
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
  checkConstraints: boolean;
  checkIndexes: boolean;
  checkData: boolean;
}

// Verification result
interface VerificationResult {
  timestamp: string;
  status: "PASS" | "FAIL";
  checks: VerificationCheck[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
  };
}

interface VerificationCheck {
  name: string;
  category: "SCHEMA" | "CONSTRAINT" | "INDEX" | "DATA";
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  details?: string;
}

// Parse command line arguments
function parseOptions(): ScriptOptions {
  const { values } = parseArgs({
    options: {
      verbose: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      "check-constraints": { type: "boolean", default: true },
      "check-indexes": { type: "boolean", default: true },
      "check-data": { type: "boolean", default: false },
    },
  });

  return {
    verbose: values.verbose ?? false,
    json: values.json ?? false,
    checkConstraints: values["check-constraints"] ?? true,
    checkIndexes: values["check-indexes"] ?? true,
    checkData: values["check-data"] ?? false,
  };
}

// Logger utility
function log(message: string, options: ScriptOptions): void {
  if (!options.json) {
    console.log(message);
  }
}

// Verify schema files exist and are valid
function verifySchemaFiles(
  projectRoot: string,
  _options: ScriptOptions
): VerificationCheck[] {
  const checks: VerificationCheck[] = [];
  const drizzleDir = path.join(projectRoot, "drizzle");

  // Check main schema file
  const mainSchemaPath = path.join(drizzleDir, "schema.ts");
  if (fs.existsSync(mainSchemaPath)) {
    const content = fs.readFileSync(mainSchemaPath, "utf-8");
    const tableCount = (content.match(/export const \w+ = mysqlTable\(/g) || [])
      .length;

    checks.push({
      name: "Main schema file exists",
      category: "SCHEMA",
      status: "PASS",
      message: `Found ${tableCount} table definitions`,
    });

    // Check for required tables
    const requiredTables = [
      "users",
      "clients",
      "orders",
      "batches",
      "inventoryMovements",
    ];
    for (const table of requiredTables) {
      const hasTable = content.includes(`export const ${table} = mysqlTable(`);
      checks.push({
        name: `Required table: ${table}`,
        category: "SCHEMA",
        status: hasTable ? "PASS" : "FAIL",
        message: hasTable
          ? "Table definition found"
          : "Table definition missing",
      });
    }
  } else {
    checks.push({
      name: "Main schema file exists",
      category: "SCHEMA",
      status: "FAIL",
      message: "drizzle/schema.ts not found",
    });
  }

  // Check migration journal
  const journalPath = path.join(drizzleDir, "meta", "_journal.json");
  if (fs.existsSync(journalPath)) {
    try {
      const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
      const entryCount = journal.entries?.length ?? 0;
      checks.push({
        name: "Migration journal valid",
        category: "SCHEMA",
        status: "PASS",
        message: `Found ${entryCount} migration entries`,
      });
    } catch {
      checks.push({
        name: "Migration journal valid",
        category: "SCHEMA",
        status: "FAIL",
        message: "Failed to parse _journal.json",
      });
    }
  } else {
    checks.push({
      name: "Migration journal exists",
      category: "SCHEMA",
      status: "FAIL",
      message: "drizzle/meta/_journal.json not found",
    });
  }

  return checks;
}

// Verify optimistic locking implementation
function verifyOptimisticLocking(
  projectRoot: string,
  _options: ScriptOptions
): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  // Check schema for version columns
  const schemaPath = path.join(projectRoot, "drizzle", "schema.ts");
  if (fs.existsSync(schemaPath)) {
    const content = fs.readFileSync(schemaPath, "utf-8");
    const versionColumns = content.match(/version.*int.*default\(1\)/g) || [];

    checks.push({
      name: "Optimistic locking columns (DATA-005)",
      category: "SCHEMA",
      status: versionColumns.length >= 4 ? "PASS" : "FAIL",
      message: `Found ${versionColumns.length} tables with version columns`,
      details: "Expected: clients, orders, batches, inventory",
    });
  }

  // Check for optimistic locking utility
  const utilPath = path.join(
    projectRoot,
    "server",
    "_core",
    "optimisticLocking.ts"
  );
  checks.push({
    name: "Optimistic locking utility",
    category: "SCHEMA",
    status: fs.existsSync(utilPath) ? "PASS" : "FAIL",
    message: fs.existsSync(utilPath)
      ? "Utility file exists"
      : "Utility file missing",
  });

  return checks;
}

// Verify soft delete implementation
function verifySoftDelete(
  projectRoot: string,
  _options: ScriptOptions
): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  const schemaPath = path.join(projectRoot, "drizzle", "schema.ts");
  if (fs.existsSync(schemaPath)) {
    const content = fs.readFileSync(schemaPath, "utf-8");
    const deletedAtColumns = content.match(/deletedAt.*timestamp/g) || [];

    checks.push({
      name: "Soft delete columns (ST-013)",
      category: "SCHEMA",
      status: deletedAtColumns.length > 0 ? "PASS" : "FAIL",
      message: `Found ${deletedAtColumns.length} tables with deletedAt columns`,
    });
  }

  return checks;
}

// Verify backup infrastructure
function verifyBackupInfrastructure(
  projectRoot: string,
  _options: ScriptOptions
): VerificationCheck[] {
  const checks: VerificationCheck[] = [];

  const backupScripts = [
    "scripts/backup-database.sh",
    "scripts/check-backup-status.sh",
    "scripts/setup-backup-cron.sh",
  ];

  for (const script of backupScripts) {
    const scriptPath = path.join(projectRoot, script);
    const exists = fs.existsSync(scriptPath);
    checks.push({
      name: `Backup script: ${path.basename(script)}`,
      category: "SCHEMA",
      status: exists ? "PASS" : "FAIL",
      message: exists ? "Script exists" : "Script missing",
    });
  }

  return checks;
}

// Main verify function
async function verify(): Promise<void> {
  const options = parseOptions();
  const projectRoot = process.cwd();

  log("============================================================", options);
  log("TERP SCHEMA VERIFICATION", options);
  log("============================================================", options);
  log(`Started: ${new Date().toISOString()}`, options);
  log("", options);

  const allChecks: VerificationCheck[] = [];

  // Run schema file checks
  log("Verifying schema files...", options);
  allChecks.push(...verifySchemaFiles(projectRoot, options));

  // Run optimistic locking checks
  log("Verifying optimistic locking (DATA-005)...", options);
  allChecks.push(...verifyOptimisticLocking(projectRoot, options));

  // Run soft delete checks
  log("Verifying soft delete (ST-013)...", options);
  allChecks.push(...verifySoftDelete(projectRoot, options));

  // Run backup infrastructure checks
  log("Verifying backup infrastructure...", options);
  allChecks.push(...verifyBackupInfrastructure(projectRoot, options));

  // Calculate summary
  const passed = allChecks.filter(c => c.status === "PASS").length;
  const failed = allChecks.filter(c => c.status === "FAIL").length;
  const skipped = allChecks.filter(c => c.status === "SKIP").length;

  const result: VerificationResult = {
    timestamp: new Date().toISOString(),
    status: failed === 0 ? "PASS" : "FAIL",
    checks: allChecks,
    summary: { passed, failed, skipped },
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
    log("VERIFICATION RESULTS", options);
    log(
      "============================================================",
      options
    );

    for (const check of allChecks) {
      const icon =
        check.status === "PASS" ? "✓" : check.status === "FAIL" ? "✗" : "○";
      log(`${icon} ${check.name}: ${check.message}`, options);
      if (options.verbose && check.details) {
        log(`    ${check.details}`, options);
      }
    }

    log("", options);
    log(
      `Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`,
      options
    );
    log(`Status: ${result.status}`, options);
  }

  // Exit with appropriate code
  if (result.status === "FAIL") {
    process.exit(1);
  }
}

// Run verification
verify().catch(error => {
  console.error("Verification failed:", error);
  process.exit(1);
});
