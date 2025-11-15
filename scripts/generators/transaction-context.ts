/**
 * Transaction Context System
 *
 * This module provides types and utilities for maintaining operational coherence
 * across data generation. Every transaction should create ALL related records,
 * not just the primary entity.
 *
 * Example: When generating an order, also generate:
 * - Invoice
 * - Invoice line items
 * - Ledger entries
 * - AR aging entry
 * - Workflow queue entry
 * - Inventory movements
 * - Client activity log
 */

import type { InsertOrder } from "../../drizzle/schema";
import type { InsertInvoice } from "../../drizzle/schema";
import type { InsertLedgerEntry } from "../../drizzle/schema";
import type { InsertClientActivity } from "../../drizzle/schema";
import type { InsertPayment } from "../../drizzle/schema";
import type { InsertInventoryMovement } from "../../drizzle/schema";

/**
 * Order Transaction Context
 * Represents all records created when an order is placed
 */
export interface OrderTransactionContext {
  // Primary entity
  order: InsertOrder & { id?: number };

  // Financial records
  invoice: InsertInvoice & { id?: number };
  invoiceLineItems: Array<{
    invoiceId?: number;
    lineNumber: number;
    productId: number;
    batchId?: number;
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    taxAmount: string;
    createdAt: Date;
  }>;
  ledgerEntries: InsertLedgerEntry[];

  // AR tracking
  arEntry?: {
    clientId: number;
    invoiceId?: number;
    amount: string;
    dueDate: Date;
    agingBucket: string;
    createdAt: Date;
  };

  // Inventory impact
  inventoryMovements: InsertInventoryMovement[];

  // Activity logging
  clientActivity: InsertClientActivity;

  // Optional workflow
  workflowEntry?: {
    orderId?: number;
    status: string;
    assignedTo?: number;
    dueDate?: Date;
    createdAt: Date;
  };
}

/**
 * Payment Transaction Context
 * Represents all records created when a payment is received
 */
export interface PaymentTransactionContext {
  // Primary entity
  payment: InsertPayment & { id?: number };

  // Financial records
  ledgerEntries: InsertLedgerEntry[];

  // Bank reconciliation
  bankTransaction?: {
    bankAccountId: number;
    transactionDate: Date;
    amount: string;
    description: string;
    paymentId?: number;
    createdAt: Date;
  };

  // Payment history
  paymentHistory: {
    paymentId?: number;
    action: string;
    performedBy: number;
    notes?: string;
    createdAt: Date;
  };

  // Activity logging
  clientActivity: InsertClientActivity;
}

/**
 * Intake Transaction Context
 * Represents all records created during inventory intake
 */
export interface IntakeTransactionContext {
  // Intake session
  intakeSession: {
    id?: number;
    vendorId: number;
    sessionDate: Date;
    totalWeight: string;
    notes?: string;
    createdBy: number;
    createdAt: Date;
  };

  // Lots and batches
  lots: Array<{
    id?: number;
    lotNumber: string;
    vendorId: number;
    strainId: number;
    receivedDate: Date;
    totalWeight: string;
    createdAt: Date;
  }>;

  batches: Array<{
    id?: number;
    lotId?: number;
    batchNumber: string;
    productId: number;
    quantity: string;
    status: string;
    cogsMode: string;
    cogsValue?: string;
    createdAt: Date;
  }>;

  // Inventory movements
  inventoryMovements: InsertInventoryMovement[];

  // Batch status history
  batchStatusHistory: Array<{
    batchId?: number;
    previousStatus?: string;
    newStatus: string;
    changedBy: number;
    notes?: string;
    createdAt: Date;
  }>;

  // Intake session batches (junction table)
  intakeSessionBatches: Array<{
    intakeSessionId?: number;
    batchId?: number;
  }>;
}

/**
 * Event Transaction Context
 * Represents all records created when scheduling an event
 */
export interface EventTransactionContext {
  // Primary entity
  event: {
    id?: number;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    eventType: string;
    clientId?: number;
    createdBy: number;
    createdAt: Date;
  };

  // Participants
  participants: Array<{
    eventId?: number;
    userId?: number;
    email?: string;
    rsvpStatus: string;
    createdAt: Date;
  }>;

  // Reminders
  reminders: Array<{
    eventId?: number;
    reminderTime: Date;
    reminderType: string;
    sent: boolean;
    createdAt: Date;
  }>;

  // Client activity (if client-related)
  clientActivity?: InsertClientActivity;

  // Event history
  eventHistory: {
    eventId?: number;
    action: string;
    performedBy: number;
    notes?: string;
    createdAt: Date;
  };
}

/**
 * Utility function to create a complete order transaction
 * This ensures all related records are generated together
 */
