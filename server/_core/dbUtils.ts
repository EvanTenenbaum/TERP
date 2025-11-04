/**
 * Database Utility Functions
 * ✅ ADDED: TERP-INIT-005 Phase 4 - Reduce duplication with reusable utilities
 *
 * Provides reusable database patterns like findOrCreate to adhere to DRY principle
 */

import { eq, and, type SQL } from "drizzle-orm";

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
export async function findOrCreate<TSelect>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  whereConditions: SQL[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createValues: any
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

  // Fetch the created entity
  const [newEntity] = await tx
    .select()
    .from(table)
    .where(eq(table.id, created.id))
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
export async function batchFindOrCreate<TSelect>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: Array<{ whereConditions: SQL[]; createValues: any }>
): Promise<TSelect[]> {
  const results: TSelect[] = [];

  for (const item of items) {
    const result = await findOrCreate<TSelect>(
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operation: (tx: any) => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await db.transaction(async (tx: unknown) => {
      return await operation(tx);
    });
  } catch (error) {
    console.error(`Transaction failed for ${operationName}:`, error);
    throw error;
  }
}
