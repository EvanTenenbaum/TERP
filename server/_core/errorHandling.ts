/**
 * Global Error Handling for tRPC
 * ST-002: Implement Global Error Handling
 * 
 * This module provides comprehensive error handling middleware for tRPC procedures,
 * including error logging, formatting, and tracking.
 */

import { TRPCError } from "@trpc/server";
import { logger } from "./logger";
import type { TrpcContext } from "./context";

/**
 * Error severity levels for categorization
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Error metadata for tracking and debugging
 */
export interface ErrorMetadata {
  errorId: string;
  timestamp: string;
  userId?: number;
  userRole?: string;
  procedure?: string;
  input?: unknown;
  severity: ErrorSeverity;
  stack?: string;
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Determine error severity based on error code and context
 */
function determineErrorSeverity(error: TRPCError): ErrorSeverity {
  switch (error.code) {
    case "INTERNAL_SERVER_ERROR":
    case "TIMEOUT":
      return ErrorSeverity.CRITICAL;
    
    case "FORBIDDEN":
    case "UNAUTHORIZED":
      return ErrorSeverity.HIGH;
    
    case "NOT_FOUND":
    case "CONFLICT":
      return ErrorSeverity.MEDIUM;
    
    case "BAD_REQUEST":
    case "PRECONDITION_FAILED":
    case "PAYLOAD_TOO_LARGE":
    case "METHOD_NOT_SUPPORTED":
    case "TOO_MANY_REQUESTS":
    case "CLIENT_CLOSED_REQUEST":
    default:
      return ErrorSeverity.LOW;
  }
}

/**
 * Format error for client response
 * Sanitizes sensitive information while providing useful debugging context
 */
function formatErrorForClient(
  error: TRPCError,
  metadata: ErrorMetadata
): {
  message: string;
  code: string;
  errorId: string;
  timestamp: string;
} {
  // In production, don't expose stack traces or internal details
  const isProduction = process.env.NODE_ENV === "production";
  
  return {
    message: error.message,
    code: error.code,
    errorId: metadata.errorId,
    timestamp: metadata.timestamp,
    // Only include stack in development
    ...((!isProduction && metadata.stack) ? { stack: metadata.stack } : {}),
  };
}

/**
 * Log error with full context
 */
function logError(error: TRPCError, metadata: ErrorMetadata): void {
  const logData = {
    errorId: metadata.errorId,
    code: error.code,
    message: error.message,
    severity: metadata.severity,
    userId: metadata.userId,
    userRole: metadata.userRole,
    procedure: metadata.procedure,
    input: metadata.input,
    stack: metadata.stack,
    timestamp: metadata.timestamp,
  };

  // Log at appropriate level based on severity
  switch (metadata.severity) {
    case ErrorSeverity.CRITICAL:
      logger.error(logData, `[CRITICAL ERROR] ${error.message}`);
      break;
    case ErrorSeverity.HIGH:
      logger.error(logData, `[HIGH SEVERITY ERROR] ${error.message}`);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn(logData, `[MEDIUM SEVERITY ERROR] ${error.message}`);
      break;
    case ErrorSeverity.LOW:
      logger.info(logData, `[LOW SEVERITY ERROR] ${error.message}`);
      break;
  }
}

/**
 * Convert unknown errors to TRPCError
 */
function normalizeError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof Error) {
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
      cause: error,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unknown error occurred",
    cause: error,
  });
}

/**
 * Global error handling middleware for tRPC
 * 
 * This middleware:
 * - Catches all errors from procedures
 * - Logs errors with full context
 * - Generates unique error IDs for tracking
 * - Formats errors consistently for clients
 * - Categorizes errors by severity
 * 
 * Usage:
 * ```ts
 * export const protectedProcedure = t.procedure
 *   .use(errorHandlingMiddleware)
 *   .use(sanitizationMiddleware)
 *   .use(requireUser);
 * ```
 */
export function createErrorHandlingMiddleware(procedureName?: string) {
  return async (opts: {
    ctx: TrpcContext;
    next: () => Promise<unknown>;
    path: string;
    type: "query" | "mutation" | "subscription";
    input?: unknown;
  }) => {
    const { ctx, next, path, input } = opts;

    try {
      // Execute the procedure
      return await next();
    } catch (error) {
      // Normalize error to TRPCError
      const trpcError = normalizeError(error);

      // Generate error metadata
      const metadata: ErrorMetadata = {
        errorId: generateErrorId(),
        timestamp: new Date().toISOString(),
        userId: ctx.user?.id,
        userRole: ctx.user?.role,
        procedure: procedureName || path,
        input: input,
        severity: determineErrorSeverity(trpcError),
        stack: trpcError.cause instanceof Error ? trpcError.cause.stack : undefined,
      };

      // Log the error
      logError(trpcError, metadata);

      // Format error for client
      const formattedError = formatErrorForClient(trpcError, metadata);

      // Re-throw with enhanced metadata
      throw new TRPCError({
        code: trpcError.code,
        message: trpcError.message,
        cause: {
          ...formattedError,
          originalError: trpcError.cause,
        },
      });
    }
  };
}

/**
 * Error tracking utilities for application code
 */
export const errorTracking = {
  /**
   * Track a handled error (error that was caught and recovered from)
   */
  trackHandledError: (
    error: Error,
    context: {
      operation: string;
      userId?: number;
      additionalContext?: Record<string, unknown>;
    }
  ) => {
    const errorId = generateErrorId();
    logger.warn(
      {
        errorId,
        error: error.message,
        stack: error.stack,
        operation: context.operation,
        userId: context.userId,
        ...context.additionalContext,
      },
      `Handled error in ${context.operation}: ${error.message}`
    );
    return errorId;
  },

  /**
   * Track a validation error
   */
  trackValidationError: (
    field: string,
    value: unknown,
    reason: string,
    context?: Record<string, unknown>
  ) => {
    const errorId = generateErrorId();
    logger.info(
      {
        errorId,
        field,
        value,
        reason,
        ...context,
      },
      `Validation error: ${field} - ${reason}`
    );
    return errorId;
  },

  /**
   * Track a business logic error (expected error condition)
   */
  trackBusinessError: (
    operation: string,
    reason: string,
    context?: Record<string, unknown>
  ) => {
    const errorId = generateErrorId();
    logger.info(
      {
        errorId,
        operation,
        reason,
        ...context,
      },
      `Business logic error in ${operation}: ${reason}`
    );
    return errorId;
  },
};
