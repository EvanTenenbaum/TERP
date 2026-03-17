import { describe, expect, it } from "vitest";
import {
  applySliceCategorySelection,
  applySliceProductSelection,
  buildSliceCreatePayloadItem,
  type PurchaseOrdersSliceFormItem,
} from "./purchaseOrdersSliceForm";

const baseItem: PurchaseOrdersSliceFormItem = {
  productId: "",
  category: "",
  subcategory: "",
  quantityOrdered: "12",
  unitCost: "45.50",
};

describe("purchaseOrdersSliceForm", () => {
  it("prefills category and subcategory from the selected product", () => {
    const next = applySliceProductSelection(
      baseItem,
      "101",
      {
        id: 101,
        category: "Flower",
        subcategory: "Indoor",
      },
      category => (category === "Flower" ? ["Indoor", "Outdoor"] : [])
    );

    expect(next).toEqual({
      ...baseItem,
      productId: "101",
      category: "Flower",
      subcategory: "Indoor",
    });
  });

  it("clears an invalid subcategory when the category changes", () => {
    const next = applySliceCategorySelection(
      {
        ...baseItem,
        productId: "101",
        category: "Flower",
        subcategory: "Indoor",
      },
      "Edible",
      category => (category === "Edible" ? ["Gummies"] : ["Indoor", "Outdoor"])
    );

    expect(next.category).toBe("Edible");
    expect(next.subcategory).toBe("");
  });

  it("builds the create payload with surfaced category and subcategory", () => {
    expect(
      buildSliceCreatePayloadItem({
        ...baseItem,
        productId: "101",
        category: "Edible",
        subcategory: "Gummies",
      })
    ).toEqual({
      productId: 101,
      category: "Edible",
      subcategory: "Gummies",
      quantityOrdered: 12,
      unitCost: 45.5,
    });
  });
});
