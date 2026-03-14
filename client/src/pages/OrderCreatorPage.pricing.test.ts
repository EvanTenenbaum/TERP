import { describe, expect, it } from "vitest";

import { resolveInventoryPricingContext } from "./OrderCreatorPage";

describe("resolveInventoryPricingContext", () => {
  it("marks rows with applied pricing rules as customer-profile priced", () => {
    expect(
      resolveInventoryPricingContext({
        appliedRules: [
          {
            ruleId: 1,
            ruleName: "VIP Flower",
            adjustment: "+10%",
          },
        ],
        priceMarkup: 10,
      })
    ).toEqual({
      marginSource: "CUSTOMER_PROFILE",
      profilePriceAdjustmentPercent: 10,
    });
  });

  it("marks rows without pricing rules as fallback priced", () => {
    expect(
      resolveInventoryPricingContext({
        appliedRules: [],
        priceMarkup: 0,
      })
    ).toEqual({
      marginSource: "DEFAULT",
      profilePriceAdjustmentPercent: null,
    });
  });
});
