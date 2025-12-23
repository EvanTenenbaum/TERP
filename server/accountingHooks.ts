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
import { ledgerEntries, accounts, type InsertLedgerEntry } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./_core/logger";
import { getFiscalPeriodIdOrDefault } from "./_core/fiscalPeriod";

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
 * @returns Account ID or null if not found
 */
async function getAccountIdByNumber(accountNumber: string): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.accountNumber, accountNumber));
    
    return account?.id || null;
  } catch (error) {
    logger.error({
      msg: "Error fetching account",
      accountNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
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
}): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const fiscalPeriodId = await getCurrentFiscalPeriodId();
    const amountNum = parseFloat(entryData.amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error("Invalid amount for journal entry");
    }
    
    // Create debit entry
    await db.insert(ledgerEntries).values({
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
      createdBy: entryData.createdBy
    });
    
    // Create credit entry
    await db.insert(ledgerEntries).values({
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
      createdBy: entryData.createdBy
    });
    
    return [
      { account: entryData.debitAccountId, debit: amountNum, credit: 0 },
      { account: entryData.creditAccountId, debit: 0, credit: amountNum }
    ];
  } catch (error) {
    logger.error({
      msg: "Error creating journal entry",
      entryNumber: entryData.entryNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to create journal entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Post GL entries for a sale
 * Debit: Accounts Receivable
 * Credit: Revenue
 * 
 * @param saleData Sale transaction data
 * @returns Array of created ledger entries
 */
export async function postSaleGLEntries(saleData: {
  transactionId: number;
  transactionNumber: string;
  clientId: number;
  amount: string;
  transactionDate: Date;
  userId: number;
}): Promise<any[]> {
  try {
    const arAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE);
    const revenueAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.REVENUE);
    
    if (!arAccountId || !revenueAccountId) {
      console.warn("Standard accounts not found - skipping GL posting");
      return [];
    }
    
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
      createdBy: saleData.userId
    });
  } catch (error) {
    logger.error({
      msg: "Error posting sale GL entries",
      transactionId: saleData.transactionId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Don't throw - allow sale to complete even if GL posting fails
    logger.warn({ msg: "Sale completed but GL entries failed" });
    return [];
  }
}

/**
 * Post GL entries for a payment
 * Debit: Cash
 * Credit: Accounts Receivable
 * 
 * @param paymentData Payment transaction data
 * @returns Array of created ledger entries
 */
export async function postPaymentGLEntries(paymentData: {
  transactionId: number;
  transactionNumber: string;
  clientId: number;
  amount: string;
  transactionDate: Date;
  userId: number;
}): Promise<any[]> {
  try {
    const cashAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.CASH);
    const arAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE);
    
    if (!cashAccountId || !arAccountId) {
      console.warn("Standard accounts not found - skipping GL posting");
      return [];
    }
    
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
      createdBy: paymentData.userId
    });
  } catch (error) {
    logger.error({
      msg: "Error posting payment GL entries",
      transactionId: paymentData.transactionId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    logger.warn({ msg: "Payment completed but GL entries failed" });
    return [];
  }
}

/**
 * Post GL entries for a refund
 * Debit: Sales Returns (contra-revenue)
 * Credit: Accounts Receivable
 * 
 * @param refundData Refund transaction data
 * @returns Array of created ledger entries
 */
export async function postRefundGLEntries(refundData: {
  transactionId: number;
  transactionNumber: string;
  clientId: number;
  amount: string;
  transactionDate: Date;
  userId: number;
}): Promise<any[]> {
  try {
    const salesReturnsAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.SALES_RETURNS);
    const arAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.ACCOUNTS_RECEIVABLE);
    
    if (!salesReturnsAccountId || !arAccountId) {
      console.warn("Standard accounts not found - skipping GL posting");
      return [];
    }
    
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
      createdBy: refundData.userId
    });
  } catch (error) {
    logger.error({
      msg: "Error posting refund GL entries",
      transactionId: refundData.transactionId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    logger.warn({ msg: "Refund completed but GL entries failed" });
    return [];
  }
}

/**
 * Post GL entries for COGS
 * Debit: Cost of Goods Sold
 * Credit: Inventory
 * 
 * @param cogsData COGS data
 * @returns Array of created ledger entries
 */
export async function postCOGSGLEntries(cogsData: {
  transactionId: number;
  transactionNumber: string;
  cogsAmount: string;
  transactionDate: Date;
  userId: number;
}): Promise<any[]> {
  try {
    const cogsAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.COST_OF_GOODS_SOLD);
    const inventoryAccountId = await getAccountIdByNumber(STANDARD_ACCOUNTS.INVENTORY);
    
    if (!cogsAccountId || !inventoryAccountId) {
      console.warn("Standard accounts not found - skipping COGS GL posting");
      return [];
    }
    
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
      createdBy: cogsData.userId
    });
  } catch (error) {
    logger.error({
      msg: "Error posting COGS GL entries",
      transactionId: cogsData.transactionId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    logger.warn({ msg: "COGS calculation completed but GL entries failed" });
    return [];
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
 */
export async function reverseGLEntries(
  originalReferenceType: string,
  originalReferenceId: number,
  reason: string,
  userId: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
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
      console.warn(`No GL entries found for ${originalReferenceType} #${originalReferenceId}`);
      return [];
    }
    
    const fiscalPeriodId = await getCurrentFiscalPeriodId();
    const reversalNumber = await generateEntryNumber("REV");
    
    // Create reversing entries (swap debit and credit)
    for (const entry of originalEntries) {
      await db.insert(ledgerEntries).values({
        entryNumber: `${reversalNumber}-${entry.id}`,
        entryDate: new Date(),
        accountId: entry.accountId,
        debit: entry.credit, // Swap
        credit: entry.debit, // Swap
        description: `Reversal: ${reason} (Original: ${entry.entryNumber})`,
        referenceType: `${originalReferenceType}_REVERSAL`,
        referenceId: originalReferenceId,
        fiscalPeriodId,
        isManual: false,
        createdBy: userId
      });
    }
    
    return originalEntries;
  } catch (error) {
    logger.error({
      msg: "Error reversing GL entries",
      originalReferenceType,
      originalReferenceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to reverse GL entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const standardAccounts = [
      { accountNumber: "1000", accountName: "Cash", accountType: "ASSET", normalBalance: "DEBIT" },
      { accountNumber: "1200", accountName: "Accounts Receivable", accountType: "ASSET", normalBalance: "DEBIT" },
      { accountNumber: "1300", accountName: "Inventory", accountType: "ASSET", normalBalance: "DEBIT" },
      { accountNumber: "4000", accountName: "Sales Revenue", accountType: "REVENUE", normalBalance: "CREDIT" },
      { accountNumber: "4100", accountName: "Sales Returns", accountType: "REVENUE", normalBalance: "DEBIT" },
      { accountNumber: "5000", accountName: "Cost of Goods Sold", accountType: "EXPENSE", normalBalance: "DEBIT" },
      { accountNumber: "5100", accountName: "Bad Debt Expense", accountType: "EXPENSE", normalBalance: "DEBIT" },
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
          accountType: account.accountType as any,
          normalBalance: account.normalBalance as any,
          isActive: true
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
    throw new Error(`Failed to seed standard accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

