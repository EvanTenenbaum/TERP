import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GeneralLedgerSurface } from "./GeneralLedgerSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title, rows }: { title: string; rows: unknown[] }) => (
    <div data-testid={`grid-${title}`}>
      {title} ({rows.length} rows)
    </div>
  ),
}));

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="inspector">{children}</div>
  ),
  InspectorSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  InspectorField: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/components/work-surface/WorkSurfaceStatusBar", () => ({
  WorkSurfaceStatusBar: ({
    left,
    right,
  }: {
    left: React.ReactNode;
    right: React.ReactNode;
  }) => (
    <div data-testid="status-bar">
      {left}
      {right}
    </div>
  ),
}));

vi.mock("@/components/work-surface/KeyboardHintBar", () => ({
  KeyboardHintBar: () => <div data-testid="keyboard-hints">hints</div>,
}));

vi.mock("@/components/accounting/AccountSelector", () => ({
  AccountSelector: () => <select data-testid="account-selector" />,
}));

vi.mock("@/components/accounting/FiscalPeriodSelector", () => ({
  FiscalPeriodSelector: () => <select data-testid="fiscal-period-selector" />,
}));

vi.mock("@/components/accounting/JournalEntryForm", () => ({
  JournalEntryForm: () => <div data-testid="journal-entry-form" />,
}));

const mockLedgerEntries = [
  {
    id: 1,
    entryNumber: "JE-001",
    entryDate: "2026-01-15",
    accountId: 100,
    debit: "1000.00",
    credit: "0.00",
    description: "Opening balance",
    fiscalPeriodId: 1,
    isPosted: true,
    referenceType: null,
    referenceId: null,
    createdAt: "2026-01-15T00:00:00Z",
  },
  {
    id: 2,
    entryNumber: "JE-002",
    entryDate: "2026-01-20",
    accountId: 200,
    debit: "0.00",
    credit: "500.00",
    description: "Payment received",
    fiscalPeriodId: 1,
    isPosted: false,
    referenceType: "PAYMENT",
    referenceId: 42,
    createdAt: "2026-01-20T00:00:00Z",
  },
];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    accounting: {
      ledger: {
        list: {
          useQuery: vi.fn(() => ({
            data: { items: mockLedgerEntries, total: 2 },
            isLoading: false,
            refetch: vi.fn(),
          })),
        },
        getTrialBalance: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
          })),
        },
        postJournalEntry: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
      },
    },
    useUtils: vi.fn(() => ({
      accounting: {
        ledger: {
          list: { invalidate: vi.fn() },
        },
      },
    })),
  },
}));

describe("GeneralLedgerSurface", () => {
  it("renders 'General Ledger' title", () => {
    render(<GeneralLedgerSurface />);
    expect(screen.getByText("General Ledger")).toBeInTheDocument();
  });

  it("renders Posted/Draft filter tabs", () => {
    render(<GeneralLedgerSurface />);
    expect(screen.getByTestId("status-tab-ALL")).toBeInTheDocument();
    expect(screen.getByTestId("status-tab-POSTED")).toBeInTheDocument();
    expect(screen.getByTestId("status-tab-DRAFT")).toBeInTheDocument();
  });

  it("renders Post Journal Entry action", () => {
    render(<GeneralLedgerSurface />);
    expect(screen.getByText("Post Journal Entry")).toBeInTheDocument();
  });

  it("renders Trial Balance toggle", () => {
    render(<GeneralLedgerSurface />);
    expect(screen.getByText("Trial Balance")).toBeInTheDocument();
  });

  it("renders grid with data", () => {
    render(<GeneralLedgerSurface />);
    expect(screen.getByTestId("grid-General Ledger")).toBeInTheDocument();
    expect(screen.getByText(/2 rows/)).toBeInTheDocument();
  });

  it("renders status bar", () => {
    render(<GeneralLedgerSurface />);
    expect(screen.getByTestId("status-bar")).toBeInTheDocument();
  });
});
