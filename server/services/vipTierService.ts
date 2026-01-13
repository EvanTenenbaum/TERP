/**
 * Sprint 5 Track A - Task 5.A.1: MEET-043 - VIP Status (Debt Cycling Tiers)
 *
 * VIP Tier Service for calculating and managing VIP tiers based on:
 * - Payment speed (how quickly clients pay their debts)
 * - Volume (total spend and order count)
 * - Loyalty (account age, consistency of orders)
 *
 * Tiers: Diamond, Platinum, Gold, Bronze
 */

import { getDb } from "../db";
import { eq, sql, desc, and } from "drizzle-orm";
import { clients, clientTransactions, orders } from "../../drizzle/schema";
import {
  vipTiers,
  clientVipStatus,
  vipTierHistory,
} from "../../drizzle/schema-vip-portal";

// Types
export interface VipTierMetrics {
  clientId: number;
  ytdSpend: number;
  ytdOrders: number;
  paymentSpeedScore: number; // 0-100, higher is faster payment
  volumeScore: number; // 0-100, based on spending
  loyaltyScore: number; // 0-100, based on account age and consistency
  overallScore: number; // Weighted combination
  avgDaysToPay: number;
  onTimePaymentRate: number;
  accountAgeDays: number;
  lifetimeSpend: number;
  lifetimeOrders: number;
}

export interface TierCalculationResult {
  recommendedTierId: number | null;
  recommendedTierName: string;
  metrics: VipTierMetrics;
  reason: string;
}

// Tier score thresholds
const TIER_THRESHOLDS = {
  DIAMOND: 90, // Top performers
  PLATINUM: 75, // High performers
  GOLD: 50, // Good performers
  BRONZE: 0, // Entry level
};

/**
 * Calculate payment speed score (0-100)
 * Based on average days to pay invoices
 */
async function calculatePaymentSpeedScore(
  clientId: number
): Promise<{ score: number; avgDays: number; onTimeRate: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all transactions with payment data
  const transactions = await db
    .select({
      transactionDate: clientTransactions.transactionDate,
      paymentDate: clientTransactions.paymentDate,
      paymentStatus: clientTransactions.paymentStatus,
      transactionType: clientTransactions.transactionType,
    })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        eq(clientTransactions.transactionType, "INVOICE")
      )
    );

  if (transactions.length === 0) {
    return { score: 50, avgDays: 0, onTimeRate: 100 }; // Default for new clients
  }

  let totalDays = 0;
  let paidCount = 0;
  let onTimeCount = 0;
  const NET_TERMS_DAYS = 30; // Standard net-30 terms

  for (const txn of transactions) {
    if (
      txn.paymentStatus === "PAID" &&
      txn.paymentDate &&
      txn.transactionDate
    ) {
      const daysToPay = Math.floor(
        (new Date(txn.paymentDate).getTime() -
          new Date(txn.transactionDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      totalDays += Math.max(0, daysToPay);
      paidCount++;
      if (daysToPay <= NET_TERMS_DAYS) {
        onTimeCount++;
      }
    }
  }

  const avgDays = paidCount > 0 ? totalDays / paidCount : 0;
  const onTimeRate = paidCount > 0 ? (onTimeCount / paidCount) * 100 : 100;

  // Score calculation: 100 for instant payment, decreasing for longer payment times
  // 0-7 days = 100-90
  // 8-14 days = 89-75
  // 15-30 days = 74-50
  // 31-45 days = 49-25
  // 46+ days = 24-0
  let score: number;
  if (avgDays <= 7) {
    score = 100 - (avgDays / 7) * 10;
  } else if (avgDays <= 14) {
    score = 90 - ((avgDays - 7) / 7) * 15;
  } else if (avgDays <= 30) {
    score = 75 - ((avgDays - 14) / 16) * 25;
  } else if (avgDays <= 45) {
    score = 50 - ((avgDays - 30) / 15) * 25;
  } else {
    score = Math.max(0, 25 - ((avgDays - 45) / 15) * 25);
  }

  return {
    score: Math.round(score),
    avgDays: Math.round(avgDays),
    onTimeRate: Math.round(onTimeRate),
  };
}

/**
 * Calculate volume score (0-100)
 * Based on YTD spend and order count
 */
async function calculateVolumeScore(
  clientId: number
): Promise<{
  score: number;
  ytdSpend: number;
  ytdOrders: number;
  lifetimeSpend: number;
  lifetimeOrders: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const ytdStart = new Date(new Date().getFullYear(), 0, 1);

  // Get YTD transactions
  const ytdTxns = await db
    .select({
      amount: clientTransactions.amount,
    })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        eq(clientTransactions.transactionType, "INVOICE"),
        sql`${clientTransactions.transactionDate} >= ${ytdStart.toISOString().split("T")[0]}`
      )
    );

  // Get lifetime stats from client record
  const [client] = await db
    .select({
      totalSpent: clients.totalSpent,
    })
    .from(clients)
    .where(eq(clients.id, clientId));

  const ytdSpend = ytdTxns.reduce(
    (sum, t) => sum + parseFloat(String(t.amount || "0")),
    0
  );
  const ytdOrders = ytdTxns.length;
  const lifetimeSpend = parseFloat(String(client?.totalSpent || "0"));

  // Get total order count
  const orderCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.clientId, clientId));
  const lifetimeOrders = Number(orderCount[0]?.count || 0);

  // Volume score calculation (based on YTD spend tiers)
  // $0-10k = 0-25
  // $10k-50k = 25-50
  // $50k-100k = 50-75
  // $100k-250k = 75-90
  // $250k+ = 90-100
  let score: number;
  if (ytdSpend < 10000) {
    score = (ytdSpend / 10000) * 25;
  } else if (ytdSpend < 50000) {
    score = 25 + ((ytdSpend - 10000) / 40000) * 25;
  } else if (ytdSpend < 100000) {
    score = 50 + ((ytdSpend - 50000) / 50000) * 25;
  } else if (ytdSpend < 250000) {
    score = 75 + ((ytdSpend - 100000) / 150000) * 15;
  } else {
    score = 90 + Math.min(10, ((ytdSpend - 250000) / 250000) * 10);
  }

  // Add bonus for high order frequency (up to 10 extra points)
  const orderBonus = Math.min(10, (ytdOrders / 50) * 10);
  score = Math.min(100, score + orderBonus);

  return {
    score: Math.round(score),
    ytdSpend,
    ytdOrders,
    lifetimeSpend,
    lifetimeOrders,
  };
}

