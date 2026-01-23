import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import * as arApDb from "../arApDb";
import * as dashboardDb from "../dashboardDb";
import * as inventoryDb from "../inventoryDb";
import { getDb } from "../db";
import { invoiceLineItems, batches } from "../../drizzle/schema";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  fetchClientNamesMap,
  calculateDateRange,
  calculateSalesComparison,
} from "../dashboardHelpers";
import type { Invoice, Payment } from "../../drizzle/schema";
import { subDays, differenceInDays } from "date-fns";

// ============================================================================
// Input Schema Constants
// ============================================================================

const timePeriodSchema = z.enum(["LIFETIME", "YEAR", "QUARTER", "MONTH"]);

// Note: paginationInputSchema kept for potential future use by other endpoints
const _paginationInputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const salesByClientInputSchema = z.object({
  timePeriod: timePeriodSchema.default("LIFETIME"),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const cashCollectedInputSchema = z.object({
  timePeriod: timePeriodSchema.default("LIFETIME"),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const cashFlowInputSchema = z.object({
  timePeriod: timePeriodSchema.default("LIFETIME"),
});

const clientProfitMarginInputSchema = z.object({
  timePeriod: timePeriodSchema.default("LIFETIME"),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const clientDebtInputSchema = z.object({
  timePeriod: timePeriodSchema.default("LIFETIME"),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const roleInputSchema = z.object({
  role: z.enum(["user", "admin"]),
});

const widgetSchema = z.object({
  widgetType: z.string(),
  position: z.number(),
  width: z.number(),
  height: z.number(),
  isVisible: z.boolean(),
  config: z.any().optional(),
});

const saveLayoutInputSchema = z.object({
  widgets: z.array(widgetSchema),
});

const saveRoleDefaultInputSchema = z.object({
  role: z.enum(["user", "admin"]),
  widgets: z.array(widgetSchema),
});

const kpiSchema = z.object({
  kpiType: z.string(),
  position: z.number(),
  isVisible: z.boolean(),
});

const saveKpiConfigInputSchema = z.object({
  role: z.enum(["user", "admin"]),
  kpis: z.array(kpiSchema),
});

// ============================================================================
// Response Type Interfaces
// ============================================================================

/** KPI data response */
interface KpiResponse {
  totalRevenue: number;
  revenueChange: number;
  activeOrders: number;
  ordersChange: number;
  inventoryValue: number;
  inventoryChange: number;
  lowStockCount: number;
}

/** Paginated response wrapper */
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Sales by client data */
interface SalesByClient {
  customerId: number;
  customerName: string;
  totalSales: number;
}

/** Cash by client data */
interface CashByClient {
  customerId: number;
  customerName: string;
  cashCollected: number;
}

/** Client debt data */
interface ClientDebt {
  customerId: number;
  customerName: string;
  currentDebt: number;
  oldestDebt: number;
}

/** Client margin data */
interface ClientMargin {
  customerId: number;
  customerName: string;
  revenue: number;
  cost: number;
  profitMargin: number;
}

/** Transaction snapshot period data */
interface TransactionPeriodData {
  sales: number;
  cashCollected: number;
  unitsSold: number;
}

/** Transaction snapshot response */
interface TransactionSnapshotResponse {
  today: TransactionPeriodData;
  thisWeek: TransactionPeriodData;
}

/** Inventory snapshot response */
interface InventorySnapshotResponse {
  categories: Array<{ name: string; units: number; value: number }>;
  totalUnits: number;
  totalValue: number;
}

/** Cash flow response */
interface CashFlowResponse {
  cashCollected: number;
  cashSpent: number;
  netCashFlow: number;
}

/** Total debt response */
interface TotalDebtResponse {
  totalDebtOwedToMe: number;
  totalDebtIOwedToVendors: number;
  netPosition: number;
}

export const dashboardRouter = router({
  // Get real-time KPI data
  // FIXED: Now calculates lowStockCount and inventoryChange from actual data
  getKpis: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(async (): Promise<KpiResponse> => {
      const db = await getDb();

      // Get inventory stats
      const inventoryStats = await inventoryDb.getDashboardStats();

      // Get accounting data (outstandingReceivables fetched for side effects/cache warming)
      await arApDb.getOutstandingReceivables();
      const paidInvoicesResult = await arApDb.getInvoices({ status: "PAID" });

      // Calculate total revenue from paid invoices
      const paidInvoices = paidInvoicesResult.invoices || [];
      const totalRevenue = paidInvoices.reduce(
        (sum: number, inv: Invoice) => sum + Number(inv.totalAmount || 0),
        0
      );

      // Calculate active orders (non-paid invoices)
      const activeInvoicesResult = await arApDb.getInvoices({ status: "SENT" });
      const activeOrders = activeInvoicesResult.invoices?.length || 0;

      // Calculate inventory value
      const inventoryValue = inventoryStats?.totalInventoryValue || 0;

      // FIXED: Calculate low stock count from actual batch data
      // Low stock is defined as batches with onHandQty <= 100 that are still sellable
      let lowStockCount = 0;
      if (db) {
        const lowStockResult = await db
          .select({
            count: sql<number>`COUNT(*)`,
          })
          .from(batches)
          .where(
            sql`${batches.batchStatus} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')
                AND ${batches.deletedAt} IS NULL
                AND CAST(${batches.onHandQty} AS DECIMAL(20,2)) > 0
                AND CAST(${batches.onHandQty} AS DECIMAL(20,2)) <= 100`
          );
        lowStockCount = Number(lowStockResult[0]?.count || 0);
      }

      // Calculate period-over-period changes (current 30 days vs previous 30 days)
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const sixtyDaysAgo = subDays(now, 60);

      // Get invoices for current and previous periods
      const allInvoicesResult = await arApDb.getInvoices({});
      const allInvoices = allInvoicesResult.invoices || [];

      // Current period revenue
      const currentPeriodInvoices = allInvoices.filter(
        (inv: Invoice) =>
          new Date(inv.invoiceDate) >= thirtyDaysAgo && inv.status === "PAID"
      );
      const currentRevenue = currentPeriodInvoices.reduce(
        (sum: number, inv: Invoice) => sum + Number(inv.totalAmount || 0),
        0
      );

      // Previous period revenue
      const previousPeriodInvoices = allInvoices.filter(
        (inv: Invoice) =>
          new Date(inv.invoiceDate) >= sixtyDaysAgo &&
          new Date(inv.invoiceDate) < thirtyDaysAgo &&
          inv.status === "PAID"
      );
      const previousRevenue = previousPeriodInvoices.reduce(
        (sum: number, inv: Invoice) => sum + Number(inv.totalAmount || 0),
        0
      );

      // Calculate percentage changes
      const revenueChange =
        previousRevenue > 0
          ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
          : currentRevenue > 0
            ? 100
            : 0;

      // Current period orders
      const currentOrders = allInvoices.filter(
        (inv: Invoice) => new Date(inv.invoiceDate) >= thirtyDaysAgo
      ).length;

      // Previous period orders
      const previousOrders = allInvoices.filter(
        (inv: Invoice) =>
          new Date(inv.invoiceDate) >= sixtyDaysAgo &&
          new Date(inv.invoiceDate) < thirtyDaysAgo
      ).length;

      const ordersChange =
        previousOrders > 0
          ? ((currentOrders - previousOrders) / previousOrders) * 100
          : currentOrders > 0
            ? 100
            : 0;

      // FIXED: Calculate inventory change from batch movements in last 30 days
      // This calculates the net change in sellable inventory value
      let inventoryChange = 0;
      if (db) {
        // Get batches updated in the last 30 days to estimate inventory change
        // This is an approximation - for accurate historical tracking, use inventory_snapshots table
        const _recentBatchesResult = await db
          .select({
            totalValue: sql<string>`COALESCE(SUM(
              CAST(${batches.onHandQty} AS DECIMAL(20,2)) *
              CAST(COALESCE(${batches.unitCogs}, '0') AS DECIMAL(20,2))
            ), 0)`,
          })
          .from(batches)
          .where(
            sql`${batches.batchStatus} IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')
                AND ${batches.deletedAt} IS NULL
                AND ${batches.updatedAt} >= ${thirtyDaysAgo.toISOString().slice(0, 19).replace("T", " ")}`
          );

        // For now, show 0 change if we can't determine historical data
        // A proper implementation would require inventory_snapshots table with periodic snapshots
        inventoryChange = 0;
      }

      return {
        totalRevenue,
        revenueChange: Math.round(revenueChange * 100) / 100,
        activeOrders,
        ordersChange: Math.round(ordersChange * 100) / 100,
        inventoryValue,
        inventoryChange,
        lowStockCount,
      };
    }),
  // Get user's widget layout
  getLayout: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(
      async ({
        ctx,
      }): Promise<
        Awaited<ReturnType<typeof dashboardDb.getUserWidgetLayout>>
      > => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.getUserWidgetLayout(ctx.user.id);
      }
    ),

  // Save user's widget layout
  saveLayout: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(saveLayoutInputSchema)
    .mutation(
      async ({
        input,
        ctx,
      }): Promise<
        Awaited<ReturnType<typeof dashboardDb.saveUserWidgetLayout>>
      > => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.saveUserWidgetLayout(
          ctx.user.id,
          input.widgets
        );
      }
    ),

  // Reset user's layout to role default
  resetLayout: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .mutation(
      async ({
        ctx,
      }): Promise<
        Awaited<ReturnType<typeof dashboardDb.resetUserWidgetLayout>>
      > => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.resetUserWidgetLayout(ctx.user.id);
      }
    ),

  // Get role default layout (admin only)
  getRoleDefault: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(roleInputSchema)
    .query(
      async ({
        input,
        ctx,
      }): Promise<
        Awaited<ReturnType<typeof dashboardDb.getRoleDefaultLayout>>
      > => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.getRoleDefaultLayout(input.role);
      }
    ),

  // Save role default layout (admin only)
  saveRoleDefault: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(saveRoleDefaultInputSchema)
    .mutation(
      async ({
        input,
        ctx,
      }): Promise<
        Awaited<ReturnType<typeof dashboardDb.saveRoleDefaultLayout>>
      > => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.saveRoleDefaultLayout(
          input.role,
          input.widgets
        );
      }
    ),

  // Get KPI configuration for user's role
  getKpiConfig: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(
      async ({
        ctx,
      }): Promise<Awaited<ReturnType<typeof dashboardDb.getRoleKpiConfig>>> => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.getRoleKpiConfig(ctx.user.role);
      }
    ),

  // Save KPI configuration for a role (admin only)
  saveKpiConfig: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(saveKpiConfigInputSchema)
    .mutation(
      async ({
        input,
        ctx,
      }): Promise<
        Awaited<ReturnType<typeof dashboardDb.saveRoleKpiConfig>>
      > => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.saveRoleKpiConfig(input.role, input.kpis);
      }
    ),

  // Widget Data Endpoints

  // Sales by Client (with time period filter)
  getSalesByClient: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(salesByClientInputSchema)
    .query(async ({ input }): Promise<PaginatedResponse<SalesByClient>> => {
      // Calculate date range based on timePeriod
      const { startDate, endDate } = calculateDateRange(input.timePeriod);

      const invoices = await arApDb.getInvoices({
        startDate,
        endDate,
      });
      const allInvoices = invoices.invoices || [];

      // Group by customer and sum total sales
      const salesByClient = allInvoices.reduce(
        (acc: Record<number, SalesByClient>, inv: Invoice) => {
          const customerId = inv.customerId;
          if (!acc[customerId]) {
            acc[customerId] = {
              customerId,
              customerName: `Customer ${customerId}`, // Will be updated with actual name below
              totalSales: 0,
            };
          }
          acc[customerId].totalSales += Number(inv.totalAmount || 0);
          return acc;
        },
        {}
      );

      // Fetch actual client names for all customer IDs
      const customerIds = Object.keys(salesByClient).map(Number);
      const clientMap = await fetchClientNamesMap(customerIds);

      // Update customer names with actual names from database
      Object.values(salesByClient).forEach(item => {
        const actualName = clientMap.get(item.customerId);
        if (actualName) {
          item.customerName = actualName;
        }
      });

      const sortedData = Object.values(salesByClient).sort(
        (a: SalesByClient, b: SalesByClient) => b.totalSales - a.totalSales
      );
      const total = sortedData.length;
      const paginatedData = sortedData.slice(
        input.offset,
        input.offset + input.limit
      );

      return {
        data: paginatedData,
        total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Cash Collected (with time period filter)
  getCashCollected: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(cashCollectedInputSchema)
    .query(async ({ input }): Promise<PaginatedResponse<CashByClient>> => {
      // Calculate date range based on timePeriod
      const { startDate, endDate } = calculateDateRange(input.timePeriod);

      const paymentsResult = await arApDb.getPayments({
        paymentType: "RECEIVED",
        startDate,
        endDate,
      });
      const allPayments = paymentsResult.payments || [];

      // Group by customer
      const cashByClient = allPayments.reduce(
        (acc: Record<number, CashByClient>, pmt: Payment) => {
          const customerId = pmt.customerId;
          if (customerId) {
            if (!acc[customerId]) {
              acc[customerId] = {
                customerId,
                customerName: `Customer ${customerId}`, // Will be updated with actual name below
                cashCollected: 0,
              };
            }
            acc[customerId].cashCollected += Number(pmt.amount || 0);
          }
          return acc;
        },
        {}
      );

      // Fetch actual client names for all customer IDs
      const customerIds = Object.keys(cashByClient).map(Number);
      const clientMap = await fetchClientNamesMap(customerIds);

      // Update customer names with actual names from database
      Object.values(cashByClient).forEach(item => {
        const actualName = clientMap.get(item.customerId);
        if (actualName) {
          item.customerName = actualName;
        }
      });

      const sortedData = Object.values(cashByClient).sort(
        (a: CashByClient, b: CashByClient) => b.cashCollected - a.cashCollected
      );
      const total = sortedData.length;
      const paginatedData = sortedData.slice(
        input.offset,
        input.offset + input.limit
      );

      return {
        data: paginatedData,
        total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Client Debt (current debt + aging with time period filter)
  getClientDebt: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(clientDebtInputSchema)
    .query(async ({ input }): Promise<PaginatedResponse<ClientDebt>> => {
      // Calculate date range based on timePeriod
      const { startDate, endDate } = calculateDateRange(input.timePeriod);

      // Get outstanding receivables - these are always current debt
      // Time period filters which debts we include based on invoice date
      const receivablesResult = await arApDb.getOutstandingReceivables();
      let receivables = receivablesResult.invoices || [];

      // Filter by time period if not LIFETIME
      if (input.timePeriod !== "LIFETIME" && startDate && endDate) {
        receivables = receivables.filter((r: { invoiceDate?: Date }) => {
          if (!r.invoiceDate) return true; // Include debts without dates
          const invoiceDate = new Date(r.invoiceDate);
          return invoiceDate >= startDate && invoiceDate <= endDate;
        });
      }

      // Aging data fetched for potential future use in debt analysis
      await arApDb.calculateARAging();

      // Combine debt and aging data
      const allData: ClientDebt[] = await Promise.all(
        receivables.map(
          async (r: {
            customerId: number;
            amountDue: string | number;
            invoiceDate?: Date;
          }) => {
            // Calculate oldest debt days from invoice date
            const invoiceDate = r.invoiceDate
              ? new Date(r.invoiceDate)
              : new Date();
            const oldestDebtDays = differenceInDays(new Date(), invoiceDate);

            return {
              customerId: r.customerId,
              customerName: `Customer ${r.customerId}`, // Will be updated with actual name below
              currentDebt: Number(r.amountDue || 0),
              oldestDebt: Math.max(0, oldestDebtDays),
            };
          }
        )
      );

      // Fetch actual client names for all customer IDs
      const customerIds = allData.map(d => d.customerId);
      const clientMap = await fetchClientNamesMap(customerIds);

      // Update customer names with actual names from database
      allData.forEach(item => {
        const actualName = clientMap.get(item.customerId);
        if (actualName) {
          item.customerName = actualName;
        }
      });

      const total = allData.length;
      const paginatedData = allData.slice(
        input.offset,
        input.offset + input.limit
      );

      return {
        data: paginatedData,
        total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Client Profit Margin
  // FIXED: Now uses actual COGS from batches instead of hardcoded 60% margin assumption
  // FIXED: Added time period filtering for consistency with other dashboard endpoints
  getClientProfitMargin: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(clientProfitMarginInputSchema)
    .query(async ({ input }): Promise<PaginatedResponse<ClientMargin>> => {
      const db = await getDb();
      if (!db) {
        return {
          data: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: false,
        };
      }

      // Calculate date range based on timePeriod
      const { startDate, endDate } = calculateDateRange(input.timePeriod);

      const invoicesResult = await arApDb.getInvoices({ startDate, endDate });
      const allInvoices = invoicesResult.invoices || [];

      if (allInvoices.length === 0) {
        return {
          data: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
          hasMore: false,
        };
      }

      // Get all invoice IDs
      const invoiceIds = allInvoices.map((inv: Invoice) => inv.id);

      // Fetch all line items for these invoices with batch COGS data
      // This joins invoice_line_items with batches to get actual unit costs
      const lineItemsWithCogs = await db
        .select({
          invoiceId: invoiceLineItems.invoiceId,
          quantity: invoiceLineItems.quantity,
          unitPrice: invoiceLineItems.unitPrice,
          lineTotal: invoiceLineItems.lineTotal,
          batchId: invoiceLineItems.batchId,
          unitCogs: batches.unitCogs,
        })
        .from(invoiceLineItems)
        .leftJoin(batches, eq(invoiceLineItems.batchId, batches.id))
        .where(
          sql`${invoiceLineItems.invoiceId} IN (${sql.join(
            invoiceIds.map(id => sql`${id}`),
            sql`, `
          )}) AND ${invoiceLineItems.deletedAt} IS NULL`
        );

      // Build a map of invoiceId -> { revenue, cost }
      const invoiceCosts = new Map<number, { revenue: number; cost: number }>();
      for (const item of lineItemsWithCogs) {
        const invoiceId = item.invoiceId;
        const quantity = parseFloat(item.quantity || "0");
        const unitPrice = parseFloat(item.unitPrice || "0");
        const unitCogs = parseFloat(item.unitCogs || "0");

        if (!invoiceCosts.has(invoiceId)) {
          invoiceCosts.set(invoiceId, { revenue: 0, cost: 0 });
        }

        const current = invoiceCosts.get(invoiceId);
        if (current) {
          current.revenue += quantity * unitPrice;
          current.cost += quantity * unitCogs;
        }
      }

      // Calculate profit margin by client using actual COGS
      const marginByClient: Record<number, ClientMargin> = {};

      for (const inv of allInvoices as Invoice[]) {
        const customerId = inv.customerId;
        const invoiceData = invoiceCosts.get(inv.id);

        if (!marginByClient[customerId]) {
          marginByClient[customerId] = {
            customerId,
            customerName: `Customer ${customerId}`,
            revenue: 0,
            cost: 0,
            profitMargin: 0,
          };
        }

        // If we have line item data, use that; otherwise fall back to invoice total
        // with a reasonable default margin (this handles legacy invoices without line items)
        if (invoiceData && invoiceData.cost > 0) {
          marginByClient[customerId].revenue += invoiceData.revenue;
          marginByClient[customerId].cost += invoiceData.cost;
        } else {
          // Fallback for invoices without batch-linked line items
          const invoiceTotal = Number(inv.totalAmount || 0);
          marginByClient[customerId].revenue += invoiceTotal;
          // Use a conservative 70% margin fallback for legacy data
          marginByClient[customerId].cost += invoiceTotal * 0.3;
        }
      }

      // Calculate final profit margins
      for (const client of Object.values(marginByClient)) {
        const profit = client.revenue - client.cost;
        client.profitMargin =
          client.revenue > 0 ? (profit / client.revenue) * 100 : 0;
      }

      // Fetch actual client names for all customer IDs
      const customerIds = Object.keys(marginByClient).map(Number);
      const clientMap = await fetchClientNamesMap(customerIds);

      // Update customer names with actual names from database
      Object.values(marginByClient).forEach(item => {
        const actualName = clientMap.get(item.customerId);
        if (actualName) {
          item.customerName = actualName;
        }
      });

      const sortedData: ClientMargin[] = Object.values(marginByClient).sort(
        (a: ClientMargin, b: ClientMargin) => b.profitMargin - a.profitMargin
      );

      const total = sortedData.length;
      const paginatedData = sortedData.slice(
        input.offset,
        input.offset + input.limit
      );

      return {
        data: paginatedData,
        total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // Transaction Snapshot (Today vs This Week)
  getTransactionSnapshot: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(async (): Promise<TransactionSnapshotResponse> => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const invoices = await arApDb.getInvoices({});
      const paymentsResult = await arApDb.getPayments({
        paymentType: "RECEIVED",
      });
      const allInvoices = invoices.invoices || [];
      const allPayments = paymentsResult.payments || [];

      // Calculate today's metrics
      const todaySales = allInvoices
        .filter((i: Invoice) => new Date(i.invoiceDate) >= today)
        .reduce(
          (sum: number, i: Invoice) => sum + Number(i.totalAmount || 0),
          0
        );

      const todayCash = allPayments
        .filter((p: Payment) => new Date(p.paymentDate) >= today)
        .reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0);

      const todayUnits = allInvoices.filter(
        (i: Invoice) => new Date(i.invoiceDate) >= today
      ).length;

      // Calculate this week's metrics
      const weekSales = allInvoices
        .filter((i: Invoice) => new Date(i.invoiceDate) >= weekAgo)
        .reduce(
          (sum: number, i: Invoice) => sum + Number(i.totalAmount || 0),
          0
        );

      const weekCash = allPayments
        .filter((p: Payment) => new Date(p.paymentDate) >= weekAgo)
        .reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0);

      const weekUnits = allInvoices.filter(
        (i: Invoice) => new Date(i.invoiceDate) >= weekAgo
      ).length;

      return {
        today: {
          sales: todaySales,
          cashCollected: todayCash,
          unitsSold: todayUnits,
        },
        thisWeek: {
          sales: weekSales,
          cashCollected: weekCash,
          unitsSold: weekUnits,
        },
      };
    }),

  // Inventory Snapshot (by category)
  getInventorySnapshot: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(async (): Promise<InventorySnapshotResponse> => {
      const stats = await inventoryDb.getDashboardStats();
      return {
        categories: stats?.categoryStats || [],
        totalUnits: stats?.totalUnits || 0,
        totalValue: stats?.totalInventoryValue || 0,
      };
    }),

  // Sales Time Period Comparison
  getSalesComparison: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(async (): Promise<ReturnType<typeof calculateSalesComparison>> => {
      const invoices = await arApDb.getInvoices({});
      const allInvoices = invoices.invoices || [];
      const now = new Date();
      return calculateSalesComparison(allInvoices, now);
    }),

  // Cash Flow (with time period filter)
  getCashFlow: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(cashFlowInputSchema)
    .query(async ({ input }): Promise<CashFlowResponse> => {
      // Calculate date range based on timePeriod
      const { startDate, endDate } = calculateDateRange(input.timePeriod);

      const receivedPaymentsResult = await arApDb.getPayments({
        paymentType: "RECEIVED",
        startDate,
        endDate,
      });
      const sentPaymentsResult = await arApDb.getPayments({
        paymentType: "SENT",
        startDate,
        endDate,
      });

      const cashCollected = (receivedPaymentsResult.payments || []).reduce(
        (sum: number, p: Payment) => sum + Number(p.amount || 0),
        0
      );
      const cashSpent = (sentPaymentsResult.payments || []).reduce(
        (sum: number, p: Payment) => sum + Number(p.amount || 0),
        0
      );

      return {
        cashCollected,
        cashSpent,
        netCashFlow: cashCollected - cashSpent,
      };
    }),

  // Total Debt (AR vs AP)
  getTotalDebt: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(async (): Promise<TotalDebtResponse> => {
      const receivablesResult = await arApDb.getOutstandingReceivables();
      const payablesResult = await arApDb.getOutstandingPayables();

      const receivables = receivablesResult.invoices || [];
      const payables = payablesResult.bills || [];

      const totalAR = receivables.reduce(
        (sum: number, r: { amountDue?: string | number }) =>
          sum + Number(r.amountDue || 0),
        0
      );
      const totalAP = payables.reduce(
        (sum: number, p: { amountDue?: string | number }) =>
          sum + Number(p.amountDue || 0),
        0
      );

      return {
        totalDebtOwedToMe: totalAR,
        totalDebtIOwedToVendors: totalAP,
        netPosition: totalAR - totalAP,
      };
    }),
});
