#!/usr/bin/env tsx
/**
 * TERP Full-System Seeder (Canonical)
 *
 * This script orchestrates all major seed paths in dependency order and
 * validates relational integrity at the end.
 *
 * Usage:
 *   pnpm seed:system
 *   pnpm seed:system --light
 *   pnpm seed:system --dry-run
 */

import { spawnSync } from "node:child_process";
import * as readline from "node:readline";

type SeedSize = "full" | "light";

interface CliFlags {
  size: SeedSize;
  dryRun: boolean;
  clearData: boolean;
  force: boolean;
  skipAccounts: boolean;
  skipQaData: boolean;
  skipAugment: boolean;
  skipValidation: boolean;
  continueOnError: boolean;
  help: boolean;
}

interface SeedStep {
  id: string;
  description: string;
  command: string;
  args: string[];
  supportsDryRun: boolean;
  dryRunArgs?: string[];
  required: boolean;
  enabled: boolean;
}

type StepStatus = "success" | "skipped" | "failed";

interface StepResult {
  id: string;
  description: string;
  status: StepStatus;
  details?: string;
}

function parseArgs(): CliFlags {
  const args = process.argv.slice(2);

  const flags: CliFlags = {
    size: "full",
    dryRun: false,
    clearData: true,
    force: false,
    skipAccounts: false,
    skipQaData: false,
    skipAugment: false,
    skipValidation: false,
    continueOnError: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--light") {
      flags.size = "light";
    } else if (arg === "--no-clear") {
      flags.clearData = false;
    } else if (arg === "--force" || arg === "-f") {
      flags.force = true;
    } else if (arg === "--skip-accounts") {
      flags.skipAccounts = true;
    } else if (arg === "--skip-qa-data") {
      flags.skipQaData = true;
    } else if (arg === "--skip-augment") {
      flags.skipAugment = true;
    } else if (arg === "--skip-validation") {
      flags.skipValidation = true;
    } else if (arg === "--continue-on-error") {
      flags.continueOnError = true;
    }
  }

  return flags;
}

function showHelp(): void {
  console.info(`
TERP Full-System Seeder
=======================

One command to seed realistic, linked mock data across core ERP flows and
module defaults, then verify integrity.

USAGE:
  pnpm seed:system [OPTIONS]

OPTIONS:
  --light               Smaller dataset (faster run)
  --dry-run             Preview execution plan without writing data
  --no-clear            Keep existing data (do not clear first)
  --force, -f           Skip destructive-operation confirmation
  --skip-accounts       Skip QA/test account seeders
  --skip-qa-data        Skip deterministic QA fixture seeding
  --skip-augment        Skip post-seed augmentation scripts
  --skip-validation     Skip post-seed integrity checks
  --continue-on-error   Continue running optional steps after failures
  --help, -h            Show this help

EXAMPLES:
  pnpm seed:system
  pnpm seed:system --light
  pnpm seed:system --dry-run
  pnpm seed:system --no-clear --force
`);
}

function maskDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    if (url.password) {
      url.password = "****";
    }
    return url.toString();
  } catch {
    return "<unparseable DATABASE_URL>";
  }
}

