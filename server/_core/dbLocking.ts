import { sql } from "drizzle-orm";

/**
 * Row-level locking utilities for preventing race conditions
 */

/**
 * Standard FOR UPDATE lock
 * Waits for other transactions to release locks
 */
export function forUpdate() {
  return sql`FOR UPDATE`;
}

/**
 * FOR UPDATE SKIP LOCKED
 * Skips rows that are already locked by other transactions
 */
export function forUpdateSkipLocked() {
  return sql`FOR UPDATE SKIP LOCKED`;
}

/**
 * FOR UPDATE NOWAIT
 * Immediately fails if row is locked by another transaction
 */
export function forUpdateNoWait() {
  return sql`FOR UPDATE NOWAIT`;
}

