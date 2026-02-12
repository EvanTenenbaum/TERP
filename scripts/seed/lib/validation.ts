/**
 * Schema Validation Utilities for Seeding Operations
 *
 * Validates data against database schema before insertion to prevent runtime errors.
 * Leverages existing utilities from scripts/utils/schema-introspection.ts.
 */

import type { MySql2Database } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import {
  getTableColumns,
  getForeignKeys,
  camelToSnake,
  snakeToCamel,
  normalizeDataType,
  type ColumnMetadata,
  type ForeignKeyMetadata,
} from "../../utils/schema-introspection";
import { seedLogger } from "./logging";

// ============================================================================
// Type Definitions
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface SchemaCache {
  columns: Map<string, ColumnMetadata[]>;
  foreignKeys: Map<string, ForeignKeyMetadata[]>;
  lastUpdated: Map<string, number>;
}

// ============================================================================
// Error Codes
// ============================================================================

export const ValidationErrorCodes = {
  TABLE_NOT_FOUND: "TABLE_NOT_FOUND",
  COLUMN_NOT_FOUND: "COLUMN_NOT_FOUND",
  TYPE_MISMATCH: "TYPE_MISMATCH",
  NOT_NULL_VIOLATION: "NOT_NULL_VIOLATION",
  FOREIGN_KEY_VIOLATION: "FOREIGN_KEY_VIOLATION",
  UNIQUE_VIOLATION: "UNIQUE_VIOLATION",
  INVALID_ENUM_VALUE: "INVALID_ENUM_VALUE",
} as const;

// ============================================================================
// SchemaValidator Class
// ============================================================================

/**
 * Schema Validator for Seeding Operations
 *
 * Validates data against database schema before insertion.
 * Supports both camelCase (Drizzle) and snake_case (MySQL) column names.
 *
 * @example
 * ```typescript
 * const validator = new SchemaValidator(db);
 * const result = await validator.validateColumns('orders', orderData);
 * if (!result.valid) {
 *   throw new ValidationError(result.errors);
 * }
 * ```
 */
export class SchemaValidator {
  private db: MySql2Database<Record<string, never>>;
  private cache: SchemaCache = {
    columns: new Map(),
    foreignKeys: new Map(),
    lastUpdated: new Map(),
  };
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(db: MySql2Database<Record<string, never>>) {
    this.db = db;
  }

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(tableName: string): boolean {
    const lastUpdated = this.cache.lastUpdated.get(tableName);
    if (!lastUpdated) return false;
    return Date.now() - lastUpdated < this.cacheTTL;
  }

  /**
   * Clear cache for a specific table or all tables
   */
  clearCache(tableName?: string): void {
    if (tableName) {
      this.cache.columns.delete(tableName);
      this.cache.foreignKeys.delete(tableName);
      this.cache.lastUpdated.delete(tableName);
    } else {
      this.cache.columns.clear();
      this.cache.foreignKeys.clear();
      this.cache.lastUpdated.clear();
    }
  }

  // ---------------------------------------------------------------------------
  // Schema Introspection
  // ---------------------------------------------------------------------------

  /**
   * Get cached columns for a table
   */
  private async getColumns(tableName: string): Promise<ColumnMetadata[]> {
    const cached = this.cache.columns.get(tableName);
    if (this.isCacheValid(tableName) && cached) {
      return cached;
    }

    const columns = await getTableColumns(this.db, tableName);
    this.cache.columns.set(tableName, columns);
    this.cache.lastUpdated.set(tableName, Date.now());
    return columns;
  }

  /**
   * Get cached foreign keys for a table
   */
  private async getForeignKeys(tableName: string): Promise<ForeignKeyMetadata[]> {
    const cached = this.cache.foreignKeys.get(tableName);
    if (this.isCacheValid(tableName) && cached) {
      return cached;
    }

    const fks = await getForeignKeys(this.db, tableName);
    this.cache.foreignKeys.set(tableName, fks);
    return fks;
  }

  // ---------------------------------------------------------------------------
  // Validation Methods
  // ---------------------------------------------------------------------------

