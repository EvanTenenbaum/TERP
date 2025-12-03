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

console.log("🔍 Testing database connection...");
console.log("   URL length:", databaseUrl.length);
console.log("   URL preview:", databaseUrl.substring(0, 30) + "...");

const needsSSL =
  databaseUrl.includes("digitalocean.com") ||
  databaseUrl.includes("ssl=") ||
  databaseUrl.includes("ssl-mode=REQUIRED");

const cleanDatabaseUrl = databaseUrl
  .replace(/[?&]ssl=[^&]*/gi, "")
  .replace(/[?&]ssl-mode=[^&]*/gi, "");

const poolConfig: mysql.PoolOptions = {
  uri: cleanDatabaseUrl,
  waitForConnections: true,
  connectionLimit: 1,
  connectTimeout: 10000,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
};

async function test() {
  try {
    const pool = mysql.createPool(poolConfig);
    const connection = await pool.getConnection();
    console.log("✅ Connection successful!");
    const [rows] = await connection.query("SELECT DATABASE() as db");
    console.log("   Database:", (rows as Array<{ db: string }>)[0]?.db);
    connection.release();
    await pool.end();
    process.exit(0);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error("❌ Connection failed:");
    console.error("   Error:", err.message || "Unknown error");
    console.error("   Code:", err.code || "Unknown");
    if (err.code === "ETIMEDOUT") {
      console.error("\n💡 Possible causes:");
      console.error("   - Network/firewall blocking connection");
      console.error("   - Database requires trusted sources (DigitalOcean restriction)");
      console.error("   - Database is paused or unavailable");
      console.error("   - This environment may not be in the trusted sources list");
    }
    process.exit(1);
  }
}

test();
