/**
 * Schema Drift Detection Utilities
 * Shared types and helper functions for schema drift detection
 */

// ============================================================================
// Types
// ============================================================================

export interface DriftIssue {
  type:
    | "missing_column"
    | "extra_column"
    | "type_mismatch"
    | "precision_mismatch"
    | "missing_fk"
    | "missing_index"
    | "naming_inconsistency"
    | "enum_drift"
    | "nullable_mismatch";
  severity: "critical" | "high" | "medium" | "low";
  table: string;
  column?: string;
  details: string;
  recommendation: string;
  autoFixable: boolean;
}

export interface TableDrift {
  tableName: string;
  issues: DriftIssue[];
  columnCount: number;
  fkCount: number;
  indexCount: number;
}

export interface DriftReport {
  timestamp: string;
  databaseUrl: string;
  totalTables: number;
  tablesWithDrift: number;
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  autoFixableIssues: number;
  tables: TableDrift[];
  summary: DriftSummary;
}

export interface DriftSummary {
  missingColumns: number;
  extraColumns: number;
  typeMismatches: number;
  precisionMismatches: number;
  missingFKs: number;
  missingIndexes: number;
  namingInconsistencies: number;
  enumDrifts: number;
  nullableMismatches: number;
}

// ============================================================================
// FK Pattern Detection
// ============================================================================

interface FKPattern {
  pattern: RegExp;
  table: string;
}

const FK_PATTERNS: FKPattern[] = [
  { pattern: /^user[_]?[Ii]d$/, table: "users" },
  { pattern: /^customer[_]?[Ii]d$/, table: "clients" },
  { pattern: /^client[_]?[Ii]d$/, table: "clients" },
  { pattern: /^vendor[_]?[Ii]d$/, table: "vendors" },
  { pattern: /^supplier[_]?[Cc]lient[_]?[Ii]d$/, table: "clients" },
  { pattern: /^invoice[_]?[Ii]d$/, table: "invoices" },
  { pattern: /^bill[_]?[Ii]d$/, table: "bills" },
  { pattern: /^product[_]?[Ii]d$/, table: "products" },
  { pattern: /^batch[_]?[Ii]d$/, table: "batches" },
  { pattern: /^order[_]?[Ii]d$/, table: "orders" },
  { pattern: /^lot[_]?[Ii]d$/, table: "lots" },
  { pattern: /^brand[_]?[Ii]d$/, table: "brands" },
  { pattern: /^category[_]?[Ii]d$/, table: "categories" },
  { pattern: /^subcategory[_]?[Ii]d$/, table: "subcategories" },
  { pattern: /^bank[_]?[Aa]ccount[_]?[Ii]d$/, table: "bankAccounts" },
  { pattern: /^account[_]?[Ii]d$/, table: "accounts" },
  { pattern: /^tag[_]?[Ii]d$/, table: "tags" },
  { pattern: /^strain[_]?[Ii]d$/, table: "strains" },
  { pattern: /^location[_]?[Ii]d$/, table: "locations" },
  { pattern: /^note[_]?[Ii]d$/, table: "freeform_notes" },
  { pattern: /^purchase[_]?[Oo]rder[_]?[Ii]d$/, table: "purchaseOrders" },
  { pattern: /^created[_]?[Bb]y$/, table: "users" },
  { pattern: /^updated[_]?[Bb]y$/, table: "users" },
  { pattern: /^recorded[_]?[Bb]y$/, table: "users" },
  { pattern: /^changed[_]?[Bb]y$/, table: "users" },
  { pattern: /^uploaded[_]?[Bb]y$/, table: "users" },
  { pattern: /^actor[_]?[Ii]d$/, table: "users" },
  { pattern: /^assigned[_]?[Tt]o$/, table: "users" },
];

/**
 * Infer expected FK reference from column name
 */
export function inferFKReference(
  columnName: string
): { table: string; column: string } | null {
  for (const { pattern, table } of FK_PATTERNS) {
    if (pattern.test(columnName)) {
      return { table, column: "id" };
    }
  }
  return null;
}

// ============================================================================
// Type Precision Checking
// ============================================================================

export interface TypePrecision {
  baseType: string;
  length?: number;
  precision?: number;
  scale?: number;
}

/**
 * Parse MySQL column type to extract precision info
 */
export function parseColumnType(columnType: string): TypePrecision {
  const result: TypePrecision = { baseType: columnType.toLowerCase() };

  const match = columnType.match(/^(\w+)\((\d+)(?:,(\d+))?\)/i);
  if (match) {
    result.baseType = match[1].toLowerCase();
    if (match[3]) {
      result.precision = parseInt(match[2], 10);
      result.scale = parseInt(match[3], 10);
    } else {
      result.length = parseInt(match[2], 10);
    }
  }

  return result;
}

const TYPE_ALIASES: Record<string, string[]> = {
  int: ["int", "integer", "int4"],
  bigint: ["bigint", "int8"],
  varchar: ["varchar", "character varying"],
  text: ["text", "longtext", "mediumtext"],
  decimal: ["decimal", "numeric"],
  timestamp: ["timestamp", "datetime"],
  boolean: ["boolean", "bool", "tinyint"],
};

/**
 * Check if two column types match including precision
 */
export function checkTypePrecision(
  dbType: string,
  schemaType: string,
  tableName: string,
  columnName: string
): DriftIssue | null {
  const dbParsed = parseColumnType(dbType);
  const schemaParsed = parseColumnType(schemaType);

  let baseTypeMatch = dbParsed.baseType === schemaParsed.baseType;
  if (!baseTypeMatch) {
    for (const aliases of Object.values(TYPE_ALIASES)) {
      if (
        aliases.includes(dbParsed.baseType) &&
        aliases.includes(schemaParsed.baseType)
      ) {
        baseTypeMatch = true;
        break;
      }
    }
  }

  if (!baseTypeMatch) {
    return {
      type: "type_mismatch",
      severity: "critical",
      table: tableName,
      column: columnName,
      details: `Type mismatch: DB="${dbType}" vs Schema="${schemaType}"`,
      recommendation: `Update schema to match database type or create migration`,
      autoFixable: false,
    };
  }

  if (dbParsed.baseType === "decimal" || dbParsed.baseType === "numeric") {
    if (
      dbParsed.precision !== schemaParsed.precision ||
      dbParsed.scale !== schemaParsed.scale
    ) {
      return {
        type: "precision_mismatch",
        severity: "high",
        table: tableName,
        column: columnName,
        details: `Decimal precision mismatch: DB=(${dbParsed.precision},${dbParsed.scale}) vs Schema=(${schemaParsed.precision},${schemaParsed.scale})`,
        recommendation: `Align decimal precision - this affects financial calculations!`,
        autoFixable: false,
      };
    }
  }

  if (dbParsed.baseType === "varchar") {
    if (
      schemaParsed.length &&
      dbParsed.length &&
      schemaParsed.length < dbParsed.length
    ) {
      return {
        type: "precision_mismatch",
        severity: "medium",
        table: tableName,
        column: columnName,
        details: `Varchar length mismatch: DB=${dbParsed.length} vs Schema=${schemaParsed.length}`,
        recommendation: `Schema allows shorter strings than DB - may cause truncation`,
        autoFixable: true,
      };
    }
  }

  return null;
}

/**
 * Mask database URL for safe logging
 */
export function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@");
}
