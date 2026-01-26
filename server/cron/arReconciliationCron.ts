import cron from "node-cron";
import { getDb } from "../db";
import { invoices, clients } from "../../drizzle/schema";
import { sql, eq, isNull, and, inArray } from "drizzle-orm";
import { logger } from "../_core/logger";
import { isCronLeader } from "../utils/cronLeaderElection";
import Decimal from "decimal.js";

/**
 * AR Reconciliation Check Cron Job (OBS-002)
 *
 * Runs daily at 2:00 AM to verify accounts receivable integrity.
 *
 * Schedule: 0 2 * * * (every day at 2:00 AM)
 *
 * This cron job:
 * 1. Sums open invoice amounts (amountDue) grouped by customer
 * 2. Compares against clients.totalOwed field
 * 3. Alerts on mismatches that could indicate data integrity issues
 * 4. Logs results for monitoring and auditing
 *
 * Related: OBS-002 AR Reconciliation Check
 */

interface ARMismatch {
  clientId: number;
  clientName: string;
  teriCode: string;
  invoiceTotal: string;
  clientTotalOwed: string;
  difference: string;
}

interface ARReconciliationResult {
  totalClients: number;
  clientsWithInvoices: number;
  mismatchCount: number;
  mismatches: ARMismatch[];
  isReconciled: boolean;
  totalInvoiceAR: Decimal;
  totalClientAR: Decimal;
  checkTimestamp: Date;
}

/**
 * Reconcile AR - compare invoice amountDue totals vs client totalOwed
 */
export async function reconcileAR(): Promise<ARReconciliationResult> {
  const db = await getDb();
  const checkTimestamp = new Date();

  // Get sum of open invoices by customer
  // Only include non-voided, non-deleted invoices with outstanding amounts
  const invoicesByCustomer = await db
    .select({
      customerId: invoices.customerId,
      totalAmountDue: sql<string>`COALESCE(SUM(${invoices.amountDue}), 0)`,
    })
    .from(invoices)
    .where(
      and(
        isNull(invoices.deletedAt),
        inArray(invoices.status, ["SENT", "VIEWED", "PARTIAL", "OVERDUE"])
      )
    )
    .groupBy(invoices.customerId);

  // Build a map of customer invoice totals
  const invoiceTotals = new Map<number, Decimal>();
  for (const row of invoicesByCustomer) {
    invoiceTotals.set(row.customerId, new Decimal(row.totalAmountDue));
  }

  // Get all clients with their totalOwed
  const clientRecords = await db
    .select({
      id: clients.id,
      name: clients.name,
      teriCode: clients.teriCode,
      totalOwed: clients.totalOwed,
    })
    .from(clients)
    .where(
      and(
        isNull(clients.deletedAt),
        eq(clients.isBuyer, true)
      )
    );

  const mismatches: ARMismatch[] = [];
  let totalInvoiceAR = new Decimal(0);
  let totalClientAR = new Decimal(0);

  for (const client of clientRecords) {
    const invoiceTotal = invoiceTotals.get(client.id) ?? new Decimal(0);
    const clientOwed = new Decimal(client.totalOwed ?? "0");

    totalInvoiceAR = totalInvoiceAR.plus(invoiceTotal);
    totalClientAR = totalClientAR.plus(clientOwed);

    // Check for mismatch (allow $0.01 tolerance for rounding)
    const difference = invoiceTotal.minus(clientOwed);
    if (difference.abs().greaterThan(new Decimal("0.01"))) {
      mismatches.push({
        clientId: client.id,
        clientName: client.name,
        teriCode: client.teriCode,
        invoiceTotal: invoiceTotal.toString(),
        clientTotalOwed: clientOwed.toString(),
        difference: difference.toString(),
      });
    }
  }

  return {
    totalClients: clientRecords.length,
    clientsWithInvoices: invoiceTotals.size,
    mismatchCount: mismatches.length,
    mismatches,
    isReconciled: mismatches.length === 0,
    totalInvoiceAR,
    totalClientAR,
    checkTimestamp,
  };
}

/**
 * Get detailed AR aging breakdown
 */
