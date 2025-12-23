/**
 * Weight Normalizer Utility
 * Handles weight normalization and validation for the leaderboard system
 */

import type { WeightConfig, MetricType } from "./types";

/**
 * Normalize weights to ensure they sum to exactly 100%
 * @param weights - Raw weight configuration
 * @returns Normalized weights summing to 100
 */
export function normalizeWeights(weights: WeightConfig): WeightConfig {
  const entries = Object.entries(weights).filter(([, value]) => value > 0);
  
  if (entries.length === 0) {
    return {};
  }

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  
  if (total === 0) {
    // Distribute equally among all metrics
    const equalWeight = 100 / entries.length;
    return Object.fromEntries(entries.map(([key]) => [key, equalWeight]));
  }

  // Normalize to 100%
  const normalized: WeightConfig = {};
  let runningTotal = 0;
  
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    if (i === entries.length - 1) {
      // Last entry gets the remainder to ensure exact 100%
      normalized[key] = Math.round((100 - runningTotal) * 100) / 100;
    } else {
      const normalizedValue = Math.round((value / total) * 100 * 100) / 100;
      normalized[key] = normalizedValue;
      runningTotal += normalizedValue;
    }
  }

  return normalized;
}

/**
 * Validate weight configuration structure
 * @param weights - Weight configuration to validate
 * @returns Validation result with errors if any
 */
export function validateWeights(weights: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!weights || typeof weights !== "object") {
    errors.push("Weights must be an object");
    return { valid: false, errors };
  }

  const weightObj = weights as Record<string, unknown>;

  for (const [key, value] of Object.entries(weightObj)) {
    if (typeof value !== "number") {
      errors.push(`Weight for "${key}" must be a number`);
      continue;
    }
    if (value < 0) {
      errors.push(`Weight for "${key}" cannot be negative`);
    }
    if (value > 100) {
      errors.push(`Weight for "${key}" cannot exceed 100`);
    }
    if (!Number.isFinite(value)) {
      errors.push(`Weight for "${key}" must be a finite number`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Redistribute weights when some metrics are excluded
 * @param weights - Original weight configuration
 * @param excludedMetrics - Metrics to exclude
 * @returns Redistributed weights for remaining metrics
 */
export function redistributeWeights(
  weights: WeightConfig,
  excludedMetrics: MetricType[]
): WeightConfig {
  const excludedSet = new Set(excludedMetrics);
  const remainingEntries = Object.entries(weights).filter(
    ([key]) => !excludedSet.has(key as MetricType)
  );

  if (remainingEntries.length === 0) {
    return {};
  }

  const remainingTotal = remainingEntries.reduce((sum, [, value]) => sum + value, 0);
  
  if (remainingTotal === 0) {
    // Distribute equally
    const equalWeight = 100 / remainingEntries.length;
    return Object.fromEntries(remainingEntries.map(([key]) => [key, equalWeight]));
  }

  // Redistribute proportionally
  const redistributed: WeightConfig = {};
  let runningTotal = 0;

  for (let i = 0; i < remainingEntries.length; i++) {
    const [key, value] = remainingEntries[i];
    if (i === remainingEntries.length - 1) {
      redistributed[key] = Math.round((100 - runningTotal) * 100) / 100;
    } else {
      const newWeight = Math.round((value / remainingTotal) * 100 * 100) / 100;
      redistributed[key] = newWeight;
      runningTotal += newWeight;
    }
  }

  return redistributed;
}

/**
 * Merge user weights with defaults, filling in missing metrics
 * @param userWeights - User's custom weights
 * @param defaultWeights - Default weights to fill gaps
 * @returns Merged and normalized weights
 */
export function mergeWithDefaults(
  userWeights: WeightConfig,
  defaultWeights: WeightConfig
): WeightConfig {
  const merged: WeightConfig = { ...defaultWeights };
  
  // Override with user weights where provided
  for (const [key, value] of Object.entries(userWeights)) {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }

  return normalizeWeights(merged);
}

/**
 * Calculate the sum of weights
 * @param weights - Weight configuration
 * @returns Sum of all weights
 */
export function sumWeights(weights: WeightConfig): number {
  return Object.values(weights).reduce((sum, value) => sum + (value || 0), 0);
}

/**
 * Check if weights are properly normalized (sum to ~100%)
 * @param weights - Weight configuration
 * @param tolerance - Acceptable deviation from 100 (default 0.01)
 * @returns True if weights sum to 100 within tolerance
 */
export function areWeightsNormalized(
  weights: WeightConfig,
  tolerance: number = 0.01
): boolean {
  const sum = sumWeights(weights);
  return Math.abs(sum - 100) <= tolerance;
}

/**
 * Get the effective weight for a metric, considering exclusions
 * @param metricType - The metric to get weight for
 * @param weights - Current weight configuration
 * @param excludedMetrics - Metrics that are excluded
 * @returns Effective weight (0 if excluded)
 */
export function getEffectiveWeight(
  metricType: MetricType,
  weights: WeightConfig,
  excludedMetrics: MetricType[]
): number {
  if (excludedMetrics.includes(metricType)) {
    return 0;
  }
  
  const redistributed = redistributeWeights(weights, excludedMetrics);
  return redistributed[metricType] || 0;
}
