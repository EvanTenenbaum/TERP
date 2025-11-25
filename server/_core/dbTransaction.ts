import { getDb } from "../db";
import { logger } from "./logger";
import { sql } from "drizzle-orm";

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
  callback: (tx: any) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    isolationLevel = TransactionIsolationLevel.REPEATABLE_READ,
    timeout = 30,
  } = options;

  // Set session-level isolation level before transaction (if different from default)
  // Note: In MySQL, isolation level can be set per-transaction or per-session
  // We set it at session level before the transaction for reliability
  if (isolationLevel && isolationLevel !== TransactionIsolationLevel.REPEATABLE_READ) {
    try {
      await db.execute(sql.raw(`SET SESSION TRANSACTION ISOLATION LEVEL ${isolationLevel}`));
    } catch (error) {
      logger.warn({ error, isolationLevel }, "Failed to set transaction isolation level, using default");
    }
  }
  
  // Set lock wait timeout for the session
  try {
    await db.execute(sql.raw(`SET SESSION innodb_lock_wait_timeout = ${timeout}`));
  } catch (error) {
    logger.warn({ error, timeout }, "Failed to set lock wait timeout, using default");
  }

  // Wrap transaction in timeout at application level
  const transactionPromise = db.transaction(async (tx) => {
    try {
      const result = await callback(tx);
      return result;
    } catch (error) {
      logger.error({ 
        error, 
        isolationLevel,
        timeout 
      }, "Transaction failed, rolling back");
      throw error;
    }
  });

  // Apply application-level timeout wrapper
  // Note: This doesn't cancel the DB transaction, but prevents the call from hanging
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Transaction timeout after ${timeout} seconds`));
    }, timeout * 1000);
  });

  return Promise.race([transactionPromise, timeoutPromise]);
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
  callback: (tx: any) => Promise<T>,
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
      await new Promise((resolve) => setTimeout(resolve, delay));

      logger.warn(
        { attempt: attempt + 1, maxRetries, error: lastError.message },
        `Retrying transaction after ${delay}ms`
      );
    }
  }

  throw lastError;
}

