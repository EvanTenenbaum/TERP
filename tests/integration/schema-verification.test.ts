/**
 * Schema Verification Tests
 *
 * CRITICAL: These tests hit the REAL database, not mocks.
 * They verify that columns referenced in code actually exist in the database.
 *
 * Run with: pnpm test:env:up && pnpm test:db:reset && jest tests/integration/schema-verification.test.ts
 *
 * Created: 2026-01-30
 * Purpose: Catch schema drift BEFORE code ships to production
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { getDb } from "../../server/db";
import { sql } from "drizzle-orm";

describe("Schema Verification Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error(
        "DATABASE_URL not configured. Set DATABASE_URL or TEST_DATABASE_URL to run these tests."
      );
    }
  });

  afterAll(async () => {
    // Connection cleanup handled by pool
  });

  // ============================================================================
  // Helper: Check if column exists
  // ============================================================================

  async function columnExists(
    tableName: string,
    columnName: string
  ): Promise<boolean> {
    if (!db) return false;

    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
        AND COLUMN_NAME = ${columnName}
    `);

    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = (rows as Array<{ count: number }>)[0]?.count ?? 0;
    return count > 0;
  }

  async function tableExists(tableName: string): Promise<boolean> {
    if (!db) return false;

    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
    `);

    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    const count = (rows as Array<{ count: number }>)[0]?.count ?? 0;
    return count > 0;
  }

  // ============================================================================
  // SEC-031: inventoryViews table schema
  // ============================================================================

  describe("SEC-031: inventoryViews schema", () => {
    it("should have inventory_views table", async () => {
      const exists = await tableExists("inventory_views");
      expect(exists).toBe(true);
    });

    it("should have createdBy column in inventory_views", async () => {
      // SEC-031 changed saveInventoryView to use actorId for createdBy
      const exists = await columnExists("inventory_views", "createdBy");
      expect(exists).toBe(true);
    });

    it("should have required columns for inventory view creation", async () => {
      const requiredColumns = [
        "id",
        "name",
        "filters",
        "createdBy",
        "isShared",
      ];

      for (const col of requiredColumns) {
        const exists = await columnExists("inventory_views", col);
        expect(exists)
          .withContext(`Column inventory_views.${col} should exist`)
          .toBe(true);
      }
    });
  });

  // ============================================================================
  // SEC-032: vendorPayables table schema
  // ============================================================================

  describe("SEC-032: vendorPayables schema", () => {
    it("should have vendor_payables table", async () => {
      const exists = await tableExists("vendor_payables");
      expect(exists).toBe(true);
    });

    it("should have createdBy column in vendor_payables", async () => {
      // SEC-032 changed createPayable to use actorId for createdBy
      const exists = await columnExists("vendor_payables", "createdBy");
      expect(exists).toBe(true);
    });

    it("should have required columns for payable creation", async () => {
      const requiredColumns = [
        "id",
        "payableNumber",
        "batchId",
        "lotId",
        "vendorClientId",
        "cogsPerUnit",
        "totalQty",
        "amountDue",
        "status",
        "createdBy",
      ];

      for (const col of requiredColumns) {
        const exists = await columnExists("vendor_payables", col);
        expect(exists)
          .withContext(`Column vendor_payables.${col} should exist`)
          .toBe(true);
      }
    });
  });

  // ============================================================================
  // SCHEMA-015: alerts.ts vendor join removal - lots.supplierClientId
  // ============================================================================

  describe("SCHEMA-015: lots.supplierClientId schema", () => {
    it("should have lots table", async () => {
      const exists = await tableExists("lots");
      expect(exists).toBe(true);
    });

    it("should have supplierClientId column in lots (CRITICAL)", async () => {
      // SCHEMA-015 changed alerts.ts to use lots.supplierClientId instead of vendorId
      // If this column doesn't exist, the getLowStock query will fail
      const exists = await columnExists("lots", "supplier_client_id");
      expect(exists).toBe(true);
    });

    it("should have clients table with isSeller column", async () => {
      // SCHEMA-015 joins with clients where isSeller=true
      const tableExistsResult = await tableExists("clients");
      expect(tableExistsResult).toBe(true);

      const colExists = await columnExists("clients", "isSeller");
      expect(colExists).toBe(true);
    });
  });

  // ============================================================================
  // strainId columns - Known potential schema drift
  // ============================================================================

  describe("strainId columns (potential schema drift)", () => {
    it("should have strains table", async () => {
      const exists = await tableExists("strains");
      expect(exists).toBe(true);
    });

    it("should have strainId column in products", async () => {
      // products.strainId is used heavily in matchingEngineEnhanced.ts, strainService.ts, etc.
      const exists = await columnExists("products", "strainId");
      expect(exists).toBe(true);
    });

    it("should have strainId column in client_needs", async () => {
      // client_needs.strainId is used in matching queries
      const exists = await columnExists("client_needs", "strainId");
      expect(exists).toBe(true);
    });

    it("should have parentStrainId column in strains", async () => {
      // strains.parentStrainId is used for strain family support
      const exists = await columnExists("strains", "parentStrainId");
      expect(exists).toBe(true);
    });

    it("should have baseStrainName column in strains", async () => {
      // strains.baseStrainName is used for strain family grouping
      const exists = await columnExists("strains", "baseStrainName");
      expect(exists).toBe(true);
    });
  });

  // ============================================================================
  // Purchase Orders - BUG-135 changes
  // ============================================================================

  describe("BUG-135: purchaseOrders schema", () => {
    it("should have purchase_orders table", async () => {
      const exists = await tableExists("purchase_orders");
      expect(exists).toBe(true);
    });

    it("should have createdBy column in purchase_orders", async () => {
      // BUG-135 changed PO creation to use getAuthenticatedUserId for createdBy
      const exists = await columnExists("purchase_orders", "createdBy");
      expect(exists).toBe(true);
    });

    it("should have supplierClientId column in purchase_orders", async () => {
      // PO creation uses supplierClientId to link to clients (not vendors)
      const exists = await columnExists("purchase_orders", "supplierClientId");
      expect(exists).toBe(true);
    });
  });

  // ============================================================================
  // Query Execution Tests - Actually run the queries that changed code uses
  // ============================================================================

  describe("Query Execution Tests", () => {
    it("should execute getLowStock query without errors (SCHEMA-015)", async () => {
      if (!db) throw new Error("Database not available");

      // This is the actual query structure from alerts.ts getLowStock
      // If any column doesn't exist, this will throw an error
      const query = sql`
        SELECT
          b.id as batchId,
          b.sku,
          b.onHandQty,
          l.supplier_client_id as supplierClientId,
          c.name as vendorName
        FROM batches b
        LEFT JOIN lots l ON b.lotId = l.id
        LEFT JOIN clients c ON l.supplier_client_id = c.id AND c.isSeller = 1
        WHERE b.batch_status = 'LIVE'
        LIMIT 1
      `;

      // This should NOT throw an error if schema is correct
      await expect(db.execute(query)).resolves.toBeDefined();
    });

    it("should execute inventory view insert without errors (SEC-031)", async () => {
      if (!db) throw new Error("Database not available");

      // Test the query structure used in saveInventoryView
      const query = sql`
        SELECT
          iv.id,
          iv.name,
          iv.filters,
          iv.createdBy,
          iv.isShared
        FROM inventory_views iv
        LIMIT 1
      `;

      await expect(db.execute(query)).resolves.toBeDefined();
    });

    it("should execute vendor payables query without errors (SEC-032)", async () => {
      if (!db) throw new Error("Database not available");

      // Test the query structure used in createPayable
      const query = sql`
        SELECT
          vp.id,
          vp.payableNumber,
          vp.batchId,
          vp.lotId,
          vp.vendorClientId,
          vp.createdBy
        FROM vendor_payables vp
        LIMIT 1
      `;

      await expect(db.execute(query)).resolves.toBeDefined();
    });

    it("should execute products.strainId query without errors", async () => {
      if (!db) throw new Error("Database not available");

      // Test the query pattern used in strainService.ts and matchingEngineEnhanced.ts
      const query = sql`
        SELECT
          p.id,
          p.strainId,
          s.name as strainName,
          s.parentStrainId
        FROM products p
        LEFT JOIN strains s ON p.strainId = s.id
        LIMIT 1
      `;

      await expect(db.execute(query)).resolves.toBeDefined();
    });
  });
});

// ============================================================================
// withContext helper for better error messages
// ============================================================================

declare global {
  namespace jest {
    interface Matchers<R> {
      withContext(context: string): R;
    }
  }
}

expect.extend({
  withContext(received: boolean, context: string) {
    return {
      pass: received === true,
      message: () => `${context}: expected true but got ${received}`,
    };
  },
});
