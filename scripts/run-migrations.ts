#!/usr/bin/env tsx
/**
 * Database Migration Runner
 *
 * Runs all pending SQL migrations from drizzle/migrations folder.
 * Tracks completed migrations in a __migrations table.
 *
 * Usage:
 *   npm run db:migrate
 *   # or
 *   DATABASE_URL="mysql://user:pass@host:port/db" npx tsx scripts/run-migrations.ts
 *
 * Options:
 *   --dry-run    Show which migrations would run without executing
 *   --force      Re-run all migrations (dangerous!)
 */

import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";

const MIGRATIONS_FOLDER = "./drizzle/migrations";
const MIGRATIONS_TABLE = "__migrations";

interface MigrationRecord {
  id: number;
  name: string;
  executed_at: Date;
}

async function createConnection(): Promise<mysql.Connection> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL environment variable is required");
    console.error("");
    console.error("Usage:");
    console.error('  DATABASE_URL="mysql://user:pass@host:port/database" npm run db:migrate');
    process.exit(1);
  }

  // Handle SSL for cloud databases
  const needsSSL =
    databaseUrl.includes("ssl-mode=REQUIRED") ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("ssl=true");

  const cleanUrl = databaseUrl
    .replace(/[?&]ssl-mode=[^&]*/gi, "")
    .replace(/[?&]sslmode=[^&]*/gi, "")
    .replace(/[?&]ssl=true/gi, "");

  return mysql.createConnection({
    uri: cleanUrl,
    connectTimeout: 15000,
    multipleStatements: true, // Required for running SQL files
    ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

async function ensureMigrationsTable(connection: mysql.Connection): Promise<void> {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getCompletedMigrations(connection: mysql.Connection): Promise<Set<string>> {
  const [rows] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`
  );
  return new Set(rows.map((r) => r.name));
}

async function recordMigration(connection: mysql.Connection, name: string): Promise<void> {
  await connection.execute(
    `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
    [name]
  );
}

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_FOLDER)) {
    console.error(`❌ Migrations folder not found: ${MIGRATIONS_FOLDER}`);
    process.exit(1);
  }

  return fs.readdirSync(MIGRATIONS_FOLDER)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function runMigration(connection: mysql.Connection, filename: string): Promise<void> {
  const filepath = path.join(MIGRATIONS_FOLDER, filename);
  const sql = fs.readFileSync(filepath, "utf-8");

  // Split by statement breakpoints (-- breakpoint or empty lines between statements)
  // For safety, we run the whole file as one transaction when possible
  await connection.execute(sql);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           TERP Database Migration Runner                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  }

  if (force) {
    console.log("⚠️  FORCE MODE - Will re-run all migrations!\n");
  }

  // Get all migration files
  const allMigrations = getMigrationFiles();
  console.log(`📁 Found ${allMigrations.length} migration file(s) in ${MIGRATIONS_FOLDER}`);
  console.log();

  // Connect to database
  console.log("🔌 Connecting to database...");
  let connection: mysql.Connection;
  try {
    connection = await createConnection();
    console.log("✅ Connected\n");
  } catch (error) {
    console.error("❌ Failed to connect:", error);
    process.exit(1);
  }

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(connection);

    // Get completed migrations
    const completed = force ? new Set<string>() : await getCompletedMigrations(connection);

    // Find pending migrations
    const pending = allMigrations.filter((m) => !completed.has(m));

    if (pending.length === 0) {
      console.log("✅ Database is up to date - no pending migrations\n");
      await connection.end();
      return;
    }

    console.log(`📋 Pending migrations (${pending.length}):`);
    pending.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m}`);
    });
    console.log();

    if (dryRun) {
      console.log("🔍 Dry run complete - no changes made");
      await connection.end();
      return;
    }

    // Run pending migrations
    console.log("🔄 Running migrations...");
    console.log("─".repeat(60));

    for (const migration of pending) {
      process.stdout.write(`   ▶ ${migration}... `);
      try {
        await runMigration(connection, migration);
        await recordMigration(connection, migration);
        console.log("✅");
      } catch (error: any) {
        console.log("❌");
        console.error(`\nError in ${migration}:`);
        console.error(error.message || error);
        console.error("\nMigration aborted. Fix the issue and re-run.");
        await connection.end();
        process.exit(1);
      }
    }

    console.log("─".repeat(60));
    console.log(`\n🎉 Successfully ran ${pending.length} migration(s)!`);

  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
