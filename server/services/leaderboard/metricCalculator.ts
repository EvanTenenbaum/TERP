/**
 * Metric Calculator Service
 * Orchestrates metric calculations for clients
 */

import type { MetricType, MetricResult } from "./types";

// Re-export customer metrics
export {
  calculateYtdRevenue,
  calculateLifetimeValue,
  calculateAverageOrderValue,
  calculateOrderFrequency,
  calculateRecency,
  calculateOnTimePaymentRate,
  calculateAverageDaysToPay,
  calculateCreditUtilization,
  calculateYoyGrowth,
  calculateProfitMargin,
} from "./customerMetrics";

// Re-export supplier metrics
export {
  calculateYtdPurchaseVolume,
  calculateDeliveryReliability,
  calculateProductVariety,
  calculateResponseTime,
  calculateQualityScore,
  calculateReturnRate,
} from "./supplierMetrics";

// Import for internal use
import {
  calculateYtdRevenue,
  calculateLifetimeValue,
  calculateAverageOrderValue,
  calculateOrderFrequency,
  calculateRecency,
  calculateOnTimePaymentRate,
  calculateAverageDaysToPay,
  calculateCreditUtilization,
  calculateYoyGrowth,
  calculateProfitMargin,
} from "./customerMetrics";

import {
  calculateYtdPurchaseVolume,
  calculateDeliveryReliability,
  calculateProductVariety,
  calculateResponseTime,
  calculateQualityScore,
  calculateReturnRate,
} from "./supplierMetrics";

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
