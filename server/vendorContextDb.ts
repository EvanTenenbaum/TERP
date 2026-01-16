/**
 * Vendor Context Database Module - FEAT-002-BE
 *
 * Provides comprehensive vendor context API for displaying vendor history,
 * performance metrics, and active inventory when selecting a vendor in PO/Sales workflows.
 *
 * Key calculations:
 * - Sell-through rate = (Units Sold / Units Supplied) * 100
 * - Days-to-sell calculated from batch creation to sale date
 * - Historical data defaults to last 12 months
 */

import { eq, and, sql, gte, lte, desc, asc } from "drizzle-orm";
import { getDb } from "./db";
import {
  clients,
  supplierProfiles,
  lots,
  batches,
  products,
  sales,
  brands,
  paymentHistory,
} from "../drizzle/schema";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Vendor basic information including contact and relationship data
 */
export interface VendorInfo {
  clientId: number;
  name: string;
  teriCode: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string | null;
  preferredPaymentMethod: string | null;
  licenseNumber: string | null;
  taxId: string | null;
  totalLifetimeValue: number;
  relationshipStartDate: string | null;
  supplierNotes: string | null;
}

/**
 * Product info within a lot supply entry
 */
export interface SupplyProduct {
  productId: number;
  productName: string;
  category: string;
  batchCode: string;
  batchId: number;
  quantitySupplied: number;
  unitCogs: number;
  totalCogs: number;
}

/**
 * Single lot supply history entry with products
 */
export interface SupplyHistoryEntry {
  lotId: number;
  lotCode: string;
  supplyDate: string;
  products: SupplyProduct[];
  totalValue: number;
}

/**
 * Product performance metrics across all batches from this vendor
 */
export interface ProductPerformanceEntry {
  productId: number;
  productName: string;
  category: string;
  brandName: string | null;

  // Supply metrics
  totalSupplied: number;
  totalBatches: number;
  avgSupplyQuantity: number;
  lastSupplyDate: string | null;

  // Sales metrics
  totalSold: number;
  totalRevenue: number;
  avgSalePrice: number;
  totalCogs: number; // COGS for units sold

  // Performance metrics
  sellThroughRate: number;
  avgDaysToSell: number | null;
  currentAvailable: number;
}

/**
 * Aggregate metrics for vendor's overall performance
 */
export interface AggregateMetrics {
  totalLotsReceived: number;
  totalUnitsSupplied: number;
  totalCostOfGoods: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalProfit: number;
  overallSellThroughRate: number;
  avgDaysToSell: number | null;
}

/**
 * Active inventory entry from this vendor
 */
export interface ActiveInventoryEntry {
  batchId: number;
  batchCode: string;
  sku: string;
  productName: string;
  category: string;
  brandName: string | null;
  unitsAvailable: number;
  daysOld: number;
  unitCogs: number;
  batchStatus: string;
}

/**
 * Payment history entry to vendor
 */
export interface PaymentHistoryEntry {
  paymentId: number;
  paymentDate: string;
  amount: number;
  paymentMethod: string | null;
  notes: string | null;
  relatedLotCodes: string[];
  batchCode: string | null;
}

/**
 * Complete vendor context response
 */
export interface VendorContext {
  vendor: VendorInfo;
  supplyHistory: SupplyHistoryEntry[];
  productPerformance: ProductPerformanceEntry[];
  aggregateMetrics: AggregateMetrics;
  activeInventory?: ActiveInventoryEntry[];
  paymentHistory?: PaymentHistoryEntry[];
  relatedBrands: Array<{ id: number; name: string; productCount: number }>;
}

/**
 * Parameters for getVendorContext function
 */
export interface VendorContextParams {
  clientId: number;
  startDate?: Date;
  endDate?: Date;
  includeActiveInventory?: boolean;
  includePaymentHistory?: boolean;
}

// ============================================================================
// MAIN CONTEXT FUNCTION
// ============================================================================

