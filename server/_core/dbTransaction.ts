import { getDb } from "../db";
import { logger } from "./logger";

/**
 * Execute a callback within a database transaction
 * Automatically rolls back on error
 */
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    try {
      const result = await callback(tx);
      return result;
    } catch (error) {
      logger.error({ error }, "Transaction failed, rolling back");
      throw error;
    }
  });
}

/**
 * Execute a callback within a retryable database transaction
 * Automatically retries on deadlocks and serialization failures
 */
export async function withRetryableTransaction<T>(
  callback: (tx: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback);
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

