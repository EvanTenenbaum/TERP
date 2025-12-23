/**
 * Credit Engine - Adaptive Credit Intelligence System
 * Calculates client credit limits based on real-time financial and behavioral data
 */

import { performance } from "perf_hooks";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  clients,
  clientTransactions,
  clientCreditLimits,
  creditSignalHistory,
  creditSystemSettings,
  creditAuditLog,
} from "../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface CreditSignals {
  revenueMomentum: number; // 0-100
  cashCollectionStrength: number; // 0-100
  profitabilityQuality: number; // 0-100
  debtAgingRisk: number; // 0-100
  repaymentVelocity: number; // 0-100
  tenureDepth: number; // 0-100
}

export interface CreditSignalTrends {
  revenueMomentumTrend: -1 | 0 | 1;
  cashCollectionTrend: -1 | 0 | 1;
  profitabilityTrend: -1 | 0 | 1;
  debtAgingTrend: -1 | 0 | 1;
  repaymentVelocityTrend: -1 | 0 | 1;
}

export interface CreditCalculationResult {
  creditLimit: number;
  currentExposure: number;
  utilizationPercent: number;
  creditHealthScore: number;
  baseCapacity: number;
  riskModifier: number;
  directionalFactor: number;
  mode: "LEARNING" | "ACTIVE";
  confidenceScore: number;
  dataReadiness: number;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
  signals: CreditSignals;
  signalTrends: CreditSignalTrends;
  explanation: string;
}

// ============================================================================
// SIGNAL CALCULATIONS
// ============================================================================

/**
 * Calculate Revenue Momentum Signal (0-100)
 * Growth rate of trailing 3-month vs 12-month revenue
 * Penalizes extreme volatility or sudden collapse
 */
async function calculateRevenueMomentum(clientId: number): Promise<{ score: number; trend: -1 | 0 | 1 }> {
  const db = await getDb();
  if (!db) return { score: 50, trend: 0 };

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];
  const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split("T")[0];

  // Get 3-month revenue
  const recent3Months = await db
    .select({ total: sql<number>`SUM(${clientTransactions.amount})` })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        sql`${clientTransactions.transactionDate} >= ${threeMonthsAgoStr}`,
        sql`${clientTransactions.transactionType} IN ('INVOICE', 'ORDER')`
      )
    );

  // Get 12-month revenue
  const recent12Months = await db
    .select({ total: sql<number>`SUM(${clientTransactions.amount})` })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        sql`${clientTransactions.transactionDate} >= ${twelveMonthsAgoStr}`,
        sql`${clientTransactions.transactionType} IN ('INVOICE', 'ORDER')`
      )
    );

  const revenue3M = Number(recent3Months[0]?.total || 0);
  const revenue12M = Number(recent12Months[0]?.total || 0);

  if (revenue12M === 0) return { score: 50, trend: 0 };

  const avgMonthly3M = revenue3M / 3;
  const avgMonthly12M = revenue12M / 12;
  
  // Growth rate
  const growthRate = ((avgMonthly3M - avgMonthly12M) / avgMonthly12M) * 100;
  
  // Normalize to 0-100 (positive growth = higher score)
  const score = 50 + Math.min(Math.max(growthRate, -50), 50);
  
  // Determine trend
  let trend: -1 | 0 | 1 = 0;
  if (growthRate > 5) trend = 1;
  else if (growthRate < -5) trend = -1;

  return { score: Math.round(score), trend };
}

/**
 * Calculate Cash Collection Strength Signal (0-100)
 * % of invoiced amount collected within terms
 * Rolling average of payment lag and its direction
 */
