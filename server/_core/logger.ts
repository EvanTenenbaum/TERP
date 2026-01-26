import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

// ST-050: Silent error handling utilities
// These utilities provide consistent error handling with logging for catch blocks
// that might otherwise silently fail

/**
 * Safely parse JSON with optional logging
 * ST-050: Replaces silent JSON.parse() catches with logged fallbacks
 * @param input - String to parse as JSON
 * @param fallback - Value to return if parsing fails
 * @param context - Context for logging (if not provided, parsing is silent)
 */
export function safeJsonParse<T>(
  input: string | null | undefined,
  fallback: T,
  context?: { operation: string; identifier?: string | number }
): T {
  if (input === null || input === undefined || input === "") {
    return fallback;
  }
  try {
    return JSON.parse(input) as T;
  } catch (err) {
    if (context) {
      logger.warn(
        {
          operation: context.operation,
          identifier: context.identifier,
          error: err instanceof Error ? err.message : String(err),
          inputPreview: input.slice(0, 100),
        },
        `JSON parse failed in ${context.operation}`
      );
    }
    return fallback;
  }
}

/**
 * Log a caught error that would otherwise be silent
 * ST-050: For catch blocks that intentionally swallow errors but should log them
 * @param operation - Name of the operation that failed
 * @param error - The caught error
 * @param context - Additional context
 */
