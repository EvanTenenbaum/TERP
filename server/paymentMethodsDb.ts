/**
 * Payment Methods Database Access Layer
 * Provides CRUD operations for customizable payment methods
 * 
 * This module replaces hardcoded payment method enums with a flexible,
 * database-driven approach that allows users to add custom payment methods
 */

import { getDb } from "./db";
import { logger } from "./_core/logger";
import { 
  paymentMethods,
  type PaymentMethod,
  type InsertPaymentMethod
} from "../drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";

/**
 * Create a new payment method
 * @param data Payment method data to insert
 * @returns The created payment method
 */
export async function createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const [paymentMethod] = await db.insert(paymentMethods).values(data).$returningId();
    
    if (!paymentMethod) {
      throw new Error("Failed to create payment method");
    }
    
    // Fetch the complete payment method record
    const [created] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, paymentMethod.id));
    
    if (!created) {
      throw new Error("Payment method created but not found");
    }
    
    return created;
  } catch (error) {
    logger.error("Error creating payment method", { error });
    throw new Error(`Failed to create payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a payment method by ID
 * @param id Payment method ID
 * @returns The payment method or undefined if not found
 */
export async function getPaymentMethodById(id: number): Promise<PaymentMethod | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const [paymentMethod] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, id));
    
    return paymentMethod;
  } catch (error) {
    logger.error("Error fetching payment method", { error });
    throw new Error(`Failed to fetch payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a payment method by code
 * @param code Payment method code
 * @returns The payment method or undefined if not found
 */
export async function getPaymentMethodByCode(code: string): Promise<PaymentMethod | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const [paymentMethod] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.code, code));
    
    return paymentMethod;
  } catch (error) {
    logger.error("Error fetching payment method by code", { error });
    throw new Error(`Failed to fetch payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all payment methods
 * @param activeOnly If true, only return active payment methods
 * @returns Array of payment methods ordered by sortOrder
 */
export async function getAllPaymentMethods(activeOnly: boolean = false): Promise<PaymentMethod[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    let query = db.select().from(paymentMethods);
    
    if (activeOnly) {
      const results = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.isActive, 1))
        .orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.name));
      return results;
    }
    
    const results = await db
      .select()
      .from(paymentMethods)
      .orderBy(asc(paymentMethods.sortOrder), asc(paymentMethods.name));
    
    return results;
  } catch (error) {
    logger.error("Error fetching payment methods", { error });
    throw new Error(`Failed to fetch payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update a payment method
 * @param id Payment method ID
 * @param data Partial payment method data to update
 * @returns The updated payment method
 */
export async function updatePaymentMethod(id: number, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db
      .update(paymentMethods)
      .set(data)
      .where(eq(paymentMethods.id, id));
    
    const updated = await getPaymentMethodById(id);
    
    if (!updated) {
      throw new Error("Payment method not found after update");
    }
    
    return updated;
  } catch (error) {
    logger.error("Error updating payment method", { error });
    throw new Error(`Failed to update payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deactivate a payment method (soft delete)
 * @param id Payment method ID
 * @returns The updated payment method
 */
export async function deactivatePaymentMethod(id: number): Promise<PaymentMethod> {
  try {
    return await updatePaymentMethod(id, { isActive: 0 });
  } catch (error) {
    logger.error("Error deactivating payment method", { error });
    throw new Error(`Failed to deactivate payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Activate a payment method
 * @param id Payment method ID
 * @returns The updated payment method
 */
export async function activatePaymentMethod(id: number): Promise<PaymentMethod> {
  try {
    return await updatePaymentMethod(id, { isActive: 1 });
  } catch (error) {
    logger.error("Error activating payment method", { error });
    throw new Error(`Failed to activate payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a payment method (hard delete)
 * Only allowed if not used in any transactions
 * @param id Payment method ID
 * @returns True if deleted, false if not found
 */
export async function deletePaymentMethod(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // TODO: Add check to ensure payment method is not used in any transactions
    // This would require querying the payments table
    
    const result = await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, id));
    
    return (result as any).rowsAffected > 0;
  } catch (error) {
    logger.error("Error deleting payment method", { error });
    throw new Error(`Failed to delete payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reorder payment methods
 * @param orderedIds Array of payment method IDs in the desired order
 * @returns Array of updated payment methods
 */
export async function reorderPaymentMethods(orderedIds: number[]): Promise<PaymentMethod[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Update each payment method's sortOrder
    await Promise.all(
      orderedIds.map((id, index) =>
        updatePaymentMethod(id, { sortOrder: index })
      )
    );
    
    // Return the updated list
    return await getAllPaymentMethods();
  } catch (error) {
    logger.error("Error reordering payment methods", { error });
    throw new Error(`Failed to reorder payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Seed default payment methods
 * This should be run once during initial setup to populate the table
 * with the standard payment methods that were previously in the enum
 */
export async function seedDefaultPaymentMethods(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const defaultMethods = [
      { code: "CASH", name: "Cash", description: "Cash payment", sortOrder: 0 },
      { code: "CHECK", name: "Check", description: "Check payment", sortOrder: 1 },
      { code: "CREDIT_CARD", name: "Credit Card", description: "Credit card payment", sortOrder: 2 },
      { code: "DEBIT_CARD", name: "Debit Card", description: "Debit card payment", sortOrder: 3 },
      { code: "ACH", name: "ACH Transfer", description: "ACH bank transfer", sortOrder: 4 },
      { code: "WIRE", name: "Wire Transfer", description: "Wire transfer", sortOrder: 5 },
      { code: "PAYPAL", name: "PayPal", description: "PayPal payment", sortOrder: 6 },
      { code: "VENMO", name: "Venmo", description: "Venmo payment", sortOrder: 7 },
      { code: "ZELLE", name: "Zelle", description: "Zelle payment", sortOrder: 8 },
      { code: "OTHER", name: "Other", description: "Other payment method", sortOrder: 9 }
    ];
    
    for (const method of defaultMethods) {
      // Check if method already exists
      const existing = await getPaymentMethodByCode(method.code);
      
      if (!existing) {
        await createPaymentMethod(method);
      }
    }
    
    console.log("Default payment methods seeded successfully");
  } catch (error) {
    logger.error("Error seeding default payment methods", { error });
    throw new Error(`Failed to seed default payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

