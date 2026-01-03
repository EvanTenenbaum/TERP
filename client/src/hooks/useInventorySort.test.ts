/**
 * Tests for useInventorySort sorting behavior
 */

import { describe, it, expect } from "vitest";
import {
  useInventorySort,
  type InventorySortableRow,
} from "./useInventorySort";
import { renderHook, act } from "@testing-library/react";

describe("useInventorySort", () => {
  const sampleRows: InventorySortableRow[] = [
    {
      batch: {
        sku: "B-20",
        batchStatus: "ON_HOLD",
        onHandQty: "2",
        reservedQty: "0",
      },
      product: { nameCanonical: "Alpha" },
      vendor: { name: "Vendor B" },
      brand: { name: "Brand B" },
    },
    {
      batch: {
        sku: "B-3",
        batchStatus: "AWAITING_INTAKE",
        onHandQty: "10",
        reservedQty: "1",
      },
      product: { nameCanonical: "Beta" },
      vendor: { name: "Vendor A" },
      brand: { name: "Brand A" },
    },
  ];

  it("sorts numeric columns numerically, not alphabetically", () => {
    const { result } = renderHook(() => useInventorySort());

    act(() => result.current.toggleSort("onHand"));
    const sorted = result.current.sortData(sampleRows);

    expect(sorted[0].batch?.onHandQty).toBe("2");
    expect(sorted[1].batch?.onHandQty).toBe("10");
  });

  it("sorts by status using batchStatus field", () => {
    const { result } = renderHook(() => useInventorySort());

    act(() => result.current.toggleSort("status"));
    const sorted = result.current.sortData(sampleRows);

    const statuses = sorted.map(row => row.batch?.batchStatus);
    expect(statuses).toEqual(["AWAITING_INTAKE", "ON_HOLD"]);
  });
});
