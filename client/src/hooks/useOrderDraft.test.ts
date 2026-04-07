import { describe, expect, it } from "vitest";
import type { LineItem } from "@/components/orders/types";
import {
  EMPTY_ORDER_FINGERPRINT,
  buildOrderFingerprint,
  mapDraftLineItemsToEditorState,
  parseRouteEntityId,
  resolveInventoryPricingContext,
  resolveOrderCostVisibility,
  resolveRouteSeedOrderType,
  shouldSeedComposerFromRoute,
} from "./useOrderDraft";

const buildLineItem = (overrides: Partial<LineItem> = {}): LineItem => ({
  batchId: 1001,
  batchSku: "LOT-001",
  productId: 11,
  productDisplayName: "Blue Dream 3.5g",
  quantity: 2,
  cogsPerUnit: 10,
  originalCogsPerUnit: 10,
  isCogsOverridden: false,
  marginPercent: 25,
  marginDollar: 2.5,
  isMarginOverridden: false,
  marginSource: "DEFAULT",
  appliedRules: [],
  unitPrice: 12.5,
  lineTotal: 25,
  isSample: false,
  ...overrides,
});

describe("useOrderDraft helpers", () => {
  it("resolves route seed order type", () => {
    expect(resolveRouteSeedOrderType("quote")).toBe("QUOTE");
    expect(resolveRouteSeedOrderType("duplicate")).toBe("SALE");
    expect(resolveRouteSeedOrderType(null)).toBe("SALE");
  });

  it("detects when route seeding should occur", () => {
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
        routeOrderId: 42,
        routeOrderLoading: false,
        isSalesSheetImport: false,
        routeMode: "quote",
        clientIdFromRoute: 7,
        needIdFromRoute: null,
      })
    ).toBe(false);
  });

  it("parses valid positive route ids only", () => {
    expect(parseRouteEntityId("12")).toBe(12);
    expect(parseRouteEntityId("0")).toBeNull();
    expect(parseRouteEntityId("-1")).toBeNull();
    expect(parseRouteEntityId("abc")).toBeNull();
    expect(parseRouteEntityId(null)).toBeNull();
  });

  it("computes pricing context from applied rules", () => {
    expect(
      resolveInventoryPricingContext({
        priceMarkup: 25,
        appliedRules: [{ ruleId: 1, ruleName: "Markup", adjustment: "+25%" }],
      })
    ).toEqual({
      marginSource: "CUSTOMER_PROFILE",
      profilePriceAdjustmentPercent: 25,
    });

    expect(
      resolveInventoryPricingContext({
        priceMarkup: 10,
        appliedRules: [],
      })
    ).toEqual({
      marginSource: "DEFAULT",
      profilePriceAdjustmentPercent: null,
    });
  });

  it("maps display settings into order cost visibility", () => {
    expect(
      resolveOrderCostVisibility({
        display: {
          canViewCogsData: true,
          showCogsInOrders: true,
          showMarginInOrders: false,
        },
      })
    ).toEqual({ showCogs: true, showMargin: false });

    expect(resolveOrderCostVisibility()).toEqual({
      showCogs: false,
      showMargin: false,
    });
  });

  it("builds a stable fingerprint for equivalent snapshots", () => {
    const snapshot = {
      clientId: 7,
      linkedNeedId: null,
      orderType: "SALE" as const,
      referredByClientId: null,
      adjustment: null,
      showAdjustmentOnDocument: true,
      freight: 0,
      notes: "",
      paymentTerms: "NET_30",
      items: [buildLineItem()],
    };

    expect(buildOrderFingerprint(snapshot)).toBe(
      buildOrderFingerprint(snapshot)
    );
    expect(EMPTY_ORDER_FINGERPRINT).not.toBe(buildOrderFingerprint(snapshot));

    expect(
      buildOrderFingerprint({
        ...snapshot,
        freight: 12.5,
      })
    ).not.toBe(buildOrderFingerprint(snapshot));
  });

  it("maps draft line items into editor state", () => {
    const [mapped] = mapDraftLineItemsToEditorState([
      {
        batchId: 101,
        batchSku: "LOT-101",
        productId: 5,
        productDisplayName: "Lemon Haze",
        quantity: "3",
        cogsPerUnit: "11.5",
        originalCogsPerUnit: "10.25",
        cogsMode: "RANGE",
        unitCogsMin: "9",
        unitCogsMax: "12",
        effectiveCogsBasis: "MID",
        originalRangeMin: "9",
        originalRangeMax: "12",
        isBelowVendorRange: false,
        isCogsOverridden: false,
        marginPercent: "20",
        marginDollar: "2.3",
        isMarginOverridden: false,
        marginSource: "DEFAULT",
        unitPrice: "13.8",
        lineTotal: "41.4",
        isSample: false,
      },
    ]);

    expect(mapped.batchId).toBe(101);
    expect(mapped.quantity).toBe(3);
    expect(mapped.cogsPerUnit).toBe(11.5);
    expect(mapped.marginSource).toBe("DEFAULT");
  });
});
