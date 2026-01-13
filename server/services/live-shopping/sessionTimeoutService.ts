/**
 * Session Timeout Service (MEET-075-BE)
 *
 * Handles session timeout management, auto-release, and extension functionality.
 * This service manages:
 * - Session timeout calculation and tracking
 * - Auto-release of inventory when sessions timeout
 * - Session activity tracking
 * - Session extension handling
 */
import { getDb } from "../../db";
import { eq, and, lte, inArray, sql } from "drizzle-orm";
import { liveShoppingSessions, sessionCartItems } from "../../../drizzle/schema-live-shopping";
import { batches } from "../../../drizzle/schema";
import { sessionEventManager } from "../../lib/sse/sessionEventManager";
import { logger } from "../../_core/logger";

// Default timeout in seconds (2 hours)
const DEFAULT_TIMEOUT_SECONDS = 7200;

// Warning threshold - warn when 5 minutes remaining
const WARNING_THRESHOLD_SECONDS = 300;

export interface TimeoutStatus {
  sessionId: number;
  expiresAt: Date | null;
  remainingSeconds: number;
  isExpired: boolean;
  isWarning: boolean; // True when less than 5 minutes remaining
  autoReleaseEnabled: boolean;
  extensionCount: number;
}

export interface SessionTimeoutConfig {
  timeoutSeconds?: number;
  autoReleaseEnabled?: boolean;
}

