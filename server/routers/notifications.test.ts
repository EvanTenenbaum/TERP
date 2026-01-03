/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationsRouter } from "./notifications";
import type { TrpcContext } from "../_core/context";

const serviceMocks = vi.hoisted(() => ({
  mockListNotifications: vi.fn(),
  mockMarkRead: vi.fn(),
  mockMarkAll: vi.fn(),
  mockDelete: vi.fn(),
  mockUnread: vi.fn(),
  mockGetPreferences: vi.fn(),
  mockUpdatePreferences: vi.fn(),
}));

vi.mock("../services/notificationService", () => ({
  listNotifications: serviceMocks.mockListNotifications,
  markNotificationRead: serviceMocks.mockMarkRead,
  markAllNotificationsRead: serviceMocks.mockMarkAll,
  deleteNotification: serviceMocks.mockDelete,
  getUnreadCount: serviceMocks.mockUnread,
  getNotificationPreferences: serviceMocks.mockGetPreferences,
  updateNotificationPreferences: serviceMocks.mockUpdatePreferences,
}));

const baseUser = {
  id: 10,
  openId: "user-10",
  email: "user@example.com",
  name: "User Ten",
  role: "user" as const,
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const baseContext: TrpcContext = {
  user: baseUser,
  req: { headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const createCaller = () => notificationsRouter.createCaller(baseContext);

describe("notificationsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists notifications with pagination data", async () => {
    serviceMocks.mockListNotifications.mockResolvedValue([{ id: 1, title: "Test" }]);
    serviceMocks.mockUnread.mockResolvedValue(2);
    const caller = createCaller();

    const result = await caller.list({ limit: 5, offset: 0 });

    expect(serviceMocks.mockListNotifications).toHaveBeenCalledWith(
      { userId: 10 },
      { limit: 5, offset: 0 }
    );
    expect(result.items).toHaveLength(1);
    expect(result.unread).toBe(2);
  });

  it("marks a notification as read", async () => {
    const caller = createCaller();
    await caller.markRead({ notificationId: 4 });
    expect(serviceMocks.mockMarkRead).toHaveBeenCalledWith(4, { userId: 10 });
  });

  it("marks all notifications as read", async () => {
    serviceMocks.mockMarkAll.mockResolvedValue(3);
    const caller = createCaller();
    const result = await caller.markAllRead();
    expect(serviceMocks.mockMarkAll).toHaveBeenCalledWith({ userId: 10 });
    expect(result.updated).toBe(3);
  });

  it("deletes a notification", async () => {
    const caller = createCaller();
    await caller.delete({ notificationId: 7 });
    expect(serviceMocks.mockDelete).toHaveBeenCalledWith(7, { userId: 10 });
  });

  it("returns unread count", async () => {
    serviceMocks.mockUnread.mockResolvedValue(5);
    const caller = createCaller();
    const result = await caller.getUnreadCount();
    expect(serviceMocks.mockUnread).toHaveBeenCalledWith({ userId: 10 });
    expect(result.unread).toBe(5);
  });

  it("updates preferences", async () => {
    serviceMocks.mockUpdatePreferences.mockResolvedValue({
      userId: 10,
      recipientType: "user",
      clientId: null,
      inAppEnabled: false,
      emailEnabled: true,
      appointmentReminders: false,
      orderUpdates: true,
      systemAlerts: true,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: 2,
    });
    const caller = createCaller();
    await caller.updatePreferences({ inAppEnabled: false });
    expect(serviceMocks.mockUpdatePreferences).toHaveBeenCalledWith(
      { userId: 10 },
      {
      inAppEnabled: false,
    },
    );
  });
});
