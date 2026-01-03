import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountsPayable } from "./AccountsPayable";
import { formatCurrency } from "@/lib/utils";

const mockUseQuery = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    vipPortal: {
      ap: {
        getBills: {
          useQuery: (input: unknown, options?: unknown) =>
            mockUseQuery(input, options),
        },
      },
    },
  },
}));

const baseConfig = {
  featuresConfig: {
    ap: {
      showSummaryTotals: true,
      showInvoiceDetails: true,
      allowFilters: false,
      highlightOverdue: true,
    },
  },
};

describe("AccountsPayable", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("displays currency formatted amounts for bills and summary", () => {
    mockUseQuery.mockReturnValue({
      data: {
        summary: {
          totalOwed: 3200.75,
          overdueAmount: 800.25,
          openBillCount: 3,
        },
        bills: [
          {
            id: 1,
            billNumber: "BILL-2001",
            billDate: "2026-01-02T00:00:00Z",
            totalAmount: 1500.5,
            amountDue: 500.25,
            amountPaid: 1000.25,
            dueDate: "2026-02-01T00:00:00Z",
            status: "OVERDUE",
            paymentTerms: "Net 30",
          },
        ],
      },
      isLoading: false,
    });

    render(<AccountsPayable clientId={1} config={baseConfig} />);

    expect(screen.getByText(formatCurrency(3200.75))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(800.25))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(1500.5))).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(500.25))).toBeInTheDocument();
  });
});
