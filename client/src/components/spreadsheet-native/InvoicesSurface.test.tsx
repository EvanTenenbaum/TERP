import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoicesSurface } from "./InvoicesSurface";

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
    invoices: {
      list: {
        useQuery: vi.fn(() => ({
          data: {
            items: [
              {
                id: 1,
                invoiceNumber: "INV-001",
                customerId: 10,
                invoiceDate: "2026-01-15",
                dueDate: "2026-01-01",
                totalAmount: "5000.00",
                amountDue: "5000.00",
                amountPaid: "0",
                status: "OVERDUE",
                client: { name: "Acme Corp" },
              },
              {
                id: 2,
                invoiceNumber: "INV-002",
                customerId: 11,
                invoiceDate: "2026-02-01",
                dueDate: "2026-03-01",
                totalAmount: "3000.00",
                amountDue: "0.00",
                amountPaid: "3000.00",
                status: "PAID",
                client: { name: "Beta LLC" },
              },
            ],
            total: 2,
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
      getSummary: {
        useQuery: vi.fn(() => ({
          data: {
            byStatus: [
              {
                status: "OVERDUE",
                count: 3,
                totalAmount: 15000,
                amountDue: 15000,
              },
              {
                status: "PAID",
                count: 20,
                totalAmount: 50000,
                amountDue: 0,
              },
              {
                status: "DRAFT",
                count: 24,
                totalAmount: 35000,
                amountDue: 9500,
              },
            ],
            totals: {
              totalInvoices: 47,
              totalAmount: 100000,
              totalOutstanding: 24500,
              overdueAmount: 15000,
            },
          },
          isLoading: false,
        })),
      },
      markSent: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      void: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      downloadPdf: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
      checkOverdue: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
    },
    accounting: {
      invoices: {
        getARAging: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
          })),
        },
        generateNumber: {
          useQuery: vi.fn(() => ({
            data: "INV-100",
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
    clients: {
      list: {
        useQuery: vi.fn(() => ({
          data: { items: [] },
          isLoading: false,
        })),
      },
    },
    clientLedger: {
      getLedger: {
        useQuery: vi.fn(() => ({
          data: null,
          isLoading: false,
        })),
      },
    },
    payments: {
      list: {
        invalidate: vi.fn(),
      },
    },
    useUtils: vi.fn(() => ({
      invoices: {
        list: { invalidate: vi.fn() },
        getSummary: { invalidate: vi.fn() },
      },
      payments: {
        list: { invalidate: vi.fn() },
      },
      clientLedger: {
        getLedger: { invalidate: vi.fn() },
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

vi.mock("@/components/work-surface/golden-flows/InvoiceToPaymentFlow", () => ({
  InvoiceToPaymentFlow: () => <div data-testid="invoice-to-payment-flow" />,
}));

vi.mock("@/components/accounting/GLReversalStatus", () => ({
  InvoiceGLStatus: () => <div data-testid="invoice-gl-status" />,
}));

vi.mock("@/components/work-surface/invoiceDeepLink", () => ({
  parseInvoiceDeepLink: () => ({}),
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  useSpreadsheetSelectionParam: () => ({
    selectedId: null,
    setSelectedId: vi.fn(),
  }),
}));

vi.mock("wouter", () => ({
  useSearch: vi.fn(() => ""),
  useLocation: vi.fn(() => ["/accounting/invoices", vi.fn()]),
}));

vi.mock("@/lib/statusTokens", () => ({
  INVOICE_STATUS_TOKENS: {
    DRAFT: "bg-slate-50 text-slate-700 border-slate-200",
    SENT: "bg-blue-50 text-blue-700 border-blue-200",
    VIEWED: "bg-purple-50 text-purple-700 border-purple-200",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
    PAID: "bg-green-50 text-green-700 border-green-200",
    OVERDUE: "bg-red-50 text-red-700 border-red-200",
    VOID: "bg-gray-50 text-gray-500 border-gray-200",
  },
  INVOICE_AGING_TOKENS: {
    current: "bg-green-50 border-green-200 text-green-700",
    "30": "bg-yellow-50 border-yellow-200 text-yellow-700",
    "60": "bg-orange-50 border-orange-200 text-orange-700",
    "90": "bg-red-50 border-red-200 text-red-700",
    "90+": "bg-red-100 border-red-300 text-red-800",
  },
  LEDGER_TYPE_TOKENS: {
    INVOICE: "bg-blue-100 text-blue-700 border-blue-200",
    PAYMENT: "bg-green-100 text-green-700 border-green-200",
    ADJUSTMENT: "bg-amber-100 text-amber-700 border-amber-200",
    CREDIT: "bg-teal-100 text-teal-700 border-teal-200",
    REFUND: "bg-red-100 text-red-700 border-red-200",
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("InvoicesSurface", () => {
  it("renders KPI badges ($24,500 AR, 3 overdue, 47 total)", () => {
    render(<InvoicesSurface />);
    expect(screen.getByText(/\$24,500/)).toBeInTheDocument();
    expect(screen.getByText(/3 overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/47 total/i)).toBeInTheDocument();
  });

  it("renders all 8 status tabs", () => {
    render(<InvoicesSurface />);
    for (const value of [
      "ALL",
      "DRAFT",
      "SENT",
      "VIEWED",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "VOID",
    ]) {
      expect(screen.getByTestId(`status-tab-${value}`)).toBeInTheDocument();
    }
  });

  it("renders workflow actions (Create Invoice, Mark Sent, Record Payment, Void)", () => {
    render(<InvoicesSurface />);
    expect(screen.getByTestId("create-invoice-button")).toBeInTheDocument();
    expect(screen.getByTestId("action-mark-sent")).toBeInTheDocument();
    expect(screen.getByTestId("action-record-payment")).toBeInTheDocument();
    expect(screen.getByTestId("action-void")).toBeInTheDocument();
  });

  it("renders grid with 2 rows", () => {
    render(<InvoicesSurface />);
    expect(screen.getByText(/2 rows/)).toBeInTheDocument();
  });

  it("renders AR Aging toggle", () => {
    render(<InvoicesSurface />);
    expect(screen.getByText("AR Aging")).toBeInTheDocument();
  });

  it("renders status bar", () => {
    render(<InvoicesSurface />);
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });

  it("disables Mark Sent and Record Payment when no row selected", () => {
    render(<InvoicesSurface />);
    expect(screen.getByTestId("action-mark-sent")).toBeDisabled();
    expect(screen.getByTestId("action-record-payment")).toBeDisabled();
  });
});
