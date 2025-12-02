/**
 * Schema Introspection Utilities
 * 
 * Provides functions for querying database structure and comparing with Drizzle schemas.
 * Supports both camelCase and snake_case naming conventions.
 */

import type { MySql2Database } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ColumnMetadata {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  columnKey: 'PRI' | 'UNI' | 'MUL' | '';
  extra: string;
  columnType: string;
}

export interface ForeignKeyMetadata {
  constraintName: string;
  columnName: string;
  referencedTableName: string;
  referencedColumnName: string;
}

export interface IndexMetadata {
  indexName: string;
  columnName: string;
  nonUnique: boolean;
  seqInIndex: number;
}

export interface ColumnDiff {
  hasNameMismatch: boolean;
  hasTypeMismatch: boolean;
  hasNullableMismatch: boolean;
  hasDefaultMismatch: boolean;
  hasEnumMismatch: boolean;
  hasForeignKeyMismatch: boolean;
  details: string[];
}

// ============================================================================
// Naming Convention Utilities
// ============================================================================

/**
 * Convert camelCase to snake_case
 * Examples: userId -> user_id, HTTPResponse -> http_response
 */
export function camelToSnake(str: string): string {
  // Handle empty string
  if (!str) return str;
  
  // If already snake_case, return as-is
  if (str.includes('_') && str === str.toLowerCase()) {
    return str;
  }
  
  // Convert camelCase to snake_case
  return str
    // Insert underscore before uppercase letters that follow lowercase letters
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    // Insert underscore before uppercase letters that follow numbers
    .replace(/([0-9])([A-Z])/g, '$1_$2')
    // Handle consecutive uppercase letters (e.g., HTTPResponse -> http_response)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    // Convert to lowercase
    .toLowerCase();
}

/**
 * Convert snake_case to camelCase
 * Examples: user_id -> userId, invoice_number -> invoiceNumber
 */
export function snakeToCamel(str: string): string {
  // Handle empty string
  if (!str) return str;
  
  // If no underscores, return as-is (already camelCase or single word)
  if (!str.includes('_')) {
    return str;
  }
  
  // Convert snake_case to camelCase
  return str
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

// ============================================================================
// Database Introspection Functions
// ============================================================================

/**
 * Get list of all tables in the database
 */
export async function getTableList(db: MySql2Database<Record<string, never>>): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);
  
  return (result as Array<{ TABLE_NAME: string }>).map((row) => row.TABLE_NAME);
}

/**
 * Get detailed column information for a specific table
 */
export async function getTableColumns(
  db: MySql2Database<Record<string, never>>,
  tableName: string
): Promise<ColumnMetadata[]> {
  const result = await db.execute(sql`
    SELECT 
      COLUMN_NAME as columnName,
      DATA_TYPE as dataType,
      IS_NULLABLE = 'YES' as isNullable,
      COLUMN_DEFAULT as columnDefault,
      COLUMN_KEY as columnKey,
      EXTRA as extra,
      COLUMN_TYPE as columnType
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
    ORDER BY ORDINAL_POSITION
  `);
  
  return result as ColumnMetadata[];
}

/**
 * Extract enum values from a column's COLUMN_TYPE field
 * Example: "enum('DRAFT','SENT','PAID')" -> ['DRAFT', 'SENT', 'PAID']
 */
