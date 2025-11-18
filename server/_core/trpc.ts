import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { sanitizeUserInput } from "./sanitization";
import { logger } from "./logger";
import { createErrorHandlingMiddleware } from "./errorHandling";
import { performanceMiddleware } from "./performanceMiddleware";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
// Global error handling middleware applied to all procedures
const errorHandlingMiddleware = createErrorHandlingMiddleware();

export const publicProcedure = t.procedure.use(errorHandlingMiddleware);
export const middleware = t.middleware;

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeInput(input: any): any {
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
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  // Return primitives as-is
  return input;
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
  .use(performanceMiddleware)
  .use(sanitizationMiddleware)
  .use(requireUser);

export const adminProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(performanceMiddleware)
  .use(sanitizationMiddleware)
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user || ctx.user.role !== 'admin') {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });
    }),
  );

