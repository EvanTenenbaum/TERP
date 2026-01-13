/**
 * Session Timeout Cron Job (MEET-075-BE)
 *
 * Periodically processes expired live shopping sessions and sends timeout warnings.
 *
 * Schedule:
 * - processExpiredSessions: Every 30 seconds (to catch expirations promptly)
 * - sendTimeoutWarnings: Every 60 seconds (to warn users before expiry)
 */

import cron, { type ScheduledTask } from "node-cron";
import { sessionTimeoutService } from "../services/live-shopping/sessionTimeoutService";
import { logger } from "../_core/logger";

let isRunningExpiredCheck = false;
let isRunningWarningCheck = false;

/**
 * Process expired sessions
 * Runs every 30 seconds to ensure timely session cleanup
 */
async function processExpiredSessions(): Promise<void> {
  // Prevent overlapping runs
  if (isRunningExpiredCheck) {
    logger.debug(
      "[SessionTimeoutCron] Skipping expired check - previous run still in progress"
    );
    return;
  }

  isRunningExpiredCheck = true;

  try {
    const processedCount = await sessionTimeoutService.processExpiredSessions();
    if (processedCount > 0) {
      logger.info({
        msg: "[SessionTimeoutCron] Processed expired sessions",
        count: processedCount,
      });
    }
  } catch (error) {
    logger.error({
      msg: "[SessionTimeoutCron] Failed to process expired sessions",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isRunningExpiredCheck = false;
  }
}

/**
 * Send timeout warnings to sessions nearing expiration
 * Runs every 60 seconds
 */
async function sendTimeoutWarnings(): Promise<void> {
  // Prevent overlapping runs
  if (isRunningWarningCheck) {
    logger.debug(
      "[SessionTimeoutCron] Skipping warning check - previous run still in progress"
    );
    return;
  }

  isRunningWarningCheck = true;

  try {
    const warningsSent = await sessionTimeoutService.sendTimeoutWarnings();
    if (warningsSent > 0) {
      logger.info({
        msg: "[SessionTimeoutCron] Sent timeout warnings",
        count: warningsSent,
      });
    }
  } catch (error) {
    logger.error({
      msg: "[SessionTimeoutCron] Failed to send timeout warnings",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isRunningWarningCheck = false;
  }
}

// Store references to scheduled tasks for potential cleanup
let expiredSessionsTask: ScheduledTask | null = null;
let warningsTask: ScheduledTask | null = null;

/**
 * Start the session timeout cron jobs
 */
export function startSessionTimeoutCron(): void {
  // Process expired sessions every 30 seconds
  // Cron: */30 * * * * * (every 30 seconds)
  expiredSessionsTask = cron.schedule("*/30 * * * * *", processExpiredSessions);

  // Send timeout warnings every 60 seconds
  // Cron: * * * * * (every minute)
  warningsTask = cron.schedule("* * * * *", sendTimeoutWarnings);

  logger.info("[SessionTimeoutCron] Session timeout cron jobs started");
  logger.info(
    "[SessionTimeoutCron] - Expired sessions check: every 30 seconds"
  );
  logger.info("[SessionTimeoutCron] - Timeout warnings: every minute");
}

/**
 * Stop all session timeout cron jobs
 */
export function stopSessionTimeoutCron(): void {
  if (expiredSessionsTask) {
    expiredSessionsTask.stop();
    expiredSessionsTask = null;
  }
  if (warningsTask) {
    warningsTask.stop();
    warningsTask = null;
  }
  logger.info("[SessionTimeoutCron] Session timeout cron jobs stopped");
}
