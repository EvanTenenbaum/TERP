import { describe, expect, it } from "vitest";
import {
  transformClientOrderRows,
  transformInventoryRecord,
  type ClientOrderRecord,
  type InventoryBatchRecord,
} from "./spreadsheetViewService";

describe("spreadsheetViewService", () => {
  describe("transformInventoryRecord", () => {
    it("calculates quantities and subtotal using batch data", () => {
      const record: InventoryBatchRecord = {
        batch: {
          id: 1,
          code: "B-1",
          sku: "SKU-1",
          batchStatus: "LIVE",
          onHandQty: "10",
          reservedQty: "2",
          quarantineQty: "1",
          holdQty: "0",
          unitCogs: "5.50",
          metadata: JSON.stringify({ notes: "Check moisture" }),
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-02"),
          version: 1,
        },
        product: { nameCanonical: "Blue Dream", category: "Flower" },
        brand: { name: "BrandCo" },
        lot: { code: "LOT-001", date: new Date("2024-01-05") },
        vendor: { name: "Vendor X" },
      };

      const row = transformInventoryRecord(record);

      expect(row.id).toBe(1);
      expect(row.vendorCode).toBe("LOT-001");
      expect(row.lotDate).toBe("2024-01-05");
      expect(row.source).toBe("BrandCo");
      expect(row.category).toBe("Flower");
      expect(row.item).toBe("Blue Dream");
      expect(row.available).toBeCloseTo(7);
      expect(row.intake).toBeCloseTo(10);
      expect(row.ticket).toBeCloseTo(5.5);
      expect(row.sub).toBeCloseTo(55);
      expect(row.notes).toBe("Check moisture");
      expect(row.confirm).toBe("LIVE");
    });

    it("handles missing optional fields gracefully", () => {
      const record: InventoryBatchRecord = {
        batch: {
          id: 2,
          code: "B-2",
          sku: "SKU-2",
          batchStatus: null,
          onHandQty: "0",
          reservedQty: "0",
          quarantineQty: "0",
          holdQty: "0",
          unitCogs: null,
          metadata: null,
          createdAt: null,
          updatedAt: null,
          version: 1,
        },
        product: null,
        brand: null,
        lot: null,
        vendor: null,
      };

      const row = transformInventoryRecord(record);

      expect(row.vendorCode).toBeNull();
      expect(row.lotDate).toBeNull();
      expect(row.source).toBeNull();
      expect(row.category).toBeNull();
      expect(row.item).toBeNull();
      expect(row.available).toBe(0);
      expect(row.intake).toBe(0);
      expect(row.ticket).toBe(0);
      expect(row.sub).toBe(0);
      expect(row.notes).toBeNull();
      expect(row.confirm).toBeNull();
    });

    // QA-W2-003: Test original intake quantity (TERP-SS-004)
    it("uses intakeQty when available", () => {
      const record: InventoryBatchRecord = {
        batch: {
          id: 3,
          code: "B-3",
          sku: "SKU-3",
          batchStatus: "LIVE",
          onHandQty: "50",
          reservedQty: "0",
          quarantineQty: "0",
          holdQty: "0",
          unitCogs: "10.00",
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        product: { nameCanonical: "Test Product", category: "Flower" },
        brand: null,
        lot: null,
        vendor: null,
        intakeQty: 100, // Original intake quantity
      };

      const row = transformInventoryRecord(record);
      expect(row.intake).toBe(100); // Should use intakeQty, not onHandQty
      expect(row.sub).toBe(1000); // 100 * 10
    });

    // QA-W2-003: Test metadata originalQty fallback
    it("extracts intake from metadata originalQty", () => {
      const record: InventoryBatchRecord = {
        batch: {
          id: 4,
          code: "B-4",
          sku: "SKU-4",
          batchStatus: "LIVE",
          onHandQty: "30",
          reservedQty: "0",
          quarantineQty: "0",
          holdQty: "0",
          unitCogs: "5.00",
          metadata: JSON.stringify({ originalQty: 75 }),
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
        product: null,
        brand: null,
        lot: null,
        vendor: null,
      };

      const row = transformInventoryRecord(record);
      expect(row.intake).toBe(75); // Should extract from metadata
    });

    // QA-W2-003: Test vendorCode fallback to vendor name
    it("falls back to vendor name when lot code is missing", () => {
      const record: InventoryBatchRecord = {
        batch: {
          id: 5,
          code: "B-5",
          sku: "SKU-5",
          batchStatus: "LIVE",
          onHandQty: "10",
          reservedQty: "0",
          quarantineQty: "0",
          holdQty: "0",
          unitCogs: null,
          metadata: null,
          createdAt: null,
          updatedAt: null,
          version: 1,
        },
        product: null,
        brand: null,
        lot: { code: undefined, date: undefined },
        vendor: { name: "Fallback Vendor" },
      };

      const row = transformInventoryRecord(record);
      expect(row.vendorCode).toBe("Fallback Vendor");
    });
  });

  describe("transformClientOrderRows", () => {
    it("expands order items into client grid rows with payment flags", () => {
      const order: ClientOrderRecord = {
        id: 10,
        orderNumber: "SO-100",
        orderType: "SALE",
        clientId: 5,
        items: [
          { displayName: "Item A", quantity: 2, unitPrice: 15, unitCogs: 8 },
          { displayName: "Item B", quantity: 1, unitPrice: 20, unitCogs: 12 },
        ],
        subtotal: 50,
        total: 50,
        paymentTerms: "NET_30",
        cashPayment: "10",
        saleStatus: "CONFIRMED",
        invoiceId: 123,
        pickPackStatus: "PENDING",
        notes: "rush",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-02"),
        dueDate: new Date("2024-03-01"),
      };

      const rows = transformClientOrderRows(order);

      expect(rows).toHaveLength(2);
      expect(rows[0].orderId).toBe(10);
      expect(rows[0].vendorCode).toBe("SO-100");
      expect(rows[0].date).toBe("2024-02-01");
      expect(rows[0].item).toBe("Item A");
      expect(rows[0].qty).toBe(2);
      expect(rows[0].unitPrice).toBeCloseTo(15);
      expect(rows[0].total).toBeCloseTo(30);
      expect(rows[0].payment).toBe("NET_30");
      expect(rows[0].note).toBe("rush");
      expect(rows[0].paid).toBe(true);
      expect(rows[0].invoiced).toBe(true);
      expect(rows[0].confirmed).toBe(true);
    });

    // QA-W2-003: Test batchCode display (TERP-SS-003)
    it("uses batchCode when available for vendorCode display", () => {
      const order: ClientOrderRecord = {
        id: 20,
        orderNumber: "SO-200",
        orderType: "SALE",
        clientId: 10,
        items: [
          {
            displayName: "Item with Batch",
            quantity: 1,
            unitPrice: 50,
            batchId: 123,
            batchCode: "BATCH-ABC",
          },
        ],
        subtotal: 50,
        total: 50,
        paymentTerms: null,
        cashPayment: null,
        saleStatus: null,
        invoiceId: null,
        pickPackStatus: null,
        notes: null,
        createdAt: null,
        updatedAt: null,
        dueDate: null,
      };

      const rows = transformClientOrderRows(order);
      expect(rows[0].vendorCode).toBe("BATCH-ABC");
    });

    // QA-W2-003: Test payment amount display (TERP-SS-005)
    it("parses payment amount correctly", () => {
      const order: ClientOrderRecord = {
        id: 30,
        orderNumber: "SO-300",
        orderType: "SALE",
        clientId: 15,
        items: [{ displayName: "Test Item", quantity: 1, unitPrice: 100 }],
        subtotal: 100,
        total: 100,
        paymentTerms: "NET_15",
        cashPayment: "75.50",
        saleStatus: null,
        invoiceId: null,
        pickPackStatus: null,
        notes: null,
        createdAt: new Date("2024-03-01"),
        updatedAt: null,
        dueDate: null,
      };

      const rows = transformClientOrderRows(order);
      expect(rows[0].paymentAmount).toBeCloseTo(75.5);
      expect(rows[0].paid).toBe(true);
    });

    // QA-W2-003: Test unpaid order
    it("marks order as unpaid when no payment", () => {
      const order: ClientOrderRecord = {
        id: 40,
        orderNumber: "SO-400",
        orderType: "SALE",
        clientId: 20,
        items: [{ displayName: "Unpaid Item", quantity: 1, unitPrice: 200 }],
        subtotal: 200,
        total: 200,
        paymentTerms: null,
        cashPayment: null,
        saleStatus: null,
        invoiceId: null,
        pickPackStatus: null,
        notes: null,
        createdAt: null,
        updatedAt: null,
        dueDate: null,
      };

      const rows = transformClientOrderRows(order);
      expect(rows[0].paymentAmount).toBe(0);
      expect(rows[0].paid).toBe(false);
      expect(rows[0].invoiced).toBe(false);
    });
  });
});
