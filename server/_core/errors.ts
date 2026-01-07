import { TRPCError } from "@trpc/server";
import { logger } from "./logger";
import { randomBytes } from "crypto";

// ============================================================================
// REQUEST ID GENERATION
// ============================================================================

/**
 * Generate a unique request ID for error tracking and support
 * Format: REQ-{timestamp}-{random}
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `REQ-${timestamp}-${random}`;
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

/**
 * Custom application error class for expected errors
 */
export class AppError extends Error {
  public requestId?: string;

  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.requestId = generateRequestId();
  }
}

/**
 * Validation error for invalid user input
 */
export class ValidationError extends TRPCError {
  constructor(message: string, field?: string) {
    super({
      code: "BAD_REQUEST",
      message: field ? `${field}: ${message}` : message,
    });
  }
}

/**
 * Not found error for missing entities
 */
export class NotFoundError extends TRPCError {
  constructor(entity: string, id?: number | string) {
    super({
      code: "NOT_FOUND",
      message: id ? `${entity} with ID ${id} not found` : `${entity} not found`,
    });
  }
}

/**
 * Permission error for unauthorized actions
 */
export class PermissionError extends TRPCError {
  constructor(action: string, resource: string) {
    super({
      code: "FORBIDDEN",
      message: `You do not have permission to ${action} this ${resource}`,
    });
  }
}

/**
 * Conflict error for duplicate or conflicting data
 */
export class ConflictError extends TRPCError {
  constructor(message: string) {
    super({
      code: "CONFLICT",
      message,
    });
  }
}

/**
 * Business rule error for domain-specific validation failures
 */
export class BusinessRuleError extends TRPCError {
  constructor(message: string) {
    super({
      code: "BAD_REQUEST",
      message,
    });
  }
}

/**
 * Centralized Error Catalog
 * ✅ ADDED: TERP-INIT-005 Phase 2 - Standardized error definitions
 */
export const ErrorCatalog = {
  // Inventory Errors
  INVENTORY: {
    BATCH_NOT_FOUND: (batchId: number) =>
      new AppError(`Batch ${batchId} not found`, "NOT_FOUND", 404, { batchId }),
    INSUFFICIENT_QUANTITY: (
      batchId: number,
      available: number,
      requested: number
    ) =>
      new AppError(
        `Insufficient quantity in batch ${batchId}. Available: ${available}, Requested: ${requested}`,
        "INSUFFICIENT_QUANTITY",
        400,
        { batchId, available, requested }
      ),
    INVALID_STATUS_TRANSITION: (from: string, to: string) =>
      new AppError(
        `Invalid status transition from ${from} to ${to}`,
        "INVALID_TRANSITION",
        400,
        { from, to }
      ),
    NEGATIVE_QUANTITY: (batchId: number, quantity: number) =>
      new AppError(
        `Operation would result in negative quantity for batch ${batchId}: ${quantity}`,
        "NEGATIVE_QUANTITY",
        400,
        { batchId, quantity }
      ),
    INVALID_QUANTITY: (quantity: number) =>
      new AppError(
        `Invalid quantity: ${quantity}. Must be a positive number.`,
        "INVALID_QUANTITY",
        400,
        { quantity }
      ),
  },

  // Storage Errors
  STORAGE_NOT_CONFIGURED: new AppError(
    "Storage service is not configured. Please set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY environment variables.",
    "STORAGE_NOT_CONFIGURED",
    503
  ),

  // Entity Not Found Errors
  NOT_FOUND: {
    VENDOR: (vendorId: number) =>
      new AppError(`Vendor ${vendorId} not found`, "NOT_FOUND", 404, {
        vendorId,
      }),
    BRAND: (brandId: number) =>
      new AppError(`Brand ${brandId} not found`, "NOT_FOUND", 404, { brandId }),
    PRODUCT: (productId: number) =>
      new AppError(`Product ${productId} not found`, "NOT_FOUND", 404, {
        productId,
      }),
    LOT: (lotId: number) =>
      new AppError(`Lot ${lotId} not found`, "NOT_FOUND", 404, { lotId }),
    MOVEMENT: (movementId: number) =>
      new AppError(
        `Inventory movement ${movementId} not found`,
        "NOT_FOUND",
        404,
        { movementId }
      ),
  },

  // Validation Errors
  VALIDATION: {
    INVALID_INPUT: (field: string, reason: string) =>
      new AppError(`Invalid ${field}: ${reason}`, "BAD_REQUEST", 400, {
        field,
        reason,
      }),
    MISSING_REQUIRED_FIELD: (field: string) =>
      new AppError(`Missing required field: ${field}`, "BAD_REQUEST", 400, {
        field,
      }),
    INVALID_COGS: (reason: string) =>
      new AppError(
        `Invalid COGS configuration: ${reason}`,
        "BAD_REQUEST",
        400,
        { reason }
      ),
  },

  // Database Errors
  DATABASE: {
    TRANSACTION_FAILED: (operation: string, reason: string) =>
      new AppError(
        `Transaction failed during ${operation}: ${reason}`,
        "TRANSACTION_FAILED",
        500,
        { operation, reason }
      ),
    CONSTRAINT_VIOLATION: (constraint: string) =>
      new AppError(
        `Database constraint violation: ${constraint}`,
        "CONFLICT",
        409,
        { constraint }
      ),
    CONNECTION_ERROR: () =>
      new AppError("Database connection error", "INTERNAL_SERVER_ERROR", 500),
  },

  // Authentication/Authorization Errors
  AUTH: {
    UNAUTHORIZED: () =>
      new AppError("Authentication required", "UNAUTHORIZED", 401),
    FORBIDDEN: (action: string) =>
      new AppError(
        `You do not have permission to ${action}`,
        "FORBIDDEN",
        403,
        { action }
      ),
    SESSION_EXPIRED: () =>
      new AppError("Your session has expired. Please log in again.", "UNAUTHORIZED", 401),
  },

  // Order/Sales Errors
  ORDER: {
    NOT_FOUND: (orderId: number) =>
      new AppError(`Order ${orderId} not found`, "NOT_FOUND", 404, { orderId }),
    ALREADY_FULFILLED: (orderId: number) =>
      new AppError(`Order ${orderId} has already been fulfilled`, "CONFLICT", 409, { orderId }),
    INVALID_STATUS_CHANGE: (from: string, to: string) =>
      new AppError(`Cannot change order status from ${from} to ${to}`, "BAD_REQUEST", 400, { from, to }),
    INSUFFICIENT_INVENTORY: (batchId: number, requested: number, available: number) =>
      new AppError(
        `Insufficient inventory in batch ${batchId}. Requested: ${requested}, Available: ${available}`,
        "BAD_REQUEST",
        400,
        { batchId, requested, available }
      ),
  },

  // Client Errors
  CLIENT: {
    NOT_FOUND: (clientId: number) =>
      new AppError(`Client ${clientId} not found`, "NOT_FOUND", 404, { clientId }),
    CREDIT_LIMIT_EXCEEDED: (clientId: number, limit: number, requested: number) =>
      new AppError(
        `Credit limit exceeded for client ${clientId}. Limit: $${limit}, Requested: $${requested}`,
        "BAD_REQUEST",
        400,
        { clientId, limit, requested }
      ),
    DUPLICATE_TERI_CODE: (teriCode: string) =>
      new AppError(`Client with TERI code ${teriCode} already exists`, "CONFLICT", 409, { teriCode }),
  },

  // Invoice/Payment Errors
  ACCOUNTING: {
    INVOICE_NOT_FOUND: (invoiceId: number) =>
      new AppError(`Invoice ${invoiceId} not found`, "NOT_FOUND", 404, { invoiceId }),
    PAYMENT_EXCEEDS_BALANCE: (amount: number, balance: number) =>
      new AppError(
        `Payment amount $${amount} exceeds outstanding balance $${balance}`,
        "BAD_REQUEST",
        400,
        { amount, balance }
      ),
    INVOICE_ALREADY_PAID: (invoiceId: number) =>
      new AppError(`Invoice ${invoiceId} has already been paid in full`, "CONFLICT", 409, { invoiceId }),
  },

  // Calendar Errors
  CALENDAR: {
    EVENT_NOT_FOUND: (eventId: number) =>
      new AppError(`Calendar event ${eventId} not found`, "NOT_FOUND", 404, { eventId }),
    SCHEDULING_CONFLICT: (startTime: string, endTime: string) =>
      new AppError(
        `Scheduling conflict: Time slot ${startTime} to ${endTime} is not available`,
        "CONFLICT",
        409,
        { startTime, endTime }
      ),
    INVALID_DATE_RANGE: () =>
      new AppError("End date must be after start date", "BAD_REQUEST", 400),
  },
} as const;

