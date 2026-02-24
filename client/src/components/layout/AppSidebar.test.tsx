/**
 * AppSidebar navigation grouping tests
 *
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";

let mockLocation = "/";
const mockSetLocation = vi.fn();
const mockTogglePin = vi.fn();
let mockSpreadsheetEnabled = true;

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, mockSetLocation],
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
      ["/", "/orders/create", "/receiving", "/clients"].includes(path),
    togglePin: mockTogglePin,
    setPinnedPaths: vi.fn(),
    pinnedPaths: ["/", "/orders/create", "/receiving", "/clients"],
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

    expect(labelTexts).toEqual(["Sell", "Buy", "Finance", "Admin"]);
  });

  it("shows quick actions with Record Receipt label", () => {
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    expect(screen.getByRole("link", { name: /Dashboard/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /New Sale/i })).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Record a receiving intake/i })
    ).toBeVisible();
    expect(screen.getByText("Record Receipt")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Open client workspace/i })
    ).toBeVisible();
    expect(screen.getByText("Clients")).toBeVisible();
  });

  it("highlights active navigation item", () => {
    mockLocation = "/sales";
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    const salesLink = screen.getByRole("link", {
      name: /Manage orders, quotes, and returns/i,
    });
    expect(salesLink).toHaveAttribute("aria-current", "page");
  });

  it("treats /direct-intake and /receiving as the same active nav destination", () => {
    mockLocation = "/direct-intake";
    const { rerender } = render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    const receivingLink = screen.getByRole("link", {
      name: /Receive inventory into the system/i,
    });
    expect(receivingLink).toHaveAttribute("aria-current", "page");

    mockLocation = "/receiving";
    rerender(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );
    expect(receivingLink).toHaveAttribute("aria-current", "page");
  });

  it("shows user actions", () => {
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });

  it("hides feature-flagged routes from quicklink customization when disabled", () => {
    mockSpreadsheetEnabled = false;
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /Customize/i }));
    expect(screen.queryByText("Spreadsheet View")).not.toBeInTheDocument();
  });
});
