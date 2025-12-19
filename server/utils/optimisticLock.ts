import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../db';

/**
 * Performs an optimistic update on a table.
 * 
 * @param table The Drizzle table definition
 * @param id The primary key ID of the record
 * @param updates The object containing fields to update
 * @param currentVersion The expected current version of the record
 * @param tx Optional transaction object. If not provided, uses getDb()
 * 
 * @throws Error if record not found or version mismatch
 */
export async function optimisticUpdate(
  table: any,
  id: number,
  updates: Record<string, any>,
  currentVersion: number,
  tx?: any
) {
  const db = tx || await getDb();
  if (!db) throw new Error("Database not available");

  // Ensure version is incremented
  const updatesWithVersion = {
    ...updates,
    version: sql`${table.version} + 1`
  };

  const result = await db
    .update(table)
    .set(updatesWithVersion)
    .where(and(eq(table.id, id), eq(table.version, currentVersion)));

  // If rowsAffected is available (MySQL2/Drizzle usually return [ResultSetHeader])
  // We need to check the result structure based on the driver.
  // Drizzle with mysql2 returns [ResultSetHeader, FieldPacket[]] usually, but .update() returns just the result in some configs?
  // Let's assume standard behavior. If result has rowsAffected property (it should).
  
  // Note: Drizzle's result type depends on the driver. 
  // For mysql2, it usually returns [ResultSetHeader]
  
  let rowsAffected = 0;
  if (Array.isArray(result) && result[0] && 'affectedRows' in result[0]) {
      rowsAffected = result[0].affectedRows;
  } else if ('rowsAffected' in result) {
      rowsAffected = result.rowsAffected;
  } else if ('affectedRows' in result) {
      rowsAffected = result.affectedRows;
  } else {
      // Fallback or assuming result itself is the header if array destructuring happened in caller? 
      // Drizzle returns Promise<[ResultSetHeader, FieldPacket[]]>
      if (result[0]?.affectedRows !== undefined) {
          rowsAffected = result[0].affectedRows;
      }
  }

  if (rowsAffected === 0) {
    // Check if record exists
    const record = await db
      .select()
      .from(table)
      .where(eq(table.id, id))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!record) {
      throw new Error(`Record ${id} not found`);
    }
    
    throw new Error(`Concurrent modification detected. The record has been modified by another user. Please refresh and try again.`);
  }

  return result;
}
