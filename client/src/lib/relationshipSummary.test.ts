import { describe, expect, it } from "vitest";

import { getRelationshipSummary } from "./relationshipSummary";

describe("getRelationshipSummary", () => {
  it("returns Buyer for buyer-only clients", () => {
    expect(getRelationshipSummary({ isBuyer: true })).toBe("Buyer");
  });

  it("returns Seller for seller-only clients", () => {
    expect(getRelationshipSummary({ isSeller: true })).toBe("Seller");
  });

  it("returns Both when buyer and seller flags are present", () => {
    expect(getRelationshipSummary({ isBuyer: true, isSeller: true })).toBe(
      "Both"
    );
  });

  it("includes Brand when the brand flag is also present", () => {
    expect(
      getRelationshipSummary({
        isBuyer: true,
        isSeller: true,
        isBrand: true,
      })
    ).toBe("Both • Brand");
  });
});
