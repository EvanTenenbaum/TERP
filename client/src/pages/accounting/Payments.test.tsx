/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Payments, {
  parsePaymentRouteContext,
  paymentMatchesSearch,
} from "./Payments";

const mockUseSearch = vi.fn();
const paymentsListUseQuery = vi.fn();

const mockPayments = [
  {
    id: 42,
    paymentNumber: "PMT-042",
    deletedAt: null,
    paymentType: "RECEIVED" as const,
    paymentDate: "2026-03-12",
    amount: "125.00",
    paymentMethod: "CASH" as const,
    referenceNumber: "ORDER-5001",
    bankAccountId: null,
    customerId: 1,
    vendorId: null,
    invoiceId: 77,
    billId: null,
    notes: null,
    isReconciled: false,
    reconciledAt: null,
    createdBy: 1,
    createdAt: "2026-03-12T10:00:00Z",
    updatedAt: "2026-03-12T10:00:00Z",
    version: 1,
  },
  {
    id: 7,
    paymentNumber: "PMT-007",
    deletedAt: null,
    paymentType: "SENT" as const,
    paymentDate: "2026-03-10",
    amount: "60.00",
    paymentMethod: "ACH" as const,
    referenceNumber: "ORDER-2000",
    bankAccountId: null,
    customerId: null,
    vendorId: 5,
    invoiceId: 11,
    billId: null,
    notes: null,
    isReconciled: false,
    reconciledAt: null,
    createdBy: 1,
    createdAt: "2026-03-10T10:00:00Z",
    updatedAt: "2026-03-10T10:00:00Z",
    version: 1,
  },
];

vi.mock("wouter", () => ({
  useSearch: () => mockUseSearch(),
}));

vi.mock("@/components/common/BackButton", () => ({
  BackButton: () => <div>Back</div>,
}));

vi.mock("@/components/accounting", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@/components/ui/filter-sort-search-panel", () => ({
  FilterSortSearchPanel: ({ searchValue }: { searchValue: string }) => (
    <div data-testid="payment-search-value">{searchValue}</div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      payments: {
        list: {
          useQuery: (...args: unknown[]) => paymentsListUseQuery(...args),
        },
      },
    },
  },
}));

describe("parsePaymentRouteContext", () => {
  it("hydrates payment ids and invoice ids from query params", () => {
    expect(
      parsePaymentRouteContext("?tab=payments&id=42&invoiceId=77")
    ).toEqual({
      paymentId: 42,
      invoiceId: 77,
      orderId: null,
      initialSearchQuery: "42",
    });
  });

  it("keeps orderId handoffs out of the free-text search context", () => {
    expect(parsePaymentRouteContext("?tab=payments&orderId=5001")).toEqual({
      paymentId: null,
      invoiceId: null,
      orderId: "5001",
      initialSearchQuery: "",
    });
  });
});

describe("paymentMatchesSearch", () => {
  it("matches payment ids, payment numbers, reference numbers, and invoice ids", () => {
    expect(paymentMatchesSearch(mockPayments[0], "42")).toBe(true);
    expect(paymentMatchesSearch(mockPayments[0], "pmt-042")).toBe(true);
    expect(paymentMatchesSearch(mockPayments[0], "order-5001")).toBe(true);
    expect(paymentMatchesSearch(mockPayments[0], "77")).toBe(true);
    expect(paymentMatchesSearch(mockPayments[0], "missing")).toBe(false);
  });
});

describe("Payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue("");
    paymentsListUseQuery.mockReturnValue({
      data: { items: mockPayments },
      isLoading: false,
    });
  });

  it("filters the list to the deep-linked payment id", () => {
    mockUseSearch.mockReturnValue("?tab=payments&id=42");

    render(<Payments embedded />);

    expect(screen.getByText("PMT-042")).toBeInTheDocument();
    expect(screen.queryByText("PMT-007")).not.toBeInTheDocument();
  });

  it("passes invoiceId through to the accounting payments query", () => {
    mockUseSearch.mockReturnValue("?tab=payments&invoiceId=77");

    render(<Payments embedded />);

    expect(paymentsListUseQuery).toHaveBeenCalledWith({
      paymentType: undefined,
      invoiceId: 77,
    });
  });

  it("does not preload a hidden order search when routed from sales", () => {
    mockUseSearch.mockReturnValue("?tab=payments&orderId=5001");

    render(<Payments embedded />);

    expect(screen.getByTestId("payment-search-value")).toHaveTextContent("");
    expect(screen.getByText("PMT-042")).toBeInTheDocument();
    expect(screen.getByText("PMT-007")).toBeInTheDocument();
  });
});
