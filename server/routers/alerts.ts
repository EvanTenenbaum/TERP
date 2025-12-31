/**
 * WS-008: Alerts Router
 * Handles low stock alerts and needs-based notifications
 */

import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { db } from "../db";
import { batches, products, clients, clientNeeds, users } from "../../drizzle/schema";
import { eq, and, desc, sql, lt, lte, isNotNull } from "drizzle-orm";

// Alert type enum
const alertTypeEnum = z.enum(['LOW_STOCK', 'OUT_OF_STOCK', 'CLIENT_NEED', 'VENDOR_HARVEST', 'PENDING_VALUATION']);

export const alertsRouter = router({
  /**
   * Get all active alerts
   */
  getAll: adminProcedure
    .input(z.object({
      type: alertTypeEnum.optional(),
      acknowledged: z.boolean().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const alerts: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        entityType: string;
        entityId: number;
        createdAt: Date;
        acknowledgedAt?: Date;
        acknowledgedBy?: number;
      }> = [];

      // Get low stock alerts
      if (!input.type || input.type === 'LOW_STOCK') {
        const lowStockProducts = await db
          .select({
            id: products.id,
            name: products.name,
            currentStock: sql<number>`COALESCE(SUM(CAST(${batches.quantity} AS DECIMAL)), 0)`,
            targetStock: products.targetStockLevel,
            minStock: products.minStockLevel,
          })
          .from(products)
          .leftJoin(batches, and(
            eq(batches.productId, products.id),
            eq(batches.batchStatus, 'LIVE')
          ))
          .where(isNotNull(products.minStockLevel))
          .groupBy(products.id)
          .having(sql`COALESCE(SUM(CAST(${batches.quantity} AS DECIMAL)), 0) <= ${products.minStockLevel}`);

        for (const product of lowStockProducts) {
          const currentStock = product.currentStock || 0;
          const minStock = parseFloat(product.minStock as string || '0');
          const isOutOfStock = currentStock === 0;

          alerts.push({
            id: `LOW_STOCK-${product.id}`,
            type: isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            title: isOutOfStock ? `Out of Stock: ${product.name}` : `Low Stock: ${product.name}`,
            description: `Current: ${currentStock}, Minimum: ${minStock}`,
            severity: isOutOfStock ? 'CRITICAL' : 'HIGH',
            entityType: 'product',
            entityId: product.id,
            createdAt: new Date(),
          });
        }
      }

      // Get client needs alerts
      if (!input.type || input.type === 'CLIENT_NEED') {
        const pendingNeeds = await db
          .select({
            id: clientNeeds.id,
            clientId: clientNeeds.clientId,
            clientName: clients.name,
            productType: clientNeeds.productType,
            strain: clientNeeds.strain,
            quantity: clientNeeds.quantity,
            createdAt: clientNeeds.createdAt,
          })
          .from(clientNeeds)
          .leftJoin(clients, eq(clientNeeds.clientId, clients.id))
          .where(eq(clientNeeds.status, 'PENDING'))
          .orderBy(desc(clientNeeds.createdAt))
          .limit(20);

        for (const need of pendingNeeds) {
          alerts.push({
            id: `CLIENT_NEED-${need.id}`,
            type: 'CLIENT_NEED',
            title: `Client Need: ${need.clientName}`,
            description: `${need.strain || need.productType} - ${need.quantity}`,
            severity: 'MEDIUM',
            entityType: 'clientNeed',
            entityId: need.id,
            createdAt: need.createdAt || new Date(),
          });
        }
      }

      return alerts.slice(0, input.limit);
    }),

  /**
   * Get low stock products
   */
  getLowStock: adminProcedure
    .input(z.object({
      includeOutOfStock: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const products_with_stock = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          currentStock: sql<number>`COALESCE(SUM(CAST(${batches.quantity} AS DECIMAL)), 0)`,
          targetStock: products.targetStockLevel,
          minStock: products.minStockLevel,
          unit: products.unit,
        })
        .from(products)
        .leftJoin(batches, and(
          eq(batches.productId, products.id),
          eq(batches.batchStatus, 'LIVE')
        ))
        .where(isNotNull(products.minStockLevel))
        .groupBy(products.id);

      return products_with_stock
        .filter(p => {
          const current = p.currentStock || 0;
          const min = parseFloat(p.minStock as string || '0');
          if (input.includeOutOfStock) {
            return current <= min;
          }
          return current <= min && current > 0;
        })
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.currentStock || 0,
          targetStock: parseFloat(p.targetStock as string || '0'),
          minStock: parseFloat(p.minStock as string || '0'),
          unit: p.unit || 'EA',
          deficit: parseFloat(p.targetStock as string || '0') - (p.currentStock || 0),
          isOutOfStock: (p.currentStock || 0) === 0,
        }));
    }),

  /**
   * Set stock alert thresholds for a product
   */
  setThresholds: adminProcedure
    .input(z.object({
      productId: z.number(),
      minStockLevel: z.number(),
      targetStockLevel: z.number(),
    }))
    .mutation(async ({ input }) => {
      await db
        .update(products)
        .set({
          minStockLevel: String(input.minStockLevel),
          targetStockLevel: String(input.targetStockLevel),
        })
        .where(eq(products.id, input.productId));

      return { success: true };
    }),

  /**
   * Acknowledge an alert
   */
  acknowledge: adminProcedure
    .input(z.object({
      alertId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // For now, just return success
      // In a full implementation, this would store acknowledgment in a table
      return {
        success: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: ctx.user.id,
      };
    }),

  /**
   * Get alert stats for dashboard
   */
  getStats: adminProcedure.query(async () => {
    // Count low stock products
    const lowStockCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(isNotNull(products.minStockLevel));

    // Count pending client needs
    const pendingNeedsCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clientNeeds)
      .where(eq(clientNeeds.status, 'PENDING'));

    return {
      lowStockCount: lowStockCount[0]?.count || 0,
      outOfStockCount: 0, // Would need actual calculation
      pendingNeedsCount: pendingNeedsCount[0]?.count || 0,
      totalAlerts: (lowStockCount[0]?.count || 0) + (pendingNeedsCount[0]?.count || 0),
    };
  }),

  /**
   * Get needs for VIP portal
   */
  getNeedsForVipPortal: publicProcedure.query(async () => {
    const needs = await db
      .select({
        id: clientNeeds.id,
        productType: clientNeeds.productType,
        strain: clientNeeds.strain,
        quantity: clientNeeds.quantity,
        notes: clientNeeds.notes,
        clientTier: clients.tier,
      })
      .from(clientNeeds)
      .leftJoin(clients, eq(clientNeeds.clientId, clients.id))
      .where(eq(clientNeeds.status, 'PENDING'))
      .orderBy(desc(clientNeeds.createdAt));

    // Aggregate by product/strain
    const aggregated = new Map<string, {
      productType: string;
      strain: string | null;
      totalQuantity: number;
      requestCount: number;
      vipRequests: number;
    }>();

    for (const need of needs) {
      const key = `${need.productType}-${need.strain || 'any'}`;
      const existing = aggregated.get(key);
      
      if (existing) {
        existing.totalQuantity += parseFloat(need.quantity as string || '0');
        existing.requestCount++;
        if (need.clientTier === 'VIP' || need.clientTier === 'PLATINUM') {
          existing.vipRequests++;
        }
      } else {
        aggregated.set(key, {
          productType: need.productType || 'Unknown',
          strain: need.strain,
          totalQuantity: parseFloat(need.quantity as string || '0'),
          requestCount: 1,
          vipRequests: (need.clientTier === 'VIP' || need.clientTier === 'PLATINUM') ? 1 : 0,
        });
      }
    }

    return Array.from(aggregated.values())
      .sort((a, b) => b.vipRequests - a.vipRequests || b.requestCount - a.requestCount);
  }),
});
