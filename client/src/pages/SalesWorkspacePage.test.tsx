/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SalesWorkspacePage from "./SalesWorkspacePage";

const mockSetLocation = vi.fn();
const mockSetActiveTab = vi.fn();

let mockActiveTab:
  | "orders"
  | "quotes"
  | "returns"
  | "sales-sheets"
  | "live-shopping"
  | "create-order"
  | "pick-pack" = "quotes";
let mockSearch = "?tab=quotes";
let mockPilotEnabled = false;
let mockSurfaceMode: "classic" | "sheet-native" = "classic";

vi.mock("wouter", () => ({
  Redirect: ({ to }: { to: string }) => <div>redirect:{to}</div>,
  useLocation: () => ["/sales", mockSetLocation],
  useSearch: () => mockSearch,
}));

vi.mock("@/hooks/useQueryTabState", () => ({
  useQueryTabState: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
}));

vi.mock("@/hooks/useWorkspaceHomeTelemetry", () => ({
  useWorkspaceHomeTelemetry: vi.fn(),
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  buildSurfaceAvailability: vi.fn(),
  useSpreadsheetPilotAvailability: () => ({
    sheetPilotEnabled: mockPilotEnabled,
    availabilityReady: true,
  }),
  useSpreadsheetSurfaceMode: () => ({
    surfaceMode: mockSurfaceMode,
    setSurfaceMode: vi.fn(),
  }),
}));

vi.mock("@/components/layout/LinearWorkspaceShell", () => ({
  LinearWorkspaceShell: ({
    tabs,
    children,
  }: {
    tabs: Array<{ value: string; label: string }>;
    children: React.ReactNode;
  }) => (
    <div>
      <nav>
        {tabs.map(tab => (
          <span key={tab.value}>{tab.label}</span>
        ))}
      </nav>
      {children}
    </div>
  ),
  LinearWorkspacePanel: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => (value === mockActiveTab ? <div>{children}</div> : null),
}));

vi.mock("@/components/work-surface/OrdersWorkSurface", () => ({
  default: () => <div>orders work surface</div>,
}));

vi.mock("@/components/work-surface/QuotesWorkSurface", () => ({
  default: () => <div>quotes work surface</div>,
}));

vi.mock("@/components/spreadsheet-native/QuotesPilotSurface", () => ({
  default: () => <div>quotes pilot surface</div>,
}));

vi.mock("@/components/spreadsheet-native/OrdersSheetPilotSurface", () => ({
  default: () => <div>orders pilot surface</div>,
}));

vi.mock("@/components/spreadsheet-native/SalesCatalogueSurface", () => ({
  default: () => (
    <div data-testid="sale-catalogue-surface">SalesCatalogueSurface</div>
  ),
}));

vi.mock("@/components/spreadsheet-native/SalesOrderSurface", () => ({
  default: () => <div data-testid="sales-order-surface">SalesOrderSurface</div>,
}));

vi.mock("@/components/spreadsheet-native/ReturnsPilotSurface", () => ({
  default: () => <div>returns pilot surface</div>,
}));

vi.mock("@/components/spreadsheet-native/SheetModeToggle", () => ({
  default: () => <div>sheet mode toggle</div>,
}));

vi.mock("@/components/spreadsheet-native/PilotSurfaceBoundary", () => ({
  PilotSurfaceBoundary: ({
    children,
    fallback,
  }: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) => <React.Suspense fallback={fallback}>{children}</React.Suspense>,
}));

vi.mock("@/pages/ReturnsPage", () => ({
  default: () => <div>returns page</div>,
}));

vi.mock("@/pages/LiveShoppingPage", () => ({
  default: () => <div>live shopping page</div>,
}));

describe("SalesWorkspacePage quote entry flow", () => {
  beforeEach(() => {
    mockActiveTab = "quotes";
    mockSearch = "?tab=quotes";
    mockPilotEnabled = false;
    mockSurfaceMode = "classic";
    mockSetLocation.mockReset();
    mockSetActiveTab.mockReset();
  });

  it("keeps the quotes tab registry-only even when sheet-native is enabled", async () => {
    mockActiveTab = "quotes";
    mockSearch = "?tab=quotes";
    mockPilotEnabled = true;
    mockSurfaceMode = "sheet-native";

    render(<SalesWorkspacePage />);

    expect(await screen.findByText("quotes pilot surface")).toBeInTheDocument();
    expect(screen.queryByText("order creator page")).not.toBeInTheDocument();
  });

  it("relabels the create-order tab to New Quote when mode=quote is active", async () => {
    mockActiveTab = "create-order";
    mockSearch = "?tab=create-order&mode=quote";

    render(<SalesWorkspacePage />);

    expect(screen.getByText("New Quote")).toBeInTheDocument();
    expect(await screen.findByTestId("sales-order-surface")).toBeInTheDocument();
    expect(screen.queryByText("quotes work surface")).not.toBeInTheDocument();
  });
});
