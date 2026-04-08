/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import InventoryWorkspacePage from "./InventoryWorkspacePage";
import SalesWorkspacePage from "./SalesWorkspacePage";

let mockPath = "/operations";
let mockSearch = "";
let mockActiveTab = "inventory";
let mockPilotFlagEnabled = false;
let mockPilotFlagLoading = false;
const mockSetLocation = vi.fn();
const mockSetActiveTab = vi.fn();
const mockRefetchFlags = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => [mockPath, mockSetLocation],
  useSearch: () => mockSearch,
  Redirect: ({ to }: { to: string }) => {
    mockSetLocation(to);
    return <div>Redirect {to}</div>;
  },
}));

vi.mock("@/hooks/useQueryTabState", () => ({
  useQueryTabState: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => ({
    enabled: mockPilotFlagEnabled,
    isLoading: mockPilotFlagLoading,
    error: null,
  }),
  useFeatureFlags: () => ({
    flags: mockPilotFlagEnabled ? { "spreadsheet-native-pilot": true } : {},
    isLoading: mockPilotFlagLoading,
    error: null,
    refetch: mockRefetchFlags,
  }),
}));

vi.mock("@/components/work-surface/InventoryWorkSurface", () => ({
  default: () => <div>Inventory Surface</div>,
}));

vi.mock("@/components/work-surface/PickPackWorkSurface", () => ({
  default: () => <div>Pick Pack Surface</div>,
}));

vi.mock("@/components/work-surface/OrdersWorkSurface", () => ({
  default: () => <div>Orders Surface</div>,
}));

vi.mock("@/components/work-surface/QuotesWorkSurface", () => ({
  default: () => <div>Quotes Surface</div>,
}));

vi.mock("@/components/spreadsheet-native/QuotesPilotSurface", () => ({
  default: () => <div>Quotes Sheet Pilot</div>,
}));

vi.mock("@/components/spreadsheet-native/ReturnsPilotSurface", () => ({
  default: () => <div>Returns Sheet Pilot</div>,
}));

vi.mock("@/components/spreadsheet-native/InventorySheetPilotSurface", () => ({
  default: () => <div>Inventory Sheet Pilot</div>,
}));
vi.mock("@/components/spreadsheet-native/InventoryManagementSurface", () => ({
  InventoryManagementSurface: () => <div>Inventory Management Surface</div>,
}));

vi.mock("@/components/spreadsheet-native/OrdersSheetPilotSurface", () => ({
  default: ({ forceDocumentMode }: { forceDocumentMode?: boolean }) => (
    <div>
      Orders Sheet Pilot
      {forceDocumentMode ? " Document" : ""}
    </div>
  ),
}));

vi.mock("@/components/spreadsheet-native/SalesOrderSurface", () => ({
  default: () => <div>SalesOrderSurface</div>,
}));

vi.mock("@/pages/ReturnsPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Returns {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));

describe("spreadsheet-native pilot rollout gating", () => {
  beforeEach(() => {
    mockPath = "/operations";
    mockSearch = "";
    mockActiveTab = "inventory";
    mockPilotFlagEnabled = false;
    mockPilotFlagLoading = false;
    mockSetLocation.mockClear();
    mockSetActiveTab.mockClear();
    mockRefetchFlags.mockClear();
  });

  it("renders unified InventoryManagementSurface and exposes no pilot toggle for inventory", () => {
    render(<InventoryWorkspacePage />);

    expect(
      screen.getByText("Inventory Management Surface")
    ).toBeInTheDocument();
    expect(screen.queryByText("Inventory Sheet Pilot")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Spreadsheet View" })
    ).not.toBeInTheDocument();
  });

  it("renders unified surface even when surface=sheet-native is in the URL", () => {
    mockSearch = "?tab=inventory&surface=sheet-native";

    render(<InventoryWorkspacePage />);

    expect(
      screen.getByText("Inventory Management Surface")
    ).toBeInTheDocument();
    expect(screen.queryByText("Inventory Sheet Pilot")).not.toBeInTheDocument();
  });

  it("renders unified surface while pilot flag is loading", () => {
    mockSearch = "?tab=inventory&surface=sheet-native";
    mockPilotFlagLoading = true;

    render(<InventoryWorkspacePage />);

    expect(
      screen.getByText("Inventory Management Surface")
    ).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("renders the orders sheet-native pilot when the master flag is on and requested", async () => {
    mockPath = "/sales";
    mockSearch = "?tab=orders&surface=sheet-native";
    mockActiveTab = "orders";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Orders Sheet Pilot")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("group", { name: "Surface mode" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Spreadsheet View" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Standard View" })
    ).toBeInTheDocument();
  });

  it("renders the unified create-order surface even when the pilot is enabled", async () => {
    mockPath = "/sales";
    mockSearch = "?tab=create-order&draftId=91";
    mockActiveTab = "create-order";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    expect(await screen.findByText("SalesOrderSurface")).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("renders the unified create-order surface when sheet-native is explicitly requested", async () => {
    mockPath = "/sales";
    mockSearch =
      "?tab=create-order&surface=sheet-native&quoteId=91&mode=duplicate&fromSalesSheet=true";
    mockActiveTab = "create-order";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("SalesOrderSurface")).toBeInTheDocument();
    });
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("renders the quotes sheet-native pilot when the master flag is on and requested", async () => {
    mockPath = "/sales";
    mockSearch = "?tab=quotes&surface=sheet-native";
    mockActiveTab = "quotes";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Quotes Sheet Pilot")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Spreadsheet View" })
    ).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("renders the returns sheet-native pilot when the master flag is on and requested", async () => {
    mockPath = "/sales";
    mockSearch = "?tab=returns&surface=sheet-native";
    mockActiveTab = "returns";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    await waitFor(() => {
      expect(screen.getByText("Returns Sheet Pilot")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Spreadsheet View" })
    ).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("keeps create-order unified even when classic=true is requested", async () => {
    mockPath = "/sales";
    mockSearch = "?tab=create-order&classic=true&draftId=91";
    mockActiveTab = "create-order";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    expect(await screen.findByText("SalesOrderSurface")).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });
});
