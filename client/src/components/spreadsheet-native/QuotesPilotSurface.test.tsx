import React from "react";
/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuotesPilotSurface } from "./QuotesPilotSurface";

const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => ["/sales?tab=quotes", mockSetLocation],
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
    orders: {
      getAll: {
        useQuery: () => ({
          data: {
            items: [
              {
                id: 1,
                orderNumber: "QUO-001",
                clientId: 10,
                orderType: "QUOTE",
                quoteStatus: "UNSENT",
                orderDate: "2026-03-01T00:00:00.000Z",
                validUntil: "2026-04-01T00:00:00.000Z",
                total: "2500",
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
      convertQuoteToSale: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
      delete: {
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
            items: [{ id: 10, name: "Summit Dispensary" }],
          },
          isLoading: false,
        }),
      },
    },
    quotes: {
      isEmailEnabled: {
        useQuery: () => ({
          data: { enabled: true },
          isLoading: false,
        }),
      },
      send: {
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
    extractItems: (data: unknown) => {
      if (data && typeof data === "object" && "items" in data) {
        return (data as { items: unknown[] }).items;
      }
      return Array.isArray(data) ? data : [];
    },
  };
});

vi.mock("@/lib/workspaceRoutes", () => ({
  buildSalesWorkspacePath: (tab: string) => `/sales?tab=${tab}`,
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

describe("QuotesPilotSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<QuotesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Quotes Registry")).toBeInTheDocument();
  });

  it("renders the quotes registry grid title", () => {
    render(<QuotesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Quotes Registry")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    render(<QuotesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("textbox", { name: /search quotes/i })
    ).toBeInTheDocument();
  });

  it("renders the New Quote button", () => {
    render(<QuotesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /new quote/i })
    ).toBeInTheDocument();
  });

  it("renders the refresh button", () => {
    render(<QuotesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /refresh quotes/i })
    ).toBeInTheDocument();
  });

  it("renders the status filter dropdown", () => {
    render(<QuotesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("combobox", { name: /filter by status/i })
    ).toBeInTheDocument();
  });

  it("renders the Quotes Registry badge", () => {
    render(<QuotesPilotSurface onOpenClassic={vi.fn()} />);
    expect(screen.getByText("Quotes \u00b7 Registry")).toBeInTheDocument();
  });

  it("renders the keyboard hint bar", () => {
    render(<QuotesPilotSurface onOpenClassic={vi.fn()} />);
    expect(
      screen.getByRole("group", { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
  });
});
