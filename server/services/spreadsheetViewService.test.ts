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
  });
});
