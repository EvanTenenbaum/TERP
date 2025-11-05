import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "../db";
import { logger } from "../_core/logger";

/**
 * Run database migrations
 * This applies all pending migrations to bring the database schema up to date
 */
export async function runMigrations() {
  logger.info("🔄 Running database migrations...");

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    logger.info("✅ Migrations completed successfully");
  } catch (error) {
    logger.error("❌ Migration failed:", error);
    throw error;
  }
}