async function calculateCashCollectionStrength(clientId: number): Promise<{ score: number; trend: -1 | 0 | 1 }> {
  const db = await getDb();
  if (!db) return { score: 50, trend: 0 };

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

  // Get paid invoices
  const paidInvoices = await db
    .select()
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        eq(clientTransactions.paymentStatus, "PAID"),
        sql`${clientTransactions.transactionDate} >= ${sixMonthsAgoStr}`
      )
    );

  if (paidInvoices.length === 0) return { score: 50, trend: 0 };

  // Calculate average payment lag
  let totalLag = 0;
  let count = 0;

  for (const invoice of paidInvoices) {
    if (invoice.paymentDate && invoice.transactionDate) {
      const transDate = new Date(invoice.transactionDate.toString());
      const payDate = new Date(invoice.paymentDate.toString());
      const lagDays = Math.floor((payDate.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24));
      totalLag += lagDays;
      count++;
    }
  }

  const avgLag = count > 0 ? totalLag / count : 30;

  // Normalize: 0 days = 100, 30 days = 50, 60+ days = 0
  const score = Math.max(0, Math.min(100, 100 - (avgLag / 60) * 100));

  // Determine trend (compare recent vs older)
  const midpoint = Math.floor(paidInvoices.length / 2);
  const recentInvoices = paidInvoices.slice(0, midpoint);
  const olderInvoices = paidInvoices.slice(midpoint);

  let recentLag = 0;
  let olderLag = 0;

  recentInvoices.forEach((inv) => {
    if (inv.paymentDate && inv.transactionDate) {
      const transDate = new Date(inv.transactionDate.toString());
      const payDate = new Date(inv.paymentDate.toString());
      recentLag += Math.floor((payDate.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  });

  olderInvoices.forEach((inv) => {
    if (inv.paymentDate && inv.transactionDate) {
      const transDate = new Date(inv.transactionDate.toString());
      const payDate = new Date(inv.paymentDate.toString());
      olderLag += Math.floor((payDate.getTime() - transDate.getTime()) / (1000 * 60 * 60 * 24));
    }
  });

  const avgRecentLag = recentInvoices.length > 0 ? recentLag / recentInvoices.length : avgLag;
  const avgOlderLag = olderInvoices.length > 0 ? olderLag / olderInvoices.length : avgLag;

  let trend: -1 | 0 | 1 = 0;
  if (avgRecentLag < avgOlderLag - 3) trend = 1; // Improving
  else if (avgRecentLag > avgOlderLag + 3) trend = -1; // Worsening

  return { score: Math.round(score), trend };
}

/**
 * Calculate Profitability Quality Signal (0-100)
 * Rolling 3-month gross margin vs 12-month
 * Margin stability (std dev)
 */
async function calculateProfitabilityQuality(clientId: number): Promise<{ score: number; trend: -1 | 0 | 1 }> {
  const db = await getDb();
  if (!db) return { score: 50, trend: 0 };

  // Get client data
  const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client[0]) return { score: 50, trend: 0 };

  const avgMargin = Number(client[0].avgProfitMargin || 0);

  // Normalize margin to 0-100 (0% = 0, 50%+ = 100)
  const score = Math.min(100, (avgMargin / 50) * 100);

  // For trend, we'd need historical margin data - simplified here
  let trend: -1 | 0 | 1 = 0;
  if (avgMargin > 20) trend = 1;
  else if (avgMargin < 5) trend = -1;

  return { score: Math.round(score), trend };
}

/**
 * Calculate Debt Aging Risk Signal (0-100)
 * Weighted average days past due
 * Share of AR >60 days
 */
async function calculateDebtAgingRisk(clientId: number): Promise<{ score: number; trend: -1 | 0 | 1 }> {
  const db = await getDb();
  if (!db) return { score: 100, trend: 0 }; // No debt = perfect score

  // Get client data
  const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client[0]) return { score: 100, trend: 0 };

  const totalOwed = Number(client[0].totalOwed || 0);
  const oldestDebtDays = Number(client[0].oldestDebtDays || 0);

  if (totalOwed === 0) return { score: 100, trend: 0 };

  // Normalize: 0 days = 100, 30 days = 70, 60 days = 40, 90+ days = 0
  const score = Math.max(0, Math.min(100, 100 - (oldestDebtDays / 90) * 100));

  // Determine trend
  let trend: -1 | 0 | 1 = 0;
  if (oldestDebtDays < 30) trend = 1;
  else if (oldestDebtDays > 60) trend = -1;

  return { score: Math.round(score), trend };
}

/**
 * Calculate Repayment Velocity Signal (0-100)
 * change_in_AR_open / total_collections ratio
 * Positive slope (collections catching up) increases score
 */
