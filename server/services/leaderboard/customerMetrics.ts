/**
 * Customer Metrics Calculator
 * Calculates customer-specific metrics from real transaction data
 */

import { db } from "../../db";
import { 
  clients, 
  invoices, 
  orders, 
  payments,
} from "../../../drizzle/schema";
import { eq, and, sql, gte, isNull, ne } from "drizzle-orm";
import type { MetricResult } from "./types";
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

  if (previousCount < 1 || currentCount < 1) {
    return {
      value: null,
      sampleSize: currentCount + previousCount,
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  if (previousTotal === 0) {
    return {
      value: currentTotal > 0 ? 100 : 0,
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
 */
export async function calculateProfitMargin(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();
  
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