export function logSilentCatch(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.debug(
    {
      operation,
      error: errorMessage,
      ...context,
    },
    `Caught error in ${operation} (handled silently)`
  );
}

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
  /* eslint-disable no-console */
  console.log = (...args: unknown[]) => logger.info(args);
  console.error = (...args: unknown[]) => logger.error(args);
  console.warn = (...args: unknown[]) => logger.warn(args);
  console.debug = (...args: unknown[]) => logger.debug(args);
  /* eslint-enable no-console */
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

  /**
   * Log inventory warning
   */
  warn: (context: Record<string, unknown>) => {
    const { msg, ...rest } = context;
    logger.warn(rest, String(msg ?? "Inventory warning"));
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

// ============================================================================
// PII MASKING UTILITIES (SPRINT-A Task 5.4)
// ============================================================================

/**
 * PII masking utilities for logging
 * Masks sensitive data to comply with privacy requirements
 */
export const piiMasker = {
  /**
   * Mask an email address (shows first 2 chars and domain)
   * Example: john.doe@example.com -> jo***@example.com
   */
  email: (email: string): string => {
    if (!email || typeof email !== "string") return "[REDACTED]";
    const [local, domain] = email.split("@");
    if (!local || !domain) return "[REDACTED]";
    const maskedLocal = local.length > 2 ? local.slice(0, 2) + "***" : "***";
    return `${maskedLocal}@${domain}`;
  },

  /**
   * Mask a phone number (shows last 4 digits)
   * Example: +1-555-123-4567 -> ***-4567
   */
  phone: (phone: string): string => {
    if (!phone || typeof phone !== "string") return "[REDACTED]";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) return "[REDACTED]";
    return `***-${digits.slice(-4)}`;
  },

  /**
   * Mask an address (shows city/state only)
   * Example: 123 Main St, City, ST 12345 -> [ADDR], City, ST
   */
  address: (address: string): string => {
    if (!address || typeof address !== "string") return "[REDACTED]";
    // Try to extract city/state pattern
    const parts = address.split(",").map(p => p.trim());
    if (parts.length >= 2) {
      // Keep last 2 parts (typically city, state)
      const cityState = parts.slice(-2).join(", ");
      // Remove zip code if present
      return "[ADDR], " + cityState.replace(/\s+\d{5}(-\d{4})?$/, "");
    }
    return "[REDACTED]";
  },

  /**
   * Mask a name (shows first initial and last name first initial)
   * Example: John Doe -> J*** D***
   */
  name: (name: string): string => {
    if (!name || typeof name !== "string") return "[REDACTED]";
    const parts = name.trim().split(/\s+/);
    return parts.map(p => (p.length > 0 ? p[0] + "***" : "***")).join(" ");
  },

  /**
   * Mask an object's PII fields
   * Automatically detects and masks common PII field names
   */
  object: <T extends Record<string, unknown>>(
    obj: T
  ): Record<string, unknown> => {
    if (!obj || typeof obj !== "object") return obj;

    const piiFields: Record<string, (val: string) => string> = {
      email: piiMasker.email,
      userEmail: piiMasker.email,
      clientEmail: piiMasker.email,
      phone: piiMasker.phone,
      phoneNumber: piiMasker.phone,
      mobile: piiMasker.phone,
      address: piiMasker.address,
      streetAddress: piiMasker.address,
      billingAddress: piiMasker.address,
      shippingAddress: piiMasker.address,
      name: piiMasker.name,
      fullName: piiMasker.name,
      firstName: piiMasker.name,
      lastName: piiMasker.name,
    };

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const maskFn = Object.entries(piiFields).find(([fieldName]) =>
        lowerKey.includes(fieldName.toLowerCase())
      )?.[1];

      if (maskFn && typeof value === "string") {
        result[key] = maskFn(value);
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        result[key] = piiMasker.object(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  },
};

// ============================================================================
// VIP PORTAL LOGGING UTILITIES (SPRINT-A Task 5)
// ============================================================================

/**
 * VIP Portal-specific logging utilities
 * Provides structured logging with PII protection for VIP Portal operations
 */
export const vipPortalLogger = {
  /**
   * Log VIP portal operation start
   */
  operationStart: (
    operation: string,
    context: Record<string, unknown>
  ): void => {
    logger.info(
      { operation, ...piiMasker.object(context) },
      `VIP Portal: Starting ${operation}`
    );
  },

  /**
   * Log VIP portal operation success
   */
  operationSuccess: (
    operation: string,
    context: Record<string, unknown>
  ): void => {
    logger.info(
      { operation, ...piiMasker.object(context) },
      `VIP Portal: Completed ${operation}`
    );
  },

  /**
   * Log VIP portal operation failure
   */
  operationFailure: (
    operation: string,
    error: Error | unknown,
    context: Record<string, unknown>
  ): void => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(
      {
        operation,
        error: errorMessage,
        stack: errorStack,
        ...piiMasker.object(context),
      },
      `VIP Portal: Failed ${operation}`
    );
  },

  /**
   * Log authentication event
   */
  authEvent: (
    eventType: "login" | "logout" | "session_verify" | "password_reset",
    clientId: number,
    success: boolean,
    context?: Record<string, unknown>
  ): void => {
    const logFn = success ? logger.info : logger.warn;
    logFn.call(
      logger,
      { eventType, clientId, success, ...piiMasker.object(context || {}) },
      `VIP Portal Auth: ${eventType} ${success ? "succeeded" : "failed"} for client ${clientId}`
    );
  },

  /**
   * Log price alert event
   */
  priceAlertEvent: (
    eventType: "created" | "triggered" | "deactivated" | "notification_sent",
    alertId: number,
    clientId: number,
    context?: Record<string, unknown>
  ): void => {
    logger.info(
      { eventType, alertId, clientId, ...piiMasker.object(context || {}) },
      `VIP Portal Price Alert: ${eventType} (alert ${alertId}, client ${clientId})`
    );
  },

  /**
   * Log catalog access
   */
  catalogAccess: (
    clientId: number,
    action: "view" | "filter" | "add_to_draft" | "submit_interest",
    context?: Record<string, unknown>
  ): void => {
    logger.info(
      { clientId, action, ...piiMasker.object(context || {}) },
      `VIP Portal Catalog: ${action} by client ${clientId}`
    );
  },

  /**
   * Log marketplace activity
   */
  marketplaceActivity: (
    clientId: number,
    action:
      | "create_need"
      | "update_need"
      | "cancel_need"
      | "create_supply"
      | "update_supply"
      | "cancel_supply",
    itemId?: number,
    context?: Record<string, unknown>
  ): void => {
    logger.info(
      { clientId, action, itemId, ...piiMasker.object(context || {}) },
      `VIP Portal Marketplace: ${action} by client ${clientId}`
    );
  },
};

/**
 * Calendar-specific logging utilities
 * Following TERP Bible monitoring protocols
 */
export const calendarLogger = {
  /**
   * Log calendar event creation
   */
  eventCreated: (
    eventId: number,
    userId: number,
    eventType: string,
    context?: Record<string, unknown>
  ) => {
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
  orderCreated: (
    orderId: number,
    eventId: number,
    context?: Record<string, unknown>
  ) => {
    logger.info(
      { orderId, eventId, ...context },
      `Order created from appointment (Order ID: ${orderId}, Event ID: ${eventId})`
    );
  },

  /**
   * Log conflict detection
   */
  conflictDetected: (conflictCount: number, requestedSlot: unknown) => {
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
  externalBooking: (
    eventId: number,
    clientId: number,
    confirmationNumber: string
  ) => {
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
