import cron from "node-cron";
import { sendDebtAgingNotifications } from "../services/vipDebtAgingService";
import { logger } from "../_core/logger";
import { isCronLeader } from "../utils/cronLeaderElection";

/**
 * Debt Aging Notifications Cron Job
 *
 * Runs daily at 9 AM to check for overdue VIP invoices and send tiered notifications.
 *
 * Schedule: 0 9 * * * (every day at 9:00 AM)
 *
 * This cron job:
 * 1. Fetches all VIP clients with overdue invoices
 * 2. Identifies invoices at notification intervals (7, 14, 30 days)
 * 3. Sends tier-appropriate notifications via email and in-app
 * 4. Logs results for monitoring
 *
 * Related: MEET-041 VIP Debt Aging Notifications
 */

export function startDebtAgingCron() {
  // Run every day at 9:00 AM (business hours)
  cron.schedule("0 9 * * *", async () => {
    // Skip if not the leader instance (multi-instance deployment)
    if (!isCronLeader()) {
      logger.debug("[DebtAgingCron] Skipping - not the leader instance");
      return;
    }

    const timestamp = new Date().toISOString();
    logger.info({ timestamp }, "Starting debt aging notification job");

    try {
      const result = await sendDebtAgingNotifications();

      logger.info(
        {
          timestamp,
          sent: result.sent,
          skipped: result.skipped,
          errors: result.errors,
        },
        "Debt aging notification job complete"
      );

      // Log summary
      if (result.errors > 0) {
        logger.warn(
          { errors: result.errors },
          "Debt aging notifications completed with errors"
        );
      }
    } catch (error) {
      logger.error(
        { error, timestamp },
        "Fatal error running debt aging notification job"
      );
    }
  });

  logger.info("Debt aging cron job started (runs daily at 9:00 AM)");
  logger.info("Debt aging cron: Leader election enabled (only leader executes)");
}

/**
 * Stop the debt aging cron job
 * Note: To properly stop, keep a reference to the scheduled task
 */
export function stopDebtAgingCron() {
  logger.info("Debt aging cron job stop requested");
}
