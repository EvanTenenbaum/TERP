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
 * BUG-046: Differentiated auth error messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  // tRPC standard codes - BUG-046: Clearer auth messages
  UNAUTHORIZED: "Please log in to continue.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  BAD_REQUEST: "Invalid request. Please check your input.",
  CONFLICT: "This action conflicts with existing data.",
  INTERNAL_SERVER_ERROR: "An unexpected error occurred. Please try again.",
  TIMEOUT: "The request timed out. Please try again.",
  TOO_MANY_REQUESTS: "Too many requests. Please slow down.",

  // Custom TERP codes
  TERI_CODE_EXISTS:
    "This TERI code already exists. Please use a different code.",
  INSUFFICIENT_QUANTITY: "Insufficient quantity available.",
  INVALID_TRANSITION: "This status change is not allowed.",
};

/**
 * BUG-046: Auth error type detection
 */
export type AuthErrorType =
  | "NOT_LOGGED_IN"
  | "SESSION_EXPIRED"
  | "DEMO_USER_RESTRICTED"
  | "PERMISSION_DENIED"
  | "UNKNOWN";

/**
 * Type guard for tRPC client errors
 */
export function isTRPCClientError(
  error: unknown
): error is TRPCClientError<AppRouter> {
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
    if (
      error.message.includes("fetch failed") ||
      error.message.includes("network")
    ) {
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
 * BUG-046 FIX: Enhanced error code extraction to handle tRPC error shapes correctly
 */
export function getErrorCode(error: unknown): string {
  if (isTRPCClientError(error)) {
    // BUG-046 FIX: tRPC errors can have code in multiple locations depending on version
    // Check .data.code first (tRPC v10+)
    const data = error.data as Record<string, unknown> | undefined;
    if (data?.code) {
      return data.code as string;
    }

    // BUG-046 FIX: Check .shape.data.code (alternative tRPC structure)
    const shape = error.shape as { data?: { code?: string } } | undefined;
    if (shape?.data?.code) {
      return shape.data.code;
    }

    // BUG-046 FIX: Check the error's code property directly (tRPC v11+)
    const errorWithCode = error as { code?: string };
    if (errorWithCode.code) {
      return errorWithCode.code;
    }

    // BUG-046 FIX: Parse from message as last resort for known patterns
    // Use optional chaining and nullish coalescing for safety
    const message = (error.message ?? "").toLowerCase();
    if (
      message.includes("permission denied") ||
      message.includes("do not have permission") ||
      message.includes("not have permission") ||
      message.includes("access denied") ||
      message.includes("forbidden") ||
      message.includes("required permission:")
    ) {
      return "FORBIDDEN";
    }
    if (
      message.includes("authentication required") ||
      message.includes("please log in") ||
      message.includes("not authenticated") ||
      message.includes("login required") ||
      message.includes("unauthorized")
    ) {
      return "UNAUTHORIZED";
    }

    return "UNKNOWN";
  }

  if (error instanceof Error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("teri code already exists")) {
      return "TERI_CODE_EXISTS";
    }
    if (message.includes("fetch failed") || message.includes("network")) {
      return "NETWORK_ERROR";
    }
    // BUG-046 FIX: Also detect auth errors from generic Error instances
    if (
      message.includes("permission denied") ||
      message.includes("do not have permission") ||
      message.includes("forbidden") ||
      message.includes("access denied")
    ) {
      return "FORBIDDEN";
    }
    if (
      message.includes("authentication required") ||
      message.includes("please log in") ||
      message.includes("unauthorized")
    ) {
      return "UNAUTHORIZED";
    }
  }

  return "UNKNOWN";
}

/**
 * Extract field-level errors from Zod validation errors
 * Returns a map of field names to error messages
 */
export function extractFieldErrors(
  error: unknown
): Record<string, string[]> | undefined {
  if (!isTRPCClientError(error)) {
    return undefined;
  }

  // Check if this is a Zod validation error
  // tRPC wraps Zod errors in a specific format
  try {
    const data = error.data as Record<string, unknown> | undefined;
    const zodError = data?.zodError as
      | { fieldErrors?: Record<string, string[]> }
      | undefined;

    if (zodError?.fieldErrors) {
      return zodError.fieldErrors;
    }

    // Also check the shape property
    const shape = error.shape as
      | { data?: { zodError?: { fieldErrors?: Record<string, string[]> } } }
      | undefined;
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
 * BUG-046 FIX: More comprehensive auth error detection
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
    return true;
  }

  // BUG-046 FIX: Also check auth error type for edge cases
  // where code extraction fails but message indicates auth error
  const authType = getAuthErrorType(error);
  return (
    authType === "NOT_LOGGED_IN" ||
    authType === "SESSION_EXPIRED" ||
    authType === "PERMISSION_DENIED" ||
    authType === "DEMO_USER_RESTRICTED"
  );
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("connection")
    );
  }
  return false;
}