function buildSteps(flags: CliFlags): SeedStep[] {
  return [
    {
      id: "core",
      description: "Seed comprehensive linked ERP data",
      command: "pnpm",
      args: [
        "seed:comprehensive",
        ...(flags.size === "light" ? ["--light"] : []),
        ...(flags.clearData ? [] : ["--no-clear"]),
      ],
      supportsDryRun: true,
      dryRunArgs: ["--dry-run"],
      required: true,
      enabled: true,
    },
    {
      id: "defaults",
      description:
        "Seed module defaults (feature flags, scheduling, storage, gamification, leaderboard)",
      command: "pnpm",
      args: ["seed:defaults"],
      supportsDryRun: true,
      dryRunArgs: ["--dry-run"],
      required: true,
      enabled: true,
    },
    {
      id: "rbac",
      description: "Reconcile RBAC roles, permissions, and mappings",
      command: "pnpm",
      args: ["seed:rbac:reconcile"],
      supportsDryRun: true,
      dryRunArgs: ["--dry-run"],
      required: true,
      enabled: true,
    },
    {
      id: "qa-accounts",
      description: "Create deterministic QA role accounts",
      command: "pnpm",
      args: ["seed:qa-accounts"],
      supportsDryRun: false,
      required: true,
      enabled: !flags.skipAccounts,
    },
    {
      id: "test-accounts",
      description: "Create E2E test accounts",
      command: "pnpm",
      args: ["seed:test-accounts"],
      supportsDryRun: false,
      required: false,
      enabled: !flags.skipAccounts,
    },
    {
      id: "qa-data",
      description: "Seed deterministic QA fixture entities",
      command: "pnpm",
      args: ["seed:qa-data"],
      supportsDryRun: false,
      required: true,
      enabled: !flags.skipQaData,
    },
    {
      id: "gap-fill",
      description: "Fill non-critical data gaps safely",
      command: "pnpm",
      args: ["seed:fill-gaps"],
      supportsDryRun: true,
      dryRunArgs: ["--dry-run"],
      required: true,
      enabled: true,
    },
    {
      id: "augment",
      description: "Augment temporal and relationship realism",
      command: "pnpm",
      args: ["augment:data"],
      supportsDryRun: false,
      required: false,
      enabled: !flags.skipAugment,
    },
    {
      id: "validate-legacy",
      description: "Run existing data quality checks",
      command: "pnpm",
      args: ["tsx", "scripts/validate-data-quality.ts"],
      supportsDryRun: false,
      required: true,
      enabled: !flags.skipValidation,
    },
    {
      id: "validate-integrity",
      description: "Run strict relational integrity verification",
      command: "pnpm",
      args: ["seed:verify:integrity"],
      supportsDryRun: false,
      required: true,
      enabled: !flags.skipValidation,
    },
  ];
}

