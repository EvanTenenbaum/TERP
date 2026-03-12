import { describe, expect, it } from "vitest";

import { buildDraftPricingLookupOptions } from "./orders";

describe("buildDraftPricingLookupOptions", () => {
  it("preserves downstream pricing metadata needed for profile rule matching", () => {
    expect(
      buildDraftPricingLookupOptions({
        productName: "Blue Dream 14g",
        productSubcategory: "Indoor Flower",
        batchGrade: "A",
        supplierName: "Redwood Supply",
      })
    ).toEqual({
      itemName: "Blue Dream 14g",
      subcategory: "Indoor Flower",
      grade: "A",
      vendor: "Redwood Supply",
    });
  });

  it("drops null metadata instead of sending empty pricing conditions", () => {
    expect(
      buildDraftPricingLookupOptions({
        productName: null,
        productSubcategory: null,
        batchGrade: null,
        supplierName: null,
      })
    ).toEqual({
      itemName: undefined,
      subcategory: undefined,
      grade: undefined,
      vendor: undefined,
    });
  });
});
