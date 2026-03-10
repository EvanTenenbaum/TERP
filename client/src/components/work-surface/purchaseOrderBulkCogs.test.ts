import { describe, expect, it } from "vitest";

import { resolveBulkCogsUpdates } from "./purchaseOrderBulkCogs";

describe("resolveBulkCogsUpdates", () => {
  it("returns fixed COGS updates for a valid fixed value", () => {
    expect(
      resolveBulkCogsUpdates({
        cogsMode: "FIXED",
        unitCost: "12.5",
        unitCostMin: "",
        unitCostMax: "",
      })
    ).toEqual({
      ok: true,
      updates: {
        cogsMode: "FIXED",
        unitCost: "12.5",
        unitCostMin: "",
        unitCostMax: "",
      },
    });
  });

  it("rejects negative fixed COGS values", () => {
    expect(
      resolveBulkCogsUpdates({
        cogsMode: "FIXED",
        unitCost: "-1",
        unitCostMin: "",
        unitCostMax: "",
      })
    ).toEqual({
      ok: false,
      error: "Bulk unit cost cannot be negative",
    });
  });

  it("returns range COGS updates for a valid min/max pair", () => {
    expect(
      resolveBulkCogsUpdates({
        cogsMode: "RANGE",
        unitCost: "",
        unitCostMin: "9.25",
        unitCostMax: "12.75",
      })
    ).toEqual({
      ok: true,
      updates: {
        cogsMode: "RANGE",
        unitCost: "",
        unitCostMin: "9.25",
        unitCostMax: "12.75",
      },
    });
  });

  it("rejects a range where max is below min", () => {
    expect(
      resolveBulkCogsUpdates({
        cogsMode: "RANGE",
        unitCost: "",
        unitCostMin: "15",
        unitCostMax: "10",
      })
    ).toEqual({
      ok: false,
      error: "Bulk max cost must be greater than or equal to min cost",
    });
  });
});
