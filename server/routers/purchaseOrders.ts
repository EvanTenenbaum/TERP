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
  brands,
} from "../../drizzle/schema";
import { eq, desc, sql, and, isNull } from "drizzle-orm";
import { getSupplierByLegacyVendorId } from "../inventoryDb";
import { resolveOrCreateLegacyVendorId } from "../services/vendorMappingService";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { requirePermission } from "../_core/permissionMiddleware";
import * as productsDb from "../productsDb";
import { logger } from "../_core/logger";
import { isSchemaDriftError } from "../_core/dbErrors";
import { TRPCError } from "@trpc/server";

const PO_COGS_MODES = ["FIXED", "RANGE"] as const;
const _PO_PAYMENT_TERMS = [
  "COD",
  "NET_7",
  "NET_15",
  "NET_30",
  "CONSIGNMENT",
  "PARTIAL",
] as const;

export function shouldFallbackRecentProductsBySupplier(error: unknown) {
  return isSchemaDriftError(error, [
    "purchaseorderitems",
    "cogsmode",
    "unitcostmin",
    "unitcostmax",
    "deletedat",
  ]);
}

const purchaseOrderItemInputSchema = z
  .object({
    productId: z
      .number()
      .int()
      .positive("Product ID must be a positive integer")
      .optional(),
    productName: z.string().trim().min(1).max(500).optional(),
    category: z.string().trim().max(100).optional(),
    subcategory: z.string().trim().max(100).optional().nullable(),
    quantityOrdered: z
      .number()
      .positive("Quantity must be greater than 0")
      .max(1_000_000, "Quantity must not exceed 1,000,000"),
    cogsMode: z.enum(PO_COGS_MODES).default("FIXED"),
    unitCost: z
      .number()
      .min(0, "Unit cost cannot be negative")
      .max(100_000, "Unit cost must not exceed 100,000")
      .optional(),
    unitCostMin: z
      .number()
      .min(0, "Minimum unit cost cannot be negative")
      .max(100_000, "Minimum unit cost must not exceed 100,000")
      .optional(),
    unitCostMax: z
      .number()
      .min(0, "Maximum unit cost cannot be negative")
      .max(100_000, "Maximum unit cost must not exceed 100,000")
      .optional(),
  })
  .superRefine((item, ctx) => {
    if (!item.productId && !item.productName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productName"],
        message: "Product name or product ID is required",
      });
    }

    if (item.cogsMode === "FIXED") {
      if (item.unitCost === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unitCost"],
          message: "Unit cost is required for fixed COGS",
        });
      }
      return;
    }

    if (item.unitCostMin === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitCostMin"],
        message: "Minimum unit cost is required for range COGS",
      });
    }
    if (item.unitCostMax === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitCostMax"],
        message: "Maximum unit cost is required for range COGS",
      });
    }
    if (
      item.unitCostMin !== undefined &&
      item.unitCostMax !== undefined &&
      item.unitCostMax < item.unitCostMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitCostMax"],
        message:
          "Maximum unit cost must be greater than or equal to minimum unit cost",
      });
    }
  });

