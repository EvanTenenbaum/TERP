import { describe, expect, it } from "vitest";
import { buildConfirmedQueryInput } from "./OrdersWorkSurface";

describe("buildConfirmedQueryInput", () => {
  it("always constrains confirmed orders to sales", () => {
    expect(buildConfirmedQueryInput()).toEqual({
      orderType: "SALE",
      isDraft: false,
    });
  });

  it("preserves the selected fulfillment filter for sales only", () => {
    expect(buildConfirmedQueryInput("SHIPPED")).toEqual({
      orderType: "SALE",
      isDraft: false,
      fulfillmentStatus: "SHIPPED",
    });
  });
});
