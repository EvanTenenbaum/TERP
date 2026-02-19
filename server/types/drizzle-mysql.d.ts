/**
 * Drizzle MySQL Type Extensions
 *
 * Provides proper typing for MySQL query results that Drizzle doesn't expose correctly.
 * This fixes TS2339 errors for rowsAffected, insertId, etc.
 */

// Extend the MySqlRawQueryResult to include MySQL-specific properties
declare module "drizzle-orm/mysql2" {
  interface MySqlRawQueryResult {
    affectedRows?: number;
    insertId?: number;
    warningStatus?: number;
  }
}

/**
 * Helper type for MySQL insert/update/delete results
 * MySQL returns [ResultSetHeader, FieldPacket[]] from mysql2
 */
export interface MySqlMutationResult {
  affectedRows: number;
  insertId: number;
  warningStatus: number;
}

/**
 * Extract affected rows from MySQL result
 * Handles both array format [ResultSetHeader, FieldPacket[]] and direct result
 */
export function getAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    const header = result[0] as { affectedRows?: number };
    return header?.affectedRows ?? 0;
  }
  if (result && typeof result === "object" && "affectedRows" in result) {
    return (result as { affectedRows: number }).affectedRows;
  }
  return 0;
}

/**
 * Extract insert ID from MySQL result
 */
export function getInsertId(result: unknown): number {
  if (Array.isArray(result)) {
    const header = result[0] as { insertId?: number };
    return header?.insertId ?? 0;
  }
  if (result && typeof result === "object" && "insertId" in result) {
    return (result as { insertId: number }).insertId;
  }
  return 0;
}
