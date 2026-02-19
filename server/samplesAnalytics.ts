import { getDb } from "./db";
import { sampleRequests, orders } from "../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

interface DistributionByClient {
  clientId: number;
  quantity: string;
  cost: string;
  requestCount: number;
}

interface DistributionByProduct {
  productId: number;
  quantity: string;
  averageCostPerUnit: string;
  requestCount: number;
}

interface SampleDistributionReport {
  summary: {
    totalRequests: number;
    totalSamplesDistributed: string;
    totalCost: string;
    averageSampleSize: string;
    averageCostPerRequest: string;
  };
  byClient: DistributionByClient[];
  byProduct: DistributionByProduct[];
}

interface SampleConversionReport {
  totalSamplesGiven: number;
  conversionsCount: number;
  conversionRate: string;
  totalSampleCost: string;
  revenueFromConversions: string;
  roi: string;
  averageRevenuePerConversion: string;
}

interface SampleEffectivenessItem {
  productId: number;
  samplesGiven: number;
  conversions: number;
  conversionRate: string;
  totalCost: string;
  totalRevenue: string;
  roi: string;
}

interface SampleCostByProduct {
  productId: number;
  quantity: string;
  totalCost: string;
  requestCount: number;
  averageCostPerRequest: string;
}

interface SampleCostByClient {
  clientId: number;
  quantity: string;
  totalCost: string;
  requestCount: number;
  averageCostPerRequest: string;
}

interface SampleROIAnalysis {
  summary: SampleDistributionReport["summary"] & SampleConversionReport;
  topPerformingProducts: SampleEffectivenessItem[];
  distributionByClient: DistributionByClient[];
  distributionByProduct: DistributionByProduct[];
}

/**
 * Get sample distribution report
 * Shows how samples were distributed across clients and products
 */
