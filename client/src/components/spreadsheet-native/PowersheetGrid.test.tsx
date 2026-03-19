/**
 * @vitest-environment jsdom
 */

import { useEffect, useRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PowersheetGrid } from "./PowersheetGrid";

const mockSpreadsheetPilotGrid = vi.fn(
  ({
    summary,
    onSelectionSetChange,
    onSelectionSummaryChange,
  }: Record<string, unknown>) => {
    const hasEmittedSelection = useRef(false);

    useEffect(() => {
      if (hasEmittedSelection.current) {
        return;
      }

      hasEmittedSelection.current = true;
      onSelectionSetChange?.({
        focusedCell: {
          rowIndex: 2,
          columnKey: "sku",
        },
        focusedRowId: "row-2",
        anchorCell: {
          rowIndex: 2,
          columnKey: "sku",
        },
        ranges: [
          {
            anchor: {
              rowIndex: 2,
              columnKey: "sku",
            },
            focus: {
              rowIndex: 4,
              columnKey: "qty",
            },
          },
        ],
        selectedRowIds: new Set(["row-1", "row-2"]),
      });
      onSelectionSummaryChange?.({
        selectedCellCount: 6,
        selectedRowCount: 2,
        hasDiscontiguousSelection: false,
        focusedSurface: "orders-queue",
      });
    }, [onSelectionSetChange, onSelectionSummaryChange]);

    return <div data-testid="mock-powersheet-grid">{summary}</div>;
  }
);

vi.mock("./SpreadsheetPilotGrid", () => ({
  SpreadsheetPilotGrid: (props: Record<string, unknown>) =>
    mockSpreadsheetPilotGrid(props),
}));

describe("PowersheetGrid", () => {
  it("surfaces selection state, anti-drift context, and release gates through the shared adapter", () => {
    render(
      <PowersheetGrid
        surfaceId="orders-queue"
        requirementIds={["ORD-SS-001", "ORD-SF-001"]}
        releaseGateIds={["SALE-ORD-019", "SALE-ORD-024"]}
        title="Orders Queue"
        rows={[{ id: "row-1" }]}
        columnDefs={[]}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        summary={<span>1 visible order</span>}
        antiDriftSummary="Queue selection parity must stay visible."
      />
    );

    expect(screen.getByTestId("mock-powersheet-grid")).toBeInTheDocument();
    expect(
      screen.getByTestId("orders-queue-selection-summary")
    ).toHaveTextContent("6 selected cells · 2 rows in scope");
    expect(
      screen.getByTestId("orders-queue-selection-state")
    ).toHaveTextContent("Focused cell: 2:sku · Ranges: 1");
    expect(screen.getByTestId("orders-queue-release-gates")).toHaveTextContent(
      "SALE-ORD-019, SALE-ORD-024"
    );
    expect(
      screen.getByTestId("orders-queue-anti-drift-summary")
    ).toHaveTextContent("Queue selection parity must stay visible.");
  });

  it("still surfaces shared selection summaries when no external summary props are provided", () => {
    render(
      <PowersheetGrid
        surfaceId="orders-support-grid"
        requirementIds={["ORD-SF-001"]}
        title="Selected Order Lines"
        rows={[{ id: "row-1" }]}
        columnDefs={[]}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
      />
    );

    expect(
      screen.getByTestId("orders-support-grid-selection-summary")
    ).toHaveTextContent("6 selected cells · 2 rows in scope");
    expect(
      screen.getByTestId("orders-support-grid-selection-state")
    ).toHaveTextContent("Focused cell: 2:sku · Ranges: 1");
  });
});
