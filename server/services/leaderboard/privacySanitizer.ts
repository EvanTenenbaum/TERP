/**
 * Privacy Sanitizer Service
 * Strips identifying information from VIP Portal leaderboard responses
 * 
 * CRITICAL: This service ensures VIP Portal clients NEVER see identifying
 * information about other clients. All responses must pass through this
 * sanitizer before being sent to VIP Portal endpoints.
 */

import type {
  LeaderboardResult,
  RankedClient,
  SanitizedLeaderboardResult,
  SanitizedEntry,
  VipDisplayMode,
  MetricType,
} from "./types";
import { generateLeaderboardRecommendations, type LeaderboardData } from "../../lib/leaderboardRecommendations";

/**
 * Fields that must NEVER appear in VIP Portal responses
 */
const FORBIDDEN_FIELDS = [
  "clientId",
  "client_id",
  "clientName",
  "client_name",
  "name",
  "teriCode",
  "teri_code",
  "email",
  "phone",
  "address",
  "contactName",
  "contact_name",
  "contactEmail",
  "contact_email",
  "contactPhone",
  "contact_phone",
];

/**
 * Sanitize leaderboard data for VIP Portal
 * 
 * @param leaderboard - Full internal leaderboard result
 * @param requestingClientId - The client ID making the request
 * @param displayMode - "blackbox" (ranks only) or "transparent" (ranks + values)
 * @param metricType - The metric being displayed
 * @returns Sanitized leaderboard safe for VIP Portal
 */
