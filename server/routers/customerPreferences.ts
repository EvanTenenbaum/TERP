/**
 * WS-012: Customer Preferences & History Router
 * Tracks customer preferences, purchase history, and stated needs
 */

import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { db } from "../db";
import { clients, orders, orderLineItems, clientNeeds, batches, products } from "../../drizzle/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

export const customerPreferencesRouter = router({
  /**
   * Get customer purchase history summary
   */
  getPurchaseHistory: adminProcedure
    .input(z.object({
      clientId: z.number(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      // Get recent orders
      const recentOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          total: orders.total,
          status: orders.status,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.clientId, input.clientId))
        .orderBy(desc(orders.createdAt))
        .limit(input.limit);

      // Get frequently purchased products using orderLineItems
      const frequentProducts = await db
        .select({
          productName: orderLineItems.productDisplayName,
          batchId: orderLineItems.batchId,
          totalQuantity: sql<number>`SUM(CAST(${orderLineItems.quantity} AS DECIMAL))`,
          orderCount: sql<number>`COUNT(DISTINCT ${orderLineItems.orderId})`,
        })
        .from(orderLineItems)
        .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
        .where(eq(orders.clientId, input.clientId))
        .groupBy(orderLineItems.productDisplayName, orderLineItems.batchId)
        .orderBy(desc(sql`COUNT(DISTINCT ${orderLineItems.orderId})`))
        .limit(10);

      return {
        recentOrders: recentOrders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          total: parseFloat(o.total as string || '0'),
          status: o.status,
          createdAt: o.createdAt,
        })),
        frequentProducts: frequentProducts.map(p => ({
          productName: p.productName || 'Unknown',
          batchId: p.batchId,
          totalQuantity: p.totalQuantity || 0,
          orderCount: p.orderCount || 0,
        })),
      };
    }),

  /**
   * Get customer stated preferences/needs
   */
  getPreferences: adminProcedure
    .input(z.object({
      clientId: z.number(),
    }))
    .query(async ({ input }) => {
      // Get client details with preferences
      const [client] = await db
        .select({
          id: clients.id,
          name: clients.name,
          preferredStrains: clients.preferredStrains,
          preferredProducts: clients.preferredProducts,
          notes: clients.notes,
          tier: clients.tier,
        })
        .from(clients)
        .where(eq(clients.id, input.clientId));

      // Get active needs
      const activeNeeds = await db
        .select({
          id: clientNeeds.id,
          productType: clientNeeds.productType,
          strain: clientNeeds.strain,
          quantity: clientNeeds.quantity,
          notes: clientNeeds.notes,
          status: clientNeeds.status,
          createdAt: clientNeeds.createdAt,
        })
        .from(clientNeeds)
        .where(and(
          eq(clientNeeds.clientId, input.clientId),
          eq(clientNeeds.status, 'PENDING')
        ))
        .orderBy(desc(clientNeeds.createdAt));

      return {
        client: client ? {
          id: client.id,
          name: client.name,
          preferredStrains: client.preferredStrains ? JSON.parse(client.preferredStrains as string) : [],
          preferredProducts: client.preferredProducts ? JSON.parse(client.preferredProducts as string) : [],
          notes: client.notes,
          tier: client.tier,
        } : null,
        activeNeeds: activeNeeds.map(n => ({
          id: n.id,
          productType: n.productType,
          strain: n.strain,
          quantity: parseFloat(n.quantity as string || '0'),
          notes: n.notes,
          status: n.status,
          createdAt: n.createdAt,
        })),
      };
    }),

  /**
   * Update customer preferences
   */
  updatePreferences: adminProcedure
    .input(z.object({
      clientId: z.number(),
      preferredStrains: z.array(z.string()).optional(),
      preferredProducts: z.array(z.number()).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updates: Record<string, unknown> = {};
      
      if (input.preferredStrains !== undefined) {
        updates.preferredStrains = JSON.stringify(input.preferredStrains);
      }
      if (input.preferredProducts !== undefined) {
        updates.preferredProducts = JSON.stringify(input.preferredProducts);
      }
      if (input.notes !== undefined) {
        updates.notes = input.notes;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(clients)
          .set(updates)
          .where(eq(clients.id, input.clientId));
      }

      return { success: true };
    }),

  /**
   * Add customer need
   */
  addNeed: adminProcedure
    .input(z.object({
      clientId: z.number(),
      productType: z.string(),
      strain: z.string().optional(),
      quantity: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [need] = await db.insert(clientNeeds).values({
        clientId: input.clientId,
        productType: input.productType,
        strain: input.strain,
        quantity: input.quantity ? String(input.quantity) : null,
        notes: input.notes,
        status: 'PENDING',
        createdBy: ctx.user.id,
      });

      return {
        needId: need.insertId,
        success: true,
      };
    }),

  /**
   * Update need status
   */
  updateNeedStatus: adminProcedure
    .input(z.object({
      needId: z.number(),
      status: z.enum(['PENDING', 'FULFILLED', 'CANCELLED']),
      fulfilledOrderId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await db
        .update(clientNeeds)
        .set({
          status: input.status,
          fulfilledOrderId: input.fulfilledOrderId,
          fulfilledAt: input.status === 'FULFILLED' ? new Date() : null,
        })
        .where(eq(clientNeeds.id, input.needId));

      return { success: true };
    }),

  /**
   * Get purchase patterns for a client
   */
  getPurchasePatterns: publicProcedure
    .input(z.object({
      clientId: z.number(),
    }))
    .query(async ({ input }) => {
      // Get order frequency
      const orderStats = await db
        .select({
          totalOrders: sql<number>`COUNT(*)`,
          totalSpent: sql<number>`SUM(CAST(${orders.total} AS DECIMAL))`,
          avgOrderValue: sql<number>`AVG(CAST(${orders.total} AS DECIMAL))`,
          firstOrder: sql<Date>`MIN(${orders.createdAt})`,
          lastOrder: sql<Date>`MAX(${orders.createdAt})`,
        })
        .from(orders)
        .where(and(
          eq(orders.clientId, input.clientId),
          eq(orders.isDraft, false)
        ));

      const stats = orderStats[0];
      
      // Calculate average days between orders
      let avgDaysBetweenOrders = 0;
      if (stats && stats.firstOrder && stats.lastOrder && stats.totalOrders > 1) {
        const daysDiff = Math.floor(
          (new Date(stats.lastOrder).getTime() - new Date(stats.firstOrder).getTime()) 
          / (1000 * 60 * 60 * 24)
        );
        avgDaysBetweenOrders = Math.round(daysDiff / (stats.totalOrders - 1));
      }

      return {
        totalOrders: stats?.totalOrders || 0,
        totalSpent: stats?.totalSpent || 0,
        avgOrderValue: stats?.avgOrderValue || 0,
        firstOrderDate: stats?.firstOrder,
        lastOrderDate: stats?.lastOrder,
        avgDaysBetweenOrders,
        predictedNextOrder: stats?.lastOrder 
          ? new Date(new Date(stats.lastOrder).getTime() + avgDaysBetweenOrders * 24 * 60 * 60 * 1000)
          : null,
      };
    }),
});
