import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { strainService } from "../services/strainService";
import { requirePermission } from "../_core/permissionMiddleware";
import { db } from "../db";
import { orders, clients, batches, payments } from "../../drizzle/schema";
import {
  count,
  sum,
  isNull,
  sql,
  eq,
  gte,
  lte,
  and,
  avg,
  desc,
} from "drizzle-orm";
import type {
  AnalyticsSummary,
  ExtendedAnalytics,
  ClientStrainPreference,
  TopStrainFamily,
  StrainFamilyTrend,
  RevenueTrend,
  TopClient,
  ExportData,
} from "../services/analytics";
import { getDateRange, formatAsCSV } from "../services/analytics";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const clientStrainPreferencesInput = z.object({ clientId: z.number() });

const topStrainFamiliesInput = z.object({
  limit: z.number().min(1).max(50).optional().default(10),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const strainFamilyTrendsInput = z.object({
  familyId: z.number(),
  months: z.number().min(1).max(24).optional().default(6),
});

const dateRangeInput = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  period: z
    .enum(["day", "week", "month", "quarter", "year", "all"])
    .optional()
    .default("month"),
});

const revenueTrendsInput = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  granularity: z.enum(["day", "week", "month"]).optional().default("month"),
  limit: z.number().min(1).max(365).optional().default(12),
});

const topClientsInput = z.object({
  limit: z.number().min(1).max(100).optional().default(10),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  sortBy: z
    .enum(["revenue", "orderCount", "averageOrderValue"])
    .optional()
    .default("revenue"),
});

