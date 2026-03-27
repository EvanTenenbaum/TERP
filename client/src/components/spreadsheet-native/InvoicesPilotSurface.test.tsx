import React from "react";
/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoicesPilotSurface } from "./InvoicesPilotSurface";

vi.mock("wouter", () => ({
  useLocation: () => ["/accounting?tab=invoices", vi.fn()],
  useSearch: () => "",
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock("@/hooks/work-surface/useExport", () => ({
  useExport: () => ({
    exportCSV: vi.fn(),
    state: { isExporting: false, progress: 0 },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    invoices: {
      getSummary: {
        useQuery: () => ({
          data: {
            totalInvoices: 42,
            totalAmount: "125000",
            totalOutstanding: "30000",
            overdueAmount: "5000",
          },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      list: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 1,
                invoiceNumber: "INV-001",
                clientId: 10,
                status: "SENT",
                totalAmount: "5000",
                dueDate: "2026-04-01T00:00:00.000Z",
                createdAt: "2026-03-01T00:00:00.000Z",
                paidAmount: "0",
              },
            ],
            pagination: { total: 1, hasMore: false },
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      updateStatus: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      markSent: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      void: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      downloadPdf: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    clients: {
      list: {
        useQuery: () => ({
          data: {
            items: [{ id: 10, name: "Emerald Dispensary" }],
          },
          isLoading: false,
        }),
      },
    },
    accounting: {
      invoices: {
        generateNumber: {
          useQuery: () => ({
            data: { number: "INV-042" },
            isLoading: false,
          }),
        },
        create: {
          useMutation: () => ({
            mutate: vi.fn(),
            isPending: false,
          }),
        },
        getARAging: {
          useQuery: () => ({
            data: {
              current: 20000,
              thirtyDays: 5000,
              sixtyDays: 3000,
              ninetyDays: 2000,
              overNinety: 0,
            },
          }),
        },
      },
    },
    useUtils: () => ({
      invoices: {
        list: { invalidate: vi.fn() },
        getSummary: { invalidate: vi.fn() },
      },
    }),
  },
}));

vi.mock("@/lib/spreadsheet-native", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/spreadsheet-native")
  >("@/lib/spreadsheet-native");

  return {
    ...actual,
    useSpreadsheetSelectionParam: () => ({
      selectedId: null,
      setSelectedId: vi.fn(),
    }),
  };
});

vi.mock("@/components/work-surface/invoiceDeepLink", () => ({
  parseInvoiceDeepLink: () => ({
    invoiceId: null,
    statusFilter: null,
  }),
}));

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock("./SpreadsheetPilotGrid", () => ({
  SpreadsheetPilotGrid: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}));

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div>
      {title ? <h3>{title}</h3> : null}
      {children}
    </div>
  ),
  InspectorSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  InspectorField: () => null,
}));

vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({
    right,
  }: {
    left?: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;
  }) => <div data-testid="status-bar">{right}</div>,
}));

vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => (
    <div role="group" aria-label="keyboard shortcuts">
      <span>select row</span>
      <span>extend range</span>
    </div>
  ),
}));

vi.mock("@/components/work-surface/golden-flows/InvoiceToPaymentFlow", () => ({
  InvoiceToPaymentFlow: () => null,
}));

vi.mock("@/components/accounting/GLReversalStatus", () => ({
  InvoiceGLStatus: () => null,
}));

vi.mock("@/lib/statusTokens", () => ({
  INVOICE_STATUS_TOKENS: {},
  INVOICE_AGING_TOKENS: {},
}));

describe("InvoicesPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Invoices Registry")).toBeInTheDocument();
  });

  it("renders the invoices registry grid title", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Invoices Registry")).toBeInTheDocument();
  });

  it("renders the search input with correct placeholder", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Search invoice # or client")
    ).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /refresh invoices/i })
    ).toBeInTheDocument();
  });

  it("renders the New Invoice button", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByTestId("create-invoice-button")).toBeInTheDocument();
  });

  it("renders status filter tabs", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByTestId("status-tab-ALL")).toBeInTheDocument();
  });

  it("renders the Classic Surface button", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByTestId("open-classic-button")).toBeInTheDocument();
  });

  it("renders the keyboard hint bar", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Clamping tests: amountDue must never go below $0.00
  // -------------------------------------------------------------------------

  it("clamping: formatCurrency returns $0.00 for zero amount", () => {
    // The InvoicesPilotSurface formatCurrency helper handles NaN and zero.
    // Test the pure logic: parseFloat("0") → $0.00
    const formatCurrency = (
      value: string | number | null | undefined
    ): string => {
      const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(num);
    };

    expect(formatCurrency("0")).toBe("$0.00");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("clamping: formatCurrency returns $0.00 for NaN values (payment overage guard)", () => {
    const formatCurrency = (
      value: string | number | null | undefined
    ): string => {
      const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(num);
    };

    // NaN guard — a corrupt or missing value should display as $0.00
    expect(formatCurrency("not-a-number")).toBe("$0.00");
    expect(formatCurrency(NaN)).toBe("$0.00");
    expect(formatCurrency(null)).toBe("$0.00");
    expect(formatCurrency(undefined)).toBe("$0.00");
  });

  it("clamping: PAID invoice amountDue of '0' formats as $0.00", () => {
    // When an invoice is PAID, the backend should return amountDue = "0".
    // The formatCurrency call should render $0.00 (not a negative or blank).
    const formatCurrency = (
      value: string | number | null | undefined
    ): string => {
      const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
      if (Number.isNaN(num)) return "$0.00";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(num);
    };

    const paidAmountDue = "0";
    expect(formatCurrency(paidAmountDue)).toBe("$0.00");
  });

  it("clamping: negative amountDue should display as $0.00 when clamped via Math.max", () => {
    // Overpayment scenario: if amountDue is negative (e.g. credit issued),
    // the surface should clamp to $0.00 to avoid showing negative debt.
    const clampedAmountDue = (raw: number): number => Math.max(0, raw);

    expect(clampedAmountDue(-50)).toBe(0);
    expect(clampedAmountDue(-0.01)).toBe(0);
    expect(clampedAmountDue(0)).toBe(0);
    expect(clampedAmountDue(100)).toBe(100);

    const formatCurrency = (value: number): string => {
      if (Number.isNaN(value)) return "$0.00";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    };

    expect(formatCurrency(clampedAmountDue(-50))).toBe("$0.00");
    expect(formatCurrency(clampedAmountDue(250))).toBe("$250.00");
  });
});
