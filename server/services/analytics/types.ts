/**
 * Analytics Service Types
 * Type definitions for analytics data structures
 */

/** Summary analytics data for dashboard */
export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalClients: number;
  totalInventoryItems: number;
}

/** Extended analytics with additional metrics */
export interface ExtendedAnalytics extends AnalyticsSummary {
  averageOrderValue: number;
  totalPaymentsReceived: number;
  outstandingBalance: number;
  profitMargin: number;
  growthRate: number;
  ordersThisPeriod: number;
  revenueThisPeriod: number;
  newClientsThisPeriod: number;
}

/** Client strain preference data */
export interface ClientStrainPreference {
  familyId: number;
  familyName: string;
  purchaseCount: number;
  totalQuantity: number;
  lastPurchaseDate: Date | null;
}

/** Top strain family data */
export interface TopStrainFamily {
  familyId: number;
  familyName: string;
  totalSales: number;
  orderCount: number;
}

/** Strain family trend data point */
export interface StrainFamilyTrend {
  month: string;
  sales: number;
  orderCount: number;
}

/** Revenue trend data point */
export interface RevenueTrend {
  period: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

/** Top client data */
export interface TopClient {
  clientId: number;
  clientName: string;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
}

/** Export data format */
export interface ExportData {
  filename: string;
  contentType: string;
  data: string;
}

/** Date range parameters */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}
