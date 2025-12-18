import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { strainService } from "../services/strainService";
import { requirePermission } from "../_core/permissionMiddleware";
import { db } from "../db";
import { orders, clients, batches, products } from "../../drizzle/schema";
import { count, sum, isNull, eq, gte, lte, and, sql, desc, asc } from "drizzle-orm";

export const analyticsRouter = router({
  // Get summary analytics for dashboard
  getSummary: protectedProcedure.use(requirePermission("analytics:read"))
    .query(async () => {
      try {
        if (!db) {
          return {
            totalRevenue: 0,
            totalOrders: 0,
            totalClients: 0,
            totalInventoryItems: 0,
          };
        }

        // Get order stats (total revenue and count)
        const [orderStats] = await db
          .select({
            totalOrders: count(),
            totalRevenue: sum(orders.total),
          })
          .from(orders);

        // Get client count
        const [clientStats] = await db
          .select({ totalClients: count() })
          .from(clients);

        // Get inventory count (batches not soft-deleted)
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
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get analytics summary',
          cause: error,
        });
      }
    }),
  // Get client's strain family preferences
  clientStrainPreferences: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      try {
        return await strainService.getClientPreferences(input.clientId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get client preferences',
          cause: error,
        });
      }
    }),

  // Get top selling strain families
  topStrainFamilies: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({
      limit: z.number().min(1).max(50).optional().default(10),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await strainService.getTopFamilies(input.limit, input.startDate, input.endDate);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get top families',
          cause: error,
        });
      }
    }),

  // Get strain family trends over time
  strainFamilyTrends: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({
      familyId: z.number(),
      months: z.number().min(1).max(24).optional().default(6),
    }))
    .query(async ({ input }) => {
      try {
        return await strainService.getFamilyTrends(input.familyId, input.months);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get family trends',
          cause: error,
        });
      }
    }),

  // ============================================================================
  // SALES ANALYTICS
  // ============================================================================

  getSalesAnalytics: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      try {
        if (!db) {
          return {
            revenue: 0,
            orderCount: 0,
            averageOrderValue: 0,
            revenueByDay: [],
            topProducts: [],
          };
        }

        // Build date filters
        const dateFilters = [];
        if (input.startDate) {
          dateFilters.push(gte(orders.createdAt, input.startDate));
        }
        if (input.endDate) {
          dateFilters.push(lte(orders.createdAt, input.endDate));
        }

        // Only include SALE orders (not quotes)
        const baseFilters = [eq(orders.orderType, "SALE"), ...dateFilters];

        // Get total revenue and order count
        const [stats] = await db
          .select({
            totalOrders: count(),
            totalRevenue: sum(orders.total),
          })
          .from(orders)
          .where(and(...baseFilters));

        const revenue = Number(stats?.totalRevenue || 0);
        const orderCount = Number(stats?.totalOrders || 0);
        const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

        // Get revenue by day (last 30 days if no date range specified)
        const revenueByDay = await db
          .select({
            date: sql<string>`DATE(${orders.createdAt})`,
            revenue: sum(orders.total),
            orders: count(),
          })
          .from(orders)
          .where(and(...baseFilters))
          .groupBy(sql`DATE(${orders.createdAt})`)
          .orderBy(asc(sql`DATE(${orders.createdAt})`));

        // Get top products by extracting from order items JSON
        // Since items is a JSON array, we'll aggregate order totals by client for now
        const topClients = await db
          .select({
            clientId: orders.clientId,
            totalSpent: sum(orders.total),
            orderCount: count(),
          })
          .from(orders)
          .where(and(...baseFilters))
          .groupBy(orders.clientId)
          .orderBy(desc(sum(orders.total)))
          .limit(10);

        // Get client names
        const clientIds = topClients.map(c => c.clientId);
        let clientNames: Record<number, string> = {};
        if (clientIds.length > 0) {
          const clientData = await db
            .select({ id: clients.id, name: clients.name })
            .from(clients)
            .where(sql`${clients.id} IN (${sql.raw(clientIds.join(','))})`);
          clientNames = clientData.reduce((acc, c) => {
            acc[c.id] = c.name;
            return acc;
          }, {} as Record<number, string>);
        }

        const topProducts = topClients.map(c => ({
          clientId: c.clientId,
          clientName: clientNames[c.clientId] || 'Unknown',
          totalSpent: Number(c.totalSpent || 0),
          orderCount: Number(c.orderCount || 0),
        }));

        return {
          revenue,
          orderCount,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          revenueByDay: revenueByDay.map(d => ({
            date: String(d.date),
            revenue: Number(d.revenue || 0),
            orders: Number(d.orders || 0),
          })),
          topProducts,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get sales analytics',
          cause: error,
        });
      }
    }),

  // ============================================================================
  // INVENTORY ANALYTICS
  // ============================================================================

  getInventoryAnalytics: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({
      lowStockThreshold: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      try {
        if (!db) {
          return {
            totalItems: 0,
            totalValue: 0,
            lowStockItems: [],
            stockByCategory: [],
            turnoverRate: 0,
          };
        }

        // Get total inventory items and value
        const [inventoryStats] = await db
          .select({
            totalItems: count(),
            totalQuantity: sum(batches.quantity),
          })
          .from(batches)
          .where(isNull(batches.deletedAt));

        // Get low stock items
        const lowStockItems = await db
          .select({
            id: batches.id,
            sku: batches.sku,
            quantity: batches.quantity,
            productId: batches.productId,
          })
          .from(batches)
          .where(and(
            isNull(batches.deletedAt),
            lte(batches.quantity, sql`${input.lowStockThreshold}`)
          ))
          .orderBy(asc(batches.quantity))
          .limit(20);

        // Get product names for low stock items
        const productIds = lowStockItems.map(i => i.productId).filter(Boolean) as number[];
        let productNames: Record<number, string> = {};
        if (productIds.length > 0) {
          const productData = await db
            .select({ id: products.id, nameCanonical: products.nameCanonical })
            .from(products)
            .where(sql`${products.id} IN (${sql.raw(productIds.join(','))})`);
          productNames = productData.reduce((acc, p) => {
            acc[p.id] = p.nameCanonical || 'Unknown';
            return acc;
          }, {} as Record<number, string>);
        }

        // Get stock by category
        const stockByCategory = await db
          .select({
            category: batches.category,
            itemCount: count(),
            totalQuantity: sum(batches.quantity),
          })
          .from(batches)
          .where(isNull(batches.deletedAt))
          .groupBy(batches.category);

        return {
          totalItems: Number(inventoryStats?.totalItems || 0),
          totalQuantity: Number(inventoryStats?.totalQuantity || 0),
          lowStockItems: lowStockItems.map(item => ({
            id: item.id,
            sku: item.sku,
            quantity: Number(item.quantity || 0),
            productName: item.productId ? productNames[item.productId] : 'Unknown',
          })),
          stockByCategory: stockByCategory.map(s => ({
            category: s.category || 'Uncategorized',
            itemCount: Number(s.itemCount || 0),
            totalQuantity: Number(s.totalQuantity || 0),
          })),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get inventory analytics',
          cause: error,
        });
      }
    }),

  // ============================================================================
  // CLIENT ANALYTICS
  // ============================================================================

  getClientAnalytics: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      try {
        if (!db) {
          return {
            totalClients: 0,
            newClientsThisPeriod: 0,
            topClients: [],
            clientsByType: [],
          };
        }

        // Build date filters for new clients
        const dateFilters = [];
        if (input.startDate) {
          dateFilters.push(gte(clients.createdAt, input.startDate));
        }
        if (input.endDate) {
          dateFilters.push(lte(clients.createdAt, input.endDate));
        }

        // Get total client count
        const [totalStats] = await db
          .select({ totalClients: count() })
          .from(clients)
          .where(isNull(clients.deletedAt));

        // Get new clients in period
        let newClientsCount = 0;
        if (dateFilters.length > 0) {
          const [newStats] = await db
            .select({ count: count() })
            .from(clients)
            .where(and(isNull(clients.deletedAt), ...dateFilters));
          newClientsCount = Number(newStats?.count || 0);
        }

        // Get top clients by revenue
        const orderDateFilters = [];
        if (input.startDate) {
          orderDateFilters.push(gte(orders.createdAt, input.startDate));
        }
        if (input.endDate) {
          orderDateFilters.push(lte(orders.createdAt, input.endDate));
        }

        const topClients = await db
          .select({
            clientId: orders.clientId,
            totalRevenue: sum(orders.total),
            orderCount: count(),
          })
          .from(orders)
          .where(and(
            eq(orders.orderType, "SALE"),
            ...(orderDateFilters.length > 0 ? orderDateFilters : [])
          ))
          .groupBy(orders.clientId)
          .orderBy(desc(sum(orders.total)))
          .limit(10);

        // Get client names
        const clientIds = topClients.map(c => c.clientId);
        let clientData: Array<{ id: number; name: string; teriCode: string }> = [];
        if (clientIds.length > 0) {
          clientData = await db
            .select({ id: clients.id, name: clients.name, teriCode: clients.teriCode })
            .from(clients)
            .where(sql`${clients.id} IN (${sql.raw(clientIds.join(','))})`);
        }
        const clientMap = clientData.reduce((acc, c) => {
          acc[c.id] = c;
          return acc;
        }, {} as Record<number, { name: string; teriCode: string }>);

        // Get clients by type
        const [buyerCount] = await db
          .select({ count: count() })
          .from(clients)
          .where(and(isNull(clients.deletedAt), eq(clients.isBuyer, true)));

        const [sellerCount] = await db
          .select({ count: count() })
          .from(clients)
          .where(and(isNull(clients.deletedAt), eq(clients.isSeller, true)));

        const [brandCount] = await db
          .select({ count: count() })
          .from(clients)
          .where(and(isNull(clients.deletedAt), eq(clients.isBrand, true)));

        return {
          totalClients: Number(totalStats?.totalClients || 0),
          newClientsThisPeriod: newClientsCount,
          topClients: topClients.map(c => ({
            clientId: c.clientId,
            clientName: clientMap[c.clientId]?.name || 'Unknown',
            teriCode: clientMap[c.clientId]?.teriCode || '',
            totalRevenue: Number(c.totalRevenue || 0),
            orderCount: Number(c.orderCount || 0),
          })),
          clientsByType: [
            { type: 'Buyers', count: Number(buyerCount?.count || 0) },
            { type: 'Sellers', count: Number(sellerCount?.count || 0) },
            { type: 'Brands', count: Number(brandCount?.count || 0) },
          ],
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get client analytics',
          cause: error,
        });
      }
    }),

  // ============================================================================
  // CSV EXPORT
  // ============================================================================

  exportSalesCSV: protectedProcedure.use(requirePermission("analytics:export"))
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!db) {
          return { csv: '', filename: 'sales_export.csv' };
        }

        const dateFilters = [];
        if (input.startDate) {
          dateFilters.push(gte(orders.createdAt, input.startDate));
        }
        if (input.endDate) {
          dateFilters.push(lte(orders.createdAt, input.endDate));
        }

        const salesData = await db
          .select({
            orderNumber: orders.orderNumber,
            clientId: orders.clientId,
            total: orders.total,
            subtotal: orders.subtotal,
            tax: orders.tax,
            discount: orders.discount,
            createdAt: orders.createdAt,
            saleStatus: orders.saleStatus,
          })
          .from(orders)
          .where(and(eq(orders.orderType, "SALE"), ...dateFilters))
          .orderBy(desc(orders.createdAt));

        // Get client names
        const clientIds = [...new Set(salesData.map(s => s.clientId))];
        let clientNames: Record<number, string> = {};
        if (clientIds.length > 0) {
          const clientData = await db
            .select({ id: clients.id, name: clients.name })
            .from(clients)
            .where(sql`${clients.id} IN (${sql.raw(clientIds.join(','))})`);
          clientNames = clientData.reduce((acc, c) => {
            acc[c.id] = c.name;
            return acc;
          }, {} as Record<number, string>);
        }

        // Build CSV
        const headers = ['Order Number', 'Client', 'Subtotal', 'Tax', 'Discount', 'Total', 'Status', 'Date'];
        const rows = salesData.map(s => [
          s.orderNumber,
          clientNames[s.clientId] || 'Unknown',
          s.subtotal,
          s.tax,
          s.discount,
          s.total,
          s.saleStatus || 'N/A',
          s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : 'N/A',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const filename = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;

        return { csv, filename };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export sales CSV',
          cause: error,
        });
      }
    }),

  exportInventoryCSV: protectedProcedure.use(requirePermission("analytics:export"))
    .mutation(async () => {
      try {
        if (!db) {
          return { csv: '', filename: 'inventory_export.csv' };
        }

        const inventoryData = await db
          .select({
            sku: batches.sku,
            quantity: batches.quantity,
            category: batches.category,
            productId: batches.productId,
            createdAt: batches.createdAt,
          })
          .from(batches)
          .where(isNull(batches.deletedAt))
          .orderBy(desc(batches.createdAt));

        // Get product names
        const productIds = [...new Set(inventoryData.map(i => i.productId).filter(Boolean))] as number[];
        let productNames: Record<number, string> = {};
        if (productIds.length > 0) {
          const productData = await db
            .select({ id: products.id, nameCanonical: products.nameCanonical })
            .from(products)
            .where(sql`${products.id} IN (${sql.raw(productIds.join(','))})`);
          productNames = productData.reduce((acc, p) => {
            acc[p.id] = p.nameCanonical || 'Unknown';
            return acc;
          }, {} as Record<number, string>);
        }

        // Build CSV
        const headers = ['SKU', 'Product', 'Category', 'Quantity', 'Date Added'];
        const rows = inventoryData.map(i => [
          i.sku || 'N/A',
          i.productId ? productNames[i.productId] || 'Unknown' : 'N/A',
          i.category || 'Uncategorized',
          i.quantity,
          i.createdAt ? new Date(i.createdAt).toISOString().split('T')[0] : 'N/A',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const filename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;

        return { csv, filename };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export inventory CSV',
          cause: error,
        });
      }
    }),

  exportClientCSV: protectedProcedure.use(requirePermission("analytics:export"))
    .mutation(async () => {
      try {
        if (!db) {
          return { csv: '', filename: 'clients_export.csv' };
        }

        const clientData = await db
          .select({
            teriCode: clients.teriCode,
            name: clients.name,
            email: clients.email,
            phone: clients.phone,
            isBuyer: clients.isBuyer,
            isSeller: clients.isSeller,
            isBrand: clients.isBrand,
            createdAt: clients.createdAt,
          })
          .from(clients)
          .where(isNull(clients.deletedAt))
          .orderBy(asc(clients.name));

        // Build CSV
        const headers = ['TERI Code', 'Name', 'Email', 'Phone', 'Is Buyer', 'Is Seller', 'Is Brand', 'Created'];
        const rows = clientData.map(c => [
          c.teriCode,
          `"${(c.name || '').replace(/"/g, '""')}"`, // Escape quotes in names
          c.email || '',
          c.phone || '',
          c.isBuyer ? 'Yes' : 'No',
          c.isSeller ? 'Yes' : 'No',
          c.isBrand ? 'Yes' : 'No',
          c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : 'N/A',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const filename = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;

        return { csv, filename };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to export clients CSV',
          cause: error,
        });
      }
    }),
});

