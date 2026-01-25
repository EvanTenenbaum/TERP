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
let cleanDatabaseUrl = databaseUrl
  .replace(/[?&]ssl=[^&]*/gi, '')
  .replace(/[?&]ssl-mode=[^&]*/gi, '')
  .replace(/[?&]sslmode=[^&]*/gi, '');

// Fix orphaned & at start of query string (happens when ssl was the first param)
// e.g., "mysql://host/db&foo=bar" -> "mysql://host/db?foo=bar"
if (!cleanDatabaseUrl.includes('?') && cleanDatabaseUrl.includes('&')) {
  cleanDatabaseUrl = cleanDatabaseUrl.replace('&', '?');
}
// Also fix ?& pattern (happens when first param was removed but others followed)
cleanDatabaseUrl = cleanDatabaseUrl.replace(/\?&/, '?');

interface PoolConfig {
  uri: string;
  waitForConnections: boolean;
  connectionLimit: number;
  maxIdle: number;
  idleTimeout: number;
  queueLimit: number;
  connectTimeout: number;
  enableKeepAlive: boolean;
  keepAliveInitialDelay: number;
  ssl?: { rejectUnauthorized: boolean };
}

const poolConfig: PoolConfig = {
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

  // Add connection error handling with detailed logging
  pool.on("connection", (connection) => {
    connection.on("error", (err: Error & { code?: string }) => {
      console.error("[db-sync] Connection error:", formatConnectionError(err));
    });
  });

  // Note: Pool-level error handling removed as mysql2 Pool type doesn't support it
  // The pool will handle errors internally

  return pool;
}

/**
 * Format connection error with actionable message
 */
function formatConnectionError(error: Error & { code?: string; errno?: number; sqlState?: string }): string {
  const code = error.code || "UNKNOWN";
  const baseMessage = error.message || "Unknown error";

  switch (code) {
    case "ECONNREFUSED":
      return `Connection refused (${code}). Is MySQL running? Check that the database server is started and accepting connections. Original: ${baseMessage}`;

    case "ER_ACCESS_DENIED_ERROR":
      return `Access denied (${code}). Check DATABASE_URL credentials (username/password). Original: ${baseMessage}`;

    case "ER_DBACCESS_DENIED_ERROR":
      return `Database access denied (${code}). User lacks permission to access this database. Original: ${baseMessage}`;

    case "ER_BAD_DB_ERROR":
      return `Database not found (${code}). The specified database does not exist. Create it first or check DATABASE_URL. Original: ${baseMessage}`;

    case "ENOTFOUND":
      return `Host not found (${code}). Check DATABASE_URL hostname - DNS lookup failed. Original: ${baseMessage}`;

    case "ETIMEDOUT":
      return `Connection timed out (${code}). Database server may be unreachable or blocked by firewall. Original: ${baseMessage}`;

    case "ECONNRESET":
      return `Connection reset (${code}). Database server closed the connection unexpectedly. Original: ${baseMessage}`;

    case "PROTOCOL_CONNECTION_LOST":
      return `Connection lost (${code}). Database server terminated the connection. Original: ${baseMessage}`;

    case "ER_CON_COUNT_ERROR":
      return `Too many connections (${code}). Database has reached max_connections limit. Original: ${baseMessage}`;

    case "CERT_HAS_EXPIRED":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return `SSL/TLS certificate error (${code}). Check SSL configuration in DATABASE_URL. Original: ${baseMessage}`;

    default:
      return `Database error (${code}): ${baseMessage}`;
  }
}

// Initialize pool
const poolInstance = createPool();

// Create drizzle instance with schema (same syntax as server/db.ts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = drizzle(poolInstance as any, { schema, mode: "default" });

/**
 * Test database connection with retry logic and detailed error reporting
 * @param maxRetries - Number of connection attempts (default: 3)
 * @returns true if connection successful, false otherwise
 */
export async function testConnection(maxRetries = 3): Promise<boolean> {
  let lastError: Error & { code?: string } | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.execute(sql`SELECT 1 as test`);
      return true;
    } catch (error) {
      lastError = error as Error & { code?: string };
      const errorMessage = formatConnectionError(lastError);

      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.warn(
          `[db-sync] Connection attempt ${attempt}/${maxRetries} failed: ${errorMessage}`
        );
        console.info(`[db-sync] Retrying in ${delay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `[db-sync] All ${maxRetries} connection attempts failed. Last error: ${errorMessage}`
        );
      }
    }
  }
  return false;
}

/**
 * Close the database connection pool
 * Should be called when seeding is complete to allow the process to exit cleanly
 */
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      pool = null;
      console.info("[db-sync] Database connection pool closed");
    } catch (error) {
      const err = error as Error & { code?: string };
      console.error("[db-sync] Error closing pool:", formatConnectionError(err));
      throw error;
    }
  }
}
