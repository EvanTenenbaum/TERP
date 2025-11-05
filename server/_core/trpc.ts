import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { sanitizeUserInput } from "./sanitization";
import { logger } from "./logger";
import { AppError } from "./errors";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeInput(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  // Handle strings
  if (typeof input === "string") {
    return sanitizeUserInput(input);
  }

  // Handle arrays
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  // Handle objects
  if (typeof input === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  // Return primitives as-is
  return input;
}

/**
 * Global error handling middleware for tRPC procedures
 * Automatically logs all errors and converts AppError to TRPCError
 * ✅ ADDED: P0.1 Error Handling - Global middleware
 */
export const errorHandlingMiddleware = t.middleware(
  async ({ next, path, type }) => {
    try {
      return await next();
    } catch (error) {
      // Log all errors with context
      logger.error(
        {
          error,
          path,
          type,
          errorType:
            error instanceof Error ? error.constructor.name : typeof error,
        },
        `tRPC procedure error in ${path}`
      );

      // Convert AppError to TRPCError with proper code mapping
      if (error instanceof AppError) {
        throw new TRPCError({
          code: mapAppErrorCode(error.code),
          message: error.message,
          cause: error,
        });
      }

      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error;
      }

      // Convert unknown errors to generic TRPCError
      if (error instanceof Error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred. Please try again.",
          cause: error,
        });
      }

      // Handle non-Error objects
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unknown error occurred.",
      });
    }
  }
);

/**
 * Map AppError codes to TRPCError codes
 */
function mapAppErrorCode(code: string): TRPCError["code"] {
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

/**
 * Sanitization middleware for tRPC procedures
 * Automatically sanitizes all string inputs to prevent XSS attacks
 */
export const sanitizationMiddleware = t.middleware(async ({ next, input }) => {
  // Recursively sanitize all string values in the input
  const sanitizedInput = sanitizeInput(input);

  // Log if any sanitization occurred
  if (JSON.stringify(input) !== JSON.stringify(sanitizedInput)) {
    logger.warn({
      msg: "Input sanitization applied",
      original: input,
      sanitized: sanitizedInput,
    });
  }

  // Pass sanitized input to the next middleware/procedure
  return next({
    input: sanitizedInput,
  });
});

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(requireUser);

export const adminProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware)
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });
    })
  );

// Export publicProcedure with all middleware applied
export const publicProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(sanitizationMiddleware);
