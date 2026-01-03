import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import {
  notificationPreferences,
  notifications,
  type InsertNotification,
  type InsertNotificationPreference,
  type Notification,
  type NotificationPreference,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { logger } from "../_core/logger";

export type NotificationChannel = "in_app" | "email" | "sms";
export type NotificationType = "info" | "warning" | "success" | "error";
export type NotificationCategory = "appointment" | "order" | "system" | "general";

export interface NotificationRecipient {
  userId?: number;
  clientId?: number;
  recipientType?: "user" | "client";
}

export interface ResolvedRecipient {
  userId: number | null;
  clientId: number | null;
  recipientType: "user" | "client";
}

export type PreferenceFlags = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  appointmentReminders: boolean;
  orderUpdates: boolean;
  systemAlerts: boolean;
  isDeleted: boolean;
};

export type PreferenceUpdateInput = Partial<PreferenceFlags>;

export interface NotificationRepository {
  insertNotification: (input: InsertNotification) => Promise<number>;
  listNotifications: (
    recipient: ResolvedRecipient,
    limit: number,
    offset: number
  ) => Promise<Notification[]>;
  markRead: (id: number, recipient: ResolvedRecipient) => Promise<void>;
  markAllRead: (recipient: ResolvedRecipient) => Promise<number>;
  softDelete: (id: number, recipient: ResolvedRecipient) => Promise<void>;
  countUnread: (recipient: ResolvedRecipient) => Promise<number>;
  getPreferences: (recipient: ResolvedRecipient) => Promise<NotificationPreference | null>;
  savePreferences: (
    recipient: ResolvedRecipient,
    updates: PreferenceUpdateInput
  ) => Promise<NotificationPreference>;
}

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const defaultPreferences: PreferenceFlags = {
  inAppEnabled: true,
  emailEnabled: true,
  appointmentReminders: true,
  orderUpdates: true,
  systemAlerts: true,
  isDeleted: false,
};

const ensureIdentifier = (value: number | null | undefined): number => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    throw new Error("Notification recipient is required");
  }
  return value;
};

export const resolveRecipient = (input: NotificationRecipient): ResolvedRecipient => {
  if (
    input.recipientType === "client" ||
    (!input.userId && input.clientId !== undefined)
  ) {
    return {
      recipientType: "client",
      userId: null,
      clientId: ensureIdentifier(input.clientId),
    };
  }

  if (input.userId !== undefined) {
    return {
      recipientType: "user",
      userId: ensureIdentifier(input.userId),
      clientId: null,
    };
  }

  if (input.clientId !== undefined) {
    return {
      recipientType: "client",
      userId: null,
      clientId: ensureIdentifier(input.clientId),
    };
  }

  throw new Error("Notification recipient is required");
};

const recipientKey = (recipient: ResolvedRecipient): string =>
  `${recipient.recipientType}:${recipient.recipientType === "user" ? recipient.userId : recipient.clientId}`;

const preferencesFromRecipient = (
  recipient: ResolvedRecipient,
  updates?: PreferenceUpdateInput,
  timestamps?: { createdAt?: Date; updatedAt?: Date }
): InsertNotificationPreference => {
  const now = new Date();
  const createdAt = timestamps?.createdAt ?? now;
  const updatedAt = timestamps?.updatedAt ?? now;
  return {
    recipientType: recipient.recipientType,
    userId: recipient.userId,
    clientId: recipient.clientId,
    ...defaultPreferences,
    ...updates,
    isDeleted: updates?.isDeleted ?? false,
    createdAt,
    updatedAt,
  };
};

const normalizePreferenceRecord = (
  preference: InsertNotificationPreference & { id: number }
): NotificationPreference => {
  const now = new Date();
  return {
    id: preference.id,
    recipientType: preference.recipientType ?? "user",
    userId: preference.userId ?? null,
    clientId: preference.clientId ?? null,
    inAppEnabled:
      preference.inAppEnabled ?? defaultPreferences.inAppEnabled,
    emailEnabled: preference.emailEnabled ?? defaultPreferences.emailEnabled,
    appointmentReminders:
      preference.appointmentReminders ?? defaultPreferences.appointmentReminders,
    orderUpdates: preference.orderUpdates ?? defaultPreferences.orderUpdates,
    systemAlerts: preference.systemAlerts ?? defaultPreferences.systemAlerts,
    isDeleted: preference.isDeleted ?? false,
    createdAt: preference.createdAt ?? now,
    updatedAt: preference.updatedAt ?? now,
  };
};