const exportInput = z.object({
  type: z.enum(["summary", "revenue", "clients", "inventory"]),
  format: z.enum(["csv", "json"]).optional().default("csv"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

// ============================================================================
// ROUTER
// ============================================================================

export const analyticsRouter = router({
  getSummary: protectedProcedure
    .use(requirePermission("analytics:read"))
    .query(async (): Promise<AnalyticsSummary> => {
      if (!db)
        return {
          totalRevenue: 0,
          totalOrders: 0,
          totalClients: 0,
          totalInventoryItems: 0,
        };
      const [orderStats] = await db
        .select({ totalOrders: count(), totalRevenue: sum(orders.total) })
        .from(orders);
      const [clientStats] = await db
        .select({ totalClients: count() })
        .from(clients);
      const [inventoryStats] = await db
        .select({ totalInventoryItems: count() })
        .from(batches)
        .where(isNull(batches.deletedAt));
      return {
        totalRevenue: Number(orderStats?.totalRevenue || 0),
        totalOrders: Number(orderStats?.totalOrders || 0),
        totalClients: Number(clientStats?.totalClients || 0),
        totalInventoryItems: Number(inventoryStats?.totalInventoryItems || 0),
      };
    }),

  getExtendedSummary: protectedProcedure
    .use(requirePermission("analytics:read"))
    .input(dateRangeInput)
    .query(async ({ input }): Promise<ExtendedAnalytics> => {
      if (!db) {
        return {
          totalRevenue: 0,
          totalOrders: 0,
          totalClients: 0,
          totalInventoryItems: 0,
          averageOrderValue: 0,
          totalPaymentsReceived: 0,
          outstandingBalance: 0,
          profitMargin: 0,
          growthRate: 0,
          ordersThisPeriod: 0,
          revenueThisPeriod: 0,
          newClientsThisPeriod: 0,
        };
      }
      const { startDate, endDate } =
        input.startDate && input.endDate
          ? { startDate: input.startDate, endDate: input.endDate }
          : getDateRange(input.period);

      const [allTimeStats] = await db
        .select({
          totalOrders: count(),
          totalRevenue: sum(orders.total),
          avgOrderValue: avg(orders.total),
        })
        .from(orders);
      const [periodStats] = await db
        .select({
          ordersThisPeriod: count(),
          revenueThisPeriod: sum(orders.total),
        })
        .from(orders)
        .where(
          and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate))
        );

      const periodLength = endDate.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const [prevPeriodStats] = await db
        .select({ revenue: sum(orders.total) })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, prevStartDate),
            lte(orders.createdAt, startDate)
          )
        );

      const [clientStats] = await db
        .select({ totalClients: count() })
        .from(clients);
      const [newClientStats] = await db
        .select({ newClients: count() })
        .from(clients)
        .where(
          and(
            gte(clients.createdAt, startDate),
            lte(clients.createdAt, endDate)
          )
        );
      const [inventoryStats] = await db
        .select({ totalInventoryItems: count() })
        .from(batches)
        .where(isNull(batches.deletedAt));
      const [paymentStats] = await db
        .select({ totalPayments: sum(payments.amount) })
        .from(payments);

      const currentRevenue = Number(periodStats?.revenueThisPeriod || 0);
      const previousRevenue = Number(prevPeriodStats?.revenue || 0);
      const growthRate =
        previousRevenue > 0
          ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
          : 0;
      const totalRevenue = Number(allTimeStats?.totalRevenue || 0);
      const totalPayments = Number(paymentStats?.totalPayments || 0);

      return {
        totalRevenue,
        totalOrders: Number(allTimeStats?.totalOrders || 0),
        totalClients: Number(clientStats?.totalClients || 0),
        totalInventoryItems: Number(inventoryStats?.totalInventoryItems || 0),
        averageOrderValue: Number(allTimeStats?.avgOrderValue || 0),
        totalPaymentsReceived: totalPayments,
        outstandingBalance: Math.max(0, totalRevenue - totalPayments),
        profitMargin: 25,
        growthRate: Math.round(growthRate * 100) / 100,
        ordersThisPeriod: Number(periodStats?.ordersThisPeriod || 0),
        revenueThisPeriod: currentRevenue,
        newClientsThisPeriod: Number(newClientStats?.newClients || 0),
      };
    }),

  getRevenueTrends: protectedProcedure
    .use(requirePermission("analytics:read"))
    .input(revenueTrendsInput)
    .query(async ({ input }): Promise<RevenueTrend[]> => {
      if (!db) return [];
      const { startDate, endDate } =
        input.startDate && input.endDate
          ? { startDate: input.startDate, endDate: input.endDate }
          : getDateRange("year");

      const dateFormat =
        input.granularity === "day"
          ? "%Y-%m-%d"
          : input.granularity === "week"
            ? "%Y-W%V"
            : "%Y-%m";
      const trends = await db
        .select({
          period:
            sql<string>`DATE_FORMAT(${orders.createdAt}, ${dateFormat})`.as(
              "period"
            ),
          revenue: sum(orders.total),
          orderCount: count(),
        })
        .from(orders)
        .where(
          and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate))
        )
        .groupBy(sql`DATE_FORMAT(${orders.createdAt}, ${dateFormat})`)
        .orderBy(sql`period`)
        .limit(input.limit);

      return trends.map(t => ({
        period: t.period,
        revenue: Number(t.revenue || 0),
        orderCount: Number(t.orderCount || 0),
        averageOrderValue:
          Number(t.orderCount) > 0
            ? Number(t.revenue || 0) / Number(t.orderCount)
            : 0,
      }));
    }),

  getTopClients: protectedProcedure
    .use(requirePermission("analytics:read"))
    .input(topClientsInput)
    .query(async ({ input }): Promise<TopClient[]> => {
      if (!db) return [];
      const conditions = [];
      if (input.startDate)
        conditions.push(gte(orders.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(orders.createdAt, input.endDate));

      const topClients = await db
        .select({
          clientId: clients.id,
          clientName: clients.name,
          totalRevenue: sum(orders.total),
          orderCount: count(orders.id),
        })
        .from(clients)
        .leftJoin(orders, eq(orders.clientId, clients.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(clients.id, clients.name)
        .orderBy(
          desc(
            input.sortBy === "orderCount" ? count(orders.id) : sum(orders.total)
          )
        )
        .limit(input.limit);

      return topClients.map(c => ({
        clientId: c.clientId,
        clientName: c.clientName || "Unknown",
        totalRevenue: Number(c.totalRevenue || 0),
        orderCount: Number(c.orderCount || 0),
        averageOrderValue:
          Number(c.orderCount) > 0
            ? Number(c.totalRevenue || 0) / Number(c.orderCount)
            : 0,
      }));
    }),

  clientStrainPreferences: protectedProcedure
    .use(requirePermission("analytics:read"))
    .input(clientStrainPreferencesInput)
    .query(async ({ input }): Promise<ClientStrainPreference[]> => {
      const result = await strainService.getClientPreferences(input.clientId);
      return result as ClientStrainPreference[];
    }),

  topStrainFamilies: protectedProcedure
    .use(requirePermission("analytics:read"))
    .input(topStrainFamiliesInput)
    .query(async ({ input }): Promise<TopStrainFamily[]> => {
      const result = await strainService.getTopFamilies(
        input.limit,
        input.startDate,
        input.endDate
      );
      return result as TopStrainFamily[];
    }),

  strainFamilyTrends: protectedProcedure
    .use(requirePermission("analytics:read"))
    .input(strainFamilyTrendsInput)
    .query(async ({ input }): Promise<StrainFamilyTrend[]> => {
      const result = await strainService.getFamilyTrends(
        input.familyId,
        input.months
      );
      return result as StrainFamilyTrend[];
    }),

  exportData: protectedProcedure
    .use(requirePermission("analytics:read"))
    .input(exportInput)
    .mutation(async ({ input }): Promise<ExportData> => {
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const timestamp = new Date().toISOString().split("T")[0];
      let data: Record<string, unknown>[];
      let headers: string[];
      let filename: string;

      switch (input.type) {
        case "summary": {
          const [orderStats] = await db
            .select({
              totalOrders: count(),
              totalRevenue: sum(orders.total),
              avgOrderValue: avg(orders.total),
            })
            .from(orders);
          const [clientStats] = await db
            .select({ totalClients: count() })
            .from(clients);
          const [inventoryStats] = await db
            .select({ totalInventoryItems: count() })
            .from(batches)
            .where(isNull(batches.deletedAt));
          data = [
            {
              metric: "Total Revenue",
              value: Number(orderStats?.totalRevenue || 0),
            },
            {
              metric: "Total Orders",
              value: Number(orderStats?.totalOrders || 0),
            },
            {
              metric: "Average Order Value",
              value: Number(orderStats?.avgOrderValue || 0).toFixed(2),
            },
            {
              metric: "Total Clients",
              value: Number(clientStats?.totalClients || 0),
            },
            {
              metric: "Inventory Items",
              value: Number(inventoryStats?.totalInventoryItems || 0),
            },
          ];
          headers = ["metric", "value"];
          filename = `analytics-summary-${timestamp}`;
          break;
        }
        case "revenue": {
          const conditions = [];
          if (input.startDate)
            conditions.push(gte(orders.createdAt, input.startDate));
          if (input.endDate)
            conditions.push(lte(orders.createdAt, input.endDate));
          const revenueData = await db
            .select({
              date: sql<string>`DATE(${orders.createdAt})`.as("date"),
              revenue: sum(orders.total),
              orderCount: count(),
            })
            .from(orders)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .groupBy(sql`DATE(${orders.createdAt})`)
            .orderBy(sql`date`);
          data = revenueData.map(r => ({
            date: r.date,
            revenue: Number(r.revenue || 0),
            orderCount: Number(r.orderCount || 0),
          }));
          headers = ["date", "revenue", "orderCount"];
          filename = `revenue-report-${timestamp}`;
          break;
        }
        case "clients": {
          const clientData = await db
            .select({
              clientId: clients.id,
              clientName: clients.name,
              isBuyer: clients.isBuyer,
              isSeller: clients.isSeller,
              isBrand: clients.isBrand,
              totalRevenue: sum(orders.total),
              orderCount: count(orders.id),
            })
            .from(clients)
            .leftJoin(orders, eq(orders.clientId, clients.id))
            .groupBy(
              clients.id,
              clients.name,
              clients.isBuyer,
              clients.isSeller,
              clients.isBrand
            )
            .orderBy(desc(sum(orders.total)));
          data = clientData.map(c => {
            const types: string[] = [];
            if (c.isBuyer) types.push("Buyer");
            if (c.isSeller) types.push("Seller");
            if (c.isBrand) types.push("Brand");
            const clientType = types.length > 0 ? types.join(", ") : "Unknown";
            return {
              clientId: c.clientId,
              clientName: c.clientName || "Unknown",
              clientType,
              totalRevenue: Number(c.totalRevenue || 0),
              orderCount: Number(c.orderCount || 0),
            };
          });
          headers = [
            "clientId",
            "clientName",
            "clientType",
            "totalRevenue",
            "orderCount",
          ];
          filename = `client-report-${timestamp}`;
          break;
        }
        case "inventory": {
          const inventoryData = await db
            .select({
              batchId: batches.id,
              batchCode: batches.code,
              onHandQty: batches.onHandQty,
              unitCogs: batches.unitCogs,
              createdAt: batches.createdAt,
            })
            .from(batches)
            .where(isNull(batches.deletedAt))
            .orderBy(desc(batches.createdAt));
          data = inventoryData.map(b => ({
            batchId: b.batchId,
            batchCode: b.batchCode || "N/A",
            onHandQty: Number(b.onHandQty || 0),
            unitCogs: Number(b.unitCogs || 0),
            createdAt: b.createdAt?.toISOString() || "",
          }));
          headers = [
            "batchId",
            "batchCode",
            "onHandQty",
            "unitCogs",
            "createdAt",
          ];
          filename = `inventory-report-${timestamp}`;
          break;
        }
        default:
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid export type",
          });
      }

      const contentType =
        input.format === "json" ? "application/json" : "text/csv";
      const exportedData =
        input.format === "json"
          ? JSON.stringify(data, null, 2)
          : formatAsCSV(data, headers);
      return {
        filename: `${filename}.${input.format}`,
        contentType,
        data: exportedData,
      };
    }),
});
