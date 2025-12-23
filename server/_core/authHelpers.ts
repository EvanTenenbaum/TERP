import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import { getAuthenticatedUserId } from "./trpc";

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
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to perform this action",
    });
  }

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
    return userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
