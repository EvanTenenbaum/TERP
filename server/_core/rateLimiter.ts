import rateLimit, { type Options } from "express-rate-limit";
import { TRPCError } from "@trpc/server";
import { logger } from "./logger";

/**
 * Base rate limit options shared across limiters
 * Using Partial<Options> to allow type-safe configuration
 */
type RateLimitConfig = Partial<Options>;

/**
 * During oracle/e2e automation we intentionally execute high-volume, bursty
 * API traffic from a single host. Keep production safeguards intact while
 * avoiding false-positive 429s in deterministic QA runs.
 */
function shouldSkipRateLimiting(): boolean {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();

  return (
    nodeEnv === "test" ||
    process.env.ORACLE_RUN_MODE !== undefined ||
    process.env.PLAYWRIGHT_TEST === "true" ||
    process.env.E2E_DISABLE_RATE_LIMIT === "true" ||
    process.env.DISABLE_RATE_LIMIT === "true"
  );
}

/**
 * General API rate limiter
 * Protects against abuse while allowing normal application usage
 *
 * Threshold rationale:
 * - 500 requests per 15 minutes = ~33 req/min = reasonable for interactive apps
 * - Reduced from 1000 to improve security posture
 * - High enough for typical user workflows but catches obvious abuse
 */
const apiLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Reduced from 1000 for better security
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req, _res) => shouldSkipRateLimiting(),
  // Trust proxy headers from DigitalOcean App Platform
};
export const apiLimiter = rateLimit(apiLimiterConfig);

/**
 * Authentication endpoint rate limiter
 * Protects against brute force attacks
 *
 * Threshold rationale:
 * - 10 failed attempts per 15 minutes is reasonable for legitimate users
 * - Increased from 5 to reduce false positives (typos, forgotten passwords)
 * - skipSuccessfulRequests=true means successful logins don't count
 * - Still strict enough to prevent brute force attacks
 */
const authLimiterConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to reduce user friction
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req, _res) => shouldSkipRateLimiting(),
};
export const authLimiter = rateLimit(authLimiterConfig);

/**
 * Strict rate limiter for sensitive operations
 * Used for data modification, financial transactions, and bulk operations
 *
 * Threshold rationale:
 * - 30 requests per minute balances batch operations with security
 * - Reduced from 100 (too permissive) but higher than original 10 (too restrictive)
 * - Suitable for legitimate batch imports while preventing abuse
 * - Apply to: create, update, delete operations on sensitive data
 */
const strictLimiterConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Reduced from 100, balanced approach
  message: "Rate limit exceeded. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req, _res) => shouldSkipRateLimiting(),
};
export const strictLimiter = rateLimit(strictLimiterConfig);

// ============================================================================
// TER-594: Token Bucket Rate Limiter for tRPC Critical Mutations
// ============================================================================
//
// KNOWN LIMITATION: This in-memory implementation only works for single-instance
// deployments. For horizontal scaling, migrate to a Redis-backed token bucket.
//
// Design: Each (userId, operation) pair gets its own token bucket. Tokens refill
// continuously over the window duration. When a request arrives, one token is
// consumed. If no tokens remain, the request is rejected with TOO_MANY_REQUESTS.

/**
 * Configuration for a per-operation rate limit bucket.
 */
export interface TrpcRateLimitConfig {
  /**
   * Window duration in milliseconds.
   * Default: 60000 (60 seconds)
   */
  windowMs?: number;

  /**
   * Maximum requests allowed per window per userId+operation key.
   * Default: 10
   */
  maxRequests?: number;
}

interface TokenBucket {
  /** Available tokens (may be fractional during refill calculation) */
  tokens: number;
  /** Timestamp of the last token refill check (ms since epoch) */
  lastRefillMs: number;
}

/**
 * Capacity information returned after a rate limit check.
 * Callers can surface these values in response headers.
 */
export interface RateLimitInfo {
  /** Remaining tokens in the current window */
  remaining: number;
  /** Max requests per window */
  limit: number;
  /** Milliseconds until the bucket is fully refilled */
  resetAfterMs: number;
}

// Global bucket store — keyed by "userId:operation"
const buckets = new Map<string, TokenBucket>();

// Periodic cleanup to prevent unbounded memory growth (~hourly)
let bucketCleanupTimer: ReturnType<typeof setInterval> | null = null;

