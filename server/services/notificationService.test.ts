import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  getDb: vi.fn(async () => null),
}));

vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  deleteNotification,
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  processNotificationQueue,
  queueNotification,
  resetNotificationStateForTests,
  sendBulkNotification,
  sendNotification,
  updateNotificationPreferences,
} from "./notificationService";

describe("notificationService - queue and delivery", () => {
  beforeEach(() => {
    resetNotificationStateForTests();
    vi.clearAllMocks();
  });

  it("queues and processes in-app notifications with defaults", async () => {
    await sendNotification({
      userId: 1,
      type: "info",
      title: "Welcome",
      message: "Hello there",
    });

    const result = await processNotificationQueue();
    expect(result.processed).toBe(1);
    const notifications = await listNotifications({ userId: 1 }, { limit: 10, offset: 0 });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.read).toBe(false);
    expect(notifications[0]?.channel).toBe("in_app");
    expect(notifications[0]?.type).toBe("info");
  });

  it("supports bulk queueing across users", async () => {
    await sendBulkNotification(
      [11, 22],
      {
        type: "warning",
        title: "System Warning",
        message: "Check your tasks",
      }
    );

    const result = await processNotificationQueue({ batchSize: 10 });
    expect(result.processed).toBe(2);

    const userOne = await listNotifications({ userId: 11 }, { limit: 5, offset: 0 });
    const userTwo = await listNotifications({ userId: 22 }, { limit: 5, offset: 0 });

    expect(userOne).toHaveLength(1);
    expect(userTwo).toHaveLength(1);
    expect(userOne[0]?.title).toBe("System Warning");
    expect(userTwo[0]?.title).toBe("System Warning");
  });

  it("respects in-app preference toggles when processing queue", async () => {
    await updateNotificationPreferences(5, { inAppEnabled: false });
    await queueNotification({
      userId: 5,
      type: "error",
      title: "Blocked",
      message: "This should not deliver",
    });

    const result = await processNotificationQueue();
    expect(result.skipped).toBe(1);

    const notifications = await listNotifications({ userId: 5 }, { limit: 5, offset: 0 });
    expect(notifications).toHaveLength(0);
  });

  it("marks notifications as read individually and in bulk", async () => {
    await sendNotification({
      userId: 2,
      type: "success",
      title: "Ready",
      message: "Processing complete",
    });
    await sendNotification({
      userId: 2,
      type: "info",
      title: "Another",
      message: "Check again",
    });
    await processNotificationQueue();

    const firstBatch = await listNotifications({ userId: 2 }, { limit: 10, offset: 0 });
    const targetId = firstBatch[0]?.id;
    expect(targetId).toBeDefined();

    if (!targetId) {
      throw new Error("Notification id missing in test setup");
    }

    await markNotificationRead(targetId, { userId: 2 });
    let unread = await getUnreadCount({ userId: 2 });
    expect(unread).toBe(1);

    await markAllNotificationsRead({ userId: 2 });
    unread = await getUnreadCount({ userId: 2 });
    expect(unread).toBe(0);
  });

  it("uses soft delete semantics and excludes deleted notifications", async () => {
    await sendNotification({
      userId: 3,
      type: "info",
      title: "Remove me",
      message: "Soon deleted",
    });
    await processNotificationQueue();
    const existing = await listNotifications({ userId: 3 }, { limit: 5, offset: 0 });
    const idToDelete = existing[0]?.id;
    expect(idToDelete).toBeDefined();

    if (!idToDelete) {
      throw new Error("Notification id missing for delete test");
    }

    await deleteNotification(idToDelete, { userId: 3 });
    const afterDelete = await listNotifications({ userId: 3 }, { limit: 5, offset: 0 });
    expect(afterDelete).toHaveLength(0);
    const unread = await getUnreadCount({ userId: 3 });
    expect(unread).toBe(0);
  });

  it("creates default preferences and persists updates", async () => {
    const prefs = await getNotificationPreferences({ userId: 7 });
    expect(prefs.inAppEnabled).toBe(true);
    expect(prefs.emailEnabled).toBe(true);
    expect(prefs.systemAlerts).toBe(true);

    await updateNotificationPreferences({ userId: 7 }, {
      inAppEnabled: false,
      systemAlerts: false,
    });

    const updated = await getNotificationPreferences({ userId: 7 });
    expect(updated.inAppEnabled).toBe(false);
    expect(updated.systemAlerts).toBe(false);
  });
});
