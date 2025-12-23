/**
 * Order Accounting Service
 * Handles accounting integration for orders:
 * - Invoice creation from orders
 * - Payment recording
 * - Credit exposure updates
 * - Accounting entry reversals
 */

import { getDb } from "../db";
import {
  invoices,
  invoiceLineItems,
  payments,
  ledgerEntries,
  batches,
} from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../_core/logger";
import { getFiscalPeriodIdOrDefault } from "../_core/fiscalPeriod";
import { getAccountIdByName, ACCOUNT_NAMES } from "../_core/accountLookup";

interface OrderItem {
  batchId: number;
  displayName: string;
  quantity: number;
  unitPrice: number;
  unitCogs: number;
  lineTotal: number;
  lineCogs: number;
  isSample: boolean;
}

interface CreateInvoiceFromOrderInput {
  orderId: number;
  orderNumber: string;
  clientId: number;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: Date;
  createdBy: number;
}

/**
 * Create an invoice from a finalized order
 */
export async function createInvoiceFromOrder(
  input: CreateInvoiceFromOrderInput
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    orderId,
    orderNumber,
    clientId,
    items,
    subtotal,
    tax,
    total,
    dueDate,
    createdBy,
  } = input;

  try {
    // Generate invoice number
    const invoiceNumber = `INV-${orderNumber.replace(/^[A-Z]-/, "")}`;
    const invoiceDate = new Date();
    const dueDateValue = dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default NET 30

    // Create invoice (matching actual schema)
    const result = await db.insert(invoices).values({
      invoiceNumber,
      customerId: clientId,
      invoiceDate, // Date object
      dueDate: dueDateValue, // Date object
      subtotal: subtotal.toFixed(2),
      taxAmount: tax.toFixed(2),
      discountAmount: "0.00",
      totalAmount: total.toFixed(2),
      amountPaid: "0.00",
      amountDue: total.toFixed(2),
      status: "SENT",
      referenceType: "ORDER",
      referenceId: orderId,
      createdBy,
    });

    const invoiceId = Number(result[0].insertId);

    // Create line items (matching actual schema)
    const lineItemsData = items
      .filter((item) => !item.isSample) // Don't invoice samples
      .map((item) => ({
        invoiceId,
        description: item.displayName,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.lineTotal.toFixed(2),
        batchId: item.batchId,
        taxRate: "0.00",
        discountPercent: "0.00",
      }));

    if (lineItemsData.length > 0) {
      await db.insert(invoiceLineItems).values(lineItemsData);
    }

    // Create AR ledger entry
    await createSaleGLEntries({
      invoiceId,
      invoiceNumber,
      clientId,
      total,
      createdBy,
    });

    logger.info({
      msg: "Invoice created from order",
      orderId,
      invoiceId,
      invoiceNumber,
      total,
    });

    return invoiceId;
  } catch (error) {
    logger.error({
      msg: "Failed to create invoice from order",
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Create GL entries for a sale (AR debit, Revenue credit)
 */
async function createSaleGLEntries(input: {
  invoiceId: number;
  invoiceNumber: string;
  clientId: number;
  total: number;
  createdBy: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const arAccountId = await getAccountIdByName(ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE);
    const revenueAccountId = await getAccountIdByName(ACCOUNT_NAMES.SALES_REVENUE);
    const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);

    const entryNumber = `SALE-${input.invoiceNumber}`;

    // Debit AR
    await db.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-DR`,
      entryDate: new Date(),
      accountId: arAccountId,
      debit: input.total.toFixed(2),
      credit: "0.00",
      description: `Sale - Invoice ${input.invoiceNumber}`,
      referenceType: "INVOICE",
      referenceId: input.invoiceId,
      fiscalPeriodId,
      isManual: false,
      createdBy: input.createdBy,
    });

    // Credit Revenue
    await db.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-CR`,
      entryDate: new Date(),
      accountId: revenueAccountId,
      debit: "0.00",
      credit: input.total.toFixed(2),
      description: `Sale - Invoice ${input.invoiceNumber}`,
      referenceType: "INVOICE",
      referenceId: input.invoiceId,
      fiscalPeriodId,
      isManual: false,
      createdBy: input.createdBy,
    });
  } catch (error) {
    logger.warn({
      msg: "Failed to create sale GL entries (non-fatal)",
      invoiceId: input.invoiceId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Record a cash payment for an order
 */
export async function recordOrderCashPayment(input: {
  invoiceId: number;
  amount: number;
  createdBy: number;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { invoiceId, amount, createdBy } = input;

  if (amount <= 0) return null;

  try {
    // Get invoice details
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Generate payment number
    const paymentNumber = `PMT-${Date.now()}`;

    // Create payment record (matching actual schema)
    const result = await db.insert(payments).values({
      paymentNumber,
      paymentType: "RECEIVED",
      invoiceId,
      customerId: invoice.customerId,
      paymentDate: new Date(), // Date object
      amount: amount.toFixed(2),
      paymentMethod: "CASH",
      referenceNumber: `CASH-${Date.now()}`,
      notes: "Cash payment at time of sale",
      createdBy,
    });

    const paymentId = Number(result[0].insertId);

    // Update invoice amounts
    const currentPaid = parseFloat(invoice.amountPaid ?? "0");
    const newPaid = currentPaid + amount;
    const totalAmount = parseFloat(invoice.totalAmount ?? "0");
    const newDue = Math.max(0, totalAmount - newPaid);

    // Determine new status
    let newStatus: "PARTIAL" | "PAID" = "PARTIAL";
    if (newDue <= 0.01) {
      newStatus = "PAID";
    }

    await db
      .update(invoices)
      .set({
        amountPaid: newPaid.toFixed(2),
        amountDue: newDue.toFixed(2),
        status: newStatus,
      })
      .where(eq(invoices.id, invoiceId));

    // Create payment GL entries
    await createPaymentGLEntries({
      paymentId,
      invoiceId,
      amount,
      createdBy,
    });

    logger.info({
      msg: "Cash payment recorded",
      invoiceId,
      paymentId,
      amount,
      newStatus,
    });

    return paymentId;
  } catch (error) {
    logger.error({
      msg: "Failed to record cash payment",
      invoiceId,
      amount,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Create GL entries for a payment (Cash debit, AR credit)
 */
async function createPaymentGLEntries(input: {
  paymentId: number;
  invoiceId: number;
  amount: number;
  createdBy: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
    const arAccountId = await getAccountIdByName(ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE);
    const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);

    const entryNumber = `PMT-${input.paymentId}`;

    // Debit Cash
    await db.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-DR`,
      entryDate: new Date(),
      accountId: cashAccountId,
      debit: input.amount.toFixed(2),
      credit: "0.00",
      description: `Payment received - Invoice #${input.invoiceId}`,
      referenceType: "PAYMENT",
      referenceId: input.paymentId,
      fiscalPeriodId,
      isManual: false,
      createdBy: input.createdBy,
    });

    // Credit AR
    await db.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-CR`,
      entryDate: new Date(),
      accountId: arAccountId,
      debit: "0.00",
      credit: input.amount.toFixed(2),
      description: `Payment received - Invoice #${input.invoiceId}`,
      referenceType: "PAYMENT",
      referenceId: input.paymentId,
      fiscalPeriodId,
      isManual: false,
      createdBy: input.createdBy,
    });
  } catch (error) {
    logger.warn({
      msg: "Failed to create payment GL entries (non-fatal)",
      paymentId: input.paymentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Update client credit exposure after order
 * Note: This updates the client_credit_limits table if it exists,
 * otherwise just logs the exposure for manual reconciliation.
 */
export async function updateClientCreditExposure(
  clientId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Calculate total outstanding AR for client
    const clientInvoices = await db.query.invoices.findMany({
      where: eq(invoices.customerId, clientId),
    });

    let totalOutstanding = 0;
    for (const inv of clientInvoices) {
      if (inv.status !== "PAID" && inv.status !== "VOID") {
        totalOutstanding += parseFloat(inv.amountDue ?? "0");
      }
    }

    // Log the credit exposure update
    // The actual credit limit management is handled by the credit intelligence module
    logger.info({
      msg: "Client credit exposure calculated",
      clientId,
      totalOutstanding,
    });
  } catch (error) {
    logger.warn({
      msg: "Failed to update credit exposure (non-fatal)",
      clientId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Restore inventory from a cancelled order
 */
export async function restoreInventoryFromOrder(input: {
  items: OrderItem[];
  orderId: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { items, orderId } = input;

  try {
    for (const item of items) {
      if (item.isSample) {
        // Restore sample quantity
        await db
          .update(batches)
          .set({
            sampleQty: sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) + ${item.quantity}`,
          })
          .where(eq(batches.id, item.batchId));
      } else {
        // Restore on-hand quantity
        await db
          .update(batches)
          .set({
            onHandQty: sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) + ${item.quantity}`,
          })
          .where(eq(batches.id, item.batchId));
      }
    }

    logger.info({
      msg: "Inventory restored from cancelled order",
      orderId,
      itemCount: items.length,
    });
  } catch (error) {
    logger.error({
      msg: "Failed to restore inventory",
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Reverse accounting entries for a cancelled order
 */
export async function reverseOrderAccountingEntries(input: {
  invoiceId: number;
  orderId: number;
  reason: string;
  reversedBy: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { invoiceId, orderId, reason, reversedBy } = input;

  try {
    // Get original ledger entries for this invoice
    const originalEntries = await db.query.ledgerEntries.findMany({
      where: eq(ledgerEntries.referenceId, invoiceId),
    });

    const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);
    const reversalNumber = `REV-${Date.now()}`;

    // Create reversing entries
    for (const entry of originalEntries) {
      await db.insert(ledgerEntries).values({
        entryNumber: `${reversalNumber}-${entry.id}`,
        entryDate: new Date(),
        accountId: entry.accountId,
        debit: entry.credit, // Swap debit and credit
        credit: entry.debit,
        description: `Reversal: ${reason} (Original: ${entry.entryNumber})`,
        referenceType: "REVERSAL",
        referenceId: orderId,
        fiscalPeriodId,
        isManual: false,
        createdBy: reversedBy,
      });
    }

    // Void the invoice by updating status
    await db
      .update(invoices)
      .set({
        status: "VOID",
        notes: `Voided: ${reason} on ${new Date().toISOString()}`,
      })
      .where(eq(invoices.id, invoiceId));

    logger.info({
      msg: "Order accounting entries reversed",
      orderId,
      invoiceId,
      reason,
    });
  } catch (error) {
    logger.error({
      msg: "Failed to reverse accounting entries",
      orderId,
      invoiceId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
