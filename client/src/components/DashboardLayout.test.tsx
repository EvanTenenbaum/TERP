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

    // Labels come from navigation.ts navigationGroups
    expect(labelTexts).toEqual(["Sell", "Buy", "Finance", "Admin"]);
  });

  it("navigates to canonical procurement spreadsheet destination from the sidebar", () => {
    render(
      <ThemeProvider>
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText("Spreadsheet View"));

    expect(mockSetLocation).toHaveBeenCalledWith(
      "/purchase-orders?tab=receiving&mode=spreadsheet"
    );
  });
});
