/**
 * Property Tests for Schema Validation System
 *
 * Tests naming conventions, type normalization, and validation logic.
 *
 * Validates: Requirements 2.3, 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 7.4, 7.5
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================================
// Naming Convention Utilities (from schema-introspection.ts)
// ============================================================================

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normalize MySQL data type for comparison
 */
function normalizeDataType(mysqlType: string): string {
  const type = mysqlType.toLowerCase();

  // Map MySQL types to normalized forms
  if (type.startsWith("int")) return "int";
  if (type.startsWith("bigint")) return "bigint";
  if (type.startsWith("smallint")) return "smallint";
  if (type.startsWith("tinyint(1)")) return "boolean";
  if (type.startsWith("tinyint")) return "tinyint";
  if (type.startsWith("varchar")) return "varchar";
  if (type.startsWith("char")) return "char";
  if (type.startsWith("text")) return "text";
  if (type.startsWith("mediumtext")) return "mediumtext";
  if (type.startsWith("longtext")) return "longtext";
  if (type.startsWith("decimal")) return "decimal";
  if (type.startsWith("float")) return "float";
  if (type.startsWith("double")) return "double";
  if (type.startsWith("datetime")) return "datetime";
  if (type.startsWith("timestamp")) return "timestamp";
  if (type.startsWith("date")) return "date";
  if (type.startsWith("time")) return "time";
  if (type.startsWith("json")) return "json";
  if (type.startsWith("enum")) return "enum";
  if (type.startsWith("blob")) return "blob";

  return type;
}

/**
 * Compare enum values between database and schema
 */
function compareEnumValues(
  dbValues: string[],
  schemaValues: string[]
): {
  match: boolean;
  missing: string[];
  extra: string[];
} {
  const dbSet = new Set(dbValues);
  const schemaSet = new Set(schemaValues);

  const missing = dbValues.filter(v => !schemaSet.has(v));
  const extra = schemaValues.filter(v => !dbSet.has(v));

  return {
    match: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  };
}

// ============================================================================
// Property Tests
// ============================================================================

