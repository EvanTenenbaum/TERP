import { getDb } from "../db";
import { logger } from "./logger";
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
  } = options;

  // IMPORTANT: In MySQL, SET TRANSACTION ISOLATION LEVEL must be executed BEFORE starting the transaction
  // Since Drizzle's db.transaction() starts the transaction immediately, we can't set it per-transaction
  // Instead, we use the default REPEATABLE READ (MySQL default) for all transactions
  // For custom isolation levels, they would need to be set at session level before db.transaction() is called
  // This is a known limitation - custom isolation levels require explicit connection management

  // Note: Setting session-level isolation affects all transactions on that connection
  // With connection pooling, this is generally safe as connections are reused appropriately
  // but we avoid doing it here to prevent unintended side effects

  // For now, we only support the default REPEATABLE READ isolation level
  // Custom isolation levels can be added later if needed via explicit connection management

  // Execute transaction with proper error handling
  return await db.transaction(async tx => {
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

      // Execute callback - use default REPEATABLE READ isolation level
      // Note: If custom isolation level is requested but not REPEATABLE_READ, log a warning
      if (isolationLevel !== TransactionIsolationLevel.REPEATABLE_READ) {
        logger.warn(
          {
            requested: isolationLevel,
            using: TransactionIsolationLevel.REPEATABLE_READ,
          },
          "Custom transaction isolation level requested but not supported - using default REPEATABLE READ"
        );
      }

      return await callback(tx);
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
  options: TransactionOptions & { maxRetries?: number } = {}
): Promise<T> {
  const { maxRetries = 3, ...transactionOptions } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback, transactionOptions);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorMessage = lastError.message.toLowerCase();
      const isRetryable =
        errorMessage.includes("deadlock") ||
        errorMessage.includes("lock wait timeout") ||
        errorMessage.includes("try restarting transaction") ||
        errorMessage.includes("serialization failure");

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = 100 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));

      logger.warn(
        { attempt: attempt + 1, maxRetries, error: lastError.message },
        `Retrying transaction after ${delay}ms`
      );
    }
  }

  throw lastError;
}
