/**
 * Leaderboard System Constants
 * Configuration and constants for the leaderboard system
 */

import type { MetricConfig, MetricType, WeightConfig } from "./types";

// ============================================================================
// METRIC CONFIGURATIONS
// ============================================================================

/**
 * Complete configuration for all metrics
 */
export const METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
  // Customer Financial Metrics
  ytd_revenue: {
    type: "ytd_revenue",
    name: "YTD Revenue",
    description: "Total revenue from this client in the current year",
    category: "FINANCIAL",
    direction: "higher_better",
    format: "currency",
    minSampleSize: 1,
    applicableTo: ["CUSTOMER"],
  },
  lifetime_value: {
    type: "lifetime_value",
    name: "Lifetime Value",
    description: "Total revenue from this client across all time",
    category: "FINANCIAL",
    direction: "higher_better",
    format: "currency",
    minSampleSize: 3,
    applicableTo: ["CUSTOMER"],
  },
  average_order_value: {
    type: "average_order_value",
    name: "Average Order Value",
    description: "Average value per order",
    category: "FINANCIAL",
    direction: "higher_better",
    format: "currency",
    minSampleSize: 3,
    applicableTo: ["CUSTOMER"],
  },
  profit_margin: {
    type: "profit_margin",
    name: "Profit Margin",
    description: "Average profit margin on orders",
    category: "FINANCIAL",
    direction: "higher_better",
    format: "percentage",
    minSampleSize: 3,
    applicableTo: ["CUSTOMER"],
  },

  // Customer Engagement Metrics
  order_frequency: {
    type: "order_frequency",
    name: "Order Frequency",
    description: "Number of orders in the last 90 days",
    category: "ENGAGEMENT",
    direction: "higher_better",
    format: "count",
    minSampleSize: 1,
    applicableTo: ["CUSTOMER"],
  },
  recency: {
    type: "recency",
    name: "Recency",
    description: "Days since last order",
    category: "ENGAGEMENT",
    direction: "lower_better",
    format: "days",
    minSampleSize: 1,
    applicableTo: ["CUSTOMER"],
  },

  // Customer Reliability Metrics
  on_time_payment_rate: {
    type: "on_time_payment_rate",
    name: "On-Time Payment Rate",
    description: "Percentage of invoices paid by due date",
    category: "RELIABILITY",
    direction: "higher_better",
    format: "percentage",
    minSampleSize: 5,
    applicableTo: ["CUSTOMER"],
  },
  average_days_to_pay: {
    type: "average_days_to_pay",
    name: "Average Days to Pay",
    description: "Average days between invoice and payment",
    category: "RELIABILITY",
    direction: "lower_better",
    format: "days",
    minSampleSize: 5,
    applicableTo: ["CUSTOMER"],
  },
  credit_utilization: {
    type: "credit_utilization",
    name: "Credit Utilization",
    description: "Percentage of credit limit used",
    category: "RELIABILITY",
    direction: "optimal_range",
    format: "percentage",
    minSampleSize: 1,
    optimalMin: 60,
    optimalMax: 80,
    applicableTo: ["CUSTOMER"],
  },

  // Customer Growth Metrics
  yoy_growth: {
    type: "yoy_growth",
    name: "YoY Growth",
    description: "Year-over-year revenue growth percentage",
    category: "GROWTH",
    direction: "higher_better",
    format: "percentage",
    minSampleSize: 2,
    applicableTo: ["CUSTOMER"],
  },

  // Supplier Metrics
  ytd_purchase_volume: {
    type: "ytd_purchase_volume",
    name: "YTD Purchase Volume",
    description: "Total purchases from this supplier in the current year",
    category: "FINANCIAL",
    direction: "higher_better",
    format: "currency",
    minSampleSize: 1,
    applicableTo: ["SUPPLIER"],
  },
  delivery_reliability: {
    type: "delivery_reliability",
    name: "Delivery Reliability",
    description: "Percentage of POs delivered on time",
    category: "RELIABILITY",
    direction: "higher_better",
    format: "percentage",
    minSampleSize: 5,
    applicableTo: ["SUPPLIER"],
  },
  quality_score: {
    type: "quality_score",
    name: "Quality Score",
    description: "Average quality rating of batches",
    category: "RELIABILITY",
    direction: "higher_better",
    format: "decimal",
    minSampleSize: 10,
    applicableTo: ["SUPPLIER"],
  },
  product_variety: {
    type: "product_variety",
    name: "Product Variety",
    description: "Number of distinct products supplied",
    category: "ENGAGEMENT",
    direction: "higher_better",
    format: "count",
    minSampleSize: 1,
    applicableTo: ["SUPPLIER"],
  },
  response_time: {
    type: "response_time",
    name: "Response Time",
    description: "Average days to fulfill POs",
    category: "ENGAGEMENT",
    direction: "lower_better",
    format: "days",
    minSampleSize: 5,
    applicableTo: ["SUPPLIER"],
  },
  return_rate: {
    type: "return_rate",
    name: "Return Rate",
    description: "Percentage of batches with returns/issues",
    category: "RELIABILITY",
    direction: "lower_better",
    format: "percentage",
    minSampleSize: 10,
    applicableTo: ["SUPPLIER"],
  },
};

