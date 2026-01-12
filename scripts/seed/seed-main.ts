#!/usr/bin/env tsx
/**
 * TERP Seeding System - CLI Orchestrator
 *
 * Production-grade database seeding with:
 * - Concurrency control via MySQL advisory locks
 * - Schema validation before insertion
 * - PII masking for GDPR/CCPA compliance
 * - Structured logging and progress reporting
 *
 * Usage:
 *   pnpm seed:new                      # Seed all tables (medium size)
 *   pnpm seed:new --table=clients      # Seed specific table
 *   pnpm seed:new --size=small         # Seed with small data volume
 *   pnpm seed:new --dry-run            # Preview without executing
 *   pnpm seed:new --force              # Skip confirmation prompts
 *   pnpm seed:new --help               # Show help
 */

import { db, testConnection } from "../db-sync";
import { SeedingLock, LockAcquisitionError } from "./lib/locking";
import { SchemaValidator } from "./lib/validation";
import { PIIMasker } from "./lib/data-masking";
import { seedLogger, withPerformanceLogging } from "./lib/logging";
import * as readline from "readline";

// Import seeders
import {
  SEEDING_ORDER,
  type SeederResult,
  seedPricingDefaults,
  seedVendors,
  seedClients,
  seedProducts,
  seedBatches,
  seedOrders,
  seedClientTransactions,
  seedInvoices,
  seedPayments,
  seedVendorBills,
  seedPurchaseOrders,
} from "./seeders";

// ============================================================================
// Type Definitions
// ============================================================================

interface CLIFlags {
  table?: string;
  size: "small" | "medium" | "large";
  env?: "development" | "staging" | "production";
  dryRun: boolean;
  force: boolean;
  rollback: boolean;
  help: boolean;
  verbose: boolean;
  clean: boolean;
  complete: boolean; // Seed all data types including bills, POs (Requirements: 10.1)
}

interface SeedingStats {
  startTime: number;
  endTime?: number;
  tables: string[];
  recordsInserted: Record<string, number>;
  errors: Array<{ table: string; error: string }>;
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

/**
 * Parse command line arguments
 */
function parseArgs(): CLIFlags {
  const args = process.argv.slice(2);

  const flags: CLIFlags = {
    table: undefined,
    size: "medium",
    env: undefined,
    dryRun: false,
    force: false,
    rollback: false,
    help: false,
    verbose: false,
    clean: false,
    complete: false,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--force" || arg === "-f") {
      flags.force = true;
    } else if (arg === "--rollback") {
      flags.rollback = true;
    } else if (arg === "--verbose" || arg === "-v") {
      flags.verbose = true;
    } else if (arg === "--clean" || arg === "-c") {
      flags.clean = true;
    } else if (arg === "--complete") {
      flags.complete = true;
    } else if (arg.startsWith("--table=")) {
      flags.table = arg.split("=")[1];
    } else if (arg.startsWith("--size=")) {
      const size = arg.split("=")[1];
      if (size === "small" || size === "medium" || size === "large") {
        flags.size = size;
      } else {
        console.error(`Invalid size: ${size}. Use small, medium, or large.`);
        process.exit(1);
      }
    } else if (arg.startsWith("--env=")) {
      const env = arg.split("=")[1];
      if (env === "development" || env === "staging" || env === "production") {
        flags.env = env;
      } else {
        console.error(`Invalid env: ${env}. Use development, staging, or production.`);
        process.exit(1);
      }
    }
  }

  seedLogger.cliArgs(flags);
  return flags;
}

/**
 * Validate CLI argument combinations
 */
function validateArgs(flags: CLIFlags): boolean {
  // Rollback cannot be used with --table
  if (flags.rollback && flags.table) {
    console.error("Error: --rollback cannot be used with --table");
    return false;
  }

  // Warn about production environment
  if (flags.env === "production" && !flags.force) {
    console.error("Error: Production seeding requires --force flag");
    return false;
  }

  return true;
}

// ============================================================================
// Help Display
// ============================================================================

