/**
 * Order generation with revenue distribution
 * - $44M total revenue over 22 months
 * - 10 whale clients = 70% of revenue
 * - 50 regular clients = 30% of revenue
 * - 50% consignment sales
 * - Realistic order patterns
 */

import { CONFIG } from './config.js';
import { randomInRange, addVariance, randomDate, weightedRandom } from './utils.js';
import type { BatchData } from './inventory.js';

export interface OrderItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  unitCogs: number;
  cogsMode: 'FIXED' | 'RANGE';
  cogsSource: 'FIXED' | 'MIDPOINT' | 'CLIENT_ADJUSTMENT' | 'RULE' | 'MANUAL';
  appliedRule?: string;
  unitMargin: number;
  marginPercent: number;
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;
}

export interface OrderData {
  id?: number;
  orderNumber: string;
  orderType: string;
  clientId: number;
  clientNeedId: number | null;
  items: string; // JSON string
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  totalCogs: string;
  totalMargin: string;
  avgMarginPercent: string;
  validUntil: Date | null;
  quoteStatus: string | null;
  paymentTerms: string | null;
  cashPayment: string;
  dueDate: Date | null;
  saleStatus: string | null;
  invoiceId: number | null;
  createdBy: number;
  createdAt: Date;
}

/**
 * Generate orders with proper revenue distribution
 */
export function generateOrders(
  whaleClientIds: number[],
  regularClientIds: number[],
  batches: BatchData[]
): OrderData[] {
  const orders: OrderData[] = [];
  const totalOrders = CONFIG.totalMonths * CONFIG.ordersPerMonth;
  
  // Calculate revenue per client type
  const whaleRevenue = CONFIG.totalRevenue * CONFIG.whaleRevenuePercent;
  const regularRevenue = CONFIG.totalRevenue * CONFIG.regularRevenuePercent;
  
  const revenuePerWhale = whaleRevenue / CONFIG.whaleClients;
  const revenuePerRegular = regularRevenue / CONFIG.regularClients;
  
  // Track revenue generated for each client
  const clientRevenue = new Map<number, number>();
  whaleClientIds.forEach(id => clientRevenue.set(id, 0));
  regularClientIds.forEach(id => clientRevenue.set(id, 0));
  
  // Generate orders distributed across time
  for (let i = 0; i < totalOrders; i++) {
    // Determine if this is a whale or regular client order
    // Whales order more frequently
    const isWhaleOrder = Math.random() < 0.70; // 70% of orders from whales
    const clientIds = isWhaleOrder ? whaleClientIds : regularClientIds;
    const targetRevenue = isWhaleOrder ? revenuePerWhale : revenuePerRegular;
    
    // Select client (weighted by remaining revenue needed)
    const clientWeights = clientIds.map(id => {
      const current = clientRevenue.get(id) || 0;
      const remaining = targetRevenue - current;
      return Math.max(0, remaining); // Clients who need more revenue get higher weight
    });
    
    const totalWeight = clientWeights.reduce((sum, w) => sum + w, 0);
    
    // If all clients reached target, use equal weights to continue generating orders
    const weights = totalWeight === 0 
      ? clientIds.map(() => 1) 
      : clientWeights;
    const normalizedWeights = weights.map(w => w / weights.reduce((s, v) => s + v, 0));
    const clientId = weightedRandom(clientIds, normalizedWeights);
    
    // Generate order date (distributed across time period)
    const orderDate = new Date(
      CONFIG.startDate.getTime() + 
      (i / totalOrders) * (CONFIG.endDate.getTime() - CONFIG.startDate.getTime())
    );
    
    // Generate order items
    const itemCount = randomInRange(1, CONFIG.avgItemsPerOrder * 2);
    const items: OrderItem[] = [];
    let orderSubtotal = 0;
    let orderCogs = 0;
    
    for (let j = 0; j < itemCount; j++) {
      // Select random batch
      const batch = batches[randomInRange(0, batches.length - 1)];
      const unitCogs = parseFloat(batch.unitCogs);
      
      // Calculate unit price with margin
      const margin = addVariance(CONFIG.averageMargin, CONFIG.marginVariance);
      const unitPrice = unitCogs / (1 - margin);
      
      // Quantity (1-3 lbs for flower, 1-20 units for non-flower)
      // Target: ~$10K average order ($44M / 4,400 orders)
      const quantity = batch.grade ? randomInRange(1, 3) : randomInRange(1, 20);
      
      const lineTotal = unitPrice * quantity;
      const lineCogs = unitCogs * quantity;
      const lineMargin = lineTotal - lineCogs;
      const marginPercent = (lineMargin / lineTotal) * 100;
      
      items.push({
        batchId: batch.id || 0,
        displayName: `Product ${batch.productId}`,
        originalName: `Product ${batch.productId}`,
        quantity,
        unitPrice: parseFloat(unitPrice.toFixed(2)),
        isSample: false,
        unitCogs,
        cogsMode: 'FIXED',
        cogsSource: 'FIXED',
        unitMargin: parseFloat((unitPrice - unitCogs).toFixed(2)),
        marginPercent: parseFloat(marginPercent.toFixed(2)),
        lineTotal: parseFloat(lineTotal.toFixed(2)),
        lineCogs: parseFloat(lineCogs.toFixed(2)),
        lineMargin: parseFloat(lineMargin.toFixed(2)),
      });
      
      orderSubtotal += lineTotal;
      orderCogs += lineCogs;
    }
    
    const orderMargin = orderSubtotal - orderCogs;
    const avgMarginPercent = (orderMargin / orderSubtotal) * 100;
    
    // 50% consignment sales
    const isConsignment = Math.random() < CONFIG.salesConsignmentRate;
    const paymentTerms = isConsignment ? 'CONSIGNMENT' : 'NET_30';
    
    // Due date (30 days from order)
    const dueDate = new Date(orderDate);
    dueDate.setDate(dueDate.getDate() + 30);
    
    orders.push({
      orderNumber: `ORD-${String(i + 1).padStart(6, '0')}`,
      orderType: 'SALE',
      clientId,
      clientNeedId: null,
      items: JSON.stringify(items),
      subtotal: orderSubtotal.toFixed(2),
      tax: '0.00',
      discount: '0.00',
      total: orderSubtotal.toFixed(2),
      totalCogs: orderCogs.toFixed(2),
      totalMargin: orderMargin.toFixed(2),
      avgMarginPercent: avgMarginPercent.toFixed(2),
      validUntil: null,
      quoteStatus: null,
      paymentTerms,
      cashPayment: '0.00',
      dueDate,
      saleStatus: 'PAID',
      invoiceId: null, // Will be set when invoices are generated
      createdBy: 1, // Default admin user
      createdAt: orderDate,
    });
    
    // Track revenue for this client
    clientRevenue.set(clientId, (clientRevenue.get(clientId) || 0) + orderSubtotal);
  }
  
  return orders;
}

