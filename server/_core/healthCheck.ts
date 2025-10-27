import { getDb } from "../db";
import { logger } from "./logger";
import { getPoolStats } from "./connectionPool";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: "ok" | "error";
      latency?: number;
      error?: string;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      used: number;
      total: number;
      percentage: number;
    };
    connectionPool?: {
      status: "ok" | "warning";
      total: number;
      free: number;
      queued: number;
    };
  };
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  // Database check
  const dbCheck = await checkDatabase();

  // Memory check
  const memoryCheck = checkMemory();

  // Connection pool check
  const poolCheck = checkConnectionPool();

  // Determine overall status
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  if (dbCheck.status === "error" || memoryCheck.status === "critical") {
    status = "unhealthy";
  } else if (memoryCheck.status === "warning" || poolCheck?.status === "warning") {
    status = "degraded";
  }

  const result: HealthCheckResult = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: dbCheck,
      memory: memoryCheck,
      ...(poolCheck && { connectionPool: poolCheck }),
    },
  };

  logger.info({
    msg: "Health check completed",
    status,
    duration: Date.now() - startTime,
  });

  return result;
}

/**
 * Check database connectivity and latency
 */
async function checkDatabase(): Promise<HealthCheckResult["checks"]["database"]> {
  try {
    const start = Date.now();
    const db = await getDb();

    if (!db) {
      return {
        status: "error",
        error: "Database not available",
      };
    }

    // Simple query to test connectivity
    await db.execute("SELECT 1");

    const latency = Date.now() - start;

    return {
      status: "ok",
      latency,
    };
  } catch (error) {
    logger.error({
      msg: "Database health check failed",
      error,
    });

    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheckResult["checks"]["memory"] {
  const usage = process.memoryUsage();
  const totalMemory = usage.heapTotal;
  const usedMemory = usage.heapUsed;
  const percentage = (usedMemory / totalMemory) * 100;

  let status: "ok" | "warning" | "critical" = "ok";

  if (percentage > 90) {
    status = "critical";
  } else if (percentage > 75) {
    status = "warning";
  }

  return {
    status,
    used: usedMemory,
    total: totalMemory,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Check connection pool status
 */
function checkConnectionPool(): HealthCheckResult["checks"]["connectionPool"] | null {
  const stats = getPoolStats();

  if (!stats) {
    return null;
  }

  let status: "ok" | "warning" = "ok";

  // Warn if less than 20% connections are free
  const freePercentage = (stats.freeConnections / stats.totalConnections) * 100;
  if (freePercentage < 20 || stats.queuedRequests > 0) {
    status = "warning";
  }

  return {
    status,
    total: stats.totalConnections,
    free: stats.freeConnections,
    queued: stats.queuedRequests,
  };
}

/**
 * Simple liveness check (always returns OK if server is running)
 */
export function livenessCheck(): { status: "ok" } {
  return { status: "ok" };
}

/**
 * Readiness check (returns OK if server can handle requests)
 */
export async function readinessCheck(): Promise<{ status: "ok" | "not_ready"; reason?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { status: "not_ready", reason: "Database not available" };
    }

    return { status: "ok" };
  } catch (error) {
    return {
      status: "not_ready",
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