/**
 * Log error with context for debugging
 * In production, this could be sent to a monitoring service
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
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

/**
 * BUG-046: Determine the specific type of auth error
 * Enhanced to use getErrorCode for consistent code extraction
 */
export function getAuthErrorType(error: unknown): AuthErrorType {
  // BUG-046 FIX: Handle both tRPC errors and regular errors
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase();

  // Check for session expiry first (before checking code)
  if (message.includes("session") && message.includes("expired")) {
    return "SESSION_EXPIRED";
  }

  // Check for demo user restriction
  if (
    message.includes("demo") ||
    message.includes("not available in demo") ||
    message.includes("public user") ||
    message.includes("public users can only")
  ) {
    return "DEMO_USER_RESTRICTED";
  }

  // BUG-046 FIX: Use getErrorCode for consistent extraction across tRPC versions
  const code = getErrorCode(error);

  // Differentiate by error code
  if (code === "UNAUTHORIZED") {
    return "NOT_LOGGED_IN";
  }

  if (code === "FORBIDDEN") {
    return "PERMISSION_DENIED";
  }

  // BUG-046 FIX: Additional message-based detection for edge cases
  // Permission-related patterns (more specific first)
  if (
    message.includes("do not have permission") ||
    message.includes("not have permission") ||
    message.includes("required permission:") ||
    message.includes("access denied") ||
    message.includes("not allowed") ||
    message.includes("forbidden")
  ) {
    return "PERMISSION_DENIED";
  }

  // Authentication-related patterns
  if (
    message.includes("log in") ||
    message.includes("authentication required") ||
    message.includes("not authenticated") ||
    message.includes("login required")
  ) {
    return "NOT_LOGGED_IN";
  }

  return "UNKNOWN";
}

/**
 * BUG-046: Auth-specific error info with action
 */
