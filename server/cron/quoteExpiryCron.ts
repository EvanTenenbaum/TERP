import cron from "node-cron";
import { logger } from "../_core/logger";
import { isCronLeader } from "../utils/cronLeaderElection";
import { getDb } from "../db";
import { orders } from "../../drizzle/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

/**
 * Quote Expiry Cron Job (DISC-QUO-004)
 *
 * Runs daily at 2:00 AM to automatically expire quotes whose validUntil
 * date has passed while still in SENT status.
 *
 * Schedule: 0 2 * * * (every day at 2:00 AM)
 */
export function startQuoteExpiryCron(): void {
  cron.schedule("0 2 * * *", async () => {
    if (!isCronLeader()) {
      logger.debug("[QuoteExpiry] Skipping - not the leader instance");
      return;
    }

    const timestamp = new Date().toISOString();
    logger.info({ timestamp }, "Starting quote expiry job");

    try {
      const db = await getDb();
      if (!db) {
        logger.warn("[QuoteExpiry] Database not available, skipping");
        return;
      }

      const today = new Date();
      const result = await db
        .update(orders)
        .set({ quoteStatus: "EXPIRED" })
        .where(
          and(
            eq(orders.orderType, "QUOTE"),
            eq(orders.quoteStatus, "SENT"),
            isNull(orders.deletedAt),
            sql`valid_until < ${today}`
          )
        );

      const count = result[0]?.affectedRows || 0;
      if (count > 0) {
        logger.info({ msg: "[QuoteExpiry] Expired quotes", count, timestamp });
      } else {
        logger.debug({ timestamp }, "[QuoteExpiry] No quotes to expire");
      }
    } catch (error) {
      logger.error({
        msg: "[QuoteExpiry] Failed to expire quotes",
        error: error instanceof Error ? error.message : String(error),
        timestamp,
      });
    }
  });

  logger.info("Quote expiry cron job started (runs daily at 2:00 AM)");
}
