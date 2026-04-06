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

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

/**
 * Circuit breaker states for DB connectivity protection.
 *
 * CLOSED  — Normal operation; all calls go to DB.
 * OPEN    — DB is down; all calls go to in-memory fallback. After
 *           CIRCUIT_RESET_MS milliseconds, the breaker transitions to HALF_OPEN.
 * HALF_OPEN — One probe call is allowed through to the DB to test recovery.
 *             Success → CLOSED; failure → OPEN (resets the timer).
 */
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const CIRCUIT_FAILURE_THRESHOLD = 3; // consecutive DB failures before opening
const CIRCUIT_RESET_MS = 30_000; // ms in OPEN state before trying HALF_OPEN

interface CircuitBreaker {
  state: CircuitState;
  consecutiveFailures: number;
  openedAt: number | null; // Date.now() when circuit opened
}

const circuitBreaker: CircuitBreaker = {
  state: "CLOSED",
  consecutiveFailures: 0,
  openedAt: null,
};

function recordCircuitSuccess(): void {
  if (circuitBreaker.state !== "CLOSED") {
    logger.info(
      { previousState: circuitBreaker.state },
      "[NotificationRepository] Circuit breaker CLOSED — DB recovered"
    );
  }
  circuitBreaker.state = "CLOSED";
  circuitBreaker.consecutiveFailures = 0;
  circuitBreaker.openedAt = null;
}

function recordCircuitFailure(): void {
  circuitBreaker.consecutiveFailures += 1;

  if (
    circuitBreaker.state === "CLOSED" &&
    circuitBreaker.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD
  ) {
    circuitBreaker.state = "OPEN";
    circuitBreaker.openedAt = Date.now();
    logger.warn(
      { consecutiveFailures: circuitBreaker.consecutiveFailures },
      "[NotificationRepository] Circuit breaker OPEN — switching to in-memory fallback"
    );
    return;
  }

  if (circuitBreaker.state === "HALF_OPEN") {
    // Probe failed — re-open the circuit
    circuitBreaker.state = "OPEN";
    circuitBreaker.openedAt = Date.now();
    logger.warn(
      {},
      "[NotificationRepository] Circuit breaker OPEN (probe failed) — remaining on in-memory fallback"
    );
  }
}

/**
 * Returns whether a DB call should be attempted given the current circuit state.
 * Handles the OPEN → HALF_OPEN timeout transition automatically.
 */
function shouldAttemptDb(): boolean {
  if (circuitBreaker.state === "CLOSED") {
    return true;
  }

  if (circuitBreaker.state === "OPEN") {
    const elapsed = Date.now() - (circuitBreaker.openedAt ?? 0);
    if (elapsed >= CIRCUIT_RESET_MS) {
      circuitBreaker.state = "HALF_OPEN";
      logger.info(
        {},
        "[NotificationRepository] Circuit breaker HALF_OPEN — probing DB"
      );
      return true;
    }
    return false;
  }

  // HALF_OPEN: allow the single probe through
  return true;
}

/**
 * Wrap a DB call with circuit breaker logic. Falls back to the provided
 * fallback function when the circuit is open or when the DB call fails.
 */
async function withCircuitBreaker<T>(
  dbCall: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  if (!shouldAttemptDb()) {
    return fallback();
  }

  try {
    const result = await dbCall();
    recordCircuitSuccess();
    return result;
  } catch (error) {
    recordCircuitFailure();
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "[NotificationRepository] DB call failed — using in-memory fallback"
    );
    return fallback();
  }
}

export type NotificationChannel = "in_app" | "email" | "sms";
export type NotificationType = "info" | "warning" | "success" | "error";
export type NotificationCategory =
  | "appointment"
  | "order"
  | "system"
  | "general";

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
  getPreferences: (
    recipient: ResolvedRecipient
  ) => Promise<NotificationPreference | null>;
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

export const resolveRecipient = (
  input: NotificationRecipient
): ResolvedRecipient => {
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
    inAppEnabled: preference.inAppEnabled ?? defaultPreferences.inAppEnabled,
    emailEnabled: preference.emailEnabled ?? defaultPreferences.emailEnabled,
    smsEnabled: preference.smsEnabled ?? false,
    appointmentReminders:
      preference.appointmentReminders ??
      defaultPreferences.appointmentReminders,
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
    return (
      record.userId === recipient.userId &&
      (record.isDeleted ?? false) === false
    );
  }
  return (
    record.clientId === recipient.clientId &&
    (record.isDeleted ?? false) === false
  );
};