const matchesRecipient = (
  record: Notification,
  recipient: ResolvedRecipient
): boolean => {
  if (record.recipientType !== recipient.recipientType) {
    return false;
  }
  if (recipient.recipientType === "user") {
    return record.userId === recipient.userId && (record.isDeleted ?? false) === false;
  }
  return record.clientId === recipient.clientId && (record.isDeleted ?? false) === false;
};

const notificationRecipientWhere = (recipient: ResolvedRecipient) =>
  and(
    eq(notifications.recipientType, recipient.recipientType),
    recipient.recipientType === "user"
      ? eq(notifications.userId, ensureIdentifier(recipient.userId))
      : eq(notifications.clientId, ensureIdentifier(recipient.clientId)),
    or(eq(notifications.isDeleted, false), isNull(notifications.isDeleted))
  );

const preferenceRecipientWhere = (recipient: ResolvedRecipient) =>
  and(
    eq(notificationPreferences.recipientType, recipient.recipientType),
    recipient.recipientType === "user"
      ? eq(notificationPreferences.userId, ensureIdentifier(recipient.userId))
      : eq(
          notificationPreferences.clientId,
          ensureIdentifier(recipient.clientId)
        ),
    eq(notificationPreferences.isDeleted, false)
  );

const inMemoryNotifications: Notification[] = [];
const inMemoryPreferences = new Map<string, NotificationPreference>();
let inMemoryNotificationId = 1;
let inMemoryPreferenceId = 1;

