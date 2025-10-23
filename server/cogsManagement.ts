import { getDb } from "./db";
import { batches, cogsHistory, sales } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { updatePastSalesCogs, getAffectedSalesCount } from "./salesDb";

/**
 * Update batch COGS with optional retroactive application
 * @param batchId - The batch to update
 * @param newCogs - New COGS value
 * @param applyTo - "PAST_SALES" | "FUTURE_SALES" | "BOTH"
 * @param reason - Reason for the change
 * @param userId - User making the change
 */
export async function updateBatchCogs(
  batchId: number,
  newCogs: string,
  applyTo: "PAST_SALES" | "FUTURE_SALES" | "BOTH",
  reason: string,
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current batch to record old COGS
  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (!batch) {
    throw new Error("Batch not found");
  }

  const oldCogs = batch.unitCogs;

  // Update batch COGS (always update the batch itself)
  await db
    .update(batches)
    .set({ unitCogs: newCogs })
    .where(eq(batches.id, batchId));

  // Handle retroactive updates
  let affectedSalesCount = 0;
  if (applyTo === "PAST_SALES" || applyTo === "BOTH") {
    affectedSalesCount = await getAffectedSalesCount(batchId);
    await updatePastSalesCogs(batchId, newCogs);
  }

  // Record COGS change in history
  await db.insert(cogsHistory).values({
    batchId,
    oldCogs,
    newCogs,
    changeType: applyTo === "PAST_SALES" ? "retroactive" : applyTo === "FUTURE_SALES" ? "prospective" : "both",
    affectedSalesCount,
    reason,
    changedBy: userId,
  });

  return {
    success: true,
    oldCogs,
    newCogs,
    affectedSalesCount,
  };
}

/**
 * Get COGS history for a batch
 */
export async function getCogHistory(batchId: number) {
  const db = await getDb();
  if (!db) return [];

  const history = await db
    .select()
    .from(cogsHistory)
    .where(eq(cogsHistory.batchId, batchId))
    .orderBy(cogsHistory.createdAt);

  return history;
}

/**
 * Calculate profit impact of COGS change
 * Returns how much profit would change if COGS is updated retroactively
 */
export async function calculateCogsImpact(batchId: number, newCogs: string) {
  const db = await getDb();
  if (!db) return { affectedSales: 0, profitImpact: 0 };

  // Get all past sales for this batch
  const pastSales = await db
    .select()
    .from(sales)
    .where(eq(sales.batchId, batchId));

  // Get current batch COGS
  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (!batch) {
    return { affectedSales: 0, profitImpact: 0 };
  }

  const oldCogs = parseFloat(batch.unitCogs || "0");
  const newCogsNum = parseFloat(newCogs);
  const cogsDiff = newCogsNum - oldCogs;

  // Calculate total profit impact
  const profitImpact = pastSales.reduce((sum: number, sale) => {
    const qty = parseFloat(sale.quantity);
    return sum + (cogsDiff * qty);
  }, 0);

  return {
    affectedSales: pastSales.length,
    profitImpact: -profitImpact, // Negative because higher COGS = lower profit
    oldCogs: oldCogs.toFixed(2),
    newCogs: newCogsNum.toFixed(2),
  };
}

