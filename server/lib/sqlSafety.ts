/**
 * SQL Safety Utilities
 *
 * This module provides safe wrappers for SQL operations that can fail with empty arrays.
 * The primary issue is that Drizzle's inArray() and notInArray() functions crash when
 * passed an empty array, generating invalid SQL like "WHERE id IN ()".
 *
 * These utilities handle empty arrays gracefully:
 * - safeInArray: Returns sql`false` for empty arrays (matches no rows)
 * - safeNotInArray: Returns sql`true` for empty arrays (matches all rows)
 *
 * Created as part of Wave 4A: SQL Safety Audit
 * Fixes BUG-043 and related empty array handling issues
 */

import { sql, SQL } from "drizzle-orm";
import {
  inArray as drizzleInArray,
  notInArray as drizzleNotInArray,
} from "drizzle-orm";
import type { SQLWrapper } from "drizzle-orm";

/**
 * Safe version of inArray that handles empty arrays.
 * Returns sql`false` for empty arrays (matches no rows).
 *
 * @param column - The column to check (e.g., users.id)
 * @param values - Array of values to check against
 * @returns SQL condition that is safe with empty arrays
 *
 * @example
 * // Safe usage - won't crash with empty array
 * const ids = [];
 * const results = await db.select()
 *   .from(users)
 *   .where(safeInArray(users.id, ids)); // Returns empty results
 */
export function safeInArray<T>(column: SQLWrapper, values: T[]): SQL {
  if (!Array.isArray(values) || values.length === 0) {
    // Return a condition that matches nothing
    return sql`false`;
  }
  return drizzleInArray(column, values);
}

/**
 * Safe version of notInArray that handles empty arrays.
 * Returns sql`true` for empty arrays (matches all rows).
 *
 * @param column - The column to check (e.g., users.id)
 * @param values - Array of values to exclude
 * @returns SQL condition that is safe with empty arrays
 *
 * @example
 * // Safe usage - won't crash with empty array
 * const excludeIds = [];
 * const results = await db.select()
 *   .from(users)
 *   .where(safeNotInArray(users.id, excludeIds)); // Returns all rows
 */
export function safeNotInArray<T>(column: SQLWrapper, values: T[]): SQL {
  if (!Array.isArray(values) || values.length === 0) {
    // Return a condition that matches everything
    return sql`true`;
  }
  return drizzleNotInArray(column, values);
}

/**
 * Safely join an array for use in raw SQL IN clause.
 * Throws an error if the array is empty (fail-fast approach).
 *
 * This is for cases where you must use raw SQL and cannot use safeInArray.
 * Prefer safeInArray when possible.
 *
 * @param values - Array of values to join
 * @returns Comma-separated string suitable for SQL IN clause
 * @throws Error if array is empty
 *
 * @example
 * // Only use when raw SQL is absolutely necessary
 * if (ids.length > 0) {
 *   const query = sql`SELECT * FROM items WHERE id IN (${safeJoinForIn(ids)})`;
 * }
 */
export function safeJoinForIn(values: (string | number)[]): string {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Cannot create IN clause with empty array");
  }
  return values
    .map(v => (typeof v === "string" ? `'${escapeSqlString(v)}'` : v))
    .join(",");
}

/**
 * Escape single quotes in SQL strings to prevent injection.
 * This is a basic escape - for complex cases, use parameterized queries.
 */
function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Type assertion helper to verify an array is non-empty.
 * Throws an error if the array is empty (fail-fast approach).
 *
 * Use this when you need to guarantee an array has at least one element
 * before passing it to a function that requires non-empty arrays.
 *
 * @param arr - Array to check
 * @param name - Name of the array for error messages
 * @throws Error if array is empty
 *
 * @example
 * assertNonEmptyArray(userIds, 'userIds');
 * // TypeScript now knows userIds has at least one element
 * const results = await db.select()
 *   .from(users)
 *   .where(inArray(users.id, userIds));
 */
export function assertNonEmptyArray<T>(
  arr: T[],
  name: string
): asserts arr is [T, ...T[]] {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`${name} cannot be empty`);
  }
}

/**
 * Check if an array is safe for SQL IN operations.
 * Returns true if the array has at least one element.
 *
 * @param arr - Array to check
 * @returns true if array is non-empty and safe for IN operations
 *
 * @example
 * if (isSafeForInArray(ids)) {
 *   // Safe to use with inArray
 *   const results = await db.select()
 *     .from(users)
 *     .where(inArray(users.id, ids));
 * } else {
 *   return []; // Handle empty case
 * }
 */
export function isSafeForInArray<T>(
  arr: T[] | undefined | null
): arr is [T, ...T[]] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Safe NOT IN for raw SQL using parameterized approach.
 * Returns a SQL fragment that handles empty arrays.
 *
 * @param column - SQL column reference (e.g., sql`${table.column}`)
 * @param values - Array of IDs to exclude
 * @returns SQL fragment that is safe with empty arrays
 *
 * @example
 * const excludeIds = [1, 2, 3];
 * const query = db.select()
 *   .from(items)
 *   .where(safeNotInRaw(sql`${items.id}`, excludeIds));
 */
export function safeNotInRaw(column: SQL, values: number[]): SQL {
  if (!Array.isArray(values) || values.length === 0) {
    // No exclusions, match all rows
    return sql`true`;
  }
  // Use sql.join for safe parameterized query
  return sql`${column} NOT IN (${sql.join(
    values.map(id => sql`${id}`),
    sql`, `
  )})`;
}

/**
 * Safe IN for raw SQL using parameterized approach.
 * Returns a SQL fragment that handles empty arrays.
 *
 * @param column - SQL column reference (e.g., sql`${table.column}`)
 * @param values - Array of IDs to match
 * @returns SQL fragment that is safe with empty arrays
 *
 * @example
 * const matchIds = [1, 2, 3];
 * const query = db.select()
 *   .from(items)
 *   .where(safeInRaw(sql`${items.id}`, matchIds));
 */
export function safeInRaw(column: SQL, values: number[]): SQL {
  if (!Array.isArray(values) || values.length === 0) {
    // No matches possible
    return sql`false`;
  }
  // Use sql.join for safe parameterized query
  return sql`${column} IN (${sql.join(
    values.map(id => sql`${id}`),
    sql`, `
  )})`;
}
