import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import { getAuthenticatedUserId } from "./trpc";
import { logger } from "./logger";

/**
 * Get the current authenticated user ID.
 * Throws UNAUTHORIZED if no user is authenticated or if it's a demo user.
 *
 * Use this in mutations that require a real user for audit trails.
 *
 * @param ctx - tRPC context
 * @returns The authenticated user's ID
 * @throws TRPCError with code UNAUTHORIZED if not authenticated or demo user
 */
export function getCurrentUserId(ctx: TrpcContext): number {
  const userId = getAuthenticatedUserId(ctx);

  if (!userId || userId <= 0) {
    // BUG-058: Added logging for auth failures
    logger.warn(
      { operation: 'getCurrentUserId', userId },
      '[Auth] Unauthorized access attempt - no valid user ID'
    );
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

  logger.debug(
    { operation: 'getCurrentUserId', userId },
    '[Auth] User authenticated successfully'
  );
  return userId;
}

/**
 * Get the current user ID, returning null if not authenticated.
 * Use this for optional user context (e.g., logging, analytics).
 *
 * @param ctx - tRPC context
 * @returns The user ID or null if not authenticated
 */
export function getCurrentUserIdOrNull(ctx: TrpcContext): number | null {
  try {
    const userId = getAuthenticatedUserId(ctx);
    if (userId > 0) {
      return userId;
    }
    // BUG-058: Added logging for null user context
    logger.debug(
      { operation: 'getCurrentUserIdOrNull' },
      '[Auth] No authenticated user - returning null'
    );
    return null;
  } catch (error) {
    // BUG-058: Added logging for auth exceptions
    logger.debug(
      { operation: 'getCurrentUserIdOrNull', error: error instanceof Error ? error.message : String(error) },
      '[Auth] Exception getting user ID - returning null'
    );
    return null;
  }
}
