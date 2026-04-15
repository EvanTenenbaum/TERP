/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { InlineNotificationPanel } from "./InlineNotificationPanel";

const {
  mockMarkRead,
  mockMarkAllRead,
  mockDelete,
  mockInvalidate,
} = vi.hoisted(() => ({
  mockMarkRead: vi.fn(),
  mockMarkAllRead: vi.fn(),
  mockDelete: vi.fn(),
  mockInvalidate: vi.fn(),
}));

const sampleNotifications = [
  {
    id: 1,
    title: "Order confirmed",
    message: "New order is ready for review",
    type: "info",
    link: "/orders/1",
    metadata: null,
    read: false,
    createdAt: new Date("2026-04-09T18:00:00Z"),
  },
  {
    id: 2,
    title: "Payment failed",
    message: "Needs operator attention",
    type: "error",
    link: "/accounting?tab=payments",
    metadata: null,
    read: false,
    createdAt: new Date("2026-04-09T18:10:00Z"),
  },
  {
    id: 3,
    title: "Reminder",
    message: "Follow up tomorrow",
    type: "warning",
    link: null,
    metadata: null,
    read: true,
    createdAt: new Date("2026-04-09T18:15:00Z"),
  },
];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      list: {
        useQuery: vi.fn(() => ({
          data: {
            items: sampleNotifications,
            total: sampleNotifications.length,
            unread: 2,
            pagination: { limit: 10, offset: 0 },
          },
          isLoading: false,
        })),
      },
      markRead: {
        useMutation: vi.fn(() => ({
          mutate: mockMarkRead,
          isPending: false,
        })),
      },
      markAllRead: {
        useMutation: vi.fn(() => ({
          mutate: mockMarkAllRead,
          isPending: false,
        })),
      },
      delete: {
        useMutation: vi.fn(() => ({
          mutate: mockDelete,
          isPending: false,
        })),
      },
      getUnreadCount: {
        invalidate: mockInvalidate,
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("InlineNotificationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPanel = () =>
    render(
      <ThemeProvider>
        <InlineNotificationPanel title="System Notifications" limit={10} />
      </ThemeProvider>
    );

  it("shows unread and action-oriented notification controls", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: "FYI" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Needs Action" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Mark read" })).toHaveLength(
      2
    );
  });

  it("filters the panel down to FYI notifications", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "FYI" }));

    expect(screen.getByText("Order confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Payment failed")).not.toBeInTheDocument();
    expect(screen.queryByText("Reminder")).not.toBeInTheDocument();
  });

  it("filters the panel down to action-needed notifications", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Needs Action" }));

    expect(screen.getByText("Payment failed")).toBeInTheDocument();
    expect(screen.getByText("Reminder")).toBeInTheDocument();
    expect(screen.queryByText("Order confirmed")).not.toBeInTheDocument();
  });

  it("marks a notification as read without navigating when mark read is clicked", () => {
    const onNotificationClick = vi.fn();

    render(
      <ThemeProvider>
        <InlineNotificationPanel
          title="System Notifications"
          limit={10}
          onNotificationClick={onNotificationClick}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Mark read" })[0]);

    expect(mockMarkRead).toHaveBeenCalledWith({ notificationId: 1 });
    expect(onNotificationClick).not.toHaveBeenCalled();
  });
});
