import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FiscalPeriodsSurface } from "./FiscalPeriodsSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title, rows }: { title: string; rows: unknown[] }) => (
    <div data-testid={`grid-${title}`}>
      {title} ({rows.length} rows)
    </div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      fiscalPeriods: {
        list: {
          useQuery: vi.fn(() => ({
            data: [
              {
                id: 1,
                periodName: "Q1 2026",
                fiscalYear: 2026,
                startDate: "2026-01-01",
                endDate: "2026-03-31",
                status: "OPEN",
              },
              {
                id: 2,
                periodName: "Q4 2025",
                fiscalYear: 2025,
                startDate: "2025-10-01",
                endDate: "2025-12-31",
                status: "CLOSED",
              },
              {
                id: 3,
                periodName: "Q3 2025",
                fiscalYear: 2025,
                startDate: "2025-07-01",
                endDate: "2025-09-30",
                status: "LOCKED",
              },
            ],
            isLoading: false,
            refetch: vi.fn(),
          })),
        },
        getCurrent: {
          useQuery: vi.fn(() => ({
            data: { id: 1, periodName: "Q1 2026" },
            refetch: vi.fn(),
          })),
        },
        close: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
        lock: {
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
        fiscalPeriods: {
          list: { invalidate: vi.fn() },
          getCurrent: { invalidate: vi.fn() },
        },
      },
    })),
  },
}));

describe("FiscalPeriodsSurface", () => {
  it("renders title with KPI badges", () => {
    render(<FiscalPeriodsSurface />);
    expect(screen.getByText("Fiscal Periods")).toBeInTheDocument();
    expect(screen.getByText("3 periods")).toBeInTheDocument();
    expect(screen.getByText("Q1 2026")).toBeInTheDocument();
  });

  it("renders status filter tabs (All, Open, Closed, Locked)", () => {
    render(<FiscalPeriodsSurface />);
    expect(screen.getByTestId("status-tab-ALL")).toBeInTheDocument();
    expect(screen.getByTestId("status-tab-OPEN")).toBeInTheDocument();
    expect(screen.getByTestId("status-tab-CLOSED")).toBeInTheDocument();
    expect(screen.getByTestId("status-tab-LOCKED")).toBeInTheDocument();
  });

  it("renders Close Period and Lock Period actions", () => {
    render(<FiscalPeriodsSurface />);
    expect(screen.getByTestId("close-period-button")).toBeInTheDocument();
    expect(screen.getByTestId("lock-period-button")).toBeInTheDocument();
  });

  it("renders grid with data", () => {
    render(<FiscalPeriodsSurface />);
    expect(screen.getByTestId("grid-Fiscal Periods")).toBeInTheDocument();
    expect(screen.getByText(/3 rows/)).toBeInTheDocument();
  });
});
