/**
 * Transaction Hooks
 * Automatic side effects for transaction operations
 * 
 * This module implements automatic:
 * - Inventory updates on sales/refunds
 * - Accounting ledger entries
 * - Client balance updates
 */

import * as inventoryMovementsDb from "./inventoryMovementsDb";
import * as transactionsDb from "./transactionsDb";
import * as accountingHooks from "./accountingHooks";
import * as cogsCalculation from "./cogsCalculation";
import { logger } from "./_core/logger";

/**
 * Process a sale transaction - decrease inventory
 * @param saleData Sale transaction data including line items
 * @param userId User ID performing the sale
 * @returns Array of inventory movements created
 */
export async function processSaleInventory(
  saleData: {
    transactionId: number;
    lineItems: Array<{
      batchId: number;
      quantity: string;
      productName?: string;
    }>;
  },
  userId: number
): Promise<any[]> {
  const movements = [];
  
  for (const item of saleData.lineItems) {
    try {
      // Validate availability first
      const availability = await inventoryMovementsDb.validateInventoryAvailability(
        item.batchId,
        item.quantity
      );
      
      if (!availability.available) {
        throw new Error(
          `Insufficient inventory for batch ${item.batchId}. ` +
          `Available: ${availability.currentQuantity}, Requested: ${availability.requestedQuantity}`
        );
      }
      
      // Decrease inventory
      const movement = await inventoryMovementsDb.decreaseInventory(
        item.batchId,
        item.quantity,
        "SALE",
        saleData.transactionId,
        userId,
        `Sale transaction #${saleData.transactionId}`
      );
      
      movements.push(movement);
    } catch (error) {
      logger.error({ batchId: item.batchId, error }, "Error processing inventory for batch");
      // Rollback previous movements if any item fails
      for (const prevMovement of movements) {
        try {
          await inventoryMovementsDb.reverseInventoryMovement(
            prevMovement.id,
            "Sale failed - automatic rollback",
            userId
          );
        } catch (rollbackError) {
          logger.error({ error: rollbackError }, "Error during rollback");
        }
      }
      throw error;
    }
  }
  
  // Post accounting entries for the sale
  try {
    const transaction = await transactionsDb.getTransactionById(saleData.transactionId);
    if (transaction) {
      await accountingHooks.postSaleGLEntries({
        transactionId: saleData.transactionId,
        transactionNumber: transaction.transactionNumber,
        clientId: transaction.clientId,
        amount: transaction.amount,
        transactionDate: new Date(transaction.transactionDate),
        userId
      });
      
      // Calculate and post COGS
      const cogsResult = await cogsCalculation.calculateSaleCOGS(
        { lineItems: saleData.lineItems },
        transaction.clientId
      );
      
      await accountingHooks.postCOGSGLEntries({
        transactionId: saleData.transactionId,
        transactionNumber: transaction.transactionNumber,
        cogsAmount: cogsResult.totalCOGS.toFixed(2),
        transactionDate: new Date(transaction.transactionDate),
        userId
      });
    }
  } catch (error) {
    logger.error({ error }, "Error posting accounting entries");
    // Don't fail the sale if GL posting fails
  }
  
  return movements;
}

/**
 * Process a refund transaction - increase inventory
 * @param refundData Refund transaction data including line items
 * @param userId User ID performing the refund
 * @returns Array of inventory movements created
 */
export async function processRefundInventory(
  refundData: {
    transactionId: number;
    lineItems: Array<{
      batchId: number;
      quantity: string;
      productName?: string;
    }>;
  },
  userId: number
): Promise<any[]> {
  const movements = [];
  
  for (const item of refundData.lineItems) {
    try {
      // Increase inventory
      const movement = await inventoryMovementsDb.increaseInventory(
        item.batchId,
        item.quantity,
        "REFUND",
        refundData.transactionId,
        userId,
        `Refund transaction #${refundData.transactionId}`
      );
      
      movements.push(movement);
    } catch (error) {
      logger.error({ batchId: item.batchId, error }, "Error processing refund inventory for batch");
      // Rollback previous movements if any item fails
      for (const prevMovement of movements) {
        try {
          await inventoryMovementsDb.reverseInventoryMovement(
            prevMovement.id,
            "Refund failed - automatic rollback",
            userId
          );
        } catch (rollbackError) {
          logger.error({ error: rollbackError }, "Error during refund rollback");
        }
      }
      throw error;
    }
  }
  
  return movements;
}

/**
 * Validate inventory availability for all items in a transaction
 * @param lineItems Line items to validate
 * @returns Validation result with details
 */
export async function validateTransactionInventory(
  lineItems: Array<{
    batchId: number;
    quantity: string;
    productName?: string;
  }>
): Promise<{
  valid: boolean;
  errors: Array<{
    batchId: number;
    productName?: string;
    error: string;
    available: number;
    requested: number;
  }>;
}> {
  const errors = [];
  
  for (const item of lineItems) {
    try {
      const availability = await inventoryMovementsDb.validateInventoryAvailability(
        item.batchId,
        item.quantity
      );
      
      if (!availability.available) {
        errors.push({
          batchId: item.batchId,
          productName: item.productName,
          error: "Insufficient inventory",
          available: availability.currentQuantity,
          requested: availability.requestedQuantity
        });
      }
    } catch (error) {
      errors.push({
        batchId: item.batchId,
        productName: item.productName,
        error: error instanceof Error ? error.message : "Unknown error",
        available: 0,
        requested: parseFloat(item.quantity)
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get inventory impact summary for a transaction
 * @param transactionId Transaction ID
 * @returns Summary of inventory movements
 */
export async function getTransactionInventoryImpact(
  transactionId: number
): Promise<{
  movements: any[];
  totalItems: number;
  totalQuantity: number;
}> {
  try {
    const movements = await inventoryMovementsDb.getMovementsByReference(
      "SALE",
      transactionId
    );
    
    const totalQuantity = movements.reduce((sum, movement) => {
      const qty = Math.abs(parseFloat(movement.quantityChange));
      return sum + qty;
    }, 0);
    
    return {
      movements,
      totalItems: movements.length,
      totalQuantity
    };
  } catch (error) {
    logger.error({ error }, "Error getting transaction inventory impact");
    return {
      movements: [],
      totalItems: 0,
      totalQuantity: 0
    };
  }
}

