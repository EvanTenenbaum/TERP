import pino from "pino";

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
  console.log = (...args: unknown[]) => logger.info(args);
  console.error = (...args: unknown[]) => logger.error(args);
  console.warn = (...args: unknown[]) => logger.warn(args);
  console.debug = (...args: unknown[]) => logger.debug(args);
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

/**
 * Calendar-specific logging utilities
 * Following TERP Bible monitoring protocols
 */
export const calendarLogger = {
  /**
   * Log calendar event creation
   */
  eventCreated: (eventId: number, userId: number, eventType: string, context?: Record<string, unknown>) => {
    logger.info(
      { eventId, userId, eventType, ...context },
      `Calendar event created: ${eventType} (ID: ${eventId})`
    );
  },

  /**
   * Log payment processing
   */
  paymentProcessed: (
    paymentId: number,
    amount: number,
    paymentType: "AR" | "AP",
    context?: Record<string, unknown>
  ) => {
    logger.info(
      { paymentId, amount, paymentType, ...context },
      `Payment processed: ${paymentType} $${amount} (ID: ${paymentId})`
    );
  },

  /**
   * Log order creation from appointment
   */
  orderCreated: (orderId: number, eventId: number, context?: Record<string, unknown>) => {
    logger.info(
      { orderId, eventId, ...context },
      `Order created from appointment (Order ID: ${orderId}, Event ID: ${eventId})`
    );
  },

  /**
   * Log conflict detection
   */
  conflictDetected: (conflictCount: number, requestedSlot: any) => {
    logger.warn(
      { conflictCount, requestedSlot },
      `Scheduling conflict detected: ${conflictCount} conflicting event(s)`
    );
  },

  /**
   * Log batch linking
   */
  batchLinked: (batchId: number, eventId: number) => {
    logger.info(
      { batchId, eventId },
      `Batch linked to photo session (Batch ID: ${batchId}, Event ID: ${eventId})`
    );
  },

  /**
   * Log VIP portal booking
   */
  externalBooking: (eventId: number, clientId: number, confirmationNumber: string) => {
    logger.info(
      { eventId, clientId, confirmationNumber },
      `External booking created via VIP portal (Confirmation: ${confirmationNumber})`
    );
  },

  /**
   * Log calendar operation start
   */
  operationStart: (operation: string, context: Record<string, unknown>) => {
    logger.debug(
      { operation, ...context },
      `Starting calendar operation: ${operation}`
    );
  },

  /**
   * Log calendar operation success
   */
  operationSuccess: (operation: string, context: Record<string, unknown>) => {
    logger.info(
      { operation, ...context },
      `Completed calendar operation: ${operation}`
    );
  },

  /**
   * Log calendar operation failure
   */
  operationFailure: (
    operation: string,
    error: Error,
    context: Record<string, unknown>
  ) => {
    logger.error(
      { operation, error: error.message, stack: error.stack, ...context },
      `Failed calendar operation: ${operation}`
    );
  },
};
