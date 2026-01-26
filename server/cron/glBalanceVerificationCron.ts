import cron from "node-cron";
import { getDb } from "../db";
import { ledgerEntries } from "../../drizzle/schema";
import { sql, eq, isNull } from "drizzle-orm";
import { logger } from "../_core/logger";
import { isCronLeader } from "../utils/cronLeaderElection";
import Decimal from "decimal.js";

/**
 * GL Balance Verification Cron Job (OBS-001)
 *
 * Runs daily at 1:00 AM to verify double-entry accounting integrity.
 *
 * Schedule: 0 1 * * * (every day at 1:00 AM)
 *
 * This cron job:
 * 1. Sums all debit entries in the general ledger
 * 2. Sums all credit entries in the general ledger
 * 3. Alerts if the difference exceeds $0.01 (threshold for floating point)
 * 4. Logs results for monitoring and auditing
 *
 * Related: OBS-001 GL Balance Verification
 */

interface GLBalanceResult {
  totalDebits: Decimal;
  totalCredits: Decimal;
  difference: Decimal;
  isBalanced: boolean;
  entryCount: number;
  checkTimestamp: Date;
}

/**
 * Verify GL balance - debits should equal credits
 */
export async function verifyGLBalance(): Promise<GLBalanceResult> {
  const db = await getDb();
  const checkTimestamp = new Date();

  // Query sum of debits and credits from ledger entries
  // Only consider non-deleted entries
  const result = await db
    .select({
      totalDebits: sql<string>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
      totalCredits: sql<string>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
      entryCount: sql<number>`COUNT(*)`,
    })
    .from(ledgerEntries)
    .where(isNull(ledgerEntries.deletedAt));

  const row = result[0];
  const totalDebits = new Decimal(row?.totalDebits ?? "0");
  const totalCredits = new Decimal(row?.totalCredits ?? "0");
  const difference = totalDebits.minus(totalCredits).abs();

  // $0.01 threshold for floating point rounding
  const isBalanced = difference.lessThanOrEqualTo(new Decimal("0.01"));

  return {
    totalDebits,
    totalCredits,
    difference,
    isBalanced,
    entryCount: row?.entryCount ?? 0,
    checkTimestamp,
  };
}

/**
 * Get GL balance by account type for detailed reporting
 */
export async function verifyGLBalanceByAccount(): Promise<{
  accounts: Array<{
    accountId: number;
    accountNumber: string;
    accountName: string;
    totalDebits: string;
    totalCredits: string;
    balance: string;
  }>;
  overallBalanced: boolean;
}> {
  const db = await getDb();

  const result = await db.execute(sql`
    SELECT
      a.id as accountId,
      a.accountNumber,
      a.accountName,
      COALESCE(SUM(le.debit), 0) as totalDebits,
      COALESCE(SUM(le.credit), 0) as totalCredits,
      COALESCE(SUM(le.debit), 0) - COALESCE(SUM(le.credit), 0) as balance
    FROM accounts a
    LEFT JOIN ledgerEntries le ON le.accountId = a.id AND le.deleted_at IS NULL
    WHERE a.deleted_at IS NULL
    GROUP BY a.id, a.accountNumber, a.accountName
    ORDER BY a.accountNumber
  `);

  const accounts = (result[0] as unknown as Array<{
    accountId: number;
    accountNumber: string;
    accountName: string;
    totalDebits: string;
    totalCredits: string;
    balance: string;
  }>) ?? [];

  // Check overall balance
  const totalDebits = accounts.reduce(
    (sum, acc) => sum.plus(new Decimal(acc.totalDebits)),
    new Decimal(0)
  );
  const totalCredits = accounts.reduce(
    (sum, acc) => sum.plus(new Decimal(acc.totalCredits)),
    new Decimal(0)
  );
  const overallBalanced = totalDebits.minus(totalCredits).abs().lessThanOrEqualTo(new Decimal("0.01"));

  return { accounts, overallBalanced };
}

export function startGLBalanceVerificationCron() {
  // Run every day at 1:00 AM
  cron.schedule("0 1 * * *", async () => {
    // Skip if not the leader instance (multi-instance deployment)
    if (!isCronLeader()) {
      logger.debug("[GLBalanceCron] Skipping - not the leader instance");
      return;
    }

    const timestamp = new Date().toISOString();
    logger.info({ timestamp }, "Starting GL balance verification job");

    try {
      const result = await verifyGLBalance();

      if (result.isBalanced) {
        logger.info(
          {
            timestamp,
            totalDebits: result.totalDebits.toString(),
            totalCredits: result.totalCredits.toString(),
            difference: result.difference.toString(),
            entryCount: result.entryCount,
            status: "BALANCED",
          },
          "GL balance verification passed - debits equal credits"
        );
      } else {
        // ALERT: GL is out of balance
        logger.error(
          {
            timestamp,
            totalDebits: result.totalDebits.toString(),
            totalCredits: result.totalCredits.toString(),
            difference: result.difference.toString(),
            entryCount: result.entryCount,
            status: "OUT_OF_BALANCE",
          },
          "GL BALANCE ALERT: Debits do not equal credits!"
        );

        // Get detailed breakdown for troubleshooting
        try {
          const detailedResult = await verifyGLBalanceByAccount();
          logger.error(
            {
              accountCount: detailedResult.accounts.length,
              accounts: detailedResult.accounts.map((a) => ({
                number: a.accountNumber,
                name: a.accountName,
                debits: a.totalDebits,
                credits: a.totalCredits,
                balance: a.balance,
              })),
            },
            "GL balance breakdown by account"
          );
        } catch (detailError) {
          logger.error(
            { error: detailError },
            "Failed to get detailed GL breakdown"
          );
        }
      }
    } catch (error) {
      logger.error(
        { error, timestamp },
        "Fatal error running GL balance verification job"
      );
    }
  });

  logger.info("GL balance verification cron job started (runs daily at 1:00 AM)");
  logger.info("GL balance cron: Leader election enabled (only leader executes)");
}

/**
 * Stop the GL balance verification cron job
 * Note: To properly stop, keep a reference to the scheduled task
 */
export function stopGLBalanceVerificationCron() {
  logger.info("GL balance verification cron job stop requested");
}