// ============================================================================
// DEFAULT WEIGHTS
// ============================================================================

/**
 * Default weights for customer leaderboard
 */
export const CUSTOMER_DEFAULT_WEIGHTS: WeightConfig = {
  ytd_revenue: 25,
  on_time_payment_rate: 20,
  order_frequency: 15,
  profit_margin: 15,
  credit_utilization: 10,
  yoy_growth: 10,
  recency: 5,
};

/**
 * Default weights for supplier leaderboard
 */
export const SUPPLIER_DEFAULT_WEIGHTS: WeightConfig = {
  ytd_purchase_volume: 25,
  delivery_reliability: 25,
  quality_score: 20,
  product_variety: 15,
  response_time: 10,
  return_rate: 5,
};

/**
 * Default weights for all clients (uses customer weights)
 */
export const ALL_DEFAULT_WEIGHTS: WeightConfig = CUSTOMER_DEFAULT_WEIGHTS;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/**
 * Cache TTL values in milliseconds
 */
export const CACHE_TTL = {
  clientMetrics: 15 * 60 * 1000, // 15 minutes
  leaderboard: 5 * 60 * 1000, // 5 minutes
  userWeights: 24 * 60 * 60 * 1000, // 24 hours
  defaultWeights: 60 * 60 * 1000, // 1 hour
};

/**
 * Cache key generators
 */
export const CACHE_KEYS = {
  clientMetrics: (clientId: number) => `leaderboard:metrics:${clientId}`,
  leaderboard: (clientType: string, category: string) =>
    `leaderboard:full:${clientType}:${category}`,
  userWeights: (userId: number, clientType: string) =>
    `leaderboard:weights:${userId}:${clientType}`,
  defaultWeights: (clientType: string) => `leaderboard:defaults:${clientType}`,
};

// ============================================================================
// THRESHOLDS
// ============================================================================

/**
 * Minimum number of clients for statistical significance
 */
export const MIN_CLIENTS_FOR_SIGNIFICANCE = 10;

/**
 * Minimum number of VIP clients for leaderboard display
 */
export const DEFAULT_MIN_VIP_PARTICIPANTS = 5;

// ============================================================================
// METRIC CATEGORIES
// ============================================================================

/**
 * Metrics grouped by category for customers
 */
export const CUSTOMER_METRICS_BY_CATEGORY = {
  FINANCIAL: ["ytd_revenue", "lifetime_value", "average_order_value", "profit_margin"] as MetricType[],
  ENGAGEMENT: ["order_frequency", "recency"] as MetricType[],
  RELIABILITY: ["on_time_payment_rate", "average_days_to_pay", "credit_utilization"] as MetricType[],
  GROWTH: ["yoy_growth"] as MetricType[],
};

/**
 * Metrics grouped by category for suppliers
 */
export const SUPPLIER_METRICS_BY_CATEGORY = {
  FINANCIAL: ["ytd_purchase_volume"] as MetricType[],
  ENGAGEMENT: ["product_variety", "response_time"] as MetricType[],
  RELIABILITY: ["delivery_reliability", "quality_score", "return_rate"] as MetricType[],
  GROWTH: [] as MetricType[],
};

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a metric value for display
 */
export function formatMetricValue(metricType: MetricType, value: number | null): string {
  if (value === null) return "N/A";

  const config = METRIC_CONFIGS[metricType];
  if (!config) return value.toString();

  switch (config.format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "days":
      return `${Math.round(value)} days`;
    case "count":
      return Math.round(value).toString();
    case "decimal":
      return value.toFixed(2);
    default:
      return value.toString();
  }
}

/**
 * Get rank suffix (1st, 2nd, 3rd, etc.)
 */
export function getRankSuffix(rank: number): string {
  if (rank % 100 >= 11 && rank % 100 <= 13) return "th";
  switch (rank % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Get medal emoji for rank
 */
export function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return "";
  }
}
