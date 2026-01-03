import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountsReceivable } from "./AccountsReceivable";
import { formatCurrency } from "@/lib/utils";

const mockUseQuery = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    vipPortal: {
      ar: {
        getInvoices: {
          useQuery: (input: unknown, options?: unknown) =>
            mockUseQuery(input, options),
        },
      },
    },
  },
}));

const baseConfig = {
  featuresConfig: {
    ar: {
      showSummaryTotals: true,
      showInvoiceDetails: true,
      allowFilters: false,
      highlightOverdue: true,
    },
  },
};

describe("AccountsReceivable", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("formats monetary values using the currency utility", () => {
    mockUseQuery.mockReturnValue({
      data: {
        summary: {
          totalOutstanding: 2500.5,
          overdueAmount: 500.25,
          openInvoiceCount: 2,
        },
        invoices: [
          {
            id: 1,
            invoiceNumber: "INV-1001",
            invoiceDate: "2026-01-01T00:00:00Z",
            totalAmount: 1234.5,
            amountDue: 234.5,
            amountPaid: 1000,
            dueDate: "2026-01-15T00:00:00Z",
            status: "SENT",
            paymentTerms: "Net 15",
          },
        ],
      },
      isLoading: false,
    });

    render(<AccountsReceivable clientId={1} config={baseConfig} />);

    expect(screen.getByText(formatCurrency(2500.5))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(500.25))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(1234.5))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(234.5))).toBeInTheDocument();
  });
});
