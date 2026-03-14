import { describe, expect, it } from "vitest";

import { parsePurchaseOrderDeepLink } from "./purchaseOrdersDeepLink";

describe("parsePurchaseOrderDeepLink", () => {
  it("hydrates a selected purchase order id from the canonical id param", () => {
    expect(parsePurchaseOrderDeepLink("?tab=receiving&id=42")).toEqual({
      poId: 42,
      supplierClientId: null,
    });
  });

  it("hydrates the supplier client id from relationship quick actions", () => {
    expect(
      parsePurchaseOrderDeepLink("?supplierClientId=2330&tab=procurement")
    ).toEqual({
      poId: null,
      supplierClientId: 2330,
    });
  });

  it("ignores invalid ids", () => {
    expect(
      parsePurchaseOrderDeepLink("?id=not-a-number&supplierClientId=0")
    ).toEqual({
      poId: null,
      supplierClientId: null,
    });
  });
});
