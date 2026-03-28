import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BankTransactionsSurface } from "./BankTransactionsSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid={`grid-${title}`}>{title}</div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      bankAccounts: {
        list: {
          useQuery: vi.fn(() => ({
            data: {
              items: [
                {
                  id: 10,
                  accountName: "Operating Account",
                },
              ],
            },
            isLoading: false,
          })),
        },
      },
      bankTransactions: {
        list: {
          useQuery: vi.fn(() => ({
            data: {
              items: [
                {
                  id: 1,
                  transactionDate: "2026-01-15",
                  transactionType: "DEPOSIT",
                  description: "Customer payment",
                  referenceNumber: "REF-001",
                  amount: "5000.00",
                  isReconciled: true,
                },
                {
                  id: 2,
                  transactionDate: "2026-01-16",
                  transactionType: "WITHDRAWAL",
                  description: "Vendor payment",
                  referenceNumber: "REF-002",
                  amount: "2000.00",
                  isReconciled: false,
                },
              ],
            },
            isLoading: false,
            refetch: vi.fn(),
          })),
        },
        reconcile: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
        create: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
      },
    },
    useUtils: vi.fn(() => ({
      accounting: {
        bankTransactions: {
          list: { invalidate: vi.fn() },
        },
      },
    })),
  },
}));

describe("BankTransactionsSurface", () => {
  it("renders title with KPI badges", () => {
    render(<BankTransactionsSurface />);
    expect(
      screen.getAllByText("Bank Transactions").length
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("kpi-deposits")).toHaveTextContent("deposits");
    expect(screen.getByTestId("kpi-withdrawals")).toHaveTextContent(
      "withdrawals"
    );
    expect(screen.getByTestId("kpi-unreconciled")).toHaveTextContent(
      "unreconciled"
    );
  });

  it("renders type filter tabs (All, Deposit, Withdrawal, Transfer, Fee)", () => {
    render(<BankTransactionsSurface />);
    expect(screen.getByTestId("type-tab-ALL")).toHaveTextContent("All");
    expect(screen.getByTestId("type-tab-DEPOSIT")).toHaveTextContent("Deposit");
    expect(screen.getByTestId("type-tab-WITHDRAWAL")).toHaveTextContent(
      "Withdrawal"
    );
    expect(screen.getByTestId("type-tab-TRANSFER")).toHaveTextContent(
      "Transfer"
    );
    expect(screen.getByTestId("type-tab-FEE")).toHaveTextContent("Fee");
  });

  it("renders Toggle Reconciled + Export CSV actions", () => {
    render(<BankTransactionsSurface />);
    expect(screen.getByTestId("toggle-reconciled-button")).toHaveTextContent(
      "Toggle Reconciled"
    );
    expect(screen.getByTestId("export-csv-button")).toHaveTextContent(
      "Export CSV"
    );
  });

  it("renders grid with data", () => {
    render(<BankTransactionsSurface />);
    expect(screen.getByTestId("grid-Bank Transactions")).toBeInTheDocument();
  });
});
