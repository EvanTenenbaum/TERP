/**
 * Bad Debt Database Access Layer
 * Handles write-offs for uncollectible accounts receivable
 *
 * This module implements:
 * - Bad debt write-off creation
 * - Write-off reversal
 * - Bad debt reporting
 * - Integration with accounting ledger
 */

import { getDb } from "./db";
import {
  transactions,
  clients,
  ledgerEntries,
  type Transaction,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import * as transactionsDb from "./transactionsDb";
import { logger } from "./_core/logger";
import { getFiscalPeriodIdOrDefault } from "./_core/fiscalPeriod";
import { getAccountIdByName, ACCOUNT_NAMES } from "./_core/accountLookup";

/**
 * Write off bad debt for a client transaction
 * @param transactionId Transaction ID to write off
 * @param writeOffAmount Amount to write off (can be partial)
 * @param reason Reason for write-off
 * @param userId User ID performing the write-off
 * @param createGLEntry Whether to create general ledger entry (default: true)
 * @returns The created write-off transaction
 */
export async function writeOffBadDebt(
  transactionId: number,
  writeOffAmount: string,
  reason: string,
  userId: number,
  createGLEntry: boolean = true
): Promise<Transaction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Fetch the original transaction
    const originalTransaction =
      await transactionsDb.getTransactionById(transactionId);

    if (!originalTransaction) {
      throw new Error("Transaction not found");
    }

    // Verify transaction is not already written off
    if (originalTransaction.transactionStatus === "WRITTEN_OFF") {
      throw new Error("Transaction is already written off");
    }

    // Verify transaction has an outstanding balance
    if (originalTransaction.transactionStatus === "PAID") {
      throw new Error("Cannot write off a fully paid transaction");
    }

    // Validate write-off amount
    const writeOffNum = parseFloat(writeOffAmount);
    const originalAmount = parseFloat(originalTransaction.amount);

    if (isNaN(writeOffNum) || writeOffNum <= 0) {
      throw new Error("Invalid write-off amount");
    }

    if (writeOffNum > originalAmount) {
      throw new Error(
        "Write-off amount cannot exceed original transaction amount"
      );
    }

    // Generate write-off transaction number
    const writeOffNumber = await transactionsDb.generateTransactionNumber("WO");

    // Create write-off transaction
    const writeOffTransaction = await transactionsDb.createTransaction({
      transactionNumber: writeOffNumber,
      transactionType: "REFUND", // Using REFUND type to represent write-off
      clientId: originalTransaction.clientId,
      transactionDate: new Date(),
      amount: writeOffAmount,
      transactionStatus: "COMPLETED",
      notes: `Bad debt write-off: ${reason}`,
      metadata: JSON.stringify({
        writeOffReason: reason,
        originalTransactionId: transactionId,
        originalTransactionNumber: originalTransaction.transactionNumber,
        writeOffType: "BAD_DEBT",
      }),
      createdBy: userId,
    });

    // Link write-off to original transaction
    await transactionsDb.linkTransactions(
      transactionId,
      writeOffTransaction.id,
      "RELATED_TO",
      userId,
      writeOffAmount,
      `Bad debt write-off for ${originalTransaction.transactionNumber}`
    );

    // Update original transaction status
    const isFullWriteOff = writeOffNum >= originalAmount;
    await transactionsDb.updateTransaction(transactionId, {
      transactionStatus: isFullWriteOff ? "WRITTEN_OFF" : "PARTIAL",
      notes: originalTransaction.notes
        ? `${originalTransaction.notes}\n\nPartial write-off: $${writeOffAmount} on ${new Date().toISOString()}`
        : `Partial write-off: $${writeOffAmount} on ${new Date().toISOString()}`,
    });

    // Create general ledger entries if requested
    if (createGLEntry) {
      await createBadDebtGLEntries(
        originalTransaction.clientId,
        writeOffAmount,
        writeOffNumber,
        reason,
        userId
      );
    }

    return writeOffTransaction;
  } catch (error) {
    logger.error({
      msg: "Error writing off bad debt",
      transactionId,
      writeOffAmount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to write off bad debt: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create general ledger entries for bad debt write-off
 *
 * DEPENDENCY: Requires chart of accounts seeded (seedDefaults.ts)
 * Required accounts:
 * - Bad Debt Expense (#5200) - EXPENSE, DEBIT normal balance
 * - Accounts Receivable (#1100) - ASSET, DEBIT normal balance
 *
 * @param clientId Client ID
 * @param amount Write-off amount
 * @param referenceNumber Reference number (write-off transaction number)
 * @param description Description/reason
 * @param userId User ID
 */
async function createBadDebtGLEntries(
  clientId: number,
  amount: string,
  referenceNumber: string,
  description: string,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const amountNum = parseFloat(amount);
    const entryDate = new Date();

    // Generate entry number
    const entryNumber = `WO-${referenceNumber}`;

    // Get actual account IDs from chart of accounts
    const badDebtExpenseId = await getAccountIdByName(
      ACCOUNT_NAMES.BAD_DEBT_EXPENSE
    );
    const accountsReceivableId = await getAccountIdByName(
      ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
    );

    // Get fiscal period for the transaction date
    const fiscalPeriodId = await getFiscalPeriodIdOrDefault(entryDate, 1);

    // Debit: Bad Debt Expense
    await db.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-1`,
      accountId: badDebtExpenseId,
      entryDate,
      debit: amountNum.toString(),
      credit: "0.00",
      description: `Bad Debt Write-Off: ${description}`,
      referenceType: "WRITE_OFF",
      referenceId: 0,
      fiscalPeriodId,
      createdBy: userId,
    });

    // Credit: Accounts Receivable
    await db.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-2`,
      accountId: accountsReceivableId,
      entryDate,
      debit: "0.00",
      credit: amountNum.toString(),
      description: `Bad Debt Write-Off: ${description}`,
      referenceType: "WRITE_OFF",
      referenceId: 0,
      fiscalPeriodId,
      createdBy: userId,
    });
  } catch (error) {
    logger.error({
      msg: "Error creating bad debt GL entries",
      clientId,
      amount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - write-off should succeed even if GL entries fail
    logger.warn({ msg: "Bad debt write-off completed but GL entries failed" });
  }
}

/**
 * Reverse a bad debt write-off
 * @param writeOffTransactionId Write-off transaction ID
 * @param reason Reason for reversal
 * @param userId User ID performing the reversal
 * @returns The updated original transaction
 */
export async function reverseBadDebtWriteOff(
  writeOffTransactionId: number,
  reason: string,
  userId: number
): Promise<Transaction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Fetch the write-off transaction
    const writeOffTransaction = await transactionsDb.getTransactionById(
      writeOffTransactionId
    );

    if (!writeOffTransaction) {
      throw new Error("Write-off transaction not found");
    }

    // Verify it's a write-off transaction
    const metadata = writeOffTransaction.metadata
      ? JSON.parse(writeOffTransaction.metadata as string)
      : {};

    if (metadata.writeOffType !== "BAD_DEBT") {
      throw new Error("Transaction is not a bad debt write-off");
    }

    // Get the original transaction
    const originalTransactionId = metadata.originalTransactionId;
    if (!originalTransactionId) {
      throw new Error(
        "Original transaction ID not found in write-off metadata"
      );
    }

    const originalTransaction = await transactionsDb.getTransactionById(
      originalTransactionId
    );
    if (!originalTransaction) {
      throw new Error("Original transaction not found");
    }

    // Mark write-off transaction as void
    await transactionsDb.updateTransaction(writeOffTransactionId, {
      transactionStatus: "VOID",
      notes: writeOffTransaction.notes
        ? `${writeOffTransaction.notes}\n\nReversed: ${reason} on ${new Date().toISOString()}`
        : `Reversed: ${reason} on ${new Date().toISOString()}`,
    });

    // Restore original transaction status
    // Determine appropriate status based on payment history
    const newStatus =
      originalTransaction.transactionStatus === "WRITTEN_OFF"
        ? "OVERDUE" // Restore to overdue if it was fully written off
        : originalTransaction.transactionStatus; // Keep current status if partial

    const updatedOriginal = await transactionsDb.updateTransaction(
      originalTransactionId,
      {
        transactionStatus: newStatus,
        notes: originalTransaction.notes
          ? `${originalTransaction.notes}\n\nWrite-off reversed: ${reason} on ${new Date().toISOString()}`
          : `Write-off reversed: ${reason} on ${new Date().toISOString()}`,
      }
    );

    // Create reversal GL entries
    await createBadDebtReversalGLEntries(
      originalTransaction.clientId,
      writeOffTransaction.amount,
      writeOffTransaction.transactionNumber,
      reason,
      userId
    );

    return updatedOriginal;
  } catch (error) {
    logger.error({
      msg: "Error reversing bad debt write-off",
      writeOffTransactionId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to reverse bad debt write-off: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Create general ledger entries for bad debt write-off reversal
 * @param clientId Client ID
 * @param amount Reversal amount
 * @param referenceNumber Reference number
 * @param description Description/reason
 * @param userId User ID
 */
async function createBadDebtReversalGLEntries(
  clientId: number,
  amount: string,
  referenceNumber: string,
  description: string,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const amountNum = parseFloat(amount);
    const entryDate = new Date();

    // Generate entry number
    const entryNumber = `WOR-${referenceNumber}`;

    // Get actual account IDs from chart of accounts
    const badDebtExpenseId = await getAccountIdByName(
      ACCOUNT_NAMES.BAD_DEBT_EXPENSE
    );
    const accountsReceivableId = await getAccountIdByName(
      ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
    );

    // Get fiscal period for the transaction date
    const fiscalPeriodId = await getFiscalPeriodIdOrDefault(entryDate, 1);

    // Credit: Bad Debt Expense (reverse the debit)
    await db.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-1`,
      accountId: badDebtExpenseId,
      entryDate,
      debit: "0.00",
      credit: amountNum.toString(),
      description: `Bad Debt Write-Off Reversal: ${description}`,
      referenceType: "WRITE_OFF_REVERSAL",
      referenceId: 0,
      fiscalPeriodId,
      createdBy: userId,
    });

    // Debit: Accounts Receivable (reverse the credit)
    await db.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-2`,
      accountId: accountsReceivableId,
      entryDate,
      debit: amountNum.toString(),
      credit: "0.00",
      description: `Bad Debt Write-Off Reversal: ${description}`,
      referenceType: "WRITE_OFF_REVERSAL",
      referenceId: 0,
      fiscalPeriodId,
      createdBy: userId,
    });
  } catch (error) {
    logger.error({
      msg: "Error creating bad debt reversal GL entries",
      clientId,
      amount,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    logger.warn({ msg: "Bad debt reversal completed but GL entries failed" });
  }
}

/**
 * Get all write-offs for a client
 * @param clientId Client ID
 * @param includeReversed Whether to include reversed write-offs
 * @returns Array of write-off transactions
 */
export async function getClientWriteOffs(
  clientId: number,
  includeReversed: boolean = false
): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const allTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.clientId, clientId))
      .orderBy(desc(transactions.transactionDate));

    // Filter for write-off transactions
    const writeOffs = allTransactions.filter(t => {
      if (!t.metadata) return false;

      try {
        const metadata = JSON.parse(t.metadata as string);
        const isWriteOff = metadata.writeOffType === "BAD_DEBT";

        if (!includeReversed && t.transactionStatus === "VOID") {
          return false;
        }

        return isWriteOff;
      } catch {
        return false;
      }
    });

    return writeOffs;
  } catch (error) {
    logger.error({
      msg: "Error fetching client write-offs",
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to fetch client write-offs: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get total write-off amount for a client
 * @param clientId Client ID
 * @param includeReversed Whether to include reversed write-offs
 * @returns Total write-off amount
 */
export async function getClientTotalWriteOffs(
  clientId: number,
  includeReversed: boolean = false
): Promise<number> {
  try {
    const writeOffs = await getClientWriteOffs(clientId, includeReversed);

    const total = writeOffs.reduce((sum, writeOff) => {
      const amount = parseFloat(writeOff.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    return total;
  } catch (error) {
    logger.error({
      msg: "Error calculating total write-offs",
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to calculate total write-offs: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get bad debt aging report
 * @param daysThreshold Minimum days overdue to include (default: 90)
 * @returns Array of clients with overdue amounts
 */
export async function getBadDebtAgingReport(
  daysThreshold: number = 90
): Promise<
  Array<{
    clientId: number;
    clientName: string;
    totalOverdue: number;
    oldestTransactionDate: Date;
    daysOverdue: number;
    transactionCount: number;
  }>
> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const now = new Date();
    const thresholdDate = new Date(
      now.getTime() - daysThreshold * 24 * 60 * 60 * 1000
    );

    // Get all overdue transactions
    const overdueTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.transactionStatus, "OVERDUE"),
          sql`${transactions.transactionDate} < ${thresholdDate.toISOString()}`
        )
      );

    // Group by client
    const clientMap = new Map<
      number,
      {
        clientId: number;
        clientName: string;
        totalOverdue: number;
        oldestTransactionDate: Date;
        daysOverdue: number;
        transactionCount: number;
      }
    >();

    for (const transaction of overdueTransactions) {
      const existing = clientMap.get(transaction.clientId);
      const amount = parseFloat(transaction.amount);
      const transactionDate = new Date(transaction.transactionDate);
      const daysOverdue = Math.floor(
        (now.getTime() - transactionDate.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (existing) {
        existing.totalOverdue += amount;
        existing.transactionCount += 1;
        if (transactionDate < existing.oldestTransactionDate) {
          existing.oldestTransactionDate = transactionDate;
          existing.daysOverdue = daysOverdue;
        }
      } else {
        // Fetch client name
        const [client] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, transaction.clientId));

        clientMap.set(transaction.clientId, {
          clientId: transaction.clientId,
          clientName: client?.name || "Unknown",
          totalOverdue: amount,
          oldestTransactionDate: transactionDate,
          daysOverdue,
          transactionCount: 1,
        });
      }
    }

    return Array.from(clientMap.values()).sort(
      (a, b) => b.totalOverdue - a.totalOverdue
    );
  } catch (error) {
    logger.error({
      msg: "Error generating bad debt aging report",
      daysThreshold,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to generate bad debt aging report: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
