/**
 * REL-004: Critical Mutation Wrapper
 * Provides transactional safety, retry logic, and idempotency for critical mutations
 *
 * Critical mutations are operations that:
 * - Modify financial data (inventory, payments, invoices)
 * - Affect multiple tables atomically
 * - Require audit trails
 *
 * Features:
 * - Automatic transaction wrapping
 * - Configurable retry with exponential backoff
 * - Idempotency key support for duplicate request protection
 * - Structured logging for debugging
 *
 * @see TRUTH_MODEL.md for invariants these mutations must preserve
 */

import { TRPCError } from "@trpc/server";
import { withRetryableTransaction } from "./dbTransaction";
import { logger } from "./logger";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options for critical mutations
 */
export interface CriticalMutationOptions {
  /**
   * Maximum number of retry attempts on transient failures
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Idempotency key to prevent duplicate executions
   * If provided, subsequent calls with the same key return cached result
   */
  idempotencyKey?: string;

  /**
   * Transaction timeout in seconds
   * Default: 30
   */
  timeout?: number;

  /**
   * Domain for logging and metrics
   * e.g., "inventory", "payments", "orders"
   */
  domain?: string;

  /**
   * Operation name for logging
   * e.g., "recordPayment", "allocateBatch"
   */
  operation?: string;

  /**
   * User ID performing the mutation (for audit)
   */
  userId?: number;
}

/**
 * Result of a critical mutation with metadata
 */
export interface CriticalMutationResult<T> {
  success: boolean;
  data: T;
  attempts: number;
  duration: number;
  idempotent?: boolean;
}

// ============================================================================
// IDEMPOTENCY CACHE
// ============================================================================
//
// KNOWN LIMITATION: This in-memory cache only works for single-instance deployments.
// For multi-instance/horizontal scaling, migrate to one of:
// - Redis-backed cache (recommended for production)
// - Database table with idempotency_keys (alternative)
//
// Migration path:
// 1. Create idempotency_keys table with (key, result, expires_at, created_at)
// 2. Replace getCachedResult/setCachedResult with database queries
// 3. Use SELECT ... FOR UPDATE to prevent race conditions
// ============================================================================

interface CachedResult {
  result: unknown;
  expiresAt: number;
}

// In-memory cache with TTL (24 hours default)
const idempotencyCache = new Map<string, CachedResult>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Timer reference for cleanup (allows proper cleanup in tests/shutdown)
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Get cached result for idempotency key
 */
function getCachedResult<T>(key: string): T | null {
  const cached = idempotencyCache.get(key);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    idempotencyCache.delete(key);
    return null;
  }

  return cached.result as T;
}

/**
 * Cache result for idempotency key
 */
function setCachedResult<T>(key: string, result: T): void {
  idempotencyCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Cleanup expired cache entries (called periodically)
 */
function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now > value.expiresAt) {
      idempotencyCache.delete(key);
    }
  }
}

/**
 * Start the periodic cache cleanup timer
 * Called automatically on module load, but can be restarted after stopCacheCleanup()
 */
export function startCacheCleanup(): void {
  if (cleanupTimer) return; // Already running
  cleanupTimer = setInterval(cleanupExpiredCache, 60 * 60 * 1000); // Every hour
}

/**
 * Stop the periodic cache cleanup timer
 * Call this during graceful shutdown or in tests to prevent resource leaks
 */
export function stopCacheCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Clear the idempotency cache (useful for testing)
 */
export function clearIdempotencyCache(): void {
  idempotencyCache.clear();
}

// Start cleanup timer on module load
startCacheCleanup();

// ============================================================================
// CRITICAL MUTATION WRAPPER
// ============================================================================

