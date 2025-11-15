/**
 * State Machine Validators
 *
 * This module provides validation functions for state transitions across
 * various entities in the TERP system. Ensures that generated data follows
 * valid business logic and state machine rules.
 */

/**
 * Batch Status State Machine
 *
 * Valid transitions:
 * - AWAITING_INTAKE → LIVE
 * - LIVE → PHOTOGRAPHY_COMPLETE
 * - LIVE → ON_HOLD
 * - ON_HOLD → LIVE
 * - LIVE → QUARANTINED
 * - QUARANTINED → LIVE
 * - PHOTOGRAPHY_COMPLETE → SOLD_OUT
 * - SOLD_OUT → CLOSED
 */
export type BatchStatus =
  | "AWAITING_INTAKE"
  | "LIVE"
  | "PHOTOGRAPHY_COMPLETE"
  | "ON_HOLD"
  | "QUARANTINED"
  | "SOLD_OUT"
  | "CLOSED";

const BATCH_STATUS_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  AWAITING_INTAKE: ["LIVE"],
  LIVE: ["PHOTOGRAPHY_COMPLETE", "ON_HOLD", "QUARANTINED", "SOLD_OUT"],
  PHOTOGRAPHY_COMPLETE: ["SOLD_OUT", "ON_HOLD", "QUARANTINED"],
  ON_HOLD: ["LIVE"],
  QUARANTINED: ["LIVE", "CLOSED"],
  SOLD_OUT: ["CLOSED"],
  CLOSED: [],
};

export function validateBatchStatusTransition(
  fromStatus: BatchStatus,
  toStatus: BatchStatus
): boolean {
  const validTransitions = BATCH_STATUS_TRANSITIONS[fromStatus];
  return validTransitions.includes(toStatus);
}

export function getValidBatchStatusTransitions(
  currentStatus: BatchStatus
): BatchStatus[] {
  return BATCH_STATUS_TRANSITIONS[currentStatus];
}

/**
 * Order Status State Machine
 *
 * Valid transitions:
 * - PENDING → CONFIRMED
 * - CONFIRMED → PROCESSING
 * - PROCESSING → SHIPPED
 * - SHIPPED → DELIVERED
 * - DELIVERED → COMPLETED
 * - Any → CANCELLED (before SHIPPED)
 */
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function validateOrderStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean {
  const validTransitions = ORDER_STATUS_TRANSITIONS[fromStatus];
  return validTransitions.includes(toStatus);
}

export function getValidOrderStatusTransitions(
  currentStatus: OrderStatus
): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[currentStatus];
}

/**
 * Invoice Status State Machine
 *
 * Valid transitions:
 * - DRAFT → PENDING
 * - PENDING → PAID
 * - PENDING → OVERDUE
 * - OVERDUE → PAID
 * - OVERDUE → WRITTEN_OFF
 * - Any → CANCELLED (before PAID)
 */
export type InvoiceStatus =
  | "DRAFT"
  | "PENDING"
  | "PAID"
  | "OVERDUE"
  | "WRITTEN_OFF"
  | "CANCELLED";

const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["PAID", "OVERDUE", "CANCELLED"],
  PAID: [],
  OVERDUE: ["PAID", "WRITTEN_OFF"],
  WRITTEN_OFF: [],
  CANCELLED: [],
};

export function validateInvoiceStatusTransition(
  fromStatus: InvoiceStatus,
  toStatus: InvoiceStatus
): boolean {
  const validTransitions = INVOICE_STATUS_TRANSITIONS[fromStatus];
  return validTransitions.includes(toStatus);
}

export function getValidInvoiceStatusTransitions(
  currentStatus: InvoiceStatus
): InvoiceStatus[] {
  return INVOICE_STATUS_TRANSITIONS[currentStatus];
}

/**
 * Purchase Order Status State Machine
 *
 * Valid transitions:
 * - DRAFT → SENT
 * - SENT → CONFIRMED
 * - CONFIRMED → RECEIVING
 * - RECEIVING → RECEIVED
 * - Any → CANCELLED (before RECEIVED)
 */
export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT"
  | "CONFIRMED"
  | "RECEIVING"
  | "RECEIVED"
  | "CANCELLED";

