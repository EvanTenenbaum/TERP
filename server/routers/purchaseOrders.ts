import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { purchaseOrders, purchaseOrderItems } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

export const purchaseOrdersRouter = router({
  // Create new purchase order
  create: publicProcedure
    .input(
      z.object({
        vendorId: z.number(),
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
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const { items, ...poData } = input;

      // Generate PO number
      const poNumber = await generatePONumber(db);

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.quantityOrdered * item.unitCost, 0);

      // Create PO
      const [po] = await db.insert(purchaseOrders).values({
        vendorId: poData.vendorId,
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

      return { id: po.insertId, poNumber };
    }),

  // Get all purchase orders
  getAll: publicProcedure
    .input(
      z
        .object({
          vendorId: z.number().optional(),
          status: z.string().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;
      
      let query = db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)).limit(limit).offset(offset);

      if (input?.vendorId) {
        query = query.where(eq(purchaseOrders.vendorId, input.vendorId)) as typeof query;
      }

      if (input?.status) {
        const validStatuses = ["DRAFT", "SENT", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"] as const;
        if (validStatuses.includes(input.status as typeof validStatuses[number])) {
          query = query.where(eq(purchaseOrders.purchaseOrderStatus, input.status as typeof validStatuses[number])) as typeof query;
        }
      }

      return await query;
    }),

  // Get purchase order by ID with items
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
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
      if (!db) throw new Error("Database not available");

      const { id, ...data } = input;

      await db
        .update(purchaseOrders)
        .set(data as any)
        .where(eq(purchaseOrders.id, id));

      return { success: true };
    }),

  // Delete purchase order
  delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
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
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, unknown> = { status: input.status };

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

  // Get PO history for a vendor
  getByVendor: publicProcedure.input(z.object({ vendorId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
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
    if (!db) throw new Error("Database not available");

    const items = await db
      .select({
        poId: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        vendorId: purchaseOrders.vendorId,
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
