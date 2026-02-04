/**
 * DATA-DERIVED-GEN: Backfill Script for totalOwed
 * 
 * This script backfills the clients.totalOwed field by calculating
 * it from the sum of unpaid invoices for each client.
 * 
 * Usage: npx tsx scripts/backfill-totalOwed.ts
 */

import { getDb } from "../server/db";
import { syncAllClientBalances } from "../server/services/clientBalanceService";
import { logger } from "../server/_core/logger";

async function main() {
  logger.info({ msg: "Starting totalOwed backfill..." });
  
  const db = await getDb();
  if (!db) {
    logger.error({ msg: "Database not available" });
    process.exit(1);
  }

  try {
    const result = await syncAllClientBalances();
    
    logger.info({
      msg: "totalOwed backfill complete",
      processed: result.processed,
      updated: result.updated,
      errors: result.errors,
    });
    
    if (result.errors > 0) {
      logger.warn({ msg: "Some clients failed to update. Check logs above." });
      process.exit(1);
    }
    
    logger.info({ msg: "All client balances synchronized successfully!" });
    process.exit(0);
  } catch (error) {
    logger.error({ msg: "Backfill failed", error });
    process.exit(1);
  }
}

main();
