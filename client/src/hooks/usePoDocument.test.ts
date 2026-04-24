import { describe, it, expect } from "vitest";
import {
  createEmptyLineItem,
  createLineItemFromProduct,
  validatePoDocument,
  buildCreatePayload,
  getLineTotal,
  getDocumentTotal,
  type PoLineItem,
  type PoDocumentState,
} from "./usePoDocument";

describe("createEmptyLineItem", () => {
  it("returns valid defaults", () => {
    const item = createEmptyLineItem();
    expect(item.tempId).toMatch(/^temp-/);
    expect(item.productId).toBeNull();
    expect(item.productName).toBe("");
    expect(item.category).toBe("");
    expect(item.subcategory).toBe("");
    expect(item.quantityOrdered).toBe(1);
    expect(item.cogsMode).toBe("FIXED");
    expect(item.unitCost).toBe(0);
    expect(item.unitCostMin).toBe(0);
    expect(item.unitCostMax).toBe(0);
    expect(item.notes).toBe("");
  });
});

describe("createLineItemFromProduct", () => {
  it("respects a requested quantity when adding from the browser", () => {
    const item = createLineItemFromProduct({
      productId: 91,
      productName: "Wedding Cake",
      category: "Flower",
      subcategory: "Top Shelf",
      quantityOrdered: 6,
      cogsMode: "FIXED",
      unitCost: "2.40",
      unitCostMin: null,
      unitCostMax: null,
    });

    expect(item.productId).toBe(91);
    expect(item.productName).toBe("Wedding Cake");
    expect(item.quantityOrdered).toBe(6);
    expect(item.unitCost).toBe(2.4);
  });
});

describe("validatePoDocument", () => {
  function makeValidState(): PoDocumentState {
    return {
      supplierId: 1,
      lineItems: [
        {
          tempId: "temp-1",
          existingItemId: null,
          productId: 10,
          productName: "Test Product",
          category: "Flower",
          subcategory: "",
          quantityOrdered: 5,
          cogsMode: "FIXED",
          unitCost: 10,
          unitCostMin: 0,
          unitCostMax: 0,
          notes: "",
        },
      ],
      orderDate: "2026-03-27",
      expectedDeliveryDate: "",
      paymentTerms: "",
      internalNotes: "",
      supplierNotes: "",
      draftId: null,
    };
  }

  it("catches missing supplier", () => {
    const state = { ...makeValidState(), supplierId: null };
    const errors = validatePoDocument(state);
    expect(errors).toContain("Supplier is required");
  });

  it("catches empty line items", () => {
    const state = { ...makeValidState(), lineItems: [] };
    const errors = validatePoDocument(state);
    expect(errors).toContain("At least one line item is required");
  });

  it("catches zero qty", () => {
    const state = makeValidState();
    state.lineItems[0].quantityOrdered = 0;
    const errors = validatePoDocument(state);
    expect(errors.some(e => e.includes("quantity must be > 0"))).toBe(true);
  });

  it("catches missing product selection", () => {
    const state = makeValidState();
    state.lineItems[0].productId = null;
    state.lineItems[0].productName = "";
    const errors = validatePoDocument(state);
    expect(errors.some(e => e.includes("product is required"))).toBe(true);
  });

  it("passes for valid state", () => {
    const errors = validatePoDocument(makeValidState());
    expect(errors).toHaveLength(0);
  });
});

describe("buildCreatePayload", () => {
  it("maps state correctly", () => {
    const state: PoDocumentState = {
      supplierId: 42,
      lineItems: [
        {
          tempId: "temp-1",
          existingItemId: null,
          productId: 7,
          productName: "OG Kush",
          category: "Flower",
          subcategory: "Indoor",
          quantityOrdered: 10,
          cogsMode: "FIXED",
          unitCost: 5,
          unitCostMin: 0,
          unitCostMax: 0,
          notes: "fragile",
        },
      ],
      orderDate: "2026-03-27",
      expectedDeliveryDate: "2026-04-01",
      paymentTerms: "Net30",
      internalNotes: "internal memo",
      supplierNotes: "vendor memo",
      draftId: null,
    };

    const payload = buildCreatePayload(state);

    expect(payload.supplierClientId).toBe(42);
    expect(payload.notes).toBe("internal memo");
    expect(payload.vendorNotes).toBe("vendor memo");
    expect(payload.orderDate).toBe("2026-03-27");
    expect(payload.expectedDeliveryDate).toBe("2026-04-01");
    expect(payload.paymentTerms).toBe("Net30");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].productId).toBe(7);
    expect(payload.items[0].quantityOrdered).toBe(10);
    expect(payload.items[0].unitCost).toBe(5);
    expect(payload.items[0].notes).toBe("fragile");
    // FIXED mode should not include min/max
    expect(payload.items[0].unitCostMin).toBeUndefined();
    expect(payload.items[0].unitCostMax).toBeUndefined();
  });
});

describe("getLineTotal", () => {
  it("calculates FIXED correctly (100 * 2.5 = 250)", () => {
    const item: PoLineItem = {
      tempId: "t1",
      existingItemId: null,
      productId: null,
      productName: "",
      category: "",
      subcategory: "",
      quantityOrdered: 100,
      cogsMode: "FIXED",
      unitCost: 2.5,
      unitCostMin: 0,
      unitCostMax: 0,
      notes: "",
    };
    expect(getLineTotal(item)).toBe(250);
  });

  it("calculates RANGE as average (100 * avg(2,3) = 250)", () => {
    const item: PoLineItem = {
      tempId: "t2",
      existingItemId: null,
      productId: null,
      productName: "",
      category: "",
      subcategory: "",
      quantityOrdered: 100,
      cogsMode: "RANGE",
      unitCost: 0,
      unitCostMin: 2,
      unitCostMax: 3,
      notes: "",
    };
    expect(getLineTotal(item)).toBe(250);
  });
});

describe("getDocumentTotal", () => {
  it("sums all lines", () => {
    const items: PoLineItem[] = [
      {
        tempId: "t1",
        existingItemId: null,
        productId: null,
        productName: "",
        category: "",
        subcategory: "",
        quantityOrdered: 10,
        cogsMode: "FIXED",
        unitCost: 5,
        unitCostMin: 0,
        unitCostMax: 0,
        notes: "",
      },
      {
        tempId: "t2",
        existingItemId: null,
        productId: null,
        productName: "",
        category: "",
        subcategory: "",
        quantityOrdered: 4,
        cogsMode: "RANGE",
        unitCost: 0,
        unitCostMin: 10,
        unitCostMax: 20,
        notes: "",
      },
    ];
    // Line 1: 10 * 5 = 50; Line 2: 4 * avg(10,20) = 4 * 15 = 60; total = 110
    expect(getDocumentTotal(items)).toBe(110);
  });
});
