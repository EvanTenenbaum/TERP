/**
 * Suggestion Generator Service
 * Generates personalized improvement suggestions based on leaderboard position
 */

import type { MetricType, RankedClient, ClientType } from "./types";
import { METRIC_CONFIGS, formatMetricValue, getRankSuffix } from "./constants";
import { 
  generateLeaderboardRecommendations, 
  type LeaderboardData,
  type LeaderboardType 
} from "../../lib/leaderboardRecommendations";

/**
 * Tier classification based on percentile
 */
export type Tier = "top" | "middle" | "bottom";

/**
 * Suggestion with context
 */
export interface Suggestion {
  text: string;
  priority: "high" | "medium" | "low";
  metricType?: MetricType;
  actionable: boolean;
}

/**
 * Get tier based on percentile
 */
export function getTier(percentile: number): Tier {
  if (percentile <= 25) return "top";
  if (percentile <= 75) return "middle";
  return "bottom";
}

/**
 * Generate suggestions for a client based on their leaderboard position
 */
export function generateSuggestions(
  client: RankedClient,
  allClients: RankedClient[],
  clientType: ClientType,
  displayMode: "blackbox" | "transparent" = "transparent"
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const tier = getTier(client.percentile);

  // Add tier-based general suggestions
  suggestions.push(...getTierSuggestions(tier, clientType));

  // Add metric-specific suggestions if in transparent mode
  if (displayMode === "transparent") {
    suggestions.push(...getMetricSuggestions(client, allClients, clientType));
  }

  // Add gap-based suggestions
  const gapSuggestion = getGapSuggestion(client, allClients);
  if (gapSuggestion) {
    suggestions.push(gapSuggestion);
  }

  // Deduplicate and limit to top 5
  const uniqueSuggestions = deduplicateSuggestions(suggestions);
  return uniqueSuggestions.slice(0, 5);
}

/**
 * Get tier-based general suggestions
 */
function getTierSuggestions(tier: Tier, clientType: ClientType): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (clientType === "CUSTOMER" || clientType === "DUAL" || clientType === "ALL") {
    switch (tier) {
      case "top":
        suggestions.push({
          text: "You're in the top quartile! Keep up the excellent performance.",
          priority: "low",
          actionable: false,
        });
        suggestions.push({
          text: "Consider exploring our premium product offerings to maintain your top status.",
          priority: "medium",
          actionable: true,
        });
        break;
      case "middle":
        suggestions.push({
          text: "You're performing well. A few improvements could move you into the top tier.",
          priority: "medium",
          actionable: true,
        });
        suggestions.push({
          text: "Increasing your order frequency could significantly boost your ranking.",
          priority: "medium",
          actionable: true,
        });
        break;
      case "bottom":
        suggestions.push({
          text: "There's room for growth! Let's work together to improve your standing.",
          priority: "high",
          actionable: true,
        });
        suggestions.push({
          text: "Contact your account manager to discuss volume discounts and payment terms.",
          priority: "high",
          actionable: true,
        });
        break;
    }
  }

  if (clientType === "SUPPLIER") {
    switch (tier) {
      case "top":
        suggestions.push({
          text: "You're one of our top suppliers! Your reliability is appreciated.",
          priority: "low",
          actionable: false,
        });
        break;
      case "middle":
        suggestions.push({
          text: "Improving delivery times could help you reach top supplier status.",
          priority: "medium",
          actionable: true,
        });
        break;
      case "bottom":
        suggestions.push({
          text: "Let's discuss how we can improve our partnership.",
          priority: "high",
          actionable: true,
        });
        break;
    }
  }

  return suggestions;
}

/**
 * Get metric-specific suggestions based on weak areas
 */
function getMetricSuggestions(
  client: RankedClient,
  allClients: RankedClient[],
  clientType: ClientType
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const weakMetrics = findWeakMetrics(client, allClients);

  for (const { metricType, percentile } of weakMetrics.slice(0, 2)) {
    const config = METRIC_CONFIGS[metricType];
    if (!config) continue;

    const suggestion = getMetricImprovementSuggestion(metricType, percentile);
    if (suggestion) {
      suggestions.push({
        text: suggestion,
        priority: percentile > 75 ? "high" : "medium",
        metricType,
        actionable: true,
      });
    }
  }

  return suggestions;
}

/**
 * Find metrics where client is underperforming
 */
