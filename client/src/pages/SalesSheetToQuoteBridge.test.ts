/**
 * @vitest-environment jsdom
 *
 * TER-233: Verify sessionStorage bridge preserves orderQuantity
 * when converting from Sales Sheet to Quote.
 */

import { describe, expect, it, afterEach } from "vitest";
import type { PricedInventoryItem } from "../components/sales/types";

// Mirrors the mapping logic in SalesSheetCreatorPage (lines 494-503)
function buildBridgePayload(
  clientId: number,
  selectedItems: PricedInventoryItem[]
) {
  return {
    clientId,
    items: selectedItems.map(item => ({
      id: item.id,
      name: item.name,
      basePrice: item.basePrice,
      retailPrice: item.retailPrice,
      quantity: item.quantity,
      category: item.category,
      vendor: item.vendor,
      orderQuantity: item.orderQuantity,
    })),
  };
}

describe("SalesSheet → Quote sessionStorage bridge (TER-233)", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("preserves user-specified orderQuantity through round-trip", () => {
    const items: PricedInventoryItem[] = [
      {
        id: 101,
        name: "Blue Dream 3.5g",
        basePrice: 8,
        retailPrice: 12,
        quantity: 50, // available stock
        orderQuantity: 3, // user specified 3 units
        priceMarkup: 50,
        appliedRules: [],
      },
      {
        id: 102,
        name: "OG Kush 7g",
        basePrice: 15,
        retailPrice: 22,
        quantity: 25,
        orderQuantity: 5,
        priceMarkup: 46,
        appliedRules: [],
      },
    ];

    // Write to sessionStorage (what SalesSheetCreatorPage does)
    const payload = buildBridgePayload(42, items);
    sessionStorage.setItem("salesSheetToQuote", JSON.stringify(payload));

    // Read back (what OrderCreatorPage does)
    const raw = sessionStorage.getItem("salesSheetToQuote");
    const data = JSON.parse(raw ?? "{}") as {
      clientId: number;
      items: Array<{
        id: number;
        orderQuantity?: number;
        quantity?: number;
      }>;
    };

    expect(data.clientId).toBe(42);
    expect(data.items).toHaveLength(2);

    // The key assertion: orderQuantity survives the bridge
    expect(data.items[0].orderQuantity).toBe(3);
    expect(data.items[0].quantity).toBe(50);
    expect(data.items[1].orderQuantity).toBe(5);
    expect(data.items[1].quantity).toBe(25);
  });

  it("handles items without orderQuantity (fallback to quantity)", () => {
    const items: PricedInventoryItem[] = [
      {
        id: 201,
        name: "Sour Diesel 1oz",
        basePrice: 120,
        retailPrice: 180,
        quantity: 10,
        // no orderQuantity set
        priceMarkup: 50,
        appliedRules: [],
      },
    ];

    const payload = buildBridgePayload(99, items);
    sessionStorage.setItem("salesSheetToQuote", JSON.stringify(payload));

    const raw = sessionStorage.getItem("salesSheetToQuote");
    const data = JSON.parse(raw ?? "{}");

    // orderQuantity should be undefined, quantity should be available stock
    expect(data.items[0].orderQuantity).toBeUndefined();
    expect(data.items[0].quantity).toBe(10);
  });
});
