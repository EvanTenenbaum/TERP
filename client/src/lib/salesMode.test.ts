import { describe, expect, it } from "vitest";
import {
  DEFAULT_SALES_BUSINESS_MODE,
  isShippingEnabledMode,
  resolveSalesBusinessMode,
} from "./salesMode";

describe("salesMode", () => {
  it("defaults to non-shipping mode", () => {
    expect(resolveSalesBusinessMode("/sales")).toBe(
      DEFAULT_SALES_BUSINESS_MODE
    );
    expect(resolveSalesBusinessMode(undefined)).toBe(
      DEFAULT_SALES_BUSINESS_MODE
    );
  });

  it("enables shipping mode when query parameter requests it", () => {
    expect(resolveSalesBusinessMode("/sales?salesMode=shipping")).toBe(
      "shipping-enabled"
    );
    expect(resolveSalesBusinessMode("/sales?salesMode=shipping-enabled")).toBe(
      "shipping-enabled"
    );
  });

  it("exposes shipping-enabled predicate", () => {
    expect(isShippingEnabledMode("shipping-enabled")).toBe(true);
    expect(isShippingEnabledMode("non-shipping")).toBe(false);
  });
});