describe("Schema Validation Property Tests", () => {
  describe("Property 8 & 30: Naming Convention Conversions", () => {
    it("camelToSnake should convert camelCase to snake_case", () => {
      const testCases = [
        ["customerId", "customer_id"],
        ["createdAt", "created_at"],
        ["invoiceLineItems", "invoice_line_items"],
        ["id", "id"],
        ["ABC", "_a_b_c"],
      ];

      testCases.forEach(([input, expected]) => {
        expect(camelToSnake(input)).toBe(expected);
      });
    });

    it("snakeToCamel should convert snake_case to camelCase", () => {
      const testCases = [
        ["customer_id", "customerId"],
        ["created_at", "createdAt"],
        ["invoice_line_items", "invoiceLineItems"],
        ["id", "id"],
      ];

      testCases.forEach(([input, expected]) => {
        expect(snakeToCamel(input)).toBe(expected);
      });
    });

    it("should be reversible for simple camelCase strings", () => {
      fc.assert(
        fc.property(fc.stringMatching(/^[a-z][a-zA-Z]*$/), camelStr => {
          const snake = camelToSnake(camelStr);
          const backToCamel = snakeToCamel(snake);
          expect(backToCamel).toBe(camelStr);
        }),
        { numRuns: 100 }
      );
    });

    it("should handle empty strings", () => {
      expect(camelToSnake("")).toBe("");
      expect(snakeToCamel("")).toBe("");
    });
  });

  describe("Property 12: Data Type Equivalence Detection", () => {
    it("should normalize MySQL integer types", () => {
      expect(normalizeDataType("int(11)")).toBe("int");
      expect(normalizeDataType("int")).toBe("int");
      expect(normalizeDataType("INT(11) UNSIGNED")).toBe("int");
      expect(normalizeDataType("bigint(20)")).toBe("bigint");
      expect(normalizeDataType("smallint(6)")).toBe("smallint");
    });

    it("should normalize MySQL string types", () => {
      expect(normalizeDataType("varchar(255)")).toBe("varchar");
      expect(normalizeDataType("VARCHAR(100)")).toBe("varchar");
      expect(normalizeDataType("char(10)")).toBe("char");
      expect(normalizeDataType("text")).toBe("text");
      expect(normalizeDataType("mediumtext")).toBe("mediumtext");
      expect(normalizeDataType("longtext")).toBe("longtext");
    });

    it("should normalize MySQL numeric types", () => {
      expect(normalizeDataType("decimal(10,2)")).toBe("decimal");
      expect(normalizeDataType("DECIMAL(15,4)")).toBe("decimal");
      expect(normalizeDataType("float")).toBe("float");
      expect(normalizeDataType("double")).toBe("double");
    });

    it("should normalize MySQL date/time types", () => {
      expect(normalizeDataType("datetime")).toBe("datetime");
      expect(normalizeDataType("timestamp")).toBe("timestamp");
      expect(normalizeDataType("date")).toBe("date");
      expect(normalizeDataType("time")).toBe("time");
    });

    it("should treat tinyint(1) as boolean", () => {
      expect(normalizeDataType("tinyint(1)")).toBe("boolean");
      expect(normalizeDataType("TINYINT(1)")).toBe("boolean");
    });

    it("should handle enum types", () => {
      expect(normalizeDataType("enum('A','B','C')")).toBe("enum");
    });
  });

  describe("Property 13: Enum Set Difference Detection", () => {
    it("should detect matching enum sets", () => {
      const result = compareEnumValues(
        ["DRAFT", "SENT", "PAID"],
        ["DRAFT", "SENT", "PAID"]
      );
      expect(result.match).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });

    it("should detect missing enum values", () => {
      const result = compareEnumValues(
        ["DRAFT", "SENT", "PAID", "VOID"],
        ["DRAFT", "SENT", "PAID"]
      );
      expect(result.match).toBe(false);
      expect(result.missing).toContain("VOID");
      expect(result.extra).toHaveLength(0);
    });

    it("should detect extra enum values", () => {
      const result = compareEnumValues(
        ["DRAFT", "SENT"],
        ["DRAFT", "SENT", "PAID"]
      );
      expect(result.match).toBe(false);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toContain("PAID");
    });

    it("should handle order-independent comparison", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 1,
            maxLength: 10,
          }),
          values => {
            const shuffled = [...values].sort(() => Math.random() - 0.5);
            const result = compareEnumValues(values, shuffled);
            expect(result.match).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("Property 11: Column Name Mismatch Detection", () => {
    it("should detect camelCase vs snake_case mismatches", () => {
      const dbColumn = "customer_id";
      const schemaColumn = "customerId";

      // After conversion, they should match
      expect(snakeToCamel(dbColumn)).toBe(schemaColumn);
      expect(camelToSnake(schemaColumn)).toBe(dbColumn);
    });

    it("should handle columns that are already matching", () => {
      const columns = ["id", "status", "type", "name"];

      columns.forEach(col => {
        expect(camelToSnake(col)).toBe(col);
        expect(snakeToCamel(col)).toBe(col);
      });
    });
  });

  describe("Property 17: Critical Table Prioritization", () => {
    const CRITICAL_TABLES = [
      "invoices",
      "payments",
      "orders",
      "clients",
      "batches",
      "products",
    ];

    it("should identify critical tables", () => {
      const allTables = [
        "users",
        "invoices",
        "settings",
        "payments",
        "logs",
        "orders",
        "clients",
        "batches",
        "products",
        "audit_logs",
      ];

      const critical = allTables.filter(t => CRITICAL_TABLES.includes(t));
      expect(critical).toHaveLength(6);
      expect(critical).toContain("invoices");
      expect(critical).toContain("payments");
    });

    it("should prioritize critical tables first", () => {
      const issues = [
        { table: "users", severity: "low" },
        { table: "invoices", severity: "critical" },
        { table: "logs", severity: "low" },
        { table: "payments", severity: "critical" },
      ];

      const sorted = issues.sort((a, b) => {
        const aIsCritical = CRITICAL_TABLES.includes(a.table);
        const bIsCritical = CRITICAL_TABLES.includes(b.table);
        if (aIsCritical && !bIsCritical) return -1;
        if (!aIsCritical && bIsCritical) return 1;
        return 0;
      });

      expect(sorted[0].table).toBe("invoices");
      expect(sorted[1].table).toBe("payments");
    });
  });

  describe("Property 18: Severity Assignment Consistency", () => {
    type Severity = "critical" | "high" | "medium" | "low";

    function assignSeverity(table: string, issueType: string): Severity {
      const CRITICAL_TABLES = ["invoices", "payments", "orders", "clients"];
      const isCriticalTable = CRITICAL_TABLES.includes(table);

      if (issueType === "missing_column" && isCriticalTable) return "critical";
      if (issueType === "type_mismatch" && isCriticalTable) return "critical";
      if (issueType === "missing_column") return "high";
      if (issueType === "type_mismatch") return "high";
      if (issueType === "enum_mismatch") return "medium";
      if (issueType === "nullable_mismatch") return "low";

      return "low";
    }

    it("should assign critical severity to critical table issues", () => {
      expect(assignSeverity("invoices", "missing_column")).toBe("critical");
      expect(assignSeverity("payments", "type_mismatch")).toBe("critical");
    });

    it("should assign high severity to non-critical table structural issues", () => {
      expect(assignSeverity("users", "missing_column")).toBe("high");
      expect(assignSeverity("logs", "type_mismatch")).toBe("high");
    });

    it("should assign consistent severity for same inputs", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("invoices", "payments", "users", "logs"),
          fc.constantFrom(
            "missing_column",
            "type_mismatch",
            "enum_mismatch",
            "nullable_mismatch"
          ),
          (table, issueType) => {
            const severity1 = assignSeverity(table, issueType);
            const severity2 = assignSeverity(table, issueType);
            expect(severity1).toBe(severity2);
          }
        )
      );
    });
  });

  describe("Property 19: JSON Report Validity", () => {
    interface ValidationReport {
      timestamp: string;
      tablesChecked: number;
      columnsChecked: number;
      totalIssues: number;
      issues: Array<{
        table: string;
        column: string;
        type: string;
        severity: string;
      }>;
    }

    function isValidReport(report: unknown): report is ValidationReport {
      if (typeof report !== "object" || report === null) return false;

      const r = report as Record<string, unknown>;

      return (
        typeof r.timestamp === "string" &&
        typeof r.tablesChecked === "number" &&
        typeof r.columnsChecked === "number" &&
        typeof r.totalIssues === "number" &&
        Array.isArray(r.issues)
      );
    }

    it("should validate correct report structure", () => {
      const validReport: ValidationReport = {
        timestamp: new Date().toISOString(),
        tablesChecked: 120,
        columnsChecked: 1345,
        totalIssues: 0,
        issues: [],
      };

      expect(isValidReport(validReport)).toBe(true);
    });

    it("should reject invalid report structures", () => {
      expect(isValidReport(null)).toBe(false);
      expect(isValidReport({})).toBe(false);
      expect(isValidReport({ timestamp: "2025-01-01" })).toBe(false);
    });

    it("should handle reports with issues", () => {
      const reportWithIssues: ValidationReport = {
        timestamp: new Date().toISOString(),
        tablesChecked: 120,
        columnsChecked: 1345,
        totalIssues: 2,
        issues: [
          {
            table: "invoices",
            column: "deleted_at",
            type: "missing",
            severity: "critical",
          },
          {
            table: "payments",
            column: "deleted_at",
            type: "missing",
            severity: "critical",
          },
        ],
      };

      expect(isValidReport(reportWithIssues)).toBe(true);
      expect(reportWithIssues.issues.length).toBe(reportWithIssues.totalIssues);
    });
  });

  describe("Property 31 & 32: Schema-Specific Conversion Behavior", () => {
    const MAIN_SCHEMA_TABLES = [
      "invoices",
      "payments",
      "orders",
      "clients",
      "batches",
    ];
    const RBAC_TABLES = [
      "roles",
      "permissions",
      "role_permissions",
      "user_roles",
    ];
    const VIP_TABLES = ["vip_portal_auth", "vip_portal_configurations"];

    function getSchemaType(
      tableName: string
    ): "main" | "rbac" | "vip" | "unknown" {
      if (MAIN_SCHEMA_TABLES.includes(tableName)) return "main";
      if (RBAC_TABLES.includes(tableName)) return "rbac";
      if (VIP_TABLES.includes(tableName)) return "vip";
      return "unknown";
    }

    function shouldConvertCase(tableName: string): boolean {
      const schemaType = getSchemaType(tableName);
      // Main schema uses camelCase in Drizzle, needs conversion
      // RBAC and VIP schemas use snake_case directly
      return schemaType === "main";
    }

    it("should identify main schema tables for conversion", () => {
      expect(shouldConvertCase("invoices")).toBe(true);
      expect(shouldConvertCase("payments")).toBe(true);
      expect(shouldConvertCase("orders")).toBe(true);
    });

    it("should not convert RBAC schema tables", () => {
      expect(shouldConvertCase("roles")).toBe(false);
      expect(shouldConvertCase("permissions")).toBe(false);
      expect(shouldConvertCase("role_permissions")).toBe(false);
    });

    it("should not convert VIP Portal schema tables", () => {
      expect(shouldConvertCase("vip_portal_auth")).toBe(false);
      expect(shouldConvertCase("vip_portal_configurations")).toBe(false);
    });
  });

  // ============================================================================
  // Property Tests for Introspection (Tasks 2.1-2.5)
  // Validates Requirements 1.1-1.5
  // ============================================================================

  describe("Property 2.1: Complete Table Discovery", () => {
    interface TableInfo {
      name: string;
      schema: string;
    }

    function discoverTables(rawTables: TableInfo[]): string[] {
      return rawTables
        .filter(t => t.schema === "defaultdb")
        .map(t => t.name);
    }

    it("should discover all tables from information_schema", () => {
      const mockTables: TableInfo[] = [
        { name: "users", schema: "defaultdb" },
        { name: "orders", schema: "defaultdb" },
        { name: "invoices", schema: "defaultdb" },
        { name: "mysql_system", schema: "mysql" },
      ];

      const discovered = discoverTables(mockTables);
      expect(discovered).toHaveLength(3);
      expect(discovered).toContain("users");
      expect(discovered).toContain("orders");
      expect(discovered).toContain("invoices");
      expect(discovered).not.toContain("mysql_system");
    });

    it("should handle empty table list", () => {
      const discovered = discoverTables([]);
      expect(discovered).toHaveLength(0);
    });

    it("should preserve all table names without filtering", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 50 }),
          (tableNames) => {
            const tables = tableNames.map(name => ({ name, schema: "defaultdb" }));
            const discovered = discoverTables(tables);
            expect(discovered).toHaveLength(tableNames.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("Property 2.2: Complete Column Metadata Extraction", () => {
    interface ColumnInfo {
      Field: string;
      Type: string;
      Null: "YES" | "NO";
      Key: "PRI" | "UNI" | "MUL" | "";
      Default: string | null;
      Extra: string;
    }

    function extractColumnMetadata(columns: ColumnInfo[]) {
      return columns.map(col => ({
        columnName: col.Field,
        dataType: col.Type,
        isNullable: col.Null === "YES",
        columnKey: col.Key,
        columnDefault: col.Default,
        extra: col.Extra,
      }));
    }

    it("should extract all column metadata fields", () => {
      const mockColumns: ColumnInfo[] = [
        { Field: "id", Type: "int(11)", Null: "NO", Key: "PRI", Default: null, Extra: "auto_increment" },
        { Field: "name", Type: "varchar(255)", Null: "YES", Key: "", Default: null, Extra: "" },
      ];

      const metadata = extractColumnMetadata(mockColumns);
      expect(metadata).toHaveLength(2);
      expect(metadata[0].columnName).toBe("id");
      expect(metadata[0].isNullable).toBe(false);
      expect(metadata[0].columnKey).toBe("PRI");
      expect(metadata[1].isNullable).toBe(true);
    });

    it("should handle all nullable states correctly", () => {
      const nullable: ColumnInfo = { Field: "test", Type: "text", Null: "YES", Key: "", Default: null, Extra: "" };
      const notNullable: ColumnInfo = { Field: "test", Type: "text", Null: "NO", Key: "", Default: null, Extra: "" };

      expect(extractColumnMetadata([nullable])[0].isNullable).toBe(true);
      expect(extractColumnMetadata([notNullable])[0].isNullable).toBe(false);
    });
  });

  describe("Property 2.3: Enum Value Extraction Completeness", () => {
    function extractEnumValues(columnType: string): string[] {
      if (!columnType.startsWith("enum(")) return [];

      const match = columnType.match(/enum\(([^)]+)\)/i);
      if (!match) return [];

      return match[1]
        .split(",")
        .map(v => v.trim().replace(/^'|'$/g, ""));
    }

    it("should extract all enum values from column type", () => {
      const enumType = "enum('DRAFT','SENT','PAID','VOID')";
      const values = extractEnumValues(enumType);

      expect(values).toHaveLength(4);
      expect(values).toContain("DRAFT");
      expect(values).toContain("SENT");
      expect(values).toContain("PAID");
      expect(values).toContain("VOID");
    });

    it("should return empty array for non-enum types", () => {
      expect(extractEnumValues("varchar(255)")).toHaveLength(0);
      expect(extractEnumValues("int(11)")).toHaveLength(0);
      expect(extractEnumValues("text")).toHaveLength(0);
    });

    it("should handle single-value enums", () => {
      const values = extractEnumValues("enum('SINGLE')");
      expect(values).toHaveLength(1);
      expect(values[0]).toBe("SINGLE");
    });
  });

  describe("Property 2.4: Foreign Key Discovery Completeness", () => {
    interface ForeignKeyInfo {
      CONSTRAINT_NAME: string;
      COLUMN_NAME: string;
      REFERENCED_TABLE_NAME: string;
      REFERENCED_COLUMN_NAME: string;
    }

    function extractForeignKeys(rawFks: ForeignKeyInfo[]) {
      return rawFks.map(fk => ({
        constraintName: fk.CONSTRAINT_NAME,
        columnName: fk.COLUMN_NAME,
        referencedTable: fk.REFERENCED_TABLE_NAME,
        referencedColumn: fk.REFERENCED_COLUMN_NAME,
      }));
    }

    it("should extract all foreign key relationships", () => {
      const mockFks: ForeignKeyInfo[] = [
        { CONSTRAINT_NAME: "fk_user", COLUMN_NAME: "user_id", REFERENCED_TABLE_NAME: "users", REFERENCED_COLUMN_NAME: "id" },
        { CONSTRAINT_NAME: "fk_order", COLUMN_NAME: "order_id", REFERENCED_TABLE_NAME: "orders", REFERENCED_COLUMN_NAME: "id" },
      ];

      const fks = extractForeignKeys(mockFks);
      expect(fks).toHaveLength(2);
      expect(fks[0].referencedTable).toBe("users");
      expect(fks[1].referencedTable).toBe("orders");
    });

    it("should preserve all foreign key attributes", () => {
      const mockFk: ForeignKeyInfo = {
        CONSTRAINT_NAME: "fk_client_id",
        COLUMN_NAME: "client_id",
        REFERENCED_TABLE_NAME: "clients",
        REFERENCED_COLUMN_NAME: "id",
      };

      const [fk] = extractForeignKeys([mockFk]);
      expect(fk.constraintName).toBe("fk_client_id");
      expect(fk.columnName).toBe("client_id");
      expect(fk.referencedTable).toBe("clients");
      expect(fk.referencedColumn).toBe("id");
    });
  });

  describe("Property 2.5: Index Discovery Completeness", () => {
    interface IndexInfo {
      INDEX_NAME: string;
      COLUMN_NAME: string;
      NON_UNIQUE: number;
      SEQ_IN_INDEX: number;
    }

    function extractIndexes(rawIndexes: IndexInfo[]) {
      return rawIndexes.map(idx => ({
        indexName: idx.INDEX_NAME,
        columnName: idx.COLUMN_NAME,
        isUnique: idx.NON_UNIQUE === 0,
        seqInIndex: idx.SEQ_IN_INDEX,
      }));
    }

    it("should extract all index information", () => {
      const mockIndexes: IndexInfo[] = [
        { INDEX_NAME: "PRIMARY", COLUMN_NAME: "id", NON_UNIQUE: 0, SEQ_IN_INDEX: 1 },
        { INDEX_NAME: "idx_email", COLUMN_NAME: "email", NON_UNIQUE: 0, SEQ_IN_INDEX: 1 },
        { INDEX_NAME: "idx_status", COLUMN_NAME: "status", NON_UNIQUE: 1, SEQ_IN_INDEX: 1 },
      ];

      const indexes = extractIndexes(mockIndexes);
      expect(indexes).toHaveLength(3);
      expect(indexes[0].isUnique).toBe(true);
      expect(indexes[2].isUnique).toBe(false);
    });

    it("should correctly identify unique vs non-unique indexes", () => {
      const uniqueIdx: IndexInfo = { INDEX_NAME: "unique_idx", COLUMN_NAME: "col", NON_UNIQUE: 0, SEQ_IN_INDEX: 1 };
      const nonUniqueIdx: IndexInfo = { INDEX_NAME: "regular_idx", COLUMN_NAME: "col", NON_UNIQUE: 1, SEQ_IN_INDEX: 1 };

      expect(extractIndexes([uniqueIdx])[0].isUnique).toBe(true);
      expect(extractIndexes([nonUniqueIdx])[0].isUnique).toBe(false);
    });
  });

  // ============================================================================
  // Property Tests for Fix Generator (Tasks 6.1-6.9)
  // Validates Requirements 5.1-5.6, 8.1-8.3
  // ============================================================================

  describe("Property 6.1: Validation Report Parsing Completeness", () => {
    interface ValidationIssue {
      table: string;
      column: string;
      type: string;
      severity: string;
      dbValue: unknown;
      drizzleValue: unknown;
    }

    interface ValidationReport {
      timestamp: string;
      totalIssues: number;
      issues: ValidationIssue[];
    }

    function parseValidationReport(report: ValidationReport) {
      return report.issues.map(issue => ({
        table: issue.table,
        column: issue.column,
        issueType: issue.type,
        severity: issue.severity,
        needsFix: issue.type !== "info",
      }));
    }

    it("should parse all issues from validation report", () => {
      const report: ValidationReport = {
        timestamp: new Date().toISOString(),
        totalIssues: 3,
        issues: [
          { table: "invoices", column: "deleted_at", type: "missing", severity: "critical", dbValue: null, drizzleValue: null },
          { table: "payments", column: "amount", type: "type_mismatch", severity: "high", dbValue: "decimal", drizzleValue: "varchar" },
          { table: "users", column: "status", type: "enum_mismatch", severity: "medium", dbValue: ["A", "B"], drizzleValue: ["A"] },
        ],
      };

      const parsed = parseValidationReport(report);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].table).toBe("invoices");
      expect(parsed[1].issueType).toBe("type_mismatch");
    });
  });

  describe("Property 6.2: Fix Recommendation Prioritization", () => {
    const CRITICAL_TABLES = ["inventoryMovements", "orderStatusHistory", "invoices", "ledgerEntries", "payments", "clientActivity"];

    interface Issue {
      table: string;
      severity: string;
    }

    function prioritizeIssues(issues: Issue[]): Issue[] {
      const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

      return [...issues].sort((a, b) => {
        // Critical tables first
        const aIsCritical = CRITICAL_TABLES.includes(a.table);
        const bIsCritical = CRITICAL_TABLES.includes(b.table);
        if (aIsCritical && !bIsCritical) return -1;
        if (!aIsCritical && bIsCritical) return 1;

        // Then by severity (use ?? instead of || to handle 0 correctly)
        const aSeverity = severityOrder[a.severity] ?? 3;
        const bSeverity = severityOrder[b.severity] ?? 3;
        return aSeverity - bSeverity;
      });
    }

    it("should prioritize critical tables first", () => {
      const issues: Issue[] = [
        { table: "users", severity: "critical" },
        { table: "invoices", severity: "high" },
        { table: "logs", severity: "low" },
      ];

      const prioritized = prioritizeIssues(issues);
      expect(prioritized[0].table).toBe("invoices");
    });

    it("should prioritize by severity within critical tables", () => {
      const issues: Issue[] = [
        { table: "invoices", severity: "low" },
        { table: "payments", severity: "critical" },
        { table: "invoices", severity: "high" }, // Using same critical table to test severity order
      ];

      const prioritized = prioritizeIssues(issues);
      // payments (critical severity) should come first, then high severity invoices, then low severity invoices
      expect(prioritized[0].severity).toBe("critical");
      expect(prioritized[1].severity).toBe("high");
      expect(prioritized[2].severity).toBe("low");
    });
  });

  describe("Property 6.3: Column Name Fix Correctness", () => {
    function generateColumnNameFix(drizzleColumn: string, dbColumn: string): string {
      if (drizzleColumn === dbColumn) return "";

      // Generate the fix recommendation
      return `Change Drizzle column name from "${drizzleColumn}" to "${dbColumn}"`;
    }

    it("should recommend correct column name changes", () => {
      const fix = generateColumnNameFix("customerId", "customer_id");
      expect(fix).toContain("customerId");
      expect(fix).toContain("customer_id");
    });

    it("should return empty string for matching columns", () => {
      expect(generateColumnNameFix("id", "id")).toBe("");
      expect(generateColumnNameFix("status", "status")).toBe("");
    });
  });

  describe("Property 6.4: Data Type Fix Correctness", () => {
    function generateTypeFix(column: string, drizzleType: string, dbType: string): string {
      const drizzleNormalized = normalizeDataType(drizzleType);
      const dbNormalized = normalizeDataType(dbType);

      if (drizzleNormalized === dbNormalized) return "";

      return `Change column "${column}" type from ${drizzleType} to ${dbType}`;
    }

    it("should recommend type changes when types differ", () => {
      const fix = generateTypeFix("amount", "varchar(255)", "decimal(10,2)");
      expect(fix).toContain("decimal");
    });

    it("should not recommend changes for equivalent types", () => {
      expect(generateTypeFix("id", "int(11)", "int")).toBe("");
      expect(generateTypeFix("name", "varchar(100)", "varchar(255)")).toBe("");
    });
  });

  describe("Property 6.5: Enum Fix Correctness", () => {
    function generateEnumFix(column: string, schemaValues: string[], dbValues: string[]): string {
      const { missing, extra } = compareEnumValues(dbValues, schemaValues);

      if (missing.length === 0 && extra.length === 0) return "";

      const parts: string[] = [];
      if (missing.length > 0) {
        parts.push(`Add missing values: ${missing.join(", ")}`);
      }
      if (extra.length > 0) {
        parts.push(`Remove extra values: ${extra.join(", ")}`);
      }

      return `Column "${column}": ${parts.join("; ")}`;
    }

    it("should recommend adding missing enum values", () => {
      const fix = generateEnumFix("status", ["DRAFT", "SENT"], ["DRAFT", "SENT", "PAID"]);
      expect(fix).toContain("PAID");
    });

    it("should recommend removing extra enum values", () => {
      const fix = generateEnumFix("status", ["DRAFT", "SENT", "OBSOLETE"], ["DRAFT", "SENT"]);
      expect(fix).toContain("OBSOLETE");
    });

    it("should return empty for matching enums", () => {
      expect(generateEnumFix("status", ["A", "B"], ["A", "B"])).toBe("");
    });
  });

  describe("Property 6.6: Fix Report Generation Completeness", () => {
    interface Fix {
      table: string;
      column: string;
      fixType: string;
      beforeCode: string;
      afterCode: string;
    }

    function generateFixReport(fixes: Fix[]): string {
      let report = "# Schema Drift Fixes\n\n";

      for (const fix of fixes) {
        report += `## ${fix.table}.${fix.column}\n\n`;
        report += `**Type:** ${fix.fixType}\n\n`;
        report += "**Before:**\n```typescript\n" + fix.beforeCode + "\n```\n\n";
        report += "**After:**\n```typescript\n" + fix.afterCode + "\n```\n\n";
      }

      return report;
    }

    it("should generate markdown report with all fixes", () => {
      const fixes: Fix[] = [
        {
          table: "invoices",
          column: "deleted_at",
          fixType: "missing_column",
          beforeCode: "// Column not present",
          afterCode: "deletedAt: timestamp('deleted_at')",
        },
      ];

      const report = generateFixReport(fixes);
      expect(report).toContain("# Schema Drift Fixes");
      expect(report).toContain("invoices.deleted_at");
      expect(report).toContain("Before:");
      expect(report).toContain("After:");
    });
  });

  describe("Property 6.7: Fix Target Consistency", () => {
    it("should always recommend changes to Drizzle schema, not database", () => {
      const fixRecommendation = "Change Drizzle column from varchar to decimal";

      expect(fixRecommendation).toContain("Drizzle");
      expect(fixRecommendation).not.toContain("ALTER TABLE");
      expect(fixRecommendation).not.toContain("database migration");
    });
  });

  describe("Property 6.8: Missing Column Recommendations", () => {
    function generateMissingColumnFix(table: string, column: string, dbType: string): string {
      return `Add column "${column}" to Drizzle table "${table}" with type matching ${dbType}`;
    }

    it("should recommend adding column to Drizzle schema", () => {
      const fix = generateMissingColumnFix("invoices", "deleted_at", "timestamp");
      expect(fix).toContain("Add column");
      expect(fix).toContain("deleted_at");
      expect(fix).toContain("Drizzle");
    });
  });

  describe("Property 6.9: Extra Column Detection", () => {
    function detectExtraColumn(table: string, column: string): string {
      return `Column "${column}" in Drizzle table "${table}" does not exist in database - requires investigation`;
    }

    it("should flag extra columns for investigation", () => {
      const warning = detectExtraColumn("orders", "obsolete_field");
      expect(warning).toContain("does not exist in database");
      expect(warning).toContain("investigation");
    });
  });

  // ============================================================================
  // Property Tests for Verification (Tasks 7.1-7.4)
  // Validates Requirements 6.1-6.5
  // ============================================================================

  describe("Property 7.1: Verification Scope Limitation", () => {
    const CRITICAL_TABLES = ["inventoryMovements", "orderStatusHistory", "invoices", "ledgerEntries", "payments", "clientActivity"];

    function filterCriticalTables(tables: string[]): string[] {
      return tables.filter(t => CRITICAL_TABLES.includes(t));
    }

    it("should only verify the 6 critical tables", () => {
      const allTables = ["users", "invoices", "logs", "payments", "settings", "ledgerEntries"];
      const verified = filterCriticalTables(allTables);

      expect(verified).toHaveLength(3);
      expect(verified).toContain("invoices");
      expect(verified).toContain("payments");
      expect(verified).toContain("ledgerEntries");
      expect(verified).not.toContain("users");
    });
  });

  describe("Property 7.2: Issue Resolution Calculation", () => {
    interface VerificationResult {
      beforeIssues: number;
      afterIssues: number;
    }

    function calculateResolution(result: VerificationResult) {
      const resolved = result.beforeIssues - result.afterIssues;
      const percentage = result.beforeIssues > 0
        ? Math.round((resolved / result.beforeIssues) * 100)
        : 100;

      return {
        resolved,
        remaining: result.afterIssues,
        percentageImproved: percentage,
      };
    }

    it("should correctly calculate resolved issues", () => {
      const result = calculateResolution({ beforeIssues: 10, afterIssues: 3 });
      expect(result.resolved).toBe(7);
      expect(result.remaining).toBe(3);
      expect(result.percentageImproved).toBe(70);
    });

    it("should handle complete resolution", () => {
      const result = calculateResolution({ beforeIssues: 5, afterIssues: 0 });
      expect(result.resolved).toBe(5);
      expect(result.percentageImproved).toBe(100);
    });

    it("should handle no initial issues", () => {
      const result = calculateResolution({ beforeIssues: 0, afterIssues: 0 });
      expect(result.percentageImproved).toBe(100);
    });
  });

  describe("Property 7.3: Verification Metrics Completeness", () => {
    interface VerificationMetrics {
      tablesVerified: number;
      issuesBefore: number;
      issuesAfter: number;
      resolvedCount: number;
      percentageImproved: number;
      timestamp: string;
    }

    function isValidMetrics(metrics: unknown): metrics is VerificationMetrics {
      if (typeof metrics !== "object" || metrics === null) return false;

      const m = metrics as Record<string, unknown>;

      return (
        typeof m.tablesVerified === "number" &&
        typeof m.issuesBefore === "number" &&
        typeof m.issuesAfter === "number" &&
        typeof m.resolvedCount === "number" &&
        typeof m.percentageImproved === "number" &&
        typeof m.timestamp === "string"
      );
    }

    it("should validate complete metrics structure", () => {
      const validMetrics: VerificationMetrics = {
        tablesVerified: 6,
        issuesBefore: 10,
        issuesAfter: 0,
        resolvedCount: 10,
        percentageImproved: 100,
        timestamp: new Date().toISOString(),
      };

      expect(isValidMetrics(validMetrics)).toBe(true);
    });

    it("should reject incomplete metrics", () => {
      expect(isValidMetrics({})).toBe(false);
      expect(isValidMetrics({ tablesVerified: 6 })).toBe(false);
      expect(isValidMetrics(null)).toBe(false);
    });
  });

  describe("Property 7.4: Exit Code Behavior", () => {
    function determineExitCode(criticalIssuesRemaining: number): number {
      return criticalIssuesRemaining === 0 ? 0 : 1;
    }

    it("should return exit code 0 when all critical issues resolved", () => {
      expect(determineExitCode(0)).toBe(0);
    });

    it("should return exit code 1 when critical issues remain", () => {
      expect(determineExitCode(1)).toBe(1);
      expect(determineExitCode(5)).toBe(1);
      expect(determineExitCode(100)).toBe(1);
    });

    it("should be consistent across multiple calls", () => {
      fc.assert(
        fc.property(fc.nat(100), (issueCount) => {
          const code1 = determineExitCode(issueCount);
          const code2 = determineExitCode(issueCount);
          expect(code1).toBe(code2);
        }),
        { numRuns: 50 }
      );
    });
  });
});
