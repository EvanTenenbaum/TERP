/**
 * Sprint 4 Track B - 4.B.9: MEET-055 - Office Needs Auto-Population
 *
 * Router for managing office supply needs:
 * - Track office supply products
 * - Monitor low stock for office items
 * - Auto-generate reorder suggestions
 * - Weekly/monthly needs report
 * - Integration with purchasing workflow
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { products } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const officeSupplyRouter = router({
  /**
   * Register a product as an office supply item
   */
  registerItem: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        productId: z.number(),
        reorderPoint: z.number().min(0),
        reorderQuantity: z.number().min(1),
        preferredSupplierId: z.number().optional(),
        autoReorderEnabled: z.boolean().default(false),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Verify product exists
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      // Check if already registered
      const [existing] = await db.execute(sql`
        SELECT id FROM office_supply_items WHERE product_id = ${input.productId}
      `);

      if (existing) {
        // Update existing
        await db.execute(sql`
          UPDATE office_supply_items
          SET
            reorder_point = ${input.reorderPoint},
            reorder_quantity = ${input.reorderQuantity},
            preferred_supplier_id = ${input.preferredSupplierId || null},
            auto_reorder_enabled = ${input.autoReorderEnabled},
            notes = ${input.notes || null},
            is_active = TRUE
          WHERE product_id = ${input.productId}
        `);

        return {
          success: true,
          id: (existing as { id: number }).id,
          updated: true,
        };
      }

      // Insert new
      const [result] = await db.execute(sql`
        INSERT INTO office_supply_items (
          product_id, reorder_point, reorder_quantity,
          preferred_supplier_id, auto_reorder_enabled, notes, created_by
        ) VALUES (
          ${input.productId},
          ${input.reorderPoint},
          ${input.reorderQuantity},
          ${input.preferredSupplierId || null},
          ${input.autoReorderEnabled},
          ${input.notes || null},
          ${ctx.user.id}
        )
      `);

      return {
        success: true,
        id: (result as { insertId: number }).insertId,
        updated: false,
      };
    }),

  /**
   * Get all office supply items with current stock levels
   */
  list: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        onlyLowStock: z.boolean().default(false),
        onlyActive: z.boolean().default(true),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const activeFilter = input.onlyActive
        ? sql`AND osi.is_active = TRUE`
        : sql``;
      const lowStockFilter = input.onlyLowStock
        ? sql`AND (current_stock IS NULL OR current_stock <= osi.reorder_point)`
        : sql``;

      const items = await db.execute(sql`
        SELECT
          osi.*,
          p.name as product_name,
          p.sku as product_sku,
          c.name as supplier_name,
          c.teri_code as supplier_code,
          (
            SELECT COALESCE(SUM(i.quantity), 0)
            FROM inventory i
            WHERE i.product_id = osi.product_id AND i.status = 'Available'
          ) as current_stock
        FROM office_supply_items osi
        INNER JOIN products p ON osi.product_id = p.id
        LEFT JOIN clients c ON osi.preferred_supplier_id = c.id
        WHERE 1=1 ${activeFilter} ${lowStockFilter}
        ORDER BY
          CASE WHEN (
            SELECT COALESCE(SUM(i.quantity), 0)
            FROM inventory i
            WHERE i.product_id = osi.product_id AND i.status = 'Available'
          ) <= osi.reorder_point THEN 0 ELSE 1 END,
          p.name
        LIMIT ${input.limit} OFFSET ${input.offset}
      `);

      return { items };
    }),

  /**
   * Get office supply item by ID
   */
  getById: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [item] = await db.execute(sql`
        SELECT
          osi.*,
          p.name as product_name,
          p.sku as product_sku,
          c.name as supplier_name,
          (
            SELECT COALESCE(SUM(i.quantity), 0)
            FROM inventory i
            WHERE i.product_id = osi.product_id AND i.status = 'Available'
          ) as current_stock
        FROM office_supply_items osi
        INNER JOIN products p ON osi.product_id = p.id
        LEFT JOIN clients c ON osi.preferred_supplier_id = c.id
        WHERE osi.id = ${input.id}
        LIMIT 1
      `);

      return item || null;
    }),

  /**
   * Update office supply item settings
   */
  update: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number(),
        reorderPoint: z.number().min(0).optional(),
        reorderQuantity: z.number().min(1).optional(),
        preferredSupplierId: z.number().optional().nullable(),
        autoReorderEnabled: z.boolean().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const updates: string[] = [];

      if (input.reorderPoint !== undefined) {
        updates.push(`reorder_point = ${input.reorderPoint}`);
      }
      if (input.reorderQuantity !== undefined) {
        updates.push(`reorder_quantity = ${input.reorderQuantity}`);
      }
      if (input.preferredSupplierId !== undefined) {
        updates.push(
          `preferred_supplier_id = ${input.preferredSupplierId || null}`
        );
      }
      if (input.autoReorderEnabled !== undefined) {
        updates.push(`auto_reorder_enabled = ${input.autoReorderEnabled}`);
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = ${input.isActive}`);
      }
      if (input.notes !== undefined) {
        updates.push(
          `notes = ${input.notes ? `'${input.notes.replace(/'/g, "''")}'` : "NULL"}`
        );
      }

      if (updates.length === 0) {
        return { success: true };
      }

      await db.execute(
        sql.raw(
          `UPDATE office_supply_items SET ${updates.join(", ")} WHERE id = ${input.id}`
        )
      );

      return { success: true };
    }),

  /**
   * Remove office supply item tracking (deactivate)
   */
  deactivate: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db.execute(sql`
        UPDATE office_supply_items SET is_active = FALSE WHERE id = ${input.id}
      `);

      return { success: true };
    }),

  /**
   * Generate reorder suggestions for low stock items
   */
  generateReorderSuggestions: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get all active items that are at or below reorder point
      const lowStockItems = await db.execute(sql`
        SELECT
          osi.*,
          p.name as product_name,
          p.sku as product_sku,
          c.name as supplier_name,
          c.teri_code as supplier_code,
          c.id as supplier_id,
          (
            SELECT COALESCE(SUM(i.quantity), 0)
            FROM inventory i
            WHERE i.product_id = osi.product_id AND i.status = 'Available'
          ) as current_stock
        FROM office_supply_items osi
        INNER JOIN products p ON osi.product_id = p.id
        LEFT JOIN clients c ON osi.preferred_supplier_id = c.id
        WHERE osi.is_active = TRUE
        HAVING current_stock <= osi.reorder_point
        ORDER BY
          CASE WHEN current_stock = 0 THEN 0 ELSE 1 END,
          (osi.reorder_point - current_stock) DESC
      `);

      // Create/update office supply needs for each low stock item
      const suggestions: Array<{
        officeSupplyItemId: number;
        productName: string;
        productSku: string | null;
        currentStock: number;
        reorderPoint: number;
        suggestedQuantity: number;
        supplierName: string | null;
        supplierId: number | null;
        status: string;
        urgency: "critical" | "low" | "normal";
      }> = [];

      for (const item of lowStockItems as Array<{
        id: number;
        product_id: number;
        product_name: string;
        product_sku: string | null;
        current_stock: number;
        reorder_point: number;
        reorder_quantity: number;
        supplier_name: string | null;
        supplier_id: number | null;
      }>) {
        const currentStock = Number(item.current_stock) || 0;
        const reorderPoint = Number(item.reorder_point);
        const reorderQuantity = Number(item.reorder_quantity);

        // Calculate suggested quantity (at least reorder quantity, more if very low)
        let suggestedQuantity = reorderQuantity;
        if (currentStock === 0) {
          suggestedQuantity = Math.max(reorderQuantity * 1.5, reorderPoint * 2);
        }

        // Check if there's already a pending need for this item
        const [existingNeed] = await db.execute(sql`
          SELECT id FROM office_supply_needs
          WHERE office_supply_item_id = ${item.id}
            AND status IN ('PENDING', 'APPROVED')
          LIMIT 1
        `);

        if (!existingNeed) {
          // Create new need
          await db.execute(sql`
            INSERT INTO office_supply_needs (
              office_supply_item_id, current_stock, suggested_quantity, status
            ) VALUES (
              ${item.id}, ${currentStock}, ${suggestedQuantity}, 'PENDING'
            )
          `);
        }

        suggestions.push({
          officeSupplyItemId: item.id,
          productName: item.product_name,
          productSku: item.product_sku,
          currentStock,
          reorderPoint,
          suggestedQuantity: Math.ceil(suggestedQuantity),
          supplierName: item.supplier_name,
          supplierId: item.supplier_id,
          status: existingNeed ? "existing" : "new",
          urgency:
            currentStock === 0
              ? "critical"
              : currentStock < reorderPoint / 2
                ? "low"
                : "normal",
        });
      }

      return {
        suggestions,
        totalLowStock: suggestions.length,
        critical: suggestions.filter(s => s.urgency === "critical").length,
      };
    }),

  /**
   * Get pending office supply needs
   */
  getPendingNeeds: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        status: z
          .enum(["PENDING", "APPROVED", "ORDERED", "RECEIVED", "CANCELLED"])
          .optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const statusFilter = input.status
        ? sql`AND osn.status = ${input.status}`
        : sql`AND osn.status IN ('PENDING', 'APPROVED')`;

      const needs = await db.execute(sql`
        SELECT
          osn.*,
          osi.product_id,
          osi.reorder_point,
          osi.reorder_quantity,
          osi.preferred_supplier_id,
          p.name as product_name,
          p.sku as product_sku,
          c.name as supplier_name,
          u.name as approved_by_name
        FROM office_supply_needs osn
        INNER JOIN office_supply_items osi ON osn.office_supply_item_id = osi.id
        INNER JOIN products p ON osi.product_id = p.id
        LEFT JOIN clients c ON osi.preferred_supplier_id = c.id
        LEFT JOIN users u ON osn.approved_by = u.id
        WHERE 1=1 ${statusFilter}
        ORDER BY osn.created_at DESC
        LIMIT ${input.limit}
      `);

      return { needs };
    }),

  /**
   * Approve an office supply need
   */
  approveNeed: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        needId: z.number(),
        adjustedQuantity: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const quantityUpdate = input.adjustedQuantity
        ? sql`, suggested_quantity = ${input.adjustedQuantity}`
        : sql``;

      await db.execute(sql`
        UPDATE office_supply_needs
        SET
          status = 'APPROVED',
          approved_by = ${ctx.user.id},
          approved_at = NOW()
          ${quantityUpdate}
        WHERE id = ${input.needId}
      `);

      return { success: true };
    }),

  /**
   * Mark office supply need as ordered (link to PO)
   */
  markOrdered: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        needId: z.number(),
        purchaseOrderId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db.execute(sql`
        UPDATE office_supply_needs
        SET status = 'ORDERED', purchase_order_id = ${input.purchaseOrderId}
        WHERE id = ${input.needId}
      `);

      // Update last reorder date on the item
      await db.execute(sql`
        UPDATE office_supply_items osi
        SET last_reorder_date = NOW()
        WHERE id = (SELECT office_supply_item_id FROM office_supply_needs WHERE id = ${input.needId})
      `);

      return { success: true };
    }),

  /**
   * Mark office supply need as received
   */
  markReceived: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({ needId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db.execute(sql`
        UPDATE office_supply_needs SET status = 'RECEIVED' WHERE id = ${input.needId}
      `);

      return { success: true };
    }),

  /**
   * Cancel an office supply need
   */
  cancelNeed: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(z.object({ needId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db.execute(sql`
        UPDATE office_supply_needs SET status = 'CANCELLED' WHERE id = ${input.needId}
      `);

      return { success: true };
    }),

  /**
   * Get office supply summary report
   */
  getSummaryReport: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        period: z.enum(["week", "month", "quarter"]).default("month"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const periodDays =
        input.period === "week" ? 7 : input.period === "month" ? 30 : 90;

      // Total items tracked
      const [totalTracked] = await db.execute(sql`
        SELECT COUNT(*) as count FROM office_supply_items WHERE is_active = TRUE
      `);

      // Items below reorder point
      const [belowReorder] = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM office_supply_items osi
        WHERE osi.is_active = TRUE
          AND (
            SELECT COALESCE(SUM(i.quantity), 0)
            FROM inventory i
            WHERE i.product_id = osi.product_id AND i.status = 'Available'
          ) <= osi.reorder_point
      `);

      // Items out of stock
      const [outOfStock] = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM office_supply_items osi
        WHERE osi.is_active = TRUE
          AND (
            SELECT COALESCE(SUM(i.quantity), 0)
            FROM inventory i
            WHERE i.product_id = osi.product_id AND i.status = 'Available'
          ) = 0
      `);

      // Pending needs
      const [pendingNeeds] = await db.execute(sql`
        SELECT COUNT(*) as count FROM office_supply_needs WHERE status = 'PENDING'
      `);

      // Needs completed in period
      const [completedNeeds] = await db.execute(sql`
        SELECT COUNT(*) as count FROM office_supply_needs
        WHERE status = 'RECEIVED'
          AND updated_at >= DATE_SUB(NOW(), INTERVAL ${periodDays} DAY)
      `);

      // Top items by reorder frequency
      const topReorderedResult = await db.execute(sql`
        SELECT
          p.name as product_name,
          COUNT(osn.id) as reorder_count
        FROM office_supply_needs osn
        INNER JOIN office_supply_items osi ON osn.office_supply_item_id = osi.id
        INNER JOIN products p ON osi.product_id = p.id
        WHERE osn.created_at >= DATE_SUB(NOW(), INTERVAL ${periodDays} DAY)
        GROUP BY p.id, p.name
        ORDER BY reorder_count DESC
        LIMIT 5
      `);

      const topReordered = topReorderedResult as unknown as Array<{
        product_name: string;
        reorder_count: number;
      }>;

      return {
        period: input.period,
        periodDays,
        summary: {
          totalTracked:
            (totalTracked as unknown as { count: number })?.count || 0,
          belowReorder:
            (belowReorder as unknown as { count: number })?.count || 0,
          outOfStock: (outOfStock as unknown as { count: number })?.count || 0,
          pendingNeeds:
            (pendingNeeds as unknown as { count: number })?.count || 0,
          completedNeeds:
            (completedNeeds as unknown as { count: number })?.count || 0,
        },
        topReordered,
      };
    }),
});
