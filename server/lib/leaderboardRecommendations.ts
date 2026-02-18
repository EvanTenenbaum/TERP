/**
 * Leaderboard Recommendations Engine
 * Generates actionable ranking improvement suggestions
 */

export type LeaderboardType =
  | "ytd_spend"
  | "payment_speed"
  | "order_frequency"
  | "credit_utilization"
  | "ontime_payment_rate";

export type DisplayMode = "blackbox" | "transparent";

export interface LeaderboardEntry {
  rank: number;
  clientId: number;
  metricValue: number;
  isCurrentClient: boolean;
}

export interface LeaderboardData {
  leaderboardType: LeaderboardType;
  displayMode: DisplayMode;
  clientRank: number;
  totalClients: number;
  clientMetricValue: number;
  entries: LeaderboardEntry[];
}

export interface LeaderboardRecommendations {
  suggestions: string[];
  tier: "top" | "middle" | "bottom";
  percentile: number;
}

/**
 * Phrase Library for Leaderboard Suggestions
 */
const PHRASES = {
  ytd_spend: {
    top: [
      "You're in the top quartile! Keep up the excellent performance.",
      "You're a top performer. Maintain your current spending pace to stay in the top tier.",
      "Outstanding performance! You're one of our highest-value clients.",
    ],
    middle: [
      "Increase your order frequency to move up the rankings.",
      "Consider consolidating your purchases with us to increase your YTD spend.",
      "You're performing well. A few more large orders could move you into the top tier.",
    ],
    bottom: [
      "Increase your order volume to improve your ranking.",
      "You have room to grow! Place more frequent orders to climb the leaderboard.",
      "Talk to your account manager about volume discounts that could increase your spend.",
    ],
  },

  payment_speed: {
    top: [
      "Excellent payment speed! You're one of our fastest-paying clients.",
      "Your quick payments are appreciated and help you maintain top ranking.",
      "Outstanding! You consistently pay faster than most clients.",
    ],
    middle: [
      "Set up automatic payments to improve your payment speed.",
      "Pay invoices a few days faster to move up the rankings.",
      "Consider enabling payment reminders to speed up your payment process.",
    ],
    bottom: [
      "Improve your payment speed to climb the rankings.",
      "Set up payment reminders to ensure you pay invoices promptly.",
      "Contact us if you need help setting up faster payment methods.",
    ],
  },

  order_frequency: {
    top: [
      "You're one of our most frequent buyers! Keep it up.",
      "Your consistent ordering helps you maintain top ranking.",
      "Excellent order frequency! You're a valued repeat customer.",
    ],
    middle: [
      "Place a few more orders this quarter to move up the rankings.",
      "Consider setting up recurring orders for products you buy regularly.",
      "Increase your order frequency to reach the top tier.",
    ],
    bottom: [
      "Increase your order frequency to improve your ranking.",
      "Top performers place orders more frequently. Consider ordering more often.",
      "Talk to your account manager about your regular needs to increase order frequency.",
    ],
  },

  credit_utilization: {
    top: [
      "Your credit utilization is in the optimal range. Well done!",
      "You're using your credit effectively.",
      "Perfect balance! You're maximizing your credit without overextending.",
    ],
    middle: [
      "Adjust your credit usage to reach the optimal 60-80% range.",
      "Fine-tune your credit utilization to improve your ranking.",
      "You're close to optimal. Small adjustments can improve your ranking.",
    ],
    bottom: [
      "Optimize your credit utilization to improve your ranking.",
      "Either increase usage or pay down balance to reach the 60-80% sweet spot.",
      "Contact us to discuss adjusting your credit limit to better match your needs.",
    ],
  },

  ontime_payment_rate: {
    top: [
      "Excellent on-time payment rate! You're a model client.",
      "Your consistent on-time payments are appreciated.",
      "Outstanding! You're one of our most reliable clients.",
    ],
    middle: [
      "Pay your next few invoices on time to boost your ranking.",
      "Set up payment reminders to ensure you never miss a due date.",
      "You're doing well. Improve consistency to reach the top tier.",
    ],
    bottom: [
      "Focus on paying invoices on time to dramatically improve your ranking.",
      "Top performers have 90%+ on-time rates. Work towards this goal.",
      "Contact us if you need help with payment terms or scheduling.",
    ],
  },
};

/**
 * Calculate percentile and tier
 */
