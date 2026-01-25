/**
 * Order generation with revenue distribution
 * - $44M total revenue over 22 months
 * - 10 whale clients = 70% of revenue
 * - 50 regular clients = 30% of revenue
 * - 50% consignment sales
 * - Realistic order patterns
 */

import { CONFIG } from "./config.js";
import {
  addVariance,
  weightedRandom,
  generateParetoWeights,
  selectWeightedIndex,
  longTailRandom,
  generateWeightedQuantity,
  setSeed,
  random,
} from "./utils.js";
import type { BatchData } from "./inventory.js";

export interface OrderItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  unitCogs: number;
  cogsMode: "FIXED" | "RANGE";
  cogsSource: "FIXED" | "MIDPOINT" | "CLIENT_ADJUSTMENT" | "RULE" | "MANUAL";
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
  orderType: "QUOTE" | "SALE";
  isDraft?: boolean;
  clientId: number;
  clientNeedId: number | null;
  items: OrderItem[]; // Array of items (Drizzle will handle JSON conversion)
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  totalCogs: string;
  totalMargin: string;
  avgMarginPercent: string;
  validUntil: Date | null;
  quoteStatus: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CONVERTED" | null;
  paymentTerms: "NET_7" | "NET_15" | "NET_30" | "COD" | "PARTIAL" | "CONSIGNMENT" | null;
  cashPayment: string;
  dueDate: Date | null;
  saleStatus: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED" | null;
  invoiceId: number | null;
  fulfillmentStatus?: "PENDING" | "PACKED" | "SHIPPED" | null;
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
  // Initialize seeded random for reproducibility
  if (CONFIG.seed) {
    setSeed(CONFIG.seed);
  }

  const orders: OrderData[] = [];
  const totalOrders = CONFIG.totalMonths * CONFIG.ordersPerMonth;

  // Generate Pareto distribution weights for product popularity
  const productWeights = generateParetoWeights(batches.length);

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
    const isWhaleOrder = random() < 0.7; // 70% of orders from whales
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
    const weights = totalWeight === 0 ? clientIds.map(() => 1) : clientWeights;
    const normalizedWeights = weights.map(
      w => w / weights.reduce((s, v) => s + v, 0)
    );
    const clientId = weightedRandom(clientIds, normalizedWeights);

    // Generate order date (distributed across time period)
    const orderDate = new Date(
      CONFIG.startDate.getTime() +
        (i / totalOrders) *
          (CONFIG.endDate.getTime() - CONFIG.startDate.getTime())
    );

    // Generate order items with long-tail distribution
    // Inject order-level anomalies: special orders
    const orderAnomalyRoll = random();
    let itemCount: number;
    let forceMargin: number | null = null;
    let forceSmallQuantity = false;

    if (orderAnomalyRoll < 0.1) {
      // 10% are very small orders (1-2 items with small quantities)
      itemCount = random() < 0.5 ? 1 : 2;
      forceSmallQuantity = true;
    } else {
      // 90% normal distribution
      itemCount = longTailRandom(1, 15, 2.5); // Most orders have 2-5 items
    }

    // 3% of orders get forced low margins across all items
    if (orderAnomalyRoll >= 0.1 && orderAnomalyRoll < 0.13) {
      forceMargin = 0.05 + random() * 0.05; // 5-10% margin
    }

    // 3% of orders get forced high margins across all items
    if (orderAnomalyRoll >= 0.13 && orderAnomalyRoll < 0.16) {
      forceMargin = 0.5 + random() * 0.2; // 50-70% margin
    }

    const items: OrderItem[] = [];
    let orderSubtotal = 0;
    let orderCogs = 0;

    for (let j = 0; j < itemCount; j++) {
      // Select batch using Pareto distribution (popular products selected more often)
      const batchIndex = selectWeightedIndex(productWeights);
      const batch = batches[batchIndex];
      const unitCogs = parseFloat(batch.unitCogs);

      // Calculate unit price with margin
      let margin: number;

      if (forceMargin !== null) {
        // Order has forced margin (low-margin order)
        margin = forceMargin;
      } else {
        // Inject item-level anomalies: 10% of items get extreme margins
        const anomalyRoll = random();
        if (anomalyRoll < 0.05) {
          // 5% get very high margins (50-70%)
          margin = 0.5 + random() * 0.2;
        } else if (anomalyRoll < 0.1) {
          // 5% get very low margins (5-10%)
          margin = 0.05 + random() * 0.05;
        } else {
          // 90% get normal margins with variance
          margin = addVariance(CONFIG.averageMargin, CONFIG.marginVariance);
        }
      }

      const unitPrice = unitCogs / (1 - margin);

      // Quantity with weighted distribution (realistic B2B quantities)
      const isFlower = batch.grade !== null && batch.grade !== undefined;
      let quantity: number;

      if (forceSmallQuantity) {
        // Small orders get minimal quantities
        quantity = isFlower
          ? 0.5 + random() * 0.5
          : 1 + Math.floor(random() * 3);
      } else {
        quantity = generateWeightedQuantity(isFlower);
      }

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
        cogsMode: "FIXED",
        cogsSource: "FIXED",
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
    const isConsignment = random() < CONFIG.salesConsignmentRate;
    const paymentTerms = isConsignment ? "CONSIGNMENT" : "NET_30";

    // Due date (30 days from order)
    const dueDate = new Date(orderDate);
    dueDate.setDate(dueDate.getDate() + 30);

    orders.push({
      orderNumber: `ORD-${String(i + 1).padStart(6, "0")}`,
      orderType: "SALE",
      isDraft: false,
      clientId,
      clientNeedId: null,
      items: items, // Pass array directly, Drizzle handles JSON conversion
      subtotal: orderSubtotal.toFixed(2),
      tax: "0.00",
      discount: "0.00",
      total: orderSubtotal.toFixed(2),
      totalCogs: orderCogs.toFixed(2),
      totalMargin: orderMargin.toFixed(2),
      avgMarginPercent: avgMarginPercent.toFixed(2),
      validUntil: null,
      quoteStatus: null,
      paymentTerms,
      cashPayment: "0.00",
      dueDate,
      saleStatus: "PAID",
      invoiceId: null, // Will be set when invoices are generated
      fulfillmentStatus: "PENDING",
      createdBy: 1, // Default admin user
      createdAt: orderDate,
    });

    // Track revenue for this client
    clientRevenue.set(
      clientId,
      (clientRevenue.get(clientId) || 0) + orderSubtotal
    );
  }

  return orders;
}
