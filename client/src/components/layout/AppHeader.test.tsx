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

// Mock the trpc hooks
const mockInvalidate = vi.fn();
const mockMutate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    inbox: {
      getStats: {
        useQuery: vi.fn(() => ({
          data: { total: 5, unread: 3, archived: 0 },
          isLoading: false,
        })),
      },
      getUnread: {
        useQuery: vi.fn(() => ({
          data: [
            {
              id: 1,
              sourceType: "mention",
              sourceId: 1,
              userId: 1,
              createdAt: new Date().toISOString(),
              seenAt: null,
              isArchived: false,
              metadata: "You were mentioned in a comment",
            },
            {
              id: 2,
              sourceType: "task_assignment",
              sourceId: 2,
              userId: 1,
              createdAt: new Date().toISOString(),
              seenAt: null,
              isArchived: false,
              metadata: "New task assigned to you",
            },
          ],
          isLoading: false,
        })),
      },
      bulkMarkAsSeen: {
        useMutation: vi.fn(() => ({
          mutate: mockMutate,
          isPending: false,
        })),
      },
    },
    useContext: () => ({
      inbox: {
        getMyItems: {
          invalidate: mockInvalidate,
        },
        getUnread: {
          invalidate: mockInvalidate,
        },
        getStats: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

describe("AppHeader - Inbox Dropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the Inbox button with unread badge", () => {
    render(<AppHeader />);

    const inboxButton = screen.getByTitle("Inbox");
    expect(inboxButton).toBeInTheDocument();

    // Check for unread badge
    const badge = screen.getByText("3");
    expect(badge).toBeInTheDocument();
  });

  it("should render Inbox button as a dropdown trigger, not a direct link", () => {
    render(<AppHeader />);

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
    render(<AppHeader />);

    // Should show "3" based on mock data
    const badge = screen.getByText("3");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("absolute", "-top-1", "-right-1");
  });
});
