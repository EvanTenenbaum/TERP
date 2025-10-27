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
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Centralized error handler for all tRPC procedures
 * Logs errors with context and converts to TRPCError
 */
export function handleError(error: unknown, context: string): never {
  logger.error(`Error in ${context}`, { error });

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
  };
  return mapping[code] || "INTERNAL_SERVER_ERROR";
}

