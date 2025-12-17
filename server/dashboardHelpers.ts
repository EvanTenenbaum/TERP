/**
 * Dashboard Helper Functions
 * Utility functions for dashboard data processing
 */

import * as clientsDb from "./clientsDb";
import type { Invoice, Payment } from "../drizzle/schema";
import { logger } from "./_core/logger";

/**
 * Fetch actual client names for customer IDs and return as a Map
 * Used to replace placeholder "Customer {id}" with actual names
 */
export async function fetchClientNamesMap(
  customerIds: number[]
): Promise<Map<number, string>> {
  const clientMap = new Map<number, string>();
  await Promise.all(
    customerIds.map(async (customerId) => {
      try {
        const client = await clientsDb.getClientById(customerId);
        if (client?.name) {
          clientMap.set(customerId, client.name);
        }
      } catch (error) {
        logger.error("Failed to fetch client", { customerId, error });
      }
    })
  );
  return clientMap;
}

/**
 * Calculate date range based on time period
 */
export function calculateDateRange(timePeriod: "LIFETIME" | "YEAR" | "QUARTER" | "MONTH"): {
  startDate: Date | undefined;
  endDate: Date | undefined;
} {
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  
  if (timePeriod !== "LIFETIME") {
    const now = new Date();
    endDate = new Date();
    
    if (timePeriod === "YEAR") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (timePeriod === "QUARTER") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
    } else if (timePeriod === "MONTH") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }
  
  return { startDate, endDate };
}

/**
 * Calculate sales comparison for different time periods
 */
export function calculateSalesComparison(
  allInvoices: Invoice[],
  now: Date
): {
  weekly: { last7Days: number; prior7Days: number };
  monthly: { last30Days: number; prior30Days: number };
  sixMonth: { last6Months: number; prior6Months: number };
  yearly: { last365: number; prior365: number };
} {
  const last7Days = new Date(now);
  last7Days.setDate(last7Days.getDate() - 7);
  const prior7Days = new Date(last7Days);
  prior7Days.setDate(prior7Days.getDate() - 7);
  
  const last30Days = new Date(now);
  last30Days.setDate(last30Days.getDate() - 30);
  const prior30Days = new Date(last30Days);
  prior30Days.setDate(prior30Days.getDate() - 30);
  
  const last6Months = new Date(now);
  last6Months.setMonth(last6Months.getMonth() - 6);
  const prior6Months = new Date(last6Months);
  prior6Months.setMonth(prior6Months.getMonth() - 6);
  
  const last365 = new Date(now);
  last365.setDate(last365.getDate() - 365);
  const prior365 = new Date(last365);
  prior365.setDate(prior365.getDate() - 365);
  
  const calculateSales = (start: Date, end: Date) => {
    return allInvoices
      .filter((i: Invoice) => {
        const date = new Date(i.invoiceDate);
        return date >= start && date < end;
      })
      .reduce((sum: number, i: Invoice) => sum + Number(i.totalAmount || 0), 0);
  };
  
  return {
    weekly: {
      last7Days: calculateSales(last7Days, now),
      prior7Days: calculateSales(prior7Days, last7Days),
    },
    monthly: {
      last30Days: calculateSales(last30Days, now),
      prior30Days: calculateSales(prior30Days, last30Days),
    },
    sixMonth: {
      last6Months: calculateSales(last6Months, now),
      prior6Months: calculateSales(prior6Months, last6Months),
    },
    yearly: {
      last365: calculateSales(last365, now),
      prior365: calculateSales(prior365, last365),
    },
  };
}
