/**
 * Data Card Metrics Database Layer
 * Provides optimized metric calculations for data cards across all modules
 */

import { getDb } from "./db";
import { eq, count, sum, sql, and, gte, lte, desc } from "drizzle-orm";
import {
  batches,
  products,
  orders,
  clients,
  vendorSupply,
  invoices,
  bills,
  payments,
  bankAccounts,
  vendors,
} from "../drizzle/schema";

// ============================================================================
// TYPES
// ============================================================================

export interface MetricResult {
  value: number | string;
  subtext?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    percentage: number;
  };
  updatedAt: string;
}

export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  format: 'currency' | 'number' | 'percentage' | 'count';
  category: 'financial' | 'operational' | 'analytical';
}

// ============================================================================
// VALID METRIC IDS
// ============================================================================

export function getValidMetricIds(moduleId: string): string[] {
  const validIds: Record<string, string[]> = {
    inventory: [
      'inventory_total_value',
      'inventory_avg_value',
      'inventory_awaiting_intake',
      'inventory_low_stock',
      'inventory_quarantined',
      'inventory_on_hold',
      'inventory_total_units',
      'inventory_live_batches',
      'inventory_by_category',
      'inventory_expiring_soon',
    ],
    orders: [
      'orders_total',
      'orders_pending',
      'orders_packed',
      'orders_shipped',
      'orders_delivered',
      'orders_total_value',
      'orders_this_week',
      'orders_overdue',
      'orders_returns',
    ],
    accounting: [
      'accounting_cash',
      'accounting_ar',
      'accounting_ap',
      'accounting_net',
      'accounting_ar_overdue',
      'accounting_ap_overdue',
      'accounting_recent_payments',
      'accounting_expenses_mtd',
      'accounting_revenue_mtd',
      'accounting_profit_margin',
    ],
    vendor_supply: [
      'vendor_available',
      'vendor_reserved',
      'vendor_total',
      'vendor_expiring',
      'vendor_sold',
      'vendor_by_vendor',
      'vendor_total_value',
    ],
    clients: [
      'clients_total',
      'clients_buyers',
      'clients_with_debt',
      'clients_new_month',
      'clients_sellers',
      'clients_brands',
      'clients_total_debt',
      'clients_top_buyer',
    ],
  };
  
  return validIds[moduleId] || [];
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

export async function calculateMetrics(
  moduleId: string,
  metricIds: string[]
): Promise<Record<string, MetricResult>> {
  switch (moduleId) {
    case 'inventory':
      return await calculateInventoryMetrics(metricIds);
    case 'orders':
      return await calculateOrdersMetrics(metricIds);
    case 'accounting':
      return await calculateAccountingMetrics(metricIds);
    case 'vendor_supply':
      return await calculateVendorSupplyMetrics(metricIds);
    case 'clients':
      return await calculateClientsMetrics(metricIds);
    default:
      throw new Error(`Unknown module: ${moduleId}`);
  }
}

// ============================================================================
// INVENTORY METRICS
// ============================================================================

async function calculateInventoryMetrics(
  metricIds: string[]
): Promise<Record<string, MetricResult>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results: Record<string, MetricResult> = {};
  
  // Single optimized query that calculates ALL metrics at once
  const [aggregates] = await db
    .select({
      totalValue: sum(sql`CAST(${batches.onHandQty} AS DECIMAL(15,2)) * CAST(${batches.unitCogs} AS DECIMAL(15,2))`),
      totalUnits: sum(batches.onHandQty),
      avgCogs: sql<number>`AVG(CAST(${batches.unitCogs} AS DECIMAL(15,2)))`,
      awaitingIntake: count(sql`CASE WHEN ${batches.batchStatus} = 'AWAITING_INTAKE' THEN 1 END`),
      quarantined: count(sql`CASE WHEN ${batches.batchStatus} = 'QUARANTINED' THEN 1 END`),
      onHold: count(sql`CASE WHEN ${batches.batchStatus} = 'ON_HOLD' THEN 1 END`),
      live: count(sql`CASE WHEN ${batches.batchStatus} = 'LIVE' THEN 1 END`),
      lowStock: count(sql`CASE WHEN (CAST(${batches.onHandQty} AS DECIMAL(15,2)) - CAST(${batches.reservedQty} AS DECIMAL(15,2)) - CAST(${batches.quarantineQty} AS DECIMAL(15,2)) - CAST(${batches.holdQty} AS DECIMAL(15,2))) <= 100 THEN 1 END`),
      totalBatches: count(),
    })
    .from(batches);
  
  // Map aggregates to requested metrics
  if (metricIds.includes('inventory_total_value')) {
    results['inventory_total_value'] = {
      value: Number(aggregates.totalValue) || 0,
      subtext: `${Number(aggregates.totalUnits) || 0} total units`,
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('inventory_avg_value')) {
    results['inventory_avg_value'] = {
      value: Number(aggregates.avgCogs) || 0,
      subtext: 'Average COGS per unit',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('inventory_awaiting_intake')) {
    const count = Number(aggregates.awaitingIntake) || 0;
    results['inventory_awaiting_intake'] = {
      value: count,
      subtext: `${count} ${count === 1 ? 'batch' : 'batches'} pending`,
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('inventory_low_stock')) {
    const count = Number(aggregates.lowStock) || 0;
    results['inventory_low_stock'] = {
      value: count,
      subtext: '≤100 units available',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('inventory_quarantined')) {
    const count = Number(aggregates.quarantined) || 0;
    results['inventory_quarantined'] = {
      value: count,
      subtext: `${count === 1 ? 'batch' : 'batches'} quarantined`,
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('inventory_on_hold')) {
    const count = Number(aggregates.onHold) || 0;
    results['inventory_on_hold'] = {
      value: count,
      subtext: `${count === 1 ? 'batch' : 'batches'} on hold`,
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('inventory_total_units')) {
    results['inventory_total_units'] = {
      value: Number(aggregates.totalUnits) || 0,
      subtext: 'units in inventory',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('inventory_live_batches')) {
    const count = Number(aggregates.live) || 0;
    results['inventory_live_batches'] = {
      value: count,
      subtext: `${count === 1 ? 'batch' : 'batches'} available`,
      updatedAt: new Date().toISOString(),
    };
  }
  
  // For metrics requiring additional queries
  if (metricIds.includes('inventory_by_category')) {
    const [topCategory] = await db
      .select({
        category: products.category,
        count: count(),
      })
      .from(batches)
      .leftJoin(products, eq(batches.productId, products.id))
      .where(eq(batches.batchStatus, 'LIVE'))
      .groupBy(products.category)
      .orderBy(desc(count()))
      .limit(1);
    
    results['inventory_by_category'] = {
      value: topCategory?.count || 0,
      subtext: `in ${topCategory?.category || 'N/A'}`,
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Expiring Soon - DISABLED: expirationDate column doesn't exist in batches or lots schema
  // Note: Vendor supply expiration tracking is available via vendor_expiring metric
  if (metricIds.includes('inventory_expiring_soon')) {
    // Batch/lot expiration tracking not implemented in current schema
    // Alternative: Use vendor_expiring metric for vendor supply expiration
    // To enable: Add expirationDate column to batches or lots table
    results['inventory_expiring_soon'] = {
      value: 0,
      subtext: 'expiration tracking N/A',
      updatedAt: new Date().toISOString(),
    };
  }
  
  return results;
}

// ============================================================================
// ORDERS METRICS
// ============================================================================

async function calculateOrdersMetrics(
  metricIds: string[]
): Promise<Record<string, MetricResult>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results: Record<string, MetricResult> = {};
  
  // Single optimized query for all order metrics
  // Only count SALE orders, not QUOTE orders
  const [aggregates] = await db
    .select({
      total: count(),
      pending: count(sql`CASE WHEN ${orders.fulfillmentStatus} = 'PENDING' THEN 1 END`),
      packed: count(sql`CASE WHEN ${orders.fulfillmentStatus} = 'PACKED' THEN 1 END`),
      shipped: count(sql`CASE WHEN ${orders.fulfillmentStatus} = 'SHIPPED' THEN 1 END`),
      delivered: count(sql`CASE WHEN ${orders.fulfillmentStatus} = 'DELIVERED' THEN 1 END`),
      totalValue: sum(orders.total),
    })
    .from(orders)
    .where(eq(orders.orderType, 'SALE'));
  
  if (metricIds.includes('orders_total')) {
    results['orders_total'] = {
      value: Number(aggregates.total) || 0,
      subtext: 'all orders',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('orders_pending')) {
    results['orders_pending'] = {
      value: Number(aggregates.pending) || 0,
      subtext: 'awaiting fulfillment',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('orders_packed')) {
    results['orders_packed'] = {
      value: Number(aggregates.packed) || 0,
      subtext: 'ready to ship',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('orders_shipped')) {
    results['orders_shipped'] = {
      value: Number(aggregates.shipped) || 0,
      subtext: 'in transit',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('orders_delivered')) {
    results['orders_delivered'] = {
      value: Number(aggregates.delivered) || 0,
      subtext: 'delivered',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('orders_total_value')) {
    results['orders_total_value'] = {
      value: Number(aggregates.totalValue) || 0,
      subtext: 'total order value',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('orders_this_week')) {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const [result] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.orderType, 'SALE'),
          gte(orders.createdAt, startOfWeek)
        )
      );
    
    results['orders_this_week'] = {
      value: result?.count || 0,
      subtext: 'this week',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('orders_overdue')) {
    // Count orders that have been PENDING for more than 7 days
    // (using createdAt since expectedShipDate doesn't exist in schema)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [result] = await db
      .select({ count: count() })
      .from(orders)
      .where(
        and(
          eq(orders.orderType, 'SALE'),
          lte(orders.createdAt, sevenDaysAgo),
          eq(orders.fulfillmentStatus, 'PENDING')
        )
      );

    results['orders_overdue'] = {
      value: result?.count || 0,
      subtext: 'pending >7 days',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('orders_returns')) {
    // Count orders with returns (using returns table)
    // Note: hasReturns field doesn't exist, using returns table instead
    const { returns: returnsTable } = await import('../drizzle/schema');
    const [result] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${returnsTable.orderId})` })
      .from(returnsTable);
    
    results['orders_returns'] = {
      value: result?.count || 0,
      subtext: 'with returns',
      updatedAt: new Date().toISOString(),
    };
  }
  
  return results;
}

// ============================================================================
// ACCOUNTING METRICS
// ============================================================================

async function calculateAccountingMetrics(
  metricIds: string[]
): Promise<Record<string, MetricResult>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results: Record<string, MetricResult> = {};
  
  // Accounting tables are already imported at the top
  
  // Calculate cash balance
  if (metricIds.includes('accounting_cash')) {
    const [cashResult] = await db
      .select({
        total: sum(bankAccounts.currentBalance),
      })
      .from(bankAccounts);
    
    results['accounting_cash'] = {
      value: Number(cashResult?.total) || 0,
      subtext: 'cash balance',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Calculate AR
  if (metricIds.includes('accounting_ar')) {
    const [arResult] = await db
      .select({
        total: sum(invoices.amountDue),
      })
      .from(invoices)
      .where(sql`${invoices.status} IN ('SENT', 'VIEWED', 'PARTIAL', 'OVERDUE')`); // All unpaid statuses
    
    results['accounting_ar'] = {
      value: Number(arResult?.total) || 0,
      subtext: 'accounts receivable',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Calculate AP
  if (metricIds.includes('accounting_ap')) {
    const [apResult] = await db
      .select({
        total: sum(bills.amountDue),
      })
      .from(bills)
      .where(sql`${bills.status} IN ('SENT', 'VIEWED', 'PARTIAL', 'OVERDUE')`); // All unpaid statuses
    
    results['accounting_ap'] = {
      value: Number(apResult?.total) || 0,
      subtext: 'accounts payable',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Calculate net position
  if (metricIds.includes('accounting_net')) {
    const ar = results['accounting_ar']?.value || 0;
    const ap = results['accounting_ap']?.value || 0;
    
    results['accounting_net'] = {
      value: Number(ar) - Number(ap),
      subtext: 'AR minus AP',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // AR Overdue
  if (metricIds.includes('accounting_ar_overdue')) {
    const now = new Date();
    
    const [result] = await db
      .select({
        total: sum(invoices.amountDue),
      })
      .from(invoices)
      .where(
        and(
          sql`${invoices.status} IN ('SENT', 'VIEWED', 'PARTIAL', 'OVERDUE')`,
          lte(invoices.dueDate, now)
        )
      );
    
    results['accounting_ar_overdue'] = {
      value: Number(result?.total) || 0,
      subtext: 'overdue invoices',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // AP Overdue
  if (metricIds.includes('accounting_ap_overdue')) {
    const now = new Date();
    
    const [result] = await db
      .select({
        total: sum(bills.amountDue),
      })
      .from(bills)
      .where(
        and(
          sql`${bills.status} IN ('SENT', 'VIEWED', 'PARTIAL', 'OVERDUE')`,
          lte(bills.dueDate, now)
        )
      );
    
    results['accounting_ap_overdue'] = {
      value: Number(result?.total) || 0,
      subtext: 'overdue bills',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Recent payments
  if (metricIds.includes('accounting_recent_payments')) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [result] = await db
      .select({
        total: sum(payments.amount),
      })
      .from(payments)
      .where(gte(payments.paymentDate, thirtyDaysAgo));
    
    results['accounting_recent_payments'] = {
      value: Number(result?.total) || 0,
      subtext: 'last 30 days',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Expenses MTD
  if (metricIds.includes('accounting_expenses_mtd')) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const [result] = await db
      .select({
        total: sum(bills.totalAmount),
      })
      .from(bills)
      .where(gte(bills.createdAt, startOfMonth));
    
    results['accounting_expenses_mtd'] = {
      value: Number(result?.total) || 0,
      subtext: 'month-to-date',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Revenue MTD
  if (metricIds.includes('accounting_revenue_mtd')) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const [result] = await db
      .select({
        total: sum(invoices.totalAmount),
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.createdAt, startOfMonth),
          eq(invoices.status, 'PAID')
        )
      );
    
    results['accounting_revenue_mtd'] = {
      value: Number(result?.total) || 0,
      subtext: 'month-to-date',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // Profit margin
  if (metricIds.includes('accounting_profit_margin')) {
    const revenue = results['accounting_revenue_mtd']?.value || 0;
    const expenses = results['accounting_expenses_mtd']?.value || 0;
    
    const margin = Number(revenue) > 0 
      ? ((Number(revenue) - Number(expenses)) / Number(revenue)) * 100 
      : 0;
    
    results['accounting_profit_margin'] = {
      value: margin,
      subtext: 'profit margin',
      updatedAt: new Date().toISOString(),
    };
  }
  
  return results;
}

// ============================================================================
// VENDOR SUPPLY METRICS
// ============================================================================

async function calculateVendorSupplyMetrics(
  metricIds: string[]
): Promise<Record<string, MetricResult>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results: Record<string, MetricResult> = {};
  
  // Single optimized query for vendor supply metrics
  const [aggregates] = await db
    .select({
      total: count(),
      available: count(sql`CASE WHEN ${vendorSupply.status} = 'AVAILABLE' THEN 1 END`),
      reserved: count(sql`CASE WHEN ${vendorSupply.status} = 'RESERVED' THEN 1 END`),
      purchased: count(sql`CASE WHEN ${vendorSupply.status} = 'PURCHASED' THEN 1 END`),
      totalValue: sum(sql`CAST(${vendorSupply.quantityAvailable} AS DECIMAL(15,2)) * CAST(${vendorSupply.unitPrice} AS DECIMAL(15,2))`),
    })
    .from(vendorSupply);
  
  if (metricIds.includes('vendor_available')) {
    results['vendor_available'] = {
      value: Number(aggregates.available) || 0,
      subtext: 'items available',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('vendor_reserved')) {
    results['vendor_reserved'] = {
      value: Number(aggregates.reserved) || 0,
      subtext: 'items reserved',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('vendor_total')) {
    results['vendor_total'] = {
      value: Number(aggregates.total) || 0,
      subtext: 'total items',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('vendor_purchased')) {
    results['vendor_purchased'] = {
      value: Number(aggregates.purchased) || 0,
      subtext: 'items purchased',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('vendor_total_value')) {
    results['vendor_total_value'] = {
      value: Number(aggregates.totalValue) || 0,
      subtext: 'total value',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('vendor_expiring')) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const [result] = await db
      .select({ count: count() })
      .from(vendorSupply)
      .where(
        and(
          eq(vendorSupply.status, 'AVAILABLE'),
          lte(vendorSupply.availableUntil, thirtyDaysFromNow),
          gte(vendorSupply.availableUntil, new Date())
        )
      );
    
    results['vendor_expiring'] = {
      value: result?.count || 0,
      subtext: 'expiring in 30 days',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('vendor_by_vendor')) {
    const [topVendor] = await db
      .select({
        vendorId: vendorSupply.vendorId,
        count: count(),
      })
      .from(vendorSupply)
      .where(eq(vendorSupply.status, 'AVAILABLE'))
      .groupBy(vendorSupply.vendorId)
      .orderBy(desc(count()))
      .limit(1);
    
    // Get vendor name
    let vendorName = 'N/A';
    if (topVendor?.vendorId) {
      const vendorResult = await db
        .select({ name: vendors.name })
        .from(vendors)
        .where(eq(vendors.id, topVendor.vendorId))
        .limit(1);
      vendorName = vendorResult[0]?.name || 'N/A';
    }
    
    results['vendor_by_vendor'] = {
      value: topVendor?.count || 0,
      subtext: `from ${vendorName}`,
      updatedAt: new Date().toISOString(),
    };
  }
  
  return results;
}

// ============================================================================
// CLIENTS METRICS
// ============================================================================

async function calculateClientsMetrics(
  metricIds: string[]
): Promise<Record<string, MetricResult>> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const results: Record<string, MetricResult> = {};
  
  // Single optimized query for client metrics
  const [aggregates] = await db
    .select({
      total: count(),
      buyers: count(sql`CASE WHEN ${clients.isBuyer} = true THEN 1 END`),
      sellers: count(sql`CASE WHEN ${clients.isSeller} = true THEN 1 END`),
      brands: count(sql`CASE WHEN ${clients.isBrand} = true THEN 1 END`),
      withDebt: count(sql`CASE WHEN CAST(${clients.totalOwed} AS DECIMAL(15,2)) > 0 THEN 1 END`),
      totalDebt: sum(clients.totalOwed),
    })
    .from(clients);
  
  if (metricIds.includes('clients_total')) {
    results['clients_total'] = {
      value: Number(aggregates.total) || 0,
      subtext: 'total clients',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('clients_buyers')) {
    results['clients_buyers'] = {
      value: Number(aggregates.buyers) || 0,
      subtext: 'active buyers',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('clients_sellers')) {
    results['clients_sellers'] = {
      value: Number(aggregates.sellers) || 0,
      subtext: 'sellers',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('clients_brands')) {
    results['clients_brands'] = {
      value: Number(aggregates.brands) || 0,
      subtext: 'brands',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('clients_with_debt')) {
    results['clients_with_debt'] = {
      value: Number(aggregates.withDebt) || 0,
      subtext: 'with outstanding debt',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('clients_total_debt')) {
    results['clients_total_debt'] = {
      value: Number(aggregates.totalDebt) || 0,
      subtext: 'total client debt',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('clients_new_month')) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const [result] = await db
      .select({ count: count() })
      .from(clients)
      .where(gte(clients.createdAt, startOfMonth));
    
    results['clients_new_month'] = {
      value: result?.count || 0,
      subtext: 'new this month',
      updatedAt: new Date().toISOString(),
    };
  }
  
  if (metricIds.includes('clients_top_buyer')) {
    // Get top buyer by total purchase amount (using pre-calculated totalSpent)
    const [topBuyer] = await db
      .select({
        name: clients.name,
        totalSpent: clients.totalSpent,
      })
      .from(clients)
      .orderBy(desc(clients.totalSpent))
      .limit(1);
    
    results['clients_top_buyer'] = {
      value: Number(topBuyer?.totalSpent) || 0,
      subtext: topBuyer?.name || 'top buyer',
      updatedAt: new Date().toISOString(),
    };
  }
  
  return results;
}

// ============================================================================
// METRIC DEFINITIONS
// ============================================================================

export function getMetricDefinitions(moduleId: string): MetricDefinition[] {
  const definitions: Record<string, MetricDefinition[]> = {
    inventory: [
      {
        id: 'inventory_total_value',
        label: 'Total Inventory Value',
        description: 'Total value of all inventory on hand',
        icon: 'DollarSign',
        color: 'text-green-600',
        format: 'currency',
        category: 'financial',
      },
      {
        id: 'inventory_avg_value',
        label: 'Avg Value per Unit',
        description: 'Average cost of goods sold per unit',
        icon: 'TrendingUp',
        color: 'text-blue-600',
        format: 'currency',
        category: 'financial',
      },
      {
        id: 'inventory_awaiting_intake',
        label: 'Awaiting Intake',
        description: 'Batches pending intake processing',
        icon: 'Clock',
        color: 'text-orange-600',
        format: 'count',
        category: 'operational',
      },
      {
        id: 'inventory_low_stock',
        label: 'Low Stock',
        description: 'Items with ≤100 units available',
        icon: 'Package',
        color: 'text-purple-600',
        format: 'count',
        category: 'operational',
      },
      {
        id: 'inventory_quarantined',
        label: 'Quarantined Batches',
        description: 'Batches in quarantine status',
        icon: 'AlertCircle',
        color: 'text-red-600',
        format: 'count',
        category: 'operational',
      },
      {
        id: 'inventory_on_hold',
        label: 'On Hold',
        description: 'Batches on hold',
        icon: 'Pause',
        color: 'text-yellow-600',
        format: 'count',
        category: 'operational',
      },
      {
        id: 'inventory_total_units',
        label: 'Total Units',
        description: 'Total units in inventory',
        icon: 'Package',
        color: 'text-blue-600',
        format: 'number',
        category: 'operational',
      },
      {
        id: 'inventory_live_batches',
        label: 'Live Batches',
        description: 'Batches available for sale',
        icon: 'CheckCircle',
        color: 'text-green-600',
        format: 'count',
        category: 'operational',
      },
      {
        id: 'inventory_by_category',
        label: 'Top Category',
        description: 'Category with most items',
        icon: 'Tag',
        color: 'text-indigo-600',
        format: 'count',
        category: 'analytical',
      },
      {
        id: 'inventory_expiring_soon',
        label: 'Expiring Soon',
        description: 'Items expiring in 30 days',
        icon: 'Clock',
        color: 'text-orange-600',
        format: 'count',
        category: 'operational',
      },
    ],
    // Additional module definitions would go here...
    // For brevity, only showing inventory
  };
  
  return definitions[moduleId] || [];
}