function showHelp(): void {
  console.log(`
TERP Seeding System v1.0.0
Production-grade database seeding with concurrency control, schema validation, and PII masking.

USAGE:
  pnpm seed:new [OPTIONS]

OPTIONS:
  --table=<name>       Seed specific table (e.g., --table=clients)
  --size=<size>        Data volume: small, medium (default), or large
  --env=<env>          Override environment: development, staging, or production
  --dry-run            Preview seeding without executing (no data changes)
  --force, -f          Skip confirmation prompts (required for production)
  --rollback           Rollback seeded data (Phase 2 feature)
  --verbose, -v        Enable verbose output
  --clean, -c          Clear existing data before seeding (respects FK order)
  --help, -h           Show this help message

EXAMPLES:
  pnpm seed:new                           # Seed all tables with medium volume
  pnpm seed:new --table=clients           # Seed only clients table
  pnpm seed:new --size=small --dry-run    # Preview small seeding operation
  pnpm seed:new --env=staging --force     # Force seed in staging environment

DATA VOLUMES:
  small   - ~10 records per table (quick testing)
  medium  - ~100 records per table (development, default)
  large   - ~1000+ records per table (performance testing)

COMPONENTS:
  lib/locking.ts       - MySQL advisory locks for concurrency control
  lib/validation.ts    - Schema validation before insertion
  lib/data-masking.ts  - PII masking for GDPR/CCPA compliance
  lib/logging.ts       - Structured logging utilities

For more information, see scripts/seed/README.md
`);
}

// ============================================================================
// User Confirmation
// ============================================================================

/**
 * Prompt user for confirmation
 */
async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    seedLogger.confirmationPrompt(message);

    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// ============================================================================
// Seeding Operations (Phase 1 - Infrastructure Only)
// ============================================================================

/**
 * Get record counts based on size flag
 * Requirements: 10.1, 10.3
 */
function getRecordCounts(size: CLIFlags["size"], complete: boolean = false): Record<string, number> {
  const baseCounts: Record<CLIFlags["size"], Record<string, number>> = {
    small: {
      pricing_defaults: 12, // BUG-084: Fixed config table (category margins)
      clients: 10,
      vendors: 5,
      products: 20,
      batches: 30,
      orders: 50,
      client_transactions: 0, // Auto-generated from orders
      invoices: 50,
      payments: 30,
    },
    medium: {
      pricing_defaults: 12, // BUG-084: Fixed config table (category margins)
      clients: 60,
      vendors: 15,
      products: 100,
      batches: 200,
      orders: 400,
      client_transactions: 0, // Auto-generated from orders
      invoices: 400,
      payments: 200,
    },
    large: {
      pricing_defaults: 12, // BUG-084: Fixed config table (category margins)
      clients: 200,
      vendors: 50,
      products: 500,
      batches: 1000,
      orders: 2000,
      client_transactions: 0, // Auto-generated from orders
      invoices: 2000,
      payments: 1000,
    },
  };

  const counts = { ...baseCounts[size] };

  // Add complete mode counts (Requirements: 10.1)
  if (complete) {
    const completeCounts: Record<CLIFlags["size"], Record<string, number>> = {
      small: {
        purchaseOrders: 10,
        bills: 15,
      },
      medium: {
        purchaseOrders: 50,
        bills: 75,
      },
      large: {
        purchaseOrders: 200,
        bills: 300,
      },
    };
    Object.assign(counts, completeCounts[size]);
  }

  return counts;
}

/**
 * Available tables for seeding (in FK dependency order)
 */
const SEEDABLE_TABLES = [...SEEDING_ORDER];

/**
 * Tables in reverse FK order for deletion
 */
const DELETION_ORDER = [...SEEDING_ORDER].reverse();

/**
 * Clean existing data from tables (in reverse FK order)
 */
