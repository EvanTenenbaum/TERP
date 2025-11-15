/**
 * Order Cascade Generator
 *
 * This module enhances order generation with operational coherence by creating
 * ALL related records when an order is placed:
 * - Invoice
 * - Invoice line items
 * - Ledger entries (double-entry bookkeeping)
 * - Payments (for 85% of invoices)
 * - Client activity logs
 * - Inventory movements
 * - Order status history
 *
 * This ensures the data behaves as if actual business operations created it.
 */

import type { OrderData } from "./orders.js";
import type { BatchData } from "./inventory.js";
import { InventoryTracker } from "./inventory-tracker.js";
import { calculateDueDate, calculateAgingBucket } from "./validators.js";

export interface InvoiceLineItemData {
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
}

export interface InvoiceData {
  id?: number;
  invoiceNumber: string;
  customerId: number;
  invoiceDate: Date;
  dueDate: Date;
  status: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentData {
  id?: number;
  paymentNumber: string;
  customerId: number;
  amount: string;
  paymentDate: Date;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntryData {
  id?: number;
  accountId: number;
  transactionDate: Date;
  description: string;
  debit: string;
  credit: string;
  referenceType: string;
  referenceId?: number;
  createdAt: Date;
}

export interface ClientActivityData {
  id?: number;
  clientId: number;
  activityType: string;
  activityDate: Date;
  description: string;
  referenceType: string;
  referenceId?: number;
  createdBy: number;
  createdAt: Date;
}

export interface InventoryMovementData {
  id?: number;
  batchId: number;
  movementType: string;
  quantity: string;
  referenceType: string;
  referenceId?: number;
  movementDate: Date;
  performedBy: number;
  notes?: string;
  createdAt: Date;
}

export interface OrderStatusHistoryData {
  id?: number;
  orderId?: number;
  previousStatus?: string;
  newStatus: string;
  changedBy: number;
  notes?: string;
  createdAt: Date;
}

export interface OrderCascadeResult {
  order: OrderData;
  invoice: InvoiceData;
  invoiceLineItems: InvoiceLineItemData[];
  ledgerEntries: LedgerEntryData[];
  payment?: PaymentData;
  paymentLedgerEntries?: LedgerEntryData[];
  clientActivity: ClientActivityData[];
  inventoryMovements: InventoryMovementData[];
  orderStatusHistory: OrderStatusHistoryData[];
}

/**
 * Generate complete order transaction with all related records
 */
export function generateOrderWithCascade(
  order: OrderData,
  inventoryTracker: InventoryTracker,
  currentDate: Date = new Date()
): OrderCascadeResult {
  const orderDate = order.createdAt;

  // 1. Create Invoice
  const invoice: InvoiceData = {
    invoiceNumber: `INV-${order.orderNumber.replace("ORD-", "")}`,
    customerId: order.clientId,
    invoiceDate: orderDate,
    dueDate: calculateDueDate(
      orderDate,
      (order.paymentTerms as any) || "NET_30"
    ),
    status: "PENDING",
    subtotal: order.subtotal,
    taxAmount: order.tax,
    total: order.total,
    createdAt: orderDate,
    updatedAt: orderDate,
  };

  // 2. Create Invoice Line Items
  const invoiceLineItems: InvoiceLineItemData[] = order.items.map(
    (item, index) => ({
      lineNumber: index + 1,
      productId: item.batchId, // Using batchId as productId for now
      batchId: item.batchId,
      description: item.displayName,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
      taxAmount: "0.00",
      createdAt: orderDate,
    })
  );

  // 3. Create Ledger Entries (Double-Entry Bookkeeping)
  const orderTotal = parseFloat(order.total);
  const ledgerEntries: LedgerEntryData[] = [
    {
      accountId: 1, // Accounts Receivable
      transactionDate: orderDate,
      description: `Order ${order.orderNumber} - AR`,
      debit: orderTotal.toFixed(2),
      credit: "0.00",
      referenceType: "ORDER",
      referenceId: order.id,
      createdAt: orderDate,
    },
    {
      accountId: 2, // Revenue
      transactionDate: orderDate,
      description: `Order ${order.orderNumber} - Revenue`,
      debit: "0.00",
      credit: orderTotal.toFixed(2),
      referenceType: "ORDER",
      referenceId: order.id,
      createdAt: orderDate,
    },
  ];

  // 4. Create Inventory Movements
  const inventoryMovements: InventoryMovementData[] = order.items.map(
    (item) => {
      // Update inventory tracker
      inventoryTracker.sellInventory(item.batchId, item.quantity);

      return {
        batchId: item.batchId,
        movementType: "SALE",
        quantity: `-${item.quantity}`,
        referenceType: "ORDER",
        referenceId: order.id,
        movementDate: orderDate,
        performedBy: order.createdBy,
        notes: `Sold via order ${order.orderNumber}`,
        createdAt: orderDate,
      };
    }
  );

  // 5. Create Order Status History
  const orderStatusHistory: OrderStatusHistoryData[] = [
    {
      previousStatus: undefined,
      newStatus: "PENDING",
      changedBy: order.createdBy,
      notes: "Order created",
      createdAt: orderDate,
    },
  ];

  // 6. Create Client Activity
  const clientActivity: ClientActivityData[] = [
    {
      clientId: order.clientId,
      activityType: "ORDER_CREATED",
      activityDate: orderDate,
      description: `Order ${order.orderNumber} created - $${orderTotal.toFixed(2)}`,
      referenceType: "ORDER",
      referenceId: order.id,
      createdBy: order.createdBy,
      createdAt: orderDate,
    },
  ];

  // 7. Determine if invoice is overdue (15% of invoices)
  const isOverdue = Math.random() < 0.15;

  // 8. Create Payment (for 85% of invoices)
  let payment: PaymentData | undefined;
  let paymentLedgerEntries: LedgerEntryData[] | undefined;

  if (!isOverdue) {
    // Determine payment date (1-30 days after invoice date)
    const daysToPayment = Math.floor(Math.random() * 30) + 1;
    const paymentDate = new Date(orderDate);
    paymentDate.setDate(paymentDate.getDate() + daysToPayment);

    // Only create payment if payment date is before current date
    if (paymentDate <= currentDate) {
      payment = {
        paymentNumber: `PAY-${order.orderNumber.replace("ORD-", "")}`,
        customerId: order.clientId,
        amount: orderTotal.toFixed(2),
        paymentDate,
        paymentMethod: weightedRandomPaymentMethod(),
        notes: `Payment for invoice ${invoice.invoiceNumber}`,
        createdAt: paymentDate,
        updatedAt: paymentDate,
      };

      // Update invoice status
      invoice.status = "PAID";

      // Create payment ledger entries
      paymentLedgerEntries = [
        {
          accountId: 3, // Cash/Bank
          transactionDate: paymentDate,
          description: `Payment ${payment.paymentNumber} - Cash`,
          debit: orderTotal.toFixed(2),
          credit: "0.00",
          referenceType: "PAYMENT",
          referenceId: payment.id,
          createdAt: paymentDate,
        },
        {
          accountId: 1, // Accounts Receivable
          transactionDate: paymentDate,
          description: `Payment ${payment.paymentNumber} - AR`,
          debit: "0.00",
          credit: orderTotal.toFixed(2),
          referenceType: "PAYMENT",
          referenceId: payment.id,
          createdAt: paymentDate,
        },
      ];

      // Add payment activity
      clientActivity.push({
        clientId: order.clientId,
        activityType: "PAYMENT_RECEIVED",
        activityDate: paymentDate,
        description: `Payment ${payment.paymentNumber} received - $${orderTotal.toFixed(2)}`,
        referenceType: "PAYMENT",
        referenceId: payment.id,
        createdBy: 1,
        createdAt: paymentDate,
      });
    }
  } else {
    // Mark invoice as overdue if due date has passed
    if (invoice.dueDate <= currentDate) {
      invoice.status = "OVERDUE";
    }
  }

  return {
    order,
    invoice,
    invoiceLineItems,
    ledgerEntries,
    payment,
    paymentLedgerEntries,
    clientActivity,
    inventoryMovements,
    orderStatusHistory,
  };
}

/**
 * Helper function to select payment method with realistic distribution
 */
function weightedRandomPaymentMethod(): string {
  const rand = Math.random();
  if (rand < 0.6) return "ACH"; // 60%
  if (rand < 0.9) return "CHECK"; // 30%
  return "WIRE"; // 10%
}

/**
 * Generate cascaded data for multiple orders
 */
export function generateOrdersCascade(
  orders: OrderData[],
  batches: BatchData[],
  currentDate: Date = new Date()
): {
  orders: OrderData[];
  invoices: InvoiceData[];
  invoiceLineItems: InvoiceLineItemData[];
  ledgerEntries: LedgerEntryData[];
  payments: PaymentData[];
  clientActivity: ClientActivityData[];
  inventoryMovements: InventoryMovementData[];
  orderStatusHistory: OrderStatusHistoryData[];
} {
  const inventoryTracker = new InventoryTracker(batches);

  const allInvoices: InvoiceData[] = [];
  const allInvoiceLineItems: InvoiceLineItemData[] = [];
  const allLedgerEntries: LedgerEntryData[] = [];
  const allPayments: PaymentData[] = [];
  const allClientActivity: ClientActivityData[] = [];
  const allInventoryMovements: InventoryMovementData[] = [];
  const allOrderStatusHistory: OrderStatusHistoryData[] = [];

  for (const order of orders) {
    const cascade = generateOrderWithCascade(order, inventoryTracker, currentDate);

    allInvoices.push(cascade.invoice);
    allInvoiceLineItems.push(...cascade.invoiceLineItems);
    allLedgerEntries.push(...cascade.ledgerEntries);
    if (cascade.payment) {
      allPayments.push(cascade.payment);
    }
    if (cascade.paymentLedgerEntries) {
      allLedgerEntries.push(...cascade.paymentLedgerEntries);
    }
    allClientActivity.push(...cascade.clientActivity);
    allInventoryMovements.push(...cascade.inventoryMovements);
    allOrderStatusHistory.push(...cascade.orderStatusHistory);
  }

  // Validate inventory consistency
  const validation = inventoryTracker.validate();
  if (!validation.valid) {
    console.warn("⚠️  Inventory validation errors:");
    validation.errors.forEach((error) => console.warn(`  - ${error}`));
  }

  return {
    orders,
    invoices: allInvoices,
    invoiceLineItems: allInvoiceLineItems,
    ledgerEntries: allLedgerEntries,
    payments: allPayments,
    clientActivity: allClientActivity,
    inventoryMovements: allInventoryMovements,
    orderStatusHistory: allOrderStatusHistory,
  };
}
