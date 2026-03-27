import React from "react";
/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
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

  it("clears the search input when switching invoice status tabs", () => {
    render(<InvoicesPilotSurface onOpenClassic={vi.fn()} />);

    const searchInput = screen.getByPlaceholderText(
      "Search invoice # or client"
    );
    fireEvent.change(searchInput, { target: { value: "INV-001" } });
    expect(searchInput).toHaveValue("INV-001");

    fireEvent.click(screen.getByTestId("status-tab-SENT"));

    expect(searchInput).toHaveValue("");
  });
});
