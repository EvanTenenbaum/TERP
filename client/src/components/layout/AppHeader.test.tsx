/**
 * AppHeader Tests
 *
 * Tests for the AppHeader component, focusing on the Notification bell rendering.
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

// Mock tRPC with notification data and auth
vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      me: {
        useQuery: vi.fn(() => ({
          data: { id: 1, name: "Test User", email: "test@example.com" },
          isLoading: false,
          isError: false,
        })),
      },
      logout: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
    },
    notifications: {
      getUnreadCount: {
        useQuery: vi.fn(() => ({
          data: { unread: 2 },
          isLoading: false,
          isError: false,
        })),
      },
      list: {
        useQuery: vi.fn(() => ({
          data: {
            items: [],
            total: 0,
            unread: 2,
            pagination: { limit: 5, offset: 0 },
          },
          isLoading: false,
          isError: false,
        })),
      },
      markRead: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
      markAllRead: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isLoading: false,
        })),
      },
    },
    useContext: vi.fn(() => ({
      notifications: {
        list: { invalidate: vi.fn() },
        getUnreadCount: { invalidate: vi.fn() },
      },
    })),
  },
}));

describe("AppHeader - Notification Bell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the notification bell with unread badge", () => {
    render(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    );

    const notificationsButton = screen.getByLabelText("Notifications");
    expect(notificationsButton).toBeInTheDocument();

    // Check for unread badge - should show the mocked unread count
    const badge = screen.getByText("2");
    expect(badge).toBeInTheDocument();
  });
});
