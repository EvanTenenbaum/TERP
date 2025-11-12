/**
 * Run Calendar v3.2 Migrations
 * Applies all 5 migrations for Calendar Evolution v3.2
 */

import 'dotenv/config';
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigrations() {
  console.log("🚀 Starting Calendar v3.2 migrations...\n");

  const db = await getDb();
  
  if (!db) {
    console.error("❌ Database connection not available");
    process.exit(1);
  }

  const migrations = [
    {
      name: "0031_add_calendar_v32_columns",
      file: "drizzle/0031_add_calendar_v32_columns.sql",
    },
    {
      name: "0032_fix_meeting_history_cascade",
      file: "drizzle/0032_fix_meeting_history_cascade.sql",
    },
    {
      name: "0033_add_event_types",
      file: "drizzle/0033_add_event_types.sql",
    },
    {
      name: "0034_add_intake_event_to_orders",
      file: "drizzle/0034_add_intake_event_to_orders.sql",
    },
    {
      name: "0035_add_photo_event_to_batches",
      file: "drizzle/0035_add_photo_event_to_batches.sql",
    },
  ];

  for (const migration of migrations) {
    try {
      console.log(`📝 Running migration: ${migration.name}...`);

      const migrationPath = path.join(process.cwd(), migration.file);
      const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

      // Split by semicolon and run each statement
      const statements = migrationSQL
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await (db as any).execute(sql.raw(statement));
      }

      console.log(`✅ Migration ${migration.name} completed successfully\n`);
    } catch (error: any) {
      // Check if error is "Duplicate column" or "Duplicate key" (already applied)
      if (
        error.message?.includes("Duplicate column") ||
        error.message?.includes("Duplicate key") ||
        error.message?.includes("already exists")
      ) {
        console.log(
          `⚠️  Migration ${migration.name} already applied (skipping)\n`
        );
        continue;
      }

      console.error(`❌ Migration ${migration.name} failed:`, error.message);
      throw error;
    }
  }

  console.log("✅ All Calendar v3.2 migrations completed successfully!");

  // Verify schema changes
  console.log("\n🔍 Verifying schema changes...");

  try {
    // Check calendar_events columns
    const result = await (db as any).execute(
      sql.raw("DESCRIBE calendar_events")
    );
    const columns = (result as any).map((row: any) => row.Field);

    const requiredColumns = ["client_id", "vendor_id", "metadata"];
    const missingColumns = requiredColumns.filter(
      (col) => !columns.includes(col)
    );

    if (missingColumns.length > 0) {
      console.error(
        `❌ Missing columns in calendar_events: ${missingColumns.join(", ")}`
      );
      process.exit(1);
    }

    console.log("✅ calendar_events table has all required columns");

    // Check orders table
    const ordersResult = await (db as any).execute(sql.raw("DESCRIBE orders"));
    const ordersColumns = (ordersResult as any).map((row: any) => row.Field);

    if (!ordersColumns.includes("intake_event_id")) {
      console.error("❌ Missing intake_event_id column in orders table");
      process.exit(1);
    }

    console.log("✅ orders table has intake_event_id column");

    // Check batches table
    const batchesResult = await (db as any).execute(sql.raw("DESCRIBE batches"));
    const batchesColumns = (batchesResult as any).map((row: any) => row.Field);

    if (!batchesColumns.includes("photo_session_event_id")) {
      console.error(
        "❌ Missing photo_session_event_id column in batches table"
      );
      process.exit(1);
    }

    console.log("✅ batches table has photo_session_event_id column");

    console.log("\n✅ All schema changes verified successfully!");
  } catch (error: any) {
    console.error("❌ Schema verification failed:", error.message);
    throw error;
  }

  process.exit(0);
}

runMigrations().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
