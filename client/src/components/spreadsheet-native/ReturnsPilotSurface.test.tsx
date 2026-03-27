import React from "react";
/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReturnsPilotSurface } from "./ReturnsPilotSurface";

let lastPowersheetGridProps: Record<string, unknown> | null = null;
let mockReturnItems = [
  {
    id: 1,
    orderId: 100,
    returnNumber: "RET-001",
    returnReason: "DEFECTIVE",
    status: "PENDING",
    processedBy: 1,
    processedAt: "2026-03-01T00:00:00.000Z",
    notes: null,
    items: [
      {
        id: 10,
        batchId: 5,
        quantity: "2",
        status: "PENDING",
      },
    ],
  },
];

vi.mock("wouter", () => ({
  useLocation: () => ["/operations?tab=returns", vi.fn()],
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
    returns: {
      list: {
        useQuery: () => ({
          data: {
            items: mockReturnItems,
            pagination: { total: 1, hasMore: false },
          },
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      getStats: {
        useQuery: () => ({
          data: {
            totalReturns: 8,
            defectiveCount: 3,
            wrongItemCount: 2,
            notAsDescribedCount: 1,
            customerChangedMindCount: 1,
            otherCount: 1,
          },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
      getById: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      create: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      approve: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      reject: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      receive: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    orders: {
      getOrderWithLineItems: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
        }),
      },
    },
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

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({
    title,
    description,
    rows,
  }: {
    title: string;
    description?: string;
    rows: Array<{ derivedStatus: string }>;
  }) => {
    lastPowersheetGridProps = { title, description, rows };
    return (
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        <span data-testid="derived-statuses">
          {rows.map(row => row.derivedStatus).join(",")}
        </span>
      </div>
    );
  },
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

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/accounting/GLReversalStatus", () => ({
  ReturnGLStatus: () => null,
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

describe("ReturnsPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastPowersheetGridProps = null;
    mockReturnItems = [
      {
        id: 1,
        orderId: 100,
        returnNumber: "RET-001",
        returnReason: "DEFECTIVE",
        status: "PENDING",
        processedBy: 1,
        processedAt: "2026-03-01T00:00:00.000Z",
        notes: null,
        items: [
          {
            id: 10,
            batchId: 5,
            quantity: "2",
            status: "PENDING",
          },
        ],
      },
    ];
  });

  it("renders without crashing", () => {
    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Returns Queue")).toBeInTheDocument();
  });

  it("renders the returns queue grid title", () => {
    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Returns Queue")).toBeInTheDocument();
  });

  it("renders stats summary cards", () => {
    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Total Returns")).toBeInTheDocument();
    expect(screen.getByText("Defective")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders the search input with correct placeholder", () => {
    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Search return, order, reason, or status")
    ).toBeInTheDocument();
  });

  it("renders the Process Return button", () => {
    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /process return/i })
    ).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /refresh returns data/i })
    ).toBeInTheDocument();
  });

  it("renders the sheet-native badge", () => {
    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Sheet-native Returns")).toBeInTheDocument();
  });

  it("renders the keyboard hint bar", () => {
    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
  });

  it("prefers the dedicated status column over legacy notes when mapping return rows", () => {
    mockReturnItems = [
      {
        id: 2,
        orderId: 101,
        returnNumber: "RET-002",
        returnReason: "WRONG_ITEM",
        status: "APPROVED",
        processedBy: 1,
        processedAt: "2026-03-02T00:00:00.000Z",
        notes: "[REJECTED 2026-03-02]",
        items: [],
      },
    ];

    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByTestId("derived-statuses")).toHaveTextContent(
      "APPROVED"
    );
    expect(lastPowersheetGridProps).not.toBeNull();
  });

  it("falls back to legacy notes markers when the dedicated status column is missing", () => {
    mockReturnItems = [
      {
        id: 3,
        orderId: 102,
        returnNumber: "RET-003",
        returnReason: "DAMAGED",
        status: null,
        processedBy: 1,
        processedAt: "2026-03-03T00:00:00.000Z",
        notes: "[REJECTED 2026-03-03]",
        items: [],
      },
    ];

    render(<ReturnsPilotSurface onOpenClassic={vi.fn()} />);

    expect(screen.getByTestId("derived-statuses")).toHaveTextContent(
      "REJECTED"
    );
  });
});
