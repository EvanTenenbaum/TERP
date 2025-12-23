/**
 * Leaderboard Service Module
 * Unified leaderboard system for internal and VIP Portal use
 */

// Types
export type {
  MetricType,
  MetricCategory,
  ClientType,
  MetricDirection,
  MetricFormat,
  MetricConfig,
  WeightConfig,
  MetricResult,
  ClientMetrics,
  MasterScoreBreakdown,
  MetricContribution,
  RankedClient,
  LeaderboardParams,
  LeaderboardResult,
  ClientRankingResult,
  RankHistoryEntry,
  VipDisplayMode,
  SanitizedEntry,
  SanitizedLeaderboardResult,
  LeaderboardWidgetData,
  LeaderboardWidgetConfig,
} from "./types";

// Constants
export {
  METRIC_CONFIGS,
  CUSTOMER_DEFAULT_WEIGHTS,
  SUPPLIER_DEFAULT_WEIGHTS,
  ALL_DEFAULT_WEIGHTS,
  CACHE_TTL,
  CACHE_KEYS,
  MIN_CLIENTS_FOR_SIGNIFICANCE,
  DEFAULT_MIN_VIP_PARTICIPANTS,
  CUSTOMER_METRICS_BY_CATEGORY,
  SUPPLIER_METRICS_BY_CATEGORY,
  formatMetricValue,
  getRankSuffix,
  getMedalEmoji,
} from "./constants";

// Weight Normalizer
export {
  normalizeWeights,
  validateWeights,
  redistributeWeights,
} from "./weightNormalizer";

// Metric Calculator
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
  calculateYtdPurchaseVolume,
  calculateDeliveryReliability,
  calculateProductVariety,
  calculateResponseTime,
  calculateQualityScore,
  calculateReturnRate,
  calculateAllMetrics,
  calculateMetricsBatch,
  getClientType,
} from "./metricCalculator";

// Leaderboard Service
export {
  calculateMasterScore,
  getLeaderboard,
  getClientRanking,
  getEffectiveWeights,
  getDefaultWeights,
  saveUserWeights,
  resetUserWeights,
  invalidateCache,
  saveRankHistorySnapshot,
} from "./leaderboardService";

// Privacy Sanitizer
export {
  sanitizeForVipPortal,
  validateNoIdentifiers,
  sanitizeClientEntry,
  checkMinimumParticipants,
  generateGapSuggestion,
} from "./privacySanitizer";

// Suggestion Generator
export {
  getTier,
  generateSuggestions,
  generateVipPortalSuggestions,
  type Tier,
  type Suggestion,
} from "./suggestionGenerator";
