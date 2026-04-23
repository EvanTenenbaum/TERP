/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";
import { ThemeProvider } from "@/contexts/ThemeContext";

const mockSetLocation = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();
const mockInvalidate = vi.fn();
let mockUnreadCount = 1;

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

vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      getUnreadCount: {
        useQuery: vi.fn(() => ({
          data: { unread: mockUnreadCount },
          isLoading: false,
        })),
      },
      list: {
        useQuery: vi.fn(() => ({
          data: {
            items: sampleNotifications,
            total: sampleNotifications.length,
            unread: 1,
            pagination: { limit: 5, offset: 0 },
          },
          isLoading: false,
          refetch: vi.fn(),
        })),
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
    mockUnreadCount = 1;
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

  it("hides badge when unread count is 0", () => {
    mockUnreadCount = 0;
    renderBell();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows numeric badge when count is 1-9", () => {
    mockUnreadCount = 5;
    renderBell();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows 9+ badge when count is greater than 9", () => {
    mockUnreadCount = 15;
    renderBell();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("renders unread badge from query data", () => {
    mockUnreadCount = 1;
    renderBell();
    expect(screen.getByText("1")).toBeInTheDocument();
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
