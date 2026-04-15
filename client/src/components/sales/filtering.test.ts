import { describe, expect, it } from "vitest";
import { buildSalesIdentityDescriptor } from "./filtering";

describe("buildSalesIdentityDescriptor", () => {
  it("uses vendor identity when brand is missing", () => {
    expect(
      buildSalesIdentityDescriptor({
        brand: null,
        vendor: "Andy Rhan",
        subcategory: "Indoor",
        batchSku: "BT-42",
      })
    ).toBe("Andy Rhan · Indoor · BT-42");
  });
});
