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
 *
 * ## PRODUCTION DEPLOYMENT WARNING
 *
 * ⚠️  IDEMPOTENCY LIMITATION: The in-memory cache only works for SINGLE-INSTANCE deployments.
 * ⚠️  For multi-instance/load-balanced deployments, you MUST either:
 *     - Use sticky sessions (not recommended)
 *     - Migrate to Redis-backed idempotency (recommended)
 *     - Use database-backed idempotency table
 *
 * ## CALLER COMPOSITION GUIDE
 *
 * ### Basic usage - wrap a mutation:
 * ```typescript
 * const result = await criticalMutation(
 *   async (tx) => {
 *     await tx.update(batches).set({ onHandQty: sql`onHandQty - ${qty}` });
 *     return { success: true };
 *   },
 *   { domain: "inventory", operation: "allocateBatch" }
 * );
 * ```
 *
 * ### With idempotency (for user-facing APIs):
 * ```typescript
 * await criticalMutation(
 *   async (tx) => { ... },
 *   {
 *     idempotencyKey: `order-${orderId}-payment-${paymentId}`,
 *     domain: "payments",
 *     operation: "recordPayment",
 *   }
 * );
 * ```
 *
 * ### As tRPC handler wrapper:
 * ```typescript
 * recordPayment: protectedProcedure
 *   .input(paymentSchema)
 *   .mutation(withCriticalMutation(
 *     async ({ ctx, input }, tx) => {
 *       // Mutation logic here
 *     },
 *     { domain: "payments", operation: "recordPayment" }
 *   )),
 * ```
 *
 * ### With inventoryLocking (for inventory operations):
 * ```typescript
 * await criticalMutation(
 *   async (tx) => {
 *     return await allocateFromBatch(tx, { batchId, quantity, orderId, userId });
 *   },
 *   {
 *     idempotencyKey: `order-${orderId}-allocate-${batchId}`,
 *     domain: "inventory",
 *     operation: "allocateBatch",
 *   }
 * );
 * ```
 *
 * ### Retry behavior:
 * - Retries on: deadlock, lock wait timeout, serialization failure, connection errors
 * - Does NOT retry on: validation errors, business logic errors, permission errors
 * - Exponential backoff: 100ms, 200ms, 400ms, ...
 * - Default max retries: 3
 */

import { TRPCError } from "@trpc/server";
import { withRetryableTransaction } from "./dbTransaction";
import { logger } from "./logger";
import { env } from "./env";
import { getDb } from "./db";
import { idempotencyKeys } from "../../drizzle/schema";
import { eq, lt } from "drizzle-orm";

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
 * Validate critical mutation options
 * @throws TRPCError if options are invalid
 */
function validateOptions(options: CriticalMutationOptions): void {
  const { maxRetries, timeout, idempotencyKey } = options;

  if (maxRetries !== undefined) {
    if (typeof maxRetries !== "number" || isNaN(maxRetries)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "criticalMutation: maxRetries must be a valid number",
      });
    }
    if (maxRetries < 0 || maxRetries > 10) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `criticalMutation: maxRetries must be between 0 and 10, got ${maxRetries}`,
      });
    }
  }

  if (timeout !== undefined) {
    if (typeof timeout !== "number" || isNaN(timeout)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "criticalMutation: timeout must be a valid number",
      });
    }
    if (timeout <= 0 || timeout > 300) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `criticalMutation: timeout must be between 1 and 300 seconds, got ${timeout}`,
      });
    }
  }

  if (idempotencyKey !== undefined) {
    if (typeof idempotencyKey !== "string") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "criticalMutation: idempotencyKey must be a string",
      });
    }
    if (idempotencyKey.length === 0 || idempotencyKey.length > 255) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `criticalMutation: idempotencyKey must be 1-255 characters, got ${idempotencyKey.length}`,
      });
    }
  }
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
// TER-585: Migrated to database-backed idempotency for multi-instance safety.
//
// Production runs 2-4 instances on DigitalOcean App Platform. The in-memory
// Map cache was broken for multi-instance deployments because each instance
// had its own isolated map. The database-backed implementation shares state
// across all instances.
//
// Feature flag: IDEMPOTENCY_BACKEND env var
//   "db"     (default) — database-backed, multi-instance safe
//   "memory" — in-memory fallback for rollback during incidents
//
// DB implementation uses INSERT IGNORE to handle concurrent duplicate requests
// gracefully — if two instances race on the same key, the second INSERT is
// silently dropped and the first result is returned.
//
// Cleanup: Call cleanupExpiredIdempotencyKeys() from a cron job to purge
// rows older than their expiresAt. The cleanup timer only runs for memory mode.
// ============================================================================

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ---------------------------------------------------------------------------
// In-memory fallback (IDEMPOTENCY_BACKEND=memory)
// ---------------------------------------------------------------------------

