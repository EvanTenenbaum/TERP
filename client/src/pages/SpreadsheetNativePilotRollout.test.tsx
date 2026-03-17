/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

vi.mock("@/components/spreadsheet-native/InventorySheetPilotSurface", () => ({
  default: () => <div>Inventory Sheet Pilot</div>,
}));

vi.mock("@/components/spreadsheet-native/OrdersSheetPilotSurface", () => ({
  default: () => <div>Orders Sheet Pilot</div>,
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
      screen.queryByRole("button", { name: "Sheet-Native Pilot" })
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

  it("renders the orders sheet-native pilot when the master flag is on and requested", () => {
    mockPath = "/sales";
    mockSearch = "?tab=orders&surface=sheet-native";
    mockActiveTab = "orders";
    mockPilotFlagEnabled = true;

    render(<SalesWorkspacePage />);

    expect(screen.getByText("Orders Sheet Pilot")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sheet-Native Pilot" })
    ).not.toBeInTheDocument();
  });
});
