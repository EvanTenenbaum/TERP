/**
 * Metric Calculator Service
 * Calculates individual metrics for clients from real transaction data
 */

import { db } from "../../db";
import { 
  clients, 
  invoices, 
  orders, 
  payments,
  bills,
  batches,
  lots,
  purchaseOrders,
} from "../../../drizzle/schema";
import { eq, and, sql, gte, isNull, ne } from "drizzle-orm";
import type { MetricType, MetricResult } from "./types";
import { METRIC_CONFIGS } from "./constants";

/**
 * Helper to ensure db is available
 */
function getDbOrThrow() {
  if (!db) {
    throw new Error("Database not available");
  }
  return db;
}

// ============================================================================
// METRIC CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate YTD Revenue for a customer
 */
export async function calculateYtdRevenue(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  const currentYear = new Date().getFullYear();
  
  const result = await database
    .select({
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, clientId),
        sql`YEAR(${invoices.invoiceDate}) = ${currentYear}`,
        ne(invoices.status, "VOID"),
        isNull(invoices.deletedAt)
      )
    );

  const value = parseFloat(result[0]?.total || "0");
  const sampleSize = result[0]?.count || 0;
  const config = METRIC_CONFIGS.ytd_revenue;

  return {
    value: sampleSize >= config.minSampleSize ? value : null,
    sampleSize,
    isSignificant: sampleSize >= config.minSampleSize,
    calculatedAt: new Date(),
    rawData: { numerator: value, denominator: 1 },
  };
}

/**
 * Calculate Lifetime Value for a customer
 */
export async function calculateLifetimeValue(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      total: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, clientId),
        ne(invoices.status, "VOID"),
        isNull(invoices.deletedAt)
      )
    );

  const value = parseFloat(result[0]?.total || "0");
  const sampleSize = result[0]?.count || 0;
  const config = METRIC_CONFIGS.lifetime_value;

  return {
    value: sampleSize >= config.minSampleSize ? value : null,
    sampleSize,
    isSignificant: sampleSize >= config.minSampleSize,
    calculatedAt: new Date(),
    rawData: { numerator: value, denominator: 1 },
  };
}

/**
 * Calculate Average Order Value for a customer
 * Uses orders.total and orders.clientId
 */
