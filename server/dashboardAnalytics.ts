import { getDb } from "./db";
import { 
  orders,
  clients,
  batches,
  sales,
  clientTransactions,
  inventoryAlerts
} from "../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

/**
 * Get sales performance metrics
 */
export async function getSalesPerformance(
  startDate: Date,
  endDate: Date
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all sales orders in date range
    const salesOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.orderType, "SALE"),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      ));

    const totalRevenue = salesOrders.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);
    const totalCOGS = salesOrders.reduce((sum, order) => sum + parseFloat(order.totalCogs?.toString() || "0"), 0);
    const totalMargin = totalRevenue - totalCOGS;
    const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

    // Get previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime());

    const prevSalesOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.orderType, "SALE"),
        gte(orders.createdAt, prevStartDate),
        lte(orders.createdAt, prevEndDate)
      ));

    const prevRevenue = prevSalesOrders.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      totalRevenue: totalRevenue.toFixed(2),
      totalCOGS: totalCOGS.toFixed(2),
      totalMargin: totalMargin.toFixed(2),
      avgMarginPercent: avgMarginPercent.toFixed(2),
      orderCount: salesOrders.length,
      averageOrderValue: salesOrders.length > 0 ? (totalRevenue / salesOrders.length).toFixed(2) : "0.00",
      revenueGrowth: revenueGrowth.toFixed(2),
      previousPeriodRevenue: prevRevenue.toFixed(2)
    };
  } catch (error: any) {
    throw new Error(`Failed to get sales performance: ${error.message}`);
  }
}

/**
 * Get AR aging report for dashboard widget
 */
export async function getARAgingReport(): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all unpaid/partial client transactions
    const transactions = await db.select()
      .from(clientTransactions)
      .where(sql`${clientTransactions.paymentStatus} IN ('PENDING', 'OVERDUE', 'PARTIAL')`);

    const today = new Date();
    const aging = {
      current: 0, // 0-30 days
      days30: 0,  // 31-60 days
      days60: 0,  // 61-90 days
      days90: 0,  // 90+ days
      total: 0
    };

    for (const transaction of transactions) {
      const amount = parseFloat(transaction.amount.toString());
      const paymentAmount = parseFloat(transaction.paymentAmount?.toString() || "0");
      const balance = amount - paymentAmount;
      
      if (balance <= 0) continue;
      
      const daysOutstanding = Math.floor((today.getTime() - new Date(transaction.transactionDate).getTime()) / (1000 * 60 * 60 * 24));

      aging.total += balance;

      if (daysOutstanding <= 30) {
        aging.current += balance;
      } else if (daysOutstanding <= 60) {
        aging.days30 += balance;
      } else if (daysOutstanding <= 90) {
        aging.days60 += balance;
      } else {
        aging.days90 += balance;
      }
    }

    return {
      current: aging.current.toFixed(2),
      days30: aging.days30.toFixed(2),
      days60: aging.days60.toFixed(2),
      days90: aging.days90.toFixed(2),
      total: aging.total.toFixed(2),
      transactionCount: transactions.length
    };
  } catch (error: any) {
    throw new Error(`Failed to get AR aging report: ${error.message}`);
  }
}

/**
 * Get inventory valuation
 */
export async function getInventoryValuation(): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const activeBatches = await db.select()
      .from(batches)
      .where(sql`${batches.status} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE', 'ON_HOLD')`);

    let totalValue = 0;
    let totalUnits = 0;

    for (const batch of activeBatches) {
      const onHandQty = parseFloat(batch.onHandQty);
      const unitCogs = batch.cogsMode === "FIXED" 
        ? parseFloat(batch.unitCogs || "0")
        : (parseFloat(batch.unitCogsMin || "0") + parseFloat(batch.unitCogsMax || "0")) / 2;

      totalValue += onHandQty * unitCogs;
      totalUnits += onHandQty;
    }

    return {
      totalValue: totalValue.toFixed(2),
      totalUnits: totalUnits.toFixed(2),
      batchCount: activeBatches.length,
      averageValuePerUnit: totalUnits > 0 ? (totalValue / totalUnits).toFixed(2) : "0.00"
    };
  } catch (error: any) {
    throw new Error(`Failed to get inventory valuation: ${error.message}`);
  }
}

/**
 * Get top performing products
 */
