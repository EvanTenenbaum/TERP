/**
 * Scoring Service
 * Calculates master scores from metrics and weights
 */

import type {
  MetricType,
  MetricResult,
  WeightConfig,
  MasterScoreBreakdown,
  MetricContribution,
} from "./types";
import { METRIC_CONFIGS } from "./constants";
import { redistributeWeights } from "./weightNormalizer";

/**
 * Calculate master score from metrics and weights
 */
export function calculateMasterScore(
  metrics: Partial<Record<MetricType, MetricResult>>,
  weights: WeightConfig
): { score: number | null; breakdown: MasterScoreBreakdown } {
  const contributions: MetricContribution[] = [];
  const excludedMetrics: MetricType[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // First pass: identify which metrics can be included
  for (const [metricType, weight] of Object.entries(weights)) {
    const metric = metrics[metricType as MetricType];

    if (!metric || metric.value === null || !metric.isSignificant) {
      excludedMetrics.push(metricType as MetricType);
      contributions.push({
        metricType: metricType as MetricType,
        weight,
        normalizedValue: 0,
        contribution: 0,
        isIncluded: false,
        excludeReason: !metric
          ? "No data"
          : metric.value === null
          ? "Insufficient data"
          : "Below significance threshold",
      });
      continue;
    }

    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return {
      score: null,
      breakdown: {
        totalScore: 0,
        contributions,
        excludedMetrics,
        effectiveWeights: {},
      },
    };
  }

  // Redistribute weights among included metrics
  const effectiveWeights = redistributeWeights(weights, excludedMetrics);

  // Second pass: calculate normalized values and contributions
  for (const [metricType, effectiveWeight] of Object.entries(effectiveWeights)) {
    const metric = metrics[metricType as MetricType];
    const config = METRIC_CONFIGS[metricType as MetricType];

    if (!metric || metric.value === null) continue;

    // Normalize value to 0-100 scale
    const normalizedValue = normalizeMetricValue(metric.value, config);
    const contribution = (normalizedValue * effectiveWeight) / 100;
    totalScore += contribution;

    // Update contribution record
    const existingContribution = contributions.find(c => c.metricType === metricType);
    if (existingContribution) {
      existingContribution.normalizedValue = normalizedValue;
      existingContribution.contribution = contribution;
      existingContribution.isIncluded = true;
      existingContribution.weight = effectiveWeight;
    } else {
      contributions.push({
        metricType: metricType as MetricType,
        weight: effectiveWeight,
        normalizedValue,
        contribution,
        isIncluded: true,
      });
    }
  }

  return {
    score: Math.round(totalScore * 100) / 100,
    breakdown: {
      totalScore: Math.round(totalScore * 100) / 100,
      contributions,
      excludedMetrics,
      effectiveWeights,
    },
  };
}

/**
 * Normalize a metric value to 0-100 scale based on its configuration
 */
function normalizeMetricValue(
  value: number,
  config: { 
    direction: string; 
    optimalMin?: number; 
    optimalMax?: number; 
    format: string;
  }
): number {
  if (config.direction === "optimal_range" && config.optimalMin !== undefined && config.optimalMax !== undefined) {
    // For optimal range metrics (like credit utilization)
    if (value >= config.optimalMin && value <= config.optimalMax) {
      return 100;
    }
    const distanceFromOptimal =
      value < config.optimalMin
        ? config.optimalMin - value
        : value - config.optimalMax;
    return Math.max(0, 100 - distanceFromOptimal * 2);
  }
  
  if (config.direction === "lower_better") {
    // For metrics where lower is better (recency, days to pay)
    // Invert the scale - assume max reasonable value is 365 days
    const maxValue = 365;
    return Math.max(0, Math.min(100, ((maxValue - value) / maxValue) * 100));
  }
  
  // For metrics where higher is better
  if (config.format === "currency") {
    // Log scale: $0 = 0, $1M = 100
    return Math.min(100, (Math.log10(Math.max(1, value)) / 6) * 100);
  }
  
  if (config.format === "percentage") {
    return Math.min(100, value);
  }
  
  // Count-based metrics
  return Math.min(100, value * 10); // 10 orders = 100
}