interface CachedResult {
  result: unknown;
  expiresAt: number;
}

const idempotencyCache = new Map<string, CachedResult>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function getCachedResultMemory<T>(key: string): T | null {
  const cached = idempotencyCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    idempotencyCache.delete(key);
    return null;
  }
  return cached.result as T;
}

function setCachedResultMemory<T>(key: string, result: T): void {
  idempotencyCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now > value.expiresAt) {
      idempotencyCache.delete(key);
    }
  }
}

/**
 * Start the periodic in-memory cache cleanup timer.
 * No-op when using DB backend. Called automatically in memory mode.
 */
export function startCacheCleanup(): void {
  if (env.idempotencyBackend !== "memory") return;
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredCache, 60 * 60 * 1000); // Every hour
}

/**
 * Stop the periodic in-memory cache cleanup timer.
 * Call during graceful shutdown or in tests to prevent resource leaks.
 */
export function stopCacheCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * Clear the in-memory idempotency cache (useful for testing).
 * No-op when using DB backend.
 */
export function clearIdempotencyCache(): void {
  idempotencyCache.clear();
}

// ---------------------------------------------------------------------------
// Database-backed implementation (IDEMPOTENCY_BACKEND=db, default)
// ---------------------------------------------------------------------------

/**
 * Get cached result for idempotency key from the database.
 * Returns null if not found or expired.
 */
async function getCachedResultDb<T>(key: string): Promise<T | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.key, key))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Respect DB-stored expiry
  if (new Date() > row.expiresAt) {
    return null;
  }

  return row.result as T;
}

/**
 * Store result for idempotency key in the database.
 * Uses INSERT IGNORE to handle concurrent duplicate requests gracefully.
 */
async function setCachedResultDb<T>(
  key: string,
  result: T,
  domain: string,
  operation: string
): Promise<void> {
  const db = await getDb();
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS);

  try {
    await db.insert(idempotencyKeys).values({
      key,
      result: result as Record<string, unknown>,
      domain,
      operation,
      expiresAt,
    });
  } catch (error) {
    // If the key already exists (duplicate key), ignore it.
    // This can happen when two concurrent requests race — the second
    // request's INSERT fails after the first committed, which is safe.
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);
    if (
      message.includes("duplicate entry") ||
      message.includes("unique constraint") ||
      message.includes("er_dup_entry")
    ) {
      logger.debug(
        { key, domain, operation },
        "Idempotency key already exists (concurrent insert), ignoring"
      );
      return;
    }
    logger.error(
      { key, domain, operation, error },
      "Failed to store idempotency key"
    );
    throw error;
  }
}

/**
 * Delete expired rows from the idempotency_keys table.
 * Call this from a cron job to keep the table from growing unbounded.
 * Safe to call concurrently — each instance deletes by timestamp.
 */
export async function cleanupExpiredIdempotencyKeys(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  await db
    .delete(idempotencyKeys) // hard-delete-ok: cache table, no business entity, cleanup by expiry
    .where(lt(idempotencyKeys.expiresAt, now));
  logger.info("Cleaned up expired idempotency keys");
  return 0; // MySQL2 driver does not reliably expose affectedRows via Drizzle's typed return
}

// Start cleanup timer only in memory mode (DB mode doesn't need it)
if (env.idempotencyBackend === "memory") {
  startCacheCleanup();
}

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
 *     await tx.update(batches).set({ onHandQty: sql`onHandQty - ${qty}` });
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
  // Validate options first
  validateOptions(options);

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
    const cached =
      env.idempotencyBackend === "db"
        ? await getCachedResultDb<T>(idempotencyKey)
        : getCachedResultMemory<T>(idempotencyKey);
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
        if (env.idempotencyBackend === "db") {
          await setCachedResultDb(idempotencyKey, result, domain, operation);
        } else {
          setCachedResultMemory(idempotencyKey, result);
        }
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
