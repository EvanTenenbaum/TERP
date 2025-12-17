#!/usr/bin/env npx tsx
/**
 * Vendor to Client Migration Script
 *
 * Part of Canonical Model Unification (Phase 3, Task 14.2)
 *
 * This script migrates vendor records to the unified clients table,
 * creating supplier profiles and maintaining legacy vendor ID mappings.
 *
 * Usage:
 *   npx tsx scripts/migrate-vendors-to-clients.ts [options]
 *
 * Options:
 *   --dry-run              Preview changes without applying them
 *   --collision-strategy   How to handle name collisions: skip|merge|rename (default: skip)
 *   --confirm-production   Required flag for production execution
 *   --verbose              Show detailed progress
 *
 * **Validates: Requirements 7.1, 7.2, 7.5**
 */

import {
  migrateAllVendors,
  getUnmigratedVendors,
  checkForCollisions,
  type MigrationOptions,
} from "../server/services/vendorMappingService";

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CliOptions {
  dryRun: boolean;
  collisionStrategy: "skip" | "merge" | "rename";
  confirmProduction: boolean;
  verbose: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  const options: CliOptions = {
    dryRun: false,
    collisionStrategy: "skip",
    confirmProduction: false,
    verbose: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--confirm-production") {
      options.confirmProduction = true;
    } else if (arg === "--verbose") {
      options.verbose = true;
    } else if (arg.startsWith("--collision-strategy=")) {
      const strategy = arg.split("=")[1];
      if (strategy === "skip" || strategy === "merge" || strategy === "rename") {
        options.collisionStrategy = strategy;
      } else {
        console.error(`Invalid collision strategy: ${strategy}`);
        console.error("Valid options: skip, merge, rename");
        process.exit(1);
      }
    }
  }

  return options;
}

// ============================================================================
// Environment Detection
// ============================================================================

function isProduction(): boolean {
  const dbUrl = process.env.DATABASE_URL || "";
  return (
    dbUrl.includes("production") ||
    dbUrl.includes("prod") ||
    dbUrl.includes("ondigitalocean.com") ||
    process.env.NODE_ENV === "production"
  );
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function main() {
  const options = parseArgs();

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║       VENDOR TO CLIENT MIGRATION SCRIPT                    ║");
  console.log("║       Canonical Model Unification - Phase 3                ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  // Production safety check
  if (isProduction() && !options.confirmProduction) {
    console.error("❌ ERROR: Production environment detected!");
    console.error("   To run on production, add --confirm-production flag");
    console.error();
    console.error("   Example: npx tsx scripts/migrate-vendors-to-clients.ts --confirm-production");
    process.exit(1);
  }

  if (options.dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made");
    console.log();
  }

  console.log("Configuration:");
  console.log(`  - Collision Strategy: ${options.collisionStrategy}`);
  console.log(`  - Dry Run: ${options.dryRun}`);
  console.log(`  - Verbose: ${options.verbose}`);
  console.log();

  // Get unmigrated vendors
  console.log("📊 Analyzing vendors...");
  const unmigrated = await getUnmigratedVendors();
  console.log(`   Found ${unmigrated.length} unmigrated vendors`);
  console.log();

  if (unmigrated.length === 0) {
    console.log("✅ All vendors have already been migrated!");
    process.exit(0);
  }

  // Check for collisions
  console.log("🔍 Checking for name collisions...");
  let collisionCount = 0;
  const collisions: Array<{ vendorId: number; vendorName: string; clientName: string }> = [];

  for (const vendor of unmigrated) {
    const collision = await checkForCollisions(vendor.id);
    if (collision.hasCollision && collision.existingClient) {
      collisionCount++;
      collisions.push({
        vendorId: vendor.id,
        vendorName: vendor.name,
        clientName: collision.existingClient.name,
      });
    }
  }

  if (collisionCount > 0) {
    console.log(`   ⚠️  Found ${collisionCount} name collisions:`);
    if (options.verbose) {
      for (const c of collisions) {
        console.log(`      - Vendor "${c.vendorName}" (ID: ${c.vendorId}) → Client "${c.clientName}"`);
      }
    }
    console.log(`   Strategy: ${options.collisionStrategy}`);
    console.log();
  } else {
    console.log("   ✅ No name collisions found");
    console.log();
  }

  // Run migration
  console.log("🚀 Starting migration...");
  console.log();

  const migrationOptions: MigrationOptions = {
    dryRun: options.dryRun,
    collisionStrategy: options.collisionStrategy,
  };

  const results = await migrateAllVendors(migrationOptions);

  // Report results
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                    MIGRATION RESULTS                       ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`  Total vendors:     ${results.total}`);
  console.log(`  Migrated:          ${results.migrated}`);
  console.log(`  Skipped:           ${results.skipped}`);
  console.log(`  Errors:            ${results.errors.length}`);
  console.log();

  if (results.errors.length > 0) {
    console.log("❌ Errors encountered:");
    for (const error of results.errors) {
      console.log(`   - Vendor ${error.vendorId}: ${error.error}`);
    }
    console.log();
  }

  if (options.dryRun) {
    console.log("🔍 DRY RUN COMPLETE - No changes were made");
    console.log("   Run without --dry-run to apply changes");
  } else {
    console.log("✅ Migration complete!");
  }

  // Exit with error code if there were errors
  if (results.errors.length > 0) {
    process.exit(1);
  }
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error("❌ Migration failed with error:");
  console.error(error);
  process.exit(1);
});
