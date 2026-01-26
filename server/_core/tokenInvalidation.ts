/**
 * Token Invalidation Service
 *
 * TERP-0014: Provides token blacklisting/revocation capabilities for:
 * - JWT tokens (main auth)
 * - VIP Portal session tokens
 * - Admin impersonation tokens
 *
 * Uses an in-memory cache with TTL cleanup. For production at scale,
 * consider using Redis for distributed token invalidation.
 *
 * @module server/_core/tokenInvalidation
 */

import { logger } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

interface InvalidatedToken {
  /** The token or token ID that was invalidated */
  tokenId: string;
  /** When the token was invalidated */
  invalidatedAt: Date;
  /** When the token would have expired (for cleanup) */
  expiresAt: Date;
  /** Reason for invalidation */
  reason: TokenInvalidationReason;
  /** User ID who invalidated the token (if applicable) */
  invalidatedBy?: number;
}

export type TokenInvalidationReason =
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "ADMIN_REVOKE"
  | "SUSPICIOUS_ACTIVITY"
  | "SESSION_EXPIRED"
  | "TOKEN_REFRESH";

export interface InvalidateTokenInput {
  /** Token or token identifier to invalidate */
  tokenId: string;
  /** Reason for invalidation */
  reason: TokenInvalidationReason;
  /** When the original token expires (for cleanup) */
  tokenExpiresAt?: Date;
  /** User who invalidated the token */
  invalidatedBy?: number;
}

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

// Map of invalidated tokens: tokenId -> InvalidatedToken
const invalidatedTokens = new Map<string, InvalidatedToken>();

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// Default token TTL if not provided (24 hours)
const DEFAULT_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Invalidate a token (add to blacklist)
 *
 * @param input - Token invalidation details
 */
export function invalidateToken(input: InvalidateTokenInput): void {
  const {
    tokenId,
    reason,
    tokenExpiresAt = new Date(Date.now() + DEFAULT_TOKEN_TTL_MS),
    invalidatedBy,
  } = input;

  const entry: InvalidatedToken = {
    tokenId,
    invalidatedAt: new Date(),
    expiresAt: tokenExpiresAt,
    reason,
    invalidatedBy,
  };

  invalidatedTokens.set(tokenId, entry);

  logger.info(
    {
      tokenId: tokenId.substring(0, 10) + "...",
      reason,
      invalidatedBy,
    },
    "Token invalidated"
  );
}

/**
 * Check if a token is invalidated (blacklisted)
 *
 * @param tokenId - Token or token identifier to check
 * @returns true if the token is invalidated, false otherwise
 */
export function isTokenInvalidated(tokenId: string): boolean {
  return invalidatedTokens.has(tokenId);
}

/**
 * Get invalidation details for a token
 *
 * @param tokenId - Token to look up
 * @returns Invalidation details or null if not invalidated
 */
export function getTokenInvalidation(tokenId: string): InvalidatedToken | null {
  return invalidatedTokens.get(tokenId) || null;
}

/**
 * Invalidate all tokens for a user (e.g., on password change)
 *
 * Note: This requires tokens to include user ID in the tokenId.
 * For JWTs, use the jti (JWT ID) claim.
 *
 * @param userId - User ID whose tokens should be invalidated
 * @param reason - Reason for invalidation
 */
export function invalidateUserTokens(
  userId: number,
  reason: TokenInvalidationReason
): void {
  // For user-scoped invalidation, we store a marker
  const markerKey = `user:${userId}:invalidated`;
  const entry: InvalidatedToken = {
    tokenId: markerKey,
    invalidatedAt: new Date(),
    expiresAt: new Date(Date.now() + DEFAULT_TOKEN_TTL_MS),
    reason,
    invalidatedBy: userId,
  };

  invalidatedTokens.set(markerKey, entry);

  logger.info(
    { userId, reason },
    "All tokens invalidated for user"
  );
}

/**
 * Check if user's tokens have been bulk-invalidated
 *
 * @param userId - User ID to check
 * @param tokenIssuedAt - When the token was issued
 * @returns true if the token should be considered invalid
 */
export function isUserTokensInvalidated(
  userId: number,
  tokenIssuedAt: Date
): boolean {
  const markerKey = `user:${userId}:invalidated`;
  const marker = invalidatedTokens.get(markerKey);

  if (!marker) {
    return false;
  }

  // Token is invalid if it was issued before the invalidation
  return tokenIssuedAt < marker.invalidatedAt;
}

// ============================================================================
// VIP PORTAL SESSION INVALIDATION
// ============================================================================

/**
 * Invalidate a VIP Portal session token
 *
 * @param sessionToken - The session token to invalidate
 * @param reason - Reason for invalidation
 */
export function invalidateVipSession(
  sessionToken: string,
  reason: TokenInvalidationReason
): void {
  invalidateToken({
    tokenId: `vip:${sessionToken}`,
    reason,
    tokenExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // VIP sessions last 2 hours
  });
}

/**
 * Check if a VIP Portal session is invalidated
 *
 * @param sessionToken - The session token to check
 * @returns true if the session is invalidated
 */
export function isVipSessionInvalidated(sessionToken: string): boolean {
  return isTokenInvalidated(`vip:${sessionToken}`);
}

// ============================================================================
// ADMIN IMPERSONATION TOKEN INVALIDATION
// ============================================================================

/**
 * Invalidate an admin impersonation token
 *
 * @param impersonationToken - The impersonation token to invalidate
 * @param adminUserId - The admin who performed the action
 */
export function invalidateImpersonationToken(
  impersonationToken: string,
  adminUserId: number
): void {
  invalidateToken({
    tokenId: `imp:${impersonationToken}`,
    reason: "ADMIN_REVOKE",
    tokenExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // Impersonation lasts 2 hours
    invalidatedBy: adminUserId,
  });
}

/**
 * Check if an impersonation token is invalidated
 *
 * @param impersonationToken - The impersonation token to check
 * @returns true if the token is invalidated
 */
export function isImpersonationTokenInvalidated(impersonationToken: string): boolean {
  return isTokenInvalidated(`imp:${impersonationToken}`);
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clean up expired tokens from the blacklist
 * This prevents memory growth from accumulating old tokens
 */
export function cleanupExpiredTokens(): number {
  const now = new Date();
  let removedCount = 0;

  for (const [tokenId, entry] of invalidatedTokens.entries()) {
    if (entry.expiresAt < now) {
      invalidatedTokens.delete(tokenId);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    logger.debug({ removedCount }, "Cleaned up expired invalidated tokens");
  }

  return removedCount;
}

/**
 * Get statistics about the token blacklist
 */
export function getTokenInvalidationStats(): {
  totalInvalidated: number;
  byReason: Record<TokenInvalidationReason, number>;
} {
  const byReason: Record<TokenInvalidationReason, number> = {
    LOGOUT: 0,
    PASSWORD_CHANGE: 0,
    ADMIN_REVOKE: 0,
    SUSPICIOUS_ACTIVITY: 0,
    SESSION_EXPIRED: 0,
    TOKEN_REFRESH: 0,
  };

  for (const entry of invalidatedTokens.values()) {
    byReason[entry.reason]++;
  }

  return {
    totalInvalidated: invalidatedTokens.size,
    byReason,
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Start cleanup interval
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

export function startTokenCleanup(): void {
  if (cleanupInterval) {
    return; // Already started
  }

  cleanupInterval = setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);
  logger.info("Token invalidation cleanup started");
}

export function stopTokenCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info("Token invalidation cleanup stopped");
  }
}

// Auto-start cleanup in non-test environments
if (process.env.NODE_ENV !== "test") {
  startTokenCleanup();
}
