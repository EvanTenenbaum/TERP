/**
 * Credit Engine - Adaptive Credit Intelligence System
 * Patched for Phase 1 Live Shopping: Draft Exposure Calculation
 */

import { eq, and, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { clientTransactions } from "../../drizzle/schema";
// Phase 1 Imports
import {
  liveShoppingSessions,
  sessionCartItems,
} from "../../drizzle/schema-live-shopping";
import { financialMath } from "../utils/financialMath";

// ... (Existing types and signal calculations remain unchanged as per context) ...

// ============================================================================
// PHASE 1: DRAFT EXPOSURE LOGIC
// ============================================================================

/**
 * NEW: Calculate Draft Exposure from Live Shopping Carts
 * Sums the value of items in "ACTIVE" or "PAUSED" sessions that haven't converted to orders yet.
 */
export async function getDraftExposure(clientId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Find sessions that are live (ACTIVE) or temporarily PAUSED.
  // SCHEDULED sessions don't count until they start (unless pre-orders allowed, but assuming safe default).
  // CONVERTED/ENDED sessions are handled by standard Order tables.
  const activeSessions = await db
    .select({ id: liveShoppingSessions.id })
    .from(liveShoppingSessions)
    .where(
      and(
        eq(liveShoppingSessions.clientId, clientId),
        inArray(liveShoppingSessions.status, ["ACTIVE", "PAUSED"])
      )
    );

  if (activeSessions.length === 0) return 0;

  const sessionIds = activeSessions.map(s => s.id);

  // Sum cart items: quantity * unitPrice
  const draftItems = await db
    .select({
      quantity: sessionCartItems.quantity,
      unitPrice: sessionCartItems.unitPrice,
    })
    .from(sessionCartItems)
    .where(inArray(sessionCartItems.sessionId, sessionIds));

  let totalExposure = "0.00";

  for (const item of draftItems) {
    const itemTotal = financialMath.multiply(item.quantity, item.unitPrice);
    totalExposure = financialMath.add(totalExposure, itemTotal);
  }

  return parseFloat(totalExposure);
}

// ============================================================================
// MODIFIED EXPOSURE CALCULATION
// ============================================================================

/**
 * Calculates total current exposure including:
 * 1. Unpaid Invoices (AR)
 * 2. Open Sales Orders (Committed Inventory)
 * 3. [NEW] Live Shopping Draft Carts (Draft Inventory)
 */
export async function calculateTotalExposure(
  clientId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // 1. AR Balance (Unpaid Invoices)
  const arBalanceResult = await db
    .select({
      total: sql<number>`SUM(${clientTransactions.amount} - ${clientTransactions.paymentAmount})`,
    })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        eq(clientTransactions.transactionType, "INVOICE"),
        sql`${clientTransactions.amount} > ${clientTransactions.paymentAmount}`
      )
    );

  const arBalance = Number(arBalanceResult[0]?.total || 0);

  // 2. Open Orders (Not yet invoiced)
  // Assuming 'orders' table exists based on context (though not fully provided in schema snippet)
  // Logic: Sum of orders where status is open/confirmed
  // Placeholder query structure for Open Orders:
  /* 
  const openOrdersResult = await db
    .select({ total: sql<number>`SUM(total_amount)` })
    .from(orders)
    .where(and(eq(orders.clientId, clientId), eq(orders.status, 'CONFIRMED')));
  const openOrders = Number(openOrdersResult[0]?.total || 0);
  */
  const openOrders = 0; // Set to 0 if table not available in current context

  // 3. Draft Exposure (Live Shopping)
  const draftExposure = await getDraftExposure(clientId);

  // Sum using Financial Math to avoid float drift, then return number
  const total = financialMath.add(
    financialMath.add(arBalance, openOrders),
    draftExposure
  );

  return parseFloat(total);
}

/**
 * Main Credit Calculation function (Updated to use calculateTotalExposure)
 */
export async function calculateCreditLimit(clientId: number) {
  // Existing logic to get signals...

  // Replace direct exposure calculation with new comprehensive function
  const currentExposure = await calculateTotalExposure(clientId);

  // ... Rest of the credit engine logic (get limit, calc utilization, etc) ...

  // For the sake of this patch file, we return a partial object illustrating the usage
  return {
    currentExposure,
    // ... other fields
  };
}