/**
 * Centralized error handler for all tRPC procedures
 * Logs errors with context and converts to TRPCError
 * Includes request ID for support and debugging
 */
export function handleError(error: unknown, context: string): never {
  const requestId = generateRequestId();

  logger.error({
    requestId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  }, `Error in ${context}`);

  if (error instanceof AppError) {
    throw new TRPCError({
      code: mapErrorCode(error.code),
      message: `${error.message} (Request ID: ${error.requestId || requestId})`,
      cause: error,
    });
  }

  if (error instanceof TRPCError) {
    // Re-throw TRPCErrors as-is, but add request ID to message if not present
    if (!error.message.includes("Request ID:")) {
      error.message = `${error.message} (Request ID: ${requestId})`;
    }
    throw error;
  }

  if (error instanceof Error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `An unexpected error occurred. Please try again. (Request ID: ${requestId})`,
      cause: error,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `An unknown error occurred. (Request ID: ${requestId})`,
  });
}

/**
 * Create an error with request ID attached
 * Use this to throw errors that need tracking
 */
export function createTrackedError(
  code: TRPCError["code"],
  message: string,
  cause?: Error
): TRPCError {
  const requestId = generateRequestId();
  return new TRPCError({
    code,
    message: `${message} (Request ID: ${requestId})`,
    cause,
  });
}

/**
 * Map AppError codes to TRPCError codes
 */
function mapErrorCode(code: string): TRPCError["code"] {
  const mapping: Record<string, TRPCError["code"]> = {
    NOT_FOUND: "NOT_FOUND",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    BAD_REQUEST: "BAD_REQUEST",
    CONFLICT: "CONFLICT",
    INSUFFICIENT_QUANTITY: "BAD_REQUEST",
    INVALID_TRANSITION: "BAD_REQUEST",
    NEGATIVE_QUANTITY: "BAD_REQUEST",
    INVALID_QUANTITY: "BAD_REQUEST",
    TRANSACTION_FAILED: "INTERNAL_SERVER_ERROR",
  };
  return mapping[code] || "INTERNAL_SERVER_ERROR";
}
