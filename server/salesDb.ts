import { getDb } from "./db";
import { sales } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Create a new sale record
 * Automatically calculates profit based on COGS and sale price
 */
export async function createSale(data: {
  batchId: number;
  productId: number;
  quantity: string;
  cogsAtSale: string;
  salePrice: string;
  cogsOverride?: boolean;
  customerId?: number;
  saleDate: Date;
  notes?: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const saleRecord = await db.insert(sales).values({
    batchId: data.batchId,
    productId: data.productId,
    quantity: data.quantity,
    cogsAtSale: data.cogsAtSale,
    salePrice: data.salePrice,
    cogsOverride: data.cogsOverride ? 1 : 0,
    customerId: data.customerId,
    saleDate: data.saleDate,
    notes: data.notes,
    createdBy: data.createdBy,
  });

  return saleRecord;
}

/**
 * Get all sales for a specific batch
 * Returns sales history with profit calculations
 */
export async function getSalesByBatch(batchId: number) {
  const db = await getDb();
  if (!db) return [];

  const salesRecords = await db
    .select()
    .from(sales)
    .where(eq(sales.batchId, batchId))
    .orderBy(desc(sales.saleDate));

  // Calculate profit for each sale
  return salesRecords.map((sale: (typeof salesRecords)[0]) => {
    const qty = parseFloat(sale.quantity);
    const cogs = parseFloat(sale.cogsAtSale);
    const price = parseFloat(sale.salePrice);
    const profit = (price - cogs) * qty;

    return {
      ...sale,
      profit: profit.toFixed(2),
    };
  });
}

/**
 * Get total sales and profit for a batch
 */
export async function getBatchSalesStats(batchId: number) {
  const salesRecords = await getSalesByBatch(batchId);

  const totalQuantitySold = salesRecords.reduce(
    (sum: number, sale) => sum + parseFloat(sale.quantity),
    0
  );

  const totalRevenue = salesRecords.reduce(
    (sum: number, sale) =>
      sum + parseFloat(sale.salePrice) * parseFloat(sale.quantity),
    0
  );

  const totalProfit = salesRecords.reduce(
    (sum: number, sale) => sum + parseFloat(sale.profit),
    0
  );

  return {
    totalSales: salesRecords.length,
    totalQuantitySold,
    totalRevenue,
    totalProfit,
    avgSalePrice: totalQuantitySold > 0 ? totalRevenue / totalQuantitySold : 0,
  };
}

/**
 * Update COGS for past sales (retroactive)
 * Used when COGS is changed and applied retroactively
 */
export async function updatePastSalesCogs(batchId: number, newCogs: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(sales)
    .set({ cogsAtSale: newCogs })
    .where(eq(sales.batchId, batchId));

  return result;
}

/**
 * Get count of sales affected by COGS change
 */
export async function getAffectedSalesCount(batchId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const salesRecords = await db
    .select()
    .from(sales)
    .where(eq(sales.batchId, batchId));

  return salesRecords.length;
}
