/**
 * Accounting Hooks
 * Automatic general ledger entry generation for business transactions
 *
 * This module implements automatic GL posting for:
 * - Sales (AR debit, Revenue credit)
 * - Payments (Cash debit, AR credit)
 * - Refunds (Revenue debit, AR credit)
 * - COGS (COGS debit, Inventory credit)
 */

import { getDb } from "./db";
import { ledgerEntries, accounts } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./_core/logger";
import {
  getFiscalPeriodIdOrDefault,
  isFiscalPeriodLocked,
} from "./_core/fiscalPeriod";

/**
 * Custom error class for GL posting failures
 * These errors should bubble up to ensure data integrity
 */
export class GLPostingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "GLPostingError";
  }
}

/**
 * Custom error class for missing standard accounts
 * This is a critical configuration error that must be addressed
 */
export class MissingStandardAccountError extends GLPostingError {
  constructor(accountCode: string, accountName: string) {
    super(
      `Standard account not found: ${accountName} (${accountCode}). Run seedStandardAccounts() to create required accounts.`,
      "MISSING_STANDARD_ACCOUNT",
      { accountCode, accountName }
    );
    this.name = "MissingStandardAccountError";
  }
}

export interface GLPostingEntry {
  accountId: number;
  debit: number;
  credit: number;
}

/**
 * Standard account codes (should be configurable in production)
 * These would typically be loaded from a configuration table
 */
export const STANDARD_ACCOUNTS = {
  ACCOUNTS_RECEIVABLE: "1200",
  CASH: "1000",
  INVENTORY: "1300",
  REVENUE: "4000",
  COST_OF_GOODS_SOLD: "5000",
  BAD_DEBT_EXPENSE: "5100",
  SALES_RETURNS: "4100",
};

/**
 * Get account ID by account number
 * @param accountNumber Account number
 * @returns Account ID or null if not found (null means account doesn't exist, not an error)
 * @throws GLPostingError if database query fails
 */
