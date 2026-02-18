import { z } from "zod";
import {
  protectedProcedure,
  router,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { getDb } from "../db";
import {
  purchaseOrders,
  purchaseOrderItems,
  products,
  clients,
} from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getSupplierByLegacyVendorId } from "../inventoryDb";
import { resolveOrCreateLegacyVendorId } from "../services/vendorMappingService";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { requirePermission } from "../_core/permissionMiddleware";
import * as productsDb from "../productsDb";
import { logger } from "../_core/logger";
import { TRPCError } from "@trpc/server";

export const purchaseOrdersRouter = router({
  // Product options for PO creation (use product catalogue)
  products: protectedProcedure
    .use(requirePermission("purchase_orders:read"))
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(500).optional().default(50),
          offset: z.number().min(0).optional().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const search = input?.search;

      const items = await productsDb.getProducts({
        search,
        limit,
        offset,
        includeDeleted: false,
      });
      const total = await productsDb.getProductCount({
        search,
        includeDeleted: false,
      });

      return createSafeUnifiedResponse(items, total, limit, offset);
    }),
  // List purchase orders with pagination
  // BUG-034: Standardized .list procedure for API consistency
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(1000).optional().default(50),
          offset: z.number().min(0).optional().default(0),
          supplierClientId: z.number().optional(),
          status: z
            .enum([
              "DRAFT",
              "SENT",
              "CONFIRMED",
              "RECEIVING",
              "RECEIVED",
              "CANCELLED",
            ])
            .optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      // Build conditions array
      const conditions = [];

      // Filter by supplier
      if (input?.supplierClientId) {
        conditions.push(
          eq(purchaseOrders.supplierClientId, input.supplierClientId)
        );
      }

      // Filter by status
      if (input?.status) {
        conditions.push(eq(purchaseOrders.purchaseOrderStatus, input.status));
      }

      // Execute query with conditions
      const baseQuery = db.select().from(purchaseOrders);
      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const pos = await query
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const countQuery =
        conditions.length > 0
          ? db
              .select({ count: sql<number>`COUNT(*)` })
              .from(purchaseOrders)
              .where(and(...conditions))
          : db.select({ count: sql<number>`COUNT(*)` }).from(purchaseOrders);

      const [countResult] = await countQuery;
      const total = countResult?.count ?? pos.length;

      return createSafeUnifiedResponse(pos, total, limit, offset);
    }),

  // Create new purchase order
  // Supports both supplierClientId (canonical) and vendorId (deprecated, for backward compat)
  create: protectedProcedure
    .input(
      z
        .object({
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
          items: z.array(
            z.object({
              productId: z
                .number()
                .int()
                .positive("Product ID must be a positive integer"),
              quantityOrdered: z
                .number()
                .positive("Quantity must be greater than 0"),
              unitCost: z.number().min(0, "Unit cost cannot be negative"),
            })
          ),
        })
        .refine(
          data =>
            data.supplierClientId !== undefined || data.vendorId !== undefined,
          { message: "Either supplierClientId or vendorId must be provided" }
        )
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { items, ...poData } = input;

      // Resolve supplier client ID
      let resolvedSupplierClientId = poData.supplierClientId;
      let resolvedVendorId = poData.vendorId;

      // PARTY-001: Validate supplierClientId is a seller client if provided directly
      if (resolvedSupplierClientId) {
        const [supplierClient] = await db
          .select({ id: clients.id, isSeller: clients.isSeller })
          .from(clients)
          .where(eq(clients.id, resolvedSupplierClientId))
          .limit(1);

        if (!supplierClient) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Client with ID ${resolvedSupplierClientId} not found`,
          });
        }

        if (!supplierClient.isSeller) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Client with ID ${resolvedSupplierClientId} is not a supplier (isSeller=false)`,
          });
        }
      }

      // If only vendorId provided, resolve to supplierClientId via supplier_profiles
      if (!resolvedSupplierClientId && resolvedVendorId) {
        console.warn(
          "[DEPRECATED] purchaseOrders.create called with vendorId - use supplierClientId instead"
        );
        const supplier = await getSupplierByLegacyVendorId(resolvedVendorId);
        if (supplier) {
          resolvedSupplierClientId = supplier.id;
        }
      }

      // If only supplierClientId provided, try to resolve vendorId for backward compat
      if (resolvedSupplierClientId && !resolvedVendorId) {
        try {
          const resolved = await resolveOrCreateLegacyVendorId(
            resolvedSupplierClientId
          );
          if (resolved === null) {
            // Legacy vendor mapping is best-effort during deprecation period
            logger.warn(
              { supplierClientId: resolvedSupplierClientId },
              "[PO] Could not resolve legacy vendorId — proceeding with supplierClientId only"
            );
            resolvedVendorId = undefined;
          } else {
            resolvedVendorId = resolved;
          }
        } catch (e) {
          // Legacy vendor mapping is best-effort during deprecation period
          logger.warn(
            { supplierClientId: resolvedSupplierClientId, error: e },
            "[PO] Could not resolve legacy vendorId — proceeding with supplierClientId only"
          );
          resolvedVendorId = undefined;
        }
      }

      // Only fail if NEITHER identifier is available
      if (!resolvedVendorId && !resolvedSupplierClientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "A supplier must be specified. Provide supplierClientId or vendorId.",
        });
      }

      // Generate PO number
      const poNumber = await generatePONumber(db);

      // Calculate totals
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantityOrdered * item.unitCost,
        0
      );

      // Get authenticated user ID from context (BUG-135)
      const createdBy = getAuthenticatedUserId(ctx);

      // Create PO with both IDs
      const [po] = await db.insert(purchaseOrders).values({
        vendorId: resolvedVendorId,
        supplierClientId: resolvedSupplierClientId || null,
        intakeSessionId: poData.intakeSessionId,
        orderDate: new Date(poData.orderDate),
        expectedDeliveryDate: poData.expectedDeliveryDate
          ? new Date(poData.expectedDeliveryDate)
          : null,
        paymentTerms: poData.paymentTerms,
        notes: poData.notes,
        vendorNotes: poData.vendorNotes,
        createdBy,
        poNumber,
        subtotal: subtotal.toString(),
        total: subtotal.toString(), // tax and shipping can be added later
        purchaseOrderStatus: "DRAFT",
      });

      const poId = Number(po.insertId);

      // Create PO items
      if (items.length > 0) {
        await db.insert(purchaseOrderItems).values(
          items.map(item => ({
            purchaseOrderId: poId,
            productId: item.productId,
            quantityOrdered: item.quantityOrdered.toString(),
            unitCost: item.unitCost.toString(),
            totalCost: (item.quantityOrdered * item.unitCost).toString(),
          }))
        );
      }

      return { id: poId, poNumber, supplierClientId: resolvedSupplierClientId };
    }),

  // Get all purchase orders
  // Supports filtering by supplierClientId (canonical) or vendorId (deprecated)
  getAll: protectedProcedure
    .input(
      z
        .object({
          supplierClientId: z.number().optional(), // Canonical filter
          vendorId: z.number().optional(), // Deprecated filter (backward compat)
          status: z.string().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

      // Build conditions array
      const conditions = [];

      // Filter by supplier (canonical) or vendor (deprecated)
      if (input?.supplierClientId) {
        conditions.push(
          eq(purchaseOrders.supplierClientId, input.supplierClientId)
        );
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
        if (
          validStatuses.includes(mappedStatus as (typeof validStatuses)[number])
        ) {
          conditions.push(
            eq(
              purchaseOrders.purchaseOrderStatus,
              mappedStatus as (typeof validStatuses)[number]
            )
          );
        }
      }

      // Execute query with conditions
      const baseQuery = db.select().from(purchaseOrders);
      const query =
        conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const pos = await query
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(limit)
        .offset(offset);
      // BUG-034: Standardized pagination response
      return createSafeUnifiedResponse(pos, -1, limit, offset);
    }),

  // Get purchase order by ID with items and supplier details
  // PARTY-001: Include supplierClientId with supplier details from clients table
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.id));

      if (!po) {
        throw new Error("Purchase order not found");
      }

      // Get items with product details
      const itemsResult = await db
        .select({
          id: purchaseOrderItems.id,
          purchaseOrderId: purchaseOrderItems.purchaseOrderId,
          productId: purchaseOrderItems.productId,
          productName: products.nameCanonical,
          category: products.category,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: purchaseOrderItems.quantityReceived,
          unitCost: purchaseOrderItems.unitCost,
          totalCost: purchaseOrderItems.totalCost,
          notes: purchaseOrderItems.notes,
        })
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, input.id));

      // PARTY-001: Get supplier details from clients table if supplierClientId exists
      let supplier = null;
      if (po.supplierClientId) {
        const [supplierResult] = await db
          .select({
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
            email: clients.email,
            phone: clients.phone,
          })
          .from(clients)
          .where(eq(clients.id, po.supplierClientId))
          .limit(1);

        supplier = supplierResult || null;
      }

      return {
        ...po,
        items: itemsResult,
        supplier, // PARTY-001: Include supplier details
      };
    }),

  // Update purchase order
  update: protectedProcedure
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
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Soft delete - set deletedAt timestamp instead of hard delete (ST-059)
      await db
        .update(purchaseOrders)
        .set({ deletedAt: new Date() })
        .where(eq(purchaseOrders.id, input.id));
      return { success: true };
    }),

  // Update PO status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "DRAFT",
          "SENT",
          "CONFIRMED",
          "RECEIVING",
          "RECEIVED",
          "CANCELLED",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, unknown> = {
        purchaseOrderStatus: input.status,
      };

      if (input.status === "SENT") {
        updateData.sentAt = new Date();
      } else if (input.status === "CONFIRMED") {
        updateData.confirmedAt = new Date();
      } else if (input.status === "RECEIVED") {
        updateData.actualDeliveryDate = new Date();
      }

      await db
        .update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, input.id));

      return { success: true };
    }),

  // Add item to PO
  addItem: protectedProcedure
    .input(
      z.object({
        purchaseOrderId: z
          .number()
          .int()
          .positive("Purchase order ID must be a positive integer"),
        productId: z
          .number()
          .int()
          .positive("Product ID must be a positive integer"),
        quantityOrdered: z.number().positive("Quantity must be greater than 0"),
        unitCost: z.number().min(0, "Unit cost cannot be negative"),
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
  updateItem: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive("Item ID must be a positive integer"),
        quantityOrdered: z
          .number()
          .positive("Quantity must be greater than 0")
          .optional(),
        unitCost: z.number().min(0, "Unit cost cannot be negative").optional(),
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

      const quantityOrdered =
        data.quantityOrdered ?? parseFloat(item.quantityOrdered);
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
  deleteItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [item] = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.id, input.id));

      if (!item) {
        throw new Error("Purchase order item not found");
      }

      // Soft delete - set deletedAt timestamp instead of hard delete (ST-059)
      await db
        .update(purchaseOrderItems)
        .set({ deletedAt: new Date() })
        .where(eq(purchaseOrderItems.id, input.id));

      // Recalculate PO totals
      await recalculatePOTotals(db, item.purchaseOrderId);

      return { success: true };
    }),

  // Get PO history for a supplier (canonical)
  getBySupplier: protectedProcedure
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
  getByVendor: protectedProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input }) => {
      console.warn(
        "[DEPRECATED] purchaseOrders.getByVendor - use getBySupplier with supplierClientId instead"
      );
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.vendorId, input.vendorId))
        .orderBy(desc(purchaseOrders.createdAt));
    }),

  // Get PO history for a product
  getByProduct: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
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
        .innerJoin(
          purchaseOrders,
          eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id)
        )
        .where(eq(purchaseOrderItems.productId, input.productId))
        .orderBy(desc(purchaseOrders.createdAt));

      return items;
    }),

  // Submit PO to vendor (changes status from DRAFT to SENT)
  submit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify PO exists and is in DRAFT status
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.id));

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found",
        });
      }

      if (po.purchaseOrderStatus !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Purchase order cannot be submitted from ${po.purchaseOrderStatus} status`,
        });
      }

      // Update PO status to SENT
      await db
        .update(purchaseOrders)
        .set({
          purchaseOrderStatus: "SENT",
          sentAt: new Date(),
        })
        .where(eq(purchaseOrders.id, input.id));

      logger.info(
        { poId: input.id, poNumber: po.poNumber },
        "[PO] Purchase order submitted"
      );

      return { success: true, poNumber: po.poNumber };
    }),

  // Confirm PO (vendor has confirmed receipt, changes status from SENT to CONFIRMED)
  confirm: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        vendorConfirmationNumber: z.string().optional(),
        confirmedDeliveryDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify PO exists and is in SENT status
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.id));

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found",
        });
      }

      if (po.purchaseOrderStatus !== "SENT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Purchase order cannot be confirmed from ${po.purchaseOrderStatus} status`,
        });
      }

      const updateData: Record<string, unknown> = {
        purchaseOrderStatus: "CONFIRMED",
        confirmedAt: new Date(),
      };

      // Store vendor confirmation number in notes if provided
      if (input.vendorConfirmationNumber) {
        const existingNotes = po.notes || "";
        updateData.notes = existingNotes
          ? `${existingNotes}\nVendor Confirmation: ${input.vendorConfirmationNumber}`
          : `Vendor Confirmation: ${input.vendorConfirmationNumber}`;
      }

      // Update expected delivery date if vendor provides one
      if (input.confirmedDeliveryDate) {
        updateData.expectedDeliveryDate = new Date(input.confirmedDeliveryDate);
      }

      await db
        .update(purchaseOrders)
        .set(updateData)
        .where(eq(purchaseOrders.id, input.id));

      logger.info(
        {
          poId: input.id,
          poNumber: po.poNumber,
          vendorConfirmation: input.vendorConfirmationNumber,
        },
        "[PO] Purchase order confirmed"
      );

      return { success: true, poNumber: po.poNumber };
    }),

  // Get PO with full details including items and product info
  getByIdWithDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.id));

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found",
        });
      }

      // Get items with product details
      const items = await db
        .select({
          id: purchaseOrderItems.id,
          productId: purchaseOrderItems.productId,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: purchaseOrderItems.quantityReceived,
          unitCost: purchaseOrderItems.unitCost,
          totalCost: purchaseOrderItems.totalCost,
          notes: purchaseOrderItems.notes,
          productName: products.nameCanonical,
          category: products.category,
          subcategory: products.subcategory,
        })
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, input.id));

      // Get supplier info
      let supplierInfo = null;
      if (po.supplierClientId) {
        const [supplier] = await db
          .select({
            id: clients.id,
            name: clients.name,
            email: clients.email,
            phone: clients.phone,
          })
          .from(clients)
          .where(eq(clients.id, po.supplierClientId));
        supplierInfo = supplier || null;
      }

      return {
        ...po,
        items,
        supplier: supplierInfo,
      };
    }),
});

// Helper function to generate PO number
async function generatePONumber(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<string> {
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
async function recalculatePOTotals(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  purchaseOrderId: number
): Promise<void> {
  const items = await db
    .select()
    .from(purchaseOrderItems)
    .where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.totalCost),
    0
  );

  await db
    .update(purchaseOrders)
    .set({
      subtotal: subtotal.toString(),
      total: subtotal.toString(), // Update this if tax/shipping logic is added
    })
    .where(eq(purchaseOrders.id, purchaseOrderId));
}
