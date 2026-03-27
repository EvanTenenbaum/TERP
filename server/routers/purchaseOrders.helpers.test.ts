import { describe, expect, it } from "vitest";
import {
  dedupeRecentSupplierProducts,
  normalizePurchaseOrderTotals,
  normalizePurchaseOrderPaymentTerms,
  shouldFallbackRecentProductsBySupplier,
  summarizePurchaseOrderItemCost,
} from "./purchaseOrders";

describe("purchaseOrders helpers", () => {
  it("defaults purchase order payment terms to consignment", () => {
    expect(normalizePurchaseOrderPaymentTerms(undefined)).toBe("CONSIGNMENT");
    expect(normalizePurchaseOrderPaymentTerms("Net 15")).toBe("NET_15");
    expect(normalizePurchaseOrderPaymentTerms("Due on Receipt")).toBe("COD");
  });

  it("preserves range COGS and derives the midpoint unit cost", () => {
    expect(
      summarizePurchaseOrderItemCost({
        cogsMode: "RANGE",
        unitCostMin: 18,
        unitCostMax: 22,
      })
    ).toEqual({
      cogsMode: "RANGE",
      unitCost: 20,
      unitCostMin: 18,
      unitCostMax: 22,
    });
  });

  it("deduplicates recent supplier products by product id and name fallback", () => {
    expect(
      dedupeRecentSupplierProducts(
        [
          {
            productId: 11,
            productName: "Blue Dream",
          },
          {
            productId: 11,
            productName: "Blue Dream",
          },
          {
            productId: null,
            productName: "Mystery Lot",
          },
          {
            productId: null,
            productName: "mystery lot",
          },
        ],
        8
      )
    ).toEqual([
      {
        productId: 11,
        productName: "Blue Dream",
      },
      {
        productId: null,
        productName: "Mystery Lot",
      },
    ]);
  });

  it("falls back to legacy supplier history only for range-cogs schema drift", () => {
    expect(
      shouldFallbackRecentProductsBySupplier(
        new Error(
          "Unknown column 'purchaseOrderItems.cogsMode' in 'field list'"
        )
      )
    ).toBe(true);
    expect(
      shouldFallbackRecentProductsBySupplier(
        new Error(
          "Unknown column 'purchaseOrderItems.unitCostMax' in 'field list'"
        )
      )
    ).toBe(true);
    expect(
      shouldFallbackRecentProductsBySupplier(
        new Error(
          "Unknown column 'purchaseOrderItems.deletedAt' in 'where clause'"
        )
      )
    ).toBe(true);
    expect(
      shouldFallbackRecentProductsBySupplier(new Error("Connection lost"))
    ).toBe(false);
  });

  it("repairs stale negative totals from active PO items only", () => {
    expect(
      normalizePurchaseOrderTotals(
        {
          subtotal: "-500.00",
          total: "-500.00",
        },
        [
          { totalCost: "300.00", deletedAt: null },
          { totalCost: "200.00", deletedAt: null },
          { totalCost: "999.00", deletedAt: new Date("2026-03-01") },
        ]
      )
    ).toEqual({
      subtotal: "500.00",
      total: "500.00",
    });
  });
});
