/**
 * Invoice Seeder
 *
 * Seeds the invoices table with realistic invoice data.
 * Depends on: clients, orders
 */

import { db } from "../../db-sync";
import { invoices, clients, orders } from "../../../drizzle/schema";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Invoice Generation Utilities
// ============================================================================

type InvoiceStatus = InvoiceStatus;
const _INVOICE_STATUSES = ["DRAFT", "SENT", "VIEWED", "PARTIAL", "PAID", "OVERDUE", "VOID"] as const;

interface InvoiceData {
  invoiceNumber: string;
  customerId: number;
  invoiceDate: Date;
  dueDate: Date;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: InvoiceStatus;
  paymentTerms: string;
  notes: string | null;
  referenceType: string;
  referenceId: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate an invoice record
 */
function generateInvoice(
  index: number,
  clientId: number,
  orderId: number | null,
  orderTotal: string,
  orderDate: Date
): InvoiceData {
  const invoiceDate = orderDate;
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);

  const totalAmount = parseFloat(orderTotal);
  const today = new Date();
  const daysSinceDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine status and amounts based on age
  let status: InvoiceStatus;
  let amountPaid: number;
  let amountDue: number;

  if (daysSinceDue < -7) {
    // Not yet due - mostly unpaid
    status = faker.helpers.weightedArrayElement([
      { value: "SENT", weight: 50 },
      { value: "VIEWED", weight: 30 },
      { value: "PAID", weight: 20 },
    ]);
    amountPaid = status === "PAID" ? totalAmount : 0;
    amountDue = totalAmount - amountPaid;
  } else if (daysSinceDue <= 0) {
    // Due soon
    status = faker.helpers.weightedArrayElement([
      { value: "PAID", weight: 60 },
      { value: "PARTIAL", weight: 20 },
      { value: "SENT", weight: 20 },
    ]);
    amountPaid = status === "PAID" ? totalAmount : status === "PARTIAL" ? totalAmount * faker.number.float({ min: 0.3, max: 0.7 }) : 0;
    amountDue = totalAmount - amountPaid;
  } else if (daysSinceDue <= 30) {
    // Recently overdue
    status = faker.helpers.weightedArrayElement([
      { value: "PAID", weight: 70 },
      { value: "OVERDUE", weight: 20 },
      { value: "PARTIAL", weight: 10 },
    ]);
    amountPaid = status === "PAID" ? totalAmount : status === "PARTIAL" ? totalAmount * faker.number.float({ min: 0.5, max: 0.8 }) : 0;
    amountDue = totalAmount - amountPaid;
  } else {
    // Long overdue (15% of invoices)
    if (Math.random() < 0.15) {
      status = "OVERDUE";
      // 50% of overdue are 120+ days (completely unpaid)
      if (Math.random() < 0.5) {
        amountPaid = 0;
      } else {
        amountPaid = totalAmount * faker.number.float({ min: 0, max: 0.5 });
      }
      amountDue = totalAmount - amountPaid;
    } else {
      status = "PAID";
      amountPaid = totalAmount;
      amountDue = 0;
    }
  }

  return {
    invoiceNumber: `INV-${String(index + 1).padStart(6, "0")}`,
    customerId: clientId,
    invoiceDate,
    dueDate,
    subtotal: totalAmount.toFixed(2),
    taxAmount: "0.00",
    discountAmount: "0.00",
    totalAmount: totalAmount.toFixed(2),
    amountPaid: amountPaid.toFixed(2),
    amountDue: amountDue.toFixed(2),
    status,
    paymentTerms: "NET_30",
    notes: null,
    referenceType: orderId ? "ORDER" : "MANUAL",
    referenceId: orderId || 0,
    createdBy: 1,
    createdAt: invoiceDate,
    updatedAt: invoiceDate,
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed invoices table
 */
export async function seedInvoices(
  count: number,
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("invoices");
  const startTime = Date.now();

  return withPerformanceLogging("seed:invoices", async () => {
    try {
      seedLogger.tableSeeding("invoices", count);

      // Get existing orders (SALE type only)
      const existingOrders = await db
        .select({
          id: orders.id,
          clientId: orders.clientId,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders);

      // Get existing clients for standalone invoices
      const existingClients = await db
        .select({ id: clients.id })
        .from(clients);

      if (existingClients.length === 0) {
        result.errors.push("No clients found. Seed clients first.");
        return result;
      }

      const records: InvoiceData[] = [];
      const batchSize = 50;

      // Create invoices - prefer linking to orders if available
      for (let i = 0; i < count; i++) {
        let clientId: number;
        let orderId: number | null = null;
        let orderTotal: string;
        let orderDate: Date;

        if (existingOrders.length > 0 && i < existingOrders.length) {
          // Link to existing order
          const order = existingOrders[i];
          clientId = order.clientId;
          orderId = order.id;
          orderTotal = order.total || "1000.00";
          orderDate = order.createdAt || new Date();
        } else {
          // Standalone invoice
          clientId = existingClients[i % existingClients.length].id;
          orderTotal = faker.number.float({ min: 500, max: 50000, fractionDigits: 2 }).toFixed(2);
          orderDate = faker.date.between({
            from: new Date(2024, 0, 1),
            to: new Date(),
          });
        }

        const invoice = generateInvoice(i, clientId, orderId, orderTotal, orderDate);

        const validation = await validator.validateColumns("invoices", invoice);
        if (!validation.valid) {
          result.errors.push(
            `Invoice ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }

        records.push(invoice);
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(invoices).values(batch);
        result.inserted += batch.length;

        if (count > 100 && (i + batchSize) % 100 === 0) {
          seedLogger.operationProgress(
            "seed:invoices",
            Math.min(i + batchSize, records.length),
            records.length
          );
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("invoices", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:invoices",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}


