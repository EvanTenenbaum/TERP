import { getDb } from "../db";
import { logger } from "./logger";
import { getPoolStats } from "./connectionPool";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  responseTime: number;
  checks: {
    database: {
      status: "ok" | "error";
      latency?: number;
      latencyMs?: number;
      error?: string;
    };
    redis?: {
      status: "ok" | "error" | "disabled";
      latency?: number;
      latencyMs?: number;
      error?: string;
    };
    transaction?: {
      status: "ok" | "error";
      latency?: number;
      error?: string;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      used: number;
      total: number;
      usedMb: number;
      totalMb: number;
      percentage: number;
      rss: number;
      external: number;
    };
    disk?: {
      status: "ok" | "warning" | "critical";
      usedPercent: number;
      availableMb: number;
      totalMb: number;
      error?: string;
    };
    connectionPool?: {
      status: "ok" | "warning";
      total: number;
      free: number;
      queued: number;
    };
    externalServices?: {
      sentry: { status: "ok" | "error" | "disabled"; error?: string };
    };
  };
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  // Run checks in parallel for faster response
  const [dbCheck, transactionCheck, redisCheck, poolCheck, diskCheck, externalCheck] =
    await Promise.all([
      checkDatabase(),
      checkTransaction(),
      checkRedis(),
      Promise.resolve(checkConnectionPool()),
      checkDisk(),
      checkExternalServices(),
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
    redisCheck?.status === "error" ||
    externalCheck.sentry.status === "error"
  ) {
    status = "degraded";
  }

  const responseTime = Date.now() - startTime;

  const result: HealthCheckResult = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "unknown",
    environment: process.env.NODE_ENV || "development",
    responseTime,
    checks: {
      database: dbCheck,
      transaction: transactionCheck,
      memory: memoryCheck,
      ...(redisCheck && { redis: redisCheck }),
      ...(diskCheck && { disk: diskCheck }),
      ...(poolCheck && { connectionPool: poolCheck }),
      externalServices: externalCheck,
    },
  };

  logger.info(
    {
      status,
      responseTime,
      dbLatency: dbCheck.latency,
      memoryPct: memoryCheck.percentage,
    },
    "Health check completed"
  );

  return result;
}

/**
 * Check database connectivity and latency
 */
export async function checkDatabase(): Promise<
  HealthCheckResult["checks"]["database"]
> {
  const maxRetries = 2;  // Reduced for faster deployment
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

        const latency = Date.now() - start;

        return {
          status: "ok" as const,
          latency,
          latencyMs: latency,
        };
      })();

      return await Promise.race([dbCheckPromise, timeoutPromise]);
    } catch (error) {
      logger.warn({
        msg: `Database health check failed (attempt ${retryCount + 1}/${maxRetries})`,
        error,
      });
      retryCount++;

      if (retryCount < maxRetries) {
        // Reduced backoff: 1s, 2s
        const delay = Math.pow(2, retryCount) * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  return {
    status: "error",
    error: "Database not available after multiple retries",
  };
}

/**
 * Check transaction capability (verifies DB can execute transactions)
 */
async function checkTransaction(): Promise<
  NonNullable<HealthCheckResult["checks"]["transaction"]>
> {
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
        throw new Error("Database not available for transaction check");
      }

      // Execute a simple transaction to verify capability
      // Using a read-only transaction pattern
      await db.execute("SELECT 1 FOR UPDATE");

      return {
        status: "ok" as const,
        latency: Date.now() - start,
      };
    })();

    return await Promise.race([transactionPromise, timeoutPromise]);
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Transaction check failed",
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
    usedMb: Math.round(usedMemory / 1024 / 1024),
    totalMb: Math.round(totalMemory / 1024 / 1024),
    percentage: Math.round(percentage * 100) / 100,
    rss: usage.rss,
    external: usage.external,
  };
}

/**
 * Check Redis connectivity (if Redis is configured)
 */
async function checkRedis(): Promise<
  HealthCheckResult["checks"]["redis"] | null
