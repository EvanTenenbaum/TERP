import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartOfAccountsSurface } from "./ChartOfAccountsSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid={`grid-${title}`}>{title}</div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      accounts: {
        list: {
          useQuery: vi.fn(() => ({
            data: {
              items: [
                {
                  id: 1,
                  accountNumber: "1000",
                  accountName: "Cash",
                  accountType: "ASSET",
                  normalBalance: "DEBIT",
                  isActive: true,
                  description: null,
                  parentAccountId: null,
                },
                {
                  id: 2,
                  accountNumber: "2000",
                  accountName: "Accounts Payable",
                  accountType: "LIABILITY",
                  normalBalance: "CREDIT",
                  isActive: true,
                  description: null,
                  parentAccountId: null,
                },
                {
                  id: 3,
                  accountNumber: "3000",
                  accountName: "Retained Earnings",
                  accountType: "EQUITY",
                  normalBalance: "CREDIT",
                  isActive: false,
                  description: null,
                  parentAccountId: null,
                },
              ],
              total: 3,
              pagination: { total: 3 },
            },
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
        accounts: { list: { invalidate: vi.fn() } },
      },
    })),
  },
}));

describe("ChartOfAccountsSurface", () => {
  it("renders type filter tabs (All Types, Asset, Liability, Equity, Revenue, Expense)", () => {
    render(<ChartOfAccountsSurface />);
    expect(screen.getByText("All Types")).toBeInTheDocument();
    expect(screen.getByText("Asset")).toBeInTheDocument();
    expect(screen.getByText("Liability")).toBeInTheDocument();
    expect(screen.getByText("Equity")).toBeInTheDocument();
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Expense")).toBeInTheDocument();
  });

  it("renders Add Row button", () => {
    render(<ChartOfAccountsSurface />);
    expect(screen.getByText("+ Add Row")).toBeInTheDocument();
  });

  it("renders grid with data", () => {
    render(<ChartOfAccountsSurface />);
    expect(screen.getByTestId("grid-Chart of Accounts")).toBeInTheDocument();
  });

  it("renders KPI badges (account count, active count)", () => {
    render(<ChartOfAccountsSurface />);
    expect(screen.getByText("3 accounts")).toBeInTheDocument();
    expect(screen.getByText("2 active")).toBeInTheDocument();
  });
});
