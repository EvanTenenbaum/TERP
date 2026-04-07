/**
 * @vitest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SalesWorkspacePage from "./SalesWorkspacePage";

const mockUseWorkspaceHomeTelemetry = vi.hoisted(() => vi.fn());
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
let mockAvailabilityReady = true;
let mockSurfaceMode: "classic" | "sheet-native" = "classic";
let mockOpenClassicOrderId: number | null = null;

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
  useWorkspaceHomeTelemetry: mockUseWorkspaceHomeTelemetry,
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  buildSurfaceAvailability: vi.fn(),
  useSpreadsheetPilotAvailability: () => ({
    sheetPilotEnabled: mockPilotEnabled,
    availabilityReady: mockAvailabilityReady,
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
  default: function MockOrdersSheetPilotSurface({
    onOpenClassic,
  }: {
    onOpenClassic?: (orderId?: number | null) => void;
  }) {
    React.useEffect(() => {
      if (mockOpenClassicOrderId !== null) {
        onOpenClassic?.(mockOpenClassicOrderId);
      }
    }, [onOpenClassic]);

    return <div>orders pilot surface</div>;
  },
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
    mockAvailabilityReady = true;
    mockSurfaceMode = "classic";
    mockOpenClassicOrderId = null;
    mockSetLocation.mockReset();
    mockSetActiveTab.mockReset();
    mockUseWorkspaceHomeTelemetry.mockReset();
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
    expect(
      await screen.findByTestId("sales-order-surface")
    ).toBeInTheDocument();
    expect(screen.queryByText("quotes work surface")).not.toBeInTheDocument();
  });

  it("canonicalizes malformed sales-sheet document deep links into the orders document route", () => {
    mockActiveTab = "sales-sheets";
    mockSearch = "?tab=sales-sheets&surface=sheet-native&ordersView=document";

    render(<SalesWorkspacePage />);

    expect(
      screen.getByText(
        "redirect:/sales?tab=orders&surface=sheet-native&ordersView=document"
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("sale-catalogue-surface")
    ).not.toBeInTheDocument();
  });

  it("keeps valid sales-sheet routes on the catalogue surface", async () => {
    mockActiveTab = "sales-sheets";
    mockSearch = "?tab=sales-sheets";

    render(<SalesWorkspacePage />);

    expect(
      await screen.findByTestId("sale-catalogue-surface")
    ).toBeInTheDocument();
    expect(screen.queryByText(/^redirect:/)).not.toBeInTheDocument();
  });

  it("redirects forced document links into the classic flow when the pilot flag is disabled", () => {
    mockActiveTab = "orders";
    mockPilotEnabled = false;
    mockSurfaceMode = "classic";
    mockSearch =
      "?tab=orders&ordersView=document&draftId=1&fromSalesSheet=true";

    render(<SalesWorkspacePage />);

    expect(
      screen.getByText(
        "redirect:/sales?tab=create-order&draftId=1&fromSalesSheet=true"
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("orders pilot surface")).not.toBeInTheDocument();
  });

  it("strips document-trigger params from classic order fallbacks to avoid redirect loops", () => {
    mockActiveTab = "orders";
    mockPilotEnabled = false;
    mockAvailabilityReady = true;
    mockSurfaceMode = "classic";
    mockSearch =
      "?tab=orders&orderId=42&clientId=7&needId=13&fromSalesSheet=true";

    render(<SalesWorkspacePage />);

    expect(
      screen.getByText("redirect:/sales?tab=orders&clientId=7&orderId=42")
    ).toBeInTheDocument();
  });

  it("holds forced document links on a loading state until pilot availability resolves", () => {
    mockActiveTab = "orders";
    mockPilotEnabled = false;
    mockAvailabilityReady = false;
    mockSurfaceMode = "classic";
    mockSearch =
      "?tab=orders&ordersView=document&draftId=1&fromSalesSheet=true";

    render(<SalesWorkspacePage />);

    expect(screen.getByText("Loading orders document...")).toBeInTheDocument();
    expect(screen.queryByText(/^redirect:/)).not.toBeInTheDocument();
  });

  it("preserves classic order context when leaving the pilot document view", async () => {
    mockActiveTab = "orders";
    mockPilotEnabled = true;
    mockSurfaceMode = "sheet-native";
    mockOpenClassicOrderId = 42;
    mockSearch =
      "?tab=orders&ordersView=document&draftId=1&clientId=7&needId=13&mode=quote&fromSalesSheet=true";

    render(<SalesWorkspacePage />);

    expect(await screen.findByText("orders pilot surface")).toBeInTheDocument();
    expect(mockSetLocation).toHaveBeenCalledWith(
      "/sales?tab=orders&clientId=7&needId=13&fromSalesSheet=true&orderId=42"
    );
  });

  it("uses redirect-specific telemetry labels instead of misreporting tab views", () => {
    mockActiveTab = "sales-sheets";
    mockSearch = "?tab=sales-sheets&ordersView=document&draftId=1";

    render(<SalesWorkspacePage />);

    expect(mockUseWorkspaceHomeTelemetry).toHaveBeenCalledWith(
      "sales",
      "sales-sheets-document-redirect"
    );
  });

  it("filters pick-pack redirect params down to shipping-safe context", () => {
    mockActiveTab = "pick-pack";
    mockSearch =
      "?tab=pick-pack&orderId=123&draftId=456&quoteId=789&fromSalesSheet=true";

    render(<SalesWorkspacePage />);

    expect(
      screen.getByText("redirect:/inventory?tab=shipping&orderId=123")
    ).toBeInTheDocument();
    expect(mockUseWorkspaceHomeTelemetry).toHaveBeenCalledWith(
      "sales",
      "pick-pack-redirect"
    );
  });
});
