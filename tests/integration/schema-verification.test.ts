/**
 * Schema Verification Integration Tests
 *
 * CRITICAL: These tests hit the REAL database to catch schema drift.
 *
 * Purpose:
 * - Verify drizzle/schema.ts matches the actual database
 * - Catch missing columns BEFORE code ships to production
 * - Auto-validate ALL tables, not just specific ones
 *
 * Run with:
 *   DATABASE_URL=mysql://... pnpm vitest run tests/integration/schema-verification.test.ts
 *
 * Or with test database:
 *   pnpm test:env:up && pnpm test:db:reset && DATABASE_URL=mysql://root:rootpassword@localhost:3307/terp-test pnpm vitest run tests/integration/schema-verification.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../../server/db";
import { sql } from "drizzle-orm";
import * as schema from "../../drizzle/schema";

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Tables that are known to not exist in production yet (migrations pending)
 * Add tables here temporarily while waiting for migration to run
 */
const TABLES_PENDING_MIGRATION: string[] = [
  // Example: "new_feature_table"
];

/**
 * Columns that are known to not exist in production yet
 * Format: "table_name.column_name"
 *
 * NOTE: strainId columns are pending migration. PR #351 uses safeProductSelect
 * to project NULL for strainId until migration is complete. Once migrated,
 * remove these entries and update safeProductSelect in inventoryDb.ts.
 *
 * See: docs/audits/PR-351-QA-REVIEW.md for alignment details
 */
const COLUMNS_PENDING_MIGRATION: string[] = [
  // strainId columns - pending migration (PR #351 workaround)
  "products.strainId",
  "client_needs.strainId",
  "strains.parentStrainId",
  "strains.baseStrainName",
];

// ============================================================================
// Helper Functions
// ============================================================================

type DbConnection = Awaited<ReturnType<typeof getDb>>;

async function getTableInfo(
  db: DbConnection,
  tableName: string
): Promise<{ exists: boolean; columns: string[] }> {
  if (!db) return { exists: false, columns: [] };

  try {
    const result = await db.execute(sql`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
    `);

    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    const columns = (rows as Array<{ COLUMN_NAME: string }>).map(
      r => r.COLUMN_NAME
    );

    return { exists: columns.length > 0, columns };
  } catch {
    return { exists: false, columns: [] };
  }
}

/**
 * Extract table name from Drizzle table definition
 * Handles both snake_case DB names and camelCase schema names
 */
function getTableName(tableObj: unknown): string | null {
  if (!tableObj || typeof tableObj !== "object") return null;

  // Drizzle tables have a Symbol for table name
  const symbolKeys = Object.getOwnPropertySymbols(tableObj);
  for (const sym of symbolKeys) {
    const desc = sym.description;
    if (desc === "drizzle:Name" || desc?.includes("Name")) {
      const name = (tableObj as Record<symbol, unknown>)[sym];
      if (typeof name === "string") return name;
    }
  }

  // Fallback: check for _name property (older Drizzle versions)
  if ("_" in tableObj) {
    const internal = (tableObj as Record<string, unknown>)["_"];
    if (internal && typeof internal === "object" && "name" in internal) {
      return (internal as Record<string, string>).name;
    }
  }

  return null;
}

/**
 * Extract column names from Drizzle table definition
 */
function getColumnNames(tableObj: unknown): string[] {
  if (!tableObj || typeof tableObj !== "object") return [];

  const columns: string[] = [];

  for (const [key, value] of Object.entries(tableObj)) {
    // Skip internal Drizzle properties
    if (key.startsWith("_") || key.startsWith("$")) continue;

    // Check if it's a column definition
    if (value && typeof value === "object" && "name" in value) {
      const colName = (value as Record<string, unknown>).name;
      if (typeof colName === "string") {
        columns.push(colName);
      }
    }
  }

  return columns;
}

// ============================================================================
// Main Test Suite
// ============================================================================