export async function getEnumValues(
  db: MySql2Database<Record<string, never>>,
  tableName: string,
  columnName: string
): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT COLUMN_TYPE as columnType
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = ${columnName}
  `);
  
  if (!result || result.length === 0) {
    return [];
  }
  
  const columnType = (result as Array<{ columnType: string }>)[0].columnType;
  
  // Parse enum values from COLUMN_TYPE
  // Format: enum('value1','value2','value3')
  const enumMatch = columnType.match(/^enum\((.*)\)$/i);
  if (!enumMatch) {
    return [];
  }
  
  // Extract values between quotes
  const valuesStr = enumMatch[1];
  const values = valuesStr.match(/'([^']*)'/g);
  
  if (!values) {
    return [];
  }
  
  // Remove quotes from each value
  return values.map((v: string) => v.slice(1, -1));
}

/**
 * Get foreign key relationships for a table
 */
export async function getForeignKeys(
  db: MySql2Database<Record<string, never>>,
  tableName: string
): Promise<ForeignKeyMetadata[]> {
  const result = await db.execute(sql`
    SELECT 
      CONSTRAINT_NAME as constraintName,
      COLUMN_NAME as columnName,
      REFERENCED_TABLE_NAME as referencedTableName,
      REFERENCED_COLUMN_NAME as referencedColumnName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY ORDINAL_POSITION
  `);
  
  return result as ForeignKeyMetadata[];
}

/**
 * Get index information for a table
 */
export async function getIndexes(
  db: MySql2Database<Record<string, never>>,
  tableName: string
): Promise<IndexMetadata[]> {
  const result = await db.execute(sql`
    SELECT 
      INDEX_NAME as indexName,
      COLUMN_NAME as columnName,
      NON_UNIQUE = 1 as nonUnique,
      SEQ_IN_INDEX as seqInIndex
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
    ORDER BY INDEX_NAME, SEQ_IN_INDEX
  `);
  
  return result as IndexMetadata[];
}

// ============================================================================
// Type Comparison Utilities
// ============================================================================

/**
 * Normalize MySQL and Drizzle data types for comparison
 * Handles variations like int(11) vs int, varchar(255) vs varchar({ length: 255 })
 */
export function normalizeDataType(
  mysqlType: string,
  drizzleType: string
): { normalized: string; match: boolean } {
  // Normalize MySQL type (remove length/precision for comparison)
  const mysqlBase = mysqlType
    .replace(/\(\d+\)/g, '') // Remove (11), (255), etc.
    .replace(/\(\d+,\d+\)/g, '') // Remove (15,2), etc.
    .toLowerCase()
    .trim();
  
  // Normalize Drizzle type (extract base type)
  const drizzleBase = drizzleType
    .replace(/\{.*\}/g, '') // Remove { length: 255 }, etc.
    .replace(/\(.*\)/g, '') // Remove (), etc.
    .toLowerCase()
    .trim();
  
  // Type mappings
  const typeMap: Record<string, string[]> = {
    'int': ['int', 'integer', 'int4'],
    'bigint': ['bigint', 'int8'],
    'varchar': ['varchar', 'string'],
    'text': ['text', 'longtext', 'mediumtext'],
    'decimal': ['decimal', 'numeric'],
    'timestamp': ['timestamp', 'datetime'],
    'boolean': ['boolean', 'bool', 'tinyint'],
  };
  
  // Check if types match
  for (const [baseType, variants] of Object.entries(typeMap)) {
    if (variants.includes(mysqlBase) && variants.includes(drizzleBase)) {
      return { normalized: baseType, match: true };
    }
  }
  
  // Direct match
  const match = mysqlBase === drizzleBase;
  return { normalized: mysqlBase, match };
}

/**
 * Compare a database column with a Drizzle schema column
 * Returns detailed diff information
 */
export function compareColumnDefinitions(
  dbColumn: ColumnMetadata,
  schemaColumn: { name: string; type: string; notNull?: boolean; default?: unknown }
): ColumnDiff {
  const diff: ColumnDiff = {
    hasNameMismatch: false,
    hasTypeMismatch: false,
    hasNullableMismatch: false,
    hasDefaultMismatch: false,
    hasEnumMismatch: false,
    hasForeignKeyMismatch: false,
    details: [],
  };
  
  // Compare names (handle camelCase vs snake_case)
  const dbNameCamel = snakeToCamel(dbColumn.columnName);
  const schemaNameSnake = camelToSnake(schemaColumn.name);
  
  if (dbColumn.columnName !== schemaNameSnake && dbNameCamel !== schemaColumn.name) {
    diff.hasNameMismatch = true;
    diff.details.push(
      `Column name mismatch: DB="${dbColumn.columnName}" vs Schema="${schemaColumn.name}"`
    );
  }
  
  // Compare types
  const typeComparison = normalizeDataType(dbColumn.dataType, schemaColumn.type);
  if (!typeComparison.match) {
    diff.hasTypeMismatch = true;
    diff.details.push(
      `Data type mismatch: DB="${dbColumn.dataType}" vs Schema="${schemaColumn.type}"`
    );
  }
  
  // Compare nullable
  const dbNullable = dbColumn.isNullable;
  const schemaNullable = !schemaColumn.notNull;
  
  if (dbNullable !== schemaNullable) {
    diff.hasNullableMismatch = true;
    diff.details.push(
      `Nullable mismatch: DB=${dbNullable} vs Schema=${schemaNullable}`
    );
  }
  
  // Compare defaults (if both have defaults)
  if (dbColumn.columnDefault !== null && schemaColumn.default !== undefined) {
    const dbDefault = String(dbColumn.columnDefault);
    const schemaDefault = String(schemaColumn.default);
    
    if (dbDefault !== schemaDefault) {
      diff.hasDefaultMismatch = true;
      diff.details.push(
        `Default value mismatch: DB="${dbDefault}" vs Schema="${schemaDefault}"`
      );
    }
  }
  
  return diff;
}
