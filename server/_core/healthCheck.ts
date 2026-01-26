import { getDb } from "../db";
import { logger } from "./logger";
import { getPoolStats } from "./connectionPool";
import { spawn } from "child_process";
import { getMemoryStats } from "../utils/memoryOptimizer";

// SECURITY: Public-facing health status (minimal info)
export interface PublicHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
}

// SECURITY: Detailed health check for authenticated admin endpoints only
export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  responseTime: number;
  checks: {
    database: {
      status: "ok" | "error";
      latencyMs?: number;
    };
    redis?: {
      status: "ok" | "error" | "disabled";
      latencyMs?: number;
    };
    transaction?: {
      status: "ok" | "error";
      latencyMs?: number;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      percentage: number;
    };
    disk?: {
      status: "ok" | "warning" | "critical";
      usedPercent: number;
    };
    connectionPool?: {
      status: "ok" | "warning";
      freePercent: number;
    };
  };
}

/**
 * SECURITY: Public health check - returns minimal information
 * Safe to expose without authentication
 */
export async function performPublicHealthCheck(): Promise<PublicHealthStatus> {
  const dbCheck = await checkDatabase();
  const memoryCheck = checkMemory();

  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  if (dbCheck.status === "error" || memoryCheck.status === "critical") {
    status = "unhealthy";
  } else if (memoryCheck.status === "warning") {
    status = "degraded";
  }

  return {
    status,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Perform comprehensive health check (for authenticated admin use only)
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  // Run checks in parallel for faster response
  const [dbCheck, transactionCheck, redisCheck, poolCheck, diskCheck] =
    await Promise.all([
      checkDatabase(),
      checkTransaction(),
      checkRedis(),
      Promise.resolve(checkConnectionPool()),
      checkDiskAsync(), // SECURITY: Use async version with timeout
    ]);

  // Memory check (synchronous)
  const memoryCheck = checkMemory();

  // Determine overall status
  let status: "healthy" | "degraded" | "unhealthy" = "healthy";

  if (
    dbCheck.status === "error" ||
    transactionCheck.status === "error" ||
    memoryCheck.status === "critical" ||
    diskCheck?.status === "critical"
  ) {
    status = "unhealthy";
  } else if (
    memoryCheck.status === "warning" ||
    poolCheck?.status === "warning" ||
    diskCheck?.status === "warning" ||
    redisCheck?.status === "error"
  ) {
    status = "degraded";
  }

  const responseTime = Date.now() - startTime;

  // SECURITY: Only log minimal info
  logger.info(
    {
      status,
      responseTime,
    },
    "Health check completed"
  );

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime,
    checks: {
      database: {
        status: dbCheck.status,
        latencyMs: dbCheck.latencyMs,
      },
      transaction: transactionCheck
        ? {
            status: transactionCheck.status,
            latencyMs: transactionCheck.latencyMs,
          }
        : undefined,
      memory: {
        status: memoryCheck.status,
        percentage: memoryCheck.percentage,
      },
      ...(redisCheck && {
        redis: {
          status: redisCheck.status,
          latencyMs: redisCheck.latencyMs,
        },
      }),
      ...(diskCheck && {
        disk: {
          status: diskCheck.status,
          usedPercent: diskCheck.usedPercent,
        },
      }),
      ...(poolCheck && {
        connectionPool: {
          status: poolCheck.status,
          freePercent: poolCheck.freePercent,
        },
      }),
    },
  };
}

/**
 * Check database connectivity and latency
 */
export async function checkDatabase(): Promise<{
  status: "ok" | "error";
  latencyMs?: number;
}> {
  const maxRetries = 2;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const start = Date.now();

      // Add timeout to prevent health check from hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Database health check timeout")),
          5000
        );
      });

      const dbCheckPromise = (async () => {
        const db = await getDb();

        if (!db) {
          throw new Error("Database not available");
        }

        // Simple query to test connectivity
        await db.execute("SELECT 1");

        return {
          status: "ok" as const,
          latencyMs: Date.now() - start,
        };
      })();

      return await Promise.race([dbCheckPromise, timeoutPromise]);
    } catch (_error) {
      logger.warn({
        msg: `Database health check failed (attempt ${retryCount + 1}/${maxRetries})`,
      });
      retryCount++;

      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return { status: "error" };
}

/**
 * Check transaction capability
 */
async function checkTransaction(): Promise<{
  status: "ok" | "error";
  latencyMs?: number;
}> {
  try {
    const start = Date.now();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Transaction health check timeout")),
        3000
      );
    });

    const transactionPromise = (async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      await db.execute("SELECT 1 FOR UPDATE");

      return {
        status: "ok" as const,
        latencyMs: Date.now() - start,
      };
    })();

    return await Promise.race([transactionPromise, timeoutPromise]);
  } catch {
    return { status: "error" };
  }
}

