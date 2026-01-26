/**
 * Database Utility Functions
 * ✅ ADDED: TERP-INIT-005 Phase 4 - Reduce duplication with reusable utilities
 *
 * Provides reusable database patterns like findOrCreate to adhere to DRY principle
 */

import { eq, and, type SQL } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { MySqlTable, AnyMySqlColumn } from "drizzle-orm/mysql-core";

/**
 * Type for tables that have an id column
 * Used for generic database operations that need to access the id column
 */
interface TableWithIdColumn {
  id: AnyMySqlColumn;
}

/**
 * Generic findOrCreate pattern for database entities
 * Simplified implementation that works with Drizzle ORM's type system
 *
 * @param tx - Database transaction
 * @param table - Drizzle table definition
 * @param whereConditions - Array of where conditions
 * @param createValues - Values to insert if entity doesn't exist
 * @returns The found or created entity
 *
 * @example
 * const vendor = await findOrCreate(
 *   tx,
 *   vendors,
 *   [eq(vendors.name, 'Acme Corp')],
 *   { name: 'Acme Corp' }
 * );
 */
export async function findOrCreate<
  TTable extends MySqlTable,
  TSelect = TTable["$inferSelect"],
>(
  tx: MySql2Database<Record<string, unknown>>,
  table: TTable,
  whereConditions: SQL[],
  createValues: TTable["$inferInsert"]
): Promise<TSelect> {
  // Find existing entity
  const whereClause =
    whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions);

  const [existing] = await tx.select().from(table).where(whereClause).limit(1);

  if (existing) {
    return existing as TSelect;
  }

  // Create new entity
  const [created] = await tx.insert(table).values(createValues).$returningId();

  // Fetch the created entity using the created id
  // Cast to TableWithIdColumn to access the id column in a type-safe manner
  const tableWithId = table as TTable & TableWithIdColumn;
  const [newEntity] = await tx
    .select()
    .from(table)
    .where(eq(tableWithId.id, (created as { id: number }).id))
    .limit(1);

  return newEntity as TSelect;
}

/**
 * Batch findOrCreate for multiple entities
 * Useful when you need to find or create multiple entities in a single transaction
 *
 * @param tx - Database transaction
 * @param table - Drizzle table definition
 * @param items - Array of { whereConditions, createValues } objects
 * @returns Array of found or created entities
 */
export async function batchFindOrCreate<
  TTable extends MySqlTable,
  TSelect = TTable["$inferSelect"],
>(
  tx: MySql2Database<Record<string, unknown>>,
  table: TTable,
  items: Array<{ whereConditions: SQL[]; createValues: TTable["$inferInsert"] }>
): Promise<TSelect[]> {
  const results: TSelect[] = [];

  for (const item of items) {
    const result = await findOrCreate<TTable, TSelect>(
      tx,
      table,
      item.whereConditions,
      item.createValues
    );
    results.push(result);
  }

  return results;
}

/**
 * Safe transaction wrapper with automatic rollback on error
 * Provides consistent error handling and logging for transactions
 *
 * @param db - Database instance
 * @param operation - Transaction operation to execute
 * @param operationName - Name of the operation for logging
 * @returns Result of the transaction
 */
export async function withTransaction<T>(
  db: MySql2Database<Record<string, unknown>>,
  operation: (tx: MySql2Database<Record<string, unknown>>) => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await db.transaction(async tx => {
      return await operation(tx as MySql2Database<Record<string, unknown>>);
    });
  } catch (error) {
    console.error(`Transaction failed for ${operationName}:`, error);
    throw error;
  }
}