async function calculateRepaymentVelocity(clientId: number): Promise<{ score: number; trend: -1 | 0 | 1 }> {
  const db = await getDb();
  if (!db) return { score: 50, trend: 0 };

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

  // Get payments received in last 3 months
  const payments = await db
    .select({ total: sql<number>`SUM(${clientTransactions.paymentAmount})` })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        eq(clientTransactions.paymentStatus, "PAID"),
        sql`${clientTransactions.paymentDate} >= ${threeMonthsAgoStr}`
      )
    );

  // Get new AR created in last 3 months
  const newAR = await db
    .select({ total: sql<number>`SUM(${clientTransactions.amount})` })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        sql`${clientTransactions.transactionType} = 'INVOICE'`,
        sql`${clientTransactions.transactionDate} >= ${threeMonthsAgoStr}`
      )
    );

  const totalPayments = Number(payments[0]?.total || 0);
  const totalNewAR = Number(newAR[0]?.total || 0);

  if (totalNewAR === 0) return { score: 100, trend: 0 };

  // Ratio of payments to new AR (>1 = catching up, <1 = falling behind)
  const ratio = totalPayments / totalNewAR;

  // Normalize to 0-100
  const score = Math.min(100, ratio * 100);

  // Determine trend
  let trend: -1 | 0 | 1 = 0;
  if (ratio > 1.1) trend = 1; // Catching up
  else if (ratio < 0.9) trend = -1; // Falling behind

  return { score: Math.round(score), trend };
}

/**
 * Calculate Tenure & Relationship Depth Signal (0-100)
 * Normalized months active × number of invoice cycles completed
 */
async function calculateTenureDepth(clientId: number): Promise<{ score: number; trend: -1 | 0 | 1 }> {
  const db = await getDb();
  if (!db) return { score: 0, trend: 0 };

  // Get client data
  const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client[0]) return { score: 0, trend: 0 };

  const createdAt = client[0].createdAt ? new Date(client[0].createdAt) : new Date();
  const now = new Date();
  const monthsActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));

  // Get invoice count
  const invoiceCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        sql`${clientTransactions.transactionType} = 'INVOICE'`
      )
    );

  const invoices = Number(invoiceCount[0]?.count || 0);

  // Normalize: 12+ months with 15+ invoices = 100
  const monthScore = Math.min(100, (monthsActive / 12) * 100);
  const invoiceScore = Math.min(100, (invoices / 15) * 100);

  const score = (monthScore + invoiceScore) / 2;

  // Tenure always trends stable or improving (never worsening)
  let trend: -1 | 0 | 1 = 0;
  if (monthsActive >= 12 && invoices >= 15) trend = 1;

  return { score: Math.round(score), trend: trend as -1 | 0 | 1 };
}

// ============================================================================
// CREDIT CALCULATION
// ============================================================================

/**
 * Calculate all signals for a client
 */
export async function calculateCreditSignals(clientId: number): Promise<{ signals: CreditSignals; trends: CreditSignalTrends }> {
  const [
    revenueMomentum,
    cashCollectionStrength,
    profitabilityQuality,
    debtAgingRisk,
    repaymentVelocity,
    tenureDepth,
  ] = await Promise.all([
    calculateRevenueMomentum(clientId),
    calculateCashCollectionStrength(clientId),
    calculateProfitabilityQuality(clientId),
    calculateDebtAgingRisk(clientId),
    calculateRepaymentVelocity(clientId),
    calculateTenureDepth(clientId),
  ]);

  return {
    signals: {
      revenueMomentum: revenueMomentum.score,
      cashCollectionStrength: cashCollectionStrength.score,
      profitabilityQuality: profitabilityQuality.score,
      debtAgingRisk: debtAgingRisk.score,
      repaymentVelocity: repaymentVelocity.score,
      tenureDepth: tenureDepth.score,
    },
    trends: {
      revenueMomentumTrend: revenueMomentum.trend,
      cashCollectionTrend: cashCollectionStrength.trend,
      profitabilityTrend: profitabilityQuality.trend,
      debtAgingTrend: debtAgingRisk.trend,
      repaymentVelocityTrend: repaymentVelocity.trend,
    },
  };
}

/**
 * Calculate credit limit for a client
 */
