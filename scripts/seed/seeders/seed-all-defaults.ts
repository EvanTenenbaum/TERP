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
import { closePool } from "../../db-sync";

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
// Topological Sort for Dependency Resolution
// ============================================================================

/**
 * Performs topological sort on seeders based on their dependencies.
 * Ensures seeders run in correct order with dependencies satisfied first.
 * @throws Error if circular dependencies detected
 */
function topologicalSort(seeders: SeederModule[]): SeederModule[] {
  const seederMap = new Map<string, SeederModule>();
  for (const seeder of seeders) {
    seederMap.set(seeder.key, seeder);
  }

  const visited = new Set<string>();
  const inProgress = new Set<string>();
  const sorted: SeederModule[] = [];

  function visit(seeder: SeederModule): void {
    if (visited.has(seeder.key)) {
      return;
    }
    if (inProgress.has(seeder.key)) {
      throw new Error(`Circular dependency detected involving: ${seeder.key}`);
    }

    inProgress.add(seeder.key);

    // Visit dependencies first
    for (const depKey of seeder.dependencies || []) {
      const dep = seederMap.get(depKey);
      if (dep) {
        visit(dep);
      } else {
        // Dependency not in our list to run - that's okay if running single module
        console.warn(
          `Warning: Dependency '${depKey}' for '${seeder.key}' is not in the seed list`
        );
      }
    }

    inProgress.delete(seeder.key);
    visited.add(seeder.key);
    sorted.push(seeder);
  }

  for (const seeder of seeders) {
    visit(seeder);
  }

  return sorted;
}

/**
 * Gets all dependencies recursively for a seeder (including transitive deps)
 */
function getAllDependencies(
  seederKey: string,
  allSeeders: SeederModule[]
): SeederModule[] {
  const seederMap = new Map<string, SeederModule>();
  for (const seeder of allSeeders) {
    seederMap.set(seeder.key, seeder);
  }

  const result: SeederModule[] = [];
  const visited = new Set<string>();

  function collect(key: string): void {
    if (visited.has(key)) return;
    visited.add(key);

    const seeder = seederMap.get(key);
    if (!seeder) return;

    for (const depKey of seeder.dependencies || []) {
      collect(depKey);
    }

    if (key !== seederKey) {
      const dep = seederMap.get(key);
      if (dep) result.push(dep);
    }
  }

  const targetSeeder = seederMap.get(seederKey);
  if (targetSeeder) {
    for (const depKey of targetSeeder.dependencies || []) {
      collect(depKey);
    }
  }

  return result;
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
  console.info("TERP Default Seeder");
  console.info("═".repeat(60));

  if (options.dryRun) {
    console.info("\nDRY RUN MODE: No data will be modified\n");
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
      console.error(`\nUnknown module: ${options.module}`);
      console.info("\nAvailable modules:");
      for (const s of SEEDERS) {
        console.info(`  - ${s.key}`);
      }
      process.exit(1);
    }
    // When running a single module, include its dependencies
    const deps = getAllDependencies(seeder.key, SEEDERS);
    seedersToRun = [...deps, seeder];
  } else {
    seedersToRun = SEEDERS;
  }

  // Sort seeders in topological order (dependencies first)
  let orderedSeeders: SeederModule[];
  try {
    orderedSeeders = topologicalSort(seedersToRun);
    console.info("\nExecution order (based on dependencies):");
    for (let i = 0; i < orderedSeeders.length; i++) {
      const s = orderedSeeders[i];
      const deps = s.dependencies?.length ? ` (depends on: ${s.dependencies.join(", ")})` : "";
      console.info(`  ${i + 1}. ${s.key}${deps}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\nFATAL: Failed to resolve dependencies: ${errorMessage}`);
    await closePool();
    process.exit(1);
  }

  const startTime = Date.now();
  const completed: string[] = [];

  // Run seeders with fail-fast behavior
  for (const seeder of orderedSeeders) {
    console.info(`\n${"─".repeat(60)}`);
    console.info(`Running: ${seeder.name} (${seeder.key})`);
    console.info("─".repeat(60));

    try {
      await seeder.run();
      completed.push(seeder.key);
      console.info(`[OK] ${seeder.name} completed successfully`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Log failure details
      console.error(`\n${"!".repeat(60)}`);
      console.error(`FATAL: ${seeder.name} (${seeder.key}) failed`);
      console.error("!".repeat(60));
      console.error(`Error: ${errorMessage}`);
      if (errorStack) {
        console.error(`Stack: ${errorStack}`);
      }

      // Show what succeeded before failure
      const duration = Date.now() - startTime;
      console.info(`\n${"═".repeat(60)}`);
      console.info("SEEDING ABORTED - FAIL-FAST TRIGGERED");
      console.info("═".repeat(60));
      console.info(`Duration before failure: ${duration}ms`);
      console.info(`Completed before failure: ${completed.length}/${orderedSeeders.length}`);

      if (completed.length > 0) {
        console.info("\nSuccessfully completed:");
        for (const key of completed) {
          console.info(`  [OK] ${key}`);
        }
      }

      console.info(`\nFailed at: ${seeder.key}`);

      const remaining = orderedSeeders
        .slice(orderedSeeders.indexOf(seeder) + 1)
        .map(s => s.key);
      if (remaining.length > 0) {
        console.info(`\nSkipped (not executed):`);
        for (const key of remaining) {
          console.info(`  [SKIPPED] ${key}`);
        }
      }

      console.info("\nDatabase may be in an inconsistent state. Please investigate.\n");

      // Clean shutdown
      await closePool();
      process.exit(1);
    }
  }

  // Success summary
  const duration = Date.now() - startTime;

  console.info(`\n${"═".repeat(60)}`);
  console.info("SEEDING SUMMARY");
  console.info("═".repeat(60));
  console.info(`Duration:   ${duration}ms`);
  console.info(`Total:      ${completed.length} modules`);
  console.info(`Successful: ${completed.length}`);
  console.info(`Failed:     0`);

  console.info("\nCompleted modules:");
  for (const key of completed) {
    console.info(`  [OK] ${key}`);
  }

  console.info("\nAll modules seeded successfully!\n");

  // Clean shutdown
  await closePool();
  process.exit(0);
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch(async error => {
  console.error("Fatal error:", error);
  await closePool();
  process.exit(1);
});
