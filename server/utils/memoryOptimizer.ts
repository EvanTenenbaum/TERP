/**
 * Memory Optimizer Utility
 * 
 * Provides memory monitoring and optimization functions to prevent memory leaks
 * and reduce memory pressure in production.
 */

import { logger } from "../_core/logger";

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
 * Get current memory statistics
 */
export function getMemoryStats(): MemoryStats {
  const memUsage = process.memoryUsage();
  const totalMemory = process.env.NODE_ENV === 'production' ? 102682624 : memUsage.heapTotal; // Railway limit
  
  return {
    used: memUsage.rss,
    total: totalMemory,
    percentage: (memUsage.rss / totalMemory) * 100,
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
  operation: (item: T) => any,
  batchSize: number = 100
): any[] {
  const results: any[] = [];
  
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
export function startMemoryMonitoring(intervalMs: number = 30000): NodeJS.Timeout {
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
  
  // Clear any global caches if they exist
  try {
    // Clear strain service cache
    const { strainService } = require('../services/strainService');
    if (strainService && typeof strainService.clearCache === 'function') {
      strainService.clearCache();
    }
    
    // Clear permission cache
    const { clearPermissionCache } = require('../services/permissionService');
    if (clearPermissionCache && typeof clearPermissionCache === 'function') {
      clearPermissionCache();
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
  // Start monitoring
  const monitorInterval = startMemoryMonitoring(30000); // Every 30 seconds
  
  // Emergency cleanup when memory gets critical
  const emergencyInterval = setInterval(() => {
    if (isMemoryCritical(95)) {
      emergencyMemoryCleanup();
    }
  }, 10000); // Every 10 seconds
  
  // Graceful cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(monitorInterval);
    clearInterval(emergencyInterval);
  });
  
  process.on('SIGINT', () => {
    clearInterval(monitorInterval);
    clearInterval(emergencyInterval);
  });
  
  logger.info({ msg: "Memory management system initialized" });
}