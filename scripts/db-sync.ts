/**
 * Synchronous database instance for seed scripts
 * This bypasses the async getDb() pattern for simpler seed scripts
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";

// Load environment variables (only if not already set - preserves server env vars)
// This allows the script to work both standalone (with .env file) and via API (with server env vars)
if (!process.env.DATABASE_URL) {
  config();
  // Also try .env.production if DATABASE_URL still not set
  if (!process.env.DATABASE_URL) {
    config({ path: ".env.production" });
  }
}

// Create connection pool with SSL configuration
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Parse SSL configuration - DigitalOcean requires SSL but with rejectUnauthorized: false
const needsSSL = databaseUrl.includes('digitalocean.com') || 
                 databaseUrl.includes('ssl=') ||
                 databaseUrl.includes('ssl-mode=REQUIRED') || 
                 databaseUrl.includes('sslmode=require');

// Clean URL - remove ssl parameter as we'll add it explicitly
const cleanDatabaseUrl = databaseUrl.replace(/[?&]ssl=[^&]*/gi, '').replace(/[?&]ssl-mode=[^&]*/gi, '').replace(/[?&]sslmode=[^&]*/gi, '');

const poolConfig: any = {
  uri: cleanDatabaseUrl,
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 2,
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 30000, // 30 second connection timeout
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

if (needsSSL) {
  poolConfig.ssl = {
    rejectUnauthorized: false // DigitalOcean managed DB uses valid certs but sandbox can't verify
  };
}

// Create pool with better error handling
let pool: mysql.Pool | null = null;

function createPool(): mysql.Pool {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool(poolConfig);

  // Add connection error handling
  pool.on("connection", (connection) => {
    connection.on("error", () => {
      // Connection error - pool will handle reconnection
    });
  });

  pool.on("error", () => {
    // Reset pool on error to force recreation
    pool = null;
  });

  return pool;
}

// Initialize pool
const poolInstance = createPool();

// Create drizzle instance with schema (same syntax as server/db.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = drizzle(poolInstance as any, { schema, mode: "default" });

/**
 * Test database connection with retry logic
 */
export async function testConnection(maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.execute(sql`SELECT 1 as test`);
      return true;
    } catch {
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}