export function sanitizeForVipPortal(
  leaderboard: LeaderboardResult,
  requestingClientId: number,
  displayMode: VipDisplayMode,
  metricType: MetricType | "master_score" = "master_score"
): SanitizedLeaderboardResult {
  // Find the requesting client's entry
  const clientEntry = leaderboard.clients.find(c => c.clientId === requestingClientId);
  
  if (!clientEntry) {
    // Client not in leaderboard - return minimal response
    return {
      clientRank: 0,
      totalParticipants: leaderboard.totalCount,
      clientMetricValue: 0,
      entries: [],
      suggestions: ["Complete more transactions to appear on the leaderboard."],
      lastUpdated: new Date().toISOString(),
    };
  }

  // Get the client's metric value
  const clientMetricValue = metricType === "master_score"
    ? clientEntry.masterScore ?? 0
    : clientEntry.metrics[metricType]?.value ?? 0;

  // Build sanitized entries - STRIP ALL IDENTIFIERS
  const sanitizedEntries: SanitizedEntry[] = leaderboard.clients.map(client => {
    const entry: SanitizedEntry = {
      rank: client.rank,
      isCurrentClient: client.clientId === requestingClientId,
    };

    // Only include metric value in transparent mode
    if (displayMode === "transparent") {
      entry.metricValue = metricType === "master_score"
        ? client.masterScore ?? undefined
        : client.metrics[metricType]?.value ?? undefined;
    }

    // CRITICAL: Never include any identifying fields
    // The entry object is constructed fresh with only allowed fields

    return entry;
  });

  // Generate suggestions using the existing recommendation engine
  const leaderboardData: LeaderboardData = {
    leaderboardType: mapMetricToLeaderboardType(metricType),
    displayMode,
    clientRank: clientEntry.rank,
    totalClients: leaderboard.totalCount,
    clientMetricValue,
    entries: sanitizedEntries.map(e => ({
      rank: e.rank,
      clientId: e.isCurrentClient ? requestingClientId : 0, // Only include requesting client's ID internally
      metricValue: e.metricValue ?? 0,
      isCurrentClient: e.isCurrentClient,
    })),
  };

  const recommendations = generateLeaderboardRecommendations(leaderboardData, true);

  // Final validation - ensure no PII leaked
  const result: SanitizedLeaderboardResult = {
    clientRank: clientEntry.rank,
    totalParticipants: leaderboard.totalCount,
    clientMetricValue,
    entries: sanitizedEntries,
    suggestions: recommendations.suggestions,
    lastUpdated: new Date().toISOString(),
  };

  // Validate the response before returning
  if (!validateNoIdentifiers(result)) {
    console.error("CRITICAL: PII detected in sanitized response, returning empty");
    return {
      clientRank: clientEntry.rank,
      totalParticipants: leaderboard.totalCount,
      clientMetricValue,
      entries: [],
      suggestions: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  return result;
}

/**
 * Validate that a response contains no identifying information
 * 
 * @param response - Any object to validate
 * @returns true if safe, false if PII detected
 */
export function validateNoIdentifiers(response: unknown): boolean {
  const json = JSON.stringify(response);
  
  // Check for forbidden field patterns
  for (const field of FORBIDDEN_FIELDS) {
    // Check for JSON key patterns
    const keyPattern = new RegExp(`"${field}"\\s*:`, "i");
    if (keyPattern.test(json)) {
      console.error(`PII LEAK DETECTED: Found forbidden field "${field}" in response`);
      return false;
    }
  }

  // Check for TERI code patterns (e.g., "TERI-001")
  const teriPattern = /TERI-\d+/i;
  if (teriPattern.test(json)) {
    console.error("PII LEAK DETECTED: Found TERI code pattern in response");
    return false;
  }

  // Check for email patterns
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailPattern.test(json)) {
    console.error("PII LEAK DETECTED: Found email pattern in response");
    return false;
  }

  // Check for phone patterns (basic US format)
  const phonePattern = /\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/;
  if (phonePattern.test(json)) {
    console.error("PII LEAK DETECTED: Found phone pattern in response");
    return false;
  }

  return true;
}

/**
 * Map internal metric type to leaderboard recommendation type
 */
function mapMetricToLeaderboardType(
  metricType: MetricType | "master_score"
): "ytd_spend" | "payment_speed" | "order_frequency" | "credit_utilization" | "ontime_payment_rate" {
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

/**
 * Sanitize a single client entry for VIP Portal
 * Used when building custom responses
 */
export function sanitizeClientEntry(
  client: RankedClient,
  isCurrentClient: boolean,
  displayMode: VipDisplayMode,
  metricType: MetricType | "master_score"
): SanitizedEntry {
  const entry: SanitizedEntry = {
    rank: client.rank,
    isCurrentClient,
  };

  if (displayMode === "transparent") {
    entry.metricValue = metricType === "master_score"
      ? client.masterScore ?? undefined
      : client.metrics[metricType]?.value ?? undefined;
  }

  return entry;
}

/**
 * Check if minimum participants threshold is met
 */
export function checkMinimumParticipants(
  totalClients: number,
  minimumRequired: number
): { met: boolean; message?: string } {
  if (totalClients < minimumRequired) {
    return {
      met: false,
      message: `Leaderboard requires at least ${minimumRequired} participants. Currently ${totalClients} clients qualify.`,
    };
  }

  if (totalClients === minimumRequired) {
    return {
      met: true,
      message: "Note: Limited sample size. Rankings may change as more clients participate.",
    };
  }

  return { met: true };
}

/**
 * Generate gap-based suggestion without revealing competitor identity
 */
export function generateGapSuggestion(
  clientRank: number,
  clientValue: number,
  nextRankValue: number | undefined,
  metricType: MetricType | "master_score"
): string | null {
  if (clientRank === 1 || nextRankValue === undefined) {
    return null;
  }

  const gap = Math.abs(nextRankValue - clientValue);
  const nextRank = clientRank - 1;

  // Format gap based on metric type
  let gapFormatted: string;
  switch (metricType) {
    case "ytd_revenue":
    case "lifetime_value":
    case "average_order_value":
    case "master_score":
      gapFormatted = `$${gap.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      break;
    case "average_days_to_pay":
    case "recency":
      gapFormatted = `${Math.round(gap)} days`;
      break;
    case "order_frequency":
      gapFormatted = `${Math.ceil(gap)} orders`;
      break;
    default:
      gapFormatted = `${gap.toFixed(1)}%`;
  }

  return `You're ${gapFormatted} away from reaching ${getRankLabel(nextRank)}.`;
}

/**
 * Get rank label (1st, 2nd, 3rd, etc.)
 */
function getRankLabel(rank: number): string {
  const suffix = getRankSuffix(rank);
  return `${rank}${suffix} place`;
}

/**
 * Get rank suffix
 */
function getRankSuffix(rank: number): string {
  if (rank % 100 >= 11 && rank % 100 <= 13) return "th";
  switch (rank % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