export async function calculateCreditLimit(
  clientId: number,
  customWeights?: {
    revenueMomentumWeight?: number;
    cashCollectionWeight?: number;
    profitabilityWeight?: number;
    debtAgingWeight?: number;
    repaymentVelocityWeight?: number;
    tenureWeight?: number;
  }
): Promise<CreditCalculationResult> {
  const startTime = performance.now();
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get client data
  const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client[0]) throw new Error("Client not found");

  // Get system settings
  let settings = await db.select().from(creditSystemSettings).limit(1);
  if (settings.length === 0) {
    // Create default settings
    await db.insert(creditSystemSettings).values({});
    settings = await db.select().from(creditSystemSettings).limit(1);
  }

  const config = settings[0];

  // Use custom weights if provided, otherwise use system defaults
  const weights = {
    revenueMomentum: customWeights?.revenueMomentumWeight ?? config.revenueMomentumWeight,
    cashCollection: customWeights?.cashCollectionWeight ?? config.cashCollectionWeight,
    profitability: customWeights?.profitabilityWeight ?? config.profitabilityWeight,
    debtAging: customWeights?.debtAgingWeight ?? config.debtAgingWeight,
    repaymentVelocity: customWeights?.repaymentVelocityWeight ?? config.repaymentVelocityWeight,
    tenure: customWeights?.tenureWeight ?? config.tenureWeight,
  };

  // Calculate signals
  const { signals, trends } = await calculateCreditSignals(clientId);

  // Calculate composite credit health score
  const creditHealthScore =
    (signals.revenueMomentum * weights.revenueMomentum +
      signals.cashCollectionStrength * weights.cashCollection +
      signals.profitabilityQuality * weights.profitability +
      signals.debtAgingRisk * weights.debtAging +
      signals.repaymentVelocity * weights.repaymentVelocity +
      signals.tenureDepth * weights.tenure) /
    100;

  // Calculate base capacity
  const totalSpent = Number(client[0].totalSpent || 0);
  const avgMargin = Number(client[0].avgProfitMargin || 0) / 100;
  const avgMonthlyRevenue = totalSpent / 12; // Simplified

  const baseCapacity = Math.min(
    2 * avgMonthlyRevenue,
    avgMonthlyRevenue * avgMargin * 2.5
  );

  // Calculate risk modifier
  const riskModifier = creditHealthScore / 100;

  // Calculate directional factor (trend-based)
  const avgTrend =
    (trends.revenueMomentumTrend +
      trends.cashCollectionTrend +
      trends.profitabilityTrend +
      trends.debtAgingTrend +
      trends.repaymentVelocityTrend) /
    5;

  const directionalSensitivity = Number(config.directionalSensitivity);
  const directionalFactor = 1 + avgTrend * directionalSensitivity;

  // Calculate credit limit
  let creditLimit = baseCapacity * riskModifier * directionalFactor;

  // Clamp to global limits
  const minLimit = Number(config.globalMinLimit);
  const maxLimit = Number(config.globalMaxLimit);
  creditLimit = Math.max(minLimit, Math.min(maxLimit, creditLimit));

  // Calculate current exposure
  const totalOwed = Number(client[0].totalOwed || 0);
  const currentExposure = totalOwed;

  // Calculate utilization (with division by zero check)
  const utilizationPercent = creditLimit > 0 && Math.abs(creditLimit) > 0.01 
    ? (currentExposure / creditLimit) * 100 
    : 0;

  // Determine mode and confidence
  const createdAt = client[0].createdAt ? new Date(client[0].createdAt) : new Date();
  const now = new Date();
  const monthsActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));

  const invoiceCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        sql`${clientTransactions.transactionType} = 'INVOICE'`
      )
    );

  const invoices = Number(invoiceCount[0]?.count || 0);

  const mode: "LEARNING" | "ACTIVE" =
    monthsActive >= config.learningModeThreshold && invoices >= config.minInvoicesForActivation
      ? "ACTIVE"
      : "LEARNING";

  // Calculate data readiness (0-100)
  const dataReadiness = Math.min(100, (invoices / config.minInvoicesForActivation) * 100);

  // Calculate confidence score
  const confidenceScore = mode === "ACTIVE" ? Math.min(100, dataReadiness) : dataReadiness * 0.7;

  // Determine overall trend
  let trend: "IMPROVING" | "STABLE" | "WORSENING" = "STABLE";
  if (avgTrend > 0.3) trend = "IMPROVING";
  else if (avgTrend < -0.3) trend = "WORSENING";

  // Generate explanation
  const explanation = generateExplanation(creditLimit, creditHealthScore, signals, weights, mode);

  // Performance logging
  const duration = performance.now() - startTime;
  if (duration > 500) {
    console.warn(`[CreditEngine] Slow calculation for client ${clientId}: ${duration.toFixed(0)}ms (target: <500ms)`);
  }

  return {
    creditLimit: Math.round(creditLimit * 100) / 100,
    currentExposure: Math.round(currentExposure * 100) / 100,
    utilizationPercent: Math.round(utilizationPercent * 100) / 100,
    creditHealthScore: Math.round(creditHealthScore * 100) / 100,
    baseCapacity: Math.round(baseCapacity * 100) / 100,
    riskModifier: Math.round(riskModifier * 10000) / 10000,
    directionalFactor: Math.round(directionalFactor * 10000) / 10000,
    mode,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    dataReadiness: Math.round(dataReadiness * 100) / 100,
    trend,
    signals,
    signalTrends: trends,
    explanation,
  };
}

