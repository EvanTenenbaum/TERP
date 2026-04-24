import React from "react";
/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseOrdersPilotSurface } from "./PurchaseOrdersPilotSurface";

const mockSetLocation = vi.fn();
const powersheetGridCalls: Array<Record<string, unknown>> = [];

vi.mock("wouter", () => ({
  useLocation: () => ["/operations?tab=purchase-orders", mockSetLocation],
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
    purchaseOrders: {
      getAll: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 1,
                poNumber: "PO-001",
                supplierClientId: 10,
                purchaseOrderStatus: "DRAFT",
                orderDate: "2026-03-01T00:00:00.000Z",
                total: "5000",
                paymentTerms: "NET_30",
                notes: null,
                createdAt: "2026-03-01T00:00:00.000Z",
              },
            ],
            pagination: { hasMore: false },
          },
          isLoading: false,
          error: null,
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
      delete: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      updateStatus: {
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
            items: [{ id: 10, name: "North Farm Supply" }],
          },
          isLoading: false,
        }),
      },
    },
  },
}));

const mockSetSelectedPoId = vi.fn();

vi.mock("@/lib/spreadsheet-native", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/spreadsheet-native")
  >("@/lib/spreadsheet-native");

  return {
    ...actual,
    useSpreadsheetSelectionParam: () => ({
      selectedId: null,
      setSelectedId: mockSetSelectedPoId,
    }),
  };
});

type MockRow = {
  identity?: { rowKey: string };
  poId?: number;
  poNumber?: string;
};

type MockPowersheetGridProps = {
  title: string;
  description?: string;
  rows?: MockRow[];
  selectionMode?: string;
  onSelectedRowChange?: (row: MockRow | null) => void;
  onRowClicked?: (event: { data: MockRow | undefined }) => void;
};

vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: (props: MockPowersheetGridProps) => {
    powersheetGridCalls.push({
      title: props.title,
      selectionMode: props.selectionMode,
    });
    const firstRow = props.rows?.[0];
    return (
      <div>
        <h2>{props.title}</h2>
        {props.description ? <p>{props.description}</p> : null}
        {firstRow && props.onRowClicked ? (
          <button
            type="button"
            onClick={() =>
              props.onRowClicked?.({ data: firstRow as MockRow | undefined })
            }
          >
            Click first purchase order row ({props.title})
          </button>
        ) : null}
        {firstRow && props.onSelectedRowChange ? (
          <button
            type="button"
            onClick={() => props.onSelectedRowChange?.(firstRow)}
          >
            Select first purchase order ({props.title})
          </button>
        ) : null}
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

vi.mock("@/lib/workspaceRoutes", () => ({
  buildOperationsWorkspacePath: (tab: string) => `/operations?tab=${tab}`,
}));

describe("PurchaseOrdersPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    powersheetGridCalls.length = 0;
  });

  it("renders without crashing", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Purchase Orders Queue")).toBeInTheDocument();
  });

  it("renders the PO queue grid and line items grid", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Purchase Orders Queue")).toBeInTheDocument();
    expect(screen.getByText("Line Items")).toBeInTheDocument();
  });

  it("renders the search input with correct placeholder", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Search PO number or supplier")
    ).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /refresh purchase orders/i })
    ).toBeInTheDocument();
  });

  it("renders the export button", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /export visible pos to csv/i })
    ).toBeInTheDocument();
  });

  it("does not render internal rollout framing badges (BUG-021)", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);
    // The internal "Sheet-native Pilot" badge was removed to avoid surfacing
    // internal framing language to end users.
    expect(
      screen.queryByText("Sheet-native Pilot · PO Queue + Detail")
    ).not.toBeInTheDocument();
  });

  it("renders the keyboard hint bar", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
  });

  it("renders the Start Receiving button (BUG-025: renamed from Launch Receiving)", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /launch receiving for selected po/i })
    ).toBeInTheDocument();
  });

  // TER-889: Row click must wire through to the selection state so the
  // "Start Receiving" action can enable. The pilot queue historically used
  // cell-range mode, which left the action permanently disabled because
  // a plain row click never fired selection.
  it("uses single-row selection for the PO queue so row clicks emit selection (TER-889)", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);

    const queueCall = powersheetGridCalls.find(
      call => call.title === "Purchase Orders Queue"
    );
    expect(queueCall).toBeDefined();
    expect(queueCall).toMatchObject({ selectionMode: "single-row" });
  });

  it("wires the PO queue row click to setSelectedPoId (TER-889)", () => {
    render(<PurchaseOrdersPilotSurface onOpenClassic={vi.fn()} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /click first purchase order row \(purchase orders queue\)/i,
      })
    );

    expect(mockSetSelectedPoId).toHaveBeenCalledWith(1);
  });
});