export interface AuthErrorInfo {
  type: AuthErrorType;
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

/**
 * BUG-046: Get auth-specific error message and action
 */
export function getAuthErrorInfo(error: unknown): AuthErrorInfo {
  const type = getAuthErrorType(error);
  const originalMessage = getErrorMessage(error);

  switch (type) {
    case "NOT_LOGGED_IN":
      return {
        type,
        title: "Login Required",
        message: "Please log in to access this feature.",
        action: {
          label: "Log In",
          href: `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
        },
      };

    case "SESSION_EXPIRED":
      return {
        type,
        title: "Session Expired",
        message: "Your session has expired. Please log in again.",
        action: {
          label: "Log In Again",
          href: `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
        },
      };

    case "DEMO_USER_RESTRICTED":
      return {
        type,
        title: "Demo Mode Restriction",
        message:
          originalMessage ||
          "This feature is not available in demo mode. Please log in with a full account.",
        action: {
          label: "Log In",
          href: `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
        },
      };

    case "PERMISSION_DENIED": {
      // BUG-046 FIX: Extract and display the required permission if available
      const permissionMatch = originalMessage.match(
        /required permission[s]?:\s*([^\s.]+)/i
      );
      const requiredPermission = permissionMatch?.[1];

      let message = originalMessage;
      if (requiredPermission) {
        message = `You do not have the "${requiredPermission}" permission required to access this feature. Please contact your administrator to request access.`;
      } else if (!message || message === ERROR_MESSAGES.FORBIDDEN) {
        message =
          "You do not have permission to access this feature. Please contact your administrator if you believe this is an error.";
      }

      return {
        type,
        title: "Access Denied",
        message,
      };
    }

    default:
      return {
        type,
        title: "Authentication Error",
        message: originalMessage || "An authentication error occurred.",
      };
  }
}

/**
 * BUG-046: Check if error is unauthorized (not logged in)
 */
export function isUnauthorizedError(error: unknown): boolean {
  return getErrorCode(error) === "UNAUTHORIZED";
}

/**
 * BUG-046: Check if error is forbidden (no permission)
 */
export function isForbiddenError(error: unknown): boolean {
  return getErrorCode(error) === "FORBIDDEN";
}

/**
 * BUG-046: Check if error is demo user restriction
 */
export function isDemoUserError(error: unknown): boolean {
  return getAuthErrorType(error) === "DEMO_USER_RESTRICTED";
}

/**
 * BUG-097: Standardized error toast messages by action type
 * Maps common actions to user-friendly error messages
 */
const ACTION_ERROR_MESSAGES: Record<string, string> = {
  // CRUD operations
  create: "Unable to create",
  update: "Unable to save changes",
  delete: "Unable to delete",
  save: "Unable to save",
  load: "Unable to load data",
  fetch: "Unable to load data",
  export: "Unable to export",
  import: "Unable to import",
  send: "Unable to send",
  submit: "Unable to submit",

  // Domain-specific
  login: "Unable to log in",
  logout: "Unable to log out",
  upload: "Unable to upload file",
  download: "Unable to download",
  copy: "Unable to copy",
  share: "Unable to share",
  convert: "Unable to convert",
  generate: "Unable to generate",
};

/**
 * BUG-097: Options for showErrorToast
 */
export interface ShowErrorToastOptions {
  /** The action being performed (e.g., "create", "update", "delete") */
  action?: string;
  /** The resource being acted upon (e.g., "client", "order", "invoice") */
  resource?: string;
  /** Custom fallback message if error message is empty */
  fallback?: string;
  /** Additional context for logging */
  context?: Record<string, unknown>;
  /** Description to show in toast (additional details) */
  description?: string;
}

/**
 * BUG-097: Show a standardized error toast with consistent messaging
 *
 * This is the recommended way to show error toasts across the app.
 * It provides:
 * - Consistent error message formatting
 * - User-friendly messages for common error codes
 * - Automatic error logging
 * - Optional context-aware descriptions
 *
 * @example
 * ```tsx
 * // Simple usage
 * try {
 *   await mutation.mutateAsync(data);
 * } catch (error) {
 *   showErrorToast(error, { action: "save", resource: "client" });
 * }
 *
 * // With custom description
 * showErrorToast(error, {
 *   action: "create",
 *   resource: "order",
 *   description: "Please check your order details and try again."
 * });
 * ```
 */
export function showErrorToast(
  error: unknown,
  options: ShowErrorToastOptions = {}
): void {
  const { action, resource, fallback, context, description } = options;
  const errorInfo = normalizeError(error);

  // Log the error for debugging
  logError(error, { ...context, action, resource });

  // Build the error message
  let message: string;

  // Check for specific error codes that have good default messages
  if (errorInfo.code !== "UNKNOWN" && ERROR_MESSAGES[errorInfo.code]) {
    message = ERROR_MESSAGES[errorInfo.code];
  } else if (errorInfo.message && !errorInfo.message.includes("INTERNAL_SERVER_ERROR")) {
    // Use the error's message if it's not a generic internal error
    message = errorInfo.message;
  } else if (action && resource) {
    // Build a contextual message
    const actionMessage = ACTION_ERROR_MESSAGES[action.toLowerCase()] || `Unable to ${action}`;
    message = `${actionMessage} ${resource}. Please try again.`;
  } else if (action) {
    message = ACTION_ERROR_MESSAGES[action.toLowerCase()] || `Unable to ${action}. Please try again.`;
  } else if (fallback) {
    message = fallback;
  } else {
    message = "An error occurred. Please try again.";
  }

  // Import toast dynamically to avoid circular dependencies
  import("sonner").then(({ toast }) => {
    toast.error(message, description ? { description } : undefined);
  });
}

/**
 * BUG-097: Create a bound error handler for a specific context
 * Useful for creating consistent error handlers within a component
 *
 * @example
 * ```tsx
 * const handleError = createErrorHandler({ resource: "invoice" });
 *
 * // Later in code:
 * try {
 *   await createInvoice();
 * } catch (error) {
 *   handleError(error, { action: "create" });
 * }
 * ```
 */
export function createErrorHandler(
  defaultOptions: Omit<ShowErrorToastOptions, "action">
): (error: unknown, options?: Pick<ShowErrorToastOptions, "action" | "description">) => void {
  return (error, options) => {
    showErrorToast(error, { ...defaultOptions, ...options });
  };
}
