/**
 * WS-012: Customer Preferences & History Router
 * Tracks customer preferences, purchase history, and stated needs
 */

import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../trpc";
import { db } from "../db";
import { clients, orders, orderItems, clientNeeds, batches, products } from "../../drizzle/schema";
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

      // Get frequently purchased products
      const frequentProducts = await db
        .select({
          productId: orderItems.productId,
          productName: products.name,
          strain: batches.strain,
          totalQuantity: sql<number>`SUM(CAST(${orderItems.quantity} AS DECIMAL))`,
          orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
        })
        .from(orderItems)
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(batches, eq(orderItems.batchId, batches.id))
        .where(eq(orders.clientId, input.clientId))
        .groupBy(orderItems.productId, batches.strain)
        .orderBy(desc(sql`COUNT(DISTINCT ${orderItems.orderId})`))
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
          productId: p.productId,
          productName: p.productName || 'Unknown',
          strain: p.strain,
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

      await db
        .update(clients)
        .set(updates)
        .where(eq(clients.id, input.clientId));

      return { success: true };
    }),

  /**
   * Add customer need/request
   */
  addNeed: adminProcedure
    .input(z.object({
      clientId: z.number(),
      productType: z.string(),
      strain: z.string().optional(),
      quantity: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [need] = await db.insert(clientNeeds).values({
        clientId: input.clientId,
        productType: input.productType,
        strain: input.strain,
        quantity: String(input.quantity),
        notes: input.notes,
        status: 'PENDING',
        createdBy: ctx.user.id,
        createdAt: new Date(),
      });

      return {
        needId: need.insertId,
        success: true,
      };
    }),

  /**
   * Get customer analytics
   */
  getAnalytics: adminProcedure
    .input(z.object({
      clientId: z.number(),
    }))
    .query(async ({ input }) => {
      // Total spend
      const totalSpend = await db
        .select({
          total: sql<number>`SUM(CAST(${orders.total} AS DECIMAL))`,
          orderCount: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(
          eq(orders.clientId, input.clientId),
          eq(orders.status, 'COMPLETED')
        ));

      // Average order value
      const avgOrderValue = totalSpend[0]?.orderCount > 0
        ? (totalSpend[0]?.total || 0) / totalSpend[0].orderCount
        : 0;

      // First and last order dates
      const orderDates = await db
        .select({
          firstOrder: sql<Date>`MIN(${orders.createdAt})`,
          lastOrder: sql<Date>`MAX(${orders.createdAt})`,
        })
        .from(orders)
        .where(eq(orders.clientId, input.clientId));

      // Days since last order
      const daysSinceLastOrder = orderDates[0]?.lastOrder
        ? Math.floor((Date.now() - new Date(orderDates[0].lastOrder).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        totalSpend: totalSpend[0]?.total || 0,
        orderCount: totalSpend[0]?.orderCount || 0,
        avgOrderValue,
        firstOrderDate: orderDates[0]?.firstOrder,
        lastOrderDate: orderDates[0]?.lastOrder,
        daysSinceLastOrder,
      };
    }),
});
