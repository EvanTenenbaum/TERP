/**
 * AppSidebar navigation grouping tests
 *
 * @vitest-environment jsdom
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppSidebar } from "./AppSidebar";
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
        <AppSidebar open />
      </ThemeProvider>
    );

    const groupLabels = screen.getAllByTestId("nav-group-label");
    const labelTexts = groupLabels.map(label => label.textContent?.trim());

    expect(labelTexts).toEqual([
      "Core",
      "Sales",
      "Fulfillment",
      "Finance",
      "Settings",
    ]);
  });

  it("includes a Spreadsheet navigation link", () => {
    render(
      <ThemeProvider>
        <AppSidebar open />
      </ThemeProvider>
    );

    const spreadsheetLink = screen.getByRole("link", { name: /Spreadsheet/i });
    expect(spreadsheetLink).toHaveAttribute("href", "/spreadsheet-view");
  });
});