/**
 * Check memory usage - returns minimal info
 * Uses memoryOptimizer which respects NODE_MEMORY_LIMIT for accurate reporting
 */
function checkMemory(): {
  status: "ok" | "warning" | "critical";
  percentage: number;
} {
  // Use memoryOptimizer which properly uses NODE_MEMORY_LIMIT
  // This gives accurate percentages based on configured memory limit
  const stats = getMemoryStats();
  const percentage = Math.round(stats.percentage);

  let status: "ok" | "warning" | "critical" = "ok";

  if (percentage > 90) {
    status = "critical";
  } else if (percentage > 75) {
    status = "warning";
  }

  return { status, percentage };
}

/**
 * Check Redis connectivity (if configured)
 */
async function checkRedis(): Promise<{
  status: "ok" | "error" | "disabled";
  latencyMs?: number;
} | null> {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

  if (!redisUrl) {
    return { status: "disabled" };
  }

  // Redis client not installed - return disabled
  return { status: "disabled" };
}

/**
 * SECURITY: Async disk check with timeout (prevents blocking)
 */
async function checkDiskAsync(): Promise<{
  status: "ok" | "warning" | "critical";
  usedPercent: number;
} | null> {
  return new Promise(resolve => {
    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      resolve(null);
    }, 2000);

    try {
      const dfProcess = spawn("df", ["-BM", "/"], {
        stdio: ["ignore", "pipe", "ignore"],
      });

      let output = "";
      dfProcess.stdout.on("data", data => {
        output += data.toString();
      });

      dfProcess.on("close", code => {
        clearTimeout(timeout);

        if (code !== 0) {
          resolve(null);
          return;
        }

        try {
          const lines = output.trim().split("\n");
          if (lines.length < 2) {
            resolve(null);
            return;
          }

          const parts = lines[1].split(/\s+/);
          const percentStr = parts[4];
          const usedPercent = parseInt(percentStr.replace("%", ""));

          let status: "ok" | "warning" | "critical" = "ok";
          if (usedPercent > 90) {
            status = "critical";
          } else if (usedPercent > 80) {
            status = "warning";
          }

          resolve({ status, usedPercent });
        } catch {
          resolve(null);
        }
      });

      dfProcess.on("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
    } catch {
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * Check connection pool status
 */
function checkConnectionPool(): {
  status: "ok" | "warning";
  freePercent: number;
} | null {
  const stats = getPoolStats();

  if (!stats) {
    return null;
  }

  const freePercentage = Math.round(
    (stats.freeConnections / stats.totalConnections) * 100
  );
  let status: "ok" | "warning" = "ok";

  if (freePercentage < 20 || stats.queuedRequests > 0) {
    status = "warning";
  }

  return { status, freePercent: freePercentage };
}

/**
 * Simple liveness check (always returns OK if server is running)
 */
export function livenessCheck(): { status: "ok"; timestamp: string } {
  return { status: "ok", timestamp: new Date().toISOString() };
}

/**
 * Readiness check (returns OK if server can handle requests)
 * SECURITY: Returns minimal information suitable for public exposure
 */
export async function readinessCheck(): Promise<{
  status: "ok" | "not_ready";
  timestamp: string;
}> {
  const timestamp = new Date().toISOString();

  try {
    const db = await getDb();
    if (!db) {
      return { status: "not_ready", timestamp };
    }

    // Quick DB ping with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), 2000);
    });

    await Promise.race([db.execute("SELECT 1"), timeoutPromise]);

    // Check memory isn't critical (uses NODE_MEMORY_LIMIT for accurate reporting)
    const memStats = getMemoryStats();
    if (memStats.percentage > 95) {
      return { status: "not_ready", timestamp };
    }

    return { status: "ok", timestamp };
  } catch {
    return { status: "not_ready", timestamp };
  }
}

/**
 * SECURITY: Detailed metrics - ONLY for authenticated admin endpoints
 * Contains sensitive information that should not be publicly exposed
 */
export function getHealthMetrics(): {
  uptime: number;
  memory: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  cpu: ReturnType<typeof process.cpuUsage>;
} {
  const memUsage = process.memoryUsage();
  return {
    uptime: process.uptime(),
    memory: {
      heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMb: Math.round(memUsage.rss / 1024 / 1024),
    },
    cpu: process.cpuUsage(),
    // SECURITY: Removed PID and nodeVersion - sensitive info
  };
}
