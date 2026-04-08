import { describe, expect, it } from "vitest";
import {
  buildCatalogueOutboundDescriptor,
  buildCatalogueOutboundNotes,
} from "./outbound";

describe("catalogue outbound helpers", () => {
  it("falls back to vendor identity when brand is empty", () => {
    expect(
      buildCatalogueOutboundDescriptor({
        brand: null,
        vendor: "Andy Rhan",
        subcategory: "Indoor",
        batchSku: "BT-42",
      })
    ).toBe("Andy Rhan · Indoor · BT-42");
  });

  it("includes the shared confirmation note and an identity warning when needed", () => {
    expect(
      buildCatalogueOutboundNotes([
        {
          brand: null,
          vendor: null,
          batchSku: null,
        },
      ])
    ).toEqual([
      "1 line is missing grower or batch identity. Confirm the exact lot before sending.",
      "Pricing, availability, and payment terms are subject to final confirmation.",
    ]);
  });
});
