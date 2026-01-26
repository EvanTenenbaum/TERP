/**
 * Client Balance Service
 * ARCH-002: Eliminates shadow accounting by computing totalOwed from invoices
 *
 * This service provides a single source of truth for client balances.
 * Instead of manually updating clients.totalOwed across the codebase,
 * this service computes it from SUM(invoices.amountDue).
 *
 * The canonical calculation is:
 *   totalOwed = SUM(invoices.amountDue)
 *   WHERE customerId = clientId
 *   AND status NOT IN ('PAID', 'VOID')
 *   AND deletedAt IS NULL
 */

import { getDb } from "../db";
import { clients, invoices } from "../../drizzle/schema";
import { eq, sql, and, isNull, notInArray } from "drizzle-orm";
import { logger } from "../_core/logger";

export interface ClientBalance {
  clientId: number;
  computedBalance: number;
  storedBalance: number;
  discrepancy: number;
  invoiceCount: number;
}

/**
 * Compute the canonical balance for a client from invoices
 * This is the single source of truth for what a client owes
 *
 * @param clientId - The client ID to compute balance for
 * @returns The computed balance from invoices.amountDue
 */
export async function computeClientBalance(clientId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      totalOwed: sql<number>`COALESCE(SUM(CAST(${invoices.amountDue} AS DECIMAL(15,2))), 0)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, clientId),
        notInArray(invoices.status, ["PAID", "VOID"]),
        isNull(invoices.deletedAt)
      )
    );

  return Number(result[0]?.totalOwed || 0);
}

/**
 * Get detailed balance information for a client
 * Includes both computed and stored balance to detect discrepancies
 *
 * @param clientId - The client ID to get balance for
 * @returns ClientBalance with computed, stored, and discrepancy info
 */
export async function getClientBalanceDetails(
  clientId: number
): Promise<ClientBalance> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the stored balance
  const clientResult = await db
    .select({
      totalOwed: clients.totalOwed,
    })
    .from(clients)
    .where(eq(clients.id, clientId));

  const storedBalance = Number(clientResult[0]?.totalOwed || 0);

  // Get the computed balance and invoice count
  const computedResult = await db
    .select({
      totalOwed: sql<number>`COALESCE(SUM(CAST(${invoices.amountDue} AS DECIMAL(15,2))), 0)`,
      invoiceCount: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, clientId),
        notInArray(invoices.status, ["PAID", "VOID"]),
        isNull(invoices.deletedAt)
      )
    );

  const computedBalance = Number(computedResult[0]?.totalOwed || 0);
  const invoiceCount = Number(computedResult[0]?.invoiceCount || 0);

  return {
    clientId,
    computedBalance,
    storedBalance,
    discrepancy: Math.abs(computedBalance - storedBalance),
    invoiceCount,
  };
}

/**
 * Synchronize the stored totalOwed with the computed value
 * This updates clients.totalOwed to match the canonical calculation
 *
 * @param clientId - The client ID to sync
 * @returns The new synchronized balance
 */
export async function syncClientBalance(clientId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const computedBalance = await computeClientBalance(clientId);

  await db
    .update(clients)
    .set({
      totalOwed: computedBalance.toFixed(2),
    })
    .where(eq(clients.id, clientId));

  logger.info({
    msg: "Client balance synchronized",
    clientId,
    newBalance: computedBalance,
  });

  return computedBalance;
}

/**
 * Find all clients with balance discrepancies
 * Useful for auditing and migration
 *
 * @returns Array of clients with discrepancies
 */
export async function findBalanceDiscrepancies(): Promise<ClientBalance[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all clients with their stored balance
  const allClients = await db
    .select({
      id: clients.id,
      totalOwed: clients.totalOwed,
    })
    .from(clients)
    .where(isNull(clients.deletedAt));

  const discrepancies: ClientBalance[] = [];

  for (const client of allClients) {
    const details = await getClientBalanceDetails(client.id);
    if (details.discrepancy > 0.01) {
      // Allow for small rounding differences
      discrepancies.push(details);
    }
  }

  return discrepancies;
}

/**
 * Synchronize all client balances
 * This is a batch operation to fix all discrepancies
 *
 * @returns Summary of the sync operation
 */
export async function syncAllClientBalances(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all clients
  const allClients = await db
    .select({
      id: clients.id,
    })
    .from(clients)
    .where(isNull(clients.deletedAt));

  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (const client of allClients) {
    try {
      const details = await getClientBalanceDetails(client.id);
      processed++;

      if (details.discrepancy > 0.01) {
        await syncClientBalance(client.id);
        updated++;
        logger.info({
          msg: "Corrected client balance discrepancy",
          clientId: client.id,
          oldBalance: details.storedBalance,
          newBalance: details.computedBalance,
          discrepancy: details.discrepancy,
        });
      }
    } catch (error) {
      errors++;
      logger.error({
        msg: "Failed to sync client balance",
        clientId: client.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info({
    msg: "Client balance sync completed",
    processed,
    updated,
    errors,
  });

  return { processed, updated, errors };
}

/**
 * ARCH-002: Deprecated - Use syncClientBalance instead
 *
 * This helper function is provided for backward compatibility
 * during the migration away from manual totalOwed updates.
 *
 * Instead of:
 *   UPDATE clients SET totalOwed = totalOwed + X
 *
 * Use:
 *   await syncClientBalance(clientId)
 *
 * @deprecated Use syncClientBalance(clientId) after invoice operations
 */
export async function updateClientTotalOwed(
  clientId: number,
  _delta: number
): Promise<void> {
  logger.warn({
    msg: "DEPRECATED: updateClientTotalOwed called - use syncClientBalance instead",
    clientId,
    stackTrace: new Error().stack,
  });
  await syncClientBalance(clientId);
}

/**
 * Verify GL balance matches client balance
 * This ensures financial integrity between AR ledger and client balances
 *
 * @param clientId - The client ID to verify
 * @returns Verification result
 */
export async function verifyClientGLBalance(clientId: number): Promise<{
  clientBalance: number;
  arLedgerBalance: number;
  isBalanced: boolean;
  discrepancy: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get client balance from invoices (canonical)
  const clientBalance = await computeClientBalance(clientId);

  // Get AR balance from general ledger for this client
  // AR entries are tagged with referenceType=INVOICE and referenceId=invoiceId
  // We sum AR debits - credits for invoices belonging to this client
  const arResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(CAST(le.debit AS DECIMAL(15,2))) - SUM(CAST(le.credit AS DECIMAL(15,2))), 0) as ar_balance
    FROM ledger_entries le
    INNER JOIN invoices i ON le.referenceType = 'INVOICE' AND le.referenceId = i.id
    INNER JOIN accounts a ON le.accountId = a.id
    WHERE i.customerId = ${clientId}
      AND a.accountNumber = '1200'  -- Accounts Receivable
  `);

  // Extract the first row from the result (MySQL returns [rows, fields])
  const rows = arResult as unknown as Array<{ ar_balance: number | string }>;
  const arLedgerBalance = Number(rows[0]?.ar_balance || 0);
  const discrepancy = Math.abs(clientBalance - arLedgerBalance);
  const isBalanced = discrepancy < 0.01;

  return {
    clientBalance,
    arLedgerBalance,
    isBalanced,
    discrepancy,
  };
}

// Export singleton instance for consistent usage
export const clientBalanceService = {
  computeClientBalance,
  getClientBalanceDetails,
  syncClientBalance,
  syncAllClientBalances,
  findBalanceDiscrepancies,
  updateClientTotalOwed,
  verifyClientGLBalance,
};
