import cron from "node-cron";
import { getDb } from "../db";
import { logger } from "../_core/logger";
import { isCronLeader } from "../utils/cronLeaderElection";
import { invoices, clients } from "../../drizzle/schema";
import { sql, isNull } from "drizzle-orm";

/**
 * AR (Accounts Receivable) Reconciliation Check Cron Job
 *
 * OBS-002: Runs daily to verify AR balance integrity
 *
 * Schedule: 0 7 * * * (every day at 7:00 AM, after GL check)
 *
 * This cron job:
 * 1. Sums outstanding invoice amounts (amountDue) per client
 * 2. Compares with clients.totalOwed
 * 3. Reports any discrepancies
 *
 * IMPORTANT: These values should always match. A mismatch indicates:
 * - Invoice created/modified without updating client balance
 * - Payment applied without updating invoice or client balance
 * - Data corruption from failed transactions
 * - Race conditions in concurrent operations
 */

interface ARReconciliationResult {
  reconciled: boolean;
  totalClients: number;
  mismatchCount: number;
  mismatches: Array<{
    clientId: number;
    clientName: string;
    invoiceAmountDue: number;
    clientTotalOwed: number;
    difference: number;
  }>;
  timestamp: string;
}

/**
 * Check AR reconciliation between invoice amounts and client balances
 */
export async function checkARReconciliation(): Promise<ARReconciliationResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const timestamp = new Date().toISOString();

  // Step 1: Get sum of outstanding invoice amounts per client
  // Only count invoices that are not voided, not paid, and not deleted
  const invoiceAmountsByClient = await db
    .select({
      customerId: invoices.customerId,
      totalAmountDue: sql<string>`COALESCE(SUM(CAST(${invoices.amountDue} AS DECIMAL(20,2))), 0)`,
    })
    .from(invoices)
    .where(
      sql`${invoices.deletedAt} IS NULL
          AND ${invoices.status} NOT IN ('VOID', 'PAID')`
    )
    .groupBy(invoices.customerId);

  // Step 2: Get client totalOwed values
  const clientBalances = await db
    .select({
      id: clients.id,
      name: clients.name,
      totalOwed: clients.totalOwed,
    })
    .from(clients)
    .where(isNull(clients.deletedAt));

  // Build a map of client invoice totals
  const invoiceTotalsByClientId = new Map<number, number>();
  for (const row of invoiceAmountsByClient) {
    invoiceTotalsByClientId.set(row.customerId, parseFloat(row.totalAmountDue));
  }

  // Step 3: Compare and find mismatches
  const mismatches: ARReconciliationResult["mismatches"] = [];

  for (const client of clientBalances) {
    const invoiceTotal = invoiceTotalsByClientId.get(client.id) || 0;
    const clientTotal = parseFloat(String(client.totalOwed) || "0");
    const difference = Math.abs(invoiceTotal - clientTotal);

    // Tolerance: $0.01 (one cent)
    if (difference > 0.01) {
      mismatches.push({
        clientId: client.id,
        clientName: client.name,
        invoiceAmountDue: Math.round(invoiceTotal * 100) / 100,
        clientTotalOwed: Math.round(clientTotal * 100) / 100,
        difference: Math.round(difference * 100) / 100,
      });
    }
  }

  // Also check for clients with invoice totals but not in client list (orphaned data)
  for (const [customerId, total] of invoiceTotalsByClientId.entries()) {
    const clientExists = clientBalances.some(c => c.id === customerId);
    if (!clientExists && total > 0.01) {
      mismatches.push({
        clientId: customerId,
        clientName: `[ORPHANED CLIENT ID: ${customerId}]`,
        invoiceAmountDue: Math.round(total * 100) / 100,
        clientTotalOwed: 0,
        difference: Math.round(total * 100) / 100,
      });
    }
  }

  const result: ARReconciliationResult = {
    reconciled: mismatches.length === 0,
    totalClients: clientBalances.length,
    mismatchCount: mismatches.length,
    mismatches,
    timestamp,
  };

  if (!result.reconciled) {
    logger.error(
      {
        mismatchCount: result.mismatchCount,
        topMismatches: result.mismatches.slice(0, 10),
      },
      "AR RECONCILIATION MISMATCH DETECTED"
    );
  }

  return result;
}

/**
 * Start the AR Reconciliation Check cron job
 */
export function startARReconciliationCheckCron() {
  // Run every day at 7:00 AM (after GL check)
  cron.schedule("0 7 * * *", async () => {
    // Skip if not the leader instance (multi-instance deployment)
    if (!isCronLeader()) {
      logger.debug(
        "[ARReconciliationCheck] Skipping - not the leader instance"
      );
      return;
    }

    const timestamp = new Date().toISOString();
    logger.info({ timestamp }, "Starting AR reconciliation check job");

    try {
      const result = await checkARReconciliation();

      if (result.reconciled) {
        logger.info(
          {
            timestamp,
            totalClients: result.totalClients,
          },
          "AR Reconciliation Check PASSED - invoice totals match client balances"
        );
      } else {
        // CRITICAL: AR reconciliation mismatch detected
        logger.error(
          {
            timestamp,
            totalClients: result.totalClients,
            mismatchCount: result.mismatchCount,
          },
          "AR Reconciliation Check FAILED - MISMATCH DETECTED"
        );

        // Log each mismatch for investigation (limit to top 20)
        const topMismatches = result.mismatches
          .sort((a, b) => b.difference - a.difference)
          .slice(0, 20);

        for (const mismatch of topMismatches) {
          logger.error(
            {
              clientId: mismatch.clientId,
              clientName: mismatch.clientName,
              invoiceAmountDue: mismatch.invoiceAmountDue,
              clientTotalOwed: mismatch.clientTotalOwed,
              difference: mismatch.difference,
            },
            "AR mismatch for client"
          );
        }

        // TODO: Add notification/alert to admin when notifications are enabled
        // await sendARMismatchAlert(result);
      }
    } catch (error) {
      logger.error(
        { error, timestamp },
        "Fatal error running AR reconciliation check job"
      );
    }
  });

  logger.info(
    "AR Reconciliation Check cron job started (runs daily at 7:00 AM)"
  );
  logger.info(
    "AR Reconciliation Check: Leader election enabled (only leader executes)"
  );
}

/**
 * Stop the AR Reconciliation Check cron job
 */
export function stopARReconciliationCheckCron() {
  logger.info("AR Reconciliation Check cron job stop requested");
}
