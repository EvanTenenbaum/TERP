import { middleware } from "./trpc";
// Sentry temporarily disabled to troubleshoot Railway deployment issues
// import { Sentry } from "../../sentry.server.config";
import { logger } from "./logger";

/**
 * Performance monitoring middleware for tRPC
 * 
 * Tracks execution time, database query performance, and reports slow operations
 * Integrates with Sentry for distributed tracing and performance monitoring
 */

// Configuration
const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second
const VERY_SLOW_QUERY_THRESHOLD_MS = 3000; // 3 seconds

interface PerformanceMetrics {
  procedure: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

// In-memory metrics store (last 100 operations)
const recentMetrics: PerformanceMetrics[] = [];
const MAX_METRICS = 100;

/**
 * Add metric to in-memory store
 */
function recordMetric(metric: PerformanceMetrics) {
  recentMetrics.push(metric);
  if (recentMetrics.length > MAX_METRICS) {
    recentMetrics.shift();
  }
}

/**
 * Get recent performance metrics
 */
export function getRecentMetrics() {
  return recentMetrics;
}

/**
 * Get slow query statistics
 */
export function getSlowQueryStats() {
  const slowQueries = recentMetrics.filter(m => m.duration > SLOW_QUERY_THRESHOLD_MS);
  const verySlowQueries = recentMetrics.filter(m => m.duration > VERY_SLOW_QUERY_THRESHOLD_MS);
  
  return {
    total: recentMetrics.length,
    slow: slowQueries.length,
    verySlow: verySlowQueries.length,
    slowPercentage: recentMetrics.length > 0 ? (slowQueries.length / recentMetrics.length) * 100 : 0,
    averageDuration: recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length 
      : 0,
  };
}

/**
 * Performance monitoring middleware
 * Wraps tRPC procedures to track execution time and report slow operations
 */
export const performanceMiddleware = middleware(async ({ path, type, next, ctx }) => {
  const startTime = Date.now();
  const procedureName = `${type}.${path}`;
  
  // Sentry disabled - no transaction tracking
  
  try {
    // Execute the procedure
    const result = await next();
    
    const duration = Date.now() - startTime;
    
    // Record successful execution
    recordMetric({
      procedure: procedureName,
      duration,
      success: true,
      timestamp: new Date(),
    });
    
    // Log slow queries
    if (duration > VERY_SLOW_QUERY_THRESHOLD_MS) {
      logger.error({
        msg: "Very slow tRPC procedure",
        procedure: procedureName,
        duration,
        userId: ctx.user?.id,
      });
    } else if (duration > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn({
        msg: "Slow tRPC procedure",
        procedure: procedureName,
        duration,
        userId: ctx.user?.id,
      });
    } else {
      // Log normal execution in debug mode
      logger.debug({
        msg: "tRPC procedure executed",
        procedure: procedureName,
        duration,
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Record failed execution
    recordMetric({
      procedure: procedureName,
      duration,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    });
    
    // Log error
    logger.error({
      msg: "tRPC procedure failed",
      procedure: procedureName,
      duration,
      error: error instanceof Error ? error.message : String(error),
      userId: ctx.user?.id,
    });
    
    throw error;
  }
});

/**
 * Database query performance tracking
 * Call this function before and after database queries to track performance
 */
export function trackDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return queryFn()
    .then((result) => {
      const duration = Date.now() - startTime;
      
      if (duration > SLOW_QUERY_THRESHOLD_MS) {
        logger.warn({
          msg: "Slow database query",
          query: queryName,
          duration,
        });
      }
      
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      
      logger.error({
        msg: "Database query failed",
        query: queryName,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    });
}
