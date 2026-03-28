import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentsSurface } from "./PaymentsSurface";

const PAYMENT_ITEMS = [
  {
    id: 1,
    paymentNumber: "PAY-001",
    paymentDate: "2026-01-15",
    paymentType: "RECEIVED",
    paymentMethod: "CHECK",
    amount: "5000.00",
    referenceNumber: "CHK-100",
    invoiceId: 10,
    notes: "First payment",
  },
  {
    id: 2,
    paymentNumber: "PAY-002",
    paymentDate: "2026-02-01",
    paymentType: "SENT",
    paymentMethod: "ACH",
    amount: "3000.00",
    referenceNumber: "ACH-200",
    invoiceId: 20,
    notes: "",
  },
  {
    id: 3,
    paymentNumber: "PAY-003",
    paymentDate: "2026-02-10",
    paymentType: "RECEIVED",
    paymentMethod: "WIRE",
    amount: "2500.00",
    referenceNumber: null,
    invoiceId: null,
    notes: null,
  },
] as const;

const {
  mockUseSearch,
  mockInvoicesGetByReferenceUseQuery,
  mockPaymentsListUseQuery,
  mockInvoicesGetByIdUseQuery,
} = vi.hoisted(() => ({
  mockUseSearch: vi.fn(() => ""),
  mockInvoicesGetByReferenceUseQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  mockInvoicesGetByIdUseQuery: vi.fn(() => ({
    data: {
      id: 10,
      invoiceNumber: "INV-010",
      totalAmount: "5000.00",
      amountPaid: "0.00",
      amountDue: "5000.00",
      status: "SENT",
    },
    refetch: vi.fn(),
  })),
  mockPaymentsListUseQuery: vi.fn((input?: { invoiceId?: number }) => {
    const filteredItems =
      typeof input?.invoiceId === "number"
        ? PAYMENT_ITEMS.filter(item => item.invoiceId === input.invoiceId)
        : PAYMENT_ITEMS;

    return {
      data: {
        items: filteredItems,
        nextCursor: null,
        hasMore: false,
        pagination: { total: 142, limit: 50, offset: 0 },
      },
      isLoading: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    };
  }),
}));

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
      invoices: {
        getByReference: {
          useQuery: mockInvoicesGetByReferenceUseQuery,
        },
        getById: {
          useQuery: mockInvoicesGetByIdUseQuery,
        },
      },
      payments: {
        list: {
          useQuery: mockPaymentsListUseQuery,
        },
      },
    },
    payments: {
      void: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
        })),
      },
    },
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

vi.mock("@/components/accounting/RecordPaymentDialog", () => ({
  RecordPaymentDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="record-payment-dialog" /> : null,
}));

vi.mock("wouter", () => ({
  useSearch: mockUseSearch,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("PaymentsSurface", () => {
  beforeEach(() => {
    mockUseSearch.mockReturnValue("");
    mockInvoicesGetByReferenceUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockInvoicesGetByIdUseQuery.mockReturnValue({
      data: {
        id: 10,
        invoiceNumber: "INV-010",
        totalAmount: "5000.00",
        amountPaid: "0.00",
        amountDue: "5000.00",
        status: "SENT",
      },
      refetch: vi.fn(),
    });
    mockPaymentsListUseQuery.mockClear();
  });

  it("renders KPI badges with totals (142 total)", () => {
    render(<PaymentsSurface />);
    expect(screen.getByText(/142 total/i)).toBeInTheDocument();
  });

  it("renders KPI badges with received total ($7,500)", () => {
    render(<PaymentsSurface />);
    expect(screen.getByText(/\$7,500/)).toBeInTheDocument();
  });

  it("renders KPI badges with sent total ($3,000)", () => {
    render(<PaymentsSurface />);
    expect(screen.getByText(/\$3,000/)).toBeInTheDocument();
  });

  it("renders type filter tabs (All, Received, Sent)", () => {
    render(<PaymentsSurface />);
    expect(screen.getByTestId("type-tab-ALL")).toBeInTheDocument();
    expect(screen.getByTestId("type-tab-RECEIVED")).toBeInTheDocument();
    expect(screen.getByTestId("type-tab-SENT")).toBeInTheDocument();
  });

  it("renders Record Payment and Void actions", () => {
    render(<PaymentsSurface />);
    expect(screen.getByTestId("action-record-payment")).toBeInTheDocument();
    expect(screen.getByTestId("action-void")).toBeInTheDocument();
  });

  it("renders payments grid with data", () => {
    render(<PaymentsSurface />);
    expect(screen.getByText(/3 rows/)).toBeInTheDocument();
  });

  it("renders status bar", () => {
    render(<PaymentsSurface />);
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });

  it("disables Void when no row selected", () => {
    render(<PaymentsSurface />);
    expect(screen.getByTestId("action-void")).toBeDisabled();
  });

  it("resolves legacy order handoffs through the linked invoice instead of fuzzy search", () => {
    mockUseSearch.mockReturnValue("?tab=payments&orderId=34&from=sales");
    mockInvoicesGetByReferenceUseQuery.mockReturnValue({
      data: { id: 34, invoiceNumber: "INV-000034" },
      isLoading: false,
      refetch: vi.fn(),
    });
    mockPaymentsListUseQuery.mockImplementation((input?: { invoiceId?: number }) => {
      const filteredItems =
        typeof input?.invoiceId === "number"
          ? [
              {
                id: 34,
                paymentNumber: "PAY-INV-000034",
                paymentDate: "2026-02-12",
                paymentType: "RECEIVED",
                paymentMethod: "WIRE",
                amount: "18524.66",
                referenceNumber: "WIRE-34",
                invoiceId: input.invoiceId,
                notes: "Order-linked payment",
              },
            ]
          : PAYMENT_ITEMS;

      return {
        data: {
          items: filteredItems,
          nextCursor: null,
          hasMore: false,
          pagination: { total: filteredItems.length, limit: 50, offset: 0 },
        },
        isLoading: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      };
    });

    render(<PaymentsSurface />);

    expect(screen.getByTestId("payments-order-handoff-banner")).toHaveTextContent(
      "invoice #34 for order #34"
    );
    expect(screen.getByText(/1 rows/)).toBeInTheDocument();
  });

  it("shows an invoice-scope banner for direct invoice deep links", () => {
    mockUseSearch.mockReturnValue("?tab=payments&invoiceId=10");

    render(<PaymentsSurface />);

    expect(screen.getByTestId("payments-invoice-scope-banner")).toHaveTextContent(
      "invoice #10"
    );
  });
});
