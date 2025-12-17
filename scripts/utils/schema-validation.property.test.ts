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
});
