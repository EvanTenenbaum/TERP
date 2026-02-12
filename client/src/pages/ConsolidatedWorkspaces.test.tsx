/**
 * Consolidated workspace page tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DemandSupplyWorkspacePage from "./DemandSupplyWorkspacePage";
import RelationshipsWorkspacePage from "./RelationshipsWorkspacePage";
import InventoryWorkspacePage from "./InventoryWorkspacePage";
import SalesWorkspacePage from "./SalesWorkspacePage";
import CreditsWorkspacePage from "./CreditsWorkspacePage";

let mockActiveTab = "matchmaking";
const mockSetActiveTab = vi.fn();

vi.mock("@/hooks/useQueryTabState", () => ({
  useQueryTabState: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
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
vi.mock("@/components/work-surface/ProductsWorkSurface", () => ({
  default: () => <div>Products Surface</div>,
}));
vi.mock("@/components/work-surface/OrdersWorkSurface", () => ({
  default: () => <div>Orders Surface</div>,
}));
vi.mock("@/components/work-surface/QuotesWorkSurface", () => ({
  default: () => <div>Quotes Surface</div>,
}));
vi.mock("@/pages/ReturnsPage", () => ({
  default: ({ embedded }: { embedded?: boolean }) => (
    <div>Returns {embedded ? "Embedded" : "Standalone"}</div>
  ),
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

describe("Consolidated workspace pages", () => {
  beforeEach(() => {
    mockSetActiveTab.mockClear();
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
    expect(screen.getByText("Inventory Surface")).toBeInTheDocument();
  });

  it("renders Sales workspace with quotes tab content", () => {
    mockActiveTab = "quotes";
    render(<SalesWorkspacePage />);
    expect(screen.getByRole("heading", { name: "Sales" })).toBeInTheDocument();
    expect(screen.getByText("Quotes Surface")).toBeInTheDocument();
  });

  it("renders Credits workspace with settings content", () => {
    mockActiveTab = "settings";
    render(<CreditsWorkspacePage />);
    expect(
      screen.getByRole("heading", { name: "Credits" })
    ).toBeInTheDocument();
    expect(screen.getByText("Credit Settings Embedded")).toBeInTheDocument();
  });
});
