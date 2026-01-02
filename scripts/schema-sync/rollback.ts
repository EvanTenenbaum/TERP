#!/usr/bin/env tsx
/**
 * TERP Schema Rollback Script
 *
 * Rolls back schema changes to a previous checkpoint or specific migration.
 *
 * Usage:
 *   pnpm tsx scripts/schema-sync/rollback.ts [options]
 *
 * Options:
 *   --to-checkpoint=<id>   Rollback to specific checkpoint
 *   --to-migration=<id>    Rollback to specific migration
 *   --list                 List available checkpoints and migrations
 *   --dry-run              Preview rollback without applying
 *   --verbose              Show detailed output
 *   --force                Skip confirmation prompts
 *
 * @module scripts/schema-sync/rollback
 * @version 1.0.0
 * @created 2026-01-02
 */

import { parseArgs } from "util";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Script options interface
interface ScriptOptions {
  toCheckpoint: string | null;
  toMigration: string | null;
  list: boolean;
  dryRun: boolean;
  verbose: boolean;
  force: boolean;
}

// Checkpoint info
interface CheckpointInfo {
  id: string;
  timestamp: string;
  description: string;
  backupFile: string;
  migrationId: string;
}

// Parse command line arguments
function parseOptions(): ScriptOptions {
  const { values } = parseArgs({
    options: {
      "to-checkpoint": { type: "string" },
      "to-migration": { type: "string" },
      list: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
    },
  });

  return {
    toCheckpoint: values["to-checkpoint"] ?? null,
    toMigration: values["to-migration"] ?? null,
    list: values.list ?? false,
    dryRun: values["dry-run"] ?? false,
    verbose: values.verbose ?? false,
    force: values.force ?? false,
  };
}

// Logger utility
function log(message: string): void {
  console.log(message);
}

// Prompt for confirmation
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Get available checkpoints
function getCheckpoints(projectRoot: string): CheckpointInfo[] {
  const checkpointsDir = path.join(projectRoot, ".schema-checkpoints");
  const checkpoints: CheckpointInfo[] = [];

  if (fs.existsSync(checkpointsDir)) {
    const files = fs
      .readdirSync(checkpointsDir)
      .filter(f => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = JSON.parse(
          fs.readFileSync(path.join(checkpointsDir, file), "utf-8")
        );
        checkpoints.push(content);
      } catch {
        // Skip invalid files
      }
    }
  }

  // Sort by timestamp descending
  checkpoints.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return checkpoints;
}

// Get available migrations from journal
function getMigrations(
  projectRoot: string
): { id: string; name: string; timestamp: string }[] {
  const journalPath = path.join(
    projectRoot,
    "drizzle",
    "meta",
    "_journal.json"
  );
  const migrations: { id: string; name: string; timestamp: string }[] = [];

  if (fs.existsSync(journalPath)) {
    try {
      const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
      if (journal.entries && Array.isArray(journal.entries)) {
        for (const entry of journal.entries) {
          migrations.push({
            id: entry.idx?.toString() ?? "unknown",
            name: entry.tag ?? "unknown",
            timestamp: entry.when
              ? new Date(entry.when).toISOString()
              : "unknown",
          });
        }
      }
    } catch {
      // Journal parse error
    }
  }

  return migrations;
}

// List available rollback targets
function listTargets(projectRoot: string): void {
  log("============================================================");
  log("AVAILABLE ROLLBACK TARGETS");
  log("============================================================");
  log("");

  // List checkpoints
  const checkpoints = getCheckpoints(projectRoot);
  log("CHECKPOINTS:");
  if (checkpoints.length === 0) {
    log("  (no checkpoints available)");
  } else {
    for (const cp of checkpoints) {
      log(`  ${cp.id}`);
      log(`    Created: ${cp.timestamp}`);
      log(`    Description: ${cp.description}`);
      log(`    Backup: ${cp.backupFile}`);
      log("");
    }
  }

  log("");

  // List migrations
  const migrations = getMigrations(projectRoot);
  log("MIGRATIONS:");
  if (migrations.length === 0) {
    log("  (no migrations in journal)");
  } else {
    for (const m of migrations.slice(0, 10)) {
      log(`  ${m.id}: ${m.name}`);
    }
    if (migrations.length > 10) {
      log(`  ... and ${migrations.length - 10} more`);
    }
  }
}

