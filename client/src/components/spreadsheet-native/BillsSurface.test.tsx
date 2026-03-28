import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BillsSurface } from "./BillsSurface";

/* ── Mock PowersheetGrid ── */
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ rows, title }: { rows: unknown[]; title: string }) => (
    <div data-testid={`grid-${title}`}>
      {title} — {rows.length} rows
    </div>
  ),
}));

/* ── Mock tRPC ── */
vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      bills: {
        list: {
          useQuery: vi.fn(() => ({
            data: {
              items: [
                {
                  id: 1,
                  billNumber: "BILL-001",
                  vendorId: 10,
                  vendorName: "Hemp Supplies Co",
                  billDate: "2026-01-15",
                  dueDate: "2026-01-01",
                  totalAmount: "8000.00",
                  amountPaid: "0",
                  amountDue: "8000.00",
                  status: "OVERDUE",
                },
                {
                  id: 2,
                  billNumber: "BILL-002",
                  vendorId: 11,
                  vendorName: "PackageCo LLC",
                  billDate: "2026-02-01",
                  dueDate: "2026-03-01",
                  totalAmount: "3000.00",
                  amountPaid: "3000.00",
                  amountDue: "0.00",
                  status: "PAID",
                },
                {
                  id: 3,
                  billNumber: "BILL-003",
                  vendorId: 10,
                  vendorName: "Hemp Supplies Co",
                  billDate: "2026-02-10",
                  dueDate: "2026-02-15",
                  totalAmount: "2200.00",
                  amountPaid: "0",
                  amountDue: "2200.00",
                  status: "APPROVED",
                },
              ],
              total: 3,
            },
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          })),
        },
        getById: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
            error: null,
          })),
        },
        getAPAging: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
          })),
        },
        updateStatus: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
      },
      arApDashboard: {
        getAPSummary: {
          useQuery: vi.fn(() => ({
            data: {
              totalAP: 18200,
              billCount: 31,
            },
            isLoading: false,
          })),
        },
        getOverdueBills: {
          useQuery: vi.fn(() => ({
            data: {
              items: [
                { id: 1, billNumber: "BILL-001" },
                { id: 4, billNumber: "BILL-004" },
              ],
              pagination: { total: 2, limit: 100, offset: 0 },
              hasMore: false,
              nextCursor: null,
            },
            isLoading: false,
          })),
        },
      },
    },
    useUtils: vi.fn(() => ({
      accounting: {
        bills: {
          list: { invalidate: vi.fn() },
          getById: { invalidate: vi.fn() },
        },
        arApDashboard: {
          getAPSummary: { invalidate: vi.fn() },
          getOverdueBills: { invalidate: vi.fn() },
        },
      },
    })),
  },
}));

/* ── Mock external components ── */
vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: unknown }) => (
    <div data-testid="inspector-panel">{children as string}</div>
  ),
  InspectorSection: ({ children }: { children: unknown }) => (
    <div>{children as string}</div>
  ),
  InspectorField: ({ children }: { children: unknown }) => (
    <div>{children as string}</div>
  ),
}));

vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({
    left,
    right,
  }: {
    left: unknown;
    right: unknown;
  }) => (
    <div data-testid="status-bar">
      <span>{left as string}</span>
      <span>{right as string}</span>
    </div>
  ),
}));

vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => <div data-testid="keyboard-hint-bar" />,
}));

vi.mock("@/components/accounting/PayVendorModal", () => ({
  PayVendorModal: () => <div data-testid="pay-vendor-modal" />,
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  useSpreadsheetSelectionParam: () => ({
    selectedId: null,
    setSelectedId: vi.fn(),
  }),
}));

vi.mock("wouter", () => ({
  useSearch: vi.fn(() => ""),
  useLocation: vi.fn(() => ["/accounting/bills", vi.fn()]),
}));

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("BillsSurface", () => {
  it("renders AP KPI badges ($18,200 AP, 2 overdue, 31 total)", () => {
    render(<BillsSurface />);
    expect(screen.getByText(/\$18,200/)).toBeInTheDocument();
    expect(screen.getByText(/2 overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/31 total/i)).toBeInTheDocument();
  });

  it("renders AP-specific status tabs (All, Draft, Pending, Approved, Partial, Paid, Overdue, Void)", () => {
    render(<BillsSurface />);
    for (const value of [
      "ALL",
      "DRAFT",
      "PENDING",
      "APPROVED",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "VOID",
    ]) {
      expect(screen.getByTestId(`status-tab-${value}`)).toBeInTheDocument();
    }
  });

  it("renders Pay Vendor and Mark Received actions (no Create Bill, no Approve)", () => {
    render(<BillsSurface />);
    expect(screen.getByTestId("action-pay-vendor")).toBeInTheDocument();
    expect(screen.getByTestId("action-mark-received")).toBeInTheDocument();
    expect(screen.getByTestId("action-void")).toBeInTheDocument();
    // No Create Bill or Approve buttons
    expect(screen.queryByTestId("create-bill-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("action-approve")).not.toBeInTheDocument();
  });

  it("renders bills grid with data", () => {
    render(<BillsSurface />);
    expect(screen.getByText(/3 rows/)).toBeInTheDocument();
  });

  it("renders AP Aging toggle", () => {
    render(<BillsSurface />);
    expect(screen.getByText("AP Aging")).toBeInTheDocument();
  });

  it("renders status bar", () => {
    render(<BillsSurface />);
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });

  it("disables Pay Vendor and Mark Received when no row selected", () => {
    render(<BillsSurface />);
    expect(screen.getByTestId("action-pay-vendor")).toBeDisabled();
    expect(screen.getByTestId("action-mark-received")).toBeDisabled();
  });
});
