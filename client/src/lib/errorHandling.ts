/**
 * Client-side Error Handling Utilities
 * ARCH-001: Standardized error handling for tRPC mutations
 *
 * This module provides:
 * - Type-safe error extraction from tRPC errors
 * - User-friendly error messages
 * - Field-level error mapping for forms
 * - Debug context preservation
 */

import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";

/**
 * Normalized error shape for consistent handling
 */
export interface AppErrorInfo {
  /** User-safe message to display */
  message: string;
  /** Error code for programmatic handling */
  code: string;
  /** Field-level errors for form validation */
  fieldErrors?: Record<string, string[]>;
  /** Original error for debugging */
  cause?: unknown;
}

/**
 * Error codes mapped to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  // tRPC standard codes
  UNAUTHORIZED: "Please log in to perform this action.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  BAD_REQUEST: "Invalid request. Please check your input.",
  CONFLICT: "This action conflicts with existing data.",
  INTERNAL_SERVER_ERROR: "An unexpected error occurred. Please try again.",
  TIMEOUT: "The request timed out. Please try again.",
  TOO_MANY_REQUESTS: "Too many requests. Please slow down.",

  // Custom TERP codes
  TERI_CODE_EXISTS: "This TERI code already exists. Please use a different code.",
  INSUFFICIENT_QUANTITY: "Insufficient quantity available.",
  INVALID_TRANSITION: "This status change is not allowed.",
};

/**
 * Type guard for tRPC client errors
 */
function isTRPCClientError(error: unknown): error is TRPCClientError<AppRouter> {
  return error instanceof TRPCClientError;
}

/**
 * Extract user-safe error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  // Handle tRPC errors
  if (isTRPCClientError(error)) {
    const data = error.data as Record<string, unknown> | undefined;
    const code = data?.code as string | undefined;

    // Check for custom message first
    if (error.message && !error.message.includes("TRPCClientError")) {
      // Handle specific known error patterns
      if (error.message.includes("TERI code already exists")) {
        return ERROR_MESSAGES.TERI_CODE_EXISTS;
      }
      return error.message;
    }

    // Fall back to code-based message
    if (code && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }

    return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  }

  // Handle standard errors
  if (error instanceof Error) {
    // Handle specific known patterns
    if (error.message.includes("TERI code already exists")) {
      return ERROR_MESSAGES.TERI_CODE_EXISTS;
    }
    if (error.message.includes("fetch failed") || error.message.includes("network")) {
      return "Network error. Please check your connection and try again.";
    }
    return error.message || ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
}

/**
 * Extract error code from various error types
 */
export function getErrorCode(error: unknown): string {
  if (isTRPCClientError(error)) {
    const data = error.data as Record<string, unknown> | undefined;
    const code = data?.code;
    return (code as string) || "UNKNOWN";
  }

  if (error instanceof Error) {
    if (error.message.includes("TERI code already exists")) {
      return "TERI_CODE_EXISTS";
    }
    if (error.message.includes("fetch failed") || error.message.includes("network")) {
      return "NETWORK_ERROR";
    }
  }

  return "UNKNOWN";
}

/**
 * Extract field-level errors from Zod validation errors
 * Returns a map of field names to error messages
 */
export function extractFieldErrors(error: unknown): Record<string, string[]> | undefined {
  if (!isTRPCClientError(error)) {
    return undefined;
  }

  // Check if this is a Zod validation error
  // tRPC wraps Zod errors in a specific format
  try {
    const data = error.data as Record<string, unknown> | undefined;
    const zodError = data?.zodError as { fieldErrors?: Record<string, string[]> } | undefined;

    if (zodError?.fieldErrors) {
      return zodError.fieldErrors;
    }

    // Also check the shape property
    const shape = error.shape as { data?: { zodError?: { fieldErrors?: Record<string, string[]> } } } | undefined;
    if (shape?.data?.zodError?.fieldErrors) {
      return shape.data.zodError.fieldErrors;
    }
  } catch {
    // Not a Zod error, return undefined
  }

  return undefined;
}

/**
 * Create a normalized AppErrorInfo from any error
 */
export function normalizeError(error: unknown): AppErrorInfo {
  return {
    message: getErrorMessage(error),
    code: getErrorCode(error),
    fieldErrors: extractFieldErrors(error),
    cause: error,
  };
}

/**
 * Check if an error is a specific type
 */
export function isErrorCode(error: unknown, code: string): boolean {
  return getErrorCode(error) === code;
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === "UNAUTHORIZED" || code === "FORBIDDEN";
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("fetch failed") ||
           message.includes("network") ||
           message.includes("connection");
  }
  return false;
}

/**
 * Log error with context for debugging
 * In production, this could be sent to a monitoring service
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const normalized = normalizeError(error);

  console.error("[TERP Error]", {
    message: normalized.message,
    code: normalized.code,
    fieldErrors: normalized.fieldErrors,
    context,
    // Only include cause in development
    ...(import.meta.env.DEV && { cause: normalized.cause }),
  });
}
