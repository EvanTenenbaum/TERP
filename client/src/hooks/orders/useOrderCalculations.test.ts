import { describe, expect, it } from "vitest";
import {
  calculateLineItemFromRetailPrice,
  calculateMarginPercentFromRetailPrice,
} from "./useOrderCalculations";

describe("useOrderCalculations retail-price helpers", () => {
  it("preserves exact profile retail price while using gross margin percent", () => {
    const lineItem = calculateLineItemFromRetailPrice(201, 1, 761.32, 1141.98);

    expect(lineItem.unitPrice).toBe(1141.98);
    expect(lineItem.marginDollar).toBe(380.66);
    expect(lineItem.marginPercent).toBe(33.33);
    expect(lineItem.lineTotal).toBe(1141.98);
  });

  it("derives gross margin percent from retail price", () => {
    expect(calculateMarginPercentFromRetailPrice(761.32, 1141.98)).toBe(33.33);
  });
});
