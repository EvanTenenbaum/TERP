/**
 * Unified Default Seeder
 *
 * Runs all module default seeders in the correct order.
 * Creates a complete TERP development environment with all necessary seed data.
 *
 * Usage:
 *   npx tsx scripts/seed/seeders/seed-all-defaults.ts
 *   npx tsx scripts/seed/seeders/seed-all-defaults.ts --module=feature-flags
 *   npx tsx scripts/seed/seeders/seed-all-defaults.ts --dry-run
 */

import { seedFeatureFlags } from "./seed-feature-flags";
import { seedGamificationDefaults } from "./seed-gamification-defaults";
import { seedSchedulingDefaults } from "./seed-scheduling-defaults";
import { seedStorageDefaults } from "./seed-storage-defaults";
import { seedLeaderboardDefaults } from "./seed-leaderboard-defaults";

// ============================================================================
// Configuration
// ============================================================================

interface SeederModule {
  name: string;
  key: string;
  description: string;
  run: () => Promise<void>;
  dependencies?: string[];
}

const SEEDERS: SeederModule[] = [
  {
    name: "Feature Flags",
    key: "feature-flags",
    description: "Work Surface and module feature flags",
    run: seedFeatureFlags,
  },
  {
    name: "Gamification Defaults",
    key: "gamification",
    description: "Achievements, rewards, and referral settings",
    run: seedGamificationDefaults,
    dependencies: ["feature-flags"], // Depends on module-gamification flag
  },
  {
    name: "Scheduling Defaults",
    key: "scheduling",
    description: "Rooms, shift templates, and overtime rules",
    run: seedSchedulingDefaults,
    dependencies: ["feature-flags"], // Depends on module-calendar flag
  },
  {
    name: "Storage Defaults",
    key: "storage",
    description: "Sites and storage zones",
    run: seedStorageDefaults,
  },
  {
    name: "Leaderboard Defaults",
    key: "leaderboard",
    description: "Leaderboard weight configurations",
    run: seedLeaderboardDefaults,
    dependencies: ["gamification"],
  },
];

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CLIOptions {
  module?: string;
  dryRun: boolean;
  help: boolean;
  list: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    module: undefined,
    dryRun: false,
    help: false,
    list: false,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--list" || arg === "-l") {
      options.list = true;
    } else if (arg.startsWith("--module=")) {
      options.module = arg.split("=")[1];
    }
  }

  return options;
}

function showHelp(): void {
  console.info(`
TERP Default Seeder
==================

Seeds all module defaults (feature flags, gamification, scheduling, storage).

USAGE:
  npx tsx scripts/seed/seeders/seed-all-defaults.ts [OPTIONS]

OPTIONS:
  --module=<name>   Seed only a specific module
  --dry-run         Preview without executing
  --list, -l        List available modules
  --help, -h        Show this help

MODULES:
${SEEDERS.map(s => `  ${s.key.padEnd(16)} ${s.description}`).join("\n")}

EXAMPLES:
  # Seed everything
  npx tsx scripts/seed/seeders/seed-all-defaults.ts

  # Seed only feature flags
  npx tsx scripts/seed/seeders/seed-all-defaults.ts --module=feature-flags

  # Preview what would be seeded
  npx tsx scripts/seed/seeders/seed-all-defaults.ts --dry-run
`);
}

function showModuleList(): void {
  console.info("\nAvailable Seed Modules:\n");
  console.info(
    "KEY              DESCRIPTION                                DEPENDENCIES"
  );
  console.info("─".repeat(80));
  for (const seeder of SEEDERS) {
    const deps = seeder.dependencies?.join(", ") || "-";
    console.info(
      `${seeder.key.padEnd(16)} ${seeder.description.padEnd(42)} ${deps}`
    );
  }
  console.info("");
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.list) {
    showModuleList();
    process.exit(0);
  }

  console.info("═".repeat(60));
  console.info("🌱 TERP Default Seeder");
  console.info("═".repeat(60));

  if (options.dryRun) {
    console.info("\n📋 DRY RUN MODE: No data will be modified\n");
    console.info("Would seed the following modules:");
    const seedersToRun = options.module
      ? SEEDERS.filter(s => s.key === options.module)
      : SEEDERS;

    for (const seeder of seedersToRun) {
      console.info(`  - ${seeder.name}: ${seeder.description}`);
    }
    console.info("\nRun without --dry-run to execute.\n");
    process.exit(0);
  }

  // Determine which seeders to run
  let seedersToRun: SeederModule[];
  if (options.module) {
    const seeder = SEEDERS.find(s => s.key === options.module);
    if (!seeder) {
      console.error(`\n❌ Unknown module: ${options.module}`);
      console.info("\nAvailable modules:");
      for (const s of SEEDERS) {
        console.info(`  - ${s.key}`);
      }
      process.exit(1);
    }
    seedersToRun = [seeder];
  } else {
    seedersToRun = SEEDERS;
  }

  const startTime = Date.now();
  const results: { name: string; success: boolean; error?: string }[] = [];

  // Run seeders
  for (const seeder of seedersToRun) {
    console.info(`\n${"─".repeat(60)}`);
    console.info(`Running: ${seeder.name}`);
    console.info("─".repeat(60));

    try {
      await seeder.run();
      results.push({ name: seeder.name, success: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      results.push({ name: seeder.name, success: false, error: errorMessage });
      console.error(`\n❌ ${seeder.name} failed: ${errorMessage}`);
    }
  }

  // Summary
  const duration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.info(`\n${"═".repeat(60)}`);
  console.info("📊 SEEDING SUMMARY");
  console.info("═".repeat(60));
  console.info(`Duration:   ${duration}ms`);
  console.info(`Total:      ${results.length} modules`);
  console.info(`Successful: ${successful}`);
  console.info(`Failed:     ${failed}`);

  if (failed > 0) {
    console.info("\nFailed modules:");
    for (const result of results.filter(r => !r.success)) {
      console.info(`  ❌ ${result.name}: ${result.error}`);
    }
  }

  console.info(
    "\n" +
      (failed === 0
        ? "✅ All modules seeded successfully!"
        : "⚠️ Some modules failed.") +
      "\n"
  );
  process.exit(failed > 0 ? 1 : 0);
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
