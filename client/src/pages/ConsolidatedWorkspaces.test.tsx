/**
 * Consolidated workspace page tests
 *
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import DemandSupplyWorkspacePage from "./DemandSupplyWorkspacePage";
import RelationshipsWorkspacePage from "./RelationshipsWorkspacePage";
import InventoryWorkspacePage from "./InventoryWorkspacePage";
import SalesWorkspacePage from "./SalesWorkspacePage";
import CreditsWorkspacePage from "./CreditsWorkspacePage";
import ProcurementWorkspacePage from "./ProcurementWorkspacePage";

let mockActiveTab = "matchmaking";
let mockSearch = "";
let mockPilotMode: "classic" | "sheet-native" = "classic";
const mockSetActiveTab = vi.fn();
const mockSetLocation = vi.fn();
const mockCreditsSummary = {
  totalCreditsRemaining: 1250,
  totalCreditsUsed: 800,
  creditCount: 3,
  expiringWithin30Days: {
    count: 1,
    totalAmount: 250,
  },
};

vi.mock("@/hooks/useQueryTabState", () => ({
  useQueryTabState: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
}));

vi.mock("wouter", () => ({
  Redirect: ({ to }: { to: string }) => <div>Redirect {to}</div>,
  useLocation: () => ["/inventory", mockSetLocation],
  useSearch: () => mockSearch,
}));

vi.mock("@/lib/spreadsheet-native", () => ({
  useSpreadsheetPilotAvailability: () => ({
    sheetPilotEnabled: mockPilotMode === "sheet-native",
    availabilityReady: true,
  }),
  useSpreadsheetSurfaceMode: () => ({
    surfaceMode: mockPilotMode,
    setSurfaceMode: vi.fn(),
  }),
  buildSurfaceAvailability: (
    moduleId: string,
    enabled: boolean,
    ready?: boolean
  ) => ({
    enabled,
    ready,
    defaultSheetNative: false,
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    credits: {
      getSummary: {
        useQuery: () => ({
          data: mockCreditsSummary,
          isLoading: false,
        }),
      },
    },
  },
}));

vi.mock("@/pages/NeedsManagementPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Needs Management {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));
vi.mock("@/pages/InterestListPage", () => ({
  default: () => <div>Interest List</div>,
}));
vi.mock("@/pages/MatchmakingServicePage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Matchmaking {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));
vi.mock("@/pages/VendorSupplyPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Vendor Supply {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));
vi.mock("@/components/work-surface/ClientsWorkSurface", () => ({
  default: () => <div>Clients Surface</div>,
}));
vi.mock("@/components/work-surface/VendorsWorkSurface", () => ({
  default: () => <div>Suppliers Surface</div>,
}));
vi.mock("@/components/work-surface/InventoryWorkSurface", () => ({
  default: () => <div>Inventory Surface</div>,
}));
vi.mock("@/components/work-surface/PickPackWorkSurface", () => ({
  default: () => <div>Pick Pack Surface</div>,
}));
vi.mock("@/components/work-surface/PurchaseOrdersWorkSurface", () => ({
  default: () => <div>Purchase Orders Surface</div>,
}));
vi.mock("@/components/work-surface/OrdersWorkSurface", () => ({
  default: () => <div>Orders Surface</div>,
}));
vi.mock("@/components/work-surface/QuotesWorkSurface", () => ({
  default: () => <div>Quotes Surface</div>,
}));
vi.mock("@/components/uiux-slice/ProductIntakeSlicePage", () => ({
  default: () => <div>Receiving Slice Surface</div>,
}));
vi.mock("@/components/uiux-slice/PurchaseOrdersSlicePage", () => ({
  default: () => <div>Purchase Orders Slice Surface</div>,
}));
vi.mock("@/components/spreadsheet-native/PurchaseOrderSurface", () => ({
  PurchaseOrderSurface: () => <div>Purchase Order Surface</div>,
}));
vi.mock("@/components/spreadsheet-native/InventorySheetPilotSurface", () => ({
  default: () => <div>Inventory Sheet Pilot Surface</div>,
}));
vi.mock("@/components/spreadsheet-native/InventoryManagementSurface", () => ({
  InventoryManagementSurface: () => <div>Inventory Management Surface</div>,
}));
vi.mock("@/components/spreadsheet-native/OrdersSheetPilotSurface", () => ({
  default: () => <div>Orders Sheet Pilot Surface</div>,
}));
vi.mock("@/pages/ReturnsPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Returns {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));
vi.mock("@/components/spreadsheet-native/SalesCatalogueSurface", () => ({
  default: () => (
    <div data-testid="sale-catalogue-surface">SalesCatalogueSurface</div>
  ),
}));
vi.mock("@/pages/LiveShoppingPage", () => ({
  default: () => <div>Live Shopping Surface</div>,
}));
vi.mock("@/pages/CreditsPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Credits {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));
vi.mock("@/pages/CreditSettingsPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Credit Settings {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));
vi.mock("@/pages/PhotographyPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Photography {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));
vi.mock("@/pages/SampleManagement", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Samples {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));

describe("Consolidated workspace pages", () => {
  beforeEach(() => {
    mockActiveTab = "matchmaking";
    mockSearch = "";
    mockPilotMode = "classic";
    mockSetActiveTab.mockClear();
    mockSetLocation.mockClear();
  });

  it("renders Demand & Supply workspace with embedded content", () => {
    mockActiveTab = "matchmaking";
    render(<DemandSupplyWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Demand & Supply" })
    ).toBeInTheDocument();
    expect(screen.getByText("Matchmaking Embedded")).toBeInTheDocument();
  });

  it("renders Relationships workspace", () => {
    mockActiveTab = "clients";
    render(<RelationshipsWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Relationships" })
    ).toBeInTheDocument();
    expect(screen.getByText("Clients Surface")).toBeInTheDocument();
  });

  it("renders Inventory workspace with inventory default content", () => {
    mockActiveTab = "inventory";
    render(<InventoryWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Inventory" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Inventory Management Surface")
    ).toBeInTheDocument();
  });

  it("renders Inventory workspace always shows unified surface regardless of pilot mode", async () => {
    mockActiveTab = "inventory";
    mockPilotMode = "sheet-native";
    render(<InventoryWorkspacePage />);
    expect(
      screen.getByText("Inventory Management Surface")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Inventory Sheet Pilot Surface")
    ).not.toBeInTheDocument();
  });

  it("renders Inventory workspace with receiving queue content", () => {
    mockActiveTab = "receiving";
    render(<InventoryWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Inventory" })
    ).toBeInTheDocument();
    expect(screen.getByText("Purchase Order Surface")).toBeInTheDocument();
  });

  it("renders Inventory workspace receiving editor when a draft is selected", async () => {
    mockActiveTab = "receiving";
    mockSearch = "?tab=receiving&draftId=draft-123";
    render(<InventoryWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Inventory" })
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Receiving Slice Surface")
    ).toBeInTheDocument();
  });

  it("renders Inventory workspace photography tab with embedded content", async () => {
    mockActiveTab = "photography";
    render(<InventoryWorkspacePage />);
    expect(await screen.findByText("Photography Embedded")).toBeInTheDocument();
  });

  it("renders Inventory workspace samples tab with embedded content", async () => {
    mockActiveTab = "samples";
    render(<InventoryWorkspacePage />);
    expect(await screen.findByText("Samples Embedded")).toBeInTheDocument();
  });

  it("renders Sales workspace with quotes tab content", () => {
    mockActiveTab = "quotes";
    render(<SalesWorkspacePage />);
    expect(screen.getByRole("heading", { name: "Sales" })).toBeInTheDocument();
    expect(screen.getByText("Quotes Surface")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "New Order" })).toBeInTheDocument();
  });

  it("renders Sales workspace with sheet-native pilot when enabled", async () => {
    mockActiveTab = "orders";
    mockPilotMode = "sheet-native";
    render(<SalesWorkspacePage />);
    await waitFor(() => {
      expect(
        screen.getByText("Orders Sheet Pilot Surface")
      ).toBeInTheDocument();
    });
  });

  it("renders Sales workspace with sales catalogues tab content", async () => {
    mockActiveTab = "sales-sheets";
    render(<SalesWorkspacePage />);
    expect(screen.getByRole("heading", { name: "Sales" })).toBeInTheDocument();
    expect(
      await screen.findByTestId("sale-catalogue-surface")
    ).toBeInTheDocument();
  });

  it("renders Sales workspace with live shopping tab content", async () => {
    mockActiveTab = "live-shopping";
    render(<SalesWorkspacePage />);
    expect(screen.getByRole("heading", { name: "Sales" })).toBeInTheDocument();
    expect(await screen.findByText("Live Shopping Surface")).toBeInTheDocument();
  });

  it("redirects pick-pack to the shipping workspace while preserving search params", () => {
    mockActiveTab = "pick-pack";
    mockSearch = "?tab=pick-pack&orderId=42";
    render(<SalesWorkspacePage />);
    expect(
      screen.getByText(/Redirect \/inventory\?tab=shipping&orderId=42/)
    ).toBeInTheDocument();
  });

  it("renders Client Credit workspace with dashboard-first content", () => {
    mockActiveTab = "dashboard";
    render(<CreditsWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Client Credit" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Client Credit Dashboard" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review Issued Adjustments" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Open Capacity Settings" }).length
    ).toBeGreaterThan(0);
  });

  it("renders Client Credit workspace with settings content", () => {
    mockActiveTab = "capacity";
    render(<CreditsWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Client Credit" })
    ).toBeInTheDocument();
    expect(screen.getByText("Credit Settings Embedded")).toBeInTheDocument();
  });

  it("renders buying workspace", () => {
    mockActiveTab = "purchase-orders";
    render(<ProcurementWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Buying" })
    ).toBeInTheDocument();
    expect(screen.getByText("Purchase Order Surface")).toBeInTheDocument();
  });
});