export async function calculateAverageOrderValue(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      avg: sql<string>`COALESCE(AVG(${orders.total}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.clientId, clientId),
        eq(orders.isDraft, false)
      )
    );

  const value = parseFloat(result[0]?.avg || "0");
  const sampleSize = result[0]?.count || 0;
  const config = METRIC_CONFIGS.average_order_value;

  return {
    value: sampleSize >= config.minSampleSize ? value : null,
    sampleSize,
    isSignificant: sampleSize >= config.minSampleSize,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate Order Frequency (orders in last 90 days)
 */
export async function calculateOrderFrequency(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const result = await database
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.clientId, clientId),
        gte(orders.createdAt, ninetyDaysAgo),
        eq(orders.isDraft, false)
      )
    );

  const value = result[0]?.count || 0;
  const config = METRIC_CONFIGS.order_frequency;

  return {
    value,
    sampleSize: value,
    isSignificant: value >= config.minSampleSize,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate Recency (days since last order)
 */
export async function calculateRecency(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      lastOrder: sql<Date>`MAX(${orders.createdAt})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.clientId, clientId),
        eq(orders.isDraft, false)
      )
    );

  const lastOrderDate = result[0]?.lastOrder;
  const sampleSize = result[0]?.count || 0;
  const config = METRIC_CONFIGS.recency;

  if (!lastOrderDate || sampleSize < config.minSampleSize) {
    return {
      value: null,
      sampleSize,
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  const daysSinceLastOrder = Math.floor(
    (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    value: daysSinceLastOrder,
    sampleSize,
    isSignificant: true,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate On-Time Payment Rate
 */
export async function calculateOnTimePaymentRate(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      onTime: sql<number>`SUM(CASE WHEN ${payments.paymentDate} <= ${invoices.dueDate} THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .innerJoin(payments, eq(payments.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.customerId, clientId),
        eq(invoices.status, "PAID"),
        isNull(invoices.deletedAt)
      )
    );

  const onTime = result[0]?.onTime || 0;
  const total = result[0]?.total || 0;
  const config = METRIC_CONFIGS.on_time_payment_rate;

  if (total < config.minSampleSize) {
    return {
      value: null,
      sampleSize: total,
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  const rate = (onTime / total) * 100;

  return {
    value: rate,
    sampleSize: total,
    isSignificant: true,
    calculatedAt: new Date(),
    rawData: { numerator: onTime, denominator: total },
  };
}

/**
 * Calculate Average Days to Pay
 */
export async function calculateAverageDaysToPay(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      avgDays: sql<string>`AVG(DATEDIFF(${payments.paymentDate}, ${invoices.invoiceDate}))`,
      count: sql<number>`COUNT(*)`,
    })
    .from(invoices)
    .innerJoin(payments, eq(payments.invoiceId, invoices.id))
    .where(
      and(
        eq(invoices.customerId, clientId),
        eq(invoices.status, "PAID"),
        isNull(invoices.deletedAt)
      )
    );

  const avgDays = parseFloat(result[0]?.avgDays || "0");
  const sampleSize = result[0]?.count || 0;
  const config = METRIC_CONFIGS.average_days_to_pay;

  return {
    value: sampleSize >= config.minSampleSize ? avgDays : null,
    sampleSize,
    isSignificant: sampleSize >= config.minSampleSize,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate Credit Utilization
 */
export async function calculateCreditUtilization(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      creditLimit: clients.creditLimit,
      totalOwed: clients.totalOwed,
    })
    .from(clients)
    .where(eq(clients.id, clientId));

  const client = result[0];
  if (!client) {
    return {
      value: null,
      sampleSize: 0,
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  const creditLimit = parseFloat(client.creditLimit || "0");
  const totalOwed = parseFloat(client.totalOwed || "0");

  if (creditLimit === 0) {
    return {
      value: null,
      sampleSize: 1,
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  const utilization = (totalOwed / creditLimit) * 100;

  return {
    value: utilization,
    sampleSize: 1,
    isSignificant: creditLimit > 0,
    calculatedAt: new Date(),
    rawData: { numerator: totalOwed, denominator: creditLimit },
  };
}

/**
 * Calculate Year-over-Year Growth
 */
export async function calculateYoyGrowth(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const result = await database
    .select({
      currentYearTotal: sql<string>`SUM(CASE WHEN YEAR(${invoices.invoiceDate}) = ${currentYear} THEN ${invoices.totalAmount} ELSE 0 END)`,
      previousYearTotal: sql<string>`SUM(CASE WHEN YEAR(${invoices.invoiceDate}) = ${previousYear} THEN ${invoices.totalAmount} ELSE 0 END)`,
      currentYearCount: sql<number>`SUM(CASE WHEN YEAR(${invoices.invoiceDate}) = ${currentYear} THEN 1 ELSE 0 END)`,
      previousYearCount: sql<number>`SUM(CASE WHEN YEAR(${invoices.invoiceDate}) = ${previousYear} THEN 1 ELSE 0 END)`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.customerId, clientId),
        ne(invoices.status, "VOID"),
        isNull(invoices.deletedAt)
      )
    );

  const currentTotal = parseFloat(result[0]?.currentYearTotal || "0");
  const previousTotal = parseFloat(result[0]?.previousYearTotal || "0");
  const currentCount = result[0]?.currentYearCount || 0;
  const previousCount = result[0]?.previousYearCount || 0;
  const config = METRIC_CONFIGS.yoy_growth;

  // Need data in both years
  if (previousCount < 1 || currentCount < 1) {
    return {
      value: null,
      sampleSize: currentCount + previousCount,
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  if (previousTotal === 0) {
    // Can't calculate growth from zero
    return {
      value: currentTotal > 0 ? 100 : 0, // 100% growth if we have current but no previous
      sampleSize: currentCount + previousCount,
      isSignificant: currentCount + previousCount >= config.minSampleSize,
      calculatedAt: new Date(),
    };
  }

  const growth = ((currentTotal - previousTotal) / previousTotal) * 100;

  return {
    value: growth,
    sampleSize: currentCount + previousCount,
    isSignificant: currentCount + previousCount >= config.minSampleSize,
    calculatedAt: new Date(),
    rawData: { numerator: currentTotal, denominator: previousTotal },
  };
}

/**
 * Calculate Profit Margin (average across orders)
 * Uses orders.avgMarginPercent
 */
export async function calculateProfitMargin(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  // Calculate from orders with margin data
  const result = await database
    .select({
      avgMargin: sql<string>`AVG(${orders.avgMarginPercent})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.clientId, clientId),
        eq(orders.isDraft, false)
      )
    );

  const avgMargin = parseFloat(result[0]?.avgMargin || "0");
  const sampleSize = result[0]?.count || 0;
  const config = METRIC_CONFIGS.profit_margin;

  return {
    value: sampleSize >= config.minSampleSize ? avgMargin : null,
    sampleSize,
    isSignificant: sampleSize >= config.minSampleSize,
    calculatedAt: new Date(),
  };
}

// ============================================================================
// SUPPLIER METRICS
// ============================================================================

/**
 * Calculate YTD Purchase Volume for a supplier
 */
export async function calculateYtdPurchaseVolume(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  const currentYear = new Date().getFullYear();
  
  const result = await database
    .select({
      total: sql<string>`COALESCE(SUM(${bills.totalAmount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(bills)
    .where(
      and(
        eq(bills.vendorId, clientId),
        sql`YEAR(${bills.billDate}) = ${currentYear}`,
        isNull(bills.deletedAt)
      )
    );

  const value = parseFloat(result[0]?.total || "0");
  const sampleSize = result[0]?.count || 0;
  const config = METRIC_CONFIGS.ytd_purchase_volume;

  return {
    value: sampleSize >= config.minSampleSize ? value : null,
    sampleSize,
    isSignificant: sampleSize >= config.minSampleSize,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate Delivery Reliability for a supplier
 * Uses purchaseOrders with actualDeliveryDate and expectedDeliveryDate
 */
export async function calculateDeliveryReliability(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      onTime: sql<number>`SUM(CASE WHEN ${purchaseOrders.actualDeliveryDate} <= ${purchaseOrders.expectedDeliveryDate} THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.supplierClientId, clientId),
        eq(purchaseOrders.purchaseOrderStatus, "RECEIVED")
      )
    );

  const onTime = result[0]?.onTime || 0;
  const total = result[0]?.total || 0;
  const config = METRIC_CONFIGS.delivery_reliability;

  if (total < config.minSampleSize) {
    return {
      value: null,
      sampleSize: total,
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  const rate = (onTime / total) * 100;

  return {
    value: rate,
    sampleSize: total,
    isSignificant: true,
    calculatedAt: new Date(),
    rawData: { numerator: onTime, denominator: total },
  };
}

/**
 * Calculate Product Variety for a supplier
 * Uses lots.supplierClientId -> batches.lotId -> batches.productId
 */
export async function calculateProductVariety(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      count: sql<number>`COUNT(DISTINCT ${batches.productId})`,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        isNull(batches.deletedAt)
      )
    );

  const value = result[0]?.count || 0;
  const config = METRIC_CONFIGS.product_variety;

  return {
    value,
    sampleSize: value,
    isSignificant: value >= config.minSampleSize,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate Response Time for a supplier (avg days to fulfill POs)
 */
export async function calculateResponseTime(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  const result = await database
    .select({
      avgDays: sql<string>`AVG(DATEDIFF(${purchaseOrders.actualDeliveryDate}, ${purchaseOrders.orderDate}))`,
      count: sql<number>`COUNT(*)`,
    })
    .from(purchaseOrders)
    .where(
      and(
        eq(purchaseOrders.supplierClientId, clientId),
        eq(purchaseOrders.purchaseOrderStatus, "RECEIVED")
      )
    );

  const avgDays = parseFloat(result[0]?.avgDays || "0");
  const sampleSize = result[0]?.count || 0;
  const config = METRIC_CONFIGS.response_time;

  return {
    value: sampleSize >= config.minSampleSize ? avgDays : null,
    sampleSize,
    isSignificant: sampleSize >= config.minSampleSize,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate Quality Score for a supplier (placeholder - needs quality tracking)
 */
export async function calculateQualityScore(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  // For now, return a placeholder - quality scoring needs to be implemented
  // This would typically come from batch quality ratings or QC results
  const result = await database
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        isNull(batches.deletedAt)
      )
    );

  const sampleSize = result[0]?.count || 0;

  // Placeholder: return null until quality tracking is implemented
  return {
    value: null,
    sampleSize,
    isSignificant: false,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate Return Rate for a supplier (placeholder - needs return tracking)
 */
export async function calculateReturnRate(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
  // Placeholder - return tracking needs to be implemented
  const result = await database
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        isNull(batches.deletedAt)
      )
    );

  const sampleSize = result[0]?.count || 0;

  return {
    value: null,
    sampleSize,
    isSignificant: false,
    calculatedAt: new Date(),
  };
}

// ============================================================================
// BATCH CALCULATION
// ============================================================================

/**
 * Calculate all metrics for a single client
 */
export async function calculateAllMetrics(
  clientId: number,
  clientType: "CUSTOMER" | "SUPPLIER" | "DUAL"
): Promise<Partial<Record<MetricType, MetricResult>>> {
  const metrics: Partial<Record<MetricType, MetricResult>> = {};

  // Customer metrics
  if (clientType === "CUSTOMER" || clientType === "DUAL") {
    const [
      ytdRevenue,
      lifetimeValue,
      avgOrderValue,
      profitMargin,
      orderFrequency,
      recency,
      onTimePaymentRate,
      avgDaysToPay,
      creditUtilization,
      yoyGrowth,
    ] = await Promise.all([
      calculateYtdRevenue(clientId),
      calculateLifetimeValue(clientId),
      calculateAverageOrderValue(clientId),
      calculateProfitMargin(clientId),
      calculateOrderFrequency(clientId),
      calculateRecency(clientId),
      calculateOnTimePaymentRate(clientId),
      calculateAverageDaysToPay(clientId),
      calculateCreditUtilization(clientId),
      calculateYoyGrowth(clientId),
    ]);

    metrics.ytd_revenue = ytdRevenue;
    metrics.lifetime_value = lifetimeValue;
    metrics.average_order_value = avgOrderValue;
    metrics.profit_margin = profitMargin;
    metrics.order_frequency = orderFrequency;
    metrics.recency = recency;
    metrics.on_time_payment_rate = onTimePaymentRate;
    metrics.average_days_to_pay = avgDaysToPay;
    metrics.credit_utilization = creditUtilization;
    metrics.yoy_growth = yoyGrowth;
  }

  // Supplier metrics
  if (clientType === "SUPPLIER" || clientType === "DUAL") {
    const [
      ytdPurchaseVolume,
      deliveryReliability,
      productVariety,
      responseTime,
      qualityScore,
      returnRate,
    ] = await Promise.all([
      calculateYtdPurchaseVolume(clientId),
      calculateDeliveryReliability(clientId),
      calculateProductVariety(clientId),
      calculateResponseTime(clientId),
      calculateQualityScore(clientId),
      calculateReturnRate(clientId),
    ]);

    metrics.ytd_purchase_volume = ytdPurchaseVolume;
    metrics.delivery_reliability = deliveryReliability;
    metrics.product_variety = productVariety;
    metrics.response_time = responseTime;
    metrics.quality_score = qualityScore;
    metrics.return_rate = returnRate;
  }

  return metrics;
}

/**
 * Calculate metrics for multiple clients in batch
 */
export async function calculateMetricsBatch(
  clientIds: number[],
  clientTypes: Map<number, "CUSTOMER" | "SUPPLIER" | "DUAL">
): Promise<Map<number, Partial<Record<MetricType, MetricResult>>>> {
  const results = new Map<number, Partial<Record<MetricType, MetricResult>>>();
  const BATCH_SIZE = 50;

  // Process in batches to avoid overwhelming the database
  for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
    const batch = clientIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(id => calculateAllMetrics(id, clientTypes.get(id) || "CUSTOMER"))
    );
    batchResults.forEach((metrics, idx) => {
      results.set(batch[idx], metrics);
    });
  }

  return results;
}

/**
 * Get client type from client record
 */
export function getClientType(client: {
  isBuyer: boolean | null;
  isSeller: boolean | null;
}): "CUSTOMER" | "SUPPLIER" | "DUAL" {
  const isBuyer = client.isBuyer ?? false;
  const isSeller = client.isSeller ?? false;

  if (isBuyer && isSeller) return "DUAL";
  if (isSeller) return "SUPPLIER";
  return "CUSTOMER";
}
