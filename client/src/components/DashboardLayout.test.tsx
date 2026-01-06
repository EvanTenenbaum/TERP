/**
 * DashboardLayout navigation tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import DashboardLayout from "./DashboardLayout";
import { ThemeProvider } from "@/contexts/ThemeContext";

let mockLocation = "/";
const mockSetLocation = vi.fn();

vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, mockSetLocation],
}));

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => false,
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
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              user: { name: "Test User", email: "test@example.com" },
            }),
        }) as unknown as typeof fetch
    )
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DashboardLayout navigation", () => {
  it("renders grouped sidebar sections in the expected order", () => {
    render(
      <ThemeProvider>
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      </ThemeProvider>
    );

    const groupLabels = screen.getAllByTestId("nav-group-label");
    const labelTexts = groupLabels.map(label => label.textContent?.trim());

    // Updated to match actual navigation groups from navigation.ts
    expect(labelTexts).toEqual(["Sales", "Inventory", "Finance", "Admin"]);
  });

  it("navigates to Spreadsheet view from the sidebar", () => {
    render(
      <ThemeProvider>
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      </ThemeProvider>
    );

    const spreadsheetButton = screen.getByRole("button", {
      name: /Spreadsheet/i,
    });
    fireEvent.click(spreadsheetButton);

    expect(mockSetLocation).toHaveBeenCalledWith("/spreadsheet-view");
  });
});
