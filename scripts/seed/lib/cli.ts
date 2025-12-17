/**
 * CLI Argument Parsing and Help Display
 *
 * Handles command-line argument parsing for the seeding system.
 */

import { seedLogger } from "./logging";

// ============================================================================
// Type Definitions
// ============================================================================

export interface CLIFlags {
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

// ============================================================================
// CLI Argument Parsing
// ============================================================================

/**
 * Parse command line arguments
 */
export function parseArgs(): CLIFlags {
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
export function validateArgs(flags: CLIFlags): boolean {
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

export function showHelp(): void {
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
  --clean, -c          Clear existing data before seeding (respects FK order)
  --rollback           Rollback seeded data (Phase 2 feature)
  --complete           Seed all data types including bills, POs, reservations
  --verbose, -v        Enable verbose output
  --help, -h           Show this help message

EXAMPLES:
  pnpm seed:new                           # Seed all tables with medium volume
  pnpm seed:new --table=clients           # Seed only clients table
  pnpm seed:new --size=small --dry-run    # Preview small seeding operation
  pnpm seed:new --clean --force           # Clean and reseed all tables
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
  lib/cli.ts           - CLI argument parsing

For more information, see scripts/seed/README.md
`);
}

/**
 * Get record counts based on size flag
 */
export function getRecordCounts(size: CLIFlags["size"], complete: boolean = false): Record<string, number> {
  const baseCounts: Record<CLIFlags["size"], Record<string, number>> = {
    small: {
      clients: 10,
      vendors: 5,
      products: 20,
      batches: 30,
      orders: 50,
      invoices: 50,
      payments: 30,
    },
    medium: {
      clients: 60,
      vendors: 15,
      products: 100,
      batches: 200,
      orders: 400,
      invoices: 400,
      payments: 200,
    },
    large: {
      clients: 200,
      vendors: 50,
      products: 500,
      batches: 1000,
      orders: 2000,
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
