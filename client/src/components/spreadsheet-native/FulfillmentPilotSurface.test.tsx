import React from "react";
/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FulfillmentPilotSurface } from "./FulfillmentPilotSurface";

vi.mock("wouter", () => ({
  useLocation: () => ["/operations?tab=fulfillment", vi.fn()],
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/work-surface/useExport", () => ({
  useExport: () => ({
    exportCSV: vi.fn(),
    state: { isExporting: false, progress: 0 },
  }),
}));

vi.mock("@/hooks/work-surface", () => ({
  useExport: () => ({
    exportCSV: vi.fn(),
    state: { isExporting: false, progress: 0 },
  }),
  usePowersheetSelection: () => ({
    selectedIds: new Set<number>(),
    toggle: vi.fn(),
    toggleAll: vi.fn(),
    clear: vi.fn(),
    reset: vi.fn(),
    selectRange: vi.fn(),
    isSelected: () => false,
    getSelectedArray: () => [],
    restoreFocus: vi.fn(),
    lastFocusRef: { current: null },
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    pickPack: {
      getPickList: {
        useQuery: () => ({
          data: [
            {
              orderId: 1,
              orderNumber: "ORD-001",
              clientName: "Green Valley Co",
              fulfillmentStatus: "PENDING",
              itemCount: 3,
              packedCount: 0,
              bagCount: 0,
              progressPct: 0,
              createdAt: new Date("2026-03-01T00:00:00.000Z"),
            },
          ],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      getStats: {
        useQuery: () => ({
          data: {
            pending: 2,
            partial: 1,
            ready: 0,
            shipped: 5,
          },
          refetch: vi.fn(),
        }),
      },
      getOrderDetails: {
        useQuery: () => ({
          data: null,
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        }),
      },
      packItems: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      markAllPacked: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      unpackItems: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      markOrderReady: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
    orders: {
      shipOrder: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
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

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("@/components/work-surface/InspectorPanel", () => ({
  InspectorPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
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

vi.mock("@/lib/statusTokens", () => ({
  PICK_PACK_STATUS_TOKENS: {},
  STATUS_NEUTRAL: {},
}));

describe("FulfillmentPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<FulfillmentPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByTestId("fulfillment-pilot-surface")).toBeInTheDocument();
  });

  it("renders the fulfillment queue grid title", () => {
    render(<FulfillmentPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Fulfillment Queue")).toBeInTheDocument();
  });

  it("renders status summary cards", () => {
    render(<FulfillmentPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Shipped")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    render(<FulfillmentPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByTestId("fulfillment-search-input")).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<FulfillmentPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /refresh fulfillment queue/i })
    ).toBeInTheDocument();
  });

  it("renders the Classic View button when onOpenClassic is provided", () => {
    render(<FulfillmentPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /classic view/i })
    ).toBeInTheDocument();
  });

  it("renders the keyboard hint bar", () => {
    render(<FulfillmentPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
  });

  it("renders the status filter dropdown", () => {
    render(<FulfillmentPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByTestId("fulfillment-status-filter")).toBeInTheDocument();
  });
});