export function createOrderTransaction(
  orderData: Partial<InsertOrder>,
  lineItems: Array<{
    productId: number;
    batchId?: number;
    quantity: number;
    unitPrice: number;
    description: string;
  }>,
  clientId: number
): OrderTransactionContext {
  const now = new Date();
  const orderTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // Create order
  const order: InsertOrder & { id?: number } = {
    orderNumber: orderData.orderNumber || `ORD-${Date.now()}`,
    customerId: clientId,
    orderDate: orderData.orderDate || now,
    status: orderData.status || "PENDING",
    paymentTerms: orderData.paymentTerms || "NET_30",
    total: orderTotal.toFixed(2),
    createdAt: now,
    updatedAt: now,
    ...orderData,
  };

  // Create invoice
  const invoice: InsertInvoice & { id?: number } = {
    invoiceNumber: `INV-${Date.now()}`,
    customerId: clientId,
    invoiceDate: now,
    dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
    status: "PENDING",
    subtotal: orderTotal.toFixed(2),
    taxAmount: "0.00",
    total: orderTotal.toFixed(2),
    createdAt: now,
    updatedAt: now,
  };

  // Create invoice line items
  const invoiceLineItems = lineItems.map((item, index) => ({
    lineNumber: index + 1,
    productId: item.productId,
    batchId: item.batchId,
    description: item.description,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toFixed(2),
    lineTotal: (item.quantity * item.unitPrice).toFixed(2),
    taxAmount: "0.00",
    createdAt: now,
  }));

  // Create ledger entries (double-entry bookkeeping)
  const ledgerEntries: InsertLedgerEntry[] = [
    {
      accountId: 1, // Accounts Receivable
      transactionDate: now,
      description: `Order ${order.orderNumber} - AR`,
      debit: orderTotal.toFixed(2),
      credit: "0.00",
      referenceType: "ORDER",
      referenceId: order.id,
      createdAt: now,
    },
    {
      accountId: 2, // Revenue
      transactionDate: now,
      description: `Order ${order.orderNumber} - Revenue`,
      debit: "0.00",
      credit: orderTotal.toFixed(2),
      referenceType: "ORDER",
      referenceId: order.id,
      createdAt: now,
    },
  ];

  // Create inventory movements
  const inventoryMovements: InsertInventoryMovement[] = lineItems.map(
    (item) => ({
      batchId: item.batchId!,
      movementType: "SALE",
      quantity: `-${item.quantity}`,
      referenceType: "ORDER",
      referenceId: order.id,
      movementDate: now,
      performedBy: 1,
      createdAt: now,
    })
  );

  // Create client activity
  const clientActivity: InsertClientActivity = {
    clientId,
    activityType: "ORDER_CREATED",
    activityDate: now,
    description: `Order ${order.orderNumber} created - $${orderTotal.toFixed(2)}`,
    referenceType: "ORDER",
    referenceId: order.id,
    createdBy: 1,
    createdAt: now,
  };

  return {
    order,
    invoice,
    invoiceLineItems,
    ledgerEntries,
    inventoryMovements,
    clientActivity,
  };
}

/**
 * Utility function to create a complete payment transaction
 */
export function createPaymentTransaction(
  paymentData: Partial<InsertPayment>,
  invoiceId: number,
  clientId: number,
  amount: number
): PaymentTransactionContext {
  const now = new Date();

  const payment: InsertPayment & { id?: number } = {
    paymentNumber: paymentData.paymentNumber || `PAY-${Date.now()}`,
    customerId: clientId,
    amount: amount.toFixed(2),
    paymentDate: paymentData.paymentDate || now,
    paymentMethod: paymentData.paymentMethod || "ACH",
    referenceNumber: paymentData.referenceNumber,
    notes: paymentData.notes,
    createdAt: now,
    updatedAt: now,
    ...paymentData,
  };

  // Create ledger entries (double-entry bookkeeping)
  const ledgerEntries: InsertLedgerEntry[] = [
    {
      accountId: 3, // Cash/Bank
      transactionDate: now,
      description: `Payment ${payment.paymentNumber} - Cash`,
      debit: amount.toFixed(2),
      credit: "0.00",
      referenceType: "PAYMENT",
      referenceId: payment.id,
      createdAt: now,
    },
    {
      accountId: 1, // Accounts Receivable
      transactionDate: now,
      description: `Payment ${payment.paymentNumber} - AR`,
      debit: "0.00",
      credit: amount.toFixed(2),
      referenceType: "PAYMENT",
      referenceId: payment.id,
      createdAt: now,
    },
  ];

  // Create payment history
  const paymentHistory = {
    action: "PAYMENT_RECEIVED",
    performedBy: 1,
    notes: `Payment received: $${amount.toFixed(2)}`,
    createdAt: now,
  };

  // Create client activity
  const clientActivity: InsertClientActivity = {
    clientId,
    activityType: "PAYMENT_RECEIVED",
    activityDate: now,
    description: `Payment ${payment.paymentNumber} received - $${amount.toFixed(2)}`,
    referenceType: "PAYMENT",
    referenceId: payment.id,
    createdBy: 1,
    createdAt: now,
  };

  return {
    payment,
    ledgerEntries,
    paymentHistory,
    clientActivity,
  };
}
