/**
 * Memory Optimizer Utility
 *
 * Provides memory monitoring and optimization functions to prevent memory leaks
 * and reduce memory pressure in production.
 *
 * FIX: Updated to use dynamic memory limits based on environment variables
 * instead of hardcoded values that don't match actual infrastructure.
 */

import { logger } from "../_core/logger";
import cache from "../_core/cache";

interface MemoryStats {
  used: number;
  total: number;
  percentage: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

/**
 * Get the configured memory limit for the application.
 * Uses NODE_MEMORY_LIMIT env var if set, otherwise uses actual heap total.
 *
 * For DigitalOcean App Platform:
 * - basic-xs (512MB): Set NODE_MEMORY_LIMIT=384000000 (384MB)
 * - basic-s (1GB): Set NODE_MEMORY_LIMIT=768000000 (768MB)
 * - basic-m (2GB): Set NODE_MEMORY_LIMIT=1536000000 (1.5GB)
 */
function getMemoryLimit(): number {
  // Check for explicit memory limit from environment
  if (process.env.NODE_MEMORY_LIMIT) {
    const limit = parseInt(process.env.NODE_MEMORY_LIMIT, 10);
    if (!isNaN(limit) && limit > 0) {
      return limit;
    }
  }

  // Fallback: use actual heap total (more accurate than hardcoded value)
  const memUsage = process.memoryUsage();
  return memUsage.heapTotal;
}

/**
 * Get current memory statistics
 */
export function getMemoryStats(): MemoryStats {
  const memUsage = process.memoryUsage();
  const totalMemory = getMemoryLimit();

  return {
    used: memUsage.rss,
    total: totalMemory,
    percentage: (memUsage.heapUsed / totalMemory) * 100,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external,
    rss: memUsage.rss,
  };
}

/**
 * Check if memory usage is critical
 */
export function isMemoryCritical(threshold: number = 90): boolean {
  const stats = getMemoryStats();
  return stats.percentage >= threshold;
}

/**
 * Force garbage collection if available
 */
export function forceGarbageCollection(): boolean {
  if (global.gc) {
    global.gc();
    logger.info({ msg: "Forced garbage collection" });
    return true;
  }
  return false;
}

/**
 * Optimize array operations to prevent memory accumulation
 */
export function optimizeArrayOperation<T>(
  array: T[],
  operation: (item: T) => unknown,
  batchSize: number = 100
): unknown[] {
  const results: unknown[] = [];

  // Process in batches to prevent memory spikes
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    const batchResults = batch.map(operation);
    results.push(...batchResults);

    // Force GC every 10 batches if memory is high
    if (i % (batchSize * 10) === 0 && isMemoryCritical(85)) {
      forceGarbageCollection();
    }
  }

  return results;
}

/**
 * Memory-safe array filtering
 */
export function memoryFilter<T>(
  array: T[],
  predicate: (item: T) => boolean,
  batchSize: number = 100
): T[] {
  const results: T[] = [];

  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    const filtered = batch.filter(predicate);
    results.push(...filtered);

    // Check memory pressure
    if (i % (batchSize * 10) === 0 && isMemoryCritical(85)) {
      forceGarbageCollection();
    }
  }

  return results;
}

/**
 * Memory-safe array reduction
 */
export function memoryReduce<T, R>(
  array: T[],
  reducer: (acc: R, item: T) => R,
  initialValue: R,
  batchSize: number = 100
): R {
  let accumulator = initialValue;

  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    accumulator = batch.reduce(reducer, accumulator);

    // Check memory pressure
    if (i % (batchSize * 10) === 0 && isMemoryCritical(85)) {
      forceGarbageCollection();
    }
  }

  return accumulator;
}

/**
 * Monitor memory usage and log warnings
 */
export function startMemoryMonitoring(
  intervalMs: number = 30000
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    const stats = getMemoryStats();

    if (stats.percentage >= 95) {
      logger.error({
        msg: "CRITICAL: Memory usage extremely high",
        memoryStats: stats,
      });
      forceGarbageCollection();
    } else if (stats.percentage >= 90) {
      logger.warn({
        msg: "WARNING: Memory usage high",
        memoryStats: stats,
      });
    } else if (stats.percentage >= 80) {
      logger.info({
        msg: "Memory usage elevated",
        memoryStats: stats,
      });
    }
  }, intervalMs);
}

/**
 * Emergency memory cleanup
 */
export function emergencyMemoryCleanup(): void {
  logger.warn({ msg: "Performing emergency memory cleanup" });

  // Force multiple GC cycles
  for (let i = 0; i < 3; i++) {
    if (global.gc) {
      global.gc();
    }
  }

  // Clear the main application cache
  try {
    cache.clear();
    logger.info({ msg: "Application cache cleared" });
  } catch (error) {
    logger.error({ msg: "Error clearing application cache", error });
  }

  // Clear any global caches if they exist
  try {
    // Clear strain service cache
    const strainModule = require("../services/strainService");
    if (
      strainModule?.strainService &&
      typeof strainModule.strainService.clearCache === "function"
    ) {
      strainModule.strainService.clearCache();
    }

    // Clear permission cache
    const permModule = require("../services/permissionService");
    if (
      permModule?.clearPermissionCache &&
      typeof permModule.clearPermissionCache === "function"
    ) {
      permModule.clearPermissionCache();
    }
  } catch (error) {
    logger.error({ msg: "Error during cache cleanup", error });
  }

  const statsAfter = getMemoryStats();
  logger.info({
    msg: "Emergency cleanup completed",
    memoryStats: statsAfter,
  });
}

/**
 * Set up automatic memory management
 */
export function setupMemoryManagement(): void {
  // Start monitoring (every 30 seconds)
  const monitorInterval = startMemoryMonitoring(30000);

  // Emergency cleanup when memory gets critical (check every 10 seconds)
  const emergencyInterval = setInterval(() => {
    if (isMemoryCritical(95)) {
      emergencyMemoryCleanup();
    }
  }, 10000);

  // Proactive cache cleanup when memory is elevated (check every 60 seconds)
  const proactiveInterval = setInterval(() => {
    if (isMemoryCritical(80)) {
      cache.cleanup(); // Remove expired entries
      logger.info({ msg: "Proactive cache cleanup performed" });
    }
  }, 60000);

  // Graceful cleanup on process exit
  const cleanup = () => {
    clearInterval(monitorInterval);
    clearInterval(emergencyInterval);
    clearInterval(proactiveInterval);
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);

  logger.info({
    msg: "Memory management system initialized",
    memoryLimit: getMemoryLimit(),
    memoryLimitMB: Math.round(getMemoryLimit() / 1024 / 1024),
  });
}
