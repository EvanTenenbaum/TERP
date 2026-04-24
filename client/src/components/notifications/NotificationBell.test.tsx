/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";
import { ThemeProvider } from "@/contexts/ThemeContext";

const {
  mockGetUnreadCountQuery,
  mockListQuery,
  mockMarkRead,
  mockMarkAllRead,
  mockInvalidate,
  sampleNotifications,
} = vi.hoisted(() => {
  const sampleNotifications = [
    {
      id: 1,
      title: "New Order",
      message: "Order #123 created",
      type: "info",
      link: "/orders/123",
      metadata: { entityType: "order", entityId: 123 },
      channel: "in_app",
      read: false,
      createdAt: new Date(),
    },
    {
      id: 2,
      title: "Reminder",
      message: "Appointment tomorrow",
      type: "warning",
      link: null,
      channel: "in_app",
      read: true,
      createdAt: new Date(),
    },
  ];

  return {
    mockGetUnreadCountQuery: vi.fn(() => ({
      data: { unread: 1 },
      isLoading: false,
    })),
    mockListQuery: vi.fn(() => ({
      data: {
        items: sampleNotifications,
        total: sampleNotifications.length,
        unread: 1,
        pagination: { limit: 5, offset: 0 },
      },
      isLoading: false,
      refetch: vi.fn(),
    })),
    mockMarkRead: vi.fn(),
    mockMarkAllRead: vi.fn(),
    mockInvalidate: vi.fn(),
    sampleNotifications,
  };
});

const mockSetLocation = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      getUnreadCount: {
        useQuery: mockGetUnreadCountQuery,
      },
      list: {
        useQuery: mockListQuery,
      },
      markRead: {
        useMutation: vi.fn(() => ({
          mutate: mockMarkRead,
          isLoading: false,
        })),
      },
      markAllRead: {
        useMutation: vi.fn(() => ({
          mutate: mockMarkAllRead,
          isLoading: false,
        })),
      },
    },
    useContext: vi.fn(() => ({
      notifications: {
        list: { invalidate: mockInvalidate },
        getUnreadCount: { invalidate: mockInvalidate },
      },
    })),
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", mockSetLocation],
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset to default mock values
    mockGetUnreadCountQuery.mockReturnValue({
      data: { unread: 1 },
      isLoading: false,
    });
    
    mockListQuery.mockReturnValue({
      data: {
        items: sampleNotifications,
        total: sampleNotifications.length,
        unread: 1,
        pagination: { limit: 5, offset: 0 },
      },
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  const renderBell = () =>
    render(
      <ThemeProvider>
        <NotificationBell />
      </ThemeProvider>
    );

  const openDropdown = () => {
    const trigger = screen.getByRole("button", { name: /notifications/i });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
  };

  it("renders unread badge from getUnreadCount query", () => {
    renderBell();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("hides badge when unread count is 0", () => {
    mockGetUnreadCountQuery.mockReturnValue({
      data: { unread: 0 },
      isLoading: false,
    });

    renderBell();
    
    const bell = screen.getByRole("button", { name: /notifications/i });
    expect(bell).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows numeric count when count is 5", () => {
    mockGetUnreadCountQuery.mockReturnValue({
      data: { unread: 5 },
      isLoading: false,
    });

    renderBell();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows '9+' when count is 15", () => {
    mockGetUnreadCountQuery.mockReturnValue({
      data: { unread: 15 },
      isLoading: false,
    });

    renderBell();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("opens dropdown and lists notifications", async () => {
    renderBell();
    openDropdown();

    await waitFor(() => {
      expect(screen.getByText("New Order")).toBeInTheDocument();
      expect(screen.getByText("Reminder")).toBeInTheDocument();
    });
  });

  it("marks a notification as read when clicked", async () => {
    renderBell();

    openDropdown();
    const target = await screen.findByText("New Order");
    fireEvent.click(target);

    expect(mockMarkRead).toHaveBeenCalledWith({ notificationId: 1 });
    expect(mockSetLocation).toHaveBeenCalledWith("/sales?tab=orders&id=123");
  });

  it("navigates to view all notifications", async () => {
    renderBell();

    openDropdown();
    const viewAll = await screen.findByText(/view all/i);
    fireEvent.click(viewAll);

    expect(mockSetLocation).toHaveBeenCalledWith("/notifications");
  });
});
