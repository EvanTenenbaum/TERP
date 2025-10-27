import { middleware } from "./trpc";
import { sanitizeUserInput } from "./sanitization";
import { logger } from "./logger";

/**
 * Sanitization middleware for tRPC procedures
 * Automatically sanitizes all string inputs to prevent XSS attacks
 */
export const sanitizationMiddleware = middleware(async ({ next, input }) => {
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

