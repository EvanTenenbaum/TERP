/**
 * Database Transaction Utilities
 * Provides transaction support for critical operations
 * 
 * Note: MySQL transactions in Drizzle ORM require connection pooling
 * This is a simplified version - production should use proper connection pools
 */

import { getDb } from "./db";
import { logger } from "./_core/logger";

/**
 * Execute a function within a database transaction
 * 
 * WARNING: This is a basic implementation. For production use:
 * 1. Implement proper connection pooling
 * 2. Add retry logic for deadlocks
 * 3. Add timeout handling
 * 4. Consider using row-level locking (SELECT ... FOR UPDATE)
 * 
 * @param callback Function to execute within transaction
 * @returns Result of the callback
 */
export async function withTransaction<T>(
  callback: (db: Awaited<ReturnType<typeof getDb>>) => Promise<T>
): Promise<T> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Note: Drizzle ORM transaction support varies by driver
    // This is a placeholder for proper transaction implementation
    // In production, use: await db.transaction(async (tx) => { ... })
    
    const result = await callback(db);
    return result;
  } catch (error) {
    logger.error("Transaction error", { error });
    throw error;
  }
}

/**
 * Add optimistic locking check
 * Verifies that a record hasn't been modified since it was read
 * 
 * @param tableName Table name for error messages
 * @param recordId Record ID
 * @param expectedUpdatedAt Expected updatedAt timestamp
 * @param actualUpdatedAt Actual updatedAt timestamp from database
 * @throws Error if timestamps don't match
 */
export function checkOptimisticLock(
  tableName: string,
  recordId: number,
  expectedUpdatedAt: Date,
  actualUpdatedAt: Date
): void {
  if (expectedUpdatedAt.getTime() !== actualUpdatedAt.getTime()) {
    throw new Error(
      `Optimistic lock failure: ${tableName} record ${recordId} was modified by another user. ` +
      `Please refresh and try again.`
    );
  }
}

/**
 * Retry a function with exponential backoff
 * Useful for handling deadlocks and temporary failures
 * 
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable (deadlock, lock timeout, etc.)
      const errorMessage = lastError.message.toLowerCase();
      const isRetryable = 
        errorMessage.includes("deadlock") ||
        errorMessage.includes("lock wait timeout") ||
        errorMessage.includes("try restarting transaction");
      
      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
    }
  }
  
  throw lastError;
}

/**
 * Add a comment to document transaction requirements
 * This is a marker for functions that should be wrapped in transactions
 */
export const REQUIRES_TRANSACTION = Symbol("REQUIRES_TRANSACTION");

/**
 * Add a comment to document race condition risks
 * This is a marker for functions with potential race conditions
 */
export const RACE_CONDITION_RISK = Symbol("RACE_CONDITION_RISK");