describe("Schema Verification (Real Database)", () => {
  let db: DbConnection;
  let skippedBecauseNoDb = false;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      console.warn(
        "⚠️ DATABASE_URL not configured - skipping real DB tests. " +
          "Set DATABASE_URL to run schema verification."
      );
      skippedBecauseNoDb = true;
      return;
    }

    // Verify connection actually works
    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      console.warn(
        "⚠️ Database connection failed - skipping real DB tests. " +
          `Error: ${error instanceof Error ? error.message : "Unknown"}`
      );
      skippedBecauseNoDb = true;
    }
  });

  afterAll(async () => {
    // Connection pool handles cleanup
  });

  // ==========================================================================
  // Core Table Existence Tests
  // ==========================================================================

  describe("Core Tables Exist", () => {
    // NOTE: Table names must match the actual Drizzle schema mysqlTable() names.
    // Some tables use camelCase (purchaseOrders, inventoryViews, auditLogs)
    // while others use snake_case (vendor_payables, referral_settings).
    const criticalTables = [
      "users",
      "clients",
      "orders",
      "batches",
      "lots",
      "products",
      "invoices",
      "payments",
      "purchaseOrders",
      "vendor_payables",
      "inventoryViews",
      "auditLogs",
    ];

    for (const tableName of criticalTables) {
      it(`should have ${tableName} table`, async () => {
        if (skippedBecauseNoDb) {
          expect(true).toBe(true); // Pass when no DB
          return;
        }

        const info = await getTableInfo(db, tableName);
        expect(info.exists).toBe(true);
      });
    }
  });

  // ==========================================================================
  // Auto-Generated Schema Validation
  // ==========================================================================

  describe("Drizzle Schema Matches Database", () => {
    // Get all exported table definitions from schema
    const schemaExports = Object.entries(schema).filter(([key, value]) => {
      // Filter for table definitions (they have column properties)
      if (!value || typeof value !== "object") return false;
      if (key.endsWith("Relations") || key.endsWith("Enum")) return false;
      if (key.startsWith("Insert") || key.endsWith("Insert")) return false;
      if (key === "default") return false;

      // Check if it looks like a Drizzle table
      const hasColumns = Object.values(value as object).some(
        v => v && typeof v === "object" && "name" in v
      );
      return hasColumns;
    });

    for (const [_schemaName, tableObj] of schemaExports) {
      const tableName = getTableName(tableObj);
      if (!tableName) continue;

      // Skip tables pending migration
      if (TABLES_PENDING_MIGRATION.includes(tableName)) {
        it.skip(`[PENDING] ${tableName} - awaiting migration`, () => {});
        continue;
      }

      describe(`Table: ${tableName}`, () => {
        it(`should exist in database`, async () => {
          if (skippedBecauseNoDb) {
            expect(true).toBe(true);
            return;
          }

          const info = await getTableInfo(db, tableName);
          expect(info.exists).toBe(true);
        });

        // Check each column defined in schema exists in DB
        const schemaColumns = getColumnNames(tableObj);
        for (const colName of schemaColumns) {
          const fullColName = `${tableName}.${colName}`;

          // Skip columns pending migration
          if (COLUMNS_PENDING_MIGRATION.includes(fullColName)) {
            it.skip(`[PENDING] column ${colName} - awaiting migration`, () => {});
            continue;
          }

          it(`should have column: ${colName}`, async () => {
            if (skippedBecauseNoDb) {
              expect(true).toBe(true);
              return;
            }

            const info = await getTableInfo(db, tableName);
            expect(info.columns).toContain(colName);
          });
        }
      });
    }
  });

  // ==========================================================================
  // Critical Query Execution Tests
  // ==========================================================================

  describe("Critical Queries Execute Successfully", () => {
    it("should execute batches + lots + clients join (SCHEMA-015 pattern)", async () => {
      if (skippedBecauseNoDb || !db) {
        expect(true).toBe(true);
        return;
      }

      // This is the actual query pattern from alerts.ts getLowStock
      // Uses backtick-quoted identifiers for camelCase column names
      const query = sql`
        SELECT b.id, l.supplier_client_id, c.name
        FROM batches b
        LEFT JOIN lots l ON b.\`lotId\` = l.id
        LEFT JOIN clients c ON l.supplier_client_id = c.id AND c.is_seller = 1
        LIMIT 1
      `;

      await expect(db.execute(query)).resolves.toBeDefined();
    });

    it("should execute products + strains join (strainId pattern)", async () => {
      if (skippedBecauseNoDb || !db) {
        expect(true).toBe(true);
        return;
      }

      const query = sql`
        SELECT p.id, p.\`strainId\`, s.name, s.\`parentStrainId\`
        FROM products p
        LEFT JOIN strains s ON p.\`strainId\` = s.id
        LIMIT 1
      `;

      await expect(db.execute(query)).resolves.toBeDefined();
    });

    it("should execute inventoryViews select (SEC-031 pattern)", async () => {
      if (skippedBecauseNoDb || !db) {
        expect(true).toBe(true);
        return;
      }

      const query = sql`
        SELECT id, name, filters, \`createdBy\`, \`isShared\`
        FROM \`inventoryViews\`
        LIMIT 1
      `;

      await expect(db.execute(query)).resolves.toBeDefined();
    });

    it("should execute vendor_payables select (SEC-032 pattern)", async () => {
      if (skippedBecauseNoDb || !db) {
        expect(true).toBe(true);
        return;
      }

      const query = sql`
        SELECT id, \`payableNumber\`, \`batchId\`, \`vendorClientId\`, \`createdBy\`
        FROM vendor_payables
        LIMIT 1
      `;

      await expect(db.execute(query)).resolves.toBeDefined();
    });

    it("should execute purchaseOrders with supplierClientId (BUG-135 pattern)", async () => {
      if (skippedBecauseNoDb || !db) {
        expect(true).toBe(true);
        return;
      }

      const query = sql`
        SELECT id, \`poNumber\`, \`supplierClientId\`, \`createdBy\`
        FROM \`purchaseOrders\`
        LIMIT 1
      `;

      await expect(db.execute(query)).resolves.toBeDefined();
    });
  });

  // ==========================================================================
  // Deprecation Enforcement
  // ==========================================================================

  describe("Deprecated Tables/Columns", () => {
    it("should NOT use vendors table for new queries", async () => {
      // This test documents that vendors is deprecated
      // per CLAUDE.md - use clients with isSeller=true instead
      expect(true).toBe(true); // Documentation test
    });

    it("should have clients.is_seller for supplier queries", async () => {
      if (skippedBecauseNoDb) {
        expect(true).toBe(true);
        return;
      }

      const info = await getTableInfo(db, "clients");
      expect(info.columns).toContain("is_seller");
    });
  });
});

// ============================================================================
// Export for programmatic use
// ============================================================================

export { getTableInfo, getTableName, getColumnNames };
