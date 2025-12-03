import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const needsSSL = databaseUrl.includes("digitalocean.com");
const cleanDatabaseUrl = databaseUrl
  .replace(/[?&]ssl=[^&]*/gi, "")
  .replace(/[?&]ssl-mode=[^&]*/gi, "");

const poolConfig: mysql.PoolOptions = {
  uri: cleanDatabaseUrl,
  waitForConnections: true,
  connectionLimit: 5,
  ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
};

const pool = mysql.createPool(poolConfig);
const db = drizzle(pool, { mode: "default" });

async function test() {
  try {
    const result = await db.execute(sql`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
      LIMIT 5
    `);
    console.log("✅ Drizzle query successful!");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    console.error("❌ Drizzle query failed:");
    console.error("Error:", err.message);
    if (err.stack) {
      console.error("Stack:", err.stack.split("\n").slice(0, 5).join("\n"));
    }
  } finally {
    await pool.end();
  }
}

test();
