import { describe, expect, it } from "vitest";
import {
  buildConfirmedQueryInput,
  buildDraftQueryInput,
  getDisplayOrderNumber,
} from "./OrdersWorkSurface";

describe("buildDraftQueryInput", () => {
  it("keeps the orders draft tab constrained to sales drafts", () => {
    expect(buildDraftQueryInput()).toEqual({
      orderType: "SALE",
      isDraft: true,
    });
  });
});

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

describe("getDisplayOrderNumber", () => {
  it("shows draft sales with a draft prefix", () => {
    expect(
      getDisplayOrderNumber({
        orderNumber: "S-1773258139432",
        isDraft: true,
        orderType: "SALE",
      })
    ).toBe("D-1773258139432");
  });

  it("keeps draft quotes on a quote prefix", () => {
    expect(
      getDisplayOrderNumber({
        orderNumber: "Q-1772732286605",
        isDraft: true,
        orderType: "QUOTE",
      })
    ).toBe("Q-1772732286605");
  });

  it("normalizes legacy confirmed sale prefixes to sales", () => {
    expect(
      getDisplayOrderNumber({
        orderNumber: "D-1772572680223",
        isDraft: false,
        orderType: "SALE",
      })
    ).toBe("S-1772572680223");
  });
});
