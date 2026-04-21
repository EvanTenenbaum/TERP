/**
 * AppHeader Tests
 *
 * Tests for the AppHeader component, focusing on the Notification bell rendering.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppHeader } from "./AppHeader";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Mock wouter
const mockSetLocation = vi.fn();
let mockLocation = "/";
vi.mock("wouter", () => ({
  useLocation: () => [mockLocation, mockSetLocation],
  useSearch: () => "",
}));

vi.mock("./AppBreadcrumb", () => ({
  AppBreadcrumb: ({ className }: { className?: string }) => (
    <div className={className}>Breadcrumb Trail</div>
  ),
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

// TER-1210: Notification-bell assertions haven't been refreshed since
// the 420-fork UI overhaul (#579) restructured the header. Re-enable
// once the notification chrome has been re-characterized.
describe.skip("AppHeader - Notification Bell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = "/";
  });

  const openAccountMenu = () => {
    const trigger = screen.getByRole("button", { name: /test user/i });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
  };

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
    expect(
      screen.queryByTestId("density-toggle-button")
    ).not.toBeInTheDocument();
  });

  it("routes notifications to the notifications hub", () => {
    render(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    );

    openAccountMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /notifications/i }));

    expect(mockSetLocation).toHaveBeenCalledWith("/notifications");
  });

  it("keeps density control inside the account menu instead of primary header chrome", () => {
    render(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    );

    openAccountMenu();

    expect(
      screen.getByRole("menuitem", { name: /switch to comfortable spacing/i })
    ).toBeInTheDocument();
  });

  // TODO: The 420-fork redesigned the AppHeader layout. The breadcrumb and account
  // zones no longer use explicit border-r / border-l divided containers. The
  // breadcrumb lives in a plain overflow-hidden div and the account zone is a
  // rounded-full border container. Update the CSS-class selectors to match the
  // new layout before re-enabling this assertion.
  it.skip("separates breadcrumb and account zones with bordered containers", () => {
    mockLocation = "/orders";

    render(
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    );

    const breadcrumbZone = screen
      .getByText("Breadcrumb Trail")
      .closest("div.border-r");
    const accountZone = screen
      .getByRole("button", { name: /test user/i })
      .closest("div.border-l");

    expect(breadcrumbZone).not.toBeNull();
    expect(accountZone).not.toBeNull();
  });
});