export async function getARAgingBreakdown(): Promise<{
  current: string;
  days30: string;
  days60: string;
  days90: string;
  over90: string;
  total: string;
}> {
  const db = await getDb();

  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), dueDate) <= 0 THEN amountDue ELSE 0 END), 0) as current_amount,
      COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), dueDate) BETWEEN 1 AND 30 THEN amountDue ELSE 0 END), 0) as days_30,
      COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), dueDate) BETWEEN 31 AND 60 THEN amountDue ELSE 0 END), 0) as days_60,
      COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), dueDate) BETWEEN 61 AND 90 THEN amountDue ELSE 0 END), 0) as days_90,
      COALESCE(SUM(CASE WHEN DATEDIFF(CURDATE(), dueDate) > 90 THEN amountDue ELSE 0 END), 0) as over_90,
      COALESCE(SUM(amountDue), 0) as total_ar
    FROM invoices
    WHERE deleted_at IS NULL
      AND status IN ('SENT', 'VIEWED', 'PARTIAL', 'OVERDUE')
  `);

  const rows = (result[0] as unknown as Array<{
    current_amount: string;
    days_30: string;
    days_60: string;
    days_90: string;
    over_90: string;
    total_ar: string;
  }>) ?? [];
  const row = rows[0];

  return {
    current: row?.current_amount ?? "0",
    days30: row?.days_30 ?? "0",
    days60: row?.days_60 ?? "0",
    days90: row?.days_90 ?? "0",
    over90: row?.over_90 ?? "0",
    total: row?.total_ar ?? "0",
  };
}

export function startARReconciliationCron() {
  // Run every day at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    // Skip if not the leader instance (multi-instance deployment)
    if (!isCronLeader()) {
      logger.debug("[ARReconciliationCron] Skipping - not the leader instance");
      return;
    }

    const timestamp = new Date().toISOString();
    logger.info({ timestamp }, "Starting AR reconciliation job");

    try {
      const result = await reconcileAR();

      if (result.isReconciled) {
        logger.info(
          {
            timestamp,
            totalClients: result.totalClients,
            clientsWithInvoices: result.clientsWithInvoices,
            totalInvoiceAR: result.totalInvoiceAR.toString(),
            totalClientAR: result.totalClientAR.toString(),
            status: "RECONCILED",
          },
          "AR reconciliation passed - invoice totals match client balances"
        );
      } else {
        // ALERT: AR has mismatches
        logger.error(
          {
            timestamp,
            mismatchCount: result.mismatchCount,
            totalInvoiceAR: result.totalInvoiceAR.toString(),
            totalClientAR: result.totalClientAR.toString(),
            difference: result.totalInvoiceAR.minus(result.totalClientAR).toString(),
            status: "MISMATCHED",
          },
          "AR RECONCILIATION ALERT: Invoice totals do not match client balances!"
        );

        // Log individual mismatches (limit to top 10 for log readability)
        const topMismatches = result.mismatches.slice(0, 10);
        logger.error(
          {
            mismatches: topMismatches.map((m) => ({
              clientId: m.clientId,
              teriCode: m.teriCode,
              name: m.clientName,
              invoiceTotal: m.invoiceTotal,
              clientOwed: m.clientTotalOwed,
              diff: m.difference,
            })),
            totalMismatches: result.mismatchCount,
            showingTop: Math.min(10, result.mismatchCount),
          },
          "AR mismatch details"
        );
      }

      // Also log AR aging breakdown for visibility
      try {
        const aging = await getARAgingBreakdown();
        logger.info(
          {
            current: aging.current,
            "1-30 days": aging.days30,
            "31-60 days": aging.days60,
            "61-90 days": aging.days90,
            "90+ days": aging.over90,
            total: aging.total,
          },
          "AR aging breakdown"
        );
      } catch (agingError) {
        logger.error({ error: agingError }, "Failed to get AR aging breakdown");
      }
    } catch (error) {
      logger.error(
        { error, timestamp },
        "Fatal error running AR reconciliation job"
      );
    }
  });

  logger.info("AR reconciliation cron job started (runs daily at 2:00 AM)");
  logger.info("AR reconciliation cron: Leader election enabled (only leader executes)");
}

/**
 * Stop the AR reconciliation cron job
 * Note: To properly stop, keep a reference to the scheduled task
 */
export function stopARReconciliationCron() {
  logger.info("AR reconciliation cron job stop requested");
}
