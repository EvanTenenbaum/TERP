/**
 * Property-Based Tests for Seeder Index
 *
 * **Feature: data-completeness-fix, Property 10: Referential Integrity**
 * **Validates: Requirements 10.2**
 *
 * Verifies the seeding order respects FK dependencies.
 */

import { describe, it, expect } from "vitest";
import { SEEDING_ORDER } from "./index";

// ============================================================================
// FK Dependency Map
// ============================================================================

/**
 * Map of tables to their FK dependencies
 * A table can only be seeded after all its dependencies are seeded
 */
const FK_DEPENDENCIES: Record<string, string[]> = {
  vendors: [],
  clients: [],
  products: ["vendors"], // products depend on vendors (via brands)
  purchaseOrders: ["vendors", "products"],
  batches: ["products", "vendors"],
  product_images: ["batches", "products"],
  orders: ["clients", "batches"],
  client_transactions: ["clients", "orders"],
  invoices: ["clients", "orders"],
  payments: ["invoices", "clients"],
  bills: ["vendors"], // bills depend on vendors
};

// ============================================================================
// Property Tests
// ============================================================================

describe("Seeder Index Properties", () => {
  /**
   * **Feature: data-completeness-fix, Property 10: Referential Integrity**
   * **Validates: Requirements 10.2**
   *
   * Property: For any complete seed operation, all foreign key references
   * SHALL point to existing records (no orphaned records).
   */
  describe("Property 10: Referential Integrity", () => {
    it("should have all tables in SEEDING_ORDER", () => {
      const expectedTables = Object.keys(FK_DEPENDENCIES);
      for (const table of expectedTables) {
        expect(SEEDING_ORDER).toContain(table);
      }
    });

    it("should seed dependencies before dependents", () => {
      // For each table, verify all its dependencies come before it in SEEDING_ORDER
      for (const table of SEEDING_ORDER) {
        const dependencies = FK_DEPENDENCIES[table] || [];
        const tableIndex = SEEDING_ORDER.indexOf(table);

        for (const dep of dependencies) {
          const depIndex = SEEDING_ORDER.indexOf(dep);
          expect(depIndex).toBeLessThan(tableIndex);
        }
      }
    });

    it("should have vendors before products", () => {
      const vendorsIndex = SEEDING_ORDER.indexOf("vendors");
      const productsIndex = SEEDING_ORDER.indexOf("products");
      expect(vendorsIndex).toBeLessThan(productsIndex);
    });

    it("should have products before batches", () => {
      const productsIndex = SEEDING_ORDER.indexOf("products");
      const batchesIndex = SEEDING_ORDER.indexOf("batches");
      expect(productsIndex).toBeLessThan(batchesIndex);
    });

    it("should have batches before orders", () => {
      const batchesIndex = SEEDING_ORDER.indexOf("batches");
      const ordersIndex = SEEDING_ORDER.indexOf("orders");
      expect(batchesIndex).toBeLessThan(ordersIndex);
    });

    it("should have batches before product_images", () => {
      const batchesIndex = SEEDING_ORDER.indexOf("batches");
      const productImagesIndex = SEEDING_ORDER.indexOf("product_images");
      expect(batchesIndex).toBeLessThan(productImagesIndex);
    });

    it("should have products before product_images", () => {
      const productsIndex = SEEDING_ORDER.indexOf("products");
      const productImagesIndex = SEEDING_ORDER.indexOf("product_images");
      expect(productsIndex).toBeLessThan(productImagesIndex);
    });

    it("should have orders before invoices", () => {
      const ordersIndex = SEEDING_ORDER.indexOf("orders");
      const invoicesIndex = SEEDING_ORDER.indexOf("invoices");
      expect(ordersIndex).toBeLessThan(invoicesIndex);
    });

    it("should have invoices before payments", () => {
      const invoicesIndex = SEEDING_ORDER.indexOf("invoices");
      const paymentsIndex = SEEDING_ORDER.indexOf("payments");
      expect(invoicesIndex).toBeLessThan(paymentsIndex);
    });

    it("should have vendors before bills", () => {
      const vendorsIndex = SEEDING_ORDER.indexOf("vendors");
      const billsIndex = SEEDING_ORDER.indexOf("bills");
      expect(vendorsIndex).toBeLessThan(billsIndex);
    });

    it("should have vendors before purchaseOrders", () => {
      const vendorsIndex = SEEDING_ORDER.indexOf("vendors");
      const poIndex = SEEDING_ORDER.indexOf("purchaseOrders");
      expect(vendorsIndex).toBeLessThan(poIndex);
    });

    it("should have products before purchaseOrders", () => {
      const productsIndex = SEEDING_ORDER.indexOf("products");
      const poIndex = SEEDING_ORDER.indexOf("purchaseOrders");
      expect(productsIndex).toBeLessThan(poIndex);
    });
  });

  describe("SEEDING_ORDER Completeness", () => {
    it("should include all core tables", () => {
      const coreTables = [
        "vendors",
        "clients",
        "products",
        "batches",
        "product_images",
        "orders",
        "invoices",
        "payments",
      ];
      for (const table of coreTables) {
        expect(SEEDING_ORDER).toContain(table);
      }
    });

    it("should include complete mode tables", () => {
      const completeTables = ["purchaseOrders", "bills"];
      for (const table of completeTables) {
        expect(SEEDING_ORDER).toContain(table);
      }
    });
  });
});
