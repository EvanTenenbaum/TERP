import cron from "node-cron";
import { runPriceAlertCheck } from "../services/priceAlertsService";
import { logger } from "../_core/logger";
import { isCronLeader } from "../utils/cronLeaderElection";

/**
 * Price Alerts Cron Job
 * Runs every hour to check for triggered price alerts and send notifications
 *
 * Schedule: 0 * * * * (every hour at minute 0)
 *
 * This cron job:
 * 1. Fetches all active price alerts
 * 2. Compares current prices with target prices
 * 3. Identifies triggered alerts (current price <= target price)
 * 4. Sends email notifications to clients
 * 5. Deactivates triggered alerts
 */

export function startPriceAlertsCron() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    // Skip if not the leader instance (multi-instance deployment)
    if (!isCronLeader()) {
      logger.debug("[PriceAlertsCron] Skipping - not the leader instance");
      return;
    }

    const timestamp = new Date().toISOString();
    logger.info({ timestamp }, "[PriceAlertsCron] Running price alerts check");

    try {
      const result = await runPriceAlertCheck();

      logger.info(
        {
          timestamp,
          checked: result.checked,
          triggered: result.triggered,
        },
        "[PriceAlertsCron] Price alerts check complete"
      );
    } catch (error) {
      logger.error(
        {
          timestamp,
          error: error instanceof Error ? error.message : String(error),
        },
        "[PriceAlertsCron] Fatal error running price alerts check"
      );
    }
  });

  logger.info("[PriceAlertsCron] Price alerts cron job started (runs hourly at minute 0)");
  logger.info("[PriceAlertsCron] Next run will be at the top of the next hour");
  logger.info("[PriceAlertsCron] Leader election: enabled (only leader executes)");
}

/**
 * Stop the price alerts cron job
 * (Currently not implemented as node-cron doesn't provide a stop method for individual jobs)
 */
export function stopPriceAlertsCron() {
  logger.info("[PriceAlertsCron] Price alerts cron job stop requested");
  // Note: To stop the cron, you would need to keep a reference to the scheduled task
  // and call task.stop() on it. For now, this is a placeholder.
}
