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

vi.mock("@/components/spreadsheet-native/OrdersSheetPilotSurface", () => ({
  default: ({ forceDocumentMode }: { forceDocumentMode?: boolean }) => (
    <div>
      Orders Sheet Pilot
      {forceDocumentMode ? " Document" : ""}
    </div>
  ),
}));

vi.mock("@/pages/ReturnsPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Returns {embedded ? "Embedded" : "Standalone"}</div>
  ),
}));

vi.mock("@/pages/OrderCreatorPage", () => ({
  default: () => <div>Order Creator</div>,
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

  it("keeps inventory classic and does not expose a visible pilot toggle", () => {
    render(<InventoryWorkspacePage />);

    expect(screen.getByText("Inventory Surface")).toBeInTheDocument();
    expect(screen.queryByText("Inventory Sheet Pilot")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Spreadsheet View" })
    ).not.toBeInTheDocument();
  });

  it("strips a stale inventory sheet-native URL when the pilot is disabled", () => {
    mockSearch = "?tab=inventory&surface=sheet-native";

    render(<InventoryWorkspacePage />);

    expect(screen.getByText("Inventory Surface")).toBeInTheDocument();
    expect(mockSetLocation).toHaveBeenCalledWith("/operations?tab=inventory", {
      replace: true,
    });
  });

  it("does not rewrite the URL while pilot availability is still loading", () => {
    mockSearch = "?tab=inventory&surface=sheet-native";
    mockPilotFlagLoading = true;

    render(<InventoryWorkspacePage />);

    expect(screen.getByText("Inventory Surface")).toBeInTheDocument();
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
      screen.getByRole("button", { name: "Spreadsheet View" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Classic Surface" })
    ).toBeInTheDocument();
  });

  it("keeps create-order classic by default even when the pilot is enabled", () => {
    mockPath = "/sales";
    mockSearch = "?tab=create-order&draftId=91";
    mockActiveTab = "create-order";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    expect(screen.getByText("Order Creator")).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it("renders the sheet-native document surface on create-order when sheet-native is explicitly requested", async () => {
    mockPath = "/sales";
    mockSearch =
      "?tab=create-order&surface=sheet-native&quoteId=91&mode=duplicate&fromSalesSheet=true";
    mockActiveTab = "create-order";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Orders Sheet Pilot Document")
      ).toBeInTheDocument();
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

  it("preserves the classic create-order route when classic=true is requested", () => {
    mockPath = "/sales";
    mockSearch = "?tab=create-order&classic=true&draftId=91";
    mockActiveTab = "create-order";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    expect(screen.getByText("Order Creator")).toBeInTheDocument();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });
});