const notificationRecipientWhere = (recipient: ResolvedRecipient) =>
  and(
    eq(notifications.recipientType, recipient.recipientType),
    recipient.recipientType === "user"
      ? eq(notifications.userId, ensureIdentifier(recipient.userId))
      : eq(notifications.clientId, ensureIdentifier(recipient.clientId)),
    or(eq(notifications.isDeleted, false), isNull(notifications.isDeleted))
  );

const notificationInboxWhere = (recipient: ResolvedRecipient) =>
  and(
    notificationRecipientWhere(recipient),
    eq(notifications.channel, "in_app")
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

// ============================================================================
// IN-MEMORY STORE (degraded mode)
// ============================================================================

/**
 * Extended in-memory notification record that tracks whether this entry has
 * been synced to the DB. When the circuit closes, `flushInMemoryToDb` will
 * write all entries where `pendingSync === true` to the DB.
 */
interface InMemoryNotification extends Notification {
  pendingSync: boolean;
}

const inMemoryNotifications: InMemoryNotification[] = [];
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
      pendingSync: true,
    });
    return id;
  },
  listNotifications: async (
    recipient: ResolvedRecipient,
    limit: number,
    offset: number
  ): Promise<Notification[]> => {
    return inMemoryNotifications
      .filter(
        item => matchesRecipient(item, recipient) && item.channel === "in_app"
      )
      .sort(
        (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      )
      .slice(offset, offset + limit);
  },
  markRead: async (id: number, recipient: ResolvedRecipient): Promise<void> => {
    const target = inMemoryNotifications.find(
      item => item.id === id && matchesRecipient(item, recipient)
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
      if (
        matches &&
        item.channel === "in_app" &&
        !item.read &&
        !item.isDeleted
      ) {
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
      item => item.id === id && matchesRecipient(item, recipient)
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
        item.channel === "in_app" &&
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
      const [created] = await db
        .insert(notifications)
        .values(input)
        .$returningId();
      return created?.id ?? 0;
    },
    listNotifications: async (
      recipient: ResolvedRecipient,
      limit: number,
      offset: number
    ): Promise<Notification[]> => {
      try {
        return await db.query.notifications.findMany({
          where: notificationInboxWhere(recipient),
          orderBy: [desc(notifications.createdAt)],
          limit,
          offset,
        });
      } catch (error) {
        logger.error(
          { error, recipient },
          "Database error fetching notifications"
        );
        throw error; // Let router handle conversion to TRPCError
      }
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
          and(notificationInboxWhere(recipient), eq(notifications.read, false))
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
          and(notificationInboxWhere(recipient), eq(notifications.read, false))
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

// ============================================================================
// PENDING SYNC FLUSH
// ============================================================================

/**
 * Attempt to write all in-memory notifications that have `pendingSync === true`
 * into the DB. Called automatically when the circuit breaker closes (DB
 * recovers). Notifications that are successfully synced are marked
 * `pendingSync = false` so they are not re-written on the next flush.
 *
 * This is best-effort: individual insert failures are logged but do not abort
 * the batch.
 */
async function flushInMemoryToDb(db: Database): Promise<void> {
  const pending = inMemoryNotifications.filter(
    n => n.pendingSync && !n.isDeleted
  );
  if (pending.length === 0) {
    return;
  }

  logger.info(
    { count: pending.length },
    "[NotificationRepository] Flushing in-memory notifications to DB"
  );

  for (const notification of pending) {
    try {
      const { pendingSync: _pendingSync, ...insertPayload } = notification;
      await db.insert(notifications).values(insertPayload);
      notification.pendingSync = false;
    } catch (error) {
      logger.error(
        {
          notificationId: notification.id,
          error: error instanceof Error ? error.message : String(error),
        },
        "[NotificationRepository] Failed to sync in-memory notification to DB"
      );
      // Continue — do not abort the whole batch
    }
  }
}

// ============================================================================
// PERIODIC FLUSH INTERVAL
// ============================================================================

const FLUSH_INTERVAL_MS = 30_000; // attempt flush every 30 seconds

let flushIntervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background flush interval. Safe to call multiple times — only
 * starts one interval. Tests can stop it via `stopNotificationFlushInterval`.
 */
export function startNotificationFlushInterval(): void {
  if (flushIntervalHandle !== null) {
    return;
  }
  flushIntervalHandle = setInterval(() => {
    void (async () => {
      const pending = inMemoryNotifications.filter(n => n.pendingSync);
      if (pending.length === 0) {
        return;
      }
      const dbInstance = await getDb();
      if (!dbInstance || !shouldAttemptDb()) {
        return;
      }
      try {
        await flushInMemoryToDb(dbInstance);
        recordCircuitSuccess();
      } catch (error) {
        recordCircuitFailure();
        logger.error(
          { error: error instanceof Error ? error.message : String(error) },
          "[NotificationRepository] Periodic flush failed"
        );
      }
    })();
  }, FLUSH_INTERVAL_MS);
}

/** Stop the background flush interval (primarily for tests). */
export function stopNotificationFlushInterval(): void {
  if (flushIntervalHandle !== null) {
    clearInterval(flushIntervalHandle);
    flushIntervalHandle = null;
  }
}

// ============================================================================
// CIRCUIT-BREAKER-AWARE REPOSITORY FACTORY
// ============================================================================

/**
 * Returns a circuit-breaker-wrapped repository. When the circuit is CLOSED the
 * DB repository is used. When OPEN or when DB calls fail, the in-memory
 * repository is used as a degraded fallback. On recovery, pending in-memory
 * notifications are flushed to the DB.
 */
export async function getNotificationRepository(): Promise<NotificationRepository> {
  const dbInstance = await getDb();

  if (!dbInstance) {
    logger.warn("Database unavailable, using in-memory notification store");
    return inMemoryRepository;
  }

  if (!shouldAttemptDb()) {
    // Circuit is OPEN — skip DB entirely
    return inMemoryRepository;
  }

  const dbRepo = createDbRepository(dbInstance);

  return {
    insertNotification: input =>
      withCircuitBreaker(
        async () => {
          const id = await dbRepo.insertNotification(input);
          // Flush any previously pending in-memory entries now that DB is reachable
          void flushInMemoryToDb(dbInstance).catch(err =>
            logger.error(
              { error: err instanceof Error ? err.message : String(err) },
              "[NotificationRepository] Post-insert flush failed"
            )
          );
          return id;
        },
        () => inMemoryRepository.insertNotification(input)
      ),

    listNotifications: (recipient, limit, offset) =>
      withCircuitBreaker(
        () => dbRepo.listNotifications(recipient, limit, offset),
        () => inMemoryRepository.listNotifications(recipient, limit, offset)
      ),

    markRead: (id, recipient) =>
      withCircuitBreaker(
        () => dbRepo.markRead(id, recipient),
        () => inMemoryRepository.markRead(id, recipient)
      ),

    markAllRead: recipient =>
      withCircuitBreaker(
        () => dbRepo.markAllRead(recipient),
        () => inMemoryRepository.markAllRead(recipient)
      ),

    softDelete: (id, recipient) =>
      withCircuitBreaker(
        () => dbRepo.softDelete(id, recipient),
        () => inMemoryRepository.softDelete(id, recipient)
      ),

    countUnread: recipient =>
      withCircuitBreaker(
        () => dbRepo.countUnread(recipient),
        () => inMemoryRepository.countUnread(recipient)
      ),

    getPreferences: recipient =>
      withCircuitBreaker(
        () => dbRepo.getPreferences(recipient),
        () => inMemoryRepository.getPreferences(recipient)
      ),

    savePreferences: (recipient, updates) =>
      withCircuitBreaker(
        () => dbRepo.savePreferences(recipient, updates),
        () => inMemoryRepository.savePreferences(recipient, updates)
      ),
  };
}

export function resetNotificationRepositoryState(): void {
  inMemoryNotifications.splice(0, inMemoryNotifications.length);
  inMemoryPreferences.clear();
  inMemoryNotificationId = 1;
  inMemoryPreferenceId = 1;
  // Reset circuit breaker state for clean test isolation
  circuitBreaker.state = "CLOSED";
  circuitBreaker.consecutiveFailures = 0;
  circuitBreaker.openedAt = null;
}

export function getDefaultPreferenceFlags(): PreferenceFlags {
  return { ...defaultPreferences };
}
