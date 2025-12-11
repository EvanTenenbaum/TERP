/**
 * AppHeader Tests
 *
 * Tests for the AppHeader component, specifically the Inbox dropdown functionality.
 * Ensures the Inbox button opens a dropdown menu instead of navigating directly.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "./AppHeader";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation],
}));

// Mock version.json
vi.mock("../../../version.json", () => ({
  default: {
    version: "1.0.0",
    commit: "abc123",
  },
}));

describe("AppHeader - Inbox Dropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the Inbox button with unread badge", () => {
    render(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    );

    const inboxButton = screen.getByTitle("Inbox");
    expect(inboxButton).toBeInTheDocument();

    // Check for unread badge
    // This relies on the global tRPC mock in setup.ts
    const badge = screen.getByText("3");
    expect(badge).toBeInTheDocument();
  });

  it("should render Inbox button as a dropdown trigger, not a direct link", () => {
    render(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    );

    const inboxButton = screen.getByTitle("Inbox");

    // The button should not have an onClick that directly navigates
    // Instead, it should be wrapped in a DropdownMenuTrigger
    expect(inboxButton).toBeInTheDocument();

    // Verify it's part of a dropdown menu structure
    expect(
      inboxButton.closest('[data-slot="dropdown-menu-trigger"]')
    ).toBeInTheDocument();
  });

  it("should display correct unread count in badge", () => {
    render(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    );

    // Should show "3" based on mock data from setup.ts
    const badge = screen.getByText("3");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("absolute", "-top-1", "-right-1");
  });
});