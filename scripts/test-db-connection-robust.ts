/**
 * Robust Database Connection Test
 * Tests connection with improved timeout and retry logic
 */

import { config } from "dotenv";
import mysql from "mysql2/promise";

config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

console.log("🔍 Testing database connection with improved settings...");
console.log("   URL length:", databaseUrl.length);
console.log("   URL preview:", databaseUrl.substring(0, 30) + "...");

const needsSSL =
  databaseUrl.includes("digitalocean.com") ||
  databaseUrl.includes("ssl=") ||
  databaseUrl.includes("ssl-mode=REQUIRED");

const cleanDatabaseUrl = databaseUrl
  .replace(/[?&]ssl=[^&]*/gi, "")
  .replace(/[?&]ssl-mode=[^&]*/gi, "");

// Improved pool configuration
const poolConfig: mysql.PoolOptions = {
  uri: cleanDatabaseUrl,
  waitForConnections: true,
  connectionLimit: 3,
  maxIdle: 2,
  idleTimeout: 30000,
  queueLimit: 0,
  connectTimeout: 30000, // 30 seconds
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
};

async function testWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n📡 Attempt ${attempt}/${maxRetries}...`);
    
    try {
      const pool = mysql.createPool(poolConfig);
      
      // Test connection
      const connection = await Promise.race([
        pool.getConnection(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Connection timeout after 30s")), 30000)
        )
      ]);
      
      console.log("✅ Connection successful!");
      
      // Test query
      const [rows] = await connection.query("SELECT DATABASE() as db, NOW() as time");
      const result = rows as Array<{ db: string; time: Date }>;
      console.log("   Database:", result[0]?.db);
      console.log("   Server time:", result[0]?.time);
      
      // Test a simple query
      const [countRows] = await connection.query("SELECT COUNT(*) as count FROM users");
      const count = (countRows as Array<{ count: number }>)[0]?.count;
      console.log("   Users table count:", count);
      
      connection.release();
      await pool.end();
      
      console.log("\n✅ All tests passed!");
      process.exit(0);
      
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; errno?: number };
      console.error(`❌ Attempt ${attempt} failed:`);
      console.error("   Error:", err.message || "Unknown error");
      console.error("   Code:", err.code || "Unknown");
      console.error("   Errno:", err.errno || "Unknown");
      
      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("\n💡 Troubleshooting:");
        console.error("   1. Check firewall rules: doctl databases firewalls list <DB_ID>");
        console.error("   2. Verify IP is in trusted sources");
        console.error("   3. Check database status: doctl databases list");
        console.error("   4. Verify DATABASE_URL is correct");
        process.exit(1);
      }
    }
  }
}

testWithRetry();