/**
 * Execute a critical mutation with transaction safety and retry logic
 *
 * @example
 * ```typescript
 * const result = await criticalMutation(
 *   async (tx) => {
 *     // Perform atomic operations
 *     await tx.update(batches).set({ onHandQty: sql`on_hand_qty - ${qty}` });
 *     await tx.insert(inventoryMovements).values({ ... });
 *     return { success: true };
 *   },
 *   {
 *     domain: "inventory",
 *     operation: "allocateBatch",
 *     idempotencyKey: `allocate-${orderId}-${batchId}`,
 *     userId: ctx.user.id,
 *   }
 * );
 * ```
 */
export async function criticalMutation<T>(
  fn: (tx: unknown) => Promise<T>,
  options: CriticalMutationOptions = {}
): Promise<CriticalMutationResult<T>> {
  const {
    maxRetries = 3,
    idempotencyKey,
    timeout = 30,
    domain = "unknown",
    operation = "mutation",
    userId,
  } = options;

  const startTime = Date.now();

  // Check idempotency cache first
  if (idempotencyKey) {
    const cached = getCachedResult<T>(idempotencyKey);
    if (cached !== null) {
      logger.info(
        { domain, operation, idempotencyKey, userId },
        "REL-004: Returning cached result for idempotent request"
      );
      return {
        success: true,
        data: cached,
        attempts: 0,
        duration: Date.now() - startTime,
        idempotent: true,
      };
    }
  }

  let attempts = 0;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts = attempt + 1;

    try {
      const result = await withRetryableTransaction(fn, {
        timeout,
        maxRetries: 0, // We handle retries ourselves
      });

      // Cache result if idempotency key provided
      if (idempotencyKey) {
        setCachedResult(idempotencyKey, result);
      }

      const duration = Date.now() - startTime;

      logger.info(
        { domain, operation, attempts, duration, userId },
        "REL-004: Critical mutation completed successfully"
      );

      return {
        success: true,
        data: result,
        attempts,
        duration,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorMessage = lastError.message.toLowerCase();
      const isRetryable =
        errorMessage.includes("deadlock") ||
        errorMessage.includes("lock wait timeout") ||
        errorMessage.includes("try restarting transaction") ||
        errorMessage.includes("serialization failure") ||
        errorMessage.includes("connection");

      if (!isRetryable || attempt === maxRetries) {
        logger.error(
          {
            domain,
            operation,
            attempts,
            error: lastError.message,
            userId,
            duration: Date.now() - startTime,
          },
          "REL-004: Critical mutation failed permanently"
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Critical mutation failed after ${attempts} attempts: ${lastError.message}`,
          cause: lastError,
        });
      }

      // Exponential backoff: 100ms, 200ms, 400ms, ...
      const delay = 100 * Math.pow(2, attempt);

      logger.warn(
        {
          domain,
          operation,
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message,
          userId,
        },
        `REL-004: Retrying critical mutation after ${delay}ms`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This shouldn't be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Wrap a tRPC mutation handler with critical mutation safety
 * Use this as a higher-order function for consistent error handling
 *
 * @example
 * ```typescript
 * recordPayment: protectedProcedure
 *   .input(paymentSchema)
 *   .mutation(withCriticalMutation(
 *     async ({ ctx, input }, tx) => {
 *       // Your mutation logic here
 *     },
 *     { domain: "payments", operation: "recordPayment" }
 *   )),
 * ```
 */
export function withCriticalMutation<TContext, TInput, TResult>(
  handler: (
    args: { ctx: TContext; input: TInput },
    tx: unknown
  ) => Promise<TResult>,
  baseOptions: Omit<CriticalMutationOptions, "userId"> = {}
) {
  return async ({
    ctx,
    input,
  }: {
    ctx: TContext;
    input: TInput;
  }): Promise<TResult> => {
    // Extract userId from context if available
    const userId = (ctx as { user?: { id?: number } })?.user?.id;

    const result = await criticalMutation(
      async tx => handler({ ctx, input }, tx),
      { ...baseOptions, userId }
    );

    return result.data;
  };
}

export default criticalMutation;