function calculateTier(
  rank: number,
  totalClients: number
): {
  percentile: number;
  tier: "top" | "middle" | "bottom";
} {
  const percentile = (rank / totalClients) * 100;

  let tier: "top" | "middle" | "bottom";
  if (percentile <= 25) tier = "top";
  else if (percentile <= 75) tier = "middle";
  else tier = "bottom";

  return { percentile, tier };
}

/**
 * Generate gap-based suggestion (for transparent mode)
 */
function generateGapSuggestion(
  leaderboardType: LeaderboardType,
  clientMetricValue: number,
  nextRankMetricValue: number,
  clientRank: number
): string | null {
  const gap = Math.abs(nextRankMetricValue - clientMetricValue);
  const nextRank = clientRank - 1;

  switch (leaderboardType) {
    case "ytd_spend":
      return `You're $${gap.toLocaleString()} away from ${nextRank}${getRankSuffix(nextRank)} place. Place one more large order this month.`;

    case "payment_speed": {
      const days = Math.round(gap);
      return `Pay invoices ${days} day${days !== 1 ? "s" : ""} faster to move up to ${nextRank}${getRankSuffix(nextRank)} place.`;
    }

    case "order_frequency": {
      const orders = Math.ceil(gap);
      return `Place ${orders} more order${orders !== 1 ? "s" : ""} this quarter to reach ${nextRank}${getRankSuffix(nextRank)} place.`;
    }

    case "credit_utilization": {
      const utilizationGap = gap.toFixed(1);
      return `Adjust your credit utilization by ${utilizationGap}% to move up to ${nextRank}${getRankSuffix(nextRank)} place.`;
    }

    case "ontime_payment_rate": {
      const rateGap = gap.toFixed(1);
      return `Improve your on-time payment rate by ${rateGap}% to reach ${nextRank}${getRankSuffix(nextRank)} place.`;
    }

    default:
      return null;
  }
}

/**
 * Get rank suffix (1st, 2nd, 3rd, 4th, etc.)
 */
function getRankSuffix(rank: number): string {
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
 * Generate leaderboard improvement recommendations
 */
export function generateLeaderboardRecommendations(
  data: LeaderboardData,
  showSuggestions: boolean
): LeaderboardRecommendations {
  if (!showSuggestions) {
    return {
      suggestions: [],
      tier: "middle",
      percentile: 50,
    };
  }

  const { percentile, tier } = calculateTier(
    data.clientRank,
    data.totalClients
  );
  const suggestions: string[] = [];

  // Get base suggestions for this leaderboard type and tier
  const basePhrases = PHRASES[data.leaderboardType]?.[tier] || [];
  if (basePhrases.length > 0) {
    suggestions.push(basePhrases[0]);
  }

  // Add gap-based suggestion if in transparent mode and not in 1st place
  if (data.displayMode === "transparent" && data.clientRank > 1) {
    const nextRankEntry = data.entries.find(
      e => e.rank === data.clientRank - 1
    );
    if (nextRankEntry) {
      const gapSuggestion = generateGapSuggestion(
        data.leaderboardType,
        data.clientMetricValue,
        nextRankEntry.metricValue,
        data.clientRank
      );
      if (gapSuggestion) {
        suggestions.push(gapSuggestion);
      }
    }
  }

  // Add second base phrase if we have room
  if (suggestions.length < 3 && basePhrases.length > 1) {
    suggestions.push(basePhrases[1]);
  }

  // Limit to top 3 suggestions
  return {
    suggestions: suggestions.slice(0, 3),
    tier,
    percentile,
  };
}

/**
 * Format metric value for display
 */
export function formatMetricValue(
  leaderboardType: LeaderboardType,
  value: number
): string {
  switch (leaderboardType) {
    case "ytd_spend":
      return `$${value.toLocaleString()}`;

    case "payment_speed":
      return `${Math.round(value)} days`;

    case "order_frequency":
      return `${Math.round(value)} orders`;

    case "credit_utilization":
      return `${value.toFixed(1)}%`;

    case "ontime_payment_rate":
      return `${value.toFixed(1)}%`;

    default:
      return value.toString();
  }
}

/**
 * Get leaderboard type display name
 */
export function getLeaderboardTypeName(
  leaderboardType: LeaderboardType
): string {
  switch (leaderboardType) {
    case "ytd_spend":
      return "YTD Spend";
    case "payment_speed":
      return "Payment Speed";
    case "order_frequency":
      return "Order Frequency";
    case "credit_utilization":
      return "Credit Utilization";
    case "ontime_payment_rate":
      return "On-Time Payment Rate";
    default:
      return "Leaderboard";
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
