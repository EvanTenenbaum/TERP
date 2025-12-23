/**
 * Leaderboard System Types
 * Core type definitions for the unified leaderboard system
 */

// ============================================================================
// METRIC TYPES
// ============================================================================

/**
 * All available metric types for leaderboard calculations
 */
export type MetricType =
  // Customer metrics
  | "ytd_revenue"
  | "lifetime_value"
  | "average_order_value"
  | "profit_margin"
  | "order_frequency"
  | "recency"
  | "on_time_payment_rate"
  | "average_days_to_pay"
  | "credit_utilization"
  | "yoy_growth"
  // Supplier metrics
  | "ytd_purchase_volume"
  | "delivery_reliability"
  | "quality_score"
  | "product_variety"
  | "response_time"
  | "return_rate";

/**
 * Metric categories for grouping
 */
export type MetricCategory =
  | "MASTER"
  | "FINANCIAL"
  | "ENGAGEMENT"
  | "RELIABILITY"
  | "GROWTH";

/**
 * Client type filter options
 */
export type ClientType = "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";

/**
 * Direction for metric optimization
 */
export type MetricDirection = "higher_better" | "lower_better" | "optimal_range";

/**
 * Format for displaying metric values
 */
export type MetricFormat = "currency" | "percentage" | "days" | "count" | "decimal";

// ============================================================================
// METRIC CONFIGURATION
// ============================================================================

/**
 * Configuration for a single metric
 */
export interface MetricConfig {
  type: MetricType;
  name: string;
  description: string;
  category: MetricCategory;
  direction: MetricDirection;
  format: MetricFormat;
  minSampleSize: number;
  optimalMin?: number;
  optimalMax?: number;
  applicableTo: ("CUSTOMER" | "SUPPLIER")[];
}

/**
 * Weight configuration (metric type -> weight percentage)
 */
export type WeightConfig = Record<string, number>;

// ============================================================================
// METRIC RESULTS
// ============================================================================

/**
 * Result of a single metric calculation
 */
export interface MetricResult {
  value: number | null;
  sampleSize: number;
  isSignificant: boolean;
  calculatedAt: Date;
  rawData?: {
    numerator?: number;
    denominator?: number;
    dataPoints?: number[];
  };
}

/**
 * All metrics for a single client
 */
export interface ClientMetrics {
  clientId: number;
  metrics: Partial<Record<MetricType, MetricResult>>;
  masterScore: number | null;
  masterScoreBreakdown: MasterScoreBreakdown;
}

/**
 * Breakdown of how master score was calculated
 */
export interface MasterScoreBreakdown {
  totalScore: number;
  contributions: MetricContribution[];
  excludedMetrics: MetricType[];
  effectiveWeights: WeightConfig;
}

/**
 * Individual metric contribution to master score
 */
export interface MetricContribution {
  metricType: MetricType;
  weight: number;
  normalizedValue: number;
  contribution: number;
  isIncluded: boolean;
  excludeReason?: string;
}

// ============================================================================
// LEADERBOARD RESULTS
// ============================================================================

/**
 * A ranked client entry in the leaderboard
 */
export interface RankedClient {
  clientId: number;
  clientName: string;
  teriCode: string;
  clientType: ClientType;
  rank: number;
  percentile: number;
  masterScore: number | null;
  metrics: Partial<Record<MetricType, MetricResult>>;
  trend: "up" | "down" | "stable";
  trendAmount: number;
}

/**
 * Parameters for leaderboard queries
 */
export interface LeaderboardParams {
  clientType?: ClientType;
  metricCategory?: MetricCategory;
  weights?: WeightConfig;
  search?: string;
  sortBy?: MetricType | "master_score";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
  forceRefresh?: boolean;
}

/**
 * Full leaderboard result
 */
export interface LeaderboardResult {
  clients: RankedClient[];
  totalCount: number;
  metadata: {
    calculatedAt: Date;
    cacheHit: boolean;
    weightsApplied: WeightConfig;
    significanceWarnings: string[];
  };
}

/**
 * Single client ranking context (for profile page)
 */
export interface ClientRankingResult {
  clientId: number;
  rank: number;
  percentile: number;
  totalClients: number;
  masterScore: number | null;
  categoryRanks: {
    financial: number | null;
    engagement: number | null;
    reliability: number | null;
    growth: number | null;
  };
  metrics: Partial<Record<MetricType, MetricResult>>;
  trend: "up" | "down" | "stable";
  trendAmount: number;
  gapToNextRank: {
    metric: MetricType;
    gap: number;
    nextRank: number;
  } | null;
  history: RankHistoryEntry[];
}

/**
 * Historical rank entry
 */
export interface RankHistoryEntry {
  date: string;
  rank: number;
  score: number | null;
}

// ============================================================================
// VIP PORTAL TYPES
// ============================================================================

/**
 * Display mode for VIP Portal leaderboard
 */
export type VipDisplayMode = "blackbox" | "transparent";

/**
 * Sanitized entry for VIP Portal (no identifying info)
 */
export interface SanitizedEntry {
  rank: number;
  metricValue?: number; // Only in transparent mode
  isCurrentClient: boolean;
}

/**
 * Sanitized leaderboard result for VIP Portal
 */
export interface SanitizedLeaderboardResult {
  clientRank: number;
  totalParticipants: number;
  clientMetricValue: number;
  entries: SanitizedEntry[];
  suggestions: string[];
  lastUpdated: string;
}

// ============================================================================
// WIDGET TYPES
// ============================================================================

/**
 * Dashboard widget data
 */
export interface LeaderboardWidgetData {
  entries: {
    clientId: number;
    clientName: string;
    rank: number;
    score: number;
    trend: "up" | "down" | "stable";
    trendAmount: number;
  }[];
  totalClients: number;
  metric: string;
  mode: "top" | "bottom";
  lastUpdated: Date;
}

/**
 * Widget configuration
 */
export interface LeaderboardWidgetConfig {
  metric: MetricType | "master_score";
  mode: "top" | "bottom";
  limit: number;
  clientType: ClientType;
}
