/**
 * Optimistic Locking Utilities (DATA-005)
 *
 * Provides version-based conflict detection for concurrent edits.
 * When two users edit the same record simultaneously, the second
 * save will fail with a conflict error instead of silently overwriting.
 *
 * Usage:
 * 1. Include `version` in your update input schema
 * 2. Call `checkVersion()` before updating
 * 3. Increment version in the update: `version: sql\`version + 1\``
 * 4. Handle `OptimisticLockError` in frontend
 */

import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import type { MySqlTable, AnyMySqlColumn } from "drizzle-orm/mysql-core";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type * as schema from "../../drizzle/schema";

/**
 * Database type for optimistic locking operations
 */
type DbInstance = MySql2Database<typeof schema>;

/**
 * Table type with required versioning columns
 * Uses AnyMySqlColumn for flexibility with different column configurations
 */
type VersionedTable = MySqlTable & {
  id: AnyMySqlColumn;
  version: AnyMySqlColumn;
};

/**
 * Custom error for optimistic locking conflicts
 */
export class OptimisticLockError extends TRPCError {
  constructor(
    entityType: string,
    entityId: number,
    expectedVersion: number,
    actualVersion: number
  ) {
    super({
      code: "CONFLICT",
      message:
        `${entityType} #${entityId} has been modified by another user. ` +
        `Your version: ${expectedVersion}, Current version: ${actualVersion}. ` +
        `Please refresh and try again.`,
    });
    this.name = "OptimisticLockError";
  }
}

/**
 * Check if the record version matches expected version
 * Throws OptimisticLockError if versions don't match
 *
 * @param db - Database instance
 * @param table - Drizzle table with version column
 * @param entityType - Human-readable entity name (e.g., "Order", "Client")
 * @param entityId - Record ID
 * @param expectedVersion - Version from client
 * @returns Current record if version matches
 */
export async function checkVersion<T extends { id: number; version: number }>(
  db: DbInstance,
  table: VersionedTable,
  entityType: string,
  entityId: number,
  expectedVersion: number
): Promise<T> {
  const [record] = await db
    .select()
    .from(table)
    .where(eq(table.id, entityId))
    .limit(1);

  if (!record) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `${entityType} #${entityId} not found`,
    });
  }

  const recordVersion = record.version as number;
  if (recordVersion !== expectedVersion) {
    throw new OptimisticLockError(
      entityType,
      entityId,
      expectedVersion,
      recordVersion
    );
  }

  return record as T;
}

/**
 * Perform an update with optimistic locking
 * Uses WHERE clause to ensure version matches, then increments version
 *
 * @param db - Database instance
 * @param table - Drizzle table with version column
 * @param entityType - Human-readable entity name
 * @param entityId - Record ID
 * @param expectedVersion - Version from client
 * @param updates - Fields to update (version will be auto-incremented)
 * @returns Number of affected rows (0 if version mismatch)
 */
export async function updateWithVersion(
  db: DbInstance,
  table: VersionedTable,
  entityType: string,
  entityId: number,
  expectedVersion: number,
  updates: Record<string, unknown>
): Promise<{ affectedRows: number }> {
  // Include version increment in updates
  const updatesWithVersion = {
    ...updates,
    version: sql`${table.version} + 1`,
  };

  // Update only if version matches
  const result = await db
    .update(table)
    .set(updatesWithVersion)
    .where(and(eq(table.id, entityId), eq(table.version, expectedVersion)));

  // Check if update succeeded
  const affectedRows = result[0]?.affectedRows ?? 0;

  if (affectedRows === 0) {
    // Version mismatch - fetch current version for error message
    const [current] = await db
      .select({ version: table.version })
      .from(table)
      .where(eq(table.id, entityId))
      .limit(1);

    if (!current) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `${entityType} #${entityId} not found`,
      });
    }

    throw new OptimisticLockError(
      entityType,
      entityId,
      expectedVersion,
      current.version as number
    );
  }

  return { affectedRows };
}

/**
 * SQL fragment to increment version
 * Use in update operations: version: incrementVersion()
 */
export function incrementVersion(table: { version: AnyMySqlColumn }) {
  return sql`${table.version} + 1`;
}

/**
 * Type helper for entities with optimistic locking
 */
export interface VersionedEntity {
  id: number;
  version: number;
}

/**
 * Input type helper for updates requiring version
 */
export interface VersionedUpdateInput {
  id: number;
  version: number;
}