type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemInputSchema>;

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

      // Build conditions array (exclude soft-deleted records by default)
      const conditions = [isNull(purchaseOrders.deletedAt)];

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
    .use(requirePermission("purchase_orders:create"))
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
          items: z.array(purchaseOrderItemInputSchema),
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
      let supplierName: string | null = null;

      // PARTY-001: Validate supplierClientId is a seller client if provided directly
      if (resolvedSupplierClientId) {
        const [supplierClient] = await db
          .select({
            id: clients.id,
            isSeller: clients.isSeller,
            name: clients.name,
          })
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

        supplierName = supplierClient.name;
      }

      // If only vendorId provided, resolve to supplierClientId via supplier_profiles
      if (!resolvedSupplierClientId && resolvedVendorId) {
        console.warn(
          "[DEPRECATED] purchaseOrders.create called with vendorId - use supplierClientId instead"
        );
        const supplier = await getSupplierByLegacyVendorId(resolvedVendorId);
        if (supplier) {
          resolvedSupplierClientId = supplier.id;
          supplierName = supplier.name;
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

      if (!supplierName && resolvedSupplierClientId) {
        // W4-3: Look up supplier name from clients table (isSeller=true)
        const [supplierClient] = await db
          .select({ name: clients.name })
          .from(clients)
          .where(
            and(
              eq(clients.id, resolvedSupplierClientId),
              eq(clients.isSeller, true),
              isNull(clients.deletedAt)
            )
          )
          .limit(1);
        supplierName = supplierClient?.name ?? null;
      }

      // Generate PO number
      const poNumber = await generatePONumber(db);

      const normalizedPaymentTerms = normalizePurchaseOrderPaymentTerms(
        poData.paymentTerms
      );

      const resolvedItems = await Promise.all(
        items.map(async item => {
          const product = await resolvePurchaseOrderLineProduct(db, item, {
            supplierClientId: resolvedSupplierClientId,
            vendorId: resolvedVendorId,
            supplierName,
          });
          const costSummary = summarizePurchaseOrderItemCost(item);

          return {
            productId: product.id,
            cogsMode: costSummary.cogsMode,
            unitCost: costSummary.unitCost,
            unitCostMin: costSummary.unitCostMin,
            unitCostMax: costSummary.unitCostMax,
            quantityOrdered: item.quantityOrdered,
            totalCost: costSummary.unitCost * item.quantityOrdered,
          };
        })
      );

      // Calculate totals
      const subtotal = resolvedItems.reduce(
        (sum, item) => sum + item.totalCost,
        0
      );

      // Get authenticated user ID from context (BUG-135)
      const createdBy = getAuthenticatedUserId(ctx);

      // Create PO with both IDs
      const poInsertResult = await db.insert(purchaseOrders).values({
        vendorId: resolvedVendorId,
        supplierClientId: resolvedSupplierClientId || null,
        intakeSessionId: poData.intakeSessionId,
        orderDate: new Date(poData.orderDate),
        expectedDeliveryDate: poData.expectedDeliveryDate
          ? new Date(poData.expectedDeliveryDate)
          : null,
        paymentTerms: normalizedPaymentTerms,
        notes: poData.notes,
        vendorNotes: poData.vendorNotes,
        createdBy,
        poNumber,
        subtotal: subtotal.toString(),
        total: subtotal.toString(), // tax and shipping can be added later
        purchaseOrderStatus: "DRAFT",
      });

      const poId = Number(
        Array.isArray(poInsertResult)
          ? (poInsertResult[0]?.insertId ?? 0)
          : ((poInsertResult as { insertId?: number })?.insertId ?? 0)
      );

      // Create PO items
      if (resolvedItems.length > 0) {
        await db.insert(purchaseOrderItems).values(
          resolvedItems.map(item => ({
            purchaseOrderId: poId,
            productId: item.productId,
            cogsMode: item.cogsMode,
            quantityOrdered: item.quantityOrdered.toString(),
            unitCost: item.unitCost.toString(),
            unitCostMin: item.unitCostMin?.toString() ?? null,
            unitCostMax: item.unitCostMax?.toString() ?? null,
            totalCost: (item.quantityOrdered * item.unitCost).toString(),
            supplierClientId: resolvedSupplierClientId ?? null,
            notes: null, // Explicit null for nullable column (BUG-002)
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

      // Build conditions array (exclude soft-deleted records by default)
      const conditions = [isNull(purchaseOrders.deletedAt)];

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
        .where(
          and(eq(purchaseOrders.id, input.id), isNull(purchaseOrders.deletedAt))
        );

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
          subcategory: products.subcategory,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: purchaseOrderItems.quantityReceived,
          cogsMode: purchaseOrderItems.cogsMode,
          unitCost: purchaseOrderItems.unitCost,
          unitCostMin: purchaseOrderItems.unitCostMin,
          unitCostMax: purchaseOrderItems.unitCostMax,
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
    .use(requirePermission("purchase_orders:update"))
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
    .use(requirePermission("purchase_orders:delete"))
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

  // Restore soft-deleted purchase order
  restore: protectedProcedure
    .use(requirePermission("purchase_orders:update"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(purchaseOrders)
        .set({ deletedAt: null })
        .where(eq(purchaseOrders.id, input.id));
      return { success: true };
    }),

  // Update PO status
  updateStatus: protectedProcedure
    .use(requirePermission("purchase_orders:update"))
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

      // W6-2: Fetch current status and validate transition
      const [current] = await db
        .select({ purchaseOrderStatus: purchaseOrders.purchaseOrderStatus })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.id))
        .limit(1);

      if (!current) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Purchase order ${input.id} not found`,
        });
      }

      type POStatus =
        | "DRAFT"
        | "SENT"
        | "CONFIRMED"
        | "RECEIVING"
        | "RECEIVED"
        | "CANCELLED";

      const VALID_TRANSITIONS: Record<POStatus, POStatus[]> = {
        DRAFT: ["SENT", "CANCELLED"],
        SENT: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["RECEIVING", "CANCELLED"],
        RECEIVING: ["RECEIVED", "CANCELLED"],
        RECEIVED: [],
        CANCELLED: [],
      };

      const fromStatus = current.purchaseOrderStatus as POStatus;
      const allowedNext = VALID_TRANSITIONS[fromStatus] ?? [];

      if (!allowedNext.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition purchase order from ${fromStatus} to ${input.status}. Allowed transitions: ${allowedNext.join(", ") || "none"}`,
        });
      }

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
    .use(requirePermission("purchase_orders:update"))
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
        quantityOrdered: z
          .number()
          .positive("Quantity must be greater than 0")
          .max(1_000_000, "Quantity must not exceed 1,000,000"),
        cogsMode: z.enum(PO_COGS_MODES).default("FIXED"),
        unitCost: z
          .number()
          .min(0, "Unit cost cannot be negative")
          .max(100_000, "Unit cost must not exceed 100,000")
          .optional(),
        unitCostMin: z
          .number()
          .min(0, "Minimum unit cost cannot be negative")
          .max(100_000, "Minimum unit cost must not exceed 100,000")
          .optional(),
        unitCostMax: z
          .number()
          .min(0, "Maximum unit cost cannot be negative")
          .max(100_000, "Maximum unit cost must not exceed 100,000")
          .optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const costSummary = summarizePurchaseOrderItemCost(input);
      const totalCost = input.quantityOrdered * costSummary.unitCost;

      await db.insert(purchaseOrderItems).values({
        purchaseOrderId: input.purchaseOrderId,
        productId: input.productId,
        cogsMode: costSummary.cogsMode,
        quantityOrdered: input.quantityOrdered.toString(),
        unitCost: costSummary.unitCost.toString(),
        unitCostMin: costSummary.unitCostMin?.toString() ?? null,
        unitCostMax: costSummary.unitCostMax?.toString() ?? null,
        totalCost: totalCost.toString(),
        notes: input.notes,
      });

      // Recalculate PO totals
      await recalculatePOTotals(db, input.purchaseOrderId);

      return { success: true };
    }),

  // Update PO item
  updateItem: protectedProcedure
    .use(requirePermission("purchase_orders:update"))
    .input(
      z.object({
        id: z.number().int().positive("Item ID must be a positive integer"),
        quantityOrdered: z
          .number()
          .positive("Quantity must be greater than 0")
          .max(1_000_000, "Quantity must not exceed 1,000,000")
          .optional(),
        cogsMode: z.enum(PO_COGS_MODES).optional(),
        unitCost: z
          .number()
          .min(0, "Unit cost cannot be negative")
          .max(100_000, "Unit cost must not exceed 100,000")
          .optional(),
        unitCostMin: z
          .number()
          .min(0, "Minimum unit cost cannot be negative")
          .max(100_000, "Minimum unit cost must not exceed 100,000")
          .optional(),
        unitCostMax: z
          .number()
          .min(0, "Maximum unit cost cannot be negative")
          .max(100_000, "Maximum unit cost must not exceed 100,000")
          .optional(),
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
      const costSummary = summarizePurchaseOrderItemCost({
        cogsMode: data.cogsMode ?? item.cogsMode,
        unitCost:
          data.unitCost ??
          (item.unitCost !== null ? parseFloat(item.unitCost) : undefined),
        unitCostMin:
          data.unitCostMin ??
          (item.unitCostMin !== null
            ? parseFloat(item.unitCostMin)
            : undefined),
        unitCostMax:
          data.unitCostMax ??
          (item.unitCostMax !== null
            ? parseFloat(item.unitCostMax)
            : undefined),
      });
      const totalCost = quantityOrdered * costSummary.unitCost;

      await db
        .update(purchaseOrderItems)
        .set({
          ...data,
          cogsMode: costSummary.cogsMode,
          quantityOrdered: quantityOrdered.toString(),
          unitCost: costSummary.unitCost.toString(),
          unitCostMin: costSummary.unitCostMin?.toString() ?? null,
          unitCostMax: costSummary.unitCostMax?.toString() ?? null,
          totalCost: totalCost.toString(),
        })
        .where(eq(purchaseOrderItems.id, id));

      // Recalculate PO totals
      await recalculatePOTotals(db, item.purchaseOrderId);

      return { success: true };
    }),

  // Delete PO item
  deleteItem: protectedProcedure
    .use(requirePermission("purchase_orders:delete"))
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
        .where(
          and(
            eq(purchaseOrders.supplierClientId, input.supplierClientId),
            isNull(purchaseOrders.deletedAt)
          )
        )
        .orderBy(desc(purchaseOrders.createdAt));
    }),

  getRecentProductsBySupplier: protectedProcedure
    .input(
      z.object({
        supplierClientId: z.number(),
        limit: z.number().min(1).max(50).default(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const rows = await db
          .select({
            productId: purchaseOrderItems.productId,
            productName: products.nameCanonical,
            category: products.category,
            subcategory: products.subcategory,
            cogsMode: purchaseOrderItems.cogsMode,
            unitCost: purchaseOrderItems.unitCost,
            unitCostMin: purchaseOrderItems.unitCostMin,
            unitCostMax: purchaseOrderItems.unitCostMax,
            poNumber: purchaseOrders.poNumber,
            orderDate: purchaseOrders.orderDate,
          })
          .from(purchaseOrderItems)
          .innerJoin(
            purchaseOrders,
            eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id)
          )
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(
            buildRecentSupplierProductsWhereClause(input.supplierClientId, true)
          )
          .orderBy(desc(purchaseOrders.orderDate), desc(purchaseOrderItems.id));

        return dedupeRecentSupplierProducts(rows, input.limit);
      } catch (error) {
        if (!shouldFallbackRecentProductsBySupplier(error)) {
          throw error;
        }

        logger.warn(
          {
            supplierClientId: input.supplierClientId,
            error,
          },
          "[PurchaseOrders] Falling back to legacy supplier history query"
        );

        const legacyRows = await db
          .select({
            productId: purchaseOrderItems.productId,
            productName: products.nameCanonical,
            category: products.category,
            subcategory: products.subcategory,
            unitCost: purchaseOrderItems.unitCost,
            poNumber: purchaseOrders.poNumber,
            orderDate: purchaseOrders.orderDate,
          })
          .from(purchaseOrderItems)
          .innerJoin(
            purchaseOrders,
            eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id)
          )
          .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
          .where(
            buildRecentSupplierProductsWhereClause(
              input.supplierClientId,
              false
            )
          )
          .orderBy(desc(purchaseOrders.orderDate), desc(purchaseOrderItems.id));

        return dedupeRecentSupplierProducts(
          legacyRows.map(row => ({
            ...row,
            cogsMode: "FIXED" as const,
            unitCostMin: null,
            unitCostMax: null,
          })),
          input.limit
        );
      }
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
          cogsMode: purchaseOrderItems.cogsMode,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          unitCost: purchaseOrderItems.unitCost,
          unitCostMin: purchaseOrderItems.unitCostMin,
          unitCostMax: purchaseOrderItems.unitCostMax,
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
    .use(requirePermission("purchase_orders:update"))
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
    .use(requirePermission("purchase_orders:update"))
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
          cogsMode: purchaseOrderItems.cogsMode,
          unitCost: purchaseOrderItems.unitCost,
          unitCostMin: purchaseOrderItems.unitCostMin,
          unitCostMax: purchaseOrderItems.unitCostMax,
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

export function normalizePurchaseOrderPaymentTerms(
  value?: string | null
): (typeof _PO_PAYMENT_TERMS)[number] {
  const normalized = (value ?? "").trim().toUpperCase();
  const map: Record<string, (typeof _PO_PAYMENT_TERMS)[number]> = {
    COD: "COD",
    "DUE ON RECEIPT": "COD",
    NET_7: "NET_7",
    "NET 7": "NET_7",
    NET_15: "NET_15",
    "NET 15": "NET_15",
    NET_30: "NET_30",
    "NET 30": "NET_30",
    CONSIGNMENT: "CONSIGNMENT",
    PARTIAL: "PARTIAL",
  };

  return map[normalized] ?? "CONSIGNMENT";
}

function normalizeProductName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

export function summarizePurchaseOrderItemCost(input: {
  cogsMode?: (typeof PO_COGS_MODES)[number];
  unitCost?: number;
  unitCostMin?: number;
  unitCostMax?: number;
}) {
  const cogsMode = input.cogsMode ?? "FIXED";

  if (cogsMode === "RANGE") {
    if (
      input.unitCostMin === undefined ||
      input.unitCostMax === undefined ||
      input.unitCostMax < input.unitCostMin
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Range COGS requires a valid minimum and maximum unit cost",
      });
    }

    return {
      cogsMode,
      unitCost: (input.unitCostMin + input.unitCostMax) / 2,
      unitCostMin: input.unitCostMin,
      unitCostMax: input.unitCostMax,
    };
  }

  if (input.unitCost === undefined) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Fixed COGS requires a unit cost",
    });
  }

  return {
    cogsMode,
    unitCost: input.unitCost,
    unitCostMin: undefined,
    unitCostMax: undefined,
  };
}

