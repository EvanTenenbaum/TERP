/* global NodeJS */

import mysql from "mysql2/promise";
import { logger } from "./logger";

/**
 * Type for mysql2 TypeCast field parameter
 * mysql2's Field type for typeCast callback
 */
interface TypeCastFieldParam {
  type: string | number;
  name: string;
  string: () => string | null;
}

/**
 * Internal pool properties interface for statistics
 * These are undocumented mysql2 internal properties for pool monitoring
 */
interface PoolInternals {
  _allConnections?: { length: number };
  _freeConnections?: { length: number };
  _connectionQueue?: { length: number };
}

/**
 * MySQL Connection Pool Configuration
 *
 * Provides connection pooling for better performance and scalability.
 * Reuses database connections instead of creating new ones for each query.
 */

let pool: mysql.Pool | null = null;
let statsInterval: NodeJS.Timeout | null = null;

export interface PoolConfig {
  connectionLimit?: number;
  queueLimit?: number;
  waitForConnections?: boolean;
  enableKeepAlive?: boolean;
  keepAliveInitialDelay?: number;
}

/**
 * Get or create the connection pool
 */
export function getConnectionPool(config?: PoolConfig): mysql.Pool {
  // Return cached pool if it exists (even if DATABASE_URL is not available at runtime)
  if (pool) {
    return pool;
  }

  // Only check DATABASE_URL when creating a NEW pool
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const errorMsg =
      "DATABASE_URL environment variable is required to create connection pool";
    logger.error({ msg: errorMsg });
    throw new Error(errorMsg);
  }

  // Validate DATABASE_URL format
  if (!databaseUrl.startsWith("mysql://")) {
    const errorMsg = `Invalid DATABASE_URL format. Expected mysql://, got: ${databaseUrl.substring(0, 10)}...`;
    logger.error({ msg: errorMsg });
    throw new Error(errorMsg);
  }

  logger.info({
    msg: "DATABASE_URL found",
    length: databaseUrl.length,
    protocol: databaseUrl.split("://")[0],
    hasSSLParam:
      databaseUrl.includes("ssl-mode") || databaseUrl.includes("sslmode"),
  });

  // REL-004: Increased pool size for production load
  const defaultConfig: PoolConfig = {
    connectionLimit: 25, // Maximum number of connections in pool (increased for production load)
    queueLimit: 100, // Bounded queue to prevent unbounded memory growth
    waitForConnections: true, // Wait for available connection
    enableKeepAlive: true, // Keep connections alive
    keepAliveInitialDelay: 0, // Start keep-alive immediately
  };

  const poolConfig = { ...defaultConfig, ...config };

  // Parse SSL configuration from DATABASE_URL
  // mysql2 doesn't recognize 'ssl-mode=REQUIRED', needs explicit ssl object
  const needsSSL =
    databaseUrl.includes("ssl-mode=REQUIRED") ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("ssl=true");

  // Remove ssl-mode parameter from URL as mysql2 doesn't recognize it
  const cleanDatabaseUrl = databaseUrl
    .replace(/[?&]ssl-mode=[^&]*/gi, "")
    .replace(/[?&]sslmode=[^&]*/gi, "");

  const sslConfig = needsSSL
    ? {
        ssl: {
          rejectUnauthorized: false, // DigitalOcean managed DB uses valid certs
        },
      }
    : {};

  logger.info({
    msg: "Creating MySQL connection pool",
    config: { ...poolConfig, ssl: needsSSL },
  });

  pool = mysql.createPool({
    uri: cleanDatabaseUrl,
    ...poolConfig,
    ...sslConfig,
    // FIX-006: TiDB ENUM compatibility fix
    // TiDB returns ENUM columns with type code 0xf7 (247) in binary protocol
    // instead of STRING type with ENUM flag like MySQL does.
    // This causes "Unknown type '247'" errors in mysql2 driver.
    // The typeCast function intercepts ENUM fields and returns them as strings.
    // See: https://github.com/pingcap/tidb/issues/6910
    typeCast: function (
      field: TypeCastFieldParam,
      next: () => unknown
    ): unknown {
      // FIX-006: TiDB ENUM compatibility fix with diagnostic logging
      // ENUM type code is 247 (0xf7) in TiDB binary protocol
      if (field.type === "ENUM" || field.type === 247) {
        logger.debug({
          msg: "[TYPECAST] Processing ENUM field",
          fieldName: field.name,
          fieldType: field.type,
        });
        const value = field.string();
        return value;
      }
      // SET type also has similar issues (type code 248)
      if (field.type === "SET" || field.type === 248) {
        logger.debug({
          msg: "[TYPECAST] Processing SET field",
          fieldName: field.name,
          fieldType: field.type,
        });
        const value = field.string();
        return value;
      }
      return next();
    } as mysql.TypeCast,
  });

  // Handle pool errors
  pool.on("connection", connection => {
    logger.info({ msg: "New MySQL connection established" });
    connection.on("error", err => {
      logger.error({
        msg: "MySQL connection error",
        error: err,
      });
    });
  });

  // CRITICAL: Health check - Force immediate connection to verify pool works
  // This will crash the app at startup if DB is unreachable, rather than failing silently
  // Skip health check in test environments (VITEST) to avoid CRITICAL error noise
  const vitestValue = (process.env.VITEST || "").toLowerCase();
  const isTestEnv =
    ["true", "1", "yes"].includes(vitestValue) ||
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true";

  if (!isTestEnv) {
    pool
      .getConnection()
      .then(async connection => {
        logger.info({ msg: "✅ Database health check: Connection successful" });
        try {
          const [rows] = await connection.query("SELECT 1 as health_check");
          logger.info({
            msg: "✅ Database health check: Query successful",
            result: rows,
          });
        } catch (queryErr) {
          logger.error({
            msg: "❌ Database health check: Query failed",
            error: queryErr,
          });
        } finally {
          connection.release();
          logger.info({ msg: "Health check connection released back to pool" });
        }
      })
      .catch(err => {
        logger.error({
          msg: "❌ CRITICAL: Database health check failed - Cannot establish connection",
          error: err,
          databaseUrl: cleanDatabaseUrl.replace(/:[^:@]+@/, ":****@"), // Mask password
          sslEnabled: needsSSL,
        });
        // Don't throw here - let the app start but log the critical error
        // The app will fail on first query attempt with better error context
      });
  } else {
    logger.debug({ msg: "Skipping database health check in test environment" });
  }

  // Log pool statistics periodically (every 5 minutes)
  // REL-003: Store interval reference for cleanup on pool close
  statsInterval = setInterval(
    () => {
      if (pool) {
        const poolInternals = pool as unknown as PoolInternals;
        logger.info({
          msg: "Connection pool statistics",
          stats: {
            totalConnections: poolInternals._allConnections?.length || 0,
            freeConnections: poolInternals._freeConnections?.length || 0,
            queuedRequests: poolInternals._connectionQueue?.length || 0,
          },
        });
      }
    },
    5 * 60 * 1000
  );

  return pool;
}

/**
 * Close the connection pool gracefully
 */
export async function closeConnectionPool(): Promise<void> {
  // REL-003: Clear the stats interval to prevent memory leak
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
    logger.info({ msg: "Stats interval cleared" });
  }

  if (pool) {
    logger.info({ msg: "Closing MySQL connection pool" });
    await pool.end();
    pool = null;
    logger.info({ msg: "MySQL connection pool closed" });
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  if (!pool) {
    return null;
  }

  const poolInternals = pool as unknown as PoolInternals;
  return {
    totalConnections: poolInternals._allConnections?.length || 0,
    freeConnections: poolInternals._freeConnections?.length || 0,
    queuedRequests: poolInternals._connectionQueue?.length || 0,
  };
}
