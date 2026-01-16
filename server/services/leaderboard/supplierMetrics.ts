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
  returns,
  orderLineItems,
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
 * Calculate Quality Score for a supplier
 * Based on defective returns, defective quantity, and overall return rate
 * Score ranges from 0-100, where 100 is perfect quality
 */
export async function calculateQualityScore(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();

  // Get total quantity sold from this supplier
  const totalSoldResult = await database
    .select({
      total: sql<string>`COALESCE(SUM(${orderLineItems.quantity}), 0)`,
    })
    .from(orderLineItems)
    .innerJoin(batches, eq(orderLineItems.batchId, batches.id))
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        isNull(batches.deletedAt)
      )
    );

  const totalSold = parseFloat(totalSoldResult[0]?.total || "0");

  // Get defective quantity from batches
  const defectiveQtyResult = await database
    .select({
      defectiveTotal: sql<string>`COALESCE(SUM(${batches.defectiveQty}), 0)`,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        isNull(batches.deletedAt)
      )
    );

  const defectiveQty = parseFloat(defectiveQtyResult[0]?.defectiveTotal || "0");

  // Get all batch IDs from this supplier for efficient lookup
  const supplierBatchesResult = await database
    .select({
      batchId: batches.id,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        isNull(batches.deletedAt)
      )
    );

  const supplierBatchIds = new Set(
    supplierBatchesResult.map((row) => row.batchId)
  );

  // Get returns data to calculate defective return rate
  const returnedItemsResult = await database
    .select({
      returnedItems: returns.items,
      returnReason: returns.returnReason,
    })
    .from(returns);

  let totalDefectiveReturns = 0;
  let totalReturns = 0;

  for (const row of returnedItemsResult) {
    const items = row.returnedItems as Array<{
      batchId: number;
      quantity: number;
      reason?: string;
    }>;

    // Check if any of these batches belong to our supplier
    for (const item of items) {
      if (supplierBatchIds.has(item.batchId)) {
        totalReturns += item.quantity;
        // Count defective returns (from main return reason or item reason)
        if (row.returnReason === "DEFECTIVE" || item.reason === "DEFECTIVE") {
          totalDefectiveReturns += item.quantity;
        }
      }
    }
  }

  const config = METRIC_CONFIGS.quality_score;

  // Need at least some sales to calculate quality score
  if (totalSold < config.minSampleSize) {
    return {
      value: null,
      sampleSize: Math.round(totalSold),
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  // Calculate quality score (0-100 scale)
  // Start at 100 and deduct for quality issues
  const defectiveRate = (defectiveQty / totalSold) * 100;
  const defectiveReturnRate = (totalDefectiveReturns / totalSold) * 100;
  const overallReturnRate = (totalReturns / totalSold) * 100;

  // Quality Score Formula:
  // - Defective returns are weighted heavily (3x penalty)
  // - Defective inventory is weighted moderately (2x penalty)
  // - Overall returns have a light penalty (1x penalty)
  const qualityScore = Math.max(
    0,
    100 - defectiveReturnRate * 3 - defectiveRate * 2 - overallReturnRate * 1
  );

  return {
    value: qualityScore,
    sampleSize: Math.round(totalSold),
    isSignificant: totalSold >= config.minSampleSize,
    calculatedAt: new Date(),
    rawData: {
      numerator: Math.round(qualityScore),
      denominator: 100,
      dataPoints: [defectiveReturnRate, defectiveRate, overallReturnRate],
    },
  };
}

/**
 * Calculate Return Rate for a supplier
 * Calculates percentage of items returned from this supplier
 */
export async function calculateReturnRate(clientId: number): Promise<MetricResult> {
  const database = getDbOrThrow();

  // Get total quantity sold from this supplier
  const totalSoldResult = await database
    .select({
      total: sql<string>`COALESCE(SUM(${orderLineItems.quantity}), 0)`,
    })
    .from(orderLineItems)
    .innerJoin(batches, eq(orderLineItems.batchId, batches.id))
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        isNull(batches.deletedAt)
      )
    );

  const totalSold = parseFloat(totalSoldResult[0]?.total || "0");

  // Get all batch IDs from this supplier for efficient lookup
  const supplierBatchesResult = await database
    .select({
      batchId: batches.id,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        isNull(batches.deletedAt)
      )
    );

  const supplierBatchIds = new Set(
    supplierBatchesResult.map((row) => row.batchId)
  );

  // Get total quantity returned from this supplier
  // Returns table has items as JSON: [{ batchId, quantity, reason }]
  const returnedItemsResult = await database
    .select({
      returnedItems: returns.items,
    })
    .from(returns);

  let totalReturned = 0;
  for (const row of returnedItemsResult) {
    const items = row.returnedItems as Array<{
      batchId: number;
      quantity: number;
      reason?: string;
    }>;

    // Check if any of these batches belong to our supplier
    for (const item of items) {
      if (supplierBatchIds.has(item.batchId)) {
        totalReturned += item.quantity;
      }
    }
  }

  const config = METRIC_CONFIGS.return_rate;

  // Need at least some sales to calculate return rate
  if (totalSold < config.minSampleSize) {
    return {
      value: null,
      sampleSize: Math.round(totalSold),
      isSignificant: false,
      calculatedAt: new Date(),
    };
  }

  const returnRate = (totalReturned / totalSold) * 100;

  return {
    value: returnRate,
    sampleSize: Math.round(totalSold),
    isSignificant: totalSold >= config.minSampleSize,
    calculatedAt: new Date(),
    rawData: { numerator: totalReturned, denominator: totalSold },
  };
}
