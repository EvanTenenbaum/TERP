/**
 * Structured Logging Utilities for Seeding Operations
 *
 * Provides consistent, structured logging following patterns from server/_core/logger.ts.
 * Supports both JSON (production) and pretty (development) output formats.
 */

import pino from "pino";

// ============================================================================
// Logger Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Base logger instance for seeding operations
 * Uses pino for structured logging with environment-aware formatting
 */
export const logger = pino({
  level: isDevelopment ? "debug" : "info",
  name: "terp-seeding",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
          messageFormat: "{msg}",
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// ============================================================================
// Seeding Logger Utilities
// ============================================================================

export const seedLogger = {
  // ---------------------------------------------------------------------------
  // Operation Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Log seeding operation start
   */
  operationStart: (operation: string, context: Record<string, unknown>) => {
    logger.info(
      { operation, phase: "start", ...context },
      `Starting seeding operation: ${operation}`
    );
  },

  /**
   * Log seeding operation success
   */
  operationSuccess: (operation: string, context: Record<string, unknown>) => {
    logger.info(
      { operation, phase: "complete", ...context },
      `Completed seeding operation: ${operation}`
    );
  },

  /**
   * Log seeding operation failure
   */
  operationFailure: (
    operation: string,
    error: Error,
    context: Record<string, unknown>
  ) => {
    logger.error(
      { operation, phase: "failed", error: error.message, stack: error.stack, ...context },
      `Failed seeding operation: ${operation}`
    );
  },

  /**
   * Log operation progress
   */
  operationProgress: (
    operation: string,
    current: number,
    total: number,
    context?: Record<string, unknown>
  ) => {
    const percent = Math.round((current / total) * 100);
    logger.info(
      { operation, progress: `${current}/${total}`, percent, ...context },
      `Progress: ${current}/${total} (${percent}%)`
    );
  },

  // ---------------------------------------------------------------------------
  // Lock Operations
  // ---------------------------------------------------------------------------

  /**
   * Log lock acquisition attempt
   */
  lockAttempt: (lockName: string, timeoutSeconds: number) => {
    logger.debug(
      { lockName, timeoutSeconds },
      `Attempting to acquire lock: ${lockName}`
    );
  },

  /**
   * Log successful lock acquisition
   */
  lockAcquired: (lockName: string) => {
    logger.debug({ lockName }, `Lock acquired: ${lockName}`);
  },

  /**
   * Log lock release
   */
  lockReleased: (lockName: string) => {
    logger.debug({ lockName }, `Lock released: ${lockName}`);
  },

  /**
   * Log lock conflict (already held by another session)
   */
  lockConflict: (lockName: string, holderConnection: number | null) => {
    logger.warn(
      { lockName, holderConnection },
      `Lock conflict: ${lockName} is held by connection ${holderConnection}`
    );
  },

  /**
   * Log lock timeout
   */
  lockTimeout: (lockName: string, timeoutSeconds: number) => {
    logger.warn(
      { lockName, timeoutSeconds },
      `Lock timeout: Could not acquire ${lockName} within ${timeoutSeconds}s`
    );
  },

  /**
   * Log lock not owned by current session
   */
  lockNotOwned: (lockName: string) => {
    logger.debug(
      { lockName },
      `Lock ${lockName} exists but not owned by this session`
    );
  },

  /**
   * Log lock not found
   */
  lockNotFound: (lockName: string) => {
    logger.debug({ lockName }, `Lock ${lockName} does not exist`);
  },

  // ---------------------------------------------------------------------------
  // Validation Operations
  // ---------------------------------------------------------------------------

  /**
   * Log validation start
   */
  validationStart: (tableName: string) => {
    logger.debug({ tableName }, `Starting schema validation for ${tableName}`);
  },

  /**
   * Log validation success
   */
  validationSuccess: (tableName: string, columnCount: number) => {
    logger.debug(
      { tableName, columnCount },
      `Schema validation passed for ${tableName} (${columnCount} columns)`
    );
  },

  /**
   * Log validation failure
   */
  validationFailure: (
    tableName: string,
    errors: Array<{ field: string; message: string; severity?: string }>
  ) => {
    logger.warn(
      { tableName, errorCount: errors.length, errors },
      `Schema validation failed for ${tableName}: ${errors.length} error(s)`
    );
  },

  /**
   * Log validation warning
   */
  validationWarning: (tableName: string, message: string) => {
    logger.warn({ tableName }, `Validation warning for ${tableName}: ${message}`);
  },

  // ---------------------------------------------------------------------------
  // PII Masking Operations
  // ---------------------------------------------------------------------------

  /**
   * Log PII field masked
   */
  piiMasked: (tableName: string, field: string) => {
    logger.debug({ tableName, field, masked: true }, `PII masked: ${tableName}.${field}`);
  },

  /**
   * Log PII masking summary
   */
  piiMaskingSummary: (
    tableName: string,
    maskedFields: string[],
    environment: string
  ) => {
    logger.info(
      { tableName, maskedFields, environment, maskedCount: maskedFields.length },
      `PII masking complete for ${tableName}: ${maskedFields.length} field(s) masked`
    );
  },

  /**
   * Log PII masking skipped (production)
   */
  piiMaskingSkipped: (reason: string) => {
    logger.info({ reason }, `PII masking skipped: ${reason}`);
  },

  // ---------------------------------------------------------------------------
  // Data Operations
  // ---------------------------------------------------------------------------

  /**
   * Log table seeding start
   */
  tableSeeding: (tableName: string, recordCount: number) => {
    logger.info(
      { tableName, recordCount },
      `Seeding ${tableName} with ${recordCount} records`
    );
  },

  /**
   * Log table seeding complete
   */
  tableSeeded: (tableName: string, insertedCount: number, duration: number) => {
    logger.info(
      { tableName, insertedCount, duration },
      `Seeded ${tableName}: ${insertedCount} records in ${duration}ms`
    );
  },

  /**
   * Log record skipped
   */
  recordSkipped: (tableName: string, reason: string, context?: Record<string, unknown>) => {
    logger.debug(
      { tableName, reason, ...context },
      `Record skipped in ${tableName}: ${reason}`
    );
  },

  /**
   * Log foreign key reference
   */
  foreignKeyResolved: (
    tableName: string,
    column: string,
    referencedTable: string,
    referencedId: number
  ) => {
    logger.debug(
      { tableName, column, referencedTable, referencedId },
      `Foreign key resolved: ${tableName}.${column} -> ${referencedTable}(${referencedId})`
    );
  },

  // ---------------------------------------------------------------------------
  // CLI Operations
  // ---------------------------------------------------------------------------

  /**
   * Log CLI argument parsing
   */
  cliArgs: (args: Record<string, unknown>) => {
    logger.debug({ args }, "Parsed CLI arguments");
  },

  /**
   * Log dry run mode
   */
  dryRun: (context: Record<string, unknown>) => {
    logger.info(
      { dryRun: true, ...context },
      "DRY RUN MODE: No data will be modified"
    );
  },

  /**
   * Log environment detection
   */
  environment: (env: string, context?: Record<string, unknown>) => {
    logger.info({ environment: env, ...context }, `Running in ${env} environment`);
  },

  /**
   * Log confirmation prompt
   */
  confirmationPrompt: (message: string) => {
    logger.debug({ prompt: message }, "Awaiting user confirmation");
  },

  // ---------------------------------------------------------------------------
  // Summary Reports
  // ---------------------------------------------------------------------------

  /**
   * Log final summary report
   */
  summary: (stats: {
    duration: number;
    tables: string[];
    recordsInserted: Record<string, number>;
    errors: number;
  }) => {
    const totalRecords = Object.values(stats.recordsInserted).reduce(
      (sum, count) => sum + count,
      0
    );

    logger.info(
      {
        operation: "seed",
        phase: "summary",
        duration: stats.duration,
        tables: stats.tables,
        recordsInserted: stats.recordsInserted,
        totalRecords,
        errors: stats.errors,
      },
      `Seeding completed: ${totalRecords} records in ${stats.tables.length} tables (${stats.duration}ms)`
    );
  },

  /**
   * Log error summary
   */
  errorSummary: (errors: Array<{ table: string; error: string }>) => {
    logger.error(
      { errorCount: errors.length, errors },
      `Seeding completed with ${errors.length} error(s)`
    );
  },
};

// ============================================================================
// Performance Logging Utility
// ============================================================================

/**
 * Wrap an async function with performance logging
 */
export async function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now();
  seedLogger.operationStart(operation, context ?? {});

  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    seedLogger.operationSuccess(operation, { duration, ...context });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    seedLogger.operationFailure(
      operation,
      error instanceof Error ? error : new Error(String(error)),
      { duration, ...context }
    );
    throw error;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default seedLogger;
