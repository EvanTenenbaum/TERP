import { describe, expect, it } from "vitest";
import {
  normalizePurchaseOrderPaymentTerms,
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
});