/**
 * Generate plain English explanation of credit limit
 */
function generateExplanation(
  creditLimit: number,
  healthScore: number,
  signals: CreditSignals,
  _weights: Record<string, number>,
  mode: "LEARNING" | "ACTIVE"
): string {
  const parts: string[] = [];

  if (mode === "LEARNING") {
    parts.push("This client is in learning mode with limited transaction history.");
  }

  parts.push(`Credit health score: ${Math.round(healthScore)}/100.`);

  // Find strongest and weakest signals
  const signalEntries = Object.entries(signals);
  const strongest = signalEntries.reduce((a, b) => (a[1] > b[1] ? a : b));
  const weakest = signalEntries.reduce((a, b) => (a[1] < b[1] ? a : b));

  const signalNames: Record<string, string> = {
    revenueMomentum: "revenue growth",
    cashCollectionStrength: "payment speed",
    profitabilityQuality: "profit margins",
    debtAgingRisk: "debt management",
    repaymentVelocity: "repayment rate",
    tenureDepth: "relationship history",
  };

  parts.push(`Strongest: ${signalNames[strongest[0]]} (${Math.round(strongest[1])}/100).`);
  parts.push(`Needs improvement: ${signalNames[weakest[0]]} (${Math.round(weakest[1])}/100).`);

  return parts.join(" ");
}

/**
 * Save credit limit calculation to database
 */
