import { logger } from "../_core/logger";

export type NotificationMethod = "email" | "sms" | "push" | "in-app";

export interface NotificationPayload {
  userId: number;
  title: string;
  message: string;
  method: NotificationMethod;
  metadata?: Record<string, unknown>;
}

/**
 * Send a notification to a user.
 * Currently logs the notification - implement actual delivery later.
 *
 * @param payload - The notification payload
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<void> {
  logger.info({ payload }, "Notification requested");

  // TODO: Implement actual notification delivery
  // For now, just log it
  switch (payload.method) {
    case "email":
      logger.info(
        { to: payload.userId, subject: payload.title },
        "Email notification (stub)"
      );
      break;
    case "sms":
      logger.info({ to: payload.userId }, "SMS notification (stub)");
      break;
    case "push":
      logger.info({ to: payload.userId }, "Push notification (stub)");
      break;
    case "in-app":
      // Could create inbox item here
      logger.info({ to: payload.userId }, "In-app notification (stub)");
      break;
  }
}

/**
 * Send notification to multiple users.
 *
 * @param userIds - Array of user IDs to notify
 * @param notification - The notification payload (without userId)
 */
export async function sendBulkNotification(
  userIds: number[],
  notification: Omit<NotificationPayload, "userId">
): Promise<void> {
  await Promise.all(
    userIds.map((userId) => sendNotification({ ...notification, userId }))
  );
}

/**
 * Send a reminder notification.
 *
 * @param userId - The user to remind
 * @param reminderType - Type of reminder (e.g., "payment due", "appointment")
 * @param entityId - ID of the related entity
 * @param entityType - Type of the related entity (e.g., "invoice", "event")
 */
export async function sendReminder(
  userId: number,
  reminderType: string,
  entityId: number,
  entityType: string
): Promise<void> {
  await sendNotification({
    userId,
    title: `Reminder: ${reminderType}`,
    message: `You have a ${reminderType} for ${entityType} #${entityId}`,
    method: "in-app",
    metadata: { entityId, entityType, reminderType },
  });
}