/**
 * Get comprehensive vendor context including history, performance, and active inventory.
 *
 * @param params - Query parameters
 * @returns Complete vendor context
 * @throws Error if vendor not found or not a seller
 */
export async function getVendorContext(
  params: VendorContextParams
): Promise<VendorContext> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    clientId,
    startDate,
    endDate,
    includeActiveInventory = true,
    includePaymentHistory = true,
  } = params;

  // Default date range: last 12 months
  const effectiveStartDate =
    startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const effectiveEndDate = endDate || new Date();

  // 1. Get vendor info from clients + supplier_profiles
  const vendorInfo = await getVendorInfo(db, clientId);
  if (!vendorInfo) {
    throw new Error("Vendor not found");
  }

  // 2. Get supply history (lots with batches)
  const supplyHistory = await getSupplyHistory(
    db,
    clientId,
    effectiveStartDate,
    effectiveEndDate
  );

  // 3. Calculate product performance metrics
  const productPerformance = await getProductPerformance(
    db,
    clientId,
    effectiveStartDate,
    effectiveEndDate
  );

  // 4. Calculate aggregate metrics
  const aggregateMetrics = calculateAggregateMetrics(productPerformance);

  // 5. Get active inventory if requested
  const activeInventory = includeActiveInventory
    ? await getActiveInventory(db, clientId)
    : undefined;

  // 6. Get payment history if requested
  const paymentHistoryData = includePaymentHistory
    ? await getPaymentHistoryData(
        db,
        clientId,
        effectiveStartDate,
        effectiveEndDate
      )
    : undefined;

  // 7. Get related brands for this vendor
  const relatedBrands = await getRelatedBrands(db, clientId);

  return {
    vendor: vendorInfo,
    supplyHistory,
    productPerformance,
    aggregateMetrics,
    activeInventory,
    paymentHistory: paymentHistoryData,
    relatedBrands,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get vendor basic info from clients + supplier_profiles
 */
async function getVendorInfo(
  db: Awaited<ReturnType<typeof getDb>>,
  clientId: number
): Promise<VendorInfo | null> {
  if (!db) return null;

  // Get client with isSeller=true
  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      teriCode: clients.teriCode,
      isSeller: clients.isSeller,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), sql`${clients.deletedAt} IS NULL`))
    .limit(1);

  if (!client) return null;
  if (!client.isSeller) {
    throw new Error("Client is not a vendor (isSeller=false)");
  }

  // Get supplier profile
  const [profile] = await db
    .select()
    .from(supplierProfiles)
    .where(eq(supplierProfiles.clientId, clientId))
    .limit(1);

  // Calculate total lifetime value from sales of products in lots from this vendor
  const [lifetimeValue] = await db
    .select({
      total: sql<number>`COALESCE(SUM(CAST(${sales.salePrice} AS DECIMAL(15,2)) * CAST(${sales.quantity} AS DECIMAL(15,4))), 0)`,
    })
    .from(sales)
    .innerJoin(batches, eq(sales.batchId, batches.id))
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(eq(lots.supplierClientId, clientId));

  // Get relationship start date (first lot date)
  const [firstLot] = await db
    .select({ date: lots.date })
    .from(lots)
    .where(eq(lots.supplierClientId, clientId))
    .orderBy(asc(lots.date))
    .limit(1);

  return {
    clientId: client.id,
    name: client.name,
    teriCode: client.teriCode,
    contactName: profile?.contactName || null,
    contactEmail: profile?.contactEmail || null,
    contactPhone: profile?.contactPhone || null,
    paymentTerms: profile?.paymentTerms || null,
    preferredPaymentMethod: profile?.preferredPaymentMethod || null,
    licenseNumber: profile?.licenseNumber || null,
    taxId: profile?.taxId || null,
    supplierNotes: profile?.supplierNotes || null,
    totalLifetimeValue: Number(lifetimeValue?.total) || 0,
    relationshipStartDate: firstLot?.date
      ? new Date(firstLot.date).toISOString().split("T")[0]
      : null,
  };
}