export async function getTopPerformingProducts(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const salesData = await db.select()
      .from(sales)
      .where(and(
        gte(sales.saleDate, startDate),
        lte(sales.saleDate, endDate)
      ));

    // Aggregate by product
    const productStats: Record<number, {
      productId: number,
      revenue: number,
      cogs: number,
      margin: number,
      quantity: number,
      salesCount: number
    }> = {};

    for (const sale of salesData) {
      const productId = sale.productId;
      const revenue = parseFloat(sale.salePrice) * parseFloat(sale.quantity);
      const cogs = parseFloat(sale.cogsAtSale) * parseFloat(sale.quantity);
      const margin = revenue - cogs;
      const quantity = parseFloat(sale.quantity);

      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          revenue: 0,
          cogs: 0,
          margin: 0,
          quantity: 0,
          salesCount: 0
        };
      }

      productStats[productId].revenue += revenue;
      productStats[productId].cogs += cogs;
      productStats[productId].margin += margin;
      productStats[productId].quantity += quantity;
      productStats[productId].salesCount++;
    }

    // Convert to array and sort by revenue
    const topProducts = Object.values(productStats)
      .map(p => ({
        productId: p.productId,
        revenue: p.revenue.toFixed(2),
        cogs: p.cogs.toFixed(2),
        margin: p.margin.toFixed(2),
        marginPercent: p.revenue > 0 ? ((p.margin / p.revenue) * 100).toFixed(2) : "0.00",
        quantity: p.quantity.toFixed(2),
        salesCount: p.salesCount,
        averagePrice: p.quantity > 0 ? (p.revenue / p.quantity).toFixed(2) : "0.00"
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
      .slice(0, limit);

    return topProducts;
  } catch (error: any) {
    throw new Error(`Failed to get top performing products: ${error.message}`);
  }
}

/**
 * Get top clients by revenue
 */
export async function getTopClients(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const salesOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.orderType, "SALE"),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      ));

    // Aggregate by client
    const clientStats: Record<number, {
      clientId: number,
      revenue: number,
      orderCount: number,
      margin: number
    }> = {};

    for (const order of salesOrders) {
      const clientId = order.clientId;
      const revenue = parseFloat(order.total.toString());
      const cogs = parseFloat(order.totalCogs?.toString() || "0");
      const margin = revenue - cogs;

      if (!clientStats[clientId]) {
        clientStats[clientId] = {
          clientId,
          revenue: 0,
          orderCount: 0,
          margin: 0
        };
      }

      clientStats[clientId].revenue += revenue;
      clientStats[clientId].orderCount++;
      clientStats[clientId].margin += margin;
    }

    // Convert to array and sort by revenue
    const topClients = Object.values(clientStats)
      .map(c => ({
        clientId: c.clientId,
        revenue: c.revenue.toFixed(2),
        orderCount: c.orderCount,
        margin: c.margin.toFixed(2),
        marginPercent: c.revenue > 0 ? ((c.margin / c.revenue) * 100).toFixed(2) : "0.00",
        averageOrderValue: c.orderCount > 0 ? (c.revenue / c.orderCount).toFixed(2) : "0.00"
      }))
      .sort((a, b) => parseFloat(b.revenue) - parseFloat(a.revenue))
      .slice(0, limit);

    return topClients;
  } catch (error: any) {
    throw new Error(`Failed to get top clients: ${error.message}`);
  }
}

/**
 * Get profitability metrics
 */
export async function getProfitabilityMetrics(
  startDate: Date,
  endDate: Date
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const salesPerformance = await getSalesPerformance(startDate, endDate);
    const topProducts = await getTopPerformingProducts(startDate, endDate, 5);
    const topClients = await getTopClients(startDate, endDate, 5);

    return {
      summary: salesPerformance,
      topProducts,
      topClients
    };
  } catch (error: any) {
    throw new Error(`Failed to get profitability metrics: ${error.message}`);
  }
}

/**
 * Get comprehensive dashboard data
 */
export async function getDashboardData(
  startDate: Date,
  endDate: Date
): Promise<any> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const [
      salesPerformance,
      arAging,
      inventoryVal,
      topProducts,
      topClients
    ] = await Promise.all([
      getSalesPerformance(startDate, endDate),
      getARAgingReport(),
      getInventoryValuation(),
      getTopPerformingProducts(startDate, endDate, 10),
      getTopClients(startDate, endDate, 10)
    ]);

    return {
      salesPerformance,
      arAging,
      inventoryValuation: inventoryVal,
      topProducts,
      topClients,
      generatedAt: new Date().toISOString()
    };
  } catch (error: any) {
    throw new Error(`Failed to get dashboard data: ${error.message}`);
  }
}

/**
 * Export dashboard data to CSV format
 */
export async function exportDashboardData(
  startDate: Date,
  endDate: Date,
  format: "csv" | "json" = "csv"
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const data = await getDashboardData(startDate, endDate);

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    let csv = "Dashboard Export\n";
    csv += `Generated: ${data.generatedAt}\n`;
    csv += `Period: ${startDate.toISOString()} to ${endDate.toISOString()}\n\n`;

    csv += "Sales Performance\n";
    csv += "Metric,Value\n";
    csv += `Total Revenue,${data.salesPerformance.totalRevenue}\n`;
    csv += `Total COGS,${data.salesPerformance.totalCOGS}\n`;
    csv += `Total Margin,${data.salesPerformance.totalMargin}\n`;
    csv += `Avg Margin %,${data.salesPerformance.avgMarginPercent}\n`;
    csv += `Order Count,${data.salesPerformance.orderCount}\n`;
    csv += `Avg Order Value,${data.salesPerformance.averageOrderValue}\n`;
    csv += `Revenue Growth %,${data.salesPerformance.revenueGrowth}\n\n`;

    csv += "AR Aging\n";
    csv += "Period,Amount\n";
    csv += `Current (0-30 days),${data.arAging.current}\n`;
    csv += `31-60 days,${data.arAging.days30}\n`;
    csv += `61-90 days,${data.arAging.days60}\n`;
    csv += `90+ days,${data.arAging.days90}\n`;
    csv += `Total,${data.arAging.total}\n\n`;

    csv += "Top Products\n";
    csv += "Product ID,Revenue,COGS,Margin,Margin %,Quantity,Sales Count\n";
    for (const product of data.topProducts) {
      csv += `${product.productId},${product.revenue},${product.cogs},${product.margin},${product.marginPercent},${product.quantity},${product.salesCount}\n`;
    }
    csv += "\n";

    csv += "Top Clients\n";
    csv += "Client ID,Revenue,Order Count,Margin,Margin %,Avg Order Value\n";
    for (const client of data.topClients) {
      csv += `${client.clientId},${client.revenue},${client.orderCount},${client.margin},${client.marginPercent},${client.averageOrderValue}\n`;
    }

    return csv;
  } catch (error: any) {
    throw new Error(`Failed to export dashboard data: ${error.message}`);
  }
}

