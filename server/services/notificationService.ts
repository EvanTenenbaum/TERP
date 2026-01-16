import {
  getNotificationRepository,
  resolveRecipient,
  resetNotificationRepositoryState,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationRecipient,
  type NotificationType,
  type PreferenceUpdateInput,
  type ResolvedRecipient,
} from "./notificationRepository";
import { type InsertNotification, type Notification, type NotificationPreference } from "../../drizzle/schema";
import { logger } from "../_core/logger";

export interface NotificationRequest extends NotificationRecipient {
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  channels?: NotificationChannel[];
  metadata?: Record<string, unknown>;
  category?: NotificationCategory;
}

export interface NotificationListOptions {
  limit?: number;
  offset?: number;
}

export interface QueueProcessResult {
  processed: number;
  skipped: number;
  failed: number;
}

interface NotificationQueueItem {
  userId: number | null;
  clientId: number | null;
  recipientType: "user" | "client";
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  channels: NotificationChannel[];
  metadata?: Record<string, unknown>;
  category: NotificationCategory;
  queuedAt: Date;
}

const notificationQueue: NotificationQueueItem[] = [];
const recipientKey = (recipient: ResolvedRecipient): string =>
  `${recipient.recipientType}:${recipient.recipientType === "user" ? recipient.userId : recipient.clientId}`;
const toRecipient = (recipient: NotificationRecipient | number): NotificationRecipient =>
  typeof recipient === "number" ? { userId: recipient } : recipient;

function isCategoryEnabled(
  preferences: NotificationPreference,
  category: NotificationCategory
): boolean {
  if (category === "appointment") {
    return preferences.appointmentReminders;
  }
  if (category === "order") {
    return preferences.orderUpdates;
  }
  if (category === "system") {
    return preferences.systemAlerts;
  }
  return true;
}

function filterChannelsByPreferences(
  channels: NotificationChannel[],
  preferences: NotificationPreference,
  category: NotificationCategory
): NotificationChannel[] {
  if (!isCategoryEnabled(preferences, category)) {
    return [];
  }

  const enabled: NotificationChannel[] = [];
  if (channels.includes("in_app") && preferences.inAppEnabled) {
    enabled.push("in_app");
  }
  if (channels.includes("email") && preferences.emailEnabled) {
    enabled.push("email");
  }
  if (channels.includes("sms") && preferences.smsEnabled) {
    enabled.push("sms");
  }
  return enabled;
}

async function ensurePreferences(
  recipient: ResolvedRecipient
): Promise<NotificationPreference> {
  const repository = await getNotificationRepository();
  const existing = await repository.getPreferences(recipient);
  if (existing) {
    return existing;
  }
  return repository.savePreferences(recipient, {});
}

