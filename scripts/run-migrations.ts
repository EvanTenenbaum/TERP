#!/usr/bin/env tsx
/**
 * Database Migration Runner
 *
 * This script runs all pending database migrations in the drizzle/migrations folder.
 *
 * Usage:
 *   npx tsx scripts/run-migrations.ts
 *
 * Or with npm:
 *   npm run db:migrate
 *
 * Environment:
 *   DATABASE_URL - Required. MySQL connection string
 *
 * Example:
 *   DATABASE_URL="mysql://user:pass@localhost:3306/terp" npx tsx scripts/run-migrations.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";

const MIGRATIONS_FOLDER = "./drizzle/migrations";

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           TERP Database Migration Runner                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  // Check for DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL environment variable is required");
    console.error("");
    console.error("Usage:");
    console.error('  DATABASE_URL="mysql://user:pass@host:port/database" npx tsx scripts/run-migrations.ts');
    process.exit(1);
  }

  // List pending migrations
  console.log("📁 Migrations folder:", MIGRATIONS_FOLDER);
  console.log();

  const migrationFiles = fs.readdirSync(MIGRATIONS_FOLDER)
    .filter(f => f.endsWith(".sql"))
    .sort();

  console.log(`📋 Found ${migrationFiles.length} migration file(s):`);
  migrationFiles.forEach((file, i) => {
    console.log(`   ${i + 1}. ${file}`);
  });
  console.log();

  // Connect to database
  console.log("🔌 Connecting to database...");

  let connection: mysql.Connection;
  try {
    // Handle SSL for cloud databases
    const needsSSL =
      databaseUrl.includes("ssl-mode=REQUIRED") ||
      databaseUrl.includes("sslmode=require") ||
      databaseUrl.includes("ssl=true");

    const cleanUrl = databaseUrl
      .replace(/[?&]ssl-mode=[^&]*/gi, "")
      .replace(/[?&]sslmode=[^&]*/gi, "")
      .replace(/[?&]ssl=true/gi, "");

    connection = await mysql.createConnection({
      uri: cleanUrl,
      connectTimeout: 15000,
      ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
    });

    console.log("✅ Connected to database");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }

  // Create drizzle instance
  const db = drizzle(connection);

  // Run migrations
  console.log();
  console.log("🔄 Running migrations...");
  console.log("─".repeat(60));

  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    console.log("─".repeat(60));
    console.log("✅ All migrations completed successfully!");
  } catch (error) {
    console.error("─".repeat(60));
    console.error("❌ Migration failed:", error);
    await connection.end();
    process.exit(1);
  }

  // Close connection
  await connection.end();
  console.log();
  console.log("🎉 Database is up to date!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