export async function saveCreditLimit(clientId: number, result: CreditCalculationResult, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if record exists
  const existing = await db
    .select()
    .from(clientCreditLimits)
    .where(eq(clientCreditLimits.clientId, clientId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    const oldLimit = Number(existing[0].creditLimit);
    const newLimit = result.creditLimit;
    const changePercent = oldLimit > 0 ? ((newLimit - oldLimit) / oldLimit) * 100 : 0;

    await db
      .update(clientCreditLimits)
      .set({
        creditLimit: result.creditLimit.toString(),
        currentExposure: result.currentExposure.toString(),
        utilizationPercent: result.utilizationPercent.toString(),
        creditHealthScore: result.creditHealthScore.toString(),
        baseCapacity: result.baseCapacity.toString(),
        riskModifier: result.riskModifier.toString(),
        directionalFactor: result.directionalFactor.toString(),
        mode: result.mode,
        confidenceScore: result.confidenceScore.toString(),
        dataReadiness: result.dataReadiness.toString(),
        trend: result.trend,
      })
      .where(eq(clientCreditLimits.clientId, clientId));

    // Log significant changes (>10%)
    if (Math.abs(changePercent) > 10) {
      await db.insert(creditAuditLog).values({
        clientId,
        eventType: changePercent > 0 ? "LIMIT_INCREASED" : "LIMIT_DECREASED",
        oldValue: oldLimit.toString(),
        newValue: newLimit.toString(),
        changePercent: changePercent.toString(),
        reason: result.explanation,
        triggeredBy: userId,
      });
    }
  } else {
    // Insert new
    await db.insert(clientCreditLimits).values({
      clientId,
      creditLimit: result.creditLimit.toString(),
      currentExposure: result.currentExposure.toString(),
      utilizationPercent: result.utilizationPercent.toString(),
      creditHealthScore: result.creditHealthScore.toString(),
      baseCapacity: result.baseCapacity.toString(),
      riskModifier: result.riskModifier.toString(),
      directionalFactor: result.directionalFactor.toString(),
      mode: result.mode,
      confidenceScore: result.confidenceScore.toString(),
      dataReadiness: result.dataReadiness.toString(),
      trend: result.trend,
    });

    await db.insert(creditAuditLog).values({
      clientId,
      eventType: "LIMIT_CALCULATED",
      newValue: result.creditLimit.toString(),
      reason: "Initial credit limit calculation",
      triggeredBy: userId,
    });
  }

  // Save signal history
  await db.insert(creditSignalHistory).values({
    clientId,
    revenueMomentum: result.signals.revenueMomentum.toString(),
    cashCollectionStrength: result.signals.cashCollectionStrength.toString(),
    profitabilityQuality: result.signals.profitabilityQuality.toString(),
    debtAgingRisk: result.signals.debtAgingRisk.toString(),
    repaymentVelocity: result.signals.repaymentVelocity.toString(),
    tenureDepth: result.signals.tenureDepth.toString(),
    revenueMomentumTrend: result.signalTrends.revenueMomentumTrend,
    cashCollectionTrend: result.signalTrends.cashCollectionTrend,
    profitabilityTrend: result.signalTrends.profitabilityTrend,
    debtAgingTrend: result.signalTrends.debtAgingTrend,
    repaymentVelocityTrend: result.signalTrends.repaymentVelocityTrend,
  });

  // Sync credit limit to clients table for fast access
  await syncCreditToClient(clientId, result.creditLimit);
}

/**
 * Sync credit limit from client_credit_limits to clients table
 * This enables fast reads without joining to the credit limits table
 */
export async function syncCreditToClient(
  clientId: number,
  creditLimit: number,
  source: "CALCULATED" | "MANUAL" = "CALCULATED",
  overrideReason?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(clients)
    .set({
      creditLimit: creditLimit.toString(),
      creditLimitUpdatedAt: new Date(),
      creditLimitSource: source,
      creditLimitOverrideReason: source === "MANUAL" ? overrideReason : null,
    })
    .where(eq(clients.id, clientId));
}

/**
 * Set manual credit limit override
 * Bypasses the calculated limit and sets a user-defined value
 */
export async function setManualCreditLimit(
  clientId: number,
  newLimit: number,
  reason: string,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current limit for audit log
  const client = await db
    .select({ creditLimit: clients.creditLimit })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  const oldLimit = client[0] ? Number(client[0].creditLimit || 0) : 0;

  // Update clients table directly
  await syncCreditToClient(clientId, newLimit, "MANUAL", reason);

  // Also update client_credit_limits if it exists
  const existing = await db
    .select()
    .from(clientCreditLimits)
    .where(eq(clientCreditLimits.clientId, clientId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(clientCreditLimits)
      .set({
        creditLimit: newLimit.toString(),
      })
      .where(eq(clientCreditLimits.clientId, clientId));
  }

  // Log the manual override
  await db.insert(creditAuditLog).values({
    clientId,
    eventType: "MANUAL_OVERRIDE",
    oldValue: oldLimit.toString(),
    newValue: newLimit.toString(),
    changePercent: oldLimit > 0 ? (((newLimit - oldLimit) / oldLimit) * 100).toString() : "0",
    reason,
    triggeredBy: userId,
  });
}

/**
 * Recalculate credit for a client (convenience function)
 * Skips clients with manual overrides unless force=true
 */
export async function recalculateClientCredit(
  clientId: number,
  userId?: number,
  force: boolean = false
): Promise<CreditCalculationResult | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if client has manual override
  if (!force) {
    const client = await db
      .select({ creditLimitSource: clients.creditLimitSource })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (client[0]?.creditLimitSource === "MANUAL") {
      // Skip recalculation for manual overrides
      return null;
    }
  }

  const result = await calculateCreditLimit(clientId);
  await saveCreditLimit(clientId, result, userId);
  return result;
}

