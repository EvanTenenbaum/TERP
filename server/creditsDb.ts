/**
 * Credits Database Access Layer
 * Provides CRUD operations and application logic for customer credits
 * 
 * This module implements credit management functionality including:
 * - Credit issuance
 * - Credit application to invoices
 * - Credit balance tracking
 * - Credit expiration management
 */

import { getDb } from "./db";
import { 
  credits,
  creditApplications,
  type Credit,
  type InsertCredit,
  type CreditApplication,
  type InsertCreditApplication
} from "../drizzle/schema";
import { eq, and, desc, sql, or, lt } from "drizzle-orm";
import { logger } from "./_core/logger";

/**
 * Create a new credit
 * @param data Credit data to insert
 * @returns The created credit
 */
export async function createCredit(data: InsertCredit): Promise<Credit> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Ensure amountRemaining equals creditAmount for new credits
    const creditData = {
      ...data,
      amountRemaining: data.creditAmount,
      amountUsed: "0"
    };
    
    const [credit] = await db.insert(credits).values(creditData).$returningId();
    
    if (!credit) {
      throw new Error("Failed to create credit");
    }
    
    // Fetch the complete credit record
    const [created] = await db
      .select()
      .from(credits)
      .where(eq(credits.id, credit.id));
    
    if (!created) {
      throw new Error("Credit created but not found");
    }
    
    return created;
  } catch (error) {
    logger.error({
      msg: "Error creating credit",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to create credit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a credit by ID
 * @param id Credit ID
 * @returns The credit or undefined if not found
 */
export async function getCreditById(id: number): Promise<Credit | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const [credit] = await db
      .select()
      .from(credits)
      .where(eq(credits.id, id));
    
    return credit;
  } catch (error) {
    logger.error({
      msg: "Error fetching credit",
      creditId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch credit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a credit by credit number
 * @param creditNumber Unique credit number
 * @returns The credit or undefined if not found
 */
export async function getCreditByNumber(creditNumber: string): Promise<Credit | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const [credit] = await db
      .select()
      .from(credits)
      .where(eq(credits.creditNumber, creditNumber));
    
    return credit;
  } catch (error) {
    logger.error({
      msg: "Error fetching credit by number",
      creditNumber,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch credit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all credits for a client
 * @param clientId Client ID
 * @param activeOnly If true, only return active/partially used credits
 * @returns Array of credits
 */
export async function getCreditsByClient(clientId: number, activeOnly: boolean = false): Promise<Credit[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    let results;
    
    if (activeOnly) {
      results = await db
        .select()
        .from(credits)
        .where(
          and(
            eq(credits.clientId, clientId),
            or(
              eq(credits.creditStatus, "ACTIVE"),
              eq(credits.creditStatus, "PARTIALLY_USED")
            )
          )
        )
        .orderBy(desc(credits.createdAt));
    } else {
      results = await db
        .select()
        .from(credits)
        .where(eq(credits.clientId, clientId))
        .orderBy(desc(credits.createdAt));
    }
    
    return results;
  } catch (error) {
    logger.error({
      msg: "Error fetching client credits",
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch client credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get total available credit balance for a client
 * @param clientId Client ID
 * @returns Total available credit amount
 */
export async function getClientCreditBalance(clientId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const activeCredits = await getCreditsByClient(clientId, true);
    
    const totalBalance = activeCredits.reduce((sum, credit) => {
      // Check if credit is expired
      if (credit.expirationDate && new Date(credit.expirationDate) < new Date()) {
        return sum;
      }
      
      const remaining = parseFloat(credit.amountRemaining);
      return sum + (isNaN(remaining) ? 0 : remaining);
    }, 0);
    
    return totalBalance;
  } catch (error) {
    logger.error({
      msg: "Error calculating client credit balance",
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to calculate credit balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Apply credit to an invoice
 * 
 * ⚠️ RACE CONDITION RISK: This function should be wrapped in a database transaction
 * to prevent concurrent applications of the same credit. Consider using SELECT ... FOR UPDATE
 * on the credit record to lock it during the operation.
 * 
 * @param creditId Credit ID
 * @param invoiceId Invoice ID (transaction ID)
 * @param amountToApply Amount to apply
 * @param appliedBy User ID applying the credit
 * @param notes Optional notes
 * @returns The created credit application
 */
export async function applyCredit(
  creditId: number,
  invoiceId: number,
  amountToApply: string,
  appliedBy: number,
  notes?: string
): Promise<CreditApplication> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Fetch the credit
    const credit = await getCreditById(creditId);
    
    if (!credit) {
      throw new Error("Credit not found");
    }
    
    // Verify credit is active or partially used
    if (credit.creditStatus !== "ACTIVE" && credit.creditStatus !== "PARTIALLY_USED") {
      throw new Error(`Credit is ${credit.creditStatus.toLowerCase()} and cannot be applied`);
    }
    
    // Check if credit is expired
    if (credit.expirationDate && new Date(credit.expirationDate) < new Date()) {
      throw new Error("Credit has expired");
    }
    
    // Verify sufficient balance
    const amountToApplyNum = parseFloat(amountToApply);
    const amountRemainingNum = parseFloat(credit.amountRemaining);
    
    if (isNaN(amountToApplyNum) || amountToApplyNum <= 0) {
      throw new Error("Invalid amount to apply");
    }
    
    if (amountToApplyNum > amountRemainingNum) {
      throw new Error(`Insufficient credit balance. Available: ${credit.amountRemaining}, Requested: ${amountToApply}`);
    }
    
    // Create the credit application
    const [application] = await db.insert(creditApplications).values({
      creditId,
      invoiceId,
      amountApplied: amountToApply,
      appliedDate: new Date(),
      notes,
      appliedBy
    }).$returningId();
    
    if (!application) {
      throw new Error("Failed to create credit application");
    }
    
    // Update the credit balance and status
    const newAmountUsed = parseFloat(credit.amountUsed) + amountToApplyNum;
    const newAmountRemaining = parseFloat(credit.creditAmount) - newAmountUsed;
    
    let newStatus: "ACTIVE" | "PARTIALLY_USED" | "FULLY_USED" = "ACTIVE";
    if (newAmountRemaining <= 0) {
      newStatus = "FULLY_USED";
    } else if (newAmountUsed > 0) {
      newStatus = "PARTIALLY_USED";
    }
    
    await db
      .update(credits)
      .set({
        amountUsed: newAmountUsed.toFixed(2),
        amountRemaining: newAmountRemaining.toFixed(2),
        creditStatus: newStatus
      })
      .where(eq(credits.id, creditId));
    
    // Fetch the complete application record
    const [created] = await db
      .select()
      .from(creditApplications)
      .where(eq(creditApplications.id, application.id));
    
    if (!created) {
      throw new Error("Credit application created but not found");
    }
    
    return created;
  } catch (error) {
    logger.error({
      msg: "Error applying credit",
      creditId,
      invoiceId,
      amountToApply,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to apply credit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all applications for a credit
 * @param creditId Credit ID
 * @returns Array of credit applications
 */
export async function getCreditApplications(creditId: number): Promise<CreditApplication[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const applications = await db
      .select()
      .from(creditApplications)
      .where(eq(creditApplications.creditId, creditId))
      .orderBy(desc(creditApplications.appliedDate));
    
    return applications;
  } catch (error) {
    logger.error({
      msg: "Error fetching credit applications",
      creditId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch credit applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all credits applied to an invoice
 * @param invoiceId Invoice ID
 * @returns Array of credit applications
 */
export async function getInvoiceCreditApplications(invoiceId: number): Promise<CreditApplication[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const applications = await db
      .select()
      .from(creditApplications)
      .where(eq(creditApplications.invoiceId, invoiceId))
      .orderBy(desc(creditApplications.appliedDate));
    
    return applications;
  } catch (error) {
    logger.error({
      msg: "Error fetching invoice credit applications",
      invoiceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch invoice credit applications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get credit history for a client (credits and applications)
 * @param clientId Client ID
 * @returns Object with credits and applications
 */
export async function getClientCreditHistory(clientId: number): Promise<{
  credits: Credit[];
  applications: Array<CreditApplication & { creditNumber: string }>;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const clientCredits = await getCreditsByClient(clientId);
    
    // Get all applications for these credits
    const creditIds = clientCredits.map(c => c.id);
    
    let applications: Array<CreditApplication & { creditNumber: string }> = [];
    
    if (creditIds.length > 0) {
      const apps = await db
        .select({
          id: creditApplications.id,
          creditId: creditApplications.creditId,
          invoiceId: creditApplications.invoiceId,
          amountApplied: creditApplications.amountApplied,
          appliedDate: creditApplications.appliedDate,
          notes: creditApplications.notes,
          appliedBy: creditApplications.appliedBy,
          createdAt: creditApplications.createdAt,
          creditNumber: credits.creditNumber
        })
        .from(creditApplications)
        .innerJoin(credits, eq(creditApplications.creditId, credits.id))
        .where(sql`${creditApplications.creditId} IN (${creditIds.join(',')})`)
        .orderBy(desc(creditApplications.appliedDate));
      
      applications = apps;
    }
    
    return {
      credits: clientCredits,
      applications
    };
  } catch (error) {
    logger.error({
      msg: "Error fetching client credit history",
      clientId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to fetch client credit history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Void a credit (mark as void and prevent further use)
 * @param creditId Credit ID
 * @returns The updated credit
 */
export async function voidCredit(creditId: number): Promise<Credit> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const credit = await getCreditById(creditId);
    
    if (!credit) {
      throw new Error("Credit not found");
    }
    
    if (credit.creditStatus === "FULLY_USED") {
      throw new Error("Cannot void a fully used credit");
    }
    
    // Check if credit has any applications
    const applications = await getCreditApplications(creditId);
    
    if (applications.length > 0) {
      throw new Error("Cannot void a credit that has been applied. Please reverse the applications first.");
    }
    
    await db
      .update(credits)
      .set({
        creditStatus: "VOID",
        amountRemaining: "0"
      })
      .where(eq(credits.id, creditId));
    
    const updated = await getCreditById(creditId);
    
    if (!updated) {
      throw new Error("Credit not found after void");
    }
    
    return updated;
  } catch (error) {
    logger.error({
      msg: "Error voiding credit",
      creditId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to void credit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Mark expired credits as EXPIRED
 * This should be run periodically (e.g., daily cron job)
 * @returns Number of credits marked as expired
 */
export async function markExpiredCredits(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const now = new Date();
    
    const result = await db
      .update(credits)
      .set({ creditStatus: "EXPIRED" })
      .where(
        and(
          lt(credits.expirationDate, now),
          or(
            eq(credits.creditStatus, "ACTIVE"),
            eq(credits.creditStatus, "PARTIALLY_USED")
          )
        )
      );
    
    return (result as any).rowsAffected || 0;
  } catch (error) {
    logger.error({
      msg: "Error marking expired credits",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to mark expired credits: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a unique credit number
 * @param prefix Prefix for the credit number (default: "CR")
 * @returns A unique credit number
 */
export async function generateCreditNumber(prefix: string = "CR"): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Get the latest credit number with this prefix
    const [latest] = await db
      .select()
      .from(credits)
      .where(sql`${credits.creditNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(credits.creditNumber))
      .limit(1);
    
    if (!latest) {
      // First credit with this prefix
      return `${prefix}-00001`;
    }
    
    // Extract the number part and increment
    const match = latest.creditNumber.match(/(\d+)$/);
    if (!match) {
      // Fallback if format is unexpected
      return `${prefix}-00001`;
    }
    
    const nextNumber = parseInt(match[1], 10) + 1;
    const paddedNumber = nextNumber.toString().padStart(5, '0');
    
    return `${prefix}-${paddedNumber}`;
  } catch (error) {
    logger.error({
      msg: "Error generating credit number",
      prefix,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to generate credit number: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