export const sessionTimeoutService = {
  /**
   * Calculate and set expiration time for a session
   * Called when session is started or resumed
   */
  async setSessionTimeout(
    sessionId: number,
    config?: SessionTimeoutConfig
  ): Promise<Date | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const session = await db.query.liveShoppingSessions.findFirst({
      where: eq(liveShoppingSessions.id, sessionId),
    });

    if (!session) throw new Error("Session not found");

    const timeoutSeconds = config?.timeoutSeconds ?? session.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;

    // If timeout is 0, no expiration
    if (timeoutSeconds === 0) {
      await db.update(liveShoppingSessions)
        .set({
          expiresAt: null,
          timeoutSeconds: 0,
          autoReleaseEnabled: config?.autoReleaseEnabled ?? session.autoReleaseEnabled ?? true,
        })
        .where(eq(liveShoppingSessions.id, sessionId));
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutSeconds * 1000);

    await db.update(liveShoppingSessions)
      .set({
        expiresAt,
        timeoutSeconds,
        lastActivityAt: now,
        autoReleaseEnabled: config?.autoReleaseEnabled ?? session.autoReleaseEnabled ?? true,
      })
      .where(eq(liveShoppingSessions.id, sessionId));

    return expiresAt;
  },

  /**
   * Update last activity timestamp for a session
   * Called on cart updates, price changes, etc.
   */
  async updateActivity(sessionId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db.update(liveShoppingSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(liveShoppingSessions.id, sessionId));
  },

  /**
   * Extend session timeout
   * Adds additional time to the current expiration
   */
  async extendTimeout(
    sessionId: number,
    additionalSeconds: number = DEFAULT_TIMEOUT_SECONDS
  ): Promise<TimeoutStatus> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const session = await db.query.liveShoppingSessions.findFirst({
      where: eq(liveShoppingSessions.id, sessionId),
    });

    if (!session) throw new Error("Session not found");
    if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
      throw new Error("Cannot extend timeout on inactive session");
    }

    const now = new Date();
    const currentExpiry = session.expiresAt || now;
    const baseTime = currentExpiry > now ? currentExpiry : now;
    const newExpiresAt = new Date(baseTime.getTime() + additionalSeconds * 1000);

    await db.update(liveShoppingSessions)
      .set({
        expiresAt: newExpiresAt,
        extensionCount: sql`${liveShoppingSessions.extensionCount} + 1`,
        lastActivityAt: now,
      })
      .where(eq(liveShoppingSessions.id, sessionId));

    // Emit extension event
    sessionEventManager.emit(sessionEventManager.getRoomId(sessionId), {
      type: "TIMEOUT_EXTENDED",
      payload: {
        sessionId,
        newExpiresAt: newExpiresAt.toISOString(),
        extensionCount: (session.extensionCount || 0) + 1,
      },
    });

    return this.getTimeoutStatus(sessionId);
  },

  /**
   * Get current timeout status for a session
   */
  async getTimeoutStatus(sessionId: number): Promise<TimeoutStatus> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const session = await db.query.liveShoppingSessions.findFirst({
      where: eq(liveShoppingSessions.id, sessionId),
      columns: {
        id: true,
        expiresAt: true,
        autoReleaseEnabled: true,
        extensionCount: true,
        timeoutSeconds: true,
      },
    });

    if (!session) throw new Error("Session not found");

    const now = new Date();
    const expiresAt = session.expiresAt;

    // No timeout configured
    if (!expiresAt || session.timeoutSeconds === 0) {
      return {
        sessionId,
        expiresAt: null,
        remainingSeconds: -1, // -1 indicates no timeout
        isExpired: false,
        isWarning: false,
        autoReleaseEnabled: session.autoReleaseEnabled ?? true,
        extensionCount: session.extensionCount ?? 0,
      };
    }

    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    return {
      sessionId,
      expiresAt,
      remainingSeconds,
      isExpired: remainingMs <= 0,
      isWarning: remainingSeconds > 0 && remainingSeconds <= WARNING_THRESHOLD_SECONDS,
      autoReleaseEnabled: session.autoReleaseEnabled ?? true,
      extensionCount: session.extensionCount ?? 0,
    };
  },

  /**
   * Process expired sessions
   * This should be called periodically (e.g., by a cron job or background task)
   * Returns the number of sessions processed
   */
  async processExpiredSessions(): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();

    // Find all active/paused sessions that have expired
    const expiredSessions = await db
      .select({
        id: liveShoppingSessions.id,
        autoReleaseEnabled: liveShoppingSessions.autoReleaseEnabled,
        roomCode: liveShoppingSessions.roomCode,
      })
      .from(liveShoppingSessions)
      .where(
        and(
          inArray(liveShoppingSessions.status, ["ACTIVE", "PAUSED"]),
          lte(liveShoppingSessions.expiresAt, now)
        )
      );

    let processedCount = 0;

    for (const session of expiredSessions) {
      try {
        // Update session status to ENDED
        await db.update(liveShoppingSessions)
          .set({
            status: "ENDED",
            endedAt: now,
            internalNotes: sql`CONCAT(COALESCE(${liveShoppingSessions.internalNotes}, ''), '\n[AUTO] Session timed out at ', ${now.toISOString()})`,
          })
          .where(eq(liveShoppingSessions.id, session.id));

        // Emit timeout event
        sessionEventManager.emit(sessionEventManager.getRoomId(session.id), {
          type: "SESSION_TIMEOUT",
          payload: {
            sessionId: session.id,
            status: "ENDED",
            reason: "timeout",
            autoReleaseEnabled: session.autoReleaseEnabled,
            timestamp: now.toISOString(),
          },
        });

        // Also emit status change for compatibility
        sessionEventManager.emitStatusChange(session.id, "ENDED");

        logger.info({
          msg: "Session timed out",
          sessionId: session.id,
          roomCode: session.roomCode,
          autoReleaseEnabled: session.autoReleaseEnabled,
        });

        processedCount++;
      } catch (error) {
        logger.error({
          msg: "Failed to process expired session",
          sessionId: session.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return processedCount;
  },

  /**
   * Get sessions that will expire soon (for warning notifications)
   * Returns sessions expiring within the warning threshold
   */
  async getSessionsNearingTimeout(): Promise<Array<{ sessionId: number; remainingSeconds: number; roomCode: string }>> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const warningThreshold = new Date(now.getTime() + WARNING_THRESHOLD_SECONDS * 1000);

    const sessions = await db
      .select({
        id: liveShoppingSessions.id,
        expiresAt: liveShoppingSessions.expiresAt,
        roomCode: liveShoppingSessions.roomCode,
      })
      .from(liveShoppingSessions)
      .where(
        and(
          inArray(liveShoppingSessions.status, ["ACTIVE", "PAUSED"]),
          lte(liveShoppingSessions.expiresAt, warningThreshold),
          sql`${liveShoppingSessions.expiresAt} > ${now}`
        )
      );

    return sessions.map((session) => ({
      sessionId: session.id,
      remainingSeconds: session.expiresAt
        ? Math.max(0, Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000))
        : 0,
      roomCode: session.roomCode,
    }));
  },

  /**
   * Send timeout warnings to sessions nearing expiration
   * This should be called periodically
   */
  async sendTimeoutWarnings(): Promise<number> {
    const sessions = await this.getSessionsNearingTimeout();

    for (const session of sessions) {
      sessionEventManager.emit(sessionEventManager.getRoomId(session.sessionId), {
        type: "TIMEOUT_WARNING",
        payload: {
          sessionId: session.sessionId,
          remainingSeconds: session.remainingSeconds,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return sessions.length;
  },

  /**
   * Disable timeout for a session (make it indefinite)
   */
  async disableTimeout(sessionId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.update(liveShoppingSessions)
      .set({
        timeoutSeconds: 0,
        expiresAt: null,
      })
      .where(eq(liveShoppingSessions.id, sessionId));

    sessionEventManager.emit(sessionEventManager.getRoomId(sessionId), {
      type: "TIMEOUT_DISABLED",
      payload: {
        sessionId,
        timestamp: new Date().toISOString(),
      },
    });
  },
};
