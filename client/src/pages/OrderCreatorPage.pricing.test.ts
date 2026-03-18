/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import {
  resolveInventoryPricingContext,
  shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget,
} from "./OrderCreatorPage";

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

  it("bypasses page-level keyboard handlers when focus is inside the document spreadsheet runtime", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <div data-powersheet-surface-id="orders-document-grid">
        <div class="ag-root-wrapper">
          <div class="ag-cell">Cell</div>
        </div>
      </div>
    `;

    const cell = container.querySelector(".ag-cell");
    expect(shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget(cell)).toBe(
      true
    );
    expect(
      shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget(
        document.createElement("button")
      )
    ).toBe(false);
  });
});
