/**
 * SampleList Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SampleList, type SampleListItem } from "./SampleList";

const sampleData: SampleListItem[] = [
  {
    id: 1,
    productSummary: "Product Alpha",
    clientName: "Client A",
    status: "PENDING",
    requestedDate: "2026-01-02T00:00:00.000Z",
    dueDate: "2026-01-05",
  },
  {
    id: 2,
    productSummary: "Product Beta",
    clientName: "Client B",
    status: "FULFILLED",
    requestedDate: "2026-01-03T00:00:00.000Z",
    dueDate: "2026-01-06",
  },
  {
    id: 3,
    productSummary: "Product Gamma",
    clientName: "Client C",
    status: "CANCELLED",
    requestedDate: "2026-01-04T00:00:00.000Z",
    dueDate: null,
  },
  {
    id: 4,
    productSummary: "Product Delta",
    clientName: "Client D",
    status: "RETURN_REQUESTED",
    requestedDate: "2026-01-01T00:00:00.000Z",
    dueDate: "2026-01-07",
  },
];

describe("SampleList", () => {
  it("renders rows for provided samples", () => {
    render(
      <SampleList samples={sampleData} statusFilter="ALL" searchQuery="" />
    );

    expect(screen.getByText("Product Alpha")).toBeInTheDocument();
    expect(screen.getByText("Client B")).toBeInTheDocument();
    expect(screen.getAllByText("Samples Out")).toHaveLength(2);
    expect(screen.getByText("Samples Return")).toBeInTheDocument();
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancelled")).not.toBeInTheDocument();
  });

  it("filters by search query across product and client", () => {
    render(
      <SampleList samples={sampleData} statusFilter="ALL" searchQuery="beta" />
    );

    expect(screen.getByText("Product Beta")).toBeInTheDocument();
    expect(screen.queryByText("Product Alpha")).not.toBeInTheDocument();
  });

  it("filters by status", () => {
    render(
      <SampleList samples={sampleData} statusFilter="PENDING" searchQuery="" />
    );

    expect(screen.getByText("Product Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Product Beta")).not.toBeInTheDocument();
  });

  it("sorts by id when header is clicked", () => {
    render(
      <SampleList samples={sampleData} statusFilter="ALL" searchQuery="" />
    );

    const idHeader = screen.getByRole("button", { name: /id/i });
    fireEvent.click(idHeader);

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("4");
  });

  it("paginates results", () => {
    render(
      <SampleList
        samples={sampleData}
        statusFilter="ALL"
        searchQuery=""
        pageSize={2}
      />
    );

    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 rows
    expect(screen.queryByText("Product Delta")).not.toBeInTheDocument();
    expect(screen.queryByText("Product Gamma")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("Product Delta")).toBeInTheDocument();
    expect(screen.queryByText("Product Gamma")).not.toBeInTheDocument();
  });

  it("renders without errors when onFulfill prop is provided", () => {
    const onFulfill = vi.fn();
    const { container } = render(
      <SampleList
        samples={sampleData}
        statusFilter="PENDING"
        searchQuery=""
        onFulfill={onFulfill}
      />
    );

    // The PENDING sample should be rendered
    expect(screen.getByText("Product Alpha")).toBeInTheDocument();
    // The action button for PENDING sample should be in the DOM
    expect(
      screen.getByRole("button", { name: /actions for sample 1/i })
    ).toBeInTheDocument();
    // Component should render without crashing
    expect(container).toBeTruthy();
  });

  it("renders without errors when onSetExpirationDate prop is provided", () => {
    const onSetExpirationDate = vi.fn();
    const { container } = render(
      <SampleList
        samples={sampleData}
        statusFilter="ALL"
        searchQuery=""
        onSetExpirationDate={onSetExpirationDate}
      />
    );

    // Multiple samples should render
    expect(screen.getByText("Product Alpha")).toBeInTheDocument();
    expect(screen.getByText("Product Beta")).toBeInTheDocument();
    // Component should render without crashing
    expect(container).toBeTruthy();
  });

  it("renders fulfill confirmation dialog state management", () => {
    const onFulfill = vi.fn();
    render(
      <SampleList
        samples={sampleData}
        statusFilter="ALL"
        searchQuery=""
        onFulfill={onFulfill}
        onDelete={vi.fn()}
        onSetExpirationDate={vi.fn()}
      />
    );

    // Both PENDING and FULFILLED samples should be visible in ALL filter
    expect(screen.getByText("Product Alpha")).toBeInTheDocument();
    expect(screen.getByText("Product Beta")).toBeInTheDocument();

    // Verify the fulfill confirm dialog starts closed
    expect(
      screen.queryByText("Fulfill this sample request?")
    ).not.toBeInTheDocument();
  });
});
