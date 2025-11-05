import pino from "pino";
import { logger } from "./logger";

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = pino({
  level: isDevelopment ? "debug" : "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  formatters: {
    level: label => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Replace console methods with logger
 * Call this in server startup
 */
export function replaceConsole() {
  logger.info = (...args: unknown[]) => logger.info(args);
  logger.error = (...args: unknown[]) => logger.error(args);
  logger.warn = (...args: unknown[]) => logger.warn(args);
  logger.debug = (...args: unknown[]) => logger.debug(args);
}

/**
 * Structured Logging Utilities
 * ✅ ADDED: TERP-INIT-005 Phase 2 - Enhanced logging for inventory operations
 */
export const inventoryLogger = {
  /**
   * Log inventory operation start
   */
  operationStart: (operation: string, context: Record<string, unknown>) => {
    logger.info(
      { operation, ...context },
      `Starting inventory operation: ${operation}`
    );
  },

  /**
   * Log inventory operation success
   */
  operationSuccess: (operation: string, context: Record<string, unknown>) => {
    logger.info(
      { operation, ...context },
      `Completed inventory operation: ${operation}`
    );
  },

  /**
   * Log inventory operation failure
   */
  operationFailure: (
    operation: string,
    error: Error,
    context: Record<string, unknown>
  ) => {
    logger.error(
      { operation, error: error.message, stack: error.stack, ...context },
      `Failed inventory operation: ${operation}`
    );
  },

  /**
   * Log transaction start
   */
  transactionStart: (transactionId: string, operation: string) => {
    logger.debug(
      { transactionId, operation },
      `Transaction started: ${operation}`
    );
  },

  /**
   * Log transaction commit
   */
  transactionCommit: (transactionId: string, operation: string) => {
    logger.debug(
      { transactionId, operation },
      `Transaction committed: ${operation}`
    );
  },

  /**
   * Log transaction rollback
   */
  transactionRollback: (
    transactionId: string,
    operation: string,
    reason: string
  ) => {
    logger.warn(
      { transactionId, operation, reason },
      `Transaction rolled back: ${operation}`
    );
  },

  /**
   * Log validation failure
   */
  validationFailure: (field: string, value: unknown, reason: string) => {
    logger.warn({ field, value, reason }, `Validation failed for ${field}`);
  },

  /**
   * Log quantity change
   */
  quantityChange: (
    batchId: number,
    operation: string,
    before: number,
    after: number,
    change: number
  ) => {
    logger.info(
      { batchId, operation, before, after, change },
      `Quantity changed for batch ${batchId}: ${before} → ${after} (${change > 0 ? "+" : ""}${change})`
    );
  },
};

/**
 * Performance logging utility
 */
export function logPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  return fn()
    .then(result => {
      const duration = Date.now() - start;
      logger.debug(
        { operation, duration },
        `${operation} completed in ${duration}ms`
      );
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      logger.error(
        { operation, duration, error: error.message },
        `${operation} failed after ${duration}ms`
      );
      throw error;
    });
}
