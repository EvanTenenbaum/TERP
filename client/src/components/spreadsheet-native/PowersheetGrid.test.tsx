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
  it("renders the user-facing summary and does not expose internal engineering annotations", () => {
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
    // User-facing summary is rendered
    expect(screen.getByText("1 visible order")).toBeInTheDocument();
    // Internal engineering annotations must not be visible to operators
    expect(
      screen.queryByTestId("orders-queue-selection-summary")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("orders-queue-selection-state")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("orders-queue-release-gates")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("orders-queue-anti-drift-summary")
    ).not.toBeInTheDocument();
  });

  it("renders without crashing when no summary props are provided", () => {
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

    expect(screen.getByTestId("mock-powersheet-grid")).toBeInTheDocument();
    // No debug annotations rendered
    expect(
      screen.queryByTestId("orders-support-grid-selection-summary")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("orders-support-grid-selection-state")
    ).not.toBeInTheDocument();
  });

  it("accepts affordances prop without rendering internal affordance badges", () => {
    render(
      <PowersheetGrid
        surfaceId="orders-document-grid"
        requirementIds={["ORD-SF-003"]}
        title="Line Items"
        rows={[{ id: "row-1" }]}
        columnDefs={[]}
        getRowId={row => row.id}
        emptyTitle="No rows"
        emptyDescription="Nothing to show"
        affordances={[
          { label: "Copy", available: true },
          { label: "Paste", available: false },
          { label: "Fill", available: false },
        ]}
      />
    );

    expect(screen.getByTestId("mock-powersheet-grid")).toBeInTheDocument();
    // Internal affordance debug panel must not be rendered
    expect(
      screen.queryByTestId("orders-document-grid-affordances")
    ).not.toBeInTheDocument();
  });
});
