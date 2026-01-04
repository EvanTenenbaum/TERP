/**
 * AppSidebar navigation grouping tests
 *
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";

let mockLocation = "/";
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, mockSetLocation],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.cloneElement(children as React.ReactElement, { href }),
}));

const featureFlagMock = vi.fn();

vi.mock("@/hooks/useFeatureFlag", () => ({
  useFeatureFlag: (key: string) => featureFlagMock(key),
  useFeatureFlags: () => ({
    flags: { "spreadsheet-view": true },
    isLoading: false,
    error: null,
    isEnabled: (key: string) => key === "spreadsheet-view",
    isModuleEnabled: () => true,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  mockLocation = "/";
  mockSetLocation.mockClear();
  featureFlagMock.mockReturnValue({
    enabled: true,
    isLoading: false,
    error: null,
  });
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

    expect(labelTexts).toEqual(["Sales", "Inventory", "Finance", "Admin"]);
  });

  it("collapses and expands sections", async () => {
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    const salesToggle = screen.getByRole("button", { name: /Sales/i });
    expect(screen.getByRole("link", { name: /Dashboard/i })).toBeVisible();

    salesToggle.click();

    expect(
      screen.queryByRole("link", { name: /Dashboard/i })
    ).not.toBeInTheDocument();

    salesToggle.click();

    expect(screen.getByRole("link", { name: /Dashboard/i })).toBeVisible();
  });

  it("highlights active navigation item", () => {
    mockLocation = "/orders";
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    expect(screen.getByRole("link", { name: /Orders/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("shows user actions", () => {
    render(
      <ThemeProvider>
        <Sidebar open />
      </ThemeProvider>
    );

    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });
});
