import { getDb } from "../db";
import { logger } from "./logger";
import { env } from "./env";
import { sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type * as schema from "../../drizzle/schema";

/**
 * Transaction type for database operations
 * This is the same as the database type since Drizzle transactions
 * provide the same interface as the database connection
 */
export type DbTransaction = MySql2Database<typeof schema>;

/**
 * Transaction isolation levels (MySQL)
 */
export enum TransactionIsolationLevel {
  READ_UNCOMMITTED = "READ UNCOMMITTED",
  READ_COMMITTED = "READ COMMITTED",
  REPEATABLE_READ = "REPEATABLE READ",
  SERIALIZABLE = "SERIALIZABLE",
}

/**
 * Transaction configuration options
 */
export interface TransactionOptions {
  /**
   * Isolation level for the transaction
   * Default: REPEATABLE_READ (MySQL default)
   */
  isolationLevel?: TransactionIsolationLevel;

  /**
   * Transaction timeout in seconds
   * Default: 30 seconds
   */
  timeout?: number;

  /**
   * Query execution timeout in milliseconds, applied via MySQL max_execution_time.
   * When not provided, falls back to QUERY_TIMEOUT_MS env var (default: 30000).
   * Set to 0 to disable query-level timeout.
   */
  queryTimeoutMs?: number;
}

/**
 * Execute a callback within a database transaction
 * Automatically rolls back on error
 *
 * @param callback Function to execute within the transaction
 * @param options Transaction configuration options
 * @returns Result of the callback
 */
export async function withTransaction<T>(
  callback: (tx: DbTransaction) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    isolationLevel = TransactionIsolationLevel.REPEATABLE_READ,
    timeout = 30,
    queryTimeoutMs: queryTimeoutMsOpt,
  } = options;

  // Resolve query timeout: explicit option > env var > 0 (no limit)
  const queryTimeoutMs =
    queryTimeoutMsOpt !== undefined ? queryTimeoutMsOpt : env.QUERY_TIMEOUT_MS;
  const warningThresholdMs = Math.floor(queryTimeoutMs * 0.8);

  // IMPORTANT: In MySQL, SET TRANSACTION ISOLATION LEVEL must be executed BEFORE starting
  // the transaction. We set it at session level prior to calling db.transaction(), then
  // reset to the MySQL default (REPEATABLE READ) after the transaction completes.
  // This approach works safely with connection pooling because each pooled connection
  // is used by one request at a time; we restore the default before returning the
  // connection to the pool.

  const useDefaultIsolation =
    isolationLevel === TransactionIsolationLevel.REPEATABLE_READ;

  if (!useDefaultIsolation) {
    try {
      await db.execute(
        sql.raw(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`)
      );
      logger.info(
        { isolationLevel },
        "Set session transaction isolation level"
      );
    } catch (error) {
      logger.warn(
        { error, isolationLevel },
        "Failed to set transaction isolation level, using session default"
      );
    }
  }

  // Execute transaction with proper error handling
  let result: T;
  try {
    result = await db.transaction(async tx => {
      try {
        // Set lock wait timeout for this transaction's connection
        // This is safe because it only affects lock acquisition time, not transaction isolation
        try {
          await tx.execute(
            sql.raw(`SET SESSION innodb_lock_wait_timeout = ${timeout}`)
          );
        } catch (error) {
          logger.warn(
            { error, timeout },
            "Failed to set lock wait timeout, using default"
          );
        }

        // Set query-level execution timeout (max_execution_time, in milliseconds)
        // MySQL will automatically kill queries that exceed this limit.
        // A value of 0 disables the per-query timeout.
        if (queryTimeoutMs > 0) {
          try {
            await tx.execute(
              sql.raw(`SET SESSION max_execution_time = ${queryTimeoutMs}`)
            );
          } catch (error) {
            logger.warn(
              { error, queryTimeoutMs },
              "Failed to set max_execution_time; continuing without query timeout"
            );
          }
        }

        const txStartMs = Date.now();
        const result = await callback(tx);
        const elapsed = Date.now() - txStartMs;

        // Warn if elapsed time approaches the timeout threshold
        if (queryTimeoutMs > 0 && elapsed >= warningThresholdMs) {
          logger.warn(
            { elapsed, queryTimeoutMs, warningThresholdMs },
            "Transaction elapsed time exceeded 80% of query timeout threshold"
          );
        }

        return result;
      } catch (error) {
        logger.error(
          {
            error,
            isolationLevel,
            timeout,
          },
          "Transaction failed, rolling back"
        );
        throw error;
      }
    });
  } finally {
    // Always reset isolation level to MySQL default after the transaction,
    // regardless of success or failure, so the pooled connection is clean.
    if (!useDefaultIsolation) {
      try {
        await db.execute(
          sql.raw(
            `SET SESSION TRANSACTION ISOLATION LEVEL ${TransactionIsolationLevel.REPEATABLE_READ}`
          )
        );
      } catch (resetError) {
        logger.warn(
          { error: resetError, isolationLevel },
          "Failed to reset transaction isolation level to default after transaction"
        );
      }
    }
  }

  return result;
}

/**
 * Execute a callback within a retryable database transaction
 * Automatically retries on deadlocks and serialization failures
 *
 * @param callback Function to execute within the transaction
 * @param options Transaction configuration options
 * @param maxRetries Maximum number of retry attempts
 * @returns Result of the callback
 */
export async function withRetryableTransaction<T>(
  callback: (tx: DbTransaction) => Promise<T>,
  options: TransactionOptions & {
    maxRetries?: number;
    retryOnDuplicateKey?: boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryOnDuplicateKey = false,
    ...transactionOptions
  } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback, transactionOptions);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorCode =
        getErrorCode(error) ?? getErrorCode(lastError.cause) ?? "UNKNOWN";
      const isRetryable = isRetryableTransactionError(
        error,
        retryOnDuplicateKey
      );

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = 100 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));

      logger.warn(
        {
          attempt: attempt + 1,
          maxRetries,
          error: lastError.message,
          errorCode,
        },
        `Retrying transaction after ${delay}ms`
      );
    }
  }

  throw lastError;
}

function isRetryableTransactionError(
  error: unknown,
  retryOnDuplicateKey: boolean
): boolean {
  const errorMessage = getErrorMessage(error).toLowerCase();
  const errorCode = (getErrorCode(error) ?? "").toUpperCase();

  // Retry only transient transaction conflicts.
  const transientConflict =
    errorMessage.includes("deadlock") ||
    errorMessage.includes("lock wait timeout") ||
    errorMessage.includes("try restarting transaction") ||
    errorMessage.includes("serialization failure") ||
    errorCode === "ER_LOCK_DEADLOCK" ||
    errorCode === "ER_LOCK_WAIT_TIMEOUT";

  if (transientConflict) return true;

  if (!retryOnDuplicateKey) return false;

  return (
    errorCode === "ER_DUP_ENTRY" ||
    errorCode === "1062" ||
    errorMessage.includes("duplicate entry")
  );
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const code =
    "code" in error && typeof error.code === "string"
      ? error.code
      : "errno" in error &&
          (typeof error.errno === "number" || typeof error.errno === "string")
        ? String(error.errno)
        : undefined;

  if (code) return code;

  if ("cause" in error) {
    return getErrorCode(error.cause);
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const value = error.message;
    if (typeof value === "string") return value;
  }
  if (error && typeof error === "object" && "cause" in error) {
    return getErrorMessage(error.cause);
  }
  return "";
}