/**
 * Get supply history (lots with batches) for a vendor
 */
async function getSupplyHistory(
  db: Awaited<ReturnType<typeof getDb>>,
  clientId: number,
  startDate: Date,
  endDate: Date
): Promise<SupplyHistoryEntry[]> {
  if (!db) return [];

  // Get all lots from this supplier within date range
  const lotsData = await db
    .select({
      lotId: lots.id,
      lotCode: lots.code,
      date: lots.date,
    })
    .from(lots)
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        gte(lots.date, startDate),
        lte(lots.date, endDate),
        sql`${lots.deletedAt} IS NULL`
      )
    )
    .orderBy(desc(lots.date));

  // For each lot, get the batches with product info
  const supplyHistory: SupplyHistoryEntry[] = [];

  for (const lot of lotsData) {
    const batchesData = await db
      .select({
        batchId: batches.id,
        batchCode: batches.code,
        productId: batches.productId,
        productName: products.nameCanonical,
        category: products.category,
        onHandQty: batches.onHandQty,
        unitCogs: batches.unitCogs,
        unitCogsMin: batches.unitCogsMin,
        cogsMode: batches.cogsMode,
      })
      .from(batches)
      .innerJoin(products, eq(batches.productId, products.id))
      .where(
        and(eq(batches.lotId, lot.lotId), sql`${batches.deletedAt} IS NULL`)
      );

    const supplyProducts: SupplyProduct[] = batchesData.map(b => {
      // Calculate COGS based on mode
      const unitCogs =
        b.cogsMode === "FIXED"
          ? parseFloat(b.unitCogs || "0")
          : parseFloat(b.unitCogsMin || "0");
      const qty = parseFloat(b.onHandQty || "0");

      return {
        productId: b.productId,
        productName: b.productName,
        category: b.category,
        batchCode: b.batchCode,
        batchId: b.batchId,
        quantitySupplied: qty,
        unitCogs,
        totalCogs: unitCogs * qty,
      };
    });

    const totalValue = supplyProducts.reduce((sum, p) => sum + p.totalCogs, 0);

    supplyHistory.push({
      lotId: lot.lotId,
      lotCode: lot.lotCode,
      supplyDate: new Date(lot.date).toISOString().split("T")[0],
      products: supplyProducts,
      totalValue,
    });
  }

  return supplyHistory;
}

/**
 * Calculate product performance metrics for all products from this vendor
 */
