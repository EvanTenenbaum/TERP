import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Push schema changes to database using drizzle-kit
 * This syncs the database schema with the code without using migrations
 */
export async function pushSchema() {
  console.log("🔄 Pushing schema changes to database...");

  try {
    const { stdout, stderr } = await execAsync("npx drizzle-kit push");
    
    if (stderr && !stderr.includes("warning")) {
      console.error("Schema push stderr:", stderr);
    }
    
    console.log("Schema push output:", stdout);
    console.log("✅ Schema pushed successfully");
    
    return { success: true, output: stdout };
  } catch (error) {
    console.error("❌ Schema push failed:", error);
    throw new Error(`Schema push failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

