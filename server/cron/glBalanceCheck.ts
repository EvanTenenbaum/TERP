import cron from "node-cron";
import { getDb } from "../db";
import { logger } from "../_core/logger";
import { isCronLeader } from "../utils/cronLeaderElection";
import { ledgerEntries } from "../../drizzle/schema";
import { sql, isNull } from "drizzle-orm";

/**
 * GL Balance Verification Cron Job
 *
 * OBS-001: Runs daily to verify GL balance integrity
 *
 * Schedule: 0 6 * * * (every day at 6:00 AM, before business hours)
 *
 * This cron job:
 * 1. Sums all debits and credits in ledger_entries
 * 2. Checks if total debits = total credits (within $0.01 tolerance)
 * 3. If imbalanced, identifies affected date ranges
 * 4. Logs alerts for imbalances
 *
 * IMPORTANT: GL should always balance. An imbalance indicates:
 * - Missing journal entries (one-sided posting)
 * - Silent failures in accounting operations
 * - Data corruption
 */

interface GLCheckResult {
  balanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
  affectedDateRanges: Array<{
    date: string;
    debits: number;
    credits: number;
    difference: number;
  }>;
  timestamp: string;
}

/**
 * Check GL balance and identify imbalanced date ranges
 */
export async function checkGLBalance(): Promise<GLCheckResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const timestamp = new Date().toISOString();

  // Step 1: Get total debits and credits (excluding soft-deleted entries)
  const [totals] = await db
    .select({
      totalDebits: sql<string>`COALESCE(SUM(CAST(${ledgerEntries.debit} AS DECIMAL(20,2))), 0)`,
      totalCredits: sql<string>`COALESCE(SUM(CAST(${ledgerEntries.credit} AS DECIMAL(20,2))), 0)`,
    })
    .from(ledgerEntries)
    .where(isNull(ledgerEntries.deletedAt));

  const totalDebits = parseFloat(totals?.totalDebits || "0");
  const totalCredits = parseFloat(totals?.totalCredits || "0");
  const difference = Math.abs(totalDebits - totalCredits);

  // Tolerance: $0.01 (one cent) to account for floating point precision
  const balanced = difference <= 0.01;

  const result: GLCheckResult = {
    balanced,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    affectedDateRanges: [],
    timestamp,
  };

  // Step 2: If imbalanced, find which dates are affected
  if (!balanced) {
    logger.warn(
      {
        totalDebits: result.totalDebits,
        totalCredits: result.totalCredits,
        difference: result.difference,
      },
      "GL IMBALANCE DETECTED - investigating affected dates"
    );

    // Get per-date totals for dates with imbalances
    const dailyTotals = await db
      .select({
        entryDate: ledgerEntries.entryDate,
        debits: sql<string>`COALESCE(SUM(CAST(${ledgerEntries.debit} AS DECIMAL(20,2))), 0)`,
        credits: sql<string>`COALESCE(SUM(CAST(${ledgerEntries.credit} AS DECIMAL(20,2))), 0)`,
      })
      .from(ledgerEntries)
      .where(isNull(ledgerEntries.deletedAt))
      .groupBy(ledgerEntries.entryDate)
      .orderBy(ledgerEntries.entryDate);

    for (const day of dailyTotals) {
      const dayDebits = parseFloat(day.debits);
      const dayCredits = parseFloat(day.credits);
      const dayDiff = Math.abs(dayDebits - dayCredits);

      // Only report dates with imbalances > $0.01
      if (dayDiff > 0.01) {
        result.affectedDateRanges.push({
          date: String(day.entryDate),
          debits: Math.round(dayDebits * 100) / 100,
          credits: Math.round(dayCredits * 100) / 100,
          difference: Math.round(dayDiff * 100) / 100,
        });
      }
    }

    logger.error(
      {
        affectedDates: result.affectedDateRanges.length,
        topImbalances: result.affectedDateRanges.slice(0, 5),
      },
      "GL IMBALANCE - affected dates identified"
    );
  }

  return result;
}

/**
 * Start the GL Balance Verification cron job
 */
export function startGLBalanceCheckCron() {
  // Run every day at 6:00 AM (before business hours)
  cron.schedule("0 6 * * *", async () => {
    // Skip if not the leader instance (multi-instance deployment)
    if (!isCronLeader()) {
      logger.debug("[GLBalanceCheck] Skipping - not the leader instance");
      return;
    }

    const timestamp = new Date().toISOString();
    logger.info({ timestamp }, "Starting GL balance verification job");

    try {
      const result = await checkGLBalance();

      if (result.balanced) {
        logger.info(
          {
            timestamp,
            totalDebits: result.totalDebits,
            totalCredits: result.totalCredits,
          },
          "GL Balance Check PASSED - debits equal credits"
        );
      } else {
        // CRITICAL: GL imbalance detected
        logger.error(
          {
            timestamp,
            totalDebits: result.totalDebits,
            totalCredits: result.totalCredits,
            difference: result.difference,
            affectedDates: result.affectedDateRanges.length,
          },
          "GL Balance Check FAILED - IMBALANCE DETECTED"
        );

        // Log each affected date for investigation
        for (const range of result.affectedDateRanges) {
          logger.error(
            {
              date: range.date,
              debits: range.debits,
              credits: range.credits,
              difference: range.difference,
            },
            "GL imbalance on date"
          );
        }

        // TODO: Add notification/alert to admin when notifications are enabled
        // await sendGLImbalanceAlert(result);
      }
    } catch (error) {
      logger.error(
        { error, timestamp },
        "Fatal error running GL balance verification job"
      );
    }
  });

  logger.info("GL Balance Check cron job started (runs daily at 6:00 AM)");
  logger.info(
    "GL Balance Check: Leader election enabled (only leader executes)"
  );
}

/**
 * Stop the GL Balance Check cron job
 */
export function stopGLBalanceCheckCron() {
  logger.info("GL Balance Check cron job stop requested");
}
