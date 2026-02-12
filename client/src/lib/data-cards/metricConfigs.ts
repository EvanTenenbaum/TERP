/**
 * Data Card Metric Configurations
 * Defines all available metrics for each module with their display properties and navigation
 */

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  AlertCircle,
  Pause,
  CheckCircle,
  CheckCircle2,
  Tag,
  Truck,
  Wallet,
  Receipt,
  Users,
  ShoppingCart,
  UserPlus,
  Building,
  Calendar,
  PackageX,
  Percent,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MetricConfig, ModuleConfig } from "./types";

// ============================================================================
// METRIC CONFIGURATIONS
// ============================================================================

export const METRIC_CONFIGS: Record<string, MetricConfig> = {
  // ========== INVENTORY METRICS ==========
  inventory_total_value: {
    id: 'inventory_total_value',
    label: 'Total Inventory Value',
    description: 'Total value of all inventory on hand',
    icon: DollarSign,
    color: 'text-green-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/inventory',
    },
  },
  
  inventory_avg_value: {
    id: 'inventory_avg_value',
    label: 'Avg Value per Unit',
    description: 'Average cost of goods sold per unit',
    icon: TrendingUp,
    color: 'text-blue-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/inventory',
      getParams: () => ({ sortBy: 'unitCost', sortOrder: 'desc' }),
    },
  },
  
  inventory_awaiting_intake: {
    id: 'inventory_awaiting_intake',
    label: 'Awaiting Intake',
    description: 'Batches pending intake processing',
    icon: Clock,
    color: 'text-orange-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/inventory',
      getParams: () => ({ status: 'AWAITING_INTAKE' }),
    },
  },
  
  inventory_low_stock: {
    id: 'inventory_low_stock',
    label: 'Low Stock',
    description: 'Items with ≤100 units available',
    icon: Package,
    color: 'text-purple-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/inventory',
      getParams: () => ({ stockLevel: 'low_stock' }),
    },
  },
  
  inventory_quarantined: {
    id: 'inventory_quarantined',
    label: 'Quarantined Batches',
    description: 'Batches in quarantine status',
    icon: AlertCircle,
    color: 'text-red-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/inventory',
      getParams: () => ({ status: 'QUARANTINED' }),
    },
  },
  
  inventory_on_hold: {
    id: 'inventory_on_hold',
    label: 'On Hold',
    description: 'Batches on hold',
    icon: Pause,
    color: 'text-yellow-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/inventory',
      getParams: () => ({ status: 'ON_HOLD' }),
    },
  },
  
  inventory_total_units: {
    id: 'inventory_total_units',
    label: 'Total Units',
    description: 'Total units in inventory',
    icon: Package,
    color: 'text-blue-600',
    format: 'number',
    category: 'operational',
    destination: {
      path: '/inventory',
    },
  },
  
  inventory_live_batches: {
    id: 'inventory_live_batches',
    label: 'Live Batches',
    description: 'Batches available for sale',
    icon: CheckCircle,
    color: 'text-green-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/inventory',
      getParams: () => ({ status: 'LIVE' }),
    },
  },
  
  inventory_by_category: {
    id: 'inventory_by_category',
    label: 'Top Category',
    description: 'Category with most items',
    icon: Tag,
    color: 'text-indigo-600',
    format: 'count',
    category: 'analytical',
    destination: {
      path: '/inventory',
      getParams: (data: any) => ({ category: data?.topCategory || '' }),
    },
  },
  
  inventory_expiring_soon: {
    id: 'inventory_expiring_soon',
    label: 'Expiring Soon',
    description: 'Items expiring in 30 days',
    icon: Clock,
    color: 'text-orange-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/inventory',
      getParams: () => ({ expiringWithin: '30' }),
    },
  },
  
  // ========== ORDERS METRICS ==========
  orders_total: {
    id: 'orders_total',
    label: 'Total Orders',
    description: 'All orders in system',
    icon: Package,
    color: 'text-blue-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/orders',
    },
  },
  
  orders_pending: {
    id: 'orders_pending',
    label: 'Pending',
    description: 'Orders awaiting fulfillment',
    icon: Clock,
    color: 'text-yellow-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/orders',
      getParams: () => ({ status: 'PENDING' }),
    },
  },
  
  orders_packed: {
    id: 'orders_packed',
    label: 'Packed',
    description: 'Orders packed and ready to ship',
    icon: Package,
    color: 'text-blue-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/orders',
      getParams: () => ({ status: 'PACKED' }),
    },
  },
  
  orders_shipped: {
    id: 'orders_shipped',
    label: 'Shipped',
    description: 'Orders shipped to customers',
    icon: Truck,
    color: 'text-green-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/orders',
      getParams: () => ({ status: 'SHIPPED' }),
    },
  },
  
  orders_delivered: {
    id: 'orders_delivered',
    label: 'Delivered',
    description: 'Orders delivered to customers',
    icon: CheckCircle2,
    color: 'text-green-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/orders',
      getParams: () => ({ status: 'DELIVERED' }),
    },
  },
  
  orders_total_value: {
    id: 'orders_total_value',
    label: 'Total Order Value',
    description: 'Combined value of all orders',
    icon: DollarSign,
    color: 'text-green-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/orders',
      getParams: () => ({ sortBy: 'totalAmount', sortOrder: 'desc' }),
    },
  },
  
  orders_this_week: {
    id: 'orders_this_week',
    label: 'This Week',
    description: 'Orders created this week',
    icon: Calendar,
    color: 'text-blue-600',
    format: 'count',
    category: 'analytical',
    destination: {
      path: '/orders',
      getParams: () => ({ period: 'current_week' }),
    },
  },
  
  orders_overdue: {
    id: 'orders_overdue',
    label: 'Overdue Shipments',
    description: 'Orders past expected ship date',
    icon: AlertCircle,
    color: 'text-red-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/orders',
      getParams: () => ({ overdue: 'true' }),
    },
  },
  
  orders_returns: {
    id: 'orders_returns',
    label: 'Returns',
    description: 'Orders with returns',
    icon: PackageX,
    color: 'text-orange-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/orders',
      getParams: () => ({ hasReturns: 'true' }),
    },
  },
  
  // ========== ACCOUNTING METRICS ==========
  accounting_cash: {
    id: 'accounting_cash',
    label: 'Cash Balance',
    description: 'Total cash across all accounts',
    icon: Wallet,
    color: 'text-green-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/bank-accounts',
    },
  },
  
  accounting_ar: {
    id: 'accounting_ar',
    label: 'Accounts Receivable',
    description: 'Outstanding invoices',
    icon: TrendingUp,
    color: 'text-green-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/invoices',
      getParams: () => ({ status: 'OUTSTANDING' }),
    },
  },
  
  accounting_ap: {
    id: 'accounting_ap',
    label: 'Accounts Payable',
    description: 'Outstanding bills',
    icon: TrendingDown,
    color: 'text-red-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/bills',
      getParams: () => ({ status: 'OUTSTANDING' }),
    },
  },
  
  accounting_net: {
    id: 'accounting_net',
    label: 'Net Position',
    description: 'AR minus AP',
    icon: DollarSign,
    color: 'text-blue-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/dashboard',
    },
  },
  
  accounting_ar_overdue: {
    id: 'accounting_ar_overdue',
    label: 'AR Overdue',
    description: 'Overdue invoices',
    icon: AlertCircle,
    color: 'text-red-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/invoices',
      getParams: () => ({ aging: 'overdue' }),
    },
  },
  
  accounting_ap_overdue: {
    id: 'accounting_ap_overdue',
    label: 'AP Overdue',
    description: 'Overdue bills',
    icon: AlertCircle,
    color: 'text-red-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/bills',
      getParams: () => ({ aging: 'overdue' }),
    },
  },
  
  accounting_recent_payments: {
    id: 'accounting_recent_payments',
    label: 'Recent Payments',
    description: 'Payments in last 30 days',
    icon: Receipt,
    color: 'text-blue-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/payments',
      getParams: () => ({ period: 'last_30_days' }),
    },
  },
  
  accounting_expenses_mtd: {
    id: 'accounting_expenses_mtd',
    label: 'Expenses MTD',
    description: 'Expenses month-to-date',
    icon: TrendingDown,
    color: 'text-red-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/expenses',
      getParams: () => ({ period: 'current_month' }),
    },
  },
  
  accounting_revenue_mtd: {
    id: 'accounting_revenue_mtd',
    label: 'Revenue MTD',
    description: 'Revenue month-to-date',
    icon: TrendingUp,
    color: 'text-green-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/accounting/invoices',
      getParams: () => ({ period: 'current_month', status: 'PAID' }),
    },
  },
  
  accounting_profit_margin: {
    id: 'accounting_profit_margin',
    label: 'Profit Margin',
    description: 'Net profit margin percentage',
    icon: Percent,
    color: 'text-green-600',
    format: 'percentage',
    category: 'financial',
    destination: {
      path: '/accounting/dashboard',
    },
  },
  
  // ========== VENDOR SUPPLY METRICS ==========
  vendor_available: {
    id: 'vendor_available',
    label: 'Available Items',
    description: 'Items available from vendors',
    icon: Package,
    color: 'text-green-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/vendor-supply',
      getParams: () => ({ status: 'AVAILABLE' }),
    },
  },
  
  vendor_reserved: {
    id: 'vendor_reserved',
    label: 'Reserved Items',
    description: 'Items reserved from vendors',
    icon: TrendingUp,
    color: 'text-blue-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/vendor-supply',
      getParams: () => ({ status: 'RESERVED' }),
    },
  },
  
  vendor_total: {
    id: 'vendor_total',
    label: 'Total Items',
    description: 'All vendor supply items',
    icon: Package,
    color: 'text-blue-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/vendor-supply',
    },
  },
  
  vendor_expiring: {
    id: 'vendor_expiring',
    label: 'Expiring Soon',
    description: 'Items expiring in 30 days',
    icon: Clock,
    color: 'text-orange-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/vendor-supply',
      getParams: () => ({ expiringWithin: '30' }),
    },
  },
  
  vendor_purchased: {
    id: 'vendor_purchased',
    label: 'Purchased Items',
    description: 'Items already purchased',
    icon: CheckCircle,
    color: 'text-green-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/vendor-supply',
      getParams: () => ({ status: 'PURCHASED' }),
    },
  },
  
  vendor_by_vendor: {
    id: 'vendor_by_vendor',
    label: 'Top Vendor',
    description: 'Vendor with most items',
    icon: Building,
    color: 'text-indigo-600',
    format: 'count',
    category: 'analytical',
    destination: {
      path: '/vendor-supply',
      getParams: (data: any) => ({ vendor: data?.topVendor || '' }),
    },
  },
  
  vendor_total_value: {
    id: 'vendor_total_value',
    label: 'Total Value',
    description: 'Total value of vendor supply',
    icon: DollarSign,
    color: 'text-green-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/vendor-supply',
      getParams: () => ({ sortBy: 'value', sortOrder: 'desc' }),
    },
  },
  
  // ========== CLIENTS METRICS ==========
  clients_total: {
    id: 'clients_total',
    label: 'Total Clients',
    description: 'All clients in system',
    icon: Users,
    color: 'text-blue-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/clients',
    },
  },
  
  clients_buyers: {
    id: 'clients_buyers',
    label: 'Active Buyers',
    description: 'Clients who are buyers',
    icon: ShoppingCart,
    color: 'text-green-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/clients',
      getParams: () => ({ type: 'buyer' }),
    },
  },
  
  clients_with_debt: {
    id: 'clients_with_debt',
    label: 'Clients with Debt',
    description: 'Clients with outstanding debt',
    icon: AlertCircle,
    color: 'text-red-600',
    format: 'count',
    category: 'financial',
    destination: {
      path: '/clients',
      getParams: () => ({ hasDebt: 'true' }),
    },
  },
  
  clients_new_month: {
    id: 'clients_new_month',
    label: 'New This Month',
    description: 'Clients added this month',
    icon: UserPlus,
    color: 'text-blue-600',
    format: 'count',
    category: 'analytical',
    destination: {
      path: '/clients',
      getParams: () => ({ period: 'current_month' }),
    },
  },
  
  clients_sellers: {
    id: 'clients_sellers',
    label: 'Sellers',
    description: 'Clients who are sellers',
    icon: Building,
    color: 'text-purple-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/clients',
      getParams: () => ({ type: 'seller' }),
    },
  },
  
  clients_brands: {
    id: 'clients_brands',
    label: 'Brands',
    description: 'Clients who are brands',
    icon: Tag,
    color: 'text-indigo-600',
    format: 'count',
    category: 'operational',
    destination: {
      path: '/clients',
      getParams: () => ({ type: 'brand' }),
    },
  },
  
  clients_total_debt: {
    id: 'clients_total_debt',
    label: 'Total Client Debt',
    description: 'Combined debt across all clients',
    icon: DollarSign,
    color: 'text-red-600',
    format: 'currency',
    category: 'financial',
    destination: {
      path: '/clients',
      getParams: () => ({ hasDebt: 'true', sortBy: 'debt', sortOrder: 'desc' }),
    },
  },
  
  clients_top_buyer: {
    id: 'clients_top_buyer',
    label: 'Top Buyer',
    description: 'Client with highest purchase volume',
    icon: TrendingUp,
    color: 'text-green-600',
    format: 'currency',
    category: 'analytical',
    destination: {
      path: '/clients',
      getParams: () => ({ sortBy: 'totalPurchases', sortOrder: 'desc' }),
    },
  },
};

