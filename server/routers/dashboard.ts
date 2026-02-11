import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as arApDb from "../arApDb";
import * as dashboardDb from "../dashboardDb";
import * as inventoryDb from "../inventoryDb";
import * as ordersDb from "../ordersDb";
import * as payablesService from "../services/payablesService";
import { getDb } from "../db";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  fetchClientNamesMap,
  calculateDateRange,
  calculateSalesComparison,
} from "../dashboardHelpers";
import { logger } from "../_core/logger";
import {
  batches,
  clients,
  lots,
  paymentHistory,
  sales as salesTable,
  type Invoice,
  type Payment,
} from "../../drizzle/schema";
import { subDays, differenceInDays } from "date-fns";
import { and, eq, inArray, sql } from "drizzle-orm";

// ============================================================================
// Input Schema Constants
// ============================================================================

const timePeriodSchema = z.enum(["LIFETIME", "YEAR", "QUARTER", "MONTH"]);

const paginationInputSchema = z.object({
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const salesByClientInputSchema = z.object({
  timePeriod: timePeriodSchema.default("LIFETIME"),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const cashCollectedInputSchema = z.object({
  months: z.number().default(24),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const cashFlowInputSchema = z.object({
  timePeriod: timePeriodSchema.default("LIFETIME"),
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

/** Vendor payment risk data */
interface VendorNeedingPayment {
  vendorClientId: number;
  vendorName: string;
  amountDue: number;
  soldOutBatches: number;
  oldestDueDays: number;
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

function isMissingTableError(
  error: unknown,
  tableHints: string[] = []
): boolean {
  const errorObj = error as Record<string, unknown> | null;
  const code = String(errorObj?.code ?? errorObj?.errno ?? "");
  const message = String(errorObj?.message ?? "").toLowerCase();

  const missingTableSignal =
    code === "1146" ||
    code === "ER_NO_SUCH_TABLE" ||
    message.includes("er_no_such_table") ||
    (message.includes("table") &&
      (message.includes("doesn't exist") ||
        message.includes("does not exist")));

  if (!missingTableSignal) return false;
  if (tableHints.length === 0) return true;

  return tableHints.some(hint => message.includes(hint.toLowerCase()));
}

/**
 * Legacy fallback for environments where vendor_payables is not yet present.
 * Uses existing sold-out consignment batches + sales + paymentHistory to infer
 * vendors still owed money.
 */
async function getLegacyVendorsNeedingPayment(): Promise<
  VendorNeedingPayment[]
> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  const soldOutRows = await db
    .select({
      batchId: batches.id,
      vendorClientId: lots.supplierClientId,
      vendorName: clients.name,
      unitCogs: batches.unitCogs,
      batchAmountPaid: batches.amountPaid,
      batchUpdatedAt: batches.updatedAt,
      batchCreatedAt: batches.createdAt,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .leftJoin(clients, eq(lots.supplierClientId, clients.id))
    .where(
      and(
        sql`${batches.deletedAt} IS NULL`,
        eq(batches.ownershipType, "CONSIGNED"),
        sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) <= 0`,
        sql`${lots.supplierClientId} IS NOT NULL`
      )
    );

  if (!soldOutRows.length) {
    return [];
  }

  const batchIds = soldOutRows.map(row => row.batchId);

  const salesByBatch = new Map<
    number,
    { soldQty: number; lastSaleDate: Date | null }
  >();
  try {
    const salesRows = await db
      .select({
        batchId: salesTable.batchId,
        soldQty: sql<string>`COALESCE(SUM(CAST(${salesTable.quantity} AS DECIMAL(15,4))), 0)`,
        lastSaleDate: sql<Date | null>`MAX(${salesTable.saleDate})`,
      })
      .from(salesTable)
      .where(
        and(
          inArray(salesTable.batchId, batchIds),
          sql`${salesTable.deletedAt} IS NULL`
        )
      )
      .groupBy(salesTable.batchId);

    salesRows.forEach(row => {
      salesByBatch.set(Number(row.batchId), {
        soldQty: Number(row.soldQty || 0),
        lastSaleDate: row.lastSaleDate ? new Date(row.lastSaleDate) : null,
      });
    });
  } catch (error) {
    if (!isMissingTableError(error, ["sales"])) {
      throw error;
    }

    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "[Dashboard] sales table missing while computing legacy vendors needing payment"
    );
  }

  const paymentsByBatchVendor = new Map<string, number>();
  try {
    const paymentRows = await db
      .select({
        batchId: paymentHistory.batchId,
        vendorClientId: paymentHistory.vendorId,
        amountPaid: sql<string>`COALESCE(SUM(CAST(${paymentHistory.amount} AS DECIMAL(15,2))), 0)`,
      })
      .from(paymentHistory)
      .where(
        and(
          inArray(paymentHistory.batchId, batchIds),
          sql`${paymentHistory.deletedAt} IS NULL`
        )
      )
      .groupBy(paymentHistory.batchId, paymentHistory.vendorId);

    paymentRows.forEach(row => {
      const key = `${Number(row.batchId)}:${Number(row.vendorClientId)}`;
      paymentsByBatchVendor.set(key, Number(row.amountPaid || 0));
    });
  } catch (error) {
    if (!isMissingTableError(error, ["paymenthistory", "payment_history"])) {
      throw error;
    }

    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "[Dashboard] payment history table missing while computing legacy vendors needing payment"
    );
  }

  const byVendor = soldOutRows.reduce(
    (acc: Record<number, VendorNeedingPayment>, row) => {
      const vendorClientId = Number(row.vendorClientId);
      if (!vendorClientId) return acc;

      const soldQty = salesByBatch.get(row.batchId)?.soldQty || 0;
      if (soldQty <= 0) return acc;

      const estimatedTotal = soldQty * Number(row.unitCogs || 0);
      const paidKey = `${row.batchId}:${vendorClientId}`;
      const historicalPaid =
        paymentsByBatchVendor.get(paidKey) ?? Number(row.batchAmountPaid || 0);
      const amountDue = Math.max(0, estimatedTotal - historicalPaid);
      if (amountDue <= 0) return acc;

      const referenceDate =
        salesByBatch.get(row.batchId)?.lastSaleDate ||
        (row.batchUpdatedAt ? new Date(row.batchUpdatedAt) : null) ||
        (row.batchCreatedAt ? new Date(row.batchCreatedAt) : null) ||
        now;
      const dueDays = Math.max(0, differenceInDays(now, referenceDate));

      if (!acc[vendorClientId]) {
        acc[vendorClientId] = {
          vendorClientId,
          vendorName: row.vendorName || `Vendor ${vendorClientId}`,
          amountDue: 0,
          soldOutBatches: 0,
          oldestDueDays: 0,
        };
      }

      acc[vendorClientId].amountDue += amountDue;
      acc[vendorClientId].soldOutBatches += 1;
      acc[vendorClientId].oldestDueDays = Math.max(
        acc[vendorClientId].oldestDueDays,
        dueDays
      );

      return acc;
    },
    {}
  );

  return Object.values(byVendor).sort((a, b) => {
    if (b.amountDue !== a.amountDue) {
      return b.amountDue - a.amountDue;
    }
    return b.oldestDueDays - a.oldestDueDays;
  });
}

export const dashboardRouter = router({
  // Get real-time KPI data
  getKpis: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .query(async (): Promise<KpiResponse> => {
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

      // Calculate low stock count (batches with quantity <= 100)
      // Note: lowStockCount is not returned by getDashboardStats, calculate from statusCounts
      const lowStockCount = 0; // Would need separate query for low stock threshold

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

      // Inventory change (simplified - would need historical data for accurate calculation)
      const inventoryChange = 0; // Would require historical inventory snapshots

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

  // Cash Collected (24 months by client)
  getCashCollected: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(cashCollectedInputSchema)
    .query(async ({ input }): Promise<PaginatedResponse<CashByClient>> => {
      const paymentsResult = await arApDb.getPayments({
        paymentType: "RECEIVED",
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

  // Client Debt (current debt + aging)
  getClientDebt: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(paginationInputSchema)
    .query(async ({ input }): Promise<PaginatedResponse<ClientDebt>> => {
      const receivablesResult = await arApDb.getOutstandingReceivables();
      const receivables = receivablesResult.invoices || [];
      // Aging data fetched for potential future use in debt analysis
      await arApDb.calculateARAging();

      // Aggregate receivables by customer so each client appears once.
      const debtByClient = receivables.reduce(
        (
          acc: Record<
            number,
            { currentDebt: number; oldestDebt: number; customerId: number }
          >,
          r: {
            customerId: number;
            amountDue: string | number;
            invoiceDate?: Date;
          }
        ) => {
          const customerId = Number(r.customerId);
          if (!customerId) return acc;

          const amountDue = Number(r.amountDue || 0);
          const invoiceDate = r.invoiceDate
            ? new Date(r.invoiceDate)
            : new Date();
          const debtAgeDays = Math.max(
            0,
            differenceInDays(new Date(), invoiceDate)
          );

          if (!acc[customerId]) {
            acc[customerId] = {
              customerId,
              currentDebt: 0,
              oldestDebt: 0,
            };
          }

          acc[customerId].currentDebt += amountDue;
          acc[customerId].oldestDebt = Math.max(
            acc[customerId].oldestDebt,
            debtAgeDays
          );
          return acc;
        },
        {}
      );

      const allData: ClientDebt[] = Object.values(debtByClient)
        .map(clientDebt => ({
          customerId: clientDebt.customerId,
          customerName: `Customer ${clientDebt.customerId}`, // Updated below
          currentDebt: clientDebt.currentDebt,
          oldestDebt: clientDebt.oldestDebt,
        }))
        .sort((a, b) => {
          if (b.currentDebt !== a.currentDebt) {
            return b.currentDebt - a.currentDebt;
          }
          return b.oldestDebt - a.oldestDebt;
        });

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

  // Vendors who need to get paid (sold-out consigned batches, still unpaid)
  getVendorsNeedingPayment: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(paginationInputSchema)
    .query(
      async ({ input }): Promise<PaginatedResponse<VendorNeedingPayment>> => {
        let allData: VendorNeedingPayment[];

        try {
          const pageSize = 500;
          const payableItems: Array<{
            vendorClientId: number;
            vendorName?: string | null;
            amountDue?: string | number | null;
            inventoryZeroAt?: string | Date | null;
            dueDate?: string | Date | null;
            createdAt?: string | Date | null;
          }> = [];
          let totalPayables = 0;
          let offset = 0;

          // Pull all payables pages so large datasets do not hide vendors.
          do {
            const page = await payablesService.listPayables({
              status: ["DUE", "PARTIAL"],
              limit: pageSize,
              offset,
            });

            if (offset === 0) {
              totalPayables = page.total || 0;
            }

            if (!page.items.length) {
              break;
            }

            payableItems.push(...page.items);
            offset += page.items.length;
          } while (offset < totalPayables);

          const now = new Date();

          // Reduce payable rows to vendor-level risk rows.
          const byVendor = payableItems
            // Only keep unpaid payables tied to batches that actually hit zero.
            .filter(item => Number(item.amountDue || 0) > 0)
            .filter(item => Boolean(item.inventoryZeroAt))
            .reduce(
              (
                acc: Record<number, VendorNeedingPayment>,
                item: {
                  vendorClientId: number;
                  vendorName?: string | null;
                  amountDue?: string | number | null;
                  inventoryZeroAt?: string | Date | null;
                  dueDate?: string | Date | null;
                  createdAt?: string | Date | null;
                }
              ) => {
                const vendorClientId = Number(item.vendorClientId);
                if (!vendorClientId) return acc;

                const rowAmountDue = Number(item.amountDue || 0);
                const dueReferenceDate = item.dueDate
                  ? new Date(item.dueDate)
                  : item.inventoryZeroAt
                    ? new Date(item.inventoryZeroAt)
                    : item.createdAt
                      ? new Date(item.createdAt)
                      : now;
                const daysDue = Math.max(
                  0,
                  differenceInDays(now, dueReferenceDate)
                );

                if (!acc[vendorClientId]) {
                  acc[vendorClientId] = {
                    vendorClientId,
                    vendorName: item.vendorName || `Vendor ${vendorClientId}`,
                    amountDue: 0,
                    soldOutBatches: 0,
                    oldestDueDays: 0,
                  };
                }

                acc[vendorClientId].amountDue += rowAmountDue;
                acc[vendorClientId].soldOutBatches += 1;
                acc[vendorClientId].oldestDueDays = Math.max(
                  acc[vendorClientId].oldestDueDays,
                  daysDue
                );

                return acc;
              },
              {}
            );

          allData = Object.values(byVendor).sort((a, b) => {
            if (b.amountDue !== a.amountDue) {
              return b.amountDue - a.amountDue;
            }
            return b.oldestDueDays - a.oldestDueDays;
          });
        } catch (error) {
          if (!isMissingTableError(error, ["vendor_payables"])) {
            throw error;
          }

          logger.warn(
            { error: error instanceof Error ? error.message : String(error) },
            "[Dashboard] vendor_payables missing, using legacy vendors-needing-payment fallback"
          );

          allData = await getLegacyVendorsNeedingPayment();
        }

        // Overwrite fallback names with canonical names where available.
        const vendorIds = allData.map(v => v.vendorClientId);
        const vendorNameMap = await fetchClientNamesMap(vendorIds);
        allData.forEach(vendor => {
          const canonicalName = vendorNameMap.get(vendor.vendorClientId);
          if (canonicalName) {
            vendor.vendorName = canonicalName;
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
      }
    ),

  // Client Profit Margin
  getClientProfitMargin: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(paginationInputSchema)
    .query(async ({ input }): Promise<PaginatedResponse<ClientMargin>> => {
      // TERP-0001: Get actual COGS from orders instead of using hardcoded percentage
      // Orders have proper COGS data calculated from batch/lot inventory data
      const allOrders = await ordersDb.getAllOrders({
        isDraft: false, // Only confirmed orders, not drafts
        orderType: "SALE", // Only sales, not quotes
        limit: 500, // Get a reasonable number for dashboard
      });

      // Calculate profit margin by client using actual COGS from orders
      const marginByClient: Record<number, ClientMargin> = {};
      let ordersWithoutCogs = 0;

      for (const order of allOrders) {
        const clientId = order.clientId;
        if (!clientId) continue;

        if (!marginByClient[clientId]) {
          marginByClient[clientId] = {
            customerId: clientId,
            customerName: `Customer ${clientId}`, // Will be updated with actual name below
            revenue: 0,
            cost: 0,
            profitMargin: 0,
          };
        }

        const orderTotal = Number(order.total || 0);
        const orderCogs = Number(order.totalCogs || 0);

        marginByClient[clientId].revenue += orderTotal;

        // Use actual COGS from order if available
        if (order.totalCogs && orderCogs > 0) {
          marginByClient[clientId].cost += orderCogs;
        } else {
          // Fallback: estimate COGS from average batch cost if order COGS is missing
          // This should be rare for properly created orders
          ordersWithoutCogs++;
          // Use a conservative 40% estimate as last resort (with warning log)
          marginByClient[clientId].cost += orderTotal * 0.4;
        }
      }

      // Log warning if we had to use estimated COGS
      if (ordersWithoutCogs > 0) {
        logger.warn({
          msg: "Dashboard profit margin used estimated COGS for some orders",
          ordersWithoutCogs,
          totalOrders: allOrders.length,
          note: "Orders without actual COGS data - using 40% estimate as fallback",
        });
      }

      // Calculate profit margins
      for (const clientId of Object.keys(marginByClient)) {
        const data = marginByClient[Number(clientId)];
        const profit = data.revenue - data.cost;
        data.profitMargin =
          data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
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

      const sortedData: ClientMargin[] = Object.values(marginByClient)
        .map(c => ({
          customerId: c.customerId,
          customerName: c.customerName,
          revenue: c.revenue,
          cost: c.cost,
          profitMargin:
            c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
        }))
        .sort(
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
        (sum: number, r: { amountDue?: string | number | null }) =>
          sum + Number(r.amountDue || 0),
        0
      );
      const totalAP = payables.reduce(
        (sum: number, p: { amountDue?: string | number | null }) =>
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
