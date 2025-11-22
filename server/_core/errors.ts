import { TRPCError } from "@trpc/server";
import { logger } from "./logger";

/**
 * Custom application error class for expected errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
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
  },
} as const;

/**
 * Centralized error handler for all tRPC procedures
 * Logs errors with context and converts to TRPCError
 */
export function handleError(error: unknown, context: string): never {
  logger.error({ error }, `Error in ${context}`);

  if (error instanceof AppError) {
    throw new TRPCError({
      code: mapErrorCode(error.code),
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof Error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again.",
      cause: error,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unknown error occurred.",
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
