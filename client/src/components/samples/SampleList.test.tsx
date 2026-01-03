/**
 * SampleList Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
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
    requestedDate: "2026-01-01T00:00:00.000Z",
    dueDate: null,
  },
];

describe("SampleList", () => {
  it("renders rows for provided samples", () => {
    render(
      <SampleList samples={sampleData} statusFilter="ALL" searchQuery="" />
    );

    expect(screen.getByText("Product Alpha")).toBeInTheDocument();
    expect(screen.getByText("Client B")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
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
    expect(rows[1]).toHaveTextContent("3");
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
    expect(screen.queryByText("Product Gamma")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText("Product Gamma")).toBeInTheDocument();
  });
});