export async function getSampleDistributionReport(
  startDate: Date,
  endDate: Date
): Promise<SampleDistributionReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all fulfilled sample requests in date range
    const requests = await db
      .select()
      .from(sampleRequests)
      .where(
        and(
          eq(sampleRequests.sampleRequestStatus, "FULFILLED"),
          gte(sampleRequests.fulfilledDate, startDate),
          lte(sampleRequests.fulfilledDate, endDate)
        )
      );

    // Aggregate by client
    const byClient: Record<
      number,
      { clientId: number; quantity: number; cost: number; requestCount: number }
    > = {};
    // Aggregate by product
    const byProduct: Record<
      number,
      {
        productId: number;
        quantity: number;
        cost: number;
        requestCount: number;
      }
    > = {};

    let totalSamplesDistributed = 0;
    let totalCost = 0;
    const totalRequests = requests.length;

    for (const request of requests) {
      const products: Array<{ productId: number; quantity: string }> =
        request.products;
      const cost = parseFloat(request.totalCost || "0");

      // By client
      if (!byClient[request.clientId]) {
        byClient[request.clientId] = {
          clientId: request.clientId,
          quantity: 0,
          cost: 0,
          requestCount: 0,
        };
      }
      byClient[request.clientId].requestCount++;
      byClient[request.clientId].cost += cost;

      // By product
      for (const product of products) {
        const qty = parseFloat(product.quantity);
        totalSamplesDistributed += qty;

        if (!byProduct[product.productId]) {
          byProduct[product.productId] = {
            productId: product.productId,
            quantity: 0,
            cost: 0,
            requestCount: 0,
          };
        }
        byProduct[product.productId].quantity += qty;
        byProduct[product.productId].requestCount++;

        // Add to client quantity
        byClient[request.clientId].quantity += qty;
      }

      totalCost += cost;
    }

    return {
      summary: {
        totalRequests,
        totalSamplesDistributed: totalSamplesDistributed.toFixed(2),
        totalCost: totalCost.toFixed(2),
        averageSampleSize: (totalSamplesDistributed / totalRequests).toFixed(2),
        averageCostPerRequest: (totalCost / totalRequests).toFixed(2),
      },
      byClient: Object.values(byClient).map(c => ({
        ...c,
        quantity: c.quantity.toFixed(2),
        cost: c.cost.toFixed(2),
      })),
      byProduct: Object.values(byProduct).map(p => ({
        ...p,
        quantity: p.quantity.toFixed(2),
        averageCostPerUnit: (p.cost / p.quantity).toFixed(2),
      })),
    };
  } catch (error) {
    throw new Error(
      `Failed to generate sample distribution report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get sample conversion report
 * Shows conversion rate from samples to sales
 */
export async function getSampleConversionReport(
  startDate: Date,
  endDate: Date
): Promise<SampleConversionReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all fulfilled sample requests in date range
    const allSamples = await db
      .select()
      .from(sampleRequests)
      .where(
        and(
          eq(sampleRequests.sampleRequestStatus, "FULFILLED"),
          gte(sampleRequests.fulfilledDate, startDate),
          lte(sampleRequests.fulfilledDate, endDate)
        )
      );

    // Get converted samples (those with relatedOrderId)
    const convertedSamples = allSamples.filter(s => s.relatedOrderId !== null);

    // Calculate revenue from conversions
    let totalRevenue = 0;
    for (const sample of convertedSamples) {
      if (sample.relatedOrderId) {
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, sample.relatedOrderId))
          .limit(1);

        if (order) {
          totalRevenue += parseFloat(order.total.toString());
        }
      }
    }

    const totalSampleCost = allSamples.reduce(
      (sum, s) => sum + parseFloat(s.totalCost || "0"),
      0
    );
    const conversionRate =
      allSamples.length > 0
        ? (convertedSamples.length / allSamples.length) * 100
        : 0;
    const roi =
      totalSampleCost > 0 ? (totalRevenue / totalSampleCost) * 100 : 0;

    return {
      totalSamplesGiven: allSamples.length,
      conversionsCount: convertedSamples.length,
      conversionRate: conversionRate.toFixed(2) + "%",
      totalSampleCost: totalSampleCost.toFixed(2),
      revenueFromConversions: totalRevenue.toFixed(2),
      roi: roi.toFixed(2) + "%",
      averageRevenuePerConversion:
        convertedSamples.length > 0
          ? (totalRevenue / convertedSamples.length).toFixed(2)
          : "0.00",
    };
  } catch (error) {
    throw new Error(
      `Failed to generate sample conversion report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get sample effectiveness by product
 * Shows which products have the best conversion rates
 */
export async function getSampleEffectivenessByProduct(
  startDate: Date,
  endDate: Date
): Promise<SampleEffectivenessItem[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get all fulfilled sample requests
    const requests = await db
      .select()
      .from(sampleRequests)
      .where(
        and(
          eq(sampleRequests.sampleRequestStatus, "FULFILLED"),
          gte(sampleRequests.fulfilledDate, startDate),
          lte(sampleRequests.fulfilledDate, endDate)
        )
      );

    // Aggregate by product
    const productStats: Record<
      number,
      {
        productId: number;
        samplesGiven: number;
        conversions: number;
        totalCost: number;
        totalRevenue: number;
      }
    > = {};

    for (const request of requests) {
      const products: Array<{ productId: number; quantity: string }> =
        request.products;
      const converted = request.relatedOrderId !== null;
      const cost = parseFloat(request.totalCost || "0");

      // Get revenue if converted
      let revenue = 0;
      if (converted && request.relatedOrderId) {
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, request.relatedOrderId))
          .limit(1);

        if (order) {
          revenue = parseFloat(order.total.toString());
        }
      }

      for (const product of products) {
        if (!productStats[product.productId]) {
          productStats[product.productId] = {
            productId: product.productId,
            samplesGiven: 0,
            conversions: 0,
            totalCost: 0,
            totalRevenue: 0,
          };
        }

        productStats[product.productId].samplesGiven++;
        if (converted) {
          productStats[product.productId].conversions++;
        }
        productStats[product.productId].totalCost += cost / products.length; // Distribute cost
        productStats[product.productId].totalRevenue +=
          revenue / products.length; // Distribute revenue
      }
    }

    // Calculate metrics
    return Object.values(productStats)
      .map(stat => {
        const conversionRate =
          stat.samplesGiven > 0
            ? (stat.conversions / stat.samplesGiven) * 100
            : 0;
        const roi =
          stat.totalCost > 0 ? (stat.totalRevenue / stat.totalCost) * 100 : 0;

        return {
          productId: stat.productId,
          samplesGiven: stat.samplesGiven,
          conversions: stat.conversions,
          conversionRate: conversionRate.toFixed(2) + "%",
          totalCost: stat.totalCost.toFixed(2),
          totalRevenue: stat.totalRevenue.toFixed(2),
          roi: roi.toFixed(2) + "%",
        };
      })
      .sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi)); // Sort by ROI descending
  } catch (error) {
    throw new Error(
      `Failed to generate sample effectiveness report: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get sample cost by product
 */
export async function getSampleCostByProduct(
  startDate: Date,
  endDate: Date
): Promise<SampleCostByProduct[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const requests = await db
      .select()
      .from(sampleRequests)
      .where(
        and(
          eq(sampleRequests.sampleRequestStatus, "FULFILLED"),
          gte(sampleRequests.fulfilledDate, startDate),
          lte(sampleRequests.fulfilledDate, endDate)
        )
      );

    const productCosts: Record<
      number,
      { productId: number; quantity: number; cost: number; count: number }
    > = {};

    for (const request of requests) {
      const products: Array<{ productId: number; quantity: string }> =
        request.products;
      const cost = parseFloat(request.totalCost || "0");

      for (const product of products) {
        if (!productCosts[product.productId]) {
          productCosts[product.productId] = {
            productId: product.productId,
            quantity: 0,
            cost: 0,
            count: 0,
          };
        }

        productCosts[product.productId].quantity += parseFloat(
          product.quantity
        );
        productCosts[product.productId].cost += cost / products.length;
        productCosts[product.productId].count++;
      }
    }

    return Object.values(productCosts)
      .map(p => ({
        productId: p.productId,
        quantity: p.quantity.toFixed(2),
        totalCost: p.cost.toFixed(2),
        requestCount: p.count,
        averageCostPerRequest: (p.cost / p.count).toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.totalCost) - parseFloat(a.totalCost));
  } catch (error) {
    throw new Error(
      `Failed to get sample cost by product: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get sample cost by client
 */
export async function getSampleCostByClient(
  startDate: Date,
  endDate: Date
): Promise<SampleCostByClient[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const requests = await db
      .select()
      .from(sampleRequests)
      .where(
        and(
          eq(sampleRequests.sampleRequestStatus, "FULFILLED"),
          gte(sampleRequests.fulfilledDate, startDate),
          lte(sampleRequests.fulfilledDate, endDate)
        )
      );

    const clientCosts: Record<
      number,
      { clientId: number; quantity: number; cost: number; count: number }
    > = {};

    for (const request of requests) {
      const products: Array<{ productId: number; quantity: string }> =
        request.products;
      const cost = parseFloat(request.totalCost || "0");
      const totalQty = products.reduce(
        (sum, p) => sum + parseFloat(p.quantity),
        0
      );

      if (!clientCosts[request.clientId]) {
        clientCosts[request.clientId] = {
          clientId: request.clientId,
          quantity: 0,
          cost: 0,
          count: 0,
        };
      }

      clientCosts[request.clientId].quantity += totalQty;
      clientCosts[request.clientId].cost += cost;
      clientCosts[request.clientId].count++;
    }

    return Object.values(clientCosts)
      .map(c => ({
        clientId: c.clientId,
        quantity: c.quantity.toFixed(2),
        totalCost: c.cost.toFixed(2),
        requestCount: c.count,
        averageCostPerRequest: (c.cost / c.count).toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.totalCost) - parseFloat(a.totalCost));
  } catch (error) {
    throw new Error(
      `Failed to get sample cost by client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get sample ROI analysis
 * Comprehensive ROI metrics
 */
export async function getSampleROIAnalysis(
  startDate: Date,
  endDate: Date
): Promise<SampleROIAnalysis> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const distributionReport = await getSampleDistributionReport(
      startDate,
      endDate
    );
    const conversionReport = await getSampleConversionReport(
      startDate,
      endDate
    );
    const effectivenessReport = await getSampleEffectivenessByProduct(
      startDate,
      endDate
    );

    return {
      summary: {
        ...distributionReport.summary,
        ...conversionReport,
      },
      topPerformingProducts: effectivenessReport.slice(0, 10),
      distributionByClient: distributionReport.byClient,
      distributionByProduct: distributionReport.byProduct,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate sample ROI analysis: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