> {
  // Check if Redis is configured in environment
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

  if (!redisUrl) {
    return { status: "disabled" };
  }

  try {
    const start = Date.now();

    // Redis client is not installed - return disabled
    // When redis package is installed, uncomment below and implement actual ping
    // const client = createClient({ url: redisUrl });
    // await client.connect();
    // await client.ping();
    // await client.disconnect();

    // For now, just indicate Redis is configured but client not available
    const latency = Date.now() - start;
    return {
      status: "disabled" as const,
      latencyMs: latency,
    };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Redis check failed",
    };
  }
}

/**
 * Check disk usage (Linux/Unix only)
 */
async function checkDisk(): Promise<
  HealthCheckResult["checks"]["disk"] | null
> {
  try {
    const { execSync } = await import('child_process');

    // Use df to check disk usage of root filesystem
    const output = execSync("df -BM / | tail -1 | awk '{print $2,$3,$5}'")
      .toString()
      .trim();

    const [totalStr, usedStr, percentStr] = output.split(' ');

    // Parse values (remove 'M' suffix and '%' from percentage)
    const totalMb = parseInt(totalStr.replace('M', ''));
    const usedMb = parseInt(usedStr.replace('M', ''));
    const usedPercent = parseInt(percentStr.replace('%', ''));
    const availableMb = totalMb - usedMb;

    let status: "ok" | "warning" | "critical" = "ok";

    if (usedPercent > 90) {
      status = "critical";
    } else if (usedPercent > 80) {
      status = "warning";
    }

    return {
      status,
      usedPercent,
      availableMb,
      totalMb,
    };
  } catch (error) {
    // Disk check not available on this platform or df command failed
    return {
      status: "ok",
      usedPercent: 0,
      availableMb: 0,
      totalMb: 0,
      error: "Disk check not available",
    };
  }
}

/**
 * Check connection pool status
 */
function checkConnectionPool():
  | HealthCheckResult["checks"]["connectionPool"]
  | null {
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
 * Check external services (Sentry, etc.)
 */
async function checkExternalServices(): Promise<
  NonNullable<HealthCheckResult["checks"]["externalServices"]>
> {
  const result: NonNullable<HealthCheckResult["checks"]["externalServices"]> = {
    sentry: { status: "disabled" },
  };

  // Check Sentry
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    try {
      // Sentry is configured - check if it's initialized
      // We can't easily ping Sentry, so we just verify config exists
      result.sentry = { status: "ok" };
    } catch (error) {
      result.sentry = {
        status: "error",
        error: error instanceof Error ? error.message : "Sentry check failed",
      };
    }
  }

  return result;
}

/**
 * Simple liveness check (always returns OK if server is running)
 */
export function livenessCheck(): { status: "ok"; timestamp: string } {
  return { status: "ok", timestamp: new Date().toISOString() };
}

/**
 * Readiness check (returns OK if server can handle requests)
 */
export async function readinessCheck(): Promise<{
  status: "ok" | "not_ready";
  timestamp: string;
  reason?: string;
  checks?: {
    database: boolean;
    memory: boolean;
  };
}> {
  const timestamp = new Date().toISOString();

  try {
    // Check database
    const db = await getDb();
    if (!db) {
      return {
        status: "not_ready",
        timestamp,
        reason: "Database not available",
        checks: { database: false, memory: true },
      };
    }

    // Quick DB ping
    await db.execute("SELECT 1");

    // Check memory isn't critical
    const memUsage = process.memoryUsage();
    const memPct = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (memPct > 95) {
      return {
        status: "not_ready",
        timestamp,
        reason: "Memory usage critical",
        checks: { database: true, memory: false },
      };
    }

    return {
      status: "ok",
      timestamp,
      checks: { database: true, memory: true },
    };
  } catch (error) {
    return {
      status: "not_ready",
      timestamp,
      reason: error instanceof Error ? error.message : "Unknown error",
      checks: { database: false, memory: true },
    };
  }
}

/**
 * Get health metrics for monitoring systems
 */
export function getHealthMetrics(): {
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  cpu: NodeJS.CpuUsage;
  pid: number;
  nodeVersion: string;
} {
  const memUsage = process.memoryUsage();
  return {
    uptime: process.uptime(),
    memory: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external,
    },
    cpu: process.cpuUsage(),
    pid: process.pid,
    nodeVersion: process.version,
  };
}