function findWeakMetrics(
  client: RankedClient,
  allClients: RankedClient[]
): { metricType: MetricType; percentile: number }[] {
  const weakMetrics: { metricType: MetricType; percentile: number }[] = [];

  for (const [metricType, result] of Object.entries(client.metrics)) {
    if (!result?.value || !result.isSignificant) continue;

    const config = METRIC_CONFIGS[metricType as MetricType];
    if (!config) continue;

    // Calculate percentile for this metric
    const allValues = allClients
      .map(c => c.metrics[metricType as MetricType]?.value)
      .filter((v): v is number => v !== null && v !== undefined)
      .sort((a, b) => {
        // Sort based on metric direction
        if (config.direction === "lower_better") {
          return a - b; // Lower is better, so ascending
        }
        return b - a; // Higher is better, so descending
      });

    const rank = allValues.indexOf(result.value) + 1;
    const percentile = (rank / allValues.length) * 100;

    // If in bottom half for this metric, it's a weak area
    if (percentile > 50) {
      weakMetrics.push({ metricType: metricType as MetricType, percentile });
    }
  }

  // Sort by percentile (worst first)
  return weakMetrics.sort((a, b) => b.percentile - a.percentile);
}

/**
 * Get improvement suggestion for a specific metric
 */
function getMetricImprovementSuggestion(
  metricType: MetricType,
  percentile: number
): string | null {
  const severity = percentile > 75 ? "significantly" : "slightly";

  switch (metricType) {
    case "ytd_revenue":
    case "lifetime_value":
      return `Your spending is ${severity} below average. Consider consolidating purchases with us for better pricing.`;
    
    case "average_order_value":
      return `Your average order size is ${severity} below average. Larger orders may qualify for volume discounts.`;
    
    case "order_frequency":
      return `You order less frequently than most clients. Setting up recurring orders could improve your ranking.`;
    
    case "recency":
      return `It's been a while since your last order. Check out our latest inventory!`;
    
    case "on_time_payment_rate":
      return `Your on-time payment rate could be improved. Consider setting up automatic payments.`;
    
    case "average_days_to_pay":
      return `Paying invoices faster would improve your reliability score.`;
    
    case "credit_utilization":
      return `Your credit utilization is outside the optimal range. Contact us to discuss adjusting your credit limit.`;
    
    case "yoy_growth":
      return `Your year-over-year growth is below average. Let's discuss how to grow your business together.`;
    
    case "delivery_reliability":
      return `Improving delivery times would boost your supplier ranking.`;
    
    case "product_variety":
      return `Expanding your product offerings could improve your supplier score.`;
    
    default:
      return null;
  }
}

/**
 * Get gap-based suggestion for moving up in rank
 */
function getGapSuggestion(
  client: RankedClient,
  allClients: RankedClient[]
): Suggestion | null {
  if (client.rank === 1) return null;

  const nextClient = allClients.find(c => c.rank === client.rank - 1);
  if (!nextClient || !client.masterScore || !nextClient.masterScore) return null;

  const scoreDiff = nextClient.masterScore - client.masterScore;
  const nextRank = client.rank - 1;

  return {
    text: `You're ${scoreDiff.toFixed(1)} points away from ${nextRank}${getRankSuffix(nextRank)} place.`,
    priority: scoreDiff < 5 ? "high" : "medium",
    actionable: true,
  };
}

/**
 * Deduplicate suggestions by text similarity
 */
function deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = s.text.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Generate suggestions using the existing recommendation engine
 * (for VIP Portal compatibility)
 */
export function generateVipPortalSuggestions(
  clientRank: number,
  totalClients: number,
  clientMetricValue: number,
  metricType: MetricType | "master_score",
  displayMode: "blackbox" | "transparent",
  entries: { rank: number; metricValue: number; isCurrentClient: boolean }[]
): string[] {
  // Map metric type to leaderboard type
  const leaderboardType = mapMetricToLeaderboardType(metricType);

  const leaderboardData: LeaderboardData = {
    leaderboardType,
    displayMode,
    clientRank,
    totalClients,
    clientMetricValue,
    entries: entries.map(e => ({
      rank: e.rank,
      clientId: e.isCurrentClient ? 1 : 0, // Dummy ID, not used
      metricValue: e.metricValue,
      isCurrentClient: e.isCurrentClient,
    })),
  };

  const recommendations = generateLeaderboardRecommendations(leaderboardData, true);
  return recommendations.suggestions;
}

/**
 * Map internal metric type to leaderboard recommendation type
 */
function mapMetricToLeaderboardType(
  metricType: MetricType | "master_score"
): LeaderboardType {
  switch (metricType) {
    case "ytd_revenue":
    case "lifetime_value":
    case "average_order_value":
    case "master_score":
      return "ytd_spend";
    case "average_days_to_pay":
      return "payment_speed";
    case "order_frequency":
    case "recency":
      return "order_frequency";
    case "credit_utilization":
      return "credit_utilization";
    case "on_time_payment_rate":
      return "ontime_payment_rate";
    default:
      return "ytd_spend";
  }
}
