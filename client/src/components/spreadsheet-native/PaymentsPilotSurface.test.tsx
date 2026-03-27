/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentsPilotSurface } from "./PaymentsPilotSurface";

vi.mock("wouter", () => ({
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
    accounting: {
      payments: {
        list: {
          useQuery: () => ({
            data: {
              items: [
                {
                  id: 1,
                  paymentNumber: "PAY-0001",
                  paymentDate: "2026-03-10T00:00:00.000Z",
                  paymentType: "RECEIVED",
                  paymentMethod: "ACH_TRANSFER",
                  amount: "2500.00",
                  referenceNumber: "REF-1001",
                  invoiceId: 42,
                  notes: "March payment",
                },
                {
                  id: 2,
                  paymentNumber: "PAY-0002",
                  paymentDate: "2026-03-12T00:00:00.000Z",
                  paymentType: "SENT",
                  paymentMethod: "CHECK",
                  amount: "750.00",
                  referenceNumber: "CHK-5500",
                  invoiceId: 55,
                  notes: "",
                },
              ],
            },
            isLoading: false,
            isFetching: false,
            error: null,
            refetch: vi.fn(),
          }),
        },
      },
    },
    payments: {
      void: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

// Mock PowersheetGrid
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    description,
    rows,
    onSelectedRowChange,
  }: {
    title: string;
    description?: string;
    rows: Array<{ rowKey: string }>;
    onSelectedRowChange?: (row: { rowKey: string } | null) => void;
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      <button
        type="button"
        onClick={() => {
          onSelectedRowChange?.(rows[0] ?? null);
        }}
      >
        select payment row
      </button>
    </div>
  ),
}));

// Mock InvoiceToPaymentFlow dialog
vi.mock("@/components/work-surface/golden-flows/InvoiceToPaymentFlow", () => ({
  InvoiceToPaymentFlow: () => null,
}));

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({
    children,
    isOpen,
    onClose,
  }: {
    children: ReactNode;
    isOpen?: boolean;
    onClose?: () => void;
  }) =>
    isOpen ? (
      <div>
        <button type="button" onClick={onClose}>
          close payment inspector
        </button>
        {children}
      </div>
    ) : null,
  InspectorSection: ({
    title,
    children,
  }: {
    title: string;
    children: ReactNode;
  }) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  InspectorField: ({
    label,
    children,
  }: {
    label: string;
    children: ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
}));

describe("PaymentsPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Payments Registry grid with title and description", () => {
    render(<PaymentsPilotSurface />);

    expect(screen.getByText("Payments Registry")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Read-only payment transaction ledger. Select a row to see details and take actions."
      )
    ).toBeInTheDocument();
  });

  it("renders the KPI summary cards", () => {
    render(<PaymentsPilotSurface />);

    expect(screen.getByText("Total Payments")).toBeInTheDocument();
    // "Received" appears both as card title and filter button — use getAllByText
    expect(screen.getAllByText("Received").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sent").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the KPI values from the mock data", () => {
    render(<PaymentsPilotSurface />);

    // 2 total payments
    expect(screen.getByText("2")).toBeInTheDocument();
    // Received total: $2,500.00
    expect(screen.getByText("$2,500.00")).toBeInTheDocument();
    // Sent total: $750.00
    expect(screen.getByText("$750.00")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    render(<PaymentsPilotSurface />);

    expect(
      screen.getByPlaceholderText("Search payments...")
    ).toBeInTheDocument();
  });

  it("renders the type filter buttons", () => {
    render(<PaymentsPilotSurface />);

    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Received" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sent" })).toBeInTheDocument();
  });

  it("renders the Refresh button", () => {
    render(<PaymentsPilotSurface />);

    expect(
      screen.getByRole("button", { name: /refresh payments/i })
    ).toBeInTheDocument();
  });

  it("renders the Record Payment button (disabled when no invoice context)", () => {
    render(<PaymentsPilotSurface />);

    const btn = screen.getByRole("button", { name: /record payment/i });
    expect(btn).toBeInTheDocument();
    // Disabled because no row is selected (no invoiceId context)
    expect(btn).toBeDisabled();
  });

  it("renders the Void button (disabled when no row is selected)", () => {
    render(<PaymentsPilotSurface />);

    const btn = screen.getByRole("button", { name: /void/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("renders the Classic View button when onOpenClassic is provided", () => {
    render(<PaymentsPilotSurface onOpenClassic={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /classic view/i })
    ).toBeInTheDocument();
  });

  it("does not render the Classic View button when onOpenClassic is not provided", () => {
    render(<PaymentsPilotSurface />);

    expect(
      screen.queryByRole("button", { name: /classic view/i })
    ).not.toBeInTheDocument();
  });

  it("renders the keyboard hint bar with expected shortcuts", () => {
    render(<PaymentsPilotSurface />);

    expect(screen.getByText("select row")).toBeInTheDocument();
    expect(screen.getByText("extend range")).toBeInTheDocument();
    expect(screen.getByText("copy cells")).toBeInTheDocument();
    expect(screen.getByText("select all")).toBeInTheDocument();
  });

  it("renders the sort controls", () => {
    render(<PaymentsPilotSurface />);

    const sortSelect = screen.getByRole("combobox", { name: /sort field/i });
    expect(sortSelect).toBeInTheDocument();
  });

  it("allows closing and reselecting the same payment row", () => {
    render(<PaymentsPilotSurface />);

    const recordPaymentButton = screen.getByRole("button", {
      name: /record payment/i,
    });
    expect(recordPaymentButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "select payment row" }));
    expect(recordPaymentButton).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "close payment inspector" })
    );
    expect(recordPaymentButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "select payment row" }));
    expect(recordPaymentButton).toBeEnabled();
  });
});
