/**
 * Invoice and AR aging generation
 * - 15% of debt overdue
 * - 50% of overdue debt is 120+ days old
 */

import { CONFIG } from './config.js';
import { randomInRange } from './utils.js';
import type { OrderData } from './orders.js';

export interface InvoiceData {
  id?: number;
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
  status: string;
  paymentTerms: string;
  notes: string | null;
  referenceType: string;
  referenceId: number;
  createdBy: number;
  createdAt: Date;
}

/**
 * Generate invoices with AR aging
 */
export function generateInvoices(orders: OrderData[]): InvoiceData[] {
  const invoices: InvoiceData[] = [];
  const today = CONFIG.endDate;
  
  // Only create invoices for SALE orders (not quotes)
  const saleOrders = orders.filter(o => o.orderType === 'SALE');
  
  // Pre-calculate which invoices will be overdue and which will be 120+
  const overdueCount = Math.floor(saleOrders.length * CONFIG.overduePercent);
  const overdue120PlusCount = Math.floor(overdueCount * CONFIG.overdue120PlusPercent);
  const overdueIndices = new Set<number>();
  const overdue120PlusIndices = new Set<number>();
  
  // Randomly select overdue invoices
  while (overdueIndices.size < overdueCount) {
    overdueIndices.add(Math.floor(Math.random() * saleOrders.length));
  }
  
  // Randomly select 120+ invoices from overdue set
  const overdueArray = Array.from(overdueIndices);
  while (overdue120PlusIndices.size < overdue120PlusCount) {
    overdue120PlusIndices.add(overdueArray[Math.floor(Math.random() * overdueArray.length)]);
  }
  
  for (let i = 0; i < saleOrders.length; i++) {
    const order = saleOrders[i];
    // Get the original order index for linking (DB IDs start at 1)
    const originalOrderIndex = orders.indexOf(order);
    const orderId = originalOrderIndex + 1;
    const invoiceDate = order.createdAt;
    // Always create a new Date object to avoid mutation
    const dueDate = order.dueDate 
      ? new Date(order.dueDate.getTime()) 
      : new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Determine if this invoice is overdue
    const isOverdue = overdueIndices.has(i);
    const is120PlusOverdue = overdue120PlusIndices.has(i);
    
    let status = 'PAID';
    let amountPaid = order.total;
    let amountDue = '0.00';
    
    if (isOverdue) {
      if (is120PlusOverdue) {
        // 120+ days overdue - completely unpaid
        status = 'OVERDUE';
        amountPaid = '0.00';
        amountDue = order.total;
        
        // Adjust due date to be 120+ days ago
        const daysAgo = randomInRange(121, 365); // 121-365 days to ensure > 120
        dueDate.setTime(dueDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      } else {
        // Less than 120 days overdue - partially paid
        const paidPercent = Math.random() * 0.5; // 0-50% paid
        const totalAmount = parseFloat(order.total);
        const paidAmount = totalAmount * paidPercent;
        const dueAmount = totalAmount - paidAmount;
        
        status = 'OVERDUE';
        amountPaid = paidAmount.toFixed(2);
        amountDue = dueAmount.toFixed(2);
        
        // Adjust due date to be 1-119 days ago
        const daysAgo = randomInRange(1, 119);
        dueDate.setTime(dueDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      }
    }
    
    invoices.push({
      invoiceNumber: `INV-${String(i + 1).padStart(6, '0')}`,
      customerId: order.clientId,
      invoiceDate,
      dueDate,
      subtotal: order.subtotal,
      taxAmount: order.tax,
      discountAmount: order.discount,
      totalAmount: order.total,
      amountPaid,
      amountDue,
      status,
      paymentTerms: order.paymentTerms || 'NET_30',
      notes: null,
      referenceType: 'ORDER',
      referenceId: orderId,
      createdBy: 1, // Default admin user
      createdAt: invoiceDate,
    });
  }
  
  return invoices;
}

/**
 * Calculate AR aging summary
 */
export function calculateARAgingSummary(invoices: InvoiceData[]): {
  totalAR: number;
  current: number;
  overdue1_30: number;
  overdue31_60: number;
  overdue61_90: number;
  overdue91_120: number;
  overdue120Plus: number;
} {
  const today = CONFIG.endDate;
  const summary = {
    totalAR: 0,
    current: 0,
    overdue1_30: 0,
    overdue31_60: 0,
    overdue61_90: 0,
    overdue91_120: 0,
    overdue120Plus: 0,
  };
  
  for (const invoice of invoices) {
    const amountDue = parseFloat(invoice.amountDue);
    if (amountDue === 0) continue;
    
    summary.totalAR += amountDue;
    
    const daysOverdue = Math.floor((today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue <= 0) {
      summary.current += amountDue;
    } else if (daysOverdue <= 30) {
      summary.overdue1_30 += amountDue;
    } else if (daysOverdue <= 60) {
      summary.overdue31_60 += amountDue;
    } else if (daysOverdue <= 90) {
      summary.overdue61_90 += amountDue;
    } else if (daysOverdue <= 120) {
      summary.overdue91_120 += amountDue;
    } else {
      summary.overdue120Plus += amountDue;
    }
  }
  
  return summary;
}

