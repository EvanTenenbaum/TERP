import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpensesSurface } from "./ExpensesSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid={`grid-${title}`}>{title}</div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      expenses: {
        list: {
          useQuery: vi.fn(() => ({
            data: {
              items: [
                {
                  id: 1,
                  expenseNumber: "EXP-2026-000001",
                  expenseDate: "2026-03-15",
                  description: "Office supplies",
                  categoryId: 1,
                  amount: "125.50",
                  isReimbursable: true,
                  isReimbursed: false,
                },
                {
                  id: 2,
                  expenseNumber: "EXP-2026-000002",
                  expenseDate: "2026-03-20",
                  description: "Travel expenses",
                  categoryId: 2,
                  amount: "450.00",
                  isReimbursable: false,
                  isReimbursed: false,
                },
              ],
              total: 2,
              pagination: { total: 2 },
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
        generateNumber: {
          fetch: vi.fn(() => Promise.resolve("EXP-2026-000003")),
        },
        getPendingReimbursements: {
          useQuery: vi.fn(() => ({
            data: [
              {
                id: 1,
                expenseNumber: "EXP-2026-000001",
                amount: "125.50",
              },
            ],
            isLoading: false,
          })),
        },
        getBreakdownByCategory: {
          useQuery: vi.fn(() => ({
            data: {
              categories: [{ categoryName: "Office", totalAmount: 125.5 }],
              total: 125.5,
            },
            isLoading: false,
            refetch: vi.fn(),
          })),
        },
      },
      expenseCategories: {
        list: {
          useQuery: vi.fn(() => ({
            data: {
              items: [
                { id: 1, categoryName: "Office Supplies" },
                { id: 2, categoryName: "Travel" },
              ],
              total: 2,
            },
            isLoading: false,
            refetch: vi.fn(),
          })),
        },
      },
    },
    useUtils: vi.fn(() => ({
      accounting: {
        expenses: {
          list: { invalidate: vi.fn() },
          getBreakdownByCategory: { invalidate: vi.fn() },
          getPendingReimbursements: { invalidate: vi.fn() },
          generateNumber: {
            fetch: vi.fn(() => Promise.resolve("EXP-2026-000003")),
          },
        },
      },
    })),
  },
}));

describe("ExpensesSurface", () => {
  it('renders "Expenses" title with KPI badges', () => {
    render(<ExpensesSurface />);
    // Title appears in toolbar (bold text) and grid mock — use getAllByText
    expect(screen.getAllByText("Expenses").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("kpi-total-amount")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-entries")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-pending-reimbursement")).toBeInTheDocument();
  });

  it("renders category filter", () => {
    render(<ExpensesSurface />);
    expect(screen.getByTestId("category-filter")).toBeInTheDocument();
  });

  it("renders Export CSV button", () => {
    render(<ExpensesSurface />);
    expect(screen.getByTestId("export-csv-button")).toBeInTheDocument();
  });

  it("renders grid with data", () => {
    render(<ExpensesSurface />);
    expect(screen.getByTestId("grid-Expenses")).toBeInTheDocument();
  });

  it("renders KPI badge values correctly", () => {
    render(<ExpensesSurface />);
    expect(screen.getByText("2 entries")).toBeInTheDocument();
    expect(screen.getByText("1 pending reimbursement")).toBeInTheDocument();
  });

  it("renders Reimbursable only checkbox", () => {
    render(<ExpensesSurface />);
    expect(
      screen.getByTestId("reimbursable-only-checkbox")
    ).toBeInTheDocument();
  });

  it("renders Add Row button", () => {
    render(<ExpensesSurface />);
    expect(screen.getByText("+ Add Row")).toBeInTheDocument();
  });
});
