/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";

const mockSetLocation = vi.fn();
let mockSpreadsheetEnabled = true;

vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation] as const,
}));

vi.mock("@/hooks/useFeatureFlag", () => ({
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

describe("CommandPalette", () => {
  beforeEach(() => {
    mockSpreadsheetEnabled = true;
    mockSetLocation.mockClear();
  });

  it("omits feature-flagged navigation entries when disabled", () => {
    mockSpreadsheetEnabled = false;
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.queryByText("Spreadsheet View")).not.toBeInTheDocument();
  });

  it("shows feature-flagged navigation entries when enabled", () => {
    mockSpreadsheetEnabled = true;
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.getByText("Spreadsheet View")).toBeInTheDocument();
  });

  it("uses the renamed receiving action and operations navigation label", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.getByText("Record Receiving")).toBeInTheDocument();
    expect(screen.getByText("Operations")).toBeInTheDocument();
  });
});
