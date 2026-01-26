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
import { eq, sql, and } from "drizzle-orm";
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
 * Uses transaction to ensure invoice, line items, and GL entries are atomic
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

  // Generate invoice number and dates outside transaction
  const invoiceNumber = `INV-${orderNumber.replace(/^[A-Z]-/, "")}`;
  const invoiceDate = new Date();
  const dueDateValue =
    dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default NET 30

  // Pre-fetch account IDs and fiscal period (these are lookups, not mutations)
  const arAccountId = await getAccountIdByName(
    ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
  );
  const revenueAccountId = await getAccountIdByName(
    ACCOUNT_NAMES.SALES_REVENUE
  );
  // ACC-004: Get COGS and Inventory account IDs for proper GL entries
  const cogsAccountId = await getAccountIdByName(
    ACCOUNT_NAMES.COST_OF_GOODS_SOLD
  );
  const inventoryAccountId = await getAccountIdByName(ACCOUNT_NAMES.INVENTORY);
  const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);

  try {
    // Wrap all mutations in a transaction for atomicity
    const invoiceId = await db.transaction(async tx => {
      // 1. Create invoice
      const result = await tx.insert(invoices).values({
        invoiceNumber,
        customerId: clientId,
        invoiceDate,
        dueDate: dueDateValue,
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

      const newInvoiceId = Number(result[0].insertId);

      // 2. Create line items
      const lineItemsData = items
        .filter(item => !item.isSample) // Don't invoice samples
        .map(item => ({
          invoiceId: newInvoiceId,
          description: item.displayName,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: item.lineTotal.toFixed(2),
          batchId: item.batchId,
          taxRate: "0.00",
          discountPercent: "0.00",
        }));

      if (lineItemsData.length > 0) {
        await tx.insert(invoiceLineItems).values(lineItemsData);
      }

      // 3. Create GL entries (AR debit, Revenue credit)
      const entryNumber = `SALE-${invoiceNumber}`;

      // Debit AR
      await tx.insert(ledgerEntries).values({
        entryNumber: `${entryNumber}-DR`,
        entryDate: new Date(),
        accountId: arAccountId,
        debit: total.toFixed(2),
        credit: "0.00",
        description: `Sale - Invoice ${invoiceNumber}`,
        referenceType: "INVOICE",
        referenceId: newInvoiceId,
        fiscalPeriodId,
        isManual: false,
        createdBy,
      });

      // Credit Revenue
      await tx.insert(ledgerEntries).values({
        entryNumber: `${entryNumber}-CR`,
        entryDate: new Date(),
        accountId: revenueAccountId,
        debit: "0.00",
        credit: total.toFixed(2),
        description: `Sale - Invoice ${invoiceNumber}`,
        referenceType: "INVOICE",
        referenceId: newInvoiceId,
        fiscalPeriodId,
        isManual: false,
        createdBy,
      });

      // ACC-004: Create COGS GL entries (Debit COGS, Credit Inventory)
      // Calculate total COGS from non-sample items
      const totalCogs = items
        .filter(item => !item.isSample)
        .reduce((sum, item) => sum + (item.lineCogs || 0), 0);

      if (totalCogs > 0) {
        // Debit COGS Expense
        await tx.insert(ledgerEntries).values({
          entryNumber: `${entryNumber}-COGS-DR`,
          entryDate: new Date(),
          accountId: cogsAccountId,
          debit: totalCogs.toFixed(2),
          credit: "0.00",
          description: `COGS - Invoice ${invoiceNumber}`,
          referenceType: "INVOICE",
          referenceId: newInvoiceId,
          fiscalPeriodId,
          isManual: false,
          createdBy,
        });

        // Credit Inventory Asset
        await tx.insert(ledgerEntries).values({
          entryNumber: `${entryNumber}-INV-CR`,
          entryDate: new Date(),
          accountId: inventoryAccountId,
          debit: "0.00",
          credit: totalCogs.toFixed(2),
          description: `Inventory reduction - Invoice ${invoiceNumber}`,
          referenceType: "INVOICE",
          referenceId: newInvoiceId,
          fiscalPeriodId,
          isManual: false,
          createdBy,
        });

        logger.info({
          msg: "COGS GL entries created",
          invoiceId: newInvoiceId,
          totalCogs,
        });
      }

      return newInvoiceId;
    });

    logger.info({
      msg: "Invoice created from order (transactional)",
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
 * Record a cash payment for an order
 * Uses transaction to ensure payment, invoice update, and GL entries are atomic
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

  // Pre-fetch account IDs and fiscal period (these are lookups, not mutations)
  const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
  const arAccountId = await getAccountIdByName(
    ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
  );
  const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);

  try {
    // Wrap all mutations in a transaction for atomicity
    const paymentId = await db.transaction(async tx => {
      // 1. Get invoice details
      const invoice = await tx.query.invoices.findFirst({
        where: eq(invoices.id, invoiceId),
      });

      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      // 2. Generate payment number and create payment record
      const paymentNumber = `PMT-${Date.now()}`;
      const result = await tx.insert(payments).values({
        paymentNumber,
        paymentType: "RECEIVED",
        invoiceId,
        customerId: invoice.customerId,
        paymentDate: new Date(),
        amount: amount.toFixed(2),
        paymentMethod: "CASH",
        referenceNumber: `CASH-${Date.now()}`,
        notes: "Cash payment at time of sale",
        createdBy,
      });

      const newPaymentId = Number(result[0].insertId);

      // 3. Update invoice amounts
      const currentPaid = parseFloat(invoice.amountPaid ?? "0");
      const newPaid = currentPaid + amount;
      const totalAmount = parseFloat(invoice.totalAmount ?? "0");
      const newDue = Math.max(0, totalAmount - newPaid);

      // Determine new status
      let newStatus: "PARTIAL" | "PAID" = "PARTIAL";
      if (newDue <= 0.01) {
        newStatus = "PAID";
      }

      await tx
        .update(invoices)
        .set({
          amountPaid: newPaid.toFixed(2),
          amountDue: newDue.toFixed(2),
          status: newStatus,
        })
        .where(eq(invoices.id, invoiceId));

      // 4. Create GL entries (Cash debit, AR credit)
      const entryNumber = `PMT-${newPaymentId}`;

      // Debit Cash
      await tx.insert(ledgerEntries).values({
        entryNumber: `${entryNumber}-DR`,
        entryDate: new Date(),
        accountId: cashAccountId,
        debit: amount.toFixed(2),
        credit: "0.00",
        description: `Payment received - Invoice #${invoiceId}`,
        referenceType: "PAYMENT",
        referenceId: newPaymentId,
        fiscalPeriodId,
        isManual: false,
        createdBy,
      });

      // Credit AR
      await tx.insert(ledgerEntries).values({
        entryNumber: `${entryNumber}-CR`,
        entryDate: new Date(),
        accountId: arAccountId,
        debit: "0.00",
        credit: amount.toFixed(2),
        description: `Payment received - Invoice #${invoiceId}`,
        referenceType: "PAYMENT",
        referenceId: newPaymentId,
        fiscalPeriodId,
        isManual: false,
        createdBy,
      });

      logger.info({
        msg: "Cash payment recorded (transactional)",
        invoiceId,
        paymentId: newPaymentId,
        amount,
        newStatus,
      });

      return newPaymentId;
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
 * Uses transaction to ensure all reversing entries and invoice void are atomic
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

  // Pre-fetch fiscal period (lookup, not mutation)
  const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);
  const reversalNumber = `REV-${Date.now()}`;

  try {
    // Wrap all mutations in a transaction for atomicity
    await db.transaction(async tx => {
      // 1. Get original ledger entries for this invoice (filter by both referenceType and referenceId)
      const originalEntries = await tx.query.ledgerEntries.findMany({
        where: and(
          eq(ledgerEntries.referenceType, "INVOICE"),
          eq(ledgerEntries.referenceId, invoiceId)
        ),
      });

      // 2. Create reversing entries
      for (const entry of originalEntries) {
        await tx.insert(ledgerEntries).values({
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

      // 3. Void the invoice by updating status
      await tx
        .update(invoices)
        .set({
          status: "VOID",
          notes: `Voided: ${reason} on ${new Date().toISOString()}`,
        })
        .where(eq(invoices.id, invoiceId));
    });

    logger.info({
      msg: "Order accounting entries reversed (transactional)",
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
