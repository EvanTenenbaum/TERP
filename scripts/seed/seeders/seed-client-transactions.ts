/**
 * Client Transactions Seeder
 *
 * Seeds the client_transactions table with transaction data from seeded orders.
 * Also recalculates client stats after seeding.
 * Depends on: clients, orders
 *
 * Requirements: 6.1, 9.1
 */

import { db } from "../../db-sync";
import { clientTransactions, orders, clients } from "../../../drizzle/schema";
import { updateClientStats } from "../../../server/clientsDb";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";

// ============================================================================
// Type Definitions
// ============================================================================

type TransactionType = "INVOICE" | "PAYMENT" | "QUOTE" | "ORDER" | "REFUND" | "CREDIT";
type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "PARTIAL";

interface ClientTransactionData {
  clientId: number;
  transactionType: TransactionType;
  transactionNumber: string | null;
  transactionDate: Date;
  amount: string;
  paymentStatus: PaymentStatus;
  paymentDate: Date | null;
  paymentAmount: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

// ============================================================================
// Transaction Generation Utilities
// ============================================================================

/**
 * Map order sale status to transaction payment status
 */
function mapSaleStatusToPaymentStatus(saleStatus: string): PaymentStatus {
  switch (saleStatus) {
    case "PAID":
      return "PAID";
    case "PARTIAL":
      return "PARTIAL";
    case "OVERDUE":
      return "OVERDUE";
    case "PENDING":
    default:
      return "PENDING";
  }
}

/**
 * Generate a client transaction from an order
 */
function generateTransactionFromOrder(
  order: {
    id: number;
    orderNumber: string | null;
    clientId: number;
    total: string | null;
    saleStatus: string | null;
    createdAt: Date | null;
  }
): ClientTransactionData {
  const paymentStatus = mapSaleStatusToPaymentStatus(order.saleStatus || "PENDING");
  const amount = order.total || "0.00";
  const transactionDate = order.createdAt || new Date();

  // Calculate payment date and amount for paid/partial transactions
  let paymentDate: Date | null = null;
  let paymentAmount: string | null = null;

  if (paymentStatus === "PAID") {
    // Payment date is typically a few days after order
    paymentDate = new Date(transactionDate);
    paymentDate.setDate(paymentDate.getDate() + Math.floor(Math.random() * 14) + 1);
    paymentAmount = amount;
  } else if (paymentStatus === "PARTIAL") {
    paymentDate = new Date(transactionDate);
    paymentDate.setDate(paymentDate.getDate() + Math.floor(Math.random() * 14) + 1);
    // Partial payment is 30-70% of total
    const partialPercent = 0.3 + Math.random() * 0.4;
    paymentAmount = (parseFloat(amount) * partialPercent).toFixed(2);
  }

  return {
    clientId: order.clientId,
    transactionType: "ORDER",
    transactionNumber: order.orderNumber,
    transactionDate,
    amount,
    paymentStatus,
    paymentDate,
    paymentAmount,
    notes: null,
    metadata: { orderId: order.id },
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed client_transactions table from existing orders
 * Requirements: 6.1, 9.1
 */
export async function seedClientTransactions(
  _count: number, // Not used - we create one transaction per order
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("client_transactions");
  const startTime = Date.now();

  return withPerformanceLogging("seed:client_transactions", async () => {
    try {
      // Get all existing orders
      const existingOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          clientId: orders.clientId,
          total: orders.total,
          saleStatus: orders.saleStatus,
          createdAt: orders.createdAt,
        })
        .from(orders);

      if (existingOrders.length === 0) {
        result.errors.push("No orders found. Seed orders first.");
        return result;
      }

      seedLogger.tableSeeding("client_transactions", existingOrders.length);

      const records: ClientTransactionData[] = [];
      const batchSize = 50;

      // Generate a client transaction for each order
      for (const order of existingOrders) {
        const transaction = generateTransactionFromOrder(order);

        // Validate the transaction data
        const validation = await validator.validateColumns("client_transactions", transaction as unknown as Record<string, unknown>);
        if (!validation.valid) {
          result.errors.push(
            `Transaction for order ${order.id}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }

        records.push(transaction);
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(clientTransactions).values(batch);
        result.inserted += batch.length;

        if (records.length > 100 && (i + batchSize) % 100 === 0) {
          seedLogger.operationProgress(
            "seed:client_transactions",
            Math.min(i + batchSize, records.length),
            records.length
          );
        }
      }

      // Recalculate client stats for all affected clients
      // Requirements: 6.2, 6.3
      const affectedClientIds = [...new Set(existingOrders.map((o) => o.clientId))];
      seedLogger.operationStart("update-client-stats", { clientCount: affectedClientIds.length });

      let statsUpdated = 0;
      for (const clientId of affectedClientIds) {
        try {
          await updateClientStats(clientId);
          statsUpdated++;

          if (affectedClientIds.length > 50 && statsUpdated % 50 === 0) {
            seedLogger.operationProgress(
              "update-client-stats",
              statsUpdated,
              affectedClientIds.length
            );
          }
        } catch (error) {
          result.errors.push(
            `Failed to update stats for client ${clientId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      seedLogger.operationSuccess("update-client-stats", { updated: statsUpdated });

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("client_transactions", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:client_transactions",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}
