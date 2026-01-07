/**
 * Transactions Database Access Layer
 * Provides CRUD operations and relationship management for the transaction model
 * 
 * This module implements the core transaction relationship functionality,
 * enabling proper linking of refunds to sales, payments to invoices, etc.
 */

import { getDb } from "./db";
import { logger } from "./_core/logger";
import { 
  transactions, 
  transactionLinks,
  type Transaction,
  type InsertTransaction,
  type TransactionLink,
  type InsertTransactionLink
} from "../drizzle/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

/**
 * Create a new transaction
 * @param data Transaction data to insert
 * @returns The created transaction
 */
export async function createTransaction(data: InsertTransaction): Promise<Transaction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    const [transaction] = await db.insert(transactions).values(data).$returningId();
    
    if (!transaction) {
      throw new Error("Failed to create transaction");
    }
    
    // Fetch the complete transaction record
    const [created] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transaction.id));
    
    if (!created) {
      throw new Error("Transaction created but not found");
    }
    
    return created;
  } catch (error) {
    logger.error({ error }, "Error creating transaction");
    throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a transaction by ID
 * @param id Transaction ID
 * @returns The transaction or undefined if not found
 */
export async function getTransactionById(id: number): Promise<Transaction | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    return transaction;
  } catch (error) {
    logger.error({ error }, "Error fetching transaction");
    throw new Error(`Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a transaction by transaction number
 * @param transactionNumber Unique transaction number
 * @returns The transaction or undefined if not found
 */
export async function getTransactionByNumber(transactionNumber: string): Promise<Transaction | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transactionNumber, transactionNumber));
    
    return transaction;
  } catch (error) {
    logger.error({ error }, "Error fetching transaction by number");
    throw new Error(`Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all transactions for a client
 * @param clientId Client ID
 * @param limit Maximum number of results (default: 100)
 * @returns Array of transactions
 */
export async function getTransactionsByClient(clientId: number, limit: number = 100): Promise<Transaction[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    const results = await db
      .select()
      .from(transactions)
      .where(eq(transactions.clientId, clientId))
      .orderBy(desc(transactions.transactionDate))
      .limit(limit);
    
    return results;
  } catch (error) {
    logger.error({ error }, "Error fetching client transactions");
    throw new Error(`Failed to fetch client transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update a transaction
 * @param id Transaction ID
 * @param data Partial transaction data to update
 * @returns The updated transaction
 */
export async function updateTransaction(id: number, data: Partial<InsertTransaction>): Promise<Transaction> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id));
    
    const updated = await getTransactionById(id);
    
    if (!updated) {
      throw new Error("Transaction not found after update");
    }
    
    return updated;
  } catch (error) {
    logger.error({ error }, "Error updating transaction");
    throw new Error(`Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Link two transactions (e.g., refund to original sale, payment to invoice)
 * @param parentId Parent transaction ID
 * @param childId Child transaction ID
 * @param linkType Type of relationship
 * @param createdBy User ID who created the link
 * @param linkAmount Optional amount of the link (for partial payments/refunds)
 * @param notes Optional notes about the link
 * @returns The created transaction link
 */
export async function linkTransactions(
  parentId: number,
  childId: number,
  linkType: "REFUND_OF" | "PAYMENT_FOR" | "CREDIT_APPLIED_TO" | "CONVERTED_FROM" | "PARTIAL_OF" | "RELATED_TO",
  createdBy: number,
  linkAmount?: string,
  notes?: string
): Promise<TransactionLink> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    // Verify both transactions exist
    const parent = await getTransactionById(parentId);
    const child = await getTransactionById(childId);
    
    if (!parent) {
      throw new Error(`Parent transaction ${parentId} not found`);
    }
    
    if (!child) {
      throw new Error(`Child transaction ${childId} not found`);
    }
    
    // Prevent self-reference
    if (parentId === childId) {
      throw new Error("Cannot link a transaction to itself");
    }
    
    // Check if link already exists
    const [existingLink] = await db
      .select()
      .from(transactionLinks)
      .where(
        and(
          eq(transactionLinks.parentTransactionId, parentId),
          eq(transactionLinks.childTransactionId, childId)
        )
      );
    
    if (existingLink) {
      throw new Error("Transaction link already exists");
    }
    
    // Check for circular reference (if child is already a parent of parent)
    const [reverseLink] = await db
      .select()
      .from(transactionLinks)
      .where(
        and(
          eq(transactionLinks.parentTransactionId, childId),
          eq(transactionLinks.childTransactionId, parentId)
        )
      );
    
    if (reverseLink) {
      throw new Error("Cannot create circular reference: child transaction is already a parent of parent transaction");
    }
    
    // Create the link
    const [link] = await db.insert(transactionLinks).values({
      parentTransactionId: parentId,
      childTransactionId: childId,
      transactionLinkType: linkType,
      linkAmount,
      notes,
      createdBy
    }).$returningId();
    
    if (!link) {
      throw new Error("Failed to create transaction link");
    }
    
    // Fetch the complete link record
    const [created] = await db
      .select()
      .from(transactionLinks)
      .where(eq(transactionLinks.id, link.id));
    
    if (!created) {
      throw new Error("Transaction link created but not found");
    }
    
    return created;
  } catch (error) {
    logger.error({ error }, "Error linking transactions");
    throw new Error(`Failed to link transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all links for a transaction (both as parent and child)
 * @param transactionId Transaction ID
 * @returns Object with parent and child links
 */
export async function getTransactionLinks(transactionId: number): Promise<{
  asParent: TransactionLink[];
  asChild: TransactionLink[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    const asParent = await db
      .select()
      .from(transactionLinks)
      .where(eq(transactionLinks.parentTransactionId, transactionId));
    
    const asChild = await db
      .select()
      .from(transactionLinks)
      .where(eq(transactionLinks.childTransactionId, transactionId));
    
    return { asParent, asChild };
  } catch (error) {
    logger.error({ error }, "Error fetching transaction links");
    throw new Error(`Failed to fetch transaction links: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a transaction with all its related transactions
 * @param transactionId Transaction ID
 * @returns Transaction with related transactions
 */
export async function getTransactionWithRelationships(transactionId: number): Promise<{
  transaction: Transaction;
  parentTransactions: Transaction[];
  childTransactions: Transaction[];
  links: {
    asParent: TransactionLink[];
    asChild: TransactionLink[];
  };
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    const transaction = await getTransactionById(transactionId);
    
    if (!transaction) {
      throw new Error("Transaction not found");
    }
    
    const links = await getTransactionLinks(transactionId);
    
    // Fetch parent transactions
    // SQL Safety: Use parameterized inArray instead of raw SQL join
    const parentIds = links.asChild.map(link => link.parentTransactionId);
    const parentTransactions = parentIds.length > 0
      ? await db
          .select()
          .from(transactions)
          .where(inArray(transactions.id, parentIds))
      : [];

    // Fetch child transactions
    // SQL Safety: Use parameterized inArray instead of raw SQL join
    const childIds = links.asParent.map(link => link.childTransactionId);
    const childTransactions = childIds.length > 0
      ? await db
          .select()
          .from(transactions)
          .where(inArray(transactions.id, childIds))
      : [];
    
    return {
      transaction,
      parentTransactions,
      childTransactions,
      links
    };
  } catch (error) {
    logger.error({ error }, "Error fetching transaction with relationships");
    throw new Error(`Failed to fetch transaction relationships: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get transaction history for a client with relationships
 * @param clientId Client ID
 * @param limit Maximum number of results (default: 50)
 * @returns Array of transactions with their relationship counts
 */
export async function getClientTransactionHistory(clientId: number, limit: number = 50): Promise<Array<Transaction & {
  parentLinkCount: number;
  childLinkCount: number;
}>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    const clientTransactions = await getTransactionsByClient(clientId, limit);
    
    // For each transaction, count its links
    const transactionsWithCounts = await Promise.all(
      clientTransactions.map(async (transaction) => {
        const links = await getTransactionLinks(transaction.id);
        return {
          ...transaction,
          parentLinkCount: links.asChild.length,
          childLinkCount: links.asParent.length
        };
      })
    );
    
    return transactionsWithCounts;
  } catch (error) {
    logger.error({ error }, "Error fetching client transaction history");
    throw new Error(`Failed to fetch client transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Remove a transaction link
 * @param linkId Transaction link ID
 * @returns True if deleted, false if not found
 */
export async function removeTransactionLink(linkId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    const result = await db
      .delete(transactionLinks)
      .where(eq(transactionLinks.id, linkId));
    
    return (result as any).rowsAffected > 0;
  } catch (error) {
    logger.error({ error }, "Error removing transaction link");
    throw new Error(`Failed to remove transaction link: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a unique transaction number
 * @param prefix Prefix for the transaction number (e.g., "INV", "PAY", "REF")
 * @returns A unique transaction number
 */
export async function generateTransactionNumber(prefix: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");
  
  try {
    // Get the latest transaction number with this prefix
    const [latest] = await db
      .select()
      .from(transactions)
      .where(sql`${transactions.transactionNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(transactions.transactionNumber))
      .limit(1);
    
    if (!latest) {
      // First transaction with this prefix
      return `${prefix}-00001`;
    }
    
    // Extract the number part and increment
    const match = latest.transactionNumber.match(/(\d+)$/);
    if (!match) {
      // Fallback if format is unexpected
      return `${prefix}-00001`;
    }
    
    const nextNumber = parseInt(match[1], 10) + 1;
    const paddedNumber = nextNumber.toString().padStart(5, '0');
    
    return `${prefix}-${paddedNumber}`;
  } catch (error) {
    logger.error({ error }, "Error generating transaction number");
    throw new Error(`Failed to generate transaction number: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