async function getProductPerformance(
  db: Awaited<ReturnType<typeof getDb>>,
  clientId: number,
  startDate: Date,
  endDate: Date
): Promise<ProductPerformanceEntry[]> {
  if (!db) return [];

  // Get aggregated data per product from batches via lots
  const productData = await db
    .select({
      productId: products.id,
      productName: products.nameCanonical,
      category: products.category,
      brandId: products.brandId,
      brandName: brands.name,
      // Batch aggregates
      totalBatches: sql<number>`COUNT(DISTINCT ${batches.id})`,
      totalSupplied: sql<number>`COALESCE(SUM(CAST(${batches.onHandQty} AS DECIMAL(15,4))), 0)`,
      lastSupplyDate: sql<string>`MAX(${lots.date})`,
      // Available inventory
      currentAvailable: sql<number>`COALESCE(SUM(
        CASE WHEN ${batches.batchStatus} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')
        THEN CAST(${batches.onHandQty} AS DECIMAL(15,4)) - CAST(${batches.reservedQty} AS DECIMAL(15,4)) - CAST(${batches.quarantineQty} AS DECIMAL(15,4))
        ELSE 0 END
      ), 0)`,
      // COGS for calculating profit
      avgUnitCogs: sql<number>`AVG(CAST(COALESCE(${batches.unitCogs}, ${batches.unitCogsMin}, '0') AS DECIMAL(15,4)))`,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .innerJoin(products, eq(batches.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        gte(lots.date, startDate),
        lte(lots.date, endDate),
        sql`${batches.deletedAt} IS NULL`,
        sql`${lots.deletedAt} IS NULL`
      )
    )
    .groupBy(
      products.id,
      products.nameCanonical,
      products.category,
      products.brandId,
      brands.name
    );

  // For each product, get sales data
  const performanceEntries: ProductPerformanceEntry[] = [];

  for (const product of productData) {
    // Get sales data for batches from this vendor's lots
    const [salesData] = await db
      .select({
        totalSold: sql<number>`COALESCE(SUM(CAST(${sales.quantity} AS DECIMAL(15,4))), 0)`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${sales.salePrice} AS DECIMAL(15,2)) * CAST(${sales.quantity} AS DECIMAL(15,4))), 0)`,
        salesCount: sql<number>`COUNT(${sales.id})`,
        avgDaysToSell: sql<number>`AVG(DATEDIFF(${sales.saleDate}, ${batches.createdAt}))`,
      })
      .from(sales)
      .innerJoin(batches, eq(sales.batchId, batches.id))
      .innerJoin(lots, eq(batches.lotId, lots.id))
      .where(
        and(
          eq(lots.supplierClientId, clientId),
          eq(batches.productId, product.productId),
          gte(sales.saleDate, startDate),
          lte(sales.saleDate, endDate),
          sql`${sales.deletedAt} IS NULL`
        )
      );

    const totalSupplied = Number(product.totalSupplied) || 0;
    const totalSold = Number(salesData?.totalSold) || 0;
    const totalRevenue = Number(salesData?.totalRevenue) || 0;
    const totalBatches = Number(product.totalBatches) || 0;
    const avgUnitCogs = Number(product.avgUnitCogs) || 0;

    // Calculate sell-through rate
    const sellThroughRate =
      totalSupplied > 0 ? (totalSold / totalSupplied) * 100 : 0;

    // Calculate average sale price
    const avgSalePrice = totalSold > 0 ? totalRevenue / totalSold : 0;

    // Calculate total COGS for units sold
    const totalCogs = totalSold * avgUnitCogs;

    performanceEntries.push({
      productId: product.productId,
      productName: product.productName,
      category: product.category,
      brandName: product.brandName,

      totalSupplied,
      totalBatches,
      avgSupplyQuantity: totalBatches > 0 ? totalSupplied / totalBatches : 0,
      lastSupplyDate: product.lastSupplyDate || null,

      totalSold,
      totalRevenue,
      avgSalePrice,
      totalCogs,

      sellThroughRate,
      avgDaysToSell: salesData?.avgDaysToSell || null,
      currentAvailable: Number(product.currentAvailable) || 0,
    });
  }

  return performanceEntries;
}

/**
 * Calculate aggregate metrics from product performance data
 */
function calculateAggregateMetrics(
  productPerformance: ProductPerformanceEntry[]
): AggregateMetrics {
  let totalUnitsSupplied = 0;
  let totalCostOfGoods = 0;
  let totalUnitsSold = 0;
  let totalRevenue = 0;
  let totalDaysToSell = 0;
  let daysToSellCount = 0;
  let totalBatchCount = 0;

  for (const product of productPerformance) {
    totalUnitsSupplied += product.totalSupplied;
    totalUnitsSold += product.totalSold;
    totalRevenue += product.totalRevenue;
    totalCostOfGoods += product.totalCogs; // Sum COGS from each product
    totalBatchCount += product.totalBatches;

    if (product.avgDaysToSell !== null) {
      totalDaysToSell += product.avgDaysToSell * product.totalSold;
      daysToSellCount += product.totalSold;
    }
  }

  const overallSellThroughRate =
    totalUnitsSupplied > 0 ? (totalUnitsSold / totalUnitsSupplied) * 100 : 0;

  const avgDaysToSell =
    daysToSellCount > 0 ? totalDaysToSell / daysToSellCount : null;

  return {
    totalLotsReceived: totalBatchCount, // Total batches received from this vendor
    totalUnitsSupplied,
    totalCostOfGoods,
    totalUnitsSold,
    totalRevenue,
    totalProfit: totalRevenue - totalCostOfGoods,
    overallSellThroughRate,
    avgDaysToSell,
  };
}

/**
 * Get active inventory from this vendor's lots
 */
async function getActiveInventory(
  db: Awaited<ReturnType<typeof getDb>>,
  clientId: number
): Promise<ActiveInventoryEntry[]> {
  if (!db) return [];

  const activeInventory = await db
    .select({
      batchId: batches.id,
      batchCode: batches.code,
      sku: batches.sku,
      productName: products.nameCanonical,
      category: products.category,
      brandName: brands.name,
      onHandQty: batches.onHandQty,
      reservedQty: batches.reservedQty,
      quarantineQty: batches.quarantineQty,
      createdAt: batches.createdAt,
      unitCogs: batches.unitCogs,
      unitCogsMin: batches.unitCogsMin,
      cogsMode: batches.cogsMode,
      batchStatus: batches.batchStatus,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .innerJoin(products, eq(batches.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        sql`${batches.batchStatus} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE', 'ON_HOLD')`,
        sql`${batches.deletedAt} IS NULL`
      )
    )
    .orderBy(desc(batches.createdAt));

  return activeInventory.map(inv => {
    const onHand = parseFloat(inv.onHandQty || "0");
    const reserved = parseFloat(inv.reservedQty || "0");
    const quarantine = parseFloat(inv.quarantineQty || "0");
    const available = onHand - reserved - quarantine;

    const unitCogs =
      inv.cogsMode === "FIXED"
        ? parseFloat(inv.unitCogs || "0")
        : parseFloat(inv.unitCogsMin || "0");

    const daysOld = Math.floor(
      (Date.now() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      batchId: inv.batchId,
      batchCode: inv.batchCode,
      sku: inv.sku,
      productName: inv.productName,
      category: inv.category,
      brandName: inv.brandName,
      unitsAvailable: available,
      daysOld,
      unitCogs,
      batchStatus: inv.batchStatus,
    };
  });
}

/**
 * Get payment history for this vendor
 */
async function getPaymentHistoryData(
  db: Awaited<ReturnType<typeof getDb>>,
  clientId: number,
  startDate: Date,
  endDate: Date
): Promise<PaymentHistoryEntry[]> {
  if (!db) return [];

  // Get payment history linked to batches from this vendor's lots
  const payments = await db
    .select({
      paymentId: paymentHistory.id,
      paymentDate: paymentHistory.paymentDate,
      amount: paymentHistory.amount,
      paymentMethod: paymentHistory.paymentMethod,
      notes: paymentHistory.notes,
      batchCode: batches.code,
      lotCode: lots.code,
    })
    .from(paymentHistory)
    .innerJoin(batches, eq(paymentHistory.batchId, batches.id))
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        gte(paymentHistory.paymentDate, startDate),
        lte(paymentHistory.paymentDate, endDate),
        sql`${paymentHistory.deletedAt} IS NULL`
      )
    )
    .orderBy(desc(paymentHistory.paymentDate));

  // Group payments by date and aggregate lot codes
  const paymentMap = new Map<number, PaymentHistoryEntry>();

  for (const payment of payments) {
    const existing = paymentMap.get(payment.paymentId);
    if (existing) {
      if (
        payment.lotCode &&
        !existing.relatedLotCodes.includes(payment.lotCode)
      ) {
        existing.relatedLotCodes.push(payment.lotCode);
      }
    } else {
      paymentMap.set(payment.paymentId, {
        paymentId: payment.paymentId,
        paymentDate: new Date(payment.paymentDate).toISOString().split("T")[0],
        amount: parseFloat(payment.amount || "0"),
        paymentMethod: payment.paymentMethod,
        notes: payment.notes,
        relatedLotCodes: payment.lotCode ? [payment.lotCode] : [],
        batchCode: payment.batchCode,
      });
    }
  }

  return Array.from(paymentMap.values());
}

