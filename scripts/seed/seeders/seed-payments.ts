/**
 * Payment Seeder
 *
 * Seeds the payments table with realistic payment data.
 * Depends on: invoices, clients
 */

import { db } from "../../db-sync";
import { payments, invoices, clients } from "../../../drizzle/schema";
import { eq, and, ne } from "drizzle-orm";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Payment Generation Utilities
// ============================================================================

const PAYMENT_METHODS = ["CASH", "CHECK", "WIRE", "ACH", "CREDIT_CARD", "DEBIT_CARD", "OTHER"] as const;
const PAYMENT_TYPES = ["RECEIVED", "SENT"] as const;

interface PaymentData {
  paymentNumber: string;
  paymentType: typeof PAYMENT_TYPES[number];
  paymentDate: Date;
  amount: string;
  paymentMethod: typeof PAYMENT_METHODS[number];
  referenceNumber: string | null;
  customerId: number | null;
  vendorId: number | null;
  invoiceId: number | null;
  billId: number | null;
  bankAccountId: number | null;
  notes: string | null;
  isReconciled: boolean;
  createdBy: number;
}

/**
 * Generate a payment record
 */
function generatePayment(
  index: number,
  clientId: number | null,
  vendorId: number | null,
  invoiceId: number | null,
  invoiceAmount: number,
  invoiceDate: Date
): PaymentData {
  // Payment date is after invoice date
  const paymentDate = new Date(invoiceDate);
  paymentDate.setDate(paymentDate.getDate() + faker.number.int({ min: 1, max: 45 }));

  // Payment amount (full or partial)
  const isPartial = Math.random() < 0.2;
  const amount = isPartial
    ? invoiceAmount * faker.number.float({ min: 0.3, max: 0.9 })
    : invoiceAmount;

  const paymentMethod = faker.helpers.weightedArrayElement([
    { value: "CHECK" as const, weight: 40 },
    { value: "ACH" as const, weight: 30 },
    { value: "WIRE" as const, weight: 15 },
    { value: "CASH" as const, weight: 10 },
    { value: "CREDIT_CARD" as const, weight: 5 },
  ]);

  // Generate reference number based on payment method
  let referenceNumber: string | null = null;
  switch (paymentMethod) {
    case "CHECK":
      referenceNumber = `CHK-${faker.number.int({ min: 1000, max: 9999 })}`;
      break;
    case "ACH":
      referenceNumber = `ACH-${faker.string.alphanumeric(10).toUpperCase()}`;
      break;
    case "WIRE":
      referenceNumber = `WIRE-${faker.string.alphanumeric(12).toUpperCase()}`;
      break;
    case "CREDIT_CARD":
      referenceNumber = `CC-${faker.string.numeric(4)}`;
      break;
  }

  // Determine payment type: RECEIVED (from customers) or SENT (to vendors)
  const paymentType: typeof PAYMENT_TYPES[number] = clientId ? "RECEIVED" : "SENT";

  return {
    paymentNumber: `PAY-${String(index + 1).padStart(6, "0")}`,
    paymentType,
    paymentDate,
    amount: amount.toFixed(2),
    paymentMethod,
    referenceNumber,
    customerId: clientId,
    vendorId,
    invoiceId,
    billId: null,
    bankAccountId: null,
    notes: Math.random() < 0.1 ? faker.lorem.sentence() : null,
    isReconciled: Math.random() < 0.7, // 70% reconciled
    createdBy: 1,
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed payments table
 */
const now = new Date();

export async function seedPayments(
  count: number,
  validator: SchemaValidator,
  masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("payments");
  const startTime = Date.now();

  return withPerformanceLogging("seed:payments", async () => {
    try {
      seedLogger.tableSeeding("payments", count);

      // Get existing invoices that have been paid (at least partially)
      const existingInvoices = await db
        .select({
          id: invoices.id,
          customerId: invoices.customerId,
          totalAmount: invoices.totalAmount,
          amountPaid: invoices.amountPaid,
          invoiceDate: invoices.invoiceDate,
        })
        .from(invoices);

      // Get existing clients for standalone payments
      const existingClients = await db
        .select({ id: clients.id })
        .from(clients);

      if (existingClients.length === 0) {
        result.errors.push("No clients found. Seed clients first.");
        return result;
      }

      // Filter invoices that have payments
      const paidInvoices = existingInvoices.filter(
        (inv) => parseFloat(inv.amountPaid || "0") > 0
      );

      const records: PaymentData[] = [];
      const batchSize = 50;

      // Generate payments
      for (let i = 0; i < count; i++) {
        let clientId: number | null = null;
        let vendorId: number | null = null;
        let invoiceId: number | null = null;
        let invoiceAmount: number;
        let invoiceDate: Date;

        if (paidInvoices.length > 0 && i < paidInvoices.length) {
          // Link to existing paid invoice (AR payment - RECEIVED)
          const invoice = paidInvoices[i];
          clientId = invoice.customerId;
          invoiceId = invoice.id;
          invoiceAmount = parseFloat(invoice.amountPaid || "0");
          invoiceDate = invoice.invoiceDate || new Date();
        } else if (existingInvoices.length > 0) {
          // Link to any invoice (AR payment - RECEIVED)
          const invoice = existingInvoices[i % existingInvoices.length];
          clientId = invoice.customerId;
          invoiceId = invoice.id;
          invoiceAmount = parseFloat(invoice.totalAmount || "1000");
          invoiceDate = invoice.invoiceDate || new Date();
        } else {
          // Standalone payment (no invoices exist)
          clientId = existingClients[i % existingClients.length].id;
          invoiceAmount = faker.number.float({ min: 100, max: 10000, fractionDigits: 2 });
          invoiceDate = faker.date.between({
            from: new Date(2024, 0, 1),
            to: new Date(),
          });
        }

        const payment = generatePayment(i, clientId, vendorId, invoiceId, invoiceAmount, invoiceDate);

        const validation = await validator.validateColumns("payments", payment);
        if (!validation.valid) {
          result.errors.push(
            `Payment ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }

        records.push(payment);
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(payments).values(batch);
        result.inserted += batch.length;

        if (count > 100 && (i + batchSize) % 100 === 0) {
          seedLogger.operationProgress(
            "seed:payments",
            Math.min(i + batchSize, records.length),
            records.length
          );
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("payments", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:payments",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}