async function cleanTables(tables: string[], dryRun: boolean): Promise<void> {
  // Get tables in reverse FK order for safe deletion
  const tablesToClean = DELETION_ORDER.filter((t) => tables.includes(t));

  seedLogger.operationStart("clean", { tables: tablesToClean, dryRun });

  for (const tableName of tablesToClean) {
    if (dryRun) {
      seedLogger.dryRun({ table: tableName, action: "Would delete all records" });
      continue;
    }

    try {
      // Use raw SQL to delete all records
      await db.execute(`DELETE FROM \`${tableName}\``);
      console.log(`   ✓ Cleaned table: ${tableName}`);
    } catch (error) {
      console.warn(`   ⚠ Failed to clean ${tableName}: ${error instanceof Error ? error.message : error}`);
    }
  }

  seedLogger.operationSuccess("clean", { tables: tablesToClean });
}

/**
 * Seeder function map
 * Requirements: 10.1
 */
const SEEDERS: Record<string, (count: number, validator: SchemaValidator, masker: PIIMasker) => Promise<SeederResult>> = {
  pricing_defaults: seedPricingDefaults, // BUG-084: Critical for order pricing
  vendors: seedVendors,
  clients: seedClients,
  products: seedProducts,
  purchaseOrders: seedPurchaseOrders,
  batches: seedBatches,
  orders: seedOrders,
  client_transactions: seedClientTransactions,
  invoices: seedInvoices,
  payments: seedPayments,
  bills: seedVendorBills,
};

/**
 * Execute seeding operation
 */
