/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientLedgerPilotSurface } from "./ClientLedgerPilotSurface";

const mockSetLocation = vi.fn();
let mockLedgerTransactions = [
  {
    id: "txn-001",
    date: "2026-03-10T00:00:00.000Z",
    type: "SALE",
    description: "Invoice #1042 — 5 units Flower Indoor",
    referenceType: "ORDER",
    referenceId: 1042,
    debitAmount: 2500,
    creditAmount: 0,
    runningBalance: 2500,
    createdBy: "system",
  },
  {
    id: "txn-002",
    date: "2026-03-15T00:00:00.000Z",
    type: "PAYMENT_RECEIVED",
    description: "Payment received via ACH",
    referenceType: "PAYMENT",
    referenceId: 501,
    debitAmount: 0,
    creditAmount: 2500,
    runningBalance: 0,
    createdBy: "evan",
  },
];
vi.mock("wouter", () => ({
  useLocation: () => ["/accounting?tab=client-ledger", mockSetLocation],
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
    clients: {
      list: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 1,
                name: "Acme Distribution",
                email: "acme@example.com",
                phone: "555-0100",
                isBuyer: true,
                isSeller: false,
              },
              {
                id: 2,
                name: "North Farm Supply",
                email: "north@example.com",
                phone: "555-0200",
                isBuyer: false,
                isSeller: true,
              },
            ],
          },
          isLoading: false,
        }),
      },
    },
    clientLedger: {
      getTransactionTypes: {
        useQuery: () => ({
          data: [
            { value: "SALE", label: "Sale" },
            { value: "PAYMENT_RECEIVED", label: "Payment Received" },
            { value: "CREDIT", label: "Credit" },
            { value: "DEBIT", label: "Debit" },
          ],
        }),
      },
      getLedger: {
        useQuery: () => ({
          data: {
            transactions: mockLedgerTransactions,
            totalCount: 2,
            currentBalance: 0,
            balanceDescription: "Paid in full",
            summary: {
              totalDebits: 2500,
              totalCredits: 2500,
            },
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      exportLedger: {
        useQuery: () => ({
          data: null,
          refetch: vi.fn(),
        }),
      },
      addLedgerAdjustment: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    useUtils: () => ({
      clientLedger: {
        getLedger: { invalidate: vi.fn() },
      },
    }),
  },
}));

// Mock PowersheetGrid (used by the new implementation)
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    description,
    rows,
    onSelectedRowChange,
  }: {
    title: string;
    description?: string;
    rows: Array<{ _txn: { id: string; description: string } }>;
    onSelectedRowChange?: (
      row: { _txn: { id: string; description: string } } | null
    ) => void;
  }) => (
    <div data-testid="powersheet-grid">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      <button
        type="button"
        onClick={() => {
          onSelectedRowChange?.(rows[0] ?? null);
        }}
      >
        select ledger row
      </button>
    </div>
  ),
}));

// Keep SpreadsheetPilotGrid mock for transitive imports
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

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/ui/client-combobox", () => ({
  ClientCombobox: ({
    onValueChange,
  }: {
    onValueChange: (value: number | null) => void;
  }) => (
    <button
      type="button"
      data-testid="client-combobox"
      onClick={() => onValueChange(1)}
    >
      Select a client...
    </button>
  ),
}));

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({
    children,
    title,
    isOpen,
    onClose,
  }: {
    children: ReactNode;
    title?: string;
    isOpen?: boolean;
    onClose?: () => void;
  }) =>
    isOpen ? (
      <div>
        {title ? <h3>{title}</h3> : null}
        <button type="button" onClick={onClose}>
          close inspector
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

describe("ClientLedgerPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLedgerTransactions = [
      {
        id: "txn-001",
        date: "2026-03-10T00:00:00.000Z",
        type: "SALE",
        description: "Invoice #1042 — 5 units Flower Indoor",
        referenceType: "ORDER",
        referenceId: 1042,
        debitAmount: 2500,
        creditAmount: 0,
        runningBalance: 2500,
        createdBy: "system",
      },
      {
        id: "txn-002",
        date: "2026-03-15T00:00:00.000Z",
        type: "PAYMENT_RECEIVED",
        description: "Payment received via ACH",
        referenceType: "PAYMENT",
        referenceId: 501,
        debitAmount: 0,
        creditAmount: 2500,
        runningBalance: 0,
        createdBy: "evan",
      },
    ];
  });

  it("renders the surface header with title, without internal pilot badge", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Client Ledger")).toBeInTheDocument();
    expect(screen.queryByText("Sheet-Native Pilot")).not.toBeInTheDocument();
    expect(
      screen.getByText("View transactions and balance history for a client")
    ).toBeInTheDocument();
  });

  it("renders the Export and Add Adjustment action buttons", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Export (E)")).toBeInTheDocument();
    expect(screen.getByText("Add Adjustment (A)")).toBeInTheDocument();
  });

  it("renders the Classic View button when onOpenClassic is provided", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Classic View")).toBeInTheDocument();
  });

  it("does not render Classic View button when onOpenClassic is omitted", () => {
    render(<ClientLedgerPilotSurface />);

    expect(screen.queryByText("Classic View")).not.toBeInTheDocument();
  });

  it("renders the empty state when no client is selected", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Select a Client")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose a client from the dropdown above to view their ledger history."
      )
    ).toBeInTheDocument();
  });

  it("renders the client combobox selector", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByTestId("client-combobox")).toBeInTheDocument();
    expect(screen.getByText("Client (required)")).toBeInTheDocument();
  });

  it("renders the filter labels for date range and transaction type", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Date Range")).toBeInTheDocument();
    expect(screen.getByText("Transaction Type")).toBeInTheDocument();
  });

  it("renders the status bar with no-client-selected message", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("No client selected")).toBeInTheDocument();
  });

  it("renders the keyboard hint bar with expected shortcuts", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("select row")).toBeInTheDocument();
    expect(screen.getByText("open inspector")).toBeInTheDocument();
    expect(screen.getByText("close inspector")).toBeInTheDocument();
    expect(screen.getByText("add adjustment")).toBeInTheDocument();
    expect(screen.getByText("export CSV")).toBeInTheDocument();
    expect(screen.getByText("previous page")).toBeInTheDocument();
    expect(screen.getByText("next page")).toBeInTheDocument();
  });

  it("renders with the client-ledger-pilot test id", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByTestId("client-ledger-pilot")).toBeInTheDocument();
  });

  it("renders the date range picker trigger button", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Select date range")).toBeInTheDocument();
  });

  it("renders the transaction type filter showing All types by default", () => {
    render(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("All types")).toBeInTheDocument();
  });

  it("refreshes the inspector when the selected transaction updates with the same id", () => {
    const { rerender } = render(
      <ClientLedgerPilotSurface onOpenClassic={vi.fn()} />
    );

    fireEvent.click(screen.getByTestId("client-combobox"));
    fireEvent.click(screen.getByRole("button", { name: "select ledger row" }));

    expect(
      screen.getByText("Invoice #1042 — 5 units Flower Indoor")
    ).toBeInTheDocument();

    mockLedgerTransactions = mockLedgerTransactions.map(transaction =>
      transaction.id === "txn-001"
        ? { ...transaction, description: "Updated ledger description" }
        : transaction
    );

    rerender(<ClientLedgerPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByText("Updated ledger description")).toBeInTheDocument();
  });
});