export function dedupeRecentSupplierProducts<
  T extends {
    productId: number | null;
    productName: string | null;
  },
>(rows: T[], limit: number): T[] {
  const seen = new Set<string>();
  const recentProducts: T[] = [];

  for (const row of rows) {
    const dedupeKey = row.productId
      ? `id:${row.productId}`
      : `name:${(row.productName ?? "").trim().toLowerCase()}`;

    if (!dedupeKey || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    recentProducts.push(row);

    if (recentProducts.length >= limit) {
      break;
    }
  }

  return recentProducts;
}

function buildRecentSupplierProductsWhereClause(
  supplierClientId: number,
  includeItemDeletedGuard: boolean
) {
  const conditions = [
    eq(purchaseOrders.supplierClientId, supplierClientId),
    isNull(purchaseOrders.deletedAt),
  ];

  if (includeItemDeletedGuard) {
    conditions.push(isNull(purchaseOrderItems.deletedAt));
  }

  return and(...conditions);
}

async function findExactProductByName(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  name: string,
  brandId?: number
) {
  const conditions = [
    sql`LOWER(${products.nameCanonical}) = ${name.toLowerCase()}`,
    isNull(products.deletedAt),
  ];

  if (brandId) {
    conditions.push(eq(products.brandId, brandId));
  }

  const [product] = await db
    .select({
      id: products.id,
      nameCanonical: products.nameCanonical,
      category: products.category,
      subcategory: products.subcategory,
      brandId: products.brandId,
    })
    .from(products)
    .where(and(...conditions))
    .limit(1);

  return product ?? null;
}

async function ensureSupplierBrand(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  input: {
    supplierName?: string | null;
    vendorId?: number;
  }
): Promise<number> {
  const brandName = input.supplierName?.trim() || "Unassigned Supplier";
  const conditions = [eq(brands.name, brandName)];
  if (input.vendorId) {
    conditions.push(eq(brands.vendorId, input.vendorId));
  }

  const [existingBrand] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(and(...conditions))
    .limit(1);

  if (existingBrand) {
    return existingBrand.id;
  }

  const insertedBrand = await db.insert(brands).values({
    name: brandName,
    vendorId: input.vendorId,
  });

  return Number(
    Array.isArray(insertedBrand)
      ? (insertedBrand[0]?.insertId ?? 0)
      : ((insertedBrand as { insertId?: number })?.insertId ?? 0)
  );
}

async function resolvePurchaseOrderLineProduct(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  item: PurchaseOrderItemInput,
  context: {
    supplierClientId?: number;
    vendorId?: number;
    supplierName?: string | null;
  }
) {
  if (item.productId) {
    const [existingProduct] = await db
      .select({
        id: products.id,
        nameCanonical: products.nameCanonical,
        category: products.category,
        subcategory: products.subcategory,
      })
      .from(products)
      .where(and(eq(products.id, item.productId), isNull(products.deletedAt)))
      .limit(1);

    if (!existingProduct) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Product ${item.productId} not found`,
      });
    }

    return existingProduct;
  }

  const normalizedName = normalizeProductName(item.productName ?? "");
  if (!normalizedName) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Product name is required",
    });
  }

  const supplierBrandId = await ensureSupplierBrand(db, {
    supplierName: context.supplierName,
    vendorId: context.vendorId,
  });

  const supplierMatch = await findExactProductByName(
    db,
    normalizedName,
    supplierBrandId
  );
  if (supplierMatch) {
    return supplierMatch;
  }

  const globalMatch = await findExactProductByName(db, normalizedName);
  if (globalMatch) {
    return globalMatch;
  }

  const createdProduct = await db.insert(products).values({
    brandId: supplierBrandId,
    supplierClientId: context.supplierClientId ?? null,
    nameCanonical: normalizedName,
    category: item.category?.trim() || "Flower",
    subcategory: item.subcategory?.trim() || null,
    uomSellable: "EA",
    description: null,
  });

  return {
    id: Number(
      Array.isArray(createdProduct)
        ? (createdProduct[0]?.insertId ?? 0)
        : ((createdProduct as { insertId?: number })?.insertId ?? 0)
    ),
    nameCanonical: normalizedName,
    category: item.category?.trim() || "Flower",
    subcategory: item.subcategory?.trim() || null,
  };
}

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
