/**
 * Supplier Metrics Calculator
 * Calculates supplier-specific metrics from real transaction data
 */

import { db } from "../../db";
import { 
  bills,
  batches,
  lots,
  purchaseOrders,
} from "../../../drizzle/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
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
