import {
  clearGridPreference,
  loadGridPreference,
  saveGridPreference,
  type GridPreferenceState,
} from "@/lib/gridPreferences";

describe("gridPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads preferences for a specific grid and user", () => {
    const preference: GridPreferenceState = {
      viewMode: "VISUAL",
      columnOrder: ["sku", "product", "images"],
      columnVisibility: {
        sku: true,
        product: true,
        images: true,
      },
    };

    saveGridPreference("slice-inventory-browse", preference, 101);

    expect(loadGridPreference("slice-inventory-browse", 101)).toEqual(preference);
  });

  it("isolates preferences by user", () => {
    saveGridPreference(
      "slice-inventory-browse",
      {
        viewMode: "DENSE",
        columnOrder: ["sku"],
        columnVisibility: { sku: true },
      },
      1
    );

    saveGridPreference(
      "slice-inventory-browse",
      {
        viewMode: "COMFORTABLE",
        columnOrder: ["product"],
        columnVisibility: { product: true },
      },
      2
    );

    expect(loadGridPreference("slice-inventory-browse", 1)?.viewMode).toBe("DENSE");
    expect(loadGridPreference("slice-inventory-browse", 2)?.viewMode).toBe("COMFORTABLE");
  });

  it("returns null for invalid JSON", () => {
    localStorage.setItem("terp.grid-preferences.v1:1:slice-inventory-browse", "{bad json");

    expect(loadGridPreference("slice-inventory-browse", 1)).toBeNull();
  });

  it("clears preferences", () => {
    saveGridPreference(
      "slice-po-list",
      {
        viewMode: "COMFORTABLE",
        columnOrder: ["po"],
        columnVisibility: { po: true },
      },
      10
    );

    clearGridPreference("slice-po-list", 10);

    expect(loadGridPreference("slice-po-list", 10)).toBeNull();
  });
});