const inMemoryRepository: NotificationRepository = {
  insertNotification: async (input: InsertNotification): Promise<number> => {
    const id = inMemoryNotificationId;
    inMemoryNotificationId += 1;
    const createdAt = input.createdAt ?? new Date();
    const updatedAt = input.updatedAt ?? createdAt;
    inMemoryNotifications.unshift({
      id,
      recipientType: input.recipientType ?? "user",
      userId: input.userId ?? null,
      clientId: input.clientId ?? null,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
      channel: input.channel ?? "in_app",
      read: input.read ?? false,
      metadata: input.metadata ?? null,
      isDeleted: input.isDeleted ?? false,
      createdAt,
      updatedAt,
    });
    return id;
  },
  listNotifications: async (
    recipient: ResolvedRecipient,
    limit: number,
    offset: number
  ): Promise<Notification[]> => {
    return inMemoryNotifications
      .filter(item => matchesRecipient(item, recipient))
      .sort(
        (a, b) =>
          (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      )
      .slice(offset, offset + limit);
  },
  markRead: async (
    id: number,
    recipient: ResolvedRecipient
  ): Promise<void> => {
    const target = inMemoryNotifications.find(
      item =>
        item.id === id &&
        matchesRecipient(item, recipient)
    );
    if (target) {
      target.read = true;
      target.updatedAt = new Date();
    }
  },
  markAllRead: async (recipient: ResolvedRecipient): Promise<number> => {
    let updated = 0;
    inMemoryNotifications.forEach(item => {
      const matches = matchesRecipient(item, recipient);
      if (matches && !item.read && !item.isDeleted) {
        item.read = true;
        item.updatedAt = new Date();
        updated += 1;
      }
    });
    return updated;
  },
  softDelete: async (
    id: number,
    recipient: ResolvedRecipient
  ): Promise<void> => {
    const target = inMemoryNotifications.find(
      item =>
        item.id === id &&
        matchesRecipient(item, recipient)
    );
    if (target) {
      target.isDeleted = true;
      target.updatedAt = new Date();
    }
  },
  countUnread: async (recipient: ResolvedRecipient): Promise<number> => {
    return inMemoryNotifications.filter(
      item =>
        matchesRecipient(item, recipient) &&
        (item.isDeleted ?? false) === false &&
        (item.read ?? false) === false
    ).length;
  },
  getPreferences: async (
    recipient: ResolvedRecipient
  ): Promise<NotificationPreference | null> => {
    const key = recipientKey(recipient);
    const preference = inMemoryPreferences.get(key);
    if (!preference || preference.isDeleted) {
      return null;
    }
    return preference;
  },
  savePreferences: async (
    recipient: ResolvedRecipient,
    updates: PreferenceUpdateInput
  ): Promise<NotificationPreference> => {
    const key = recipientKey(recipient);
    const existing = inMemoryPreferences.get(key);
    const now = new Date();
    if (!existing || existing.isDeleted) {
      const basePreference = preferencesFromRecipient(recipient, updates, {
        createdAt: now,
        updatedAt: now,
      });
      const created = normalizePreferenceRecord({
        ...basePreference,
        id: inMemoryPreferenceId,
      });
      inMemoryPreferenceId += 1;
      inMemoryPreferences.set(key, created);
      return created;
    }

    const updated = normalizePreferenceRecord({
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
      isDeleted: updates.isDeleted ?? existing.isDeleted,
    });
    inMemoryPreferences.set(key, updated);
    return updated;
  },
};

function createDbRepository(db: Database): NotificationRepository {
  return {
    insertNotification: async (input: InsertNotification): Promise<number> => {
      const [created] = await db.insert(notifications).values(input).$returningId();
      return created?.id ?? 0;
    },
    listNotifications: async (
      recipient: ResolvedRecipient,
      limit: number,
      offset: number
    ): Promise<Notification[]> => {
      return db.query.notifications.findMany({
        where: notificationRecipientWhere(recipient),
        orderBy: [desc(notifications.createdAt)],
        limit,
        offset,
      });
    },
    markRead: async (
      id: number,
      recipient: ResolvedRecipient
    ): Promise<void> => {
      await db
        .update(notifications)
        .set({ read: true, updatedAt: new Date() })
        .where(
          and(notificationRecipientWhere(recipient), eq(notifications.id, id))
        );
    },
    markAllRead: async (recipient: ResolvedRecipient): Promise<number> => {
      const result = await db
        .update(notifications)
        .set({ read: true, updatedAt: new Date() })
        .where(
          and(notificationRecipientWhere(recipient), eq(notifications.read, false))
        );

      if (typeof result === "object" && "affectedRows" in result) {
        return Number(result.affectedRows ?? 0);
      }
      return 0;
    },
    softDelete: async (
      id: number,
      recipient: ResolvedRecipient
    ): Promise<void> => {
      await db
        .update(notifications)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(
          and(notificationRecipientWhere(recipient), eq(notifications.id, id))
        );
    },
    countUnread: async (recipient: ResolvedRecipient): Promise<number> => {
      const [row] = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(notifications)
        .where(
          and(notificationRecipientWhere(recipient), eq(notifications.read, false))
        );
      return row?.count ?? 0;
    },
    getPreferences: async (
      recipient: ResolvedRecipient
    ): Promise<NotificationPreference | null> => {
      const preference = await db.query.notificationPreferences.findFirst({
        where: preferenceRecipientWhere(recipient),
      });
      return preference ?? null;
    },
    savePreferences: async (
      recipient: ResolvedRecipient,
      updates: PreferenceUpdateInput
    ): Promise<NotificationPreference> => {
      const now = new Date();
      const values: InsertNotificationPreference = preferencesFromRecipient(
        recipient,
        updates,
        { updatedAt: now }
      );

      await db
        .insert(notificationPreferences)
        .values(values)
        .onDuplicateKeyUpdate({
          set: {
            ...values,
            updatedAt: now,
            isDeleted: values.isDeleted,
          },
        });

      const saved = await db.query.notificationPreferences.findFirst({
        where: preferenceRecipientWhere(recipient),
      });

      if (!saved) {
        return normalizePreferenceRecord({
          ...values,
          id: 0,
          createdAt: values.createdAt ?? now,
          updatedAt: values.updatedAt ?? now,
        });
      }

      return normalizePreferenceRecord({
        ...saved,
        id: saved.id,
      });
    },
  };
}

export async function getNotificationRepository(): Promise<NotificationRepository> {
  const dbInstance = await getDb();
  if (!dbInstance) {
    logger.warn("Database unavailable, using in-memory notification store");
    return inMemoryRepository;
  }
  return createDbRepository(dbInstance);
}

export function resetNotificationRepositoryState(): void {
  inMemoryNotifications.splice(0, inMemoryNotifications.length);
  inMemoryPreferences.clear();
  inMemoryNotificationId = 1;
  inMemoryPreferenceId = 1;
}

export function getDefaultPreferenceFlags(): PreferenceFlags {
  return { ...defaultPreferences };
}
