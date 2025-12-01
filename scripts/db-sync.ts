/**
 * Synchronous database instance for seed scripts
 * This bypasses the async getDb() pattern for simpler seed scripts
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";

// Load environment variables (only if not already set - preserves server env vars)
// This allows the script to work both standalone (with .env file) and via API (with server env vars)
if (!process.env.DATABASE_URL) {
  config();
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
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

if (needsSSL) {
  poolConfig.ssl = {
    rejectUnauthorized: false // DigitalOcean managed DB uses valid certs but sandbox can't verify
  };
}

const pool = mysql.createPool(poolConfig);

// Create drizzle instance with schema (same syntax as server/db.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = drizzle(pool as any, { schema, mode: "default" });
