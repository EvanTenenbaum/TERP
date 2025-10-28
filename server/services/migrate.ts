import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "../db";

/**
 * Run database migrations
 * This applies all pending migrations to bring the database schema up to date
 */
export async function runMigrations() {
  console.log("🔄 Running database migrations...");

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

