/**
 * Soft Delete Utilities
 * ST-013: Standardize Soft Deletes
 * 
 * Provides consistent soft delete functionality across all tables
 */

import { eq, isNull, not, SQL, and, sql } from "drizzle-orm";
import { MySqlTable } from "drizzle-orm/mysql-core";
import { getDb } from "../db";

// Type definitions for table access
interface TableWithId {
  id: ReturnType<typeof eq> extends infer R ? R : never;
}

interface TableWithDeletedAt {
  deletedAt: ReturnType<typeof isNull> extends infer R ? R : never;
}

interface ResultSetHeader {
  affectedRows: number;
}

/**
 * Helper to safely access table.id with proper typing
 */
function getTableId<T extends MySqlTable>(table: T): Parameters<typeof eq>[0] {
  return (table as T & TableWithId).id;
}

/**
 * Helper to safely access table.deletedAt with proper typing
 */
function getTableDeletedAt<T extends MySqlTable>(table: T): Parameters<typeof isNull>[0] {
  return (table as T & TableWithDeletedAt).deletedAt;
}

/**
 * Soft delete a record by setting deletedAt timestamp
 * @param table - The Drizzle table
 * @param id - The record ID to soft delete
 * @returns The number of affected rows
 */
export async function softDelete<T extends MySqlTable>(
  table: T,
  id: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(table)
    .set({ deletedAt: new Date() } as Record<string, unknown>)
    .where(eq(getTableId(table), id));

  // MySQL returns [ResultSetHeader, FieldPacket[]] - extract affectedRows
  const affectedRows = Array.isArray(result) ? (result[0] as ResultSetHeader)?.affectedRows : 0;
  return affectedRows || 0;
}

/**
 * Soft delete multiple records by IDs
 * @param table - The Drizzle table
 * @param ids - Array of record IDs to soft delete
 * @returns The number of affected rows
 */
export async function softDeleteMany<T extends MySqlTable>(
  table: T,
  ids: number[]
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (ids.length === 0) return 0;

  const tableId = getTableId(table);
  const result = await db
    .update(table)
    .set({ deletedAt: new Date() } as Record<string, unknown>)
    .where(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tableId as unknown as { in: (ids: number[]) => SQL }).in 
        ? (tableId as unknown as { in: (ids: number[]) => SQL }).in(ids) 
        : eq(tableId, ids[0])
    );

  // MySQL returns [ResultSetHeader, FieldPacket[]] - extract affectedRows
  const affectedRows = Array.isArray(result) ? (result[0] as ResultSetHeader)?.affectedRows : 0;
  return affectedRows || 0;
}

/**
 * Restore a soft-deleted record by clearing deletedAt
 * @param table - The Drizzle table
 * @param id - The record ID to restore
 * @returns The number of affected rows
 */
export async function restoreDeleted<T extends MySqlTable>(
  table: T,
  id: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(table)
    .set({ deletedAt: null } as Record<string, unknown>)
    .where(eq(getTableId(table), id));

  // MySQL returns [ResultSetHeader, FieldPacket[]] - extract affectedRows
  const affectedRows = Array.isArray(result) ? (result[0] as ResultSetHeader)?.affectedRows : 0;
  return affectedRows || 0;
}

/**
 * Hard delete a record (permanent deletion)
 * Use with caution - this cannot be undone
 * @param table - The Drizzle table
 * @param id - The record ID to permanently delete
 * @returns The number of affected rows
 */
export async function hardDelete<T extends MySqlTable>(
  table: T,
  id: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.delete(table).where(eq(getTableId(table), id));

  // MySQL returns [ResultSetHeader, FieldPacket[]] - extract affectedRows
  const affectedRows = Array.isArray(result) ? (result[0] as ResultSetHeader)?.affectedRows : 0;
  return affectedRows || 0;
}

/**
 * Create a WHERE clause to exclude soft-deleted records
 * Use this in queries to filter out deleted records
 * @param table - The Drizzle table
 * @returns SQL condition to exclude deleted records
 */
export function excludeDeleted<T extends MySqlTable>(table: T): SQL {
  return isNull(getTableDeletedAt(table));
}

/**
 * Create a WHERE clause to include ONLY soft-deleted records
 * Use this for admin interfaces showing deleted records
 * @param table - The Drizzle table
 * @returns SQL condition to include only deleted records
 */
export function onlyDeleted<T extends MySqlTable>(table: T): SQL {
  return not(isNull(getTableDeletedAt(table)));
}

/**
 * Combine multiple conditions with excludeDeleted
 * @param table - The Drizzle table
 * @param conditions - Additional WHERE conditions
 * @returns Combined SQL conditions
 */
export function withExcludeDeleted<T extends MySqlTable>(
  table: T,
  ...conditions: SQL[]
): SQL {
  return and(excludeDeleted(table), ...conditions) as SQL;
}

/**
 * Check if a record is soft-deleted
 * @param table - The Drizzle table
 * @param id - The record ID to check
 * @returns True if the record is soft-deleted
 */
export async function isDeleted<T extends MySqlTable>(
  table: T,
  id: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Use direct query instead of relational query builder
  const tableWithId = table as T & { id: Parameters<typeof eq>[0] };
  const results = await db
    .select()
    .from(table)
    .where(eq(tableWithId.id, id))
    .limit(1);

  const record = results[0] as { deletedAt?: Date | null } | undefined;
  return record !== undefined && record.deletedAt !== null;
}

/**
 * Get all soft-deleted records for a table
 * @param table - The Drizzle table
 * @param limit - Maximum number of records to return
 * @returns Array of soft-deleted records
 */
export async function getDeleted<T extends MySqlTable>(
  table: T,
  limit: number = 100
): Promise<unknown[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(table)
    .where(onlyDeleted(table))
    .limit(limit);
}

/**
 * Count soft-deleted records for a table
 * @param table - The Drizzle table
 * @returns Number of soft-deleted records
 */
export async function countDeleted<T extends MySqlTable>(
  table: T
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(onlyDeleted(table));

  return result.length;
}
