import { Payment, Invoice, Bill } from "@/types/entities";
import { createAuditEntry } from "./audit";

export interface AgingBucket {
  current: number;
  days_30: number;
  days_60: number;
  days_90: number;
  days_90_plus: number;
  total: number;
}

export interface PaymentAllocation {
  invoice_id: string;
  amount: number;
}

/**
 * Calculate aging for receivables or payables
 */
export function calculateAging(
  documents: Array<{ id: string; date: string; balance: number }>
): AgingBucket {
  const today = new Date();
  const aging: AgingBucket = {
    current: 0,
    days_30: 0,
    days_60: 0,
    days_90: 0,
    days_90_plus: 0,
    total: 0,
  };

  documents.forEach((doc) => {
    const docDate = new Date(doc.date);
    const daysPast = Math.floor((today.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPast <= 30) {
      aging.current += doc.balance;
    } else if (daysPast <= 60) {
      aging.days_30 += doc.balance;
    } else if (daysPast <= 90) {
      aging.days_60 += doc.balance;
    } else if (daysPast <= 120) {
      aging.days_90 += doc.balance;
    } else {
      aging.days_90_plus += doc.balance;
    }

    aging.total += doc.balance;
  });

  return aging;
}

/**
 * Record a payment and allocate to invoices
 */
export function recordPayment(
  clientId: string,
  amount: number,
  paymentMethod: string,
  allocations: PaymentAllocation[],
  reference?: string
): Payment {
  const payment: Payment = {
    id: `PAY-${Date.now()}`,
    invoice_id_or_bill_id: allocations[0]?.invoice_id || "",
    date: new Date().toISOString().split("T")[0],
    method: paymentMethod,
    amount,
    reference: reference || "",
  };

  createAuditEntry({
    action: "record_payment",
    entity_type: "payment",
    entity_id: payment.id,
    after: { payment, allocations },
    ui_context: "payment_processing",
    module: "finance",
  });

  // Update invoice balances
  allocations.forEach((allocation) => {
    createAuditEntry({
      action: "apply_payment",
      entity_type: "invoice",
      entity_id: allocation.invoice_id,
      after: { payment_id: payment.id, amount_applied: allocation.amount },
      ui_context: "payment_allocation",
      module: "finance",
    });
  });

  return payment;
}

/**
 * Generate invoice from order
 */
export function generateInvoice(
  orderId: string,
  clientId: string,
  lineItems: Array<{ description: string; qty: number; price: number; total: number }>,
  terms?: string
): Invoice {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.1; // 10% tax for example
  const total = subtotal + tax;

  const invoice: Invoice = {
    id: `INV-${Date.now()}`,
    order_id: orderId,
    client_id: clientId,
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days
    subtotal,
    tax,
    grand_total: total,
    balance: total,
    status: "Draft",
    archived: false,
  };

  createAuditEntry({
    action: "generate_invoice",
    entity_type: "invoice",
    entity_id: invoice.id,
    after: invoice,
    ui_context: "invoice_generation",
    module: "finance",
  });

  return invoice;
}

/**
 * Record a vendor bill
 */
export function recordBill(
  vendorId: string,
  poId: string,
  amount: number,
  dueDate: string,
  reference?: string
): Bill {
  const bill: Bill = {
    id: `BILL-${Date.now()}`,
    vendor_id: vendorId,
    po_id: poId,
    issue_date: new Date().toISOString().split("T")[0],
    due_date: dueDate,
    subtotal: amount,
    tax: 0,
    grand_total: amount,
    balance: amount,
    status: "Draft",
    archived: false,
  };

  createAuditEntry({
    action: "record_bill",
    entity_type: "bill",
    entity_id: bill.id,
    after: bill,
    ui_context: "ap_entry",
    module: "finance",
  });

  return bill;
}
