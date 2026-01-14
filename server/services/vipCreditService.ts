/**
 * Sprint 5 Track A - Task 5.A.3: MEET-042 - Credit Usage Display
 *
 * Service for calculating and displaying VIP credit usage:
 * - Current credit limit
 * - Used credit amount (outstanding invoices)
 * - Available credit
 * - Credit utilization percentage
 */

import { getDb } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  clients,
  clientTransactions,
  clientCreditLimits,
} from "../../drizzle/schema";
import {
  vipTiers,
  clientVipStatus,
} from "../../drizzle/schema-vip-portal";

export interface CreditUsageInfo {
  clientId: number;
  creditLimit: number;
  baseCreditLimit: number;
  tierMultiplier: number;
  usedCredit: number;
  availableCredit: number;
  utilizationPercentage: number;
  creditLimitSource: "CALCULATED" | "MANUAL";
  creditLimitUpdatedAt: Date | null;
  pendingOrders: number;
  pendingOrdersValue: number;
  overCreditLimit: boolean;
  tierName: string | null;
}

/**
 * Get credit usage information for a VIP client
 */
export async function getClientCreditUsage(clientId: number): Promise<CreditUsageInfo> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get client with credit info
  const [client] = await db
    .select({
      id: clients.id,
      creditLimit: clients.creditLimit,
      creditLimitSource: clients.creditLimitSource,
      creditLimitUpdatedAt: clients.creditLimitUpdatedAt,
      currentBalance: clients.currentBalance,
    })
    .from(clients)
    .where(eq(clients.id, clientId));

  if (!client) {
    throw new Error("Client not found");
  }

  // Get VIP tier info for multiplier
  const [vipStatus] = await db
    .select({
      tier: vipTiers,
    })
    .from(clientVipStatus)
    .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
    .where(eq(clientVipStatus.clientId, clientId));

  const tierMultiplier = parseFloat(String(vipStatus?.tier?.creditLimitMultiplier || "1.00"));
  const tierName = vipStatus?.tier?.displayName || null;

  // Get base credit limit from client_credit_limits
  const [creditLimitRecord] = await db
    .select({
      creditLimit: clientCreditLimits.creditLimit,
    })
    .from(clientCreditLimits)
    .where(eq(clientCreditLimits.clientId, clientId));

  const baseCreditLimit = parseFloat(String(creditLimitRecord?.creditLimit || "0"));

  // Calculate effective credit limit (base * tier multiplier)
  const effectiveCreditLimit = parseFloat(String(client.creditLimit || "0"));

  // Get used credit (sum of unpaid invoices)
  const unpaidInvoices = await db
    .select({
      totalUnpaid: sql<string>`COALESCE(SUM(${clientTransactions.amount}), 0)`,
    })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        eq(clientTransactions.transactionType, "INVOICE"),
        eq(clientTransactions.paymentStatus, "UNPAID")
      )
    );

  const usedCredit = parseFloat(String(unpaidInvoices[0]?.totalUnpaid || "0"));
  const availableCredit = Math.max(0, effectiveCreditLimit - usedCredit);
  const utilizationPercentage = effectiveCreditLimit > 0
    ? Math.round((usedCredit / effectiveCreditLimit) * 100)
    : 0;

  // Get pending orders (not yet invoiced)
  const pendingOrders = await db
    .select({
      count: sql<number>`COUNT(*)`,
      total: sql<string>`COALESCE(SUM(total), 0)`,
    })
    .from(sql`orders`)
    .where(
      and(
        sql`client_id = ${clientId}`,
        sql`status IN ('pending', 'processing')`
      )
    );

  const pendingOrdersCount = Number(pendingOrders[0]?.count || 0);
  const pendingOrdersValue = parseFloat(String(pendingOrders[0]?.total || "0"));

  return {
    clientId,
    creditLimit: effectiveCreditLimit,
    baseCreditLimit,
    tierMultiplier,
    usedCredit,
    availableCredit,
    utilizationPercentage,
    creditLimitSource: (client.creditLimitSource as "CALCULATED" | "MANUAL") || "CALCULATED",
    creditLimitUpdatedAt: client.creditLimitUpdatedAt,
    pendingOrders: pendingOrdersCount,
    pendingOrdersValue,
    overCreditLimit: usedCredit > effectiveCreditLimit,
    tierName,
  };
}

/**
 * Get credit utilization history (for trends)
 */
export async function getCreditUtilizationHistory(
  clientId: number,
  days: number = 30
): Promise<{ date: string; utilization: number; usedCredit: number }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get credit limit
  const [client] = await db
    .select({
      creditLimit: clients.creditLimit,
    })
    .from(clients)
    .where(eq(clients.id, clientId));

  const creditLimit = parseFloat(String(client?.creditLimit || "0"));
  if (creditLimit === 0) {
    return [];
  }

  // Generate history based on transaction dates
  const history: { date: string; utilization: number; usedCredit: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    // Get balance on that date
    const balance = await db
      .select({
        total: sql<string>`COALESCE(SUM(CASE
          WHEN payment_status = 'UNPAID' AND transaction_date <= ${dateStr} THEN amount
          ELSE 0 END), 0)`,
      })
      .from(clientTransactions)
      .where(
        and(
          eq(clientTransactions.clientId, clientId),
          eq(clientTransactions.transactionType, "INVOICE")
        )
      );

    const usedCredit = parseFloat(String(balance[0]?.total || "0"));
    const utilization = Math.round((usedCredit / creditLimit) * 100);

    history.push({
      date: dateStr,
      utilization,
      usedCredit,
    });
  }

  return history;
}

/**
 * Check if client can make a purchase of a given amount
 */
export async function checkCreditAvailability(
  clientId: number,
  purchaseAmount: number
): Promise<{ canPurchase: boolean; availableCredit: number; shortfall: number; message: string }> {
  const usage = await getClientCreditUsage(clientId);

  const canPurchase = usage.availableCredit >= purchaseAmount;
  const shortfall = canPurchase ? 0 : purchaseAmount - usage.availableCredit;

  let message: string;
  if (canPurchase) {
    message = `Purchase approved. $${purchaseAmount.toLocaleString()} is within your available credit of $${usage.availableCredit.toLocaleString()}.`;
  } else {
    message = `Insufficient credit. You need $${shortfall.toLocaleString()} more. Available: $${usage.availableCredit.toLocaleString()}.`;
  }

  return {
    canPurchase,
    availableCredit: usage.availableCredit,
    shortfall,
    message,
  };
}