async function executeSeed(
  flags: CLIFlags,
  lock: SeedingLock,
  validator: SchemaValidator,
  masker: PIIMasker,
  stats: SeedingStats
): Promise<void> {
  const tables = flags.table ? [flags.table] : SEEDABLE_TABLES;
  const counts = getRecordCounts(flags.size, flags.complete);

  // Validate requested table exists
  if (flags.table && !SEEDABLE_TABLES.includes(flags.table)) {
    throw new Error(
      `Unknown table: ${flags.table}. Available: ${SEEDABLE_TABLES.join(", ")}`
    );
  }

  stats.tables = tables;

  seedLogger.operationStart("seed", {
    tables,
    size: flags.size,
    dryRun: flags.dryRun,
    counts: tables.map((t) => ({ table: t, count: counts[t] || 0 })),
  });

  for (let i = 0; i < tables.length; i++) {
    const tableName = tables[i];
    const recordCount = counts[tableName] || 0;

    seedLogger.operationProgress("seed", i + 1, tables.length, { table: tableName });

    if (flags.dryRun) {
      seedLogger.tableSeeding(tableName, recordCount);
      seedLogger.dryRun({
        table: tableName,
        recordCount,
        action: "Would insert records",
      });
      stats.recordsInserted[tableName] = 0;
      continue;
    }

    try {
      // Validate table exists
      const tableExists = await validator.validateTableExists(tableName);
      if (!tableExists) {
        seedLogger.validationWarning(tableName, "Table does not exist in database");
        stats.errors.push({
          table: tableName,
          error: "Table does not exist",
        });
        continue;
      }

      // Get the seeder function
      const seeder = SEEDERS[tableName];
      if (!seeder) {
        seedLogger.validationWarning(tableName, "No seeder implemented for this table");
        stats.errors.push({
          table: tableName,
          error: "No seeder implemented",
        });
        continue;
      }

      // Execute the seeder
      const result = await seeder(recordCount, validator, masker);

      // Update stats
      stats.recordsInserted[tableName] = result.inserted;

      // Add any errors from the seeder
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          stats.errors.push({ table: tableName, error });
        }
      }

      if (result.skipped > 0) {
        seedLogger.recordSkipped(tableName, `${result.skipped} records skipped due to validation errors`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stats.errors.push({ table: tableName, error: errorMessage });
      seedLogger.operationFailure(
        `seed:${tableName}`,
        error instanceof Error ? error : new Error(errorMessage),
        { table: tableName }
      );
    }
  }
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  const flags = parseArgs();

  // Show help and exit
  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  // Validate arguments
  if (!validateArgs(flags)) {
    process.exit(1);
  }

  // Initialize stats
  const stats: SeedingStats = {
    startTime: Date.now(),
    tables: [],
    recordsInserted: {},
    errors: [],
  };

  // Initialize components
  const lock = new SeedingLock(db as any);
  const validator = new SchemaValidator(db as any);
  const masker = new PIIMasker({
    environment: flags.env ?? (process.env.NODE_ENV as any) ?? "development",
  });

  try {
    // Test database connection
    seedLogger.operationStart("connection-test", {});
    const connected = await testConnection(3);
    if (!connected) {
      throw new Error("Failed to connect to database after 3 attempts");
    }
    seedLogger.operationSuccess("connection-test", {});

    // Dry run notification
    if (flags.dryRun) {
      seedLogger.dryRun({ mode: "preview" });
      console.log("\n📋 DRY RUN MODE: No data will be modified\n");
    }

    // Confirmation prompt (unless --force or --dry-run)
    if (!flags.force && !flags.dryRun) {
      const counts = getRecordCounts(flags.size, flags.complete);
      const tables = flags.table ? [flags.table] : SEEDABLE_TABLES;
      const totalRecords = tables.reduce(
        (sum, t) => sum + (counts[t] || 0),
        0
      );

      console.log("\n⚠️  This operation will seed the following tables:");
      for (const table of tables) {
        console.log(`   - ${table}: ${counts[table] || 0} records`);
      }
      console.log(`   Total: ${totalRecords} records\n`);

      const confirmed = await promptConfirmation("Continue? (y/N): ");
      if (!confirmed) {
        console.log("Seeding cancelled.");
        process.exit(0);
      }
    }

    // Acquire global lock
    await withPerformanceLogging("acquire-lock", async () => {
      const lockName = flags.table
        ? SeedingLock.formatLockName(flags.table)
        : SeedingLock.GLOBAL_LOCK;

      const acquired = await lock.acquire(lockName, 0);
      if (!acquired) {
        throw new LockAcquisitionError(
          lockName,
          "Another seeding operation is in progress. Try again later."
        );
      }
    });

    // Clean existing data if requested
    if (flags.clean) {
      const tables = flags.table ? [flags.table] : SEEDABLE_TABLES;
      await withPerformanceLogging("clean-tables", async () => {
        await cleanTables(tables, flags.dryRun);
      });
    }

    // Execute seeding
    await withPerformanceLogging("seed-execution", async () => {
      await executeSeed(flags, lock, validator, masker, stats);
    });

    // Generate summary
    stats.endTime = Date.now();
    const duration = stats.endTime - stats.startTime;

    seedLogger.summary({
      duration,
      tables: stats.tables,
      recordsInserted: stats.recordsInserted,
      errors: stats.errors.length,
    });

    // Display final summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SEEDING SUMMARY");
    console.log("=".repeat(60));
    console.log(`Duration: ${duration}ms`);
    console.log(`Tables:   ${stats.tables.length}`);
    console.log(
      `Records:  ${Object.values(stats.recordsInserted).reduce((a, b) => a + b, 0)}`
    );
    console.log(`Errors:   ${stats.errors.length}`);

    if (flags.dryRun) {
      console.log("\n✅ Dry run completed successfully!");
      console.log("   Run without --dry-run to execute seeding.\n");
    } else if (stats.errors.length === 0) {
      console.log("\n✅ Seeding completed successfully!\n");
    } else {
      console.log("\n⚠️  Seeding completed with errors:\n");
      for (const err of stats.errors) {
        console.log(`   - ${err.table}: ${err.error}`);
      }
      console.log("");
    }

    // PII masking audit
    const auditSummary = masker.getAuditSummary();
    if (Object.keys(auditSummary).length > 0) {
      console.log("🔒 PII Masking Audit:");
      for (const [table, fields] of Object.entries(auditSummary)) {
        console.log(`   - ${table}: ${fields.join(", ")}`);
      }
      console.log("");
    }

    process.exit(stats.errors.length > 0 ? 1 : 0);
  } catch (error) {
    seedLogger.operationFailure(
      "main",
      error instanceof Error ? error : new Error(String(error)),
      {}
    );

    console.error("\n❌ Seeding failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    // Always release locks
    await lock.releaseAll();
  }
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