function startBucketCleanup(): void {
  if (bucketCleanupTimer) return;
  bucketCleanupTimer = setInterval(
    () => {
      const staleThresholdMs = 60 * 60 * 1000; // 1 hour
      const now = Date.now();
      for (const [key, bucket] of buckets.entries()) {
        if (now - bucket.lastRefillMs > staleThresholdMs) {
          buckets.delete(key);
        }
      }
    },
    60 * 60 * 1000 // run hourly
  );
}

/**
 * Stop the bucket cleanup timer (for tests / graceful shutdown).
 */
export function stopBucketCleanup(): void {
  if (bucketCleanupTimer) {
    clearInterval(bucketCleanupTimer);
    bucketCleanupTimer = null;
  }
}

/**
 * Clear all token buckets (useful in tests).
 */
export function clearTokenBuckets(): void {
  buckets.clear();
}

startBucketCleanup();

/**
 * Check the token bucket for userId + operation and consume one token.
 * Returns rate limit metadata on success.
 * Throws TRPCError(TOO_MANY_REQUESTS) when the bucket is empty.
 *
 * @param userId  - The authenticated user's ID (integer)
 * @param operation - Logical name of the operation (e.g., "recordPayment")
 * @param config  - Per-operation rate limit configuration
 */
export function checkRateLimit(
  userId: number,
  operation: string,
  config: TrpcRateLimitConfig = {}
): RateLimitInfo {
  const windowMs = config.windowMs ?? 60_000;
  const maxRequests = config.maxRequests ?? 10;
  const refillRatePerMs = maxRequests / windowMs;

  const key = `${userId}:${operation}`;
  const now = Date.now();

  let bucket = buckets.get(key);

  if (!bucket) {
    // New bucket starts full
    bucket = { tokens: maxRequests, lastRefillMs: now };
    buckets.set(key, bucket);
  }

  // Refill tokens proportional to elapsed time (continuous token bucket)
  const elapsedMs = now - bucket.lastRefillMs;
  const refilled = elapsedMs * refillRatePerMs;
  bucket.tokens = Math.min(maxRequests, bucket.tokens + refilled);
  bucket.lastRefillMs = now;

  if (bucket.tokens < 1) {
    const msUntilToken = (1 - bucket.tokens) / refillRatePerMs;

    logger.warn(
      {
        userId,
        operation,
        remaining: 0,
        limit: maxRequests,
        retryAfterMs: Math.ceil(msUntilToken),
      },
      "tRPC rate limit exceeded"
    );

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded for operation '${operation}'. Retry after ${Math.ceil(msUntilToken / 1000)}s.`,
    });
  }

  // Consume one token
  bucket.tokens -= 1;

  const remaining = Math.floor(bucket.tokens);
  const resetAfterMs = Math.ceil(
    ((maxRequests - bucket.tokens) / maxRequests) * windowMs
  );

  return { remaining, limit: maxRequests, resetAfterMs };
}

/**
 * tRPC middleware factory for rate-limiting critical mutations.
 * Applies a per-user, per-operation token bucket.
 *
 * IMPORTANT: Only use on `protectedProcedure` chains — the user must be
 * authenticated before this middleware runs. Pass `getAuthenticatedUserId(ctx)`
 * as the userId argument inside the middleware.
 *
 * @example
 * ```typescript
 * // In a tRPC router:
 * import { middleware } from "../_core/trpc";
 * import { checkRateLimit } from "../_core/rateLimiter";
 * import { getAuthenticatedUserId } from "../_core/trpc";
 *
 * const rateLimitedPaymentMutation = protectedProcedure
 *   .use(
 *     middleware(({ ctx, next }) => {
 *       const userId = getAuthenticatedUserId(ctx);
 *       checkRateLimit(userId, "recordPayment", { windowMs: 60_000, maxRequests: 5 });
 *       return next();
 *     })
 *   )
 *   .input(paymentSchema)
 *   .mutation(async ({ ctx, input }) => { ... });
 * ```
 *
 * The rate limit info (remaining/limit/resetAfterMs) is logged but not
 * automatically set in response headers from within tRPC middleware.
 * Surface those values in your router's response object if needed.
 */
export function createTrpcRateLimitMiddleware(
  operation: string,
  config: TrpcRateLimitConfig = {}
) {
  return function trpcRateLimitMiddleware(userId: number): RateLimitInfo {
    return checkRateLimit(userId, operation, config);
  };
}