async function getAccountIdByNumber(
  accountNumber: string
): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new GLPostingError("Database not available", "DB_UNAVAILABLE");

  try {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountNumber, accountNumber));

    return account?.id ?? null;
  } catch (error) {
    logger.error({
      msg: "Error fetching account - this is a critical failure",
      accountNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Throw instead of silently returning null - database errors must not be hidden
    throw new GLPostingError(
      `Failed to fetch account ${accountNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "ACCOUNT_FETCH_FAILED",
      {
        accountNumber,
        originalError: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Generate a unique entry number
 * @param prefix Prefix for entry number (e.g., "JE", "SALE", "PMT")
 * @returns Unique entry number
 */
async function generateEntryNumber(prefix: string): Promise<string> {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Get current fiscal period ID
 * Uses the fiscal period lookup utility
 * @param date - Optional date to get fiscal period for (defaults to now)
 * @returns Fiscal period ID
 */
async function getCurrentFiscalPeriodId(date?: Date): Promise<number> {
  return getFiscalPeriodIdOrDefault(date ?? new Date(), 1);
}

/**
 * Create a journal entry (pair of debit and credit)
 * @param entryData Journal entry data
 * @returns Array of created ledger entries
 */
export async function createJournalEntry(entryData: {
  entryNumber: string;
  entryDate: Date;
  debitAccountId: number;
  creditAccountId: number;
  amount: string;
  description: string;
  referenceType: string;
  referenceId: number;
  createdBy: number;
}): Promise<GLPostingEntry[]> {
  const db = await getDb();
  if (!db) throw new GLPostingError("Database not available", "DB_UNAVAILABLE");

  try {
    const fiscalPeriodId = await getCurrentFiscalPeriodId();
    const amountNum = parseFloat(entryData.amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      throw new GLPostingError(
        `Invalid amount for journal entry: ${entryData.amount}`,
        "INVALID_AMOUNT",
        { amount: entryData.amount, entryNumber: entryData.entryNumber }
      );
    }

    // ACC-005: Validate fiscal period is open for posting
    const isLocked = await isFiscalPeriodLocked(fiscalPeriodId);
    if (isLocked) {
      throw new GLPostingError(
        `Cannot post to fiscal period ${fiscalPeriodId}. The period is locked or closed.`,
        "PERIOD_LOCKED",
        { fiscalPeriodId, entryNumber: entryData.entryNumber }
      );
    }

    // Use transaction to ensure both debit and credit entries are created atomically
    // This prevents unbalanced ledger if one insert fails
    await db.transaction(async tx => {
      // Create debit entry
      await tx.insert(ledgerEntries).values({
        entryNumber: `${entryData.entryNumber}-DR`,
        entryDate: entryData.entryDate,
        accountId: entryData.debitAccountId,
        debit: amountNum.toFixed(2),
        credit: "0.00",
        description: entryData.description,
        referenceType: entryData.referenceType,
        referenceId: entryData.referenceId,
        fiscalPeriodId,
        isManual: false,
        createdBy: entryData.createdBy,
      });

      // Create credit entry
      await tx.insert(ledgerEntries).values({
        entryNumber: `${entryData.entryNumber}-CR`,
        entryDate: entryData.entryDate,
        accountId: entryData.creditAccountId,
        debit: "0.00",
        credit: amountNum.toFixed(2),
        description: entryData.description,
        referenceType: entryData.referenceType,
        referenceId: entryData.referenceId,
        fiscalPeriodId,
        isManual: false,
        createdBy: entryData.createdBy,
      });
    });

    return [
      { accountId: entryData.debitAccountId, debit: amountNum, credit: 0 },
      { accountId: entryData.creditAccountId, debit: 0, credit: amountNum },
    ];
  } catch (error) {
    logger.error({
      msg: "Error creating journal entry",
      entryNumber: entryData.entryNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw GLPostingErrors as-is, wrap others
    if (error instanceof GLPostingError) {
      throw error;
    }
    throw new GLPostingError(
      `Failed to create journal entry ${entryData.entryNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "JOURNAL_ENTRY_FAILED",
      {
        entryNumber: entryData.entryNumber,
        referenceType: entryData.referenceType,
      }
    );
  }
}

/**
 * Post GL entries for a sale
 * Debit: Accounts Receivable
 * Credit: Revenue
 *
 * @param saleData Sale transaction data
 * @returns Array of created ledger entries
 * @throws MissingStandardAccountError if required accounts are not configured
 * @throws GLPostingError if GL posting fails for any other reason
 */
export async function postSaleGLEntries(saleData: {
  transactionId: number;
  transactionNumber: string;
  clientId: number;
  amount: string;
  transactionDate: Date;
  userId: number;
}): Promise<GLPostingEntry[]> {
  const arAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE
  );
  const revenueAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.REVENUE
  );

  // Throw specific errors for missing standard accounts - these are configuration issues
  if (!arAccountId) {
    throw new MissingStandardAccountError(
      STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE,
      "Accounts Receivable"
    );
  }
  if (!revenueAccountId) {
    throw new MissingStandardAccountError(STANDARD_ACCOUNTS.REVENUE, "Revenue");
  }

  try {
    const entryNumber = await generateEntryNumber("SALE");

    return await createJournalEntry({
      entryNumber,
      entryDate: saleData.transactionDate,
      debitAccountId: arAccountId,
      creditAccountId: revenueAccountId,
      amount: saleData.amount,
      description: `Sale - ${saleData.transactionNumber}`,
      referenceType: "SALE",
      referenceId: saleData.transactionId,
      createdBy: saleData.userId,
    });
  } catch (error) {
    logger.error({
      msg: "Error posting sale GL entries",
      transactionId: saleData.transactionId,
      transactionNumber: saleData.transactionNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to ensure GL posting failures are not silent
    if (error instanceof GLPostingError) {
      throw error;
    }
    throw new GLPostingError(
      `Failed to post GL entries for sale ${saleData.transactionNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "SALE_GL_POSTING_FAILED",
      {
        transactionId: saleData.transactionId,
        transactionNumber: saleData.transactionNumber,
      }
    );
  }
}

/**
 * Post GL entries for an invoice
 * Debit: Accounts Receivable
 * Credit: Revenue
 */
export async function postInvoiceGLEntries(invoiceData: {
  invoiceId: number;
  invoiceNumber: string;
  clientId: number;
  amount: string;
  invoiceDate: Date;
  userId: number;
}): Promise<GLPostingEntry[]> {
  const arAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE
  );
  const revenueAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.REVENUE
  );

  if (!arAccountId) {
    throw new MissingStandardAccountError(
      STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE,
      "Accounts Receivable"
    );
  }
  if (!revenueAccountId) {
    throw new MissingStandardAccountError(STANDARD_ACCOUNTS.REVENUE, "Revenue");
  }

  try {
    const entryNumber = await generateEntryNumber("INV");
    return await createJournalEntry({
      entryNumber,
      entryDate: invoiceData.invoiceDate,
      debitAccountId: arAccountId,
      creditAccountId: revenueAccountId,
      amount: invoiceData.amount,
      description: `Invoice - ${invoiceData.invoiceNumber}`,
      referenceType: "INVOICE",
      referenceId: invoiceData.invoiceId,
      createdBy: invoiceData.userId,
    });
  } catch (error) {
    logger.error({
      msg: "Error posting invoice GL entries",
      invoiceId: invoiceData.invoiceId,
      invoiceNumber: invoiceData.invoiceNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof GLPostingError) {
      throw error;
    }
    throw new GLPostingError(
      `Failed to post GL entries for invoice ${invoiceData.invoiceNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INVOICE_GL_POSTING_FAILED",
      {
        invoiceId: invoiceData.invoiceId,
        invoiceNumber: invoiceData.invoiceNumber,
      }
    );
  }
}

/**
 * Post GL entries for a payment
 * Debit: Cash
 * Credit: Accounts Receivable
 *
 * @param paymentData Payment transaction data
 * @returns Array of created ledger entries
 * @throws MissingStandardAccountError if required accounts are not configured
 * @throws GLPostingError if GL posting fails for any other reason
 */
export async function postPaymentGLEntries(paymentData: {
  transactionId: number;
  transactionNumber: string;
  clientId: number;
  amount: string;
  transactionDate: Date;
  userId: number;
}): Promise<GLPostingEntry[]> {
  const cashAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.CASH);
  const arAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE
  );

  // Throw specific errors for missing standard accounts
  if (!cashAccountId) {
    throw new MissingStandardAccountError(STANDARD_ACCOUNTS.CASH, "Cash");
  }
  if (!arAccountId) {
    throw new MissingStandardAccountError(
      STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE,
      "Accounts Receivable"
    );
  }

  try {
    const entryNumber = await generateEntryNumber("PMT");

    return await createJournalEntry({
      entryNumber,
      entryDate: paymentData.transactionDate,
      debitAccountId: cashAccountId,
      creditAccountId: arAccountId,
      amount: paymentData.amount,
      description: `Payment - ${paymentData.transactionNumber}`,
      referenceType: "PAYMENT",
      referenceId: paymentData.transactionId,
      createdBy: paymentData.userId,
    });
  } catch (error) {
    logger.error({
      msg: "Error posting payment GL entries",
      transactionId: paymentData.transactionId,
      transactionNumber: paymentData.transactionNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to ensure GL posting failures are not silent
    if (error instanceof GLPostingError) {
      throw error;
    }
    throw new GLPostingError(
      `Failed to post GL entries for payment ${paymentData.transactionNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "PAYMENT_GL_POSTING_FAILED",
      {
        transactionId: paymentData.transactionId,
        transactionNumber: paymentData.transactionNumber,
      }
    );
  }
}

/**
 * Post GL entries for a refund
 * Debit: Sales Returns (contra-revenue)
 * Credit: Accounts Receivable
 *
 * @param refundData Refund transaction data
 * @returns Array of created ledger entries
 * @throws MissingStandardAccountError if required accounts are not configured
 * @throws GLPostingError if GL posting fails for any other reason
 */
export async function postRefundGLEntries(refundData: {
  transactionId: number;
  transactionNumber: string;
  clientId: number;
  amount: string;
  transactionDate: Date;
  userId: number;
}): Promise<GLPostingEntry[]> {
  const salesReturnsAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.SALES_RETURNS
  );
  const arAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE
  );

  // Throw specific errors for missing standard accounts
  if (!salesReturnsAccountId) {
    throw new MissingStandardAccountError(
      STANDARD_ACCOUNTS.SALES_RETURNS,
      "Sales Returns"
    );
  }
  if (!arAccountId) {
    throw new MissingStandardAccountError(
      STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE,
      "Accounts Receivable"
    );
  }

  try {
    const entryNumber = await generateEntryNumber("REF");

    return await createJournalEntry({
      entryNumber,
      entryDate: refundData.transactionDate,
      debitAccountId: salesReturnsAccountId,
      creditAccountId: arAccountId,
      amount: refundData.amount,
      description: `Refund - ${refundData.transactionNumber}`,
      referenceType: "REFUND",
      referenceId: refundData.transactionId,
      createdBy: refundData.userId,
    });
  } catch (error) {
    logger.error({
      msg: "Error posting refund GL entries",
      transactionId: refundData.transactionId,
      transactionNumber: refundData.transactionNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to ensure GL posting failures are not silent
    if (error instanceof GLPostingError) {
      throw error;
    }
    throw new GLPostingError(
      `Failed to post GL entries for refund ${refundData.transactionNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "REFUND_GL_POSTING_FAILED",
      {
        transactionId: refundData.transactionId,
        transactionNumber: refundData.transactionNumber,
      }
    );
  }
}

/**
 * Post GL entries for COGS
 * Debit: Cost of Goods Sold
 * Credit: Inventory
 *
 * @param cogsData COGS data
 * @returns Array of created ledger entries
 * @throws MissingStandardAccountError if required accounts are not configured
 * @throws GLPostingError if GL posting fails for any other reason
 */
export async function postCOGSGLEntries(cogsData: {
  transactionId: number;
  transactionNumber: string;
  cogsAmount: string;
  transactionDate: Date;
  userId: number;
}): Promise<GLPostingEntry[]> {
  const cogsAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.COST_OF_GOODS_SOLD
  );
  const inventoryAccountId = await getAccountIdByNumber(
    STANDARD_ACCOUNTS.INVENTORY
  );

  // Throw specific errors for missing standard accounts
  if (!cogsAccountId) {
    throw new MissingStandardAccountError(
      STANDARD_ACCOUNTS.COST_OF_GOODS_SOLD,
      "Cost of Goods Sold"
    );
  }
  if (!inventoryAccountId) {
    throw new MissingStandardAccountError(
      STANDARD_ACCOUNTS.INVENTORY,
      "Inventory"
    );
  }

  try {
    const entryNumber = await generateEntryNumber("COGS");

    return await createJournalEntry({
      entryNumber,
      entryDate: cogsData.transactionDate,
      debitAccountId: cogsAccountId,
      creditAccountId: inventoryAccountId,
      amount: cogsData.cogsAmount,
      description: `COGS - ${cogsData.transactionNumber}`,
      referenceType: "COGS",
      referenceId: cogsData.transactionId,
      createdBy: cogsData.userId,
    });
  } catch (error) {
    logger.error({
      msg: "Error posting COGS GL entries",
      transactionId: cogsData.transactionId,
      transactionNumber: cogsData.transactionNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to ensure GL posting failures are not silent
    if (error instanceof GLPostingError) {
      throw error;
    }
    throw new GLPostingError(
      `Failed to post GL entries for COGS ${cogsData.transactionNumber}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "COGS_GL_POSTING_FAILED",
      {
        transactionId: cogsData.transactionId,
        transactionNumber: cogsData.transactionNumber,
      }
    );
  }
}

/**
 * Reverse GL entries for a transaction
 * Creates reversing entries with opposite debit/credit
 *
 * @param originalReferenceType Original reference type
 * @param originalReferenceId Original reference ID
 * @param reason Reason for reversal
 * @param userId User ID performing reversal
 * @returns Array of created reversing entries
 * @throws GLPostingError if no original entries found or reversal fails
 */
export async function reverseGLEntries(
  originalReferenceType: string,
  originalReferenceId: number,
  reason: string,
  userId: number
): Promise<GLPostingEntry[]> {
  const db = await getDb();
  if (!db) throw new GLPostingError("Database not available", "DB_UNAVAILABLE");

  try {
    // Find original entries
    const originalEntries = await db
      .select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.referenceType, originalReferenceType),
          eq(ledgerEntries.referenceId, originalReferenceId)
        )
      );

    if (originalEntries.length === 0) {
      // This is an error condition - attempting to reverse non-existent entries indicates a problem
      throw new GLPostingError(
        `No GL entries found for ${originalReferenceType} #${originalReferenceId}. Cannot reverse non-existent entries.`,
        "NO_ENTRIES_TO_REVERSE",
        {
          referenceType: originalReferenceType,
          referenceId: originalReferenceId,
        }
      );
    }

    const fiscalPeriodId = await getCurrentFiscalPeriodId();

    // ACC-005: Validate fiscal period is open for posting reversals
    const isLocked = await isFiscalPeriodLocked(fiscalPeriodId);
    if (isLocked) {
      throw new GLPostingError(
        `Cannot post reversal to fiscal period ${fiscalPeriodId}. The period is locked or closed.`,
        "PERIOD_LOCKED",
        {
          fiscalPeriodId,
          referenceType: originalReferenceType,
          referenceId: originalReferenceId,
        }
      );
    }

    const reversalNumber = await generateEntryNumber("REV");

    // Create reversing entries (swap debit and credit)
    const reversalEntries: GLPostingEntry[] = [];
    for (const entry of originalEntries) {
      await db.insert(ledgerEntries).values({
        entryNumber: `${reversalNumber}-${entry.id}`,
        entryDate: new Date(),
        accountId: entry.accountId,
        debit: entry.credit, // Swap
        credit: entry.debit, // Swap
        description: `Reversal: ${reason} (Original: ${entry.entryNumber})`,
        referenceType: "REVERSAL",
        referenceId: originalReferenceId,
        fiscalPeriodId,
        isManual: false,
        createdBy: userId,
      });

      reversalEntries.push({
        accountId: entry.accountId,
        debit: parseFloat(entry.credit || "0"),
        credit: parseFloat(entry.debit || "0"),
      });
    }

    return reversalEntries;
  } catch (error) {
    logger.error({
      msg: "Error reversing GL entries",
      originalReferenceType,
      originalReferenceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw GLPostingErrors as-is, wrap others
    if (error instanceof GLPostingError) {
      throw error;
    }
    throw new GLPostingError(
      `Failed to reverse GL entries for ${originalReferenceType} #${originalReferenceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      "REVERSAL_FAILED",
      { referenceType: originalReferenceType, referenceId: originalReferenceId }
    );
  }
}

/**
 * Seed standard chart of accounts
 * This should be run once during initial setup
 */
export async function seedStandardAccounts(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const standardAccounts: Array<{
      accountNumber: string;
      accountName: string;
      accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
      normalBalance: "DEBIT" | "CREDIT";
    }> = [
      {
        accountNumber: "1000",
        accountName: "Cash",
        accountType: "ASSET",
        normalBalance: "DEBIT",
      },
      {
        accountNumber: "1200",
        accountName: "Accounts Receivable",
        accountType: "ASSET",
        normalBalance: "DEBIT",
      },
      {
        accountNumber: "1300",
        accountName: "Inventory",
        accountType: "ASSET",
        normalBalance: "DEBIT",
      },
      {
        accountNumber: "4000",
        accountName: "Sales Revenue",
        accountType: "REVENUE",
        normalBalance: "CREDIT",
      },
      {
        accountNumber: "4100",
        accountName: "Sales Returns",
        accountType: "REVENUE",
        normalBalance: "DEBIT",
      },
      {
        accountNumber: "5000",
        accountName: "Cost of Goods Sold",
        accountType: "EXPENSE",
        normalBalance: "DEBIT",
      },
      {
        accountNumber: "5100",
        accountName: "Bad Debt Expense",
        accountType: "EXPENSE",
        normalBalance: "DEBIT",
      },
    ];

    for (const account of standardAccounts) {
      // Check if account already exists
      const [existing] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.accountNumber, account.accountNumber));

      if (!existing) {
        await db.insert(accounts).values({
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountType: account.accountType,
          normalBalance: account.normalBalance,
          isActive: true,
        });
      }
    }

    logger.info({ msg: "Standard accounts seeded successfully" });
  } catch (error) {
    logger.error({
      msg: "Error seeding standard accounts",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(
      `Failed to seed standard accounts: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