function toInsertNotification(
  item: NotificationQueueItem,
  channel: NotificationChannel
): InsertNotification {
  return {
    userId: item.userId,
    clientId: item.clientId,
    recipientType: item.recipientType,
    type: item.type,
    title: item.title,
    message: item.message ?? null,
    link: item.link ?? null,
    channel,
    read: false,
    metadata: item.metadata ?? null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function resetNotificationStateForTests(): void {
  notificationQueue.splice(0, notificationQueue.length);
  resetNotificationRepositoryState();
}

export async function queueNotification(
  request: NotificationRequest
): Promise<void> {
  const recipient = resolveRecipient(request);
  const channels: NotificationChannel[] =
    request.channels && request.channels.length > 0
      ? Array.from(new Set(request.channels))
      : ["in_app"];

  notificationQueue.push({
    userId: recipient.userId,
    clientId: recipient.clientId,
    recipientType: recipient.recipientType,
    type: request.type,
    title: request.title,
    message: request.message,
    link: request.link,
    channels,
    metadata: request.metadata,
    queuedAt: new Date(),
    category: request.category ?? "system",
  });

  // BUG-077 FIX: Auto-process queue after adding notification for near-instant delivery
  // This ensures critical notifications are sent immediately rather than waiting for cron
  // Process in background without blocking the caller
  setImmediate(async () => {
    try {
      await processNotificationQueue({ batchSize: 10 });
    } catch (error) {
      logger.error({
        msg: "Failed to auto-process notification queue",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export async function sendNotification(
  request: NotificationRequest
): Promise<void> {
  await queueNotification(request);
  // Note: Queue is auto-processed via setImmediate in queueNotification
}

export async function sendBulkNotification(
  userIds: number[],
  notification: Omit<NotificationRequest, "userId">
): Promise<void> {
  if (userIds.length === 0) {
    return;
  }

  await Promise.all(
    userIds.map(userId => queueNotification({ ...notification, userId }))
  );
}

export async function sendReminder(
  userId: number,
  reminderType: string,
  entityId: number,
  entityType: string
): Promise<void> {
  await queueNotification({
    userId,
    type: "info",
    title: `Reminder: ${reminderType}`,
    message: `You have a ${reminderType} for ${entityType} #${entityId}`,
    metadata: { entityId, entityType, reminderType },
    category: "appointment",
  });
}

export async function processNotificationQueue(
  options?: { batchSize?: number }
): Promise<QueueProcessResult> {
  const batchSize = options?.batchSize ?? notificationQueue.length;
  const items = notificationQueue.splice(0, batchSize);
  const preferencesCache = new Map<string, NotificationPreference>();

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  const repository = await getNotificationRepository();

  for (const item of items) {
    try {
      const recipient: ResolvedRecipient = {
        recipientType: item.recipientType,
        userId: item.userId,
        clientId: item.clientId,
      };
      const cacheKey = recipientKey(recipient);
      const cached = preferencesCache.get(cacheKey);
      const preferences = cached ?? (await ensurePreferences(recipient));
      preferencesCache.set(cacheKey, preferences);

      const enabledChannels = filterChannelsByPreferences(
        item.channels ?? ["in_app"],
        preferences,
        item.category ?? "system"
      );

      if (enabledChannels.length === 0) {
        skipped += 1;
        continue;
      }

      for (const channel of enabledChannels) {
        const insertPayload = toInsertNotification(item, channel);
        await repository.insertNotification(insertPayload);
      }

      processed += 1;
    } catch (error) {
      failed += 1;
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          userId: item.userId,
        },
        "Failed to process notification"
      );
    }
  }

  return { processed, skipped, failed };
}

export async function listNotifications(
  recipient: NotificationRecipient | number,
  options?: NotificationListOptions
): Promise<Notification[]> {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const resolvedRecipient = resolveRecipient(toRecipient(recipient));
  const repository = await getNotificationRepository();
  return repository.listNotifications(resolvedRecipient, limit, offset);
}

export async function markNotificationRead(
  notificationId: number,
  recipient: NotificationRecipient | number
): Promise<boolean> {
  const resolvedRecipient = resolveRecipient(toRecipient(recipient));
  const repository = await getNotificationRepository();
  await repository.markRead(notificationId, resolvedRecipient);
  return true;
}

export async function markAllNotificationsRead(
  recipient: NotificationRecipient | number
): Promise<number> {
  const resolvedRecipient = resolveRecipient(toRecipient(recipient));
  const repository = await getNotificationRepository();
  return repository.markAllRead(resolvedRecipient);
}

export async function deleteNotification(
  notificationId: number,
  recipient: NotificationRecipient | number
): Promise<boolean> {
  const resolvedRecipient = resolveRecipient(toRecipient(recipient));
  const repository = await getNotificationRepository();
  await repository.softDelete(notificationId, resolvedRecipient);
  return true;
}

export async function getUnreadCount(
  recipient: NotificationRecipient | number
): Promise<number> {
  const resolvedRecipient = resolveRecipient(toRecipient(recipient));
  const repository = await getNotificationRepository();
  return repository.countUnread(resolvedRecipient);
}

export async function getNotificationPreferences(
  recipient: NotificationRecipient | number
): Promise<NotificationPreference> {
  const resolvedRecipient = resolveRecipient(toRecipient(recipient));
  return ensurePreferences(resolvedRecipient);
}

export async function updateNotificationPreferences(
  recipient: NotificationRecipient | number,
  updates: PreferenceUpdateInput
): Promise<NotificationPreference> {
  const resolvedRecipient = resolveRecipient(toRecipient(recipient));
  const repository = await getNotificationRepository();
  return repository.savePreferences(resolvedRecipient, updates);
}
