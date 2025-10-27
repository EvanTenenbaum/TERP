import mysql from "mysql2/promise";
import { logger } from "./logger";

/**
 * MySQL Connection Pool Configuration
 * 
 * Provides connection pooling for better performance and scalability.
 * Reuses database connections instead of creating new ones for each query.
 */

let pool: mysql.Pool | null = null;

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
  if (pool) {
    return pool;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const defaultConfig: PoolConfig = {
    connectionLimit: 10, // Maximum number of connections in pool
    queueLimit: 0, // Unlimited queue
    waitForConnections: true, // Wait for available connection
    enableKeepAlive: true, // Keep connections alive
    keepAliveInitialDelay: 0, // Start keep-alive immediately
  };

  const poolConfig = { ...defaultConfig, ...config };

  logger.info({
    msg: "Creating MySQL connection pool",
    config: poolConfig,
  });

  pool = mysql.createPool({
    uri: databaseUrl,
    ...poolConfig,
  });

  // Handle pool errors
  pool.on("connection", (connection) => {
    connection.on("error", (err) => {
      logger.error({
        msg: "MySQL connection error",
        error: err,
      });
    });
  });

  // Log pool statistics periodically (every 5 minutes)
  setInterval(() => {
    if (pool) {
      logger.info({
        msg: "Connection pool statistics",
        stats: {
          totalConnections: (pool as any)._allConnections?.length || 0,
          freeConnections: (pool as any)._freeConnections?.length || 0,
          queuedRequests: (pool as any)._connectionQueue?.length || 0,
        },
      });
    }
  }, 5 * 60 * 1000);

  return pool;
}

/**
 * Close the connection pool gracefully
 */
export async function closeConnectionPool(): Promise<void> {
  if (pool) {
    logger.info("Closing MySQL connection pool");
    await pool.end();
    pool = null;
    logger.info("MySQL connection pool closed");
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  if (!pool) {
    return null;
  }

  return {
    totalConnections: (pool as any)._allConnections?.length || 0,
    freeConnections: (pool as any)._freeConnections?.length || 0,
    queuedRequests: (pool as any)._connectionQueue?.length || 0,
  };
}

