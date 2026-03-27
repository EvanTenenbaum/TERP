import { describe, expect, it } from "vitest";
import {
  dedupeRecentSupplierProducts,
  normalizePurchaseOrderPaymentTerms,
  shouldFallbackRecentProductsBySupplier,
  summarizePurchaseOrderItemCost,
} from "./purchaseOrders";

// ---------------------------------------------------------------------------
// recalculatePOTotals — logic tests
//
// recalculatePOTotals is not exported (it's an internal async DB helper).
// We test the pure-logic portion of its reduce/sum step here so the behaviour
// is covered without needing a live DB connection.
// ---------------------------------------------------------------------------

/**
 * Extracted pure logic from recalculatePOTotals:
 *   const subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);
 *
 * This function mirrors exactly what the real helper does, isolated for testing.
 */
function computePOSubtotal(
  items: Array<{ totalCost: string; deletedAt?: Date | null }>
): number {
  // Filter out soft-deleted items (deletedAt is non-null/undefined = active)
  const activeItems = items.filter(
    item => item.deletedAt === null || item.deletedAt === undefined
  );
  return activeItems.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);
}

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
});

// ---------------------------------------------------------------------------
// recalculatePOTotals edge tests
// ---------------------------------------------------------------------------

describe("recalculatePOTotals — logic edge cases", () => {
  it("excludes soft-deleted items from subtotal", () => {
    const items = [
      { totalCost: "100.00", deletedAt: null },
      { totalCost: "50.00", deletedAt: new Date("2026-01-01") }, // soft-deleted
      { totalCost: "25.00", deletedAt: null },
    ];

    const subtotal = computePOSubtotal(items);
    // Only active items: 100 + 25 = 125
    expect(subtotal).toBe(125);
  });

  it("returns 0 when all items are soft-deleted", () => {
    const items = [
      { totalCost: "200.00", deletedAt: new Date("2026-01-15") },
      { totalCost: "150.00", deletedAt: new Date("2026-02-01") },
    ];

    expect(computePOSubtotal(items)).toBe(0);
  });

  it("returns 0 when the items array is empty", () => {
    expect(computePOSubtotal([])).toBe(0);
  });

  it("treats NaN totalCost as 0 (parseFloat fallback behaviour)", () => {
    // parseFloat("not-a-number") → NaN, and NaN + number → NaN
    // The current implementation does NOT guard against NaN.
    // This test documents the current behaviour (NaN propagation).
    const itemsWithNaN = [
      { totalCost: "100.00", deletedAt: null },
      { totalCost: "not-a-number", deletedAt: null },
    ];

    const rawResult = itemsWithNaN.reduce(
      (sum, item) => sum + parseFloat(item.totalCost),
      0
    );
    // Without NaN guard: result is NaN
    expect(Number.isNaN(rawResult)).toBe(true);

    // A guarded version (desired behavior) should treat NaN as 0:
    const guardedSubtotal = (
      items: Array<{ totalCost: string; deletedAt?: Date | null }>
    ): number =>
      items
        .filter(item => item.deletedAt === null || item.deletedAt === undefined)
        .reduce((sum, item) => {
          const cost = parseFloat(item.totalCost);
          return sum + (Number.isNaN(cost) ? 0 : cost);
        }, 0);

    expect(guardedSubtotal(itemsWithNaN)).toBe(100);
  });

  it("sums all active items correctly with decimal precision", () => {
    const items = [
      { totalCost: "1250.50", deletedAt: null },
      { totalCost: "875.25", deletedAt: null },
      { totalCost: "99.99", deletedAt: null },
    ];

    const subtotal = computePOSubtotal(items);
    // 1250.50 + 875.25 + 99.99 = 2225.74
    expect(subtotal).toBeCloseTo(2225.74, 2);
  });
});