/**
 * Get brands associated with this vendor's products
 */
async function getRelatedBrands(
  db: Awaited<ReturnType<typeof getDb>>,
  clientId: number
): Promise<Array<{ id: number; name: string; productCount: number }>> {
  if (!db) return [];

  const brandsData = await db
    .select({
      brandId: brands.id,
      brandName: brands.name,
      productCount: sql<number>`COUNT(DISTINCT ${products.id})`,
    })
    .from(brands)
    .innerJoin(products, eq(products.brandId, brands.id))
    .innerJoin(batches, eq(batches.productId, products.id))
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(eq(lots.supplierClientId, clientId), sql`${brands.deletedAt} IS NULL`)
    )
    .groupBy(brands.id, brands.name)
    .orderBy(desc(sql`COUNT(DISTINCT ${products.id})`));

  return brandsData.map(b => ({
    id: b.brandId,
    name: b.brandName,
    productCount: Number(b.productCount),
  }));
}

// ============================================================================
// ADDITIONAL QUERY FUNCTIONS
// ============================================================================

/**
 * Search vendors with optional filtering and return with brand counts
 * MEET-030: Vendor Search Shows Related Brands
 */
export async function searchVendorsWithBrands(
  query: string,
  limit = 20
): Promise<
  Array<{
    vendor: VendorInfo;
    brands: Array<{ id: number; name: string; productCount: number }>;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  // Search suppliers by name
  const suppliers = await db
    .select({
      id: clients.id,
      name: clients.name,
      teriCode: clients.teriCode,
    })
    .from(clients)
    .where(
      and(
        eq(clients.isSeller, true),
        sql`${clients.name} LIKE ${"%" + query + "%"}`,
        sql`${clients.deletedAt} IS NULL`
      )
    )
    .limit(limit);

  const results = [];

  for (const supplier of suppliers) {
    const vendorInfo = await getVendorInfo(db, supplier.id);
    if (vendorInfo) {
      const relatedBrands = await getRelatedBrands(db, supplier.id);
      results.push({
        vendor: vendorInfo,
        brands: relatedBrands,
      });
    }
  }

  return results;
}

