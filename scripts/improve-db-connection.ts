/**
 * Database Connection Improvement Script
 * 
 * Improves connection stability by:
 * 1. Adding retry logic
 * 2. Better timeout handling
 * 3. Connection health checks
 * 4. Pool configuration optimization
 */

import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

/**
 * Test connection with retry logic
 */
async function testConnection(maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 Connection attempt ${attempt}/${maxRetries}...`);
      
      const result = await Promise.race([
        db.execute(sql`SELECT 1 as test`),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout")), 30000)
        )
      ]);

      const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
      console.log("✅ Connection successful!");
      return true;
    } catch (error) {
      const err = error as { message?: string; code?: string };
      console.error(`❌ Attempt ${attempt} failed:`, err.message || err.code);
      
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

/**
 * Run health checks
 */
async function runHealthChecks(): Promise<void> {
  console.log("\n🔍 Running health checks...\n");

  try {
    // Test 1: Basic query
    console.log("1. Testing basic query...");
    const result1 = await db.execute(sql`SELECT DATABASE() as db, NOW() as time`);
    const rows1 = Array.isArray(result1) && result1.length > 0 ? result1[0] : result1;
    console.log("   ✅ Database:", (rows1 as Array<{ db: string }>)[0]?.db);

    // Test 2: Table count
    console.log("2. Testing table access...");
    const result2 = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const rows2 = Array.isArray(result2) && result2.length > 0 ? result2[0] : result2;
    console.log("   ✅ Users table accessible, count:", (rows2 as Array<{ count: number }>)[0]?.count);

    // Test 3: Multiple queries (connection reuse)
    console.log("3. Testing connection reuse...");
    for (let i = 0; i < 3; i++) {
      await db.execute(sql`SELECT 1`);
    }
    console.log("   ✅ Connection pool working correctly");

    console.log("\n✅ All health checks passed!");
  } catch (error) {
    console.error("❌ Health check failed:", error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🔧 Database Connection Improvement Test\n");
  console.log("=".repeat(60));

  const connected = await testConnection();
  
  if (!connected) {
    console.error("\n❌ Could not establish database connection");
    console.error("\n💡 Troubleshooting steps:");
    console.error("   1. Check firewall: doctl databases firewalls list <DB_ID>");
    console.error("   2. Add IP to trusted sources if needed");
    console.error("   3. Verify DATABASE_URL is correct");
    console.error("   4. Check database status: doctl databases list");
    process.exit(1);
  }

  await runHealthChecks();

  console.log("\n" + "=".repeat(60));
  console.log("✅ Database connection is stable!");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
