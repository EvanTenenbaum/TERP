/**
 * Returns and refunds generation
 * - 0.5% return rate
 * - 5% of orders get 5% refund
 */

import { CONFIG } from './config.js';
import { randomInRange, randomDate } from './utils.js';
import type { OrderData } from './orders.js';

export interface ReturnData {
  id?: number;
  orderId: number;
  items: string; // JSON string
  returnReason: "DEFECTIVE" | "WRONG_ITEM" | "NOT_AS_DESCRIBED" | "CUSTOMER_CHANGED_MIND" | "OTHER";
  notes: string | null;
  processedBy: number;
  processedAt: Date;
}

export interface RefundData {
  id?: number;
  refundNumber: string;
  orderId: number;
  clientId: number;
  refundAmount: string;
  refundDate: Date;
  reason: string;
  status: string;
  notes: string | null;
  createdAt: Date;
}

/**
 * Generate returns (0.5% return rate)
 */
export function generateReturns(orders: OrderData[]): ReturnData[] {
  const returns: ReturnData[] = [];
  const returnCount = Math.floor(orders.length * CONFIG.returnRate);
  
  const returnReasons = [
    'Product quality issue',
    'Wrong product shipped',
    'Damaged in transit',
    'Customer changed mind',
    'Product did not meet expectations',
  ];
  
  // Select random orders for returns
  const returnOrderIndices = new Set<number>();
  while (returnOrderIndices.size < returnCount) {
    returnOrderIndices.add(randomInRange(0, orders.length - 1));
  }
  
  const returnOrderIndicesArray = Array.from(returnOrderIndices);
  for (const orderIndex of returnOrderIndicesArray) {
    const order = orders[orderIndex];
    const orderDate = order.createdAt;
    
    // Return happens 1-30 days after order
    const returnDate = new Date(orderDate);
    returnDate.setDate(returnDate.getDate() + randomInRange(1, 30));
    
    // Full refund minus restocking fee
    const refundAmount = parseFloat(order.total);
    const restockingFee = refundAmount * 0.10; // 10% restocking fee
    const netRefund = refundAmount - restockingFee;
    
    const returnReasons: Array<"DEFECTIVE" | "WRONG_ITEM" | "NOT_AS_DESCRIBED" | "CUSTOMER_CHANGED_MIND" | "OTHER"> = 
      ['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CUSTOMER_CHANGED_MIND', 'OTHER'];
    
    returns.push({
      orderId: order.id || 0,
      items: typeof order.items === 'string' ? order.items : JSON.stringify(order.items),
      returnReason: returnReasons[randomInRange(0, 4)],
      notes: null,
      processedBy: 1, // Default admin user
      processedAt: returnDate,
    });
  }
  
  return returns;
}

/**
 * Generate refunds (5% of orders get 5% refund)
 */
export function generateRefunds(orders: OrderData[]): RefundData[] {
  const refunds: RefundData[] = [];
  const refundCount = Math.floor(orders.length * CONFIG.refundRate);
  
  const refundReasons = [
    'Pricing error',
    'Promotional discount applied late',
    'Customer satisfaction adjustment',
    'Billing error',
    'Goodwill gesture',
  ];
  
  // Select random orders for refunds (exclude returns)
  const refundOrderIndices = new Set<number>();
  while (refundOrderIndices.size < refundCount) {
    refundOrderIndices.add(randomInRange(0, orders.length - 1));
  }
  
  let refundIndex = 1;
  const refundOrderIndicesArray = Array.from(refundOrderIndices);
  for (const orderIndex of refundOrderIndicesArray) {
    const order = orders[orderIndex];
    const orderDate = order.createdAt;
    
    // Refund happens 1-60 days after order
    const refundDate = new Date(orderDate);
    refundDate.setDate(refundDate.getDate() + randomInRange(1, 60));
    
    // 5% refund of order total
    const orderTotal = parseFloat(order.total);
    const refundAmount = orderTotal * CONFIG.refundAmount;
    
    refunds.push({
      refundNumber: `REF-${String(refundIndex++).padStart(6, '0')}`,
      orderId: order.id || 0,
      clientId: order.clientId,
      refundAmount: refundAmount.toFixed(2),
      refundDate,
      reason: refundReasons[randomInRange(0, refundReasons.length - 1)],
      status: 'COMPLETED',
      notes: null,
      createdAt: refundDate,
    });
  }
  
  return refunds;
}