  /**
   * Validate that a table exists in the database
   */
  async validateTableExists(tableName: string): Promise<boolean> {
    try {
      const columns = await this.getColumns(tableName);
      return columns.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Validate column names and types in data
   */
  async validateColumns(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    seedLogger.validationStart(tableName);

    // Get table schema
    const columns = await this.getColumns(tableName);

    if (columns.length === 0) {
      errors.push({
        field: "*",
        message: `Table '${tableName}' not found in database`,
        severity: "error",
        code: ValidationErrorCodes.TABLE_NOT_FOUND,
      });
      return { valid: false, errors, warnings };
    }

    // Create column lookup maps (both snake_case and camelCase)
    const columnMap = new Map<string, ColumnMetadata>();
    for (const col of columns) {
      columnMap.set(col.columnName, col);
      columnMap.set(snakeToCamel(col.columnName), col);
    }

    // Validate each field in data
    for (const [fieldName, value] of Object.entries(data)) {
      // Find matching column
      const column = columnMap.get(fieldName) ?? columnMap.get(camelToSnake(fieldName));

      if (!column) {
        // Suggest similar column names
        const suggestion = this.findSimilarColumn(fieldName, columns);
        const suggestionMsg = suggestion ? ` Did you mean '${suggestion}'?` : "";

        errors.push({
          field: fieldName,
          message: `Column '${fieldName}' not found in table '${tableName}'.${suggestionMsg}`,
          severity: "error",
          code: ValidationErrorCodes.COLUMN_NOT_FOUND,
        });
        continue;
      }

      // Validate type
      const typeError = this.validateType(fieldName, value, column);
      if (typeError) {
        errors.push(typeError);
      }

      // Validate NOT NULL
      if (!column.isNullable && (value === null || value === undefined)) {
        // Skip auto-increment primary keys
        if (column.extra.includes("auto_increment")) {
          continue;
        }
        // Skip columns with defaults
        if (column.columnDefault !== null) {
          continue;
        }

        errors.push({
          field: fieldName,
          message: `Column '${fieldName}' cannot be NULL (NOT NULL constraint)`,
          severity: "error",
          code: ValidationErrorCodes.NOT_NULL_VIOLATION,
        });
      }

      // Validate enum values
      if (column.dataType === "enum" && value !== null && value !== undefined) {
        const enumError = await this.validateEnumValue(tableName, column.columnName, value);
        if (enumError) {
          errors.push(enumError);
        }
      }
    }

    // Check for required columns that are missing from data
    for (const column of columns) {
      const camelName = snakeToCamel(column.columnName);

      // Skip if column is in data (in either naming convention)
      if (data[column.columnName] !== undefined || data[camelName] !== undefined) {
        continue;
      }

      // Skip auto-increment, has default, or is nullable
      if (
        column.extra.includes("auto_increment") ||
        column.columnDefault !== null ||
        column.isNullable
      ) {
        continue;
      }

      warnings.push({
        field: column.columnName,
        message: `Required column '${column.columnName}' is missing from data`,
        severity: "warning",
        code: ValidationErrorCodes.NOT_NULL_VIOLATION,
      });
    }

    const result = {
      valid: errors.length === 0,
      errors,
      warnings,
    };

    if (result.valid) {
      seedLogger.validationSuccess(tableName, columns.length);
    } else {
      seedLogger.validationFailure(tableName, errors);
    }

    return result;
  }

  /**
   * Validate foreign key references
   */
  async validateForeignKeys(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const foreignKeys = await this.getForeignKeys(tableName);

    for (const fk of foreignKeys) {
      const fieldName = fk.columnName;
      const camelFieldName = snakeToCamel(fieldName);
      const value = data[fieldName] ?? data[camelFieldName];

      // Skip if value is null/undefined (nullable FKs are allowed)
      if (value === null || value === undefined) {
        continue;
      }

      // Check if referenced record exists
      const exists = await this.checkReferenceExists(
        fk.referencedTableName,
        fk.referencedColumnName,
        value
      );

      if (!exists) {
        errors.push({
          field: fieldName,
          message: `Foreign key violation: ${fieldName}=${value} does not exist in '${fk.referencedTableName}'`,
          severity: "error",
          code: ValidationErrorCodes.FOREIGN_KEY_VIOLATION,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate all constraints (columns + foreign keys)
   */
  async validateConstraints(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<ValidationResult> {
    const columnResult = await this.validateColumns(tableName, data);
    const fkResult = await this.validateForeignKeys(tableName, data);

    return {
      valid: columnResult.valid && fkResult.valid,
      errors: [...columnResult.errors, ...fkResult.errors],
      warnings: [...columnResult.warnings, ...fkResult.warnings],
    };
  }

  /**
   * Validate a batch of records
   */
  async validateBatch(
    tableName: string,
    records: Array<Record<string, unknown>>,
    options: { stopOnFirst?: boolean; validateForeignKeys?: boolean } = {}
  ): Promise<{ valid: boolean; results: Array<{ index: number; result: ValidationResult }> }> {
    const { stopOnFirst = false, validateForeignKeys: validateFKs = false } = options;
    const results: Array<{ index: number; result: ValidationResult }> = [];
    let allValid = true;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const result = validateFKs
        ? await this.validateConstraints(tableName, record)
        : await this.validateColumns(tableName, record);

      if (!result.valid) {
        allValid = false;
        results.push({ index: i, result });

        if (stopOnFirst) {
          break;
        }
      }
    }

    return { valid: allValid, results };
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  /**
   * Validate data type matches column type
   */
  private validateType(
    fieldName: string,
    value: unknown,
    column: ColumnMetadata
  ): ValidationError | null {
    if (value === null || value === undefined) {
      return null; // Null handling is done separately
    }

    const jsType = typeof value;
    const dbType = column.dataType;

    // Map JavaScript types to MySQL types
    const typeMapping: Record<string, string[]> = {
      number: ["int", "bigint", "decimal", "float", "double", "tinyint", "smallint", "mediumint"],
      string: ["varchar", "text", "char", "enum", "longtext", "mediumtext", "tinytext", "json"],
      boolean: ["tinyint", "boolean", "bool"],
      object: ["json"],
    };

    // Special handling for Date objects
    if (value instanceof Date) {
      const dateTypes = ["date", "datetime", "timestamp"];
      if (!dateTypes.includes(dbType)) {
        return {
          field: fieldName,
          message: `Data type mismatch: expected '${dbType}', got Date object for column '${fieldName}'`,
          severity: "error",
          code: ValidationErrorCodes.TYPE_MISMATCH,
        };
      }
      return null;
    }

    // Check type compatibility
    const allowedTypes = typeMapping[jsType];
    if (allowedTypes && !allowedTypes.includes(dbType)) {
      // Use normalizeDataType for more nuanced comparison
      const comparison = normalizeDataType(dbType, jsType);
      if (!comparison.match) {
        return {
          field: fieldName,
          message: `Data type mismatch: expected '${dbType}', got '${jsType}' for column '${fieldName}'`,
          severity: "error",
          code: ValidationErrorCodes.TYPE_MISMATCH,
        };
      }
    }

    return null;
  }

  /**
   * Validate enum value
   */
  private async validateEnumValue(
    tableName: string,
    columnName: string,
    value: unknown
  ): Promise<ValidationError | null> {
    if (typeof value !== "string") {
      return {
        field: columnName,
        message: `Enum value must be a string, got '${typeof value}'`,
        severity: "error",
        code: ValidationErrorCodes.INVALID_ENUM_VALUE,
      };
    }

    // Get enum values from column type
    const columns = await this.getColumns(tableName);
    const column = columns.find(
      (c) => c.columnName === columnName || c.columnName === camelToSnake(columnName)
    );

    if (!column) {
      return null; // Column validation will catch this
    }

    // Parse enum values from columnType: enum('val1','val2',...)
    const enumMatch = column.columnType.match(/^enum\((.*)\)$/i);
    if (!enumMatch) {
      return null;
    }

    const enumValues = enumMatch[1]
      .split(",")
      .map((v) => v.trim().replace(/^'|'$/g, ""));

    if (!enumValues.includes(value)) {
      return {
        field: columnName,
        message: `Invalid enum value '${value}' for column '${columnName}'. Allowed: [${enumValues.join(", ")}]`,
        severity: "error",
        code: ValidationErrorCodes.INVALID_ENUM_VALUE,
      };
    }

    return null;
  }

  /**
   * Check if a referenced record exists
   */
  private async checkReferenceExists(
    tableName: string,
    columnName: string,
    value: unknown
  ): Promise<boolean> {
    try {
      const result = await this.db.execute(
        sql`SELECT 1 FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(columnName)} = ${value} LIMIT 1`
      );

      const rows = Array.isArray(result) && result.length > 0 ? result[0] : result;
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      // On error, assume reference exists to avoid blocking
      return true;
    }
  }

  /**
   * Find similar column name for suggestions
   */
  private findSimilarColumn(
    fieldName: string,
    columns: ColumnMetadata[]
  ): string | null {
    const snakeName = camelToSnake(fieldName);
    const camelName = snakeToCamel(fieldName);

    for (const col of columns) {
      // Check for case-insensitive match
      if (col.columnName.toLowerCase() === fieldName.toLowerCase()) {
        return col.columnName;
      }
      if (col.columnName.toLowerCase() === snakeName.toLowerCase()) {
        return col.columnName;
      }
      if (snakeToCamel(col.columnName).toLowerCase() === camelName.toLowerCase()) {
        return col.columnName;
      }

      // Check for partial match (column name contains field name or vice versa)
      if (
        col.columnName.toLowerCase().includes(fieldName.toLowerCase()) ||
        fieldName.toLowerCase().includes(col.columnName.toLowerCase())
      ) {
        return col.columnName;
      }
    }

    return null;
  }
}

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Create a validation result from an array of errors
 */
export function createValidationResult(
  errors: ValidationError[],
  warnings: ValidationError[] = []
): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Merge multiple validation results
 */
export function mergeValidationResults(
  results: ValidationResult[]
): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push("Errors:");
    for (const error of result.errors) {
      lines.push(`  - [${error.field}] ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push("Warnings:");
    for (const warning of result.warnings) {
      lines.push(`  - [${warning.field}] ${warning.message}`);
    }
  }

  return lines.join("\n");
}

// ============================================================================
// Exports
// ============================================================================

export default SchemaValidator;
