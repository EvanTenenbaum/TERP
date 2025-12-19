import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { purchaseOrders, purchaseOrderItems, supplierProfiles } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getSupplierByLegacyVendorId } from "../inventoryDb";

export const purchaseOrdersRouter = router({
  // Create new purchase order
  // Supports both supplierClientId (canonical) and vendorId (deprecated, for backward compat)
  create: publicProcedure
    .input(
      z.object({
        // Canonical: supplier client ID (preferred)
        supplierClientId: z.number().optional(),
        // Deprecated: vendor ID (for backward compatibility)
        vendorId: z.number().optional(),
        intakeSessionId: z.number().optional(),
        orderDate: z.string(),
        expectedDeliveryDate: z.string().optional(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
        vendorNotes: z.string().optional(),
        createdBy: z.number(),
        items: z.array(
          z.object({
            productId: z.number(),
            quantityOrdered: z.number(),
            unitCost: z.number(),
          })
        ),
      }).refine(
        (data) => data.supplierClientId !== undefined || data.vendorId !== undefined,
        { message: "Either supplierClientId or vendorId must be provided" }
      )
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { items, ...poData } = input;

      // Resolve supplier client ID
      let resolvedSupplierClientId = poData.supplierClientId;
      let resolvedVendorId = poData.vendorId;

      // If only vendorId provided, resolve to supplierClientId via supplier_profiles
      if (!resolvedSupplierClientId && resolvedVendorId) {
        console.warn('[DEPRECATED] purchaseOrders.create called with vendorId - use supplierClientId instead');
        const supplier = await getSupplierByLegacyVendorId(resolvedVendorId);
        if (supplier) {
          resolvedSupplierClientId = supplier.id;
        }
      }

      // If only supplierClientId provided, try to resolve vendorId for backward compat
      if (resolvedSupplierClientId && !resolvedVendorId) {
        const [profile] = await db
          .select()
          .from(supplierProfiles)
          .where(eq(supplierProfiles.clientId, resolvedSupplierClientId))
          .limit(1);
        if (profile?.legacyVendorId) {
          resolvedVendorId = profile.legacyVendorId;
        }
      }

      // Validate that we have at least vendorId (required by schema for now)
      if (!resolvedVendorId) {
        throw new Error("Unable to resolve vendor ID for purchase order. Supplier may not have a legacy vendor mapping.");
      }

      // Generate PO number
      const poNumber = await generatePONumber(db);

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.quantityOrdered * item.unitCost, 0);

      // Create PO with both IDs
      const [po] = await db.insert(purchaseOrders).values({
        vendorId: resolvedVendorId,
        supplierClientId: resolvedSupplierClientId || null,
        intakeSessionId: poData.intakeSessionId,
        orderDate: new Date(poData.orderDate),
        expectedDeliveryDate: poData.expectedDeliveryDate ? new Date(poData.expectedDeliveryDate) : null,
        paymentTerms: poData.paymentTerms,
        notes: poData.notes,
        vendorNotes: poData.vendorNotes,
        createdBy: poData.createdBy,
        poNumber,
        subtotal: subtotal.toString(),
        total: subtotal.toString(), // tax and shipping can be added later
        purchaseOrderStatus: "DRAFT",
      });

      // Create PO items
      if (items.length > 0) {
        await db.insert(purchaseOrderItems).values(
          items.map((item) => ({
            purchaseOrderId: po.insertId,
            productId: item.productId,
            quantityOrdered: item.quantityOrdered.toString(),
            unitCost: item.unitCost.toString(),
            totalCost: (item.quantityOrdered * item.unitCost).toString(),
          }))
        );
      }

      return { id: po.insertId, poNumber, supplierClientId: resolvedSupplierClientId };
    }),

  // Get all purchase orders
  // Supports filtering by supplierClientId (canonical) or vendorId (deprecated)
  // BUG-034: Uses cursor-based pagination
  getAll: publicProcedure
    .input(
      z
        .object({
          supplierClientId: z.number().optional(), // Canonical filter
          vendorId: z.number().optional(), // Deprecated filter (backward compat)
          status: z.string().optional(),
          limit: z.number().min(1).max(100).optional(),
          cursor: z.string().nullish(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const limit = Math.min(input?.limit ?? 50, 100);

      // Build conditions array
      const conditions: ReturnType<typeof eq>[] = [];

      // Filter by supplier (canonical) or vendor (deprecated)
      if (input?.supplierClientId) {
        conditions.push(eq(purchaseOrders.supplierClientId, input.supplierClientId));
      } else if (input?.vendorId) {
        console.warn(
          "[DEPRECATED] purchaseOrders.getAll called with vendorId filter - use supplierClientId instead"
        );
        conditions.push(eq(purchaseOrders.vendorId, input.vendorId));
      }

      // Filter by status
      if (input?.status) {
        // Map PARTIALLY_RECEIVED to RECEIVING for schema compatibility
        const statusMap: Record<string, string> = {
          PARTIALLY_RECEIVED: "RECEIVING",
        };
        const mappedStatus = statusMap[input.status] || input.status;
        const validStatuses = [
          "DRAFT",
          "SENT",
          "CONFIRMED",
          "RECEIVING",
          "RECEIVED",
          "CANCELLED",
        ] as const;
        if (validStatuses.includes(mappedStatus as (typeof validStatuses)[number])) {
          conditions.push(
            eq(
              purchaseOrders.purchaseOrderStatus,
              mappedStatus as (typeof validStatuses)[number]
            )
          );
        }
      }

      // Get total count (without cursor)
      const countConditions = [...conditions];
      const countQuery = db.select({ count: sql<number>`count(*)` }).from(purchaseOrders);
      const [countResult] =
        countConditions.length > 0
          ? await countQuery.where(and(...countConditions))
          : await countQuery;
      const total = Number(countResult?.count ?? 0);

      // Apply cursor for pagination
      if (input?.cursor) {
        const cursorId = parseInt(input.cursor, 10);
        if (!isNaN(cursorId)) {
          conditions.push(sql`${purchaseOrders.id} < ${cursorId}`);
        }
      }

      // Execute query with conditions
      const baseQuery = db.select().from(purchaseOrders);
      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const pos = await query.orderBy(desc(purchaseOrders.id)).limit(limit + 1);

      const hasMore = pos.length > limit;
      const items = hasMore ? pos.slice(0, limit) : pos;
      const lastItem = items[items.length - 1];
      const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

      // BUG-034: Return PaginatedResult directly
      return {
        items,
        nextCursor,
        hasMore,
        total,
      };
    }),

  // Get purchase order by ID with items
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, input.id));

    if (!po) {
      throw new Error("Purchase order not found");
    }

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, input.id));

    return { ...po, items };
  }),

  // Update purchase order
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        supplierClientId: z.number().optional(), // Allow updating supplier
        expectedDeliveryDate: z.string().optional(),
        paymentTerms: z.string().optional(),
        notes: z.string().optional(),
        vendorNotes: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, expectedDeliveryDate, ...rest } = input;

      // Build update object with proper types
      const updateData: Record<string, unknown> = { ...rest };
      if (expectedDeliveryDate) {
        updateData.expectedDeliveryDate = new Date(expectedDeliveryDate);
      }

      await db
        .update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, id));

      return { success: true };
    }),

  // Delete purchase order
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db.delete(purchaseOrders).where(eq(purchaseOrders.id, input.id));
    return { success: true };
  }),

  // Update PO status
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["DRAFT", "SENT", "CONFIRMED", "RECEIVING", "RECEIVED", "CANCELLED"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, unknown> = { purchaseOrderStatus: input.status };

      if (input.status === "SENT") {
        updateData.sentAt = new Date();
      } else if (input.status === "CONFIRMED") {
        updateData.confirmedAt = new Date();
      } else if (input.status === "RECEIVED") {
        updateData.actualDeliveryDate = new Date();
      }

      await db.update(purchaseOrders).set(updateData).where(eq(purchaseOrders.id, input.id));

      return { success: true };
    }),

  // Add item to PO
  addItem: publicProcedure
    .input(
      z.object({
        purchaseOrderId: z.number(),
        productId: z.number(),
        quantityOrdered: z.number(),
        unitCost: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const totalCost = input.quantityOrdered * input.unitCost;

      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: input.purchaseOrderId,
        productId: input.productId,
        quantityOrdered: input.quantityOrdered.toString(),
        unitCost: input.unitCost.toString(),
        totalCost: totalCost.toString(),
        notes: input.notes,
      });

      // Recalculate PO totals
      await recalculatePOTotals(db, input.purchaseOrderId);

      return { success: true };
    }),

  // Update PO item
  updateItem: publicProcedure
    .input(
      z.object({
        id: z.number(),
        quantityOrdered: z.number().optional(),
        unitCost: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...data } = input;

      // Get current item
      const [item] = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.id, id));

      if (!item) {
        throw new Error("Purchase order item not found");
      }

      const quantityOrdered = data.quantityOrdered ?? parseFloat(item.quantityOrdered);
      const unitCost = data.unitCost ?? parseFloat(item.unitCost);
      const totalCost = quantityOrdered * unitCost;

      await db
        .update(purchaseOrderItems)
        .set({
          ...data,
          quantityOrdered: quantityOrdered.toString(),
          unitCost: unitCost.toString(),
          totalCost: totalCost.toString(),
        })
        .where(eq(purchaseOrderItems.id, id));

      // Recalculate PO totals
      await recalculatePOTotals(db, item.purchaseOrderId);

      return { success: true };
    }),

  // Delete PO item
  deleteItem: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [item] = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.id, input.id));

    if (!item) {
      throw new Error("Purchase order item not found");
    }

    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, input.id));

    // Recalculate PO totals
    await recalculatePOTotals(db, item.purchaseOrderId);

    return { success: true };
  }),

  // Get PO history for a supplier (canonical)
  getBySupplier: publicProcedure
    .input(z.object({ supplierClientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.supplierClientId, input.supplierClientId))
        .orderBy(desc(purchaseOrders.createdAt));
    }),

  // Get PO history for a vendor (DEPRECATED - use getBySupplier instead)
  getByVendor: publicProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input }) => {
      console.warn('[DEPRECATED] purchaseOrders.getByVendor - use getBySupplier with supplierClientId instead');
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.vendorId, input.vendorId))
        .orderBy(desc(purchaseOrders.createdAt));
    }),

  // Get PO history for a product
  getByProduct: publicProcedure.input(z.object({ productId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const items = await db
      .select({
        poId: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        supplierClientId: purchaseOrders.supplierClientId, // Canonical
        vendorId: purchaseOrders.vendorId, // Deprecated but included for backward compat
        purchaseOrderStatus: purchaseOrders.purchaseOrderStatus,
        orderDate: purchaseOrders.orderDate,
        quantityOrdered: purchaseOrderItems.quantityOrdered,
        unitCost: purchaseOrderItems.unitCost,
        totalCost: purchaseOrderItems.totalCost,
      })
      .from(purchaseOrderItems)
      .innerJoin(purchaseOrders, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
      .where(eq(purchaseOrderItems.productId, input.productId))
      .orderBy(desc(purchaseOrders.createdAt));

    return items;
  }),
});

// Helper function to generate PO number
async function generatePONumber(db: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  // Get the highest PO number for this year
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(purchaseOrders)
    .where(sql`${purchaseOrders.poNumber} LIKE ${prefix + "%"}`);

  const count = result?.count ?? 0;
  const nextNumber = count + 1;

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

// Helper function to recalculate PO totals
async function recalculatePOTotals(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, purchaseOrderId: number): Promise<void> {
  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);

  await db
    .update(purchaseOrders)
    .set({
      subtotal: subtotal.toString(),
      total: subtotal.toString(), // Update this if tax/shipping logic is added
    })
    .where(eq(purchaseOrders.id, purchaseOrderId));
}
