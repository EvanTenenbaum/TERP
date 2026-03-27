/**
 * AppSidebar navigation grouping tests
 *
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";

let mockLocation = "/";
const mockSetLocation = vi.fn();
const mockTogglePin = vi.fn();
let mockSpreadsheetEnabled = true;

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation.split("?")[0], mockSetLocation],
  useSearch: () => {
    const [, search = ""] = mockLocation.split("?");
    return search ? `?${search}` : "";
  },
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => ({
    enabled: true,
    isLoading: false,
    error: null,
  }),
  useFeatureFlags: () => ({
    flags: { "spreadsheet-view": mockSpreadsheetEnabled },
    isLoading: false,
    error: null,
    isEnabled: (key: string) =>
      key === "spreadsheet-view" && mockSpreadsheetEnabled,
    isModuleEnabled: () => true,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      me: {
        useQuery: () => ({
          data: { id: 42, email: "qa@terp.test", name: "QA User" },
        }),
      },
    },
  },
}));

vi.mock("@/hooks/useNavigationState", () => ({
  useNavigationState: () => ({
    isGroupCollapsed: () => false,
    toggleGroup: vi.fn(),
    expandAll: vi.fn(),
    collapseAll: vi.fn(),
    isPinned: (path: string) =>
      [
        "/",
        "/sales?tab=create-order",
        "/inventory?tab=receiving",
        "/clients",
      ].includes(path),
    togglePin: mockTogglePin,
    setPinnedPaths: vi.fn(),
    pinnedPaths: [
      "/",
      "/sales?tab=create-order",
      "/inventory?tab=receiving",
      "/clients",
    ],
  }),
}));

beforeEach(() => {
  mockLocation = "/";
  mockSpreadsheetEnabled = true;
  mockSetLocation.mockClear();
  mockTogglePin.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppSidebar navigation", () => {
  it("renders grouped navigation labels in order", () => {
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    const groupLabels = screen.getAllByTestId("nav-group-label");
    const labelTexts = groupLabels.map(label => label.textContent?.trim());

    expect(labelTexts).toEqual([
      "Sell",
      "Buy",
      "Operations",
      "Relationships",
      "Finance",
      "Admin",
    ]);
  });

  it("renders sidebar-visible navigation items only", () => {
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    // The Sell group is open by default when on "/", so its sidebar-visible items appear
    expect(screen.getByText("Sales")).toBeInTheDocument();
    expect(screen.getByText("Relationships")).toBeInTheDocument();
    expect(screen.getByText("Demand & Supply")).toBeInTheDocument();

    // Items with sidebarVisible: false should NOT appear anywhere
    expect(screen.queryByText("Shipping")).not.toBeInTheDocument();
    expect(screen.queryByText("Receiving")).not.toBeInTheDocument();
    expect(screen.queryByText("Leaderboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Sales Catalogues")).not.toBeInTheDocument();
  });

  it("highlights active navigation item", () => {
    mockLocation = "/sales";
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    const salesLink = screen.getByRole("link", {
      name: /Manage orders, quotes, returns/i,
    });
    expect(salesLink).toHaveAttribute("aria-current", "page");
  });

  it("highlights Purchase Orders when navigating to its sub-paths", () => {
    mockLocation = "/purchase-orders";
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    const purchaseOrdersLink = screen.getByRole("link", {
      name: /Purchase order queue/i,
    });
    expect(purchaseOrdersLink).toHaveAttribute("aria-current", "page");
  });

  it("highlights Operations for legacy receiving, intake, and shipping aliases", () => {
    mockLocation = "/pick-pack";
    const { rerender } = render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    const operationsLink = screen.getByRole("link", {
      name: /Manage inventory, receiving, shipping/i,
    });
    expect(operationsLink).toHaveAttribute("aria-current", "page");

    mockLocation = "/receiving";
    rerender(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    expect(
      screen.getByRole("link", {
        name: /Manage inventory, receiving, shipping/i,
      })
    ).toHaveAttribute("aria-current", "page");

    mockLocation = "/intake";
    rerender(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    expect(
      screen.getByRole("link", {
        name: /Manage inventory, receiving, shipping/i,
      })
    ).toHaveAttribute("aria-current", "page");

    mockLocation = "/direct-intake";
    rerender(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    expect(
      screen.getByRole("link", {
        name: /Manage inventory, receiving, shipping/i,
      })
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows user actions", () => {
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });

  it("does not show feature-flagged items with sidebarVisible false in the sidebar", () => {
    mockSpreadsheetEnabled = false;
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    // Spreadsheet View has sidebarVisible: false, so it should never appear in the sidebar
    expect(screen.queryByText("Spreadsheet View")).not.toBeInTheDocument();
  });

  it("closes the mobile drawer when only the query string changes", async () => {
    mockLocation = "/sales?tab=create-order";
    const onClose = vi.fn();
    const { rerender } = render(
      <ThemeProvider>
        <Sidebar open onClose={() => onClose("initial")} />
      </ThemeProvider>
    );

    onClose.mockClear();
    mockLocation = "/sales?tab=quotes";
    rerender(
      <ThemeProvider>
        <Sidebar open onClose={() => onClose("search-change")} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
