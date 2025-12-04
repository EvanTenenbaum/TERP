#!/usr/bin/env tsx
/**
 * Run database migrations on Railway
 * This script connects to the Railway MySQL database and runs all pending migrations
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { migrate } from "drizzle-orm/mysql2/migrator";

async function runMigrations() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("🔄 Connecting to database...");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("🔄 Running migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