/**
 * Get vendor with farmer/grower association
 * MEET-029: Vendor Tied to Farmer Name
 *
 * For Flower category products, the brand represents the Farmer.
 * This function returns the vendor with associated farmer/grower names.
 */
export async function getVendorWithFarmerInfo(clientId: number): Promise<{
  vendor: VendorInfo;
  farmers: Array<{ brandId: number; farmerName: string; productCount: number }>;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const vendorInfo = await getVendorInfo(db, clientId);
  if (!vendorInfo) return null;

  // Get brands associated with Flower category products from this vendor
  // These represent "Farmers" in the nomenclature
  const farmers = await db
    .select({
      brandId: brands.id,
      farmerName: brands.name,
      productCount: sql<number>`COUNT(DISTINCT ${products.id})`,
    })
    .from(brands)
    .innerJoin(products, eq(products.brandId, brands.id))
    .innerJoin(batches, eq(batches.productId, products.id))
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .where(
      and(
        eq(lots.supplierClientId, clientId),
        sql`${products.category} LIKE '%Flower%' OR ${products.category} LIKE '%Pre-Roll%'`,
        sql`${brands.deletedAt} IS NULL`
      )
    )
    .groupBy(brands.id, brands.name)
    .orderBy(desc(sql`COUNT(DISTINCT ${products.id})`));

  return {
    vendor: vendorInfo,
    farmers: farmers.map(f => ({
      brandId: f.brandId,
      farmerName: f.farmerName,
      productCount: Number(f.productCount),
    })),
  };
}
