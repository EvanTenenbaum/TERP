/**
 * WS-003: Pick & Pack Module Router
 *
 * Provides endpoints for warehouse picking and packing operations:
 * - Real-time pick list queue
 * - Multi-select item packing
 * - Bag/container management
 * - Order status tracking
 */

import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// Pick & Pack status enum for validation
const pickPackStatusSchema = z.enum(["PENDING", "PICKING", "PACKED", "READY"]);

export const pickPackRouter = router({
  /**
   * Get the real-time pick list (orders ready for picking)
   */
  getPickList: adminProcedure
    .input(
      z.object({
        filters: z
          .object({
            status: pickPackStatusSchema.optional(),
            customerId: z.number().optional(),
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
          })
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx: _ctx }) => {
      const db = await import("../db").then(m => m.getDb());
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { orders, clients, orderBags, orderItemBags } =
        await import("../../drizzle/schema");
      const { eq, and, gte, lte, sql, isNull, count, desc } =
        await import("drizzle-orm");

      // Build conditions
      const conditions = [
        eq(orders.orderType, "SALE"),
        eq(orders.isDraft, false),
        isNull(orders.deletedAt),
      ];

      if (input.filters?.status) {
        conditions.push(eq(orders.pickPackStatus, input.filters.status));
      } else {
        // Default: show all non-shipped orders
        conditions.push(
          sql`${orders.pickPackStatus} != 'READY' OR ${orders.pickPackStatus} IS NULL`
        );
      }

      if (input.filters?.customerId) {
        conditions.push(eq(orders.clientId, input.filters.customerId));
      }

      if (input.filters?.dateFrom) {
        conditions.push(
          gte(orders.createdAt, new Date(input.filters.dateFrom))
        );
      }

      if (input.filters?.dateTo) {
        conditions.push(lte(orders.createdAt, new Date(input.filters.dateTo)));
      }

      // Get orders with client info and pack counts
      const pickListOrders = await db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          clientId: orders.clientId,
          clientName: clients.name,
          items: orders.items,
          pickPackStatus: orders.pickPackStatus,
          fulfillmentStatus: orders.fulfillmentStatus,
          createdAt: orders.createdAt,
          confirmedAt: orders.confirmedAt,
          total: orders.total,
        })
        .from(orders)
        .innerJoin(clients, eq(orders.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get bag counts for each order
      const orderIds = pickListOrders.map(o => o.orderId);

      const bagCounts: Record<
        number,
        { bagCount: number; packedItemCount: number }
      > = {};

      if (orderIds.length > 0) {
        const bagStats = await db
          .select({
            orderId: orderBags.orderId,
            bagCount: count(orderBags.id),
          })
          .from(orderBags)
          .where(
            sql`${orderBags.orderId} IN (${sql.join(
              orderIds.map(id => sql`${id}`),
              sql`, `
            )})`
          )
          .groupBy(orderBags.orderId);

        for (const stat of bagStats) {
          bagCounts[stat.orderId] = {
            bagCount: Number(stat.bagCount),
            packedItemCount: 0,
          };
        }

        // Get packed item counts
        const packedCounts = await db
          .select({
            orderId: orderBags.orderId,
            packedCount: count(orderItemBags.id),
          })
          .from(orderItemBags)
          .innerJoin(orderBags, eq(orderItemBags.bagId, orderBags.id))
          .where(
            sql`${orderBags.orderId} IN (${sql.join(
              orderIds.map(id => sql`${id}`),
              sql`, `
            )})`
          )
          .groupBy(orderBags.orderId);

        for (const stat of packedCounts) {
          if (bagCounts[stat.orderId]) {
            bagCounts[stat.orderId].packedItemCount = Number(stat.packedCount);
          }
        }
      }

      // Format response
      return pickListOrders.map(order => {
        const items =
          (order.items as Array<{ id?: number; quantity?: number }>) || [];
        const itemCount = items.reduce(
          (sum, item) => sum + (item.quantity || 1),
          0
        );
        const stats = bagCounts[order.orderId] || {
          bagCount: 0,
          packedItemCount: 0,
        };

        return {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          clientId: order.clientId,
          clientName: order.clientName,
          itemCount,
          packedCount: stats.packedItemCount,
          bagCount: stats.bagCount,
          pickPackStatus: order.pickPackStatus || "PENDING",
          fulfillmentStatus: order.fulfillmentStatus,
          createdAt: order.createdAt,
          confirmedAt: order.confirmedAt,
          total: order.total,
        };
      });
    }),

  /**
   * Get order details for picking/packing
   */
  getOrderDetails: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx: _ctx }) => {
      const db = await import("../db").then(m => m.getDb());
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { orders, clients, orderBags, orderItemBags } =
        await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Get order with client
      const [order] = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          clientId: orders.clientId,
          clientName: clients.name,
          items: orders.items,
          pickPackStatus: orders.pickPackStatus,
          fulfillmentStatus: orders.fulfillmentStatus,
          total: orders.total,
          notes: orders.notes,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .innerJoin(clients, eq(orders.clientId, clients.id))
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Get bags for this order
      const bags = await db
        .select({
          id: orderBags.id,
          identifier: orderBags.bagIdentifier,
          notes: orderBags.notes,
          createdAt: orderBags.createdAt,
          createdBy: orderBags.createdBy,
        })
        .from(orderBags)
        .where(eq(orderBags.orderId, input.orderId));

      // Get item-to-bag assignments
      const itemBagAssignments = await db
        .select({
          id: orderItemBags.id,
          orderItemId: orderItemBags.orderItemId,
          bagId: orderItemBags.bagId,
          packedAt: orderItemBags.packedAt,
          packedBy: orderItemBags.packedBy,
        })
        .from(orderItemBags)
        .innerJoin(orderBags, eq(orderItemBags.bagId, orderBags.id))
        .where(eq(orderBags.orderId, input.orderId));

      // Create a map of item assignments
      const itemAssignments = new Map<
        number,
        { bagId: number; bagIdentifier: string; packedAt: Date | null }
      >();
      for (const assignment of itemBagAssignments) {
        const bag = bags.find(b => b.id === assignment.bagId);
        if (bag) {
          itemAssignments.set(assignment.orderItemId, {
            bagId: assignment.bagId,
            bagIdentifier: bag.identifier,
            packedAt: assignment.packedAt,
          });
        }
      }

      // Format items with pack status
      const items =
        (order.items as Array<{
          id?: number;
          productId?: number;
          productName?: string;
          strainName?: string;
          quantity?: number;
          unitPrice?: number;
          location?: string;
        }>) || [];

      const formattedItems = items.map((item, index) => {
        const itemId = item.id || index;
        const assignment = itemAssignments.get(itemId);

        return {
          id: itemId,
          productId: item.productId,
          productName:
            item.productName || item.strainName || `Item ${index + 1}`,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice,
          location: item.location || "N/A",
          isPacked: !!assignment,
          bagId: assignment?.bagId || null,
          bagIdentifier: assignment?.bagIdentifier || null,
          packedAt: assignment?.packedAt || null,
        };
      });

      // Format bags with item counts
      const formattedBags = bags.map(bag => ({
        id: bag.id,
        identifier: bag.identifier,
        notes: bag.notes,
        itemCount: itemBagAssignments.filter(a => a.bagId === bag.id).length,
        createdAt: bag.createdAt,
      }));

      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          clientId: order.clientId,
          clientName: order.clientName,
          pickPackStatus: order.pickPackStatus || "PENDING",
          fulfillmentStatus: order.fulfillmentStatus,
          total: order.total,
          notes: order.notes,
          createdAt: order.createdAt,
        },
        items: formattedItems,
        bags: formattedBags,
        summary: {
          totalItems: formattedItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          ),
          packedItems: formattedItems
            .filter(item => item.isPacked)
            .reduce((sum, item) => sum + item.quantity, 0),
          bagCount: formattedBags.length,
        },
      };
    }),

  /**
   * Pack selected items into a bag
   */
  packItems: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        itemIds: z.array(z.number()).min(1),
        bagIdentifier: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await import("../db").then(m => m.getDb());
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { orders, orderBags, orderItemBags } =
        await import("../../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      // Verify order exists
      const [order] = await db
        .select({ id: orders.id, pickPackStatus: orders.pickPackStatus })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Generate bag identifier if not provided
      let bagIdentifier = input.bagIdentifier;
      if (!bagIdentifier) {
        // Get existing bag count for this order
        const [bagCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(orderBags)
          .where(eq(orderBags.orderId, input.orderId));

        const nextBagNum = (bagCount?.count || 0) + 1;
        bagIdentifier = `BAG-${String(nextBagNum).padStart(3, "0")}`;
      }

      // Create or get bag
      let bagId: number;
      const [existingBag] = await db
        .select({ id: orderBags.id })
        .from(orderBags)
        .where(
          and(
            eq(orderBags.orderId, input.orderId),
            eq(orderBags.bagIdentifier, bagIdentifier)
          )
        )
        .limit(1);

      if (existingBag) {
        bagId = existingBag.id;
      } else {
        const [newBag] = await db.insert(orderBags).values({
          orderId: input.orderId,
          bagIdentifier,
          notes: input.notes,
          createdBy: ctx.user?.id,
        });
        bagId = newBag.insertId;
      }

      // Assign items to bag (skip already packed items)
      let packedCount = 0;
      for (const itemId of input.itemIds) {
        try {
          await db.insert(orderItemBags).values({
            orderItemId: itemId,
            bagId,
            packedBy: ctx.user?.id,
          });
          packedCount++;
        } catch (err) {
          // Item might already be packed - skip
          console.warn(`Item ${itemId} already packed or error:`, err);
        }
      }

      // Update order pick pack status to PICKING if it was PENDING
      if (order.pickPackStatus === "PENDING" || !order.pickPackStatus) {
        await db
          .update(orders)
          .set({ pickPackStatus: "PICKING" })
          .where(eq(orders.id, input.orderId));
      }

      return {
        bagId,
        bagIdentifier,
        packedItemCount: packedCount,
      };
    }),

  /**
   * Unpack items from a bag (requires confirmation)
   */
  unpackItems: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        itemIds: z.array(z.number()).min(1),
        reason: z.string().min(1, "Reason is required for unpacking"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await import("../db").then(m => m.getDb());
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { orderBags, orderItemBags, auditLogs, orders } =
        await import("../../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      // Get bag IDs for this order
      const orderBagIds = await db
        .select({ id: orderBags.id })
        .from(orderBags)
        .where(eq(orderBags.orderId, input.orderId));

      if (orderBagIds.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No bags found for this order",
        });
      }

      const bagIds = orderBagIds.map(b => b.id);

      // Delete item-bag assignments
      await db.delete(orderItemBags).where(
        and(
          sql`${orderItemBags.orderItemId} IN (${sql.join(
            input.itemIds.map(id => sql`${id}`),
            sql`, `
          )})`,
          sql`${orderItemBags.bagId} IN (${sql.join(
            bagIds.map(id => sql`${id}`),
            sql`, `
          )})`
        )
      );

      // Log the unpack action with reason to audit log (WS-005)
      // Get order number for better audit trail
      const [order] = await db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      await db.insert(auditLogs).values({
        actorId: ctx.user.id,
        entity: "ORDER_ITEM_BAG",
        entityId: input.orderId,
        action: "UNPACK_ITEMS",
        before: JSON.stringify({
          orderId: input.orderId,
          orderNumber: order?.orderNumber,
          itemIds: input.itemIds,
          itemCount: input.itemIds.length,
        }),
        after: JSON.stringify({
          status: "UNPACKED",
          itemCount: input.itemIds.length,
        }),
        reason: input.reason,
      });

      return {
        success: true,
        unpackedCount: input.itemIds.length,
        reason: input.reason,
      };
    }),

  /**
   * Mark all items in order as packed
   */
  markAllPacked: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        bagIdentifier: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await import("../db").then(m => m.getDb());
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { orders, orderBags, orderItemBags } =
        await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Get order items
      const [order] = await db
        .select({ id: orders.id, items: orders.items })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const items = (order.items as Array<{ id?: number }>) || [];
      const itemIds = items.map((item, index) => item.id || index);

      // Create bag
      const bagIdentifier = input.bagIdentifier || "BAG-001";
      const [newBag] = await db.insert(orderBags).values({
        orderId: input.orderId,
        bagIdentifier,
        createdBy: ctx.user?.id,
      });

      // Pack all items
      let packedCount = 0;
      for (const itemId of itemIds) {
        try {
          await db.insert(orderItemBags).values({
            orderItemId: itemId,
            bagId: newBag.insertId,
            packedBy: ctx.user?.id,
          });
          packedCount++;
        } catch (_err) {
          // Skip already packed items
        }
      }

      // Update order status to PACKED
      await db
        .update(orders)
        .set({ pickPackStatus: "PACKED" })
        .where(eq(orders.id, input.orderId));

      return {
        bagId: newBag.insertId,
        bagIdentifier,
        packedItemCount: packedCount,
      };
    }),

  /**
   * Mark order as ready for shipping
   */
  markOrderReady: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await import("../db").then(m => m.getDb());
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { orders, orderBags, orderItemBags } =
        await import("../../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");

      // Get order with items
      const [order] = await db
        .select({ id: orders.id, items: orders.items })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const items = (order.items as Array<{ id?: number }>) || [];
      const totalItemCount = items.length;

      // Count packed items
      const [packedCount] = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${orderItemBags.orderItemId})`,
        })
        .from(orderItemBags)
        .innerJoin(orderBags, eq(orderItemBags.bagId, orderBags.id))
        .where(eq(orderBags.orderId, input.orderId));

      if ((packedCount?.count || 0) < totalItemCount) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Cannot mark as ready: ${totalItemCount - (packedCount?.count || 0)} items still need to be packed`,
        });
      }

      // Update order status
      await db
        .update(orders)
        .set({
          pickPackStatus: "READY",
          packedAt: new Date(),
          packedBy: ctx.user?.id,
        })
        .where(eq(orders.id, input.orderId));

      return { success: true };
    }),

  /**
   * Update order pick/pack status
   */
  updateStatus: adminProcedure
    .input(
      z.object({
        orderId: z.number(),
        status: pickPackStatusSchema,
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      const db = await import("../db").then(m => m.getDb());
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { orders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(orders)
        .set({ pickPackStatus: input.status })
        .where(eq(orders.id, input.orderId));

      return { success: true, status: input.status };
    }),

  /**
   * Get stats for the pick/pack dashboard
   */
  getStats: adminProcedure.query(async ({ ctx: _ctx }) => {
    const db = await import("../db").then(m => m.getDb());
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const { orders } = await import("../../drizzle/schema");
    const { eq, and, isNull, sql } = await import("drizzle-orm");

    const conditions = [
      eq(orders.orderType, "SALE"),
      eq(orders.isDraft, false),
      isNull(orders.deletedAt),
    ];

    // Get counts by status
    const stats = await db
      .select({
        status: orders.pickPackStatus,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(...conditions))
      .groupBy(orders.pickPackStatus);

    const statusCounts = {
      PENDING: 0,
      PICKING: 0,
      PACKED: 0,
      READY: 0,
    };

    for (const stat of stats) {
      if (stat.status && stat.status in statusCounts) {
        statusCounts[stat.status as keyof typeof statusCounts] = Number(
          stat.count
        );
      } else {
        // NULL status counts as PENDING
        statusCounts.PENDING += Number(stat.count);
      }
    }

    return {
      pending: statusCounts.PENDING,
      picking: statusCounts.PICKING,
      packed: statusCounts.PACKED,
      ready: statusCounts.READY,
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    };
  }),
});

export type PickPackRouter = typeof pickPackRouter;
