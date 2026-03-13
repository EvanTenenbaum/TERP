import {
  buildPurchaseOrderCategoryOptions,
  getPurchaseOrderSubcategoryOptions,
  normalizePurchaseOrderSubcategory,
} from "./purchaseOrderCategoryOptions";

describe("purchaseOrderCategoryOptions", () => {
  it("prefers loaded categories over the fallback list", () => {
    expect(
      buildPurchaseOrderCategoryOptions([
        { id: 1, name: "Flower" },
        { id: 2, name: "Edibles" },
      ])
    ).toEqual([
      { value: "Flower", label: "Flower" },
      { value: "Edibles", label: "Edibles" },
    ]);
  });

  it("filters subcategories to the selected category", () => {
    expect(
      getPurchaseOrderSubcategoryOptions(
        "Flower",
        [
          { id: 1, name: "Flower" },
          { id: 2, name: "Edibles" },
        ],
        [
          { id: 11, categoryId: 1, name: "Indoor" },
          { id: 12, categoryId: 1, name: "Outdoor" },
          { id: 21, categoryId: 2, name: "Gummies" },
        ]
      )
    ).toEqual(["Indoor", "Outdoor"]);
  });

  it("falls back to known subcategories when settings data is unavailable", () => {
    expect(getPurchaseOrderSubcategoryOptions("Flower")).toContain("Indoor");
  });

  it("clears stale subcategories when they do not belong to the selected category", () => {
    expect(
      normalizePurchaseOrderSubcategory("Indoor", ["Gummies", "Beverages"])
    ).toBe("");
    expect(
      normalizePurchaseOrderSubcategory("Indoor", ["Indoor", "Outdoor"])
    ).toBe("Indoor");
  });
});
