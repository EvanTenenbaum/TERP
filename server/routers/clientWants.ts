/**
 * Sprint 4 Track B - 4.B.6: MEET-021 - Client Wants/Needs Tracking
 *
 * Router for managing client wants/needs:
 * - Add/edit/delete wants
 * - Match wants to inventory
 * - Notify when matching product arrives
 * - Wants list on client profile
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { clients, products, batches } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const clientWantsRouter = router({
  /**
   * Create a new client want
   */
  create: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(
      z.object({
        clientId: z.number(),
        productId: z.number().optional(),
        categoryId: z.number().optional(),
        strainName: z.string().optional(),
        productKeywords: z.string().optional(),
        minQuantity: z.number().optional(),
        maxQuantity: z.number().optional(),
        maxPricePerUnit: z.number().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
        notes: z.string().optional(),
        internalNotes: z.string().optional(),
        notifyOnMatch: z.boolean().default(true),
        notifyEmail: z.boolean().default(false),
        neededByDate: z.string().optional(), // ISO date string
        expiresAt: z.string().optional(), // ISO date string
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

      // Verify client exists
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Insert the want
      const [result] = await db.execute(sql`
        INSERT INTO client_wants (
          client_id, product_id, category_id, strain_name, product_keywords,
          min_quantity, max_quantity, max_price_per_unit,
          priority, status, notes, internal_notes,
          notify_on_match, notify_email,
          needed_by_date, expires_at, created_by
        ) VALUES (
          ${input.clientId},
          ${input.productId || null},
          ${input.categoryId || null},
          ${input.strainName || null},
          ${input.productKeywords || null},
          ${input.minQuantity || null},
          ${input.maxQuantity || null},
          ${input.maxPricePerUnit || null},
          ${input.priority},
          'ACTIVE',
          ${input.notes || null},
          ${input.internalNotes || null},
          ${input.notifyOnMatch},
          ${input.notifyEmail},
          ${input.neededByDate ? new Date(input.neededByDate) : null},
          ${input.expiresAt ? new Date(input.expiresAt) : null},
          ${ctx.user.id}
        )
      `);

      return {
        success: true,
        id: (result as { insertId: number }).insertId,
      };
    }),

  /**
   * Get client wants by client ID
   */
  getByClient: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        clientId: z.number(),
        status: z
          .enum(["ACTIVE", "MATCHED", "FULFILLED", "EXPIRED", "CANCELLED"])
          .optional(),
        limit: z.number().default(50),
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

      const statusFilter = input.status
        ? sql`AND cw.status = ${input.status}`
        : sql``;

      const wants = await db.execute(sql`
        SELECT
          cw.*,
          p.name as product_name,
          c.name as category_name,
          u.name as created_by_name
        FROM client_wants cw
        LEFT JOIN products p ON cw.product_id = p.id
        LEFT JOIN categories c ON cw.category_id = c.id
        LEFT JOIN users u ON cw.created_by = u.id
        WHERE cw.client_id = ${input.clientId} ${statusFilter}
        ORDER BY cw.created_at DESC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `);

      const countResultRaw = await db.execute(sql`
        SELECT COUNT(*) as total FROM client_wants
        WHERE client_id = ${input.clientId} ${statusFilter}
      `);

      const countData = (
        countResultRaw as unknown as Array<{ total: number }>
      )[0];
      return {
        wants,
        total: countData?.total || 0,
      };
    }),

  /**
   * Get want by ID
   */
  getById: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [want] = await db.execute(sql`
        SELECT
          cw.*,
          p.name as product_name,
          c.name as category_name,
          cl.name as client_name,
          cl.teri_code as client_code
        FROM client_wants cw
        LEFT JOIN products p ON cw.product_id = p.id
        LEFT JOIN categories c ON cw.category_id = c.id
        LEFT JOIN clients cl ON cw.client_id = cl.id
        WHERE cw.id = ${input.id}
        LIMIT 1
      `);

      return want || null;
    }),

  /**
   * Update a client want
   */
  update: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(
      z.object({
        id: z.number(),
        productId: z.number().optional().nullable(),
        categoryId: z.number().optional().nullable(),
        strainName: z.string().optional().nullable(),
        productKeywords: z.string().optional().nullable(),
        minQuantity: z.number().optional().nullable(),
        maxQuantity: z.number().optional().nullable(),
        maxPricePerUnit: z.number().optional().nullable(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        status: z
          .enum(["ACTIVE", "MATCHED", "FULFILLED", "EXPIRED", "CANCELLED"])
          .optional(),
        notes: z.string().optional().nullable(),
        internalNotes: z.string().optional().nullable(),
        notifyOnMatch: z.boolean().optional(),
        notifyEmail: z.boolean().optional(),
        neededByDate: z.string().optional().nullable(),
        expiresAt: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Build update using sql template
      await db.execute(sql`
        UPDATE client_wants SET
          product_id = ${input.productId ?? sql`product_id`},
          category_id = ${input.categoryId ?? sql`category_id`},
          strain_name = ${input.strainName ?? sql`strain_name`},
          product_keywords = ${input.productKeywords ?? sql`product_keywords`},
          min_quantity = ${input.minQuantity ?? sql`min_quantity`},
          max_quantity = ${input.maxQuantity ?? sql`max_quantity`},
          max_price_per_unit = ${input.maxPricePerUnit ?? sql`max_price_per_unit`},
          priority = ${input.priority ?? sql`priority`},
          status = ${input.status ?? sql`status`},
          notes = ${input.notes ?? sql`notes`},
          internal_notes = ${input.internalNotes ?? sql`internal_notes`},
          notify_on_match = ${input.notifyOnMatch ?? sql`notify_on_match`},
          notify_email = ${input.notifyEmail ?? sql`notify_email`},
          needed_by_date = ${input.neededByDate ? new Date(input.neededByDate) : sql`needed_by_date`},
          expires_at = ${input.expiresAt ? new Date(input.expiresAt) : sql`expires_at`},
          updated_at = NOW()
        WHERE id = ${input.id}
      `);

      return { success: true };
    }),

  /**
   * Delete a client want
   */
  delete: protectedProcedure
    .use(requirePermission("clients:delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db.execute(sql`DELETE FROM client_wants WHERE id = ${input.id}`);

      return { success: true };
    }),

  /**
   * Find inventory matches for a client want
   */
  findMatches: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        wantId: z.number(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get the want details
      const wantResult = await db.execute(sql`
        SELECT * FROM client_wants WHERE id = ${input.wantId}
      `);

      const wantData = wantResult as unknown as Array<{
        product_id: number | null;
        category_id: number | null;
        strain_name: string | null;
        product_keywords: string | null;
        min_quantity: string | null;
        max_quantity: string | null;
        max_price_per_unit: string | null;
      }>;

      const want = wantData[0];
      if (!want) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Want not found" });
      }

      // Use raw SQL query since batches don't have direct price column
      const matchesResult = await db.execute(sql`
        SELECT
          b.id as inventoryId,
          b.productId,
          p.nameCanonical as productName,
          p.category as categoryId,
          b.onHandQty as quantity
        FROM batches b
        INNER JOIN products p ON b.productId = p.id
        WHERE b.onHandQty > 0 AND b.batchStatus = 'LIVE'
          AND b.deleted_at IS NULL
          ${want.product_id ? sql`AND b.productId = ${want.product_id}` : sql``}
          ${want.strain_name ? sql`AND p.nameCanonical LIKE ${`%${want.strain_name}%`}` : sql``}
        ORDER BY b.onHandQty DESC
        LIMIT ${input.limit}
      `);

      const matches = matchesResult as unknown as Array<{
        inventoryId: number;
        productId: number;
        productName: string;
        categoryId: string | null;
        quantity: string;
      }>;

      // Calculate match scores
      const scoredMatches = matches.map(match => {
        let score = 50; // Base score

        // Exact product match
        if (want.product_id && match.productId === want.product_id) {
          score += 30;
        }

        // Category match
        if (want.category_id && match.categoryId === String(want.category_id)) {
          score += 20;
        }

        // Quantity available
        if (want.min_quantity && match.quantity) {
          const qtyAvailable = parseFloat(String(match.quantity));
          const qtyNeeded = parseFloat(want.min_quantity);
          if (qtyAvailable >= qtyNeeded) score += 15;
          else score -= 10;
        }

        return {
          ...match,
          matchScore: Math.min(100, Math.max(0, score)),
        };
      });

      // Sort by score descending
      scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

      // Update match count on the want
      await db.execute(sql`
        UPDATE client_wants
        SET match_count = ${scoredMatches.length}, last_matched_at = NOW()
        WHERE id = ${input.wantId}
      `);

      return {
        matches: scoredMatches,
        wantId: input.wantId,
      };
    }),

  /**
   * Get all active wants with match status
   */
  getAllActive: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
        limit: z.number().default(50),
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

      const priorityFilter = input.priority
        ? sql`AND cw.priority = ${input.priority}`
        : sql``;

      const wants = await db.execute(sql`
        SELECT
          cw.*,
          cl.name as client_name,
          cl.teri_code as client_code,
          p.name as product_name,
          c.name as category_name
        FROM client_wants cw
        INNER JOIN clients cl ON cw.client_id = cl.id
        LEFT JOIN products p ON cw.product_id = p.id
        LEFT JOIN categories c ON cw.category_id = c.id
        WHERE cw.status = 'ACTIVE' ${priorityFilter}
        ORDER BY
          CASE cw.priority
            WHEN 'URGENT' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'MEDIUM' THEN 3
            WHEN 'LOW' THEN 4
          END,
          cw.created_at DESC
        LIMIT ${input.limit} OFFSET ${input.offset}
      `);

      const countResultRaw = await db.execute(sql`
        SELECT COUNT(*) as total FROM client_wants
        WHERE status = 'ACTIVE' ${priorityFilter}
      `);

      const countData = (
        countResultRaw as unknown as Array<{ total: number }>
      )[0];
      return {
        wants,
        total: countData?.total || 0,
      };
    }),

  /**
   * Fulfill a want (mark as fulfilled and optionally link to order)
   */
  fulfill: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(
      z.object({
        id: z.number(),
        orderId: z.number().optional(),
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
        UPDATE client_wants
        SET status = 'FULFILLED', updated_at = NOW()
        WHERE id = ${input.id}
      `);

      return { success: true };
    }),

  /**
   * Cancel a want
   */
  cancel: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db.execute(sql`
        UPDATE client_wants
        SET status = 'CANCELLED', updated_at = NOW()
        WHERE id = ${input.id}
      `);

      return { success: true };
    }),

  /**
   * Check for matches on new inventory arrivals
   * Called when new inventory (batch) is added to find matching wants
   */
  checkInventoryForMatches: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        inventoryItemId: z.number(), // Actually batchId
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get batch (inventory item) details
      const [item] = await db
        .select({
          id: batches.id,
          productId: batches.productId,
          productName: products.nameCanonical,
          category: products.category,
          quantity: batches.onHandQty,
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .where(eq(batches.id, input.inventoryItemId))
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      // Find active wants that could match this item
      const matchingWants = await db.execute(sql`
        SELECT
          cw.*,
          cl.name as client_name,
          cl.teri_code as client_code,
          cl.email as client_email
        FROM client_wants cw
        INNER JOIN clients cl ON cw.client_id = cl.id
        WHERE cw.status = 'ACTIVE'
          AND (
            cw.product_id = ${item.productId}
            OR ${item.productName} LIKE CONCAT('%', cw.strain_name, '%')
          )
          AND (cw.min_quantity IS NULL OR ${item.quantity} >= cw.min_quantity)
        ORDER BY cw.priority DESC
        LIMIT 50
      `);

      return {
        inventoryItem: item,
        matchingWants,
        matchCount: (matchingWants as unknown[]).length,
      };
    }),
});