function printPlan(flags: CliFlags, steps: SeedStep[]): void {
  console.info("\n" + "=".repeat(78));
  console.info("TERP FULL-SYSTEM SEED PLAN");
  console.info("=".repeat(78));
  console.info(`Mode:      ${flags.dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.info(`Dataset:   ${flags.size.toUpperCase()}`);
  console.info(`Clear DB:  ${flags.clearData ? "yes" : "no"}`);
  console.info(`Validation:${flags.skipValidation ? "skipped" : "enabled"}`);
  console.info("-".repeat(78));

  let stepIndex = 0;
  for (const step of steps) {
    if (!step.enabled) {
      continue;
    }
    stepIndex++;
    const runArgs = [
      ...step.args,
      ...(flags.dryRun && step.supportsDryRun ? step.dryRunArgs || [] : []),
    ];
    console.info(`${stepIndex}. ${step.description}`);
    console.info(`   ${step.command} ${runArgs.join(" ")}`);
  }

  console.info("=".repeat(78) + "\n");
}

async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

function runStep(
  step: SeedStep,
  index: number,
  total: number,
  flags: CliFlags,
  planOnly: boolean
): StepResult {
  if (planOnly) {
    console.info(`\n[${index}/${total}] ⏭ ${step.description}`);
    console.info("   skipped (plan-only mode: DATABASE_URL not set)");
    return {
      id: step.id,
      description: step.description,
      status: "skipped",
      details: "plan-only mode (no DATABASE_URL)",
    };
  }

  if (!step.enabled) {
    return {
      id: step.id,
      description: step.description,
      status: "skipped",
      details: "disabled by flag",
    };
  }

  if (flags.dryRun && !step.supportsDryRun) {
    console.info(`\n[${index}/${total}] ⏭ ${step.description}`);
    console.info("   skipped (step does not support dry-run)");
    return {
      id: step.id,
      description: step.description,
      status: "skipped",
      details: "no dry-run support",
    };
  }

  const args = [
    ...step.args,
    ...(flags.dryRun && step.supportsDryRun ? step.dryRunArgs || [] : []),
  ];

  console.info(`\n[${index}/${total}] ▶ ${step.description}`);
  console.info(`   ${step.command} ${args.join(" ")}`);

  const result = spawnSync(step.command, args, {
    stdio: "inherit",
    env: process.env,
    shell: false,
  });

  if (result.status === 0) {
    return {
      id: step.id,
      description: step.description,
      status: "success",
    };
  }

  return {
    id: step.id,
    description: step.description,
    status: "failed",
    details: `exit code ${result.status ?? "unknown"}`,
  };
}

async function main(): Promise<void> {
  const flags = parseArgs();

  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  if (!flags.dryRun && !process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is required for full-system seeding.");
    console.error("   Example:");
    console.error(
      "   DATABASE_URL='mysql://user:pass@host:3306/db?ssl-mode=REQUIRED' pnpm seed:system"
    );
    process.exit(1);
  }

  if (!flags.dryRun && process.env.DATABASE_URL) {
    console.info(`🔌 Target DB: ${maskDatabaseUrl(process.env.DATABASE_URL)}`);
  }

  const planOnly = flags.dryRun && !process.env.DATABASE_URL;
  if (planOnly) {
    console.info(
      "ℹ️  Dry-run is running in plan-only mode because DATABASE_URL is not set."
    );
    console.info(
      "   Set DATABASE_URL to execute dry-run checks against a live schema."
    );
  }

  const steps = buildSteps(flags).filter(step => step.enabled);
  printPlan(flags, steps);

  if (!flags.dryRun && flags.clearData && !flags.force) {
    const confirmed = await promptConfirmation(
      "This will clear and reseed data. Continue? (y/N): "
    );
    if (!confirmed) {
      console.info("Seed cancelled.");
      process.exit(0);
    }
  }

  const results: StepResult[] = [];
  let hasBlockingFailure = false;
  let hasRequiredFailure = false;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const result = runStep(step, i + 1, steps.length, flags, planOnly);
    results.push(result);

    if (result.status === "failed") {
      const failureLabel = step.required ? "required" : "optional";
      console.error(
        `❌ Step failed (${failureLabel}): ${step.description} (${result.details})`
      );

      if (step.required) {
        hasRequiredFailure = true;
        hasBlockingFailure = true;
      } else if (!flags.continueOnError) {
        hasBlockingFailure = true;
      }

      if (!flags.continueOnError || step.required) {
        break;
      }
    }
  }

  const successCount = results.filter(r => r.status === "success").length;
  const skippedCount = results.filter(r => r.status === "skipped").length;
  const failed = results.filter(r => r.status === "failed");

  console.info("\n" + "=".repeat(78));
  console.info("TERP FULL-SYSTEM SEED SUMMARY");
  console.info("=".repeat(78));
  console.info(`Success: ${successCount}`);
  console.info(`Skipped: ${skippedCount}`);
  console.info(`Failed:  ${failed.length}`);

  if (failed.length > 0) {
    console.info("\nFailed steps:");
    for (const failure of failed) {
      console.info(`- ${failure.description} (${failure.details})`);
    }
  }

  if (!hasRequiredFailure) {
    if (hasBlockingFailure) {
      console.info("\n❌ Full-system seeding failed.");
    } else if (failed.length > 0) {
      console.info(
        "\n⚠️  Full-system seeding completed with non-blocking failures."
      );
    } else if (flags.dryRun) {
      console.info("\n✅ Dry run complete.");
    } else {
      console.info("\n✅ Full-system seeding completed.");
    }
  } else {
    console.info("\n❌ Full-system seeding failed.");
  }
  console.info("=".repeat(78) + "\n");

  process.exit(hasBlockingFailure ? 1 : 0);
}

main().catch(error => {
  console.error("Fatal error in full-system seeder:", error);
  process.exit(1);
});