const PO_STATUS_TRANSITIONS: Record<
  PurchaseOrderStatus,
  PurchaseOrderStatus[]
> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["RECEIVING", "CANCELLED"],
  RECEIVING: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

export function validatePurchaseOrderStatusTransition(
  fromStatus: PurchaseOrderStatus,
  toStatus: PurchaseOrderStatus
): boolean {
  const validTransitions = PO_STATUS_TRANSITIONS[fromStatus];
  return validTransitions.includes(toStatus);
}

export function getValidPurchaseOrderStatusTransitions(
  currentStatus: PurchaseOrderStatus
): PurchaseOrderStatus[] {
  return PO_STATUS_TRANSITIONS[currentStatus];
}

/**
 * Payment Terms Validation
 *
 * Ensures payment terms are valid and consistent
 */
export type PaymentTerms =
  | "COD"
  | "NET_7"
  | "NET_15"
  | "NET_30"
  | "CONSIGNMENT"
  | "PARTIAL";

const PAYMENT_TERMS_DAYS: Record<PaymentTerms, number> = {
  COD: 0,
  NET_7: 7,
  NET_15: 15,
  NET_30: 30,
  CONSIGNMENT: 0, // Special case: paid after sale
  PARTIAL: 15, // Default to 15 days for partial payments
};

export function getPaymentTermsDays(terms: PaymentTerms): number {
  return PAYMENT_TERMS_DAYS[terms];
}

export function calculateDueDate(
  invoiceDate: Date,
  paymentTerms: PaymentTerms
): Date {
  const days = getPaymentTermsDays(paymentTerms);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

/**
 * Temporal Validation
 *
 * Ensures dates are chronologically sensible
 */
export function validateChronologicalOrder(
  earlierDate: Date,
  laterDate: Date
): boolean {
  return earlierDate <= laterDate;
}

export function validateDateRange(
  date: Date,
  minDate: Date,
  maxDate: Date
): boolean {
  return date >= minDate && date <= maxDate;
}

/**
 * Business Logic Validation
 */

/**
 * Validates that an order total matches the sum of its line items
 */
export function validateOrderTotal(
  lineItems: Array<{ quantity: number; unitPrice: number }>,
  expectedTotal: number,
  tolerance: number = 0.01
): boolean {
  const calculatedTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  return Math.abs(calculatedTotal - expectedTotal) <= tolerance;
}

/**
 * Validates that inventory quantity is sufficient for an order
 */
export function validateInventoryAvailability(
  availableQuantity: number,
  requestedQuantity: number
): boolean {
  return availableQuantity >= requestedQuantity;
}

/**
 * Validates that a payment amount does not exceed the invoice total
 */
export function validatePaymentAmount(
  paymentAmount: number,
  invoiceTotal: number,
  tolerance: number = 0.01
): boolean {
  return paymentAmount <= invoiceTotal + tolerance;
}

/**
 * Validates that ledger entries balance (debits = credits)
 */
export function validateLedgerBalance(
  entries: Array<{ debit: string; credit: string }>
): boolean {
  const totalDebits = entries.reduce(
    (sum, entry) => sum + parseFloat(entry.debit),
    0
  );
  const totalCredits = entries.reduce(
    (sum, entry) => sum + parseFloat(entry.credit),
    0
  );
  return Math.abs(totalDebits - totalCredits) < 0.01;
}

/**
 * Validates that a consignment batch has appropriate payment terms
 */
export function validateConsignmentTerms(
  batchCogsMode: string,
  orderPaymentTerms: PaymentTerms
): boolean {
  if (batchCogsMode === "CONSIGNMENT") {
    return orderPaymentTerms === "CONSIGNMENT";
  }
  return true;
}

/**
 * AR Aging Bucket Calculation
 */
export function calculateAgingBucket(invoiceDate: Date, currentDate: Date): string {
  const daysPastDue = Math.floor(
    (currentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysPastDue <= 0) return "CURRENT";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  if (daysPastDue <= 120) return "91-120";
  return "120+";
}

/**
 * Validates that an aging bucket is correctly calculated
 */
export function validateAgingBucket(
  invoiceDate: Date,
  currentDate: Date,
  agingBucket: string
): boolean {
  const expectedBucket = calculateAgingBucket(invoiceDate, currentDate);
  return expectedBucket === agingBucket;
}
