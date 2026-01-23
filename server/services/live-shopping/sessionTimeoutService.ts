/**
 * Session Timeout Service (MEET-075-BE)
 *
 * Manages session timeout functionality for Live Shopping Sessions:
 * - Automatic session expiration after configurable timeout
 * - Timeout warnings before expiration
 * - Activity tracking to extend session lifetime
 * - Auto-release of reserved inventory on timeout
 *
 * Default timeout: 2 hours (7200 seconds)
 * Warning threshold: 5 minutes before expiration
 */

import { eq, and, lte, gt, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { liveShoppingSessions } from "../../../drizzle/schema-live-shopping";
import { logger } from "../../_core/logger";
import { sessionEventManager } from "../../lib/sse/sessionEventManager";

// Default timeout in seconds (2 hours)
const DEFAULT_TIMEOUT_SECONDS = 7200;

// Warning threshold in seconds (5 minutes before expiration)
const WARNING_THRESHOLD_SECONDS = 300;

// Maximum number of extensions allowed per session
const MAX_EXTENSIONS = 3;

// Flag to track if the schema is compatible (columns exist)
let schemaCompatible: boolean | null = null;

/**
 * Check if the required columns exist in the database
 * This prevents errors when the schema hasn't been migrated yet
 */
async function checkSchemaCompatibility(): Promise<boolean> {
  // If we've already checked and it was compatible, assume it still is
  if (schemaCompatible === true) {
    return true;
  }

  try {
    const db = await getDb();
    if (!db) return false;

    // Try a simple query that uses the timeout columns
    // If this fails, the columns don't exist
    await db.execute(
      sql`SELECT expiresAt, autoReleaseEnabled FROM liveShoppingSessions LIMIT 1`
    );
    
    schemaCompatible = true;
    logger.info("[SessionTimeoutService] Schema compatibility check passed");
    return true;
  } catch (error) {
    // Schema is not compatible - columns don't exist yet
    if (schemaCompatible !== false) {
      logger.warn({
        msg: "[SessionTimeoutService] Schema not compatible - timeout columns not found. Session timeout features disabled until migration runs.",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    schemaCompatible = false;
    return false;
  }
}

export const sessionTimeoutService = {
  /**
   * Reset schema compatibility flag (for testing or after migrations)
   */
  resetSchemaCheck(): void {
    schemaCompatible = null;
  },

  /**
   * Initialize a session's timeout settings
   * Called when a session is created or started
   */
  async initializeTimeout(
    sessionId: number,
    timeoutSeconds: number = DEFAULT_TIMEOUT_SECONDS
  ): Promise<void> {
    if (!(await checkSchemaCompatibility())) {
      logger.debug("[SessionTimeoutService] Skipping initializeTimeout - schema not compatible");
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutSeconds * 1000);

    await db
      .update(liveShoppingSessions)
      .set({
        timeoutSeconds,
        expiresAt,
        lastActivityAt: now,
        extensionCount: 0,
      })
      .where(eq(liveShoppingSessions.id, sessionId));

    logger.info({
      msg: "Session timeout initialized",
      sessionId,
      timeoutSeconds,
      expiresAt: expiresAt.toISOString(),
    });
  },

  /**
   * Update session activity timestamp
   * Called on significant user interactions to extend the session
   */
  async updateActivity(sessionId: number): Promise<void> {
    if (!(await checkSchemaCompatibility())) {
      return;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();

    // Get current session to calculate new expiry
    const [session] = await db
      .select({
        timeoutSeconds: liveShoppingSessions.timeoutSeconds,
        status: liveShoppingSessions.status,
      })
      .from(liveShoppingSessions)
      .where(eq(liveShoppingSessions.id, sessionId));

    if (!session || !["ACTIVE", "PAUSED"].includes(session.status)) {
      return; // Session not found or not in active state
    }

    const timeoutSeconds = session.timeoutSeconds || DEFAULT_TIMEOUT_SECONDS;
    const newExpiresAt = new Date(now.getTime() + timeoutSeconds * 1000);

    await db
      .update(liveShoppingSessions)
      .set({
        lastActivityAt: now,
        expiresAt: newExpiresAt,
      })
      .where(eq(liveShoppingSessions.id, sessionId));

    logger.debug({
      msg: "Session activity updated",
      sessionId,
      newExpiresAt: newExpiresAt.toISOString(),
    });
  },

  /**
   * Extend a session's timeout
   * Called when user requests more time
   * Returns false if max extensions reached
   */
  async extendTimeout(
    sessionId: number,
    additionalSeconds: number = DEFAULT_TIMEOUT_SECONDS
  ): Promise<boolean> {
    if (!(await checkSchemaCompatibility())) {
      return false;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get current session
    const [session] = await db
      .select({
        extensionCount: liveShoppingSessions.extensionCount,
        expiresAt: liveShoppingSessions.expiresAt,
        status: liveShoppingSessions.status,
        roomCode: liveShoppingSessions.roomCode,
      })
      .from(liveShoppingSessions)
      .where(eq(liveShoppingSessions.id, sessionId));

    if (!session || !["ACTIVE", "PAUSED"].includes(session.status)) {
      return false;
    }

    const currentExtensions = session.extensionCount || 0;
    if (currentExtensions >= MAX_EXTENSIONS) {
      logger.warn({
        msg: "Session extension denied - max extensions reached",
        sessionId,
        currentExtensions,
        maxExtensions: MAX_EXTENSIONS,
      });
      return false;
    }

    const now = new Date();
    const currentExpiry = session.expiresAt || now;
    const newExpiresAt = new Date(
      Math.max(currentExpiry.getTime(), now.getTime()) + additionalSeconds * 1000
    );

    await db
      .update(liveShoppingSessions)
      .set({
        expiresAt: newExpiresAt,
        extensionCount: currentExtensions + 1,
        lastActivityAt: now,
      })
      .where(eq(liveShoppingSessions.id, sessionId));

    // Emit extension event
    sessionEventManager.emit(sessionEventManager.getRoomId(sessionId), {
      type: "SESSION_EXTENDED",
      payload: {
        sessionId,
        newExpiresAt: newExpiresAt.toISOString(),
        extensionsRemaining: MAX_EXTENSIONS - (currentExtensions + 1),
      },
    });

    logger.info({
      msg: "Session timeout extended",
      sessionId,
      roomCode: session.roomCode,
      newExpiresAt: newExpiresAt.toISOString(),
      extensionCount: currentExtensions + 1,
    });

    return true;
  },

  /**
   * Process expired sessions
   * This should be called periodically (e.g., by a cron job or background task)
   * Returns the number of sessions processed
   */
  async processExpiredSessions(): Promise<number> {
    if (!(await checkSchemaCompatibility())) {
      return 0;
    }

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
   * Returns sessions expiring within WARNING_THRESHOLD_SECONDS
   */
  async getSessionsNearingExpiration(): Promise<
    Array<{
      id: number;
      expiresAt: Date;
      roomCode: string;
    }>
  > {
    if (!(await checkSchemaCompatibility())) {
      return [];
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    const warningThreshold = new Date(
      now.getTime() + WARNING_THRESHOLD_SECONDS * 1000
    );

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
          gt(liveShoppingSessions.expiresAt, now)
        )
      );

    return sessions.map((s) => ({
      id: s.id,
      expiresAt: s.expiresAt!,
      roomCode: s.roomCode,
    }));
  },

  /**
   * Send timeout warnings to sessions nearing expiration
   * Returns the number of warnings sent
   */
  async sendTimeoutWarnings(): Promise<number> {
    if (!(await checkSchemaCompatibility())) {
      return 0;
    }

    const sessions = await this.getSessionsNearingExpiration();
    let warningsSent = 0;

    for (const session of sessions) {
      const secondsRemaining = Math.floor(
        (session.expiresAt.getTime() - Date.now()) / 1000
      );

      sessionEventManager.emit(sessionEventManager.getRoomId(session.id), {
        type: "SESSION_TIMEOUT_WARNING",
        payload: {
          sessionId: session.id,
          expiresAt: session.expiresAt.toISOString(),
          secondsRemaining,
          canExtend: true, // TODO: Check extension count
        },
      });

      logger.info({
        msg: "Sent timeout warning",
        sessionId: session.id,
        roomCode: session.roomCode,
        secondsRemaining,
      });

      warningsSent++;
    }

    return warningsSent;
  },

  /**
   * Get timeout status for a session
   */
  async getTimeoutStatus(sessionId: number): Promise<{
    expiresAt: Date | null;
    secondsRemaining: number | null;
    extensionsRemaining: number;
    canExtend: boolean;
  } | null> {
    if (!(await checkSchemaCompatibility())) {
      return null;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [session] = await db
      .select({
        expiresAt: liveShoppingSessions.expiresAt,
        extensionCount: liveShoppingSessions.extensionCount,
        status: liveShoppingSessions.status,
      })
      .from(liveShoppingSessions)
      .where(eq(liveShoppingSessions.id, sessionId));

    if (!session) {
      return null;
    }

    const extensionCount = session.extensionCount || 0;
    const extensionsRemaining = MAX_EXTENSIONS - extensionCount;
    const canExtend =
      extensionsRemaining > 0 &&
      ["ACTIVE", "PAUSED"].includes(session.status);

    if (!session.expiresAt) {
      return {
        expiresAt: null,
        secondsRemaining: null,
        extensionsRemaining,
        canExtend,
      };
    }

    const secondsRemaining = Math.floor(
      (session.expiresAt.getTime() - Date.now()) / 1000
    );

    return {
      expiresAt: session.expiresAt,
      secondsRemaining: Math.max(0, secondsRemaining),
      extensionsRemaining,
      canExtend,
    };
  },
};