// ============================================================================
// MODULE CONFIGURATIONS
// ============================================================================

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  inventory: {
    moduleId: 'inventory',
    moduleName: 'Inventory',
    defaultMetrics: [
      'inventory_total_value',
      'inventory_avg_value',
      'inventory_awaiting_intake',
      'inventory_low_stock',
    ],
    availableMetrics: [
      'inventory_total_value',
      'inventory_avg_value',
      'inventory_awaiting_intake',
      'inventory_low_stock',
      'inventory_quarantined',
      'inventory_on_hold',
      'inventory_total_units',
      'inventory_live_batches',
      'inventory_by_category',
      // 'inventory_expiring_soon', // DISABLED: expirationDate column doesn't exist
    ],
    maxCards: 4,
  },
  
  orders: {
    moduleId: 'orders',
    moduleName: 'Orders',
    defaultMetrics: [
      'orders_total',
      'orders_pending',
      'orders_packed',
      'orders_shipped',
    ],
    availableMetrics: [
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
    maxCards: 4,
  },
  
  accounting: {
    moduleId: 'accounting',
    moduleName: 'Accounting',
    defaultMetrics: [
      'accounting_cash',
      'accounting_ar',
      'accounting_ap',
      'accounting_net',
    ],
    availableMetrics: [
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
    maxCards: 4,
  },
  
  vendor_supply: {
    moduleId: 'vendor_supply',
    moduleName: 'Vendor Supply',
    defaultMetrics: [
      'vendor_available',
      'vendor_reserved',
      'vendor_total',
      'vendor_expiring',
    ],
    availableMetrics: [
      'vendor_available',
      'vendor_reserved',
      'vendor_total',
      'vendor_expiring',
      'vendor_purchased',
      'vendor_by_vendor',
      'vendor_total_value',
    ],
    maxCards: 4,
  },
  
  clients: {
    moduleId: 'clients',
    moduleName: 'Clients',
    defaultMetrics: [
      'clients_total',
      'clients_buyers',
      'clients_with_debt',
      'clients_new_month',
    ],
    availableMetrics: [
      'clients_total',
      'clients_buyers',
      'clients_with_debt',
      'clients_new_month',
      'clients_sellers',
      'clients_brands',
      'clients_total_debt',
      'clients_top_buyer',
    ],
    maxCards: 4,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getMetricConfig(metricId: string): MetricConfig | undefined {
  return METRIC_CONFIGS[metricId];
}

export function getModuleConfig(moduleId: string): ModuleConfig | undefined {
  return MODULE_CONFIGS[moduleId];
}

export function getMetricsForModule(moduleId: string): MetricConfig[] {
  const moduleConfig = MODULE_CONFIGS[moduleId];
  if (!moduleConfig) return [];
  
  return moduleConfig.availableMetrics
    .map(id => METRIC_CONFIGS[id])
    .filter(Boolean) as MetricConfig[];
}

export function getDefaultMetricsForModule(moduleId: string): MetricConfig[] {
  const moduleConfig = MODULE_CONFIGS[moduleId];
  if (!moduleConfig) return [];
  
  return moduleConfig.defaultMetrics
    .map(id => METRIC_CONFIGS[id])
    .filter(Boolean) as MetricConfig[];
}
