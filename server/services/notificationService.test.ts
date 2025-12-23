import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the logger module
vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  sendNotification,
  sendBulkNotification,
  sendReminder,
  type NotificationPayload,
} from "./notificationService";
import { logger } from "../_core/logger";

describe("notificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendNotification", () => {
    it("should log email notification correctly", async () => {
      const payload: NotificationPayload = {
        userId: 1,
        title: "Test Email",
        message: "This is a test email",
        method: "email",
      };

      await sendNotification(payload);

      expect(logger.info).toHaveBeenCalledWith(
        { payload },
        "Notification requested"
      );
      expect(logger.info).toHaveBeenCalledWith(
        { to: 1, subject: "Test Email" },
        "Email notification (stub)"
      );
    });

    it("should log SMS notification correctly", async () => {
      const payload: NotificationPayload = {
        userId: 2,
        title: "Test SMS",
        message: "This is a test SMS",
        method: "sms",
      };

      await sendNotification(payload);

      expect(logger.info).toHaveBeenCalledWith(
        { payload },
        "Notification requested"
      );
      expect(logger.info).toHaveBeenCalledWith(
        { to: 2 },
        "SMS notification (stub)"
      );
    });

    it("should log push notification correctly", async () => {
      const payload: NotificationPayload = {
        userId: 3,
        title: "Test Push",
        message: "This is a test push notification",
        method: "push",
      };

      await sendNotification(payload);

      expect(logger.info).toHaveBeenCalledWith(
        { payload },
        "Notification requested"
      );
      expect(logger.info).toHaveBeenCalledWith(
        { to: 3 },
        "Push notification (stub)"
      );
    });

    it("should log in-app notification correctly", async () => {
      const payload: NotificationPayload = {
        userId: 4,
        title: "Test In-App",
        message: "This is a test in-app notification",
        method: "in-app",
      };

      await sendNotification(payload);

      expect(logger.info).toHaveBeenCalledWith(
        { payload },
        "Notification requested"
      );
      expect(logger.info).toHaveBeenCalledWith(
        { to: 4 },
        "In-app notification (stub)"
      );
    });

    it("should include metadata in payload logging", async () => {
      const payload: NotificationPayload = {
        userId: 5,
        title: "Test with Metadata",
        message: "This notification has metadata",
        method: "email",
        metadata: { orderId: 123, type: "order_confirmation" },
      };

      await sendNotification(payload);

      expect(logger.info).toHaveBeenCalledWith(
        { payload },
        "Notification requested"
      );
    });
  });

  describe("sendBulkNotification", () => {
    it("should send notification to all users", async () => {
      const userIds = [1, 2, 3];
      const notification = {
        title: "Bulk Test",
        message: "This is a bulk notification",
        method: "in-app" as const,
      };

      await sendBulkNotification(userIds, notification);

      // Should be called 3 times (once for each user) + 3 times for method-specific logs
      expect(logger.info).toHaveBeenCalledTimes(6);
    });

    it("should handle empty user array", async () => {
      const userIds: number[] = [];
      const notification = {
        title: "Empty Test",
        message: "No users to notify",
        method: "email" as const,
      };

      await sendBulkNotification(userIds, notification);

      // Should not be called at all
      expect(logger.info).not.toHaveBeenCalled();
    });

    it("should send to single user in array", async () => {
      const userIds = [42];
      const notification = {
        title: "Single User",
        message: "Only one user",
        method: "push" as const,
      };

      await sendBulkNotification(userIds, notification);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ userId: 42 }),
        }),
        "Notification requested"
      );
    });
  });

  describe("sendReminder", () => {
    it("should format reminder message correctly", async () => {
      await sendReminder(1, "payment due", 123, "invoice");

      expect(logger.info).toHaveBeenCalledWith(
        {
          payload: {
            userId: 1,
            title: "Reminder: payment due",
            message: "You have a payment due for invoice #123",
            method: "in-app",
            metadata: {
              entityId: 123,
              entityType: "invoice",
              reminderType: "payment due",
            },
          },
        },
        "Notification requested"
      );
    });

    it("should include correct metadata in reminder", async () => {
      await sendReminder(5, "appointment", 456, "event");

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            metadata: {
              entityId: 456,
              entityType: "event",
              reminderType: "appointment",
            },
          }),
        }),
        "Notification requested"
      );
    });

    it("should use in-app method for reminders", async () => {
      await sendReminder(10, "follow-up", 789, "order");

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            method: "in-app",
          }),
        }),
        "Notification requested"
      );
    });
  });
});
