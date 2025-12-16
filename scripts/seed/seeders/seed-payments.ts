/**
 * Payment Seeder
 *
 * Seeds the payments table with realistic payment data.
 * Links payments to invoices and updates invoice amountPaid and status.
 * Depends on: invoices, clients
 *
 * Requirements: 9.3 - WHEN seeding payments THEN the system SHALL link them to
 * invoices via invoiceId and update invoice amountPaid and status
 */

import { db } from "../../db-sync";
import { payments, invoices, clients } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Payment Generation Utilities
// ============================================================================

type PaymentMethod = "CASH" | "CHECK" | "WIRE" | "ACH" | "CREDIT_CARD" | "DEBIT_CARD" | "OTHER";
const _PAYMENT_METHODS = ["CASH", "CHECK", "WIRE", "ACH", "CREDIT_CARD", "DEBIT_CARD", "OTHER"] as const;
type PaymentType = "RECEIVED" | "SENT";
const _PAYMENT_TYPES = ["RECEIVED", "SENT"] as const;
type InvoiceStatus = "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";

interface PaymentData {
  paymentNumber: string;
  paymentType: PaymentType;
  paymentDate: Date;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  customerId: number | null;
  vendorId: number | null;
  invoiceId: number | null;
  billId: number | null;
  bankAccountId: number | null;
  notes: string | null;
  isReconciled: boolean;
  createdBy: number;
  createdAt: Date;
}

interface InvoiceUpdate {
  invoiceId: number;
  newAmountPaid: string;
  newAmountDue: string;
  newStatus: InvoiceStatus;
}

/**
 * Calculate the new invoice status based on payment amounts
 * Requirements: 9.3
 */
export function calculateInvoiceStatus(
  totalAmount: number,
  amountPaid: number
): InvoiceStatus {
  if (amountPaid >= totalAmount) {
    return "PAID";
  } else if (amountPaid > 0) {
    return "PARTIAL";
  }
  return "SENT"; // Default status for unpaid invoices
}

/**
 * Calculate invoice update after payment
 * Requirements: 9.3 - Update invoice amountPaid and status after payment creation
 */
