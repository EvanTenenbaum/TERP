/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsPage } from "./NotificationsPage";
import { ThemeProvider } from "@/contexts/ThemeContext";

const mockMarkRead = vi.fn();
const mockDelete = vi.fn();
const mockMarkAll = vi.fn();
const mockInvalidate = vi.fn();

const sampleNotifications = [
  {
    id: 1,
    title: "New Event",
    message: "Meeting scheduled",
    type: "info",
    channel: "in_app",
    read: false,
    createdAt: new Date(),
  },
  {
    id: 2,
    title: "Update",
    message: "Task completed",
    type: "success",
    channel: "in_app",
    read: true,
    createdAt: new Date(),
  },
];

vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      list: {
        useQuery: vi.fn(() => ({
          data: {
            items: sampleNotifications,
            total: 2,
            unread: 1,
            pagination: { limit: 50, offset: 0 },
          },
          isLoading: false,
          isError: false,
        })),
      },
      markRead: {
        useMutation: vi.fn(() => ({
          mutate: mockMarkRead,
          isLoading: false,
        })),
      },
      delete: {
        useMutation: vi.fn(() => ({
          mutate: mockDelete,
          isLoading: false,
        })),
      },
      markAllRead: {
        useMutation: vi.fn(() => ({
          mutate: mockMarkAll,
          isLoading: false,
        })),
      },
      getUnreadCount: {
        useQuery: vi.fn(() => ({
          data: { unread: 1 },
          isLoading: false,
          isError: false,
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

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <ThemeProvider>
        <NotificationsPage />
      </ThemeProvider>
    );

  it("renders notification items", () => {
    renderPage();
    expect(screen.getByText("New Event")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  it("marks a notification as read", () => {
    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: /mark read/i })[0]);
    expect(mockMarkRead).toHaveBeenCalledWith({ notificationId: 1 });
  });

  it("deletes a notification", () => {
    renderPage();
    fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    expect(mockDelete).toHaveBeenCalledWith({ notificationId: 1 });
  });
});
