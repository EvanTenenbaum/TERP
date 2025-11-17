import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as arApDb from "../arApDb";
import * as dashboardDb from "../dashboardDb";
import * as inventoryDb from "../inventoryDb";
import { requirePermission } from "../_core/permissionMiddleware";
import type { Invoice, Payment } from "../../drizzle/schema";

// Type definitions for aggregated data
interface SalesByClient {
  customerId: number;
  customerName: string;
  totalSales: number;
}

interface CashByClient {
  customerId: number;
  customerName: string;
  cashCollected: number;
}

interface ClientDebt {
  customerId: number;
  customerName: string;
  currentDebt: number;
  oldestDebt: number;
}

interface ClientMargin {
  customerId: number;
  customerName: string;
  revenue: number;
  cost: number;
  profitMargin: number;
}

export const dashboardRouter = router({
    // Get real-time KPI data
    getKpis: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async () => {
        // Get inventory stats
        const inventoryStats = await inventoryDb.getDashboardStats();
        
        // Get accounting data
        const outstandingReceivables = await arApDb.getOutstandingReceivables();
        const paidInvoicesResult = await arApDb.getInvoices({ status: 'PAID' });
        
        // Calculate total revenue from paid invoices
        const paidInvoices = paidInvoicesResult.invoices || [];
        const totalRevenue = paidInvoices.reduce((sum: number, inv: Invoice) => sum + Number(inv.totalAmount || 0), 0);
        
        // Calculate active orders (non-paid invoices)
        const activeInvoicesResult = await arApDb.getInvoices({ status: 'SENT' });
        const activeOrders = activeInvoicesResult.invoices?.length || 0;
        
        // Calculate inventory value
        const inventoryValue = inventoryStats?.totalInventoryValue || 0;
        
        // Low stock count (estimate from status counts)
        const lowStockCount = 0; // TODO: Add low stock threshold logic
        
        return {
          totalRevenue,
          revenueChange: 0, // TODO: Calculate from previous period
          activeOrders,
          ordersChange: 0, // TODO: Calculate from previous period
          inventoryValue,
          inventoryChange: 0, // TODO: Calculate from previous period
          lowStockCount,
        };
      }),
    // Get user's widget layout
    getLayout: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.getUserWidgetLayout(ctx.user.id);
      }),

    // Save user's widget layout
    saveLayout: protectedProcedure.use(requirePermission("dashboard:read"))
      .input(z.object({
        widgets: z.array(z.object({
          widgetType: z.string(),
          position: z.number(),
          width: z.number(),
          height: z.number(),
          isVisible: z.boolean(),
          config: z.record(z.unknown()).optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.saveUserWidgetLayout(ctx.user.id, input.widgets);
      }),

    // Reset user's layout to role default
    resetLayout: protectedProcedure.use(requirePermission("dashboard:read"))
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.resetUserWidgetLayout(ctx.user.id);
      }),

    // Get role default layout (admin only)
    getRoleDefault: protectedProcedure.use(requirePermission("dashboard:read"))
      .input(z.object({
        role: z.enum(["user", "admin"]),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.getRoleDefaultLayout(input.role);
      }),

    // Save role default layout (admin only)
    saveRoleDefault: protectedProcedure.use(requirePermission("dashboard:read"))
      .input(z.object({
        role: z.enum(["user", "admin"]),
        widgets: z.array(z.object({
          widgetType: z.string(),
          position: z.number(),
          width: z.number(),
          height: z.number(),
          isVisible: z.boolean(),
          config: z.record(z.unknown()).optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.saveRoleDefaultLayout(input.role, input.widgets);
      }),

    // Get KPI configuration for user's role
    getKpiConfig: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.getRoleKpiConfig(ctx.user.role);
      }),

    // Save KPI configuration for a role (admin only)
    saveKpiConfig: protectedProcedure.use(requirePermission("dashboard:read"))
      .input(z.object({
        role: z.enum(["user", "admin"]),
        kpis: z.array(z.object({
          kpiType: z.string(),
          position: z.number(),
          isVisible: z.boolean(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.saveRoleKpiConfig(input.role, input.kpis);
      }),

    // Widget Data Endpoints
    
    // Sales by Client (with time period filter)
    getSalesByClient: protectedProcedure.use(requirePermission("dashboard:read"))
      .input(z.object({
        timePeriod: z.enum(["LIFETIME", "YEAR", "QUARTER", "MONTH"]).default("LIFETIME"),
      }))
      .query(async ({ input }) => {
        const invoices = await arApDb.getInvoices({});
        const allInvoices = invoices.invoices || [];
        
        // Group by customer and sum total sales
        const salesByClient = allInvoices.reduce((acc: Record<number, SalesByClient>, inv: Invoice) => {
          const customerId = inv.customerId;
          if (!acc[customerId]) {
            acc[customerId] = {
              customerId,
              customerName: `Customer ${customerId}`, // TODO: Join with customers table
              totalSales: 0,
            };
          }
          acc[customerId].totalSales += Number(inv.totalAmount || 0);
          return acc;
        }, {});
        
        return Object.values(salesByClient).sort((a: SalesByClient, b: SalesByClient) => b.totalSales - a.totalSales);
      }),

    // Cash Collected (24 months by client)
    getCashCollected: protectedProcedure.use(requirePermission("dashboard:read"))
      .input(z.object({
        months: z.number().default(24),
      }))
      .query(async ({ input }) => {
        const paymentsResult = await arApDb.getPayments({ paymentType: 'RECEIVED' });
        const allPayments = paymentsResult.payments || [];
        
        // Group by customer
        const cashByClient = allPayments.reduce((acc: Record<number, CashByClient>, pmt: Payment) => {
          const customerId = pmt.customerId;
          if (customerId) {
            if (!acc[customerId]) {
              acc[customerId] = {
                customerId,
                customerName: `Customer ${customerId}`,
                cashCollected: 0,
              };
            }
            acc[customerId].cashCollected += Number(pmt.amount || 0);
          }
          return acc;
        }, {});
        
        return Object.values(cashByClient).sort((a: CashByClient, b: CashByClient) => b.cashCollected - a.cashCollected);
      }),

    // Client Debt (current debt + aging)
    getClientDebt: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async () => {
        const receivablesResult = await arApDb.getOutstandingReceivables();
        const receivables = receivablesResult.invoices || [];
        const agingResult = await arApDb.calculateARAging();
        const aging = agingResult; // Aging returns the buckets directly
        
        // Combine debt and aging data
        return receivables.map((r: Invoice): ClientDebt => ({
          customerId: r.customerId,
          customerName: `Customer ${r.customerId}`,
          currentDebt: Number(r.amountDue || 0),
          oldestDebt: 0, // TODO: Calculate oldest invoice age from invoice dates
        }));
      }),

    // Client Profit Margin
    getClientProfitMargin: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async () => {
        const invoices = await arApDb.getInvoices({});
        const allInvoices = invoices.invoices || [];
        
        // Calculate profit margin by client (simplified)
        const marginByClient = allInvoices.reduce((acc: Record<number, Omit<ClientMargin, 'profitMargin'>>, inv: Invoice) => {
          const customerId = inv.customerId;
          if (!acc[customerId]) {
            acc[customerId] = {
              customerId,
              customerName: `Customer ${customerId}`,
              revenue: 0,
              cost: 0,
            };
          }
          acc[customerId].revenue += Number(inv.totalAmount || 0);
          // Simplified: assume 60% margin
          acc[customerId].cost += Number(inv.totalAmount || 0) * 0.4;
          return acc;
        }, {});
        
        return Object.values(marginByClient).map((c): ClientMargin => ({
          ...c,
          profitMargin: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
        })).sort((a: ClientMargin, b: ClientMargin) => b.profitMargin - a.profitMargin);
      }),

    // Transaction Snapshot (Today vs This Week)
    getTransactionSnapshot: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const invoices = await arApDb.getInvoices({});
        const paymentsResult = await arApDb.getPayments({ paymentType: 'RECEIVED' });
        const allInvoices = invoices.invoices || [];
        const allPayments = paymentsResult.payments || [];
        
        // Calculate today's metrics
        const todaySales = allInvoices
          .filter((i: Invoice) => new Date(i.invoiceDate) >= today)
          .reduce((sum: number, i: Invoice) => sum + Number(i.totalAmount || 0), 0);
        
        const todayCash = allPayments
          .filter((p: Payment) => new Date(p.paymentDate) >= today)
          .reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0);
        
        const todayUnits = allInvoices
          .filter((i: Invoice) => new Date(i.invoiceDate) >= today)
          .length;
        
        // Calculate this week's metrics
        const weekSales = allInvoices
          .filter((i: Invoice) => new Date(i.invoiceDate) >= weekAgo)
          .reduce((sum: number, i: Invoice) => sum + Number(i.totalAmount || 0), 0);
        
        const weekCash = allPayments
          .filter((p: Payment) => new Date(p.paymentDate) >= weekAgo)
          .reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0);
        
        const weekUnits = allInvoices
          .filter((i: Invoice) => new Date(i.invoiceDate) >= weekAgo)
          .length;
        
        return {
          today: { sales: todaySales, cashCollected: todayCash, unitsSold: todayUnits },
          thisWeek: { sales: weekSales, cashCollected: weekCash, unitsSold: weekUnits },
        };
      }),

    // Inventory Snapshot (by category)
    getInventorySnapshot: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async () => {
        const stats = await inventoryDb.getDashboardStats();
        return {
          totalUnits: stats?.totalUnits || 0,
          totalValue: stats?.totalInventoryValue || 0,
        };
      }),

    // Sales Time Period Comparison
    getSalesComparison: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async () => {
        const invoices = await arApDb.getInvoices({});
        const allInvoices = invoices.invoices || [];
        
        const now = new Date();
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
        
        const calculateSales = (start: Date, end: Date): number => {
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
      }),

    // Cash Flow (with time period filter)
    getCashFlow: protectedProcedure.use(requirePermission("dashboard:read"))
      .input(z.object({
        timePeriod: z.enum(["LIFETIME", "YEAR", "QUARTER", "MONTH"]).default("LIFETIME"),
      }))
      .query(async ({ input }) => {
        const receivedPaymentsResult = await arApDb.getPayments({ paymentType: 'RECEIVED' });
        const sentPaymentsResult = await arApDb.getPayments({ paymentType: 'SENT' });
        
        const cashCollected = (receivedPaymentsResult.payments || []).reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0);
        const cashSpent = (sentPaymentsResult.payments || []).reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0);
        
        return {
          cashCollected,
          cashSpent,
          netCashFlow: cashCollected - cashSpent,
        };
      }),

    // Total Debt (AR vs AP)
    getTotalDebt: protectedProcedure.use(requirePermission("dashboard:read"))
      .query(async () => {
        const receivablesResult = await arApDb.getOutstandingReceivables();
        const payablesResult = await arApDb.getOutstandingPayables();
        
        const receivables = receivablesResult.invoices || [];
        const payables = payablesResult.bills || [];
        
        const totalAR = receivables.reduce((sum: number, r: Invoice) => sum + Number(r.amountDue || 0), 0);
        const totalAP = payables.reduce((sum: number, p: Invoice) => sum + Number(p.amountDue || 0), 0);
        
        return {
          totalDebtOwedToMe: totalAR,
          totalDebtIOwevVendors: totalAP,
          netPosition: totalAR - totalAP,
        };
      }),
  })