/**
 * Calculate loyalty score (0-100)
 * Based on account age and order consistency
 */
async function calculateLoyaltyScore(
  clientId: number
): Promise<{ score: number; accountAgeDays: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [client] = await db
    .select({
      createdAt: clients.createdAt,
    })
    .from(clients)
    .where(eq(clients.id, clientId));

  if (!client?.createdAt) {
    return { score: 50, accountAgeDays: 0 };
  }

  const accountAgeDays = Math.floor(
    (Date.now() - new Date(client.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get order frequency over time
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const recentOrders = await db
    .select({
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.clientId, clientId),
        sql`${orders.createdAt} >= ${oneYearAgo.toISOString().split("T")[0]}`
      )
    )
    .orderBy(orders.createdAt);

  // Calculate consistency (spread of orders over months)
  const monthsWithOrders = new Set<string>();
  for (const order of recentOrders) {
    if (order.createdAt) {
      const monthKey = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`;
      monthsWithOrders.add(monthKey);
    }
  }

  const maxMonths = 12;
  const consistencyScore = (monthsWithOrders.size / maxMonths) * 50;

  // Account age score (0-50)
  // 0-90 days = 0-15
  // 90-180 days = 15-25
  // 180-365 days = 25-40
  // 365+ days = 40-50
  let ageScore: number;
  if (accountAgeDays < 90) {
    ageScore = (accountAgeDays / 90) * 15;
  } else if (accountAgeDays < 180) {
    ageScore = 15 + ((accountAgeDays - 90) / 90) * 10;
  } else if (accountAgeDays < 365) {
    ageScore = 25 + ((accountAgeDays - 180) / 185) * 15;
  } else {
    ageScore = 40 + Math.min(10, ((accountAgeDays - 365) / 365) * 10);
  }

  return {
    score: Math.round(ageScore + consistencyScore),
    accountAgeDays,
  };
}

/**
 * Calculate comprehensive VIP tier metrics for a client
 */
export async function calculateVipTierMetrics(
  clientId: number
): Promise<VipTierMetrics> {
  const [paymentMetrics, volumeMetrics, loyaltyMetrics] = await Promise.all([
    calculatePaymentSpeedScore(clientId),
    calculateVolumeScore(clientId),
    calculateLoyaltyScore(clientId),
  ]);

  // Weighted overall score:
  // Payment speed: 35% (most important for debt cycling)
  // Volume: 40% (revenue importance)
  // Loyalty: 25% (retention value)
  const overallScore = Math.round(
    paymentMetrics.score * 0.35 +
      volumeMetrics.score * 0.4 +
      loyaltyMetrics.score * 0.25
  );

  return {
    clientId,
    ytdSpend: volumeMetrics.ytdSpend,
    ytdOrders: volumeMetrics.ytdOrders,
    paymentSpeedScore: paymentMetrics.score,
    volumeScore: volumeMetrics.score,
    loyaltyScore: loyaltyMetrics.score,
    overallScore,
    avgDaysToPay: paymentMetrics.avgDays,
    onTimePaymentRate: paymentMetrics.onTimeRate,
    accountAgeDays: loyaltyMetrics.accountAgeDays,
    lifetimeSpend: volumeMetrics.lifetimeSpend,
    lifetimeOrders: volumeMetrics.lifetimeOrders,
  };
}

/**
 * Calculate recommended tier based on metrics
 */
export async function calculateRecommendedTier(
  clientId: number
): Promise<TierCalculationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const metrics = await calculateVipTierMetrics(clientId);

  // Get all active tiers sorted by level
  const tiers = await db
    .select()
    .from(vipTiers)
    .where(eq(vipTiers.isActive, true))
    .orderBy(desc(vipTiers.level));

  let recommendedTier = tiers[tiers.length - 1]; // Default to lowest tier
  let reason = "Default tier assignment";

  // Find appropriate tier based on overall score
  for (const tier of tiers) {
    const tierName = tier.name.toUpperCase();
    const threshold =
      TIER_THRESHOLDS[tierName as keyof typeof TIER_THRESHOLDS] ?? 0;

    if (metrics.overallScore >= threshold) {
      recommendedTier = tier;

      // Build reason
      const reasons: string[] = [];
      if (metrics.paymentSpeedScore >= 75) reasons.push("fast payment speed");
      else if (metrics.paymentSpeedScore < 40)
        reasons.push("slow payment speed");

      if (metrics.volumeScore >= 75) reasons.push("high volume");
      else if (metrics.volumeScore < 40) reasons.push("low volume");

      if (metrics.loyaltyScore >= 75) reasons.push("strong loyalty");

      reason = `Score ${metrics.overallScore}/100: ${reasons.join(", ") || "meets tier requirements"}`;
      break;
    }
  }

  return {
    recommendedTierId: recommendedTier?.id || null,
    recommendedTierName: recommendedTier?.displayName || "None",
    metrics,
    reason,
  };
}

/**
 * Update client's VIP status with calculated tier
 */
export async function updateClientVipStatus(
  clientId: number,
  changedByUserId?: number
): Promise<{
  success: boolean;
  previousTierId: number | null;
  newTierId: number | null;
  message: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if manual override is in place
  const [existingStatus] = await db
    .select()
    .from(clientVipStatus)
    .where(eq(clientVipStatus.clientId, clientId));

  if (existingStatus?.manualTierOverride) {
    return {
      success: false,
      previousTierId: existingStatus.currentTierId,
      newTierId: existingStatus.currentTierId,
      message:
        "Manual tier override is active. Remove override to enable automatic tier calculation.",
    };
  }

  const calculation = await calculateRecommendedTier(clientId);
  const previousTierId = existingStatus?.currentTierId || null;
  const newTierId = calculation.recommendedTierId;

  // Calculate next tier progress
  let nextTierProgress = 0;
  if (newTierId) {
    const [currentTier] = await db
      .select()
      .from(vipTiers)
      .where(eq(vipTiers.id, newTierId));

    const [nextTier] = await db
      .select()
      .from(vipTiers)
      .where(
        and(
          eq(vipTiers.isActive, true),
          sql`${vipTiers.level} > ${currentTier?.level || 0}`
        )
      )
      .orderBy(vipTiers.level)
      .limit(1);

    if (nextTier) {
      const currentThreshold =
        TIER_THRESHOLDS[
          currentTier?.name.toUpperCase() as keyof typeof TIER_THRESHOLDS
        ] ?? 0;
      const nextThreshold =
        TIER_THRESHOLDS[
          nextTier.name.toUpperCase() as keyof typeof TIER_THRESHOLDS
        ] ?? 100;
      nextTierProgress = Math.min(
        100,
        Math.max(
          0,
          ((calculation.metrics.overallScore - currentThreshold) /
            (nextThreshold - currentThreshold)) *
            100
        )
      );
    } else {
      nextTierProgress = 100; // Already at max tier
    }
  }

  // Upsert status
  if (existingStatus) {
    await db
      .update(clientVipStatus)
      .set({
        currentTierId: newTierId,
        ytdSpend: calculation.metrics.ytdSpend.toFixed(2),
        ytdOrders: calculation.metrics.ytdOrders,
        paymentOnTimeRate: calculation.metrics.onTimePaymentRate.toFixed(2),
        lifetimeSpend: calculation.metrics.lifetimeSpend.toFixed(2),
        lastTierChangeAt:
          previousTierId !== newTierId
            ? new Date()
            : existingStatus.lastTierChangeAt,
        lastCalculatedAt: new Date(),
        nextTierProgress: nextTierProgress.toFixed(2),
      })
      .where(eq(clientVipStatus.clientId, clientId));
  } else {
    await db.insert(clientVipStatus).values({
      clientId,
      currentTierId: newTierId,
      ytdSpend: calculation.metrics.ytdSpend.toFixed(2),
      ytdOrders: calculation.metrics.ytdOrders,
      paymentOnTimeRate: calculation.metrics.onTimePaymentRate.toFixed(2),
      lifetimeSpend: calculation.metrics.lifetimeSpend.toFixed(2),
      lastTierChangeAt: new Date(),
      lastCalculatedAt: new Date(),
      nextTierProgress: nextTierProgress.toFixed(2),
    });
  }

  // Record tier change if tier changed
  if (previousTierId !== newTierId) {
    await db.insert(vipTierHistory).values({
      clientId,
      previousTierId,
      newTierId,
      changeReason:
        previousTierId === null
          ? "AUTO_UPGRADE"
          : previousTierId && newTierId && newTierId > previousTierId
            ? "AUTO_UPGRADE"
            : "AUTO_DOWNGRADE",
      changeDetails: calculation.reason,
      changedBy: changedByUserId || null,
    });
  }

  return {
    success: true,
    previousTierId,
    newTierId,
    message:
      previousTierId !== newTierId
        ? `Tier updated from ${previousTierId ? "previous" : "none"} to ${calculation.recommendedTierName}`
        : "Tier unchanged",
  };
}

/**
 * Get comprehensive VIP status for a client (for portal display)
 */
export async function getClientVipStatusWithDetails(clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [status] = await db
    .select({
      status: clientVipStatus,
      tier: vipTiers,
    })
    .from(clientVipStatus)
    .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
    .where(eq(clientVipStatus.clientId, clientId));

  const metrics = await calculateVipTierMetrics(clientId);

  // Get next tier info
  let nextTier = null;
  if (status?.tier) {
    const [next] = await db
      .select()
      .from(vipTiers)
      .where(
        and(
          eq(vipTiers.isActive, true),
          sql`${vipTiers.level} > ${status.tier.level}`
        )
      )
      .orderBy(vipTiers.level)
      .limit(1);
    nextTier = next || null;
  }

  // Get default tier if no status exists
  let defaultTier = null;
  if (!status) {
    const [def] = await db
      .select()
      .from(vipTiers)
      .where(and(eq(vipTiers.isActive, true), eq(vipTiers.isDefault, true)));
    defaultTier = def || null;
  }

  return {
    clientId,
    currentTier: status?.tier || defaultTier,
    nextTier,
    metrics: {
      paymentSpeedScore: metrics.paymentSpeedScore,
      volumeScore: metrics.volumeScore,
      loyaltyScore: metrics.loyaltyScore,
      overallScore: metrics.overallScore,
      avgDaysToPay: metrics.avgDaysToPay,
      onTimePaymentRate: metrics.onTimePaymentRate,
      ytdSpend: metrics.ytdSpend,
      ytdOrders: metrics.ytdOrders,
      lifetimeSpend: metrics.lifetimeSpend,
      lifetimeOrders: metrics.lifetimeOrders,
      accountAgeDays: metrics.accountAgeDays,
    },
    progress: status?.status?.nextTierProgress
      ? parseFloat(String(status.status.nextTierProgress))
      : 0,
    isManualOverride: status?.status?.manualTierOverride || false,
    lastUpdated: status?.status?.lastCalculatedAt || null,
  };
}

/**
 * Batch recalculate VIP tiers for all clients
 * Used for scheduled tier updates
 */
export async function recalculateAllVipTiers(): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const vipClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(eq(clients.vipPortalEnabled, true), sql`${clients.deletedAt} IS NULL`)
    );

  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (const client of vipClients) {
    try {
      const result = await updateClientVipStatus(client.id);
      processed++;
      if (result.previousTierId !== result.newTierId) {
        updated++;
      }
    } catch (error) {
      console.error(
        `Failed to update VIP status for client ${client.id}:`,
        error
      );
      errors++;
    }
  }

  return { processed, updated, errors };
}
