/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import {
  resolveInventoryPricingContext,
  resolveOrderCostVisibility,
  resolveRouteSeedOrderType,
  shouldSeedComposerFromRoute,
  shouldBypassWorkSurfaceKeyboardForSpreadsheetTarget,
} from "@/hooks/useOrderDraft";

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

  it("treats mode=quote as the default quote seed even without client context", () => {
    expect(resolveRouteSeedOrderType("quote")).toBe("QUOTE");
    expect(resolveRouteSeedOrderType(null)).toBe("SALE");
  });

  it("seeds the composer for blank quote routes even without client or need params", () => {
    expect(
      shouldSeedComposerFromRoute({
        routeOrderId: null,
        routeOrderLoading: false,
        isSalesSheetImport: false,
        routeMode: "quote",
        clientIdFromRoute: null,
        needIdFromRoute: null,
      })
    ).toBe(true);

    expect(
      shouldSeedComposerFromRoute({
        routeOrderId: null,
        routeOrderLoading: false,
        isSalesSheetImport: false,
        routeMode: null,
        clientIdFromRoute: null,
        needIdFromRoute: null,
      })
    ).toBe(false);
  });

  it("only exposes cost controls when display settings confirm COGS access", () => {
    expect(
      resolveOrderCostVisibility({
        display: {
          canViewCogsData: false,
          showCogsInOrders: true,
          showMarginInOrders: true,
        },
      })
    ).toEqual({
      showCogs: false,
      showMargin: false,
    });

    expect(
      resolveOrderCostVisibility({
        display: {
          canViewCogsData: true,
          showCogsInOrders: true,
          showMarginInOrders: false,
        },
      })
    ).toEqual({
      showCogs: true,
      showMargin: false,
    });
  });
});
