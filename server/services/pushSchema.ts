import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../_core/logger";

const execAsync = promisify(exec);

/**
 * Push schema changes to database using drizzle-kit
 * This syncs the database schema with the code without using migrations
 */
export async function pushSchema() {
  logger.info("🔄 Pushing schema changes to database...");

  try {
    const { stdout, stderr } = await execAsync("npx drizzle-kit push");
    
    if (stderr && !stderr.includes("warning")) {
      logger.error("Schema push stderr:", stderr);
    }
    
    logger.info("Schema push output:", stdout);
    logger.info("✅ Schema pushed successfully");
    
    return { success: true, output: stdout };
  } catch (error: any) {
    logger.error("❌ Schema push failed:", error);
    throw new Error(`Schema push failed: ${error.message}`);
  }
}

