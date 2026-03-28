import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BankAccountsSurface } from "./BankAccountsSurface";

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
                  id: 1,
                  accountName: "Operating Account",
                  accountNumber: "1234567890",
                  bankName: "Chase",
                  accountType: "CHECKING",
                  currentBalance: "50000.00",
                  isActive: true,
                },
                {
                  id: 2,
                  accountName: "Savings Reserve",
                  accountNumber: "9876543210",
                  bankName: "Wells Fargo",
                  accountType: "SAVINGS",
                  currentBalance: "125000.00",
                  isActive: true,
                },
                {
                  id: 3,
                  accountName: "Old Credit Card",
                  accountNumber: "5555000011112222",
                  bankName: "Amex",
                  accountType: "CREDIT_CARD",
                  currentBalance: "2500.00",
                  isActive: false,
                },
              ],
              total: 3,
              pagination: { total: 3 },
            },
            isLoading: false,
            refetch: vi.fn(),
          })),
        },
        getTotalCashBalance: {
          useQuery: vi.fn(() => ({
            data: 175000,
            isLoading: false,
            refetch: vi.fn(),
          })),
        },
        create: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
        update: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
      },
    },
    useUtils: vi.fn(() => ({
      accounting: {
        bankAccounts: {
          list: { invalidate: vi.fn() },
          getTotalCashBalance: { invalidate: vi.fn() },
        },
      },
    })),
  },
}));

describe("BankAccountsSurface", () => {
  it("renders title with KPI badges", () => {
    render(<BankAccountsSurface />);
    // Title appears in toolbar and grid mock — check both exist
    expect(screen.getAllByText("Bank Accounts").length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getByText("$175,000.00")).toBeInTheDocument();
    expect(screen.getByText("3 accounts")).toBeInTheDocument();
    expect(screen.getByText("2 active")).toBeInTheDocument();
  });

  it("renders type filter", () => {
    render(<BankAccountsSurface />);
    expect(screen.getByText("All Types")).toBeInTheDocument();
    expect(screen.getByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
    expect(screen.getByText("Money Market")).toBeInTheDocument();
  });

  it("renders Add Row button", () => {
    render(<BankAccountsSurface />);
    expect(screen.getByText("+ Add Row")).toBeInTheDocument();
  });

  it("renders grid with data", () => {
    render(<BankAccountsSurface />);
    expect(screen.getByTestId("grid-Bank Accounts")).toBeInTheDocument();
  });
});
