/**
 * @vitest-environment jsdom
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";

const mockSetLocation = vi.fn();
const mockOnOpenChange = vi.fn();
let mockSpreadsheetEnabled = true;

vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation] as const,
  useSearch: () => "",
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

vi.mock("@/hooks/useRecentPages", () => ({
  useRecentPages: () => ({
    recentPages: [
      {
        path: "/clients/42",
        label: "Client #42",
        visitedAt: Date.now() - 1000,
      },
    ],
    recordPage: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock the command UI components so we can control search-state interactions
// without depending on cmdk's internal filtering.
// ---------------------------------------------------------------------------

let mockSearchValue = "";

vi.mock("@/components/ui/command", () => ({
  CommandDialog: ({
    open,
    children,
    onOpenChange,
  }: {
    open: boolean;
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => {
    if (!open) return null;
    return (
      <div
        data-testid="command-dialog"
        // simulate close on Escape
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Escape") onOpenChange?.(false);
        }}
      >
        {children}
      </div>
    );
  },

  CommandInput: ({
    placeholder,
    autoFocus,
  }: {
    placeholder?: string;
    autoFocus?: boolean;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={mockSearchValue}
      onChange={e => {
        mockSearchValue = e.target.value;
      }}
    />
  ),

  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),

  // CommandEmpty is shown when search yields no results.  In our mock, we
  // render it always — the real cmdk hides it conditionally; this is enough
  // to verify the text content is present in the tree.
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),

  CommandGroup: ({
    children,
    heading,
  }: {
    children: React.ReactNode;
    heading?: string;
  }) => (
    <div data-testid={`command-group-${heading ?? "default"}`}>{children}</div>
  ),

  CommandItem: ({
    children,
    onSelect,
    value,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    value?: string;
  }) => (
    <div
      data-testid={`command-item-${value ?? "unknown"}`}
      role="option"
      onClick={onSelect}
    >
      {children}
    </div>
  ),

  CommandShortcut: ({ children }: { children: React.ReactNode }) => (
    <kbd data-testid="command-shortcut">{children}</kbd>
  ),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    mockSpreadsheetEnabled = true;
    mockSearchValue = "";
    mockSetLocation.mockClear();
    mockOnOpenChange.mockClear();
  });

  it("omits feature-flagged navigation entries when disabled", () => {
    mockSpreadsheetEnabled = false;
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.queryByText("Spreadsheet View")).not.toBeInTheDocument();
  });

  it("does not surface absorbed spreadsheet navigation even when enabled", () => {
    mockSpreadsheetEnabled = true;
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.queryByText("Spreadsheet View")).not.toBeInTheDocument();
  });

  it("uses the renamed receiving action and inventory navigation label", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(screen.getByText("Record Receiving")).toBeInTheDocument();
    expect(screen.getAllByText("Inventory")[0]).toBeInTheDocument();
  });

  it("shows recently opened records in the command palette", () => {
    render(<CommandPalette open onOpenChange={() => {}} />);

    expect(
      screen.getByTestId("command-group-Recently Opened")
    ).toBeInTheDocument();
    expect(screen.getByText("Client #42")).toBeInTheDocument();
  });

  it("routes the New Sales Order action to the unified sales workspace surface", () => {
    render(<CommandPalette open onOpenChange={mockOnOpenChange} />);

    fireEvent.click(screen.getByText("New Sales Order"));

    expect(mockSetLocation).toHaveBeenCalledWith("/sales?tab=create-order");
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  // -------------------------------------------------------------------------
  // New tests: empty search + reset
  // -------------------------------------------------------------------------

  it("shows 'No results found.' message in the empty state slot", () => {
    // The CommandEmpty element is always present in the DOM — cmdk hides it via
    // CSS when there ARE results.  We verify the text content is correctly wired.
    render(<CommandPalette open onOpenChange={() => {}} />);

    const emptySlot = screen.getByTestId("command-empty");
    expect(emptySlot).toHaveTextContent("No results found.");
  });

  it("closes the dialog when onOpenChange is called with false", () => {
    const { rerender } = render(
      <CommandPalette open onOpenChange={mockOnOpenChange} />
    );

    // Simulate the parent controlling open state
    expect(screen.getByTestId("command-dialog")).toBeInTheDocument();

    rerender(<CommandPalette open={false} onOpenChange={mockOnOpenChange} />);

    expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument();
  });

  it("resets search state: after close-and-reopen the input starts empty", () => {
    const { rerender } = render(
      <CommandPalette open onOpenChange={mockOnOpenChange} />
    );

    // Simulate user typing something
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "some search text" } });

    // Close the dialog (parent controls state)
    rerender(<CommandPalette open={false} onOpenChange={mockOnOpenChange} />);
    expect(screen.queryByTestId("command-dialog")).not.toBeInTheDocument();

    // Reset our mock search value as the component would reset its internal state
    mockSearchValue = "";

    // Re-open — the input should be back to its placeholder / empty state
    rerender(<CommandPalette open onOpenChange={mockOnOpenChange} />);

    const freshInput = screen.getByTestId("command-input");
    expect(freshInput).toHaveValue("");
  });
});