export function calculateInvoiceUpdate(
  invoiceId: number,
  currentAmountPaid: number,
  totalAmount: number,
  paymentAmount: number
): InvoiceUpdate {
  const newAmountPaid = currentAmountPaid + paymentAmount;
  const newAmountDue = Math.max(0, totalAmount - newAmountPaid);
  const newStatus = calculateInvoiceStatus(totalAmount, newAmountPaid);

  return {
    invoiceId,
    newAmountPaid: newAmountPaid.toFixed(2),
    newAmountDue: newAmountDue.toFixed(2),
    newStatus,
  };
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
  const paymentType: PaymentType = clientId ? "RECEIVED" : "SENT";

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
    createdAt: paymentDate,
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed payments table
 * Requirements: 9.3 - Link payments to invoices and update invoice amountPaid and status
 */
export async function seedPayments(
  count: number,
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("payments");
  const startTime = Date.now();

  return withPerformanceLogging("seed:payments", async () => {
    try {
      seedLogger.tableSeeding("payments", count);

      // Get existing invoices - prioritize unpaid/partially paid invoices
      const existingInvoices = await db
        .select({
          id: invoices.id,
          customerId: invoices.customerId,
          totalAmount: invoices.totalAmount,
          amountPaid: invoices.amountPaid,
          amountDue: invoices.amountDue,
          status: invoices.status,
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

      // Filter invoices that need payments (not fully paid)
      const unpaidInvoices = existingInvoices.filter(
        (inv) => inv.status !== "PAID" && inv.status !== "VOID"
      );

      const records: PaymentData[] = [];
      const invoiceUpdates: InvoiceUpdate[] = [];
      const batchSize = 50;

      // Track cumulative payments per invoice to handle multiple payments
      const invoicePaymentTotals = new Map<number, number>();

      // Generate payments - link to invoices when available
      for (let i = 0; i < count; i++) {
        let clientId: number | null = null;
        let vendorId: number | null = null;
        let invoiceId: number | null = null;
        let invoiceAmount: number;
        let invoiceDate: Date;
        let invoiceForUpdate: typeof existingInvoices[0] | null = null;

        if (unpaidInvoices.length > 0) {
          // Link to unpaid invoice (AR payment - RECEIVED)
          // Cycle through unpaid invoices
          const invoiceIndex = i % unpaidInvoices.length;
          const invoice = unpaidInvoices[invoiceIndex];
          clientId = invoice.customerId;
          invoiceId = invoice.id;
          invoiceForUpdate = invoice;

          // Calculate remaining amount due considering previous payments in this seeding run
          const previousPayments = invoicePaymentTotals.get(invoice.id) || 0;
          const currentAmountPaid = parseFloat(invoice.amountPaid || "0") + previousPayments;
          const totalAmount = parseFloat(invoice.totalAmount || "1000");
          const remainingDue = totalAmount - currentAmountPaid;

          // Payment amount: either full remaining or partial
          if (remainingDue > 0) {
            const isPartial = Math.random() < 0.3; // 30% chance of partial payment
            invoiceAmount = isPartial
              ? remainingDue * faker.number.float({ min: 0.3, max: 0.9 })
              : remainingDue;
          } else {
            // Invoice already fully paid, create a smaller payment
            invoiceAmount = faker.number.float({ min: 100, max: 1000, fractionDigits: 2 });
          }

          invoiceDate = invoice.invoiceDate || new Date();
        } else if (existingInvoices.length > 0) {
          // Link to any invoice (AR payment - RECEIVED)
          const invoice = existingInvoices[i % existingInvoices.length];
          clientId = invoice.customerId;
          invoiceId = invoice.id;
          invoiceForUpdate = invoice;
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

        const validation = await validator.validateColumns("payments", payment as unknown as Record<string, unknown>);
        if (!validation.valid) {
          result.errors.push(
            `Payment ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }

        records.push(payment);

        // Track invoice update if linked to an invoice
        if (invoiceId && invoiceForUpdate) {
          const previousPayments = invoicePaymentTotals.get(invoiceId) || 0;
          const paymentAmount = parseFloat(payment.amount);
          invoicePaymentTotals.set(invoiceId, previousPayments + paymentAmount);

          // Calculate invoice update
          const currentAmountPaid = parseFloat(invoiceForUpdate.amountPaid || "0") + previousPayments;
          const totalAmount = parseFloat(invoiceForUpdate.totalAmount || "0");

          const update = calculateInvoiceUpdate(
            invoiceId,
            currentAmountPaid,
            totalAmount,
            paymentAmount
          );
          invoiceUpdates.push(update);
        }
      }

      // Insert payments in batches
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

      // Update invoices with new amountPaid and status
      // Group updates by invoiceId to get final state
      const finalInvoiceUpdates = new Map<number, InvoiceUpdate>();
      for (const update of invoiceUpdates) {
        finalInvoiceUpdates.set(update.invoiceId, update);
      }

      // Apply invoice updates
      let invoicesUpdated = 0;
      for (const [invoiceId, update] of finalInvoiceUpdates) {
        try {
          await db
            .update(invoices)
            .set({
              amountPaid: update.newAmountPaid,
              amountDue: update.newAmountDue,
              status: update.newStatus,
            })
            .where(eq(invoices.id, invoiceId));
          invoicesUpdated++;
        } catch (updateError) {
          result.errors.push(
            `Failed to update invoice ${invoiceId}: ${updateError instanceof Error ? updateError.message : String(updateError)}`
          );
        }
      }

      seedLogger.operationSuccess("seed:payments", {
        paymentsInserted: result.inserted,
        invoicesUpdated,
      });

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


