/**
 * @vitest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Bills from "./Bills";

const refetchMock = vi.fn();

const listResult = {
  data: {
    items: [
      {
        id: 1,
        billNumber: "BILL-001",
        vendorId: 5,
        vendorName: "North Coast Supply",
        billDate: "2026-03-01T00:00:00.000Z",
        dueDate: "2026-03-15T00:00:00.000Z",
        totalAmount: "120.00",
        amountPaid: "20.00",
        amountDue: "100.00",
        status: "PENDING",
      },
    ],
    pagination: { total: 1 },
  },
  isLoading: false,
  refetch: refetchMock,
};

let billDetailResult: {
  data?: {
    lineItems: Array<{
      id: number;
      description: string;
      quantity: string;
      unitPrice: string;
      lineTotal: string;
    }>;
  };
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

vi.mock("wouter", () => ({
  useSearch: () => "",
}));

vi.mock("./billRoute", () => ({
  parseBillRouteContext: () => ({
    billId: null,
    statusFilter: null,
  }),
  findBillByRouteId: () => null,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      bills: {
        list: {
          useQuery: () => listResult,
        },
        getById: {
          useQuery: () => billDetailResult,
        },
        getAPAging: {
          useQuery: () => ({
            data: undefined,
          }),
        },
        updateStatus: {
          useMutation: () => ({
            mutate: vi.fn(),
            isPending: false,
          }),
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => null,
}));

vi.mock("@/components/ui/filter-sort-search-panel", () => ({
  FilterSortSearchPanel: () => <div data-testid="filters" />,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="bill-sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

vi.mock("@/components/accounting", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
  AgingBadge: ({ bucket }: { bucket: string }) => <span>{bucket}</span>,
  BillStatusActions: () => <div>Bill actions</div>,
  BillStatusTimeline: ({ currentStatus }: { currentStatus: string }) => (
    <div>{currentStatus}</div>
  ),
}));

describe("Bills line item states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    billDetailResult = {
      data: { lineItems: [] },
      isLoading: false,
      isError: false,
      error: null,
    };
  });

  function openBillDrawer() {
    render(<Bills embedded />);
    fireEvent.click(screen.getByText("BILL-001"));
  }

  it("shows a loading state while bill line items are loading", async () => {
    billDetailResult = {
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    };

    openBillDrawer();

    expect(screen.getByText("Loading line items...")).toBeInTheDocument();
  });

  it("shows an explicit empty state when a bill has no line items", async () => {
    openBillDrawer();

    expect(
      screen.getByText("No line items recorded for this bill.")
    ).toBeInTheDocument();
  });

  it("shows an explicit error state when bill line items fail to load", async () => {
    billDetailResult = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Line item fetch failed"),
    };

    openBillDrawer();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load line items: Line item fetch failed"
    );
  });

  it("renders fetched bill line items when available", async () => {
    billDetailResult = {
      data: {
        lineItems: [
          {
            id: 10,
            description: "Packaging materials",
            quantity: "3",
            unitPrice: "15.00",
            lineTotal: "45.00",
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    openBillDrawer();

    expect(screen.getByText("Packaging materials")).toBeInTheDocument();
    expect(screen.getByText(/Qty 3 × \$15\.00/i)).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
  });
});