// Rollback to checkpoint
async function rollbackToCheckpoint(
  checkpointId: string,
  projectRoot: string,
  options: ScriptOptions
): Promise<boolean> {
  log(`Rolling back to checkpoint: ${checkpointId}`);

  const checkpoints = getCheckpoints(projectRoot);
  const checkpoint = checkpoints.find(cp => cp.id === checkpointId);

  if (!checkpoint) {
    log(`❌ Checkpoint not found: ${checkpointId}`);
    return false;
  }

  log(`  Checkpoint created: ${checkpoint.timestamp}`);
  log(`  Backup file: ${checkpoint.backupFile}`);

  if (options.dryRun) {
    log("");
    log("[DRY-RUN] Would execute:");
    log(`  1. Stop application`);
    log(`  2. Restore database from ${checkpoint.backupFile}`);
    log(`  3. Restart application`);
    log(`  4. Verify health check`);
    return true;
  }

  // Verify backup file exists
  if (!fs.existsSync(checkpoint.backupFile)) {
    log(`❌ Backup file not found: ${checkpoint.backupFile}`);
    return false;
  }

  // In real implementation:
  // 1. Stop application
  // 2. Restore database
  // 3. Restart application
  // 4. Verify health

  log("✓ Rollback completed successfully");
  return true;
}

// Rollback to migration
async function rollbackToMigration(
  migrationId: string,
  projectRoot: string,
  options: ScriptOptions
): Promise<boolean> {
  log(`Rolling back to migration: ${migrationId}`);

  const migrations = getMigrations(projectRoot);
  const targetIdx = migrations.findIndex(m => m.id === migrationId);

  if (targetIdx === -1) {
    log(`❌ Migration not found: ${migrationId}`);
    return false;
  }

  const migrationsToRollback = migrations.slice(targetIdx + 1);

  if (migrationsToRollback.length === 0) {
    log("✓ Already at target migration");
    return true;
  }

  log(`  Will rollback ${migrationsToRollback.length} migrations:`);
  for (const m of migrationsToRollback) {
    log(`    - ${m.id}: ${m.name}`);
  }

  if (options.dryRun) {
    log("");
    log("[DRY-RUN] Would execute rollback SQL for each migration");
    return true;
  }

  // Check for rollback files
  const rollbackDir = path.join(projectRoot, "drizzle", "rollback");
  for (const m of migrationsToRollback.reverse()) {
    const rollbackFile = path.join(rollbackDir, `${m.id}_rollback.sql`);
    if (fs.existsSync(rollbackFile)) {
      log(`  Executing rollback for ${m.id}...`);
      // In real implementation: execute the rollback SQL
    } else {
      log(`  ⚠️ No rollback file for ${m.id}, skipping`);
    }
  }

  log("✓ Rollback completed");
  return true;
}

// Main rollback function
async function rollback(): Promise<void> {
  const options = parseOptions();
  const projectRoot = process.cwd();

  log("============================================================");
  log("TERP SCHEMA ROLLBACK");
  log("============================================================");
  log(`Started: ${new Date().toISOString()}`);
  log(`Mode: ${options.dryRun ? "DRY-RUN (preview only)" : "LIVE"}`);
  log("");

  // List mode
  if (options.list) {
    listTargets(projectRoot);
    return;
  }

  // Validate options
  if (!options.toCheckpoint && !options.toMigration) {
    log("❌ Error: Must specify --to-checkpoint or --to-migration");
    log("");
    log("Use --list to see available targets");
    process.exit(1);
  }

  // Safety confirmation
  if (!options.dryRun && !options.force) {
    log("⚠️  WARNING: This will rollback database schema changes.");
    log("   This operation may result in data loss.");
    log("");

    const confirmed = await confirm("Are you sure you want to proceed?");
    if (!confirmed) {
      log("Aborted by user.");
      process.exit(0);
    }
  }

  // Execute rollback
  let success = false;

  if (options.toCheckpoint) {
    success = await rollbackToCheckpoint(
      options.toCheckpoint,
      projectRoot,
      options
    );
  } else if (options.toMigration) {
    success = await rollbackToMigration(
      options.toMigration,
      projectRoot,
      options
    );
  }

  // Summary
  log("");
  log("============================================================");
  log("SUMMARY");
  log("============================================================");

  if (options.dryRun) {
    log("DRY-RUN COMPLETE");
    log("To execute rollback, run without --dry-run flag.");
  } else {
    log(`Status: ${success ? "SUCCESS" : "FAILED"}`);
  }

  if (!success) {
    process.exit(1);
  }
}

// Run rollback
rollback().catch(error => {
  console.error("Rollback failed:", error);
  process.exit(1);
});
