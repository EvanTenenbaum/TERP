/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { InventoryGalleryView } from "./InventoryGalleryView";
import type { InventoryPilotRow } from "@/lib/spreadsheet-native";

function makeRow(overrides?: Partial<InventoryPilotRow>): InventoryPilotRow {
  return {
    identity: { rowKey: "row-1", entityId: 1, entityType: "batch" },
    batchId: 1,
    sku: "BATCH-001",
    productName: "Test Flower",
    productSummary: "Test Flower · North Farm / A",
    category: "Flower",
    subcategory: "Indoor",
    vendorName: "North Farm",
    brandName: "North Brand",
    grade: "A",
    status: "LIVE",
    onHandQty: 200,
    reservedQty: 10,
    availableQty: 190,
    unitCogs: 50,
    receivedDate: "2026-03-01T00:00:00.000Z",
    ageLabel: "26d",
    stockStatus: "OPTIMAL",
    ...overrides,
  };
}

describe("InventoryGalleryView", () => {
  it("renders cards for each row showing SKU and productName", () => {
    const rows: InventoryPilotRow[] = [
      makeRow({ batchId: 1, sku: "BATCH-001", productName: "Test Flower" }),
      makeRow({
        batchId: 2,
        sku: "BATCH-002",
        productName: "Another Product",
        identity: { rowKey: "row-2", entityId: 2, entityType: "batch" },
      }),
    ];

    render(
      <InventoryGalleryView
        rows={rows}
        onOpenInspector={vi.fn()}
        onAdjustQty={vi.fn()}
      />
    );

    expect(screen.getByText("BATCH-001")).toBeInTheDocument();
    expect(screen.getByText("Test Flower")).toBeInTheDocument();
    expect(screen.getAllByText(/North Farm · North Brand · A/)).toHaveLength(2);
    expect(screen.getByText("BATCH-002")).toBeInTheDocument();
    expect(screen.getByText("Another Product")).toBeInTheDocument();
  });

  it("calls onOpenInspector with batchId when Open is clicked", () => {
    const onOpenInspector = vi.fn();
    const rows: InventoryPilotRow[] = [makeRow({ batchId: 42 })];

    render(
      <InventoryGalleryView
        rows={rows}
        onOpenInspector={onOpenInspector}
        onAdjustQty={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open/i }));
    expect(onOpenInspector).toHaveBeenCalledWith(42);
  });

  it("calls onAdjustQty with batchId when Adjust is clicked", () => {
    const onAdjustQty = vi.fn();
    const rows: InventoryPilotRow[] = [makeRow({ batchId: 99 })];

    render(
      <InventoryGalleryView
        rows={rows}
        onOpenInspector={vi.fn()}
        onAdjustQty={onAdjustQty}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /adjust/i }));
    expect(onAdjustQty).toHaveBeenCalledWith(99);
  });

  it("renders empty state when no rows are provided", () => {
    render(
      <InventoryGalleryView
        rows={[]}
        onOpenInspector={vi.fn()}
        onAdjustQty={vi.fn()}
      />
    );

    expect(
      screen.getByText("No inventory matches this view")
    ).toBeInTheDocument();
  });
});
