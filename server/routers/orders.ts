/**
 * Consolidated Orders Router
 * Merges orders.ts and ordersEnhancedV2.ts into a single router
 * 
 * RF-001: Consolidate Orders Router
 * - Combines basic CRUD operations with enhanced COGS/margin features
 * - Maintains backward compatibility
 * - Single source of truth for all order operations
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import * as ordersDb from "../ordersDb";
import { getDb } from "../db";
import { orders, orderLineItems, batches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { softDelete, restoreDeleted } from "../utils/softDelete";
import { pricingService } from "../services/pricingService";
import { marginCalculationService } from "../services/marginCalculationService";
import { priceCalculationService } from "../services/priceCalculationService";
import { orderValidationService } from "../services/orderValidationService";
import { orderAuditService } from "../services/orderAuditService";
import { cogsChangeIntegrationService } from "../services/cogsChangeIntegrationService";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const lineItemInputSchema = z.object({
  batchId: z.number(),
  productDisplayName: z.string().optional(),
  quantity: z.number().positive(),
  isSample: z.boolean().default(false),
  cogsPerUnit: z.number(),
  marginPercent: z.number().optional(),
  marginDollar: z.number().optional(),
  isCogsOverridden: z.boolean().default(false),
  cogsOverrideReason: z.string().optional(),
  isMarginOverridden: z.boolean().default(false),
});

const orderAdjustmentSchema = z.object({
  amount: z.number(),
  type: z.enum(["PERCENT", "DOLLAR"]),
  mode: z.enum(["DISCOUNT", "MARKUP"]),
});

const createOrderInputSchema = z.object({
  orderType: z.enum(["QUOTE", "SALE"]),
  clientId: z.number(),
  lineItems: z.array(lineItemInputSchema),
  orderLevelAdjustment: orderAdjustmentSchema.optional(),
  showAdjustmentOnDocument: z.boolean().default(true),
  notes: z.string().optional(),
  // Quote-specific
  validUntil: z.string().optional(),
  // Sale-specific
  paymentTerms: z
    .enum(["NET_7", "NET_15", "NET_30", "COD", "PARTIAL", "CONSIGNMENT"])
    .optional(),
  cashPayment: z.number().optional(),
});

// ============================================================================
// CONSOLIDATED ORDERS ROUTER
// ============================================================================

export const ordersRouter = router({
  // ==========================================================================
  // BASIC CRUD OPERATIONS (from orders.ts)
  // ==========================================================================

  /**
   * Create order (basic version)
   * For backward compatibility with existing code
   */
  create: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        orderType: z.enum(["QUOTE", "SALE"]),
        isDraft: z.boolean().optional(),
        clientId: z.number(),
        items: z.array(
          z.object({
            batchId: z.number(),
            displayName: z.string().optional(),
            quantity: z.number(),
            unitPrice: z.number(),
            isSample: z.boolean(),
            overridePrice: z.number().optional(),
            overrideCogs: z.number().optional(),
          })
        ),
        validUntil: z.string().optional(),
        paymentTerms: z
          .enum(["NET_7", "NET_15", "NET_30", "COD", "PARTIAL", "CONSIGNMENT"])
          .optional(),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await ordersDb.createOrder({
        ...input,
        createdBy: userId,
      });
    }),

  /**
   * Get order by ID
   */
  getById: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await ordersDb.getOrderById(input.id);
    }),

  /**
   * Get orders by client
   */
  getByClient: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number(),
        orderType: z.enum(["QUOTE", "SALE"]).optional(),
      })
    )
    .query(async ({ input }) => {
      return await ordersDb.getOrdersByClient(input.clientId, input.orderType);
    }),

  /**
   * DEBUG: Get raw order data for debugging
   */
  debugGetRaw: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");
      
      // Get database connection info (without exposing credentials)
      const dbUrl = process.env.DATABASE_URL || '';
      const dbHost = dbUrl.match(/@([^:]+)/)?.[1] || 'unknown';
      const dbName = dbUrl.match(/\/([^?]+)/)?.[1] || 'unknown';
      
      const allOrders = await db.select().from(orders).limit(50);
      const confirmedOrders = allOrders.filter(o => !o.isDraft);
      
      return {
        dbInfo: {
          host: dbHost,
          database: dbName,
          hasDbUrl: !!process.env.DATABASE_URL,
        },
        total: allOrders.length,
        confirmed: confirmedOrders.length,
        draft: allOrders.filter(o => o.isDraft).length,
        sample: allOrders.slice(0, 3).map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          isDraft: o.isDraft,
          isDraftType: typeof o.isDraft,
          orderType: o.orderType,
        })),
      };
    }),

  /**
   * Get all orders with filtering
   */
  getAll: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z
        .object({
          orderType: z.enum(["QUOTE", "SALE"]).optional(),
          isDraft: z.boolean().optional(),
          quoteStatus: z.string().optional(),
          saleStatus: z.string().optional(),
          fulfillmentStatus: z.string().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          includeDeleted: z.boolean().optional(), // ST-013: Option to include soft-deleted records
        })
        .optional()
    )
    .query(async ({ input }) => {
      // Debug logging removed - use structured logging middleware for API debugging
      return await ordersDb.getAllOrders(input);
    }),

  /**
   * Update order
   */
  update: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
        validUntil: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await ordersDb.updateOrder(id, updates);
    }),

  /**
   * Delete order (soft delete)
   * ST-013: Uses soft delete for data recovery
   */
  delete: protectedProcedure
    .use(requirePermission("orders:delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const rowsAffected = await softDelete(orders, input.id);
      return { success: rowsAffected > 0 };
    }),

  /**
   * Restore deleted order
   * ST-013: Restore a soft-deleted order
   */
  restore: protectedProcedure
    .use(requirePermission("orders:delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const rowsAffected = await restoreDeleted(orders, input.id);
      return { success: rowsAffected > 0 };
    }),

  // ==========================================================================
  // DRAFT ORDER MANAGEMENT (from orders.ts)
  // ==========================================================================

  /**
   * Confirm draft order
   */
  confirmDraftOrder: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        orderId: z.number(),
        paymentTerms: z.enum([
          "NET_7",
          "NET_15",
          "NET_30",
          "COD",
          "PARTIAL",
          "CONSIGNMENT",
        ]),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await ordersDb.confirmDraftOrder({
        ...input,
        confirmedBy: userId,
      });
    }),

  /**
   * Update draft order (basic version)
   */
  updateDraftOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        items: z
          .array(
            z.object({
              batchId: z.number(),
              displayName: z.string().optional(),
              quantity: z.number(),
              unitPrice: z.number(),
              isSample: z.boolean(),
              overridePrice: z.number().optional(),
              overrideCogs: z.number().optional(),
            })
          )
          .optional(),
        validUntil: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await ordersDb.updateDraftOrder(input);
    }),

  /**
   * Delete draft order
   */
  deleteDraftOrder: protectedProcedure
    .use(requirePermission("orders:delete"))
    .input(
      z.object({
        orderId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await ordersDb.deleteDraftOrder(input);
    }),

  // ==========================================================================
  // ENHANCED DRAFT WORKFLOW (from ordersEnhancedV2.ts)
  // ==========================================================================

  /**
   * Create draft order (enhanced with COGS/margin)
   * Preferred method for new order creation
   */
  createDraftEnhanced: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(createOrderInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Calculate line item prices and totals
      const lineItemsWithPrices = await Promise.all(
        input.lineItems.map(async item => {
          // Get batch info for original COGS
          const batch = await db.query.batches.findFirst({
            where: eq(batches.id, item.batchId),
          });

          if (!batch) {
            throw new Error(`Batch ${item.batchId} not found`);
          }

          const originalCogs = parseFloat(batch.unitCogs || "0");
          const cogsPerUnit = item.isCogsOverridden
            ? item.cogsPerUnit
            : originalCogs;

          // Get margin (from input or lookup)
          let marginPercent: number;
          let marginSource: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";

          if (item.isMarginOverridden && item.marginPercent !== undefined) {
            marginPercent = item.marginPercent;
            marginSource = "MANUAL";
          } else {
            const marginResult = await pricingService.getMarginWithFallback(
              input.clientId,
              "OTHER"
            );
            marginPercent = marginResult.marginPercent || 0;
            marginSource = marginResult.source;
          }

          const unitPrice =
            marginCalculationService.calculatePriceFromMarginPercent(
              cogsPerUnit,
              marginPercent
            );
          const marginDollar = marginCalculationService.calculateMarginDollar(
            cogsPerUnit,
            unitPrice
          );
          const lineTotal = unitPrice * item.quantity;

          return {
            ...item,
            cogsPerUnit,
            originalCogsPerUnit: originalCogs,
            marginPercent,
            marginDollar,
            marginSource,
            unitPrice,
            pricePerUnit: unitPrice, // Alias for LineItemWithPrice interface
            lineTotal,
          };
        })
      );

      // Calculate totals
      const totals = priceCalculationService.calculateOrderTotals(
        lineItemsWithPrices,
        input.orderLevelAdjustment
      );

      // Validate order
      const validation = orderValidationService.validateOrder({
        orderType: input.orderType,
        clientId: input.clientId,
        lineItems: lineItemsWithPrices.map(item => ({
          batchId: item.batchId,
          quantity: item.quantity,
          cogsPerUnit: item.cogsPerUnit,
          pricePerUnit: item.unitPrice,
          marginPercent: item.marginPercent,
          isSample: item.isSample,
        })),
        finalTotal: totals.finalTotal,
        overallMarginPercent: totals.avgMarginPercent,
      });

      // Generate order number
      const orderNumber = await ordersDb.generateOrderNumber(input.orderType);

      // Create order
      const [orderResult] = await db.insert(orders).values({
        orderNumber,
        orderType: input.orderType,
        clientId: input.clientId,
        isDraft: true,
        items: JSON.stringify(lineItemsWithPrices.map(item => ({
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          isSample: item.isSample,
        }))),
        total: totals.finalTotal.toString(),
        subtotal: totals.subtotal.toString(),
        avgMarginPercent: totals.avgMarginPercent.toString(),
        notes: input.notes || null,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        paymentTerms: input.paymentTerms || null,
        cashPayment: input.cashPayment?.toString() || null,
        createdBy: userId,
      });

      const orderId = orderResult.insertId;

      // Create line items
      await Promise.all(
        lineItemsWithPrices.map(item =>
          db.insert(orderLineItems).values({
            orderId,
            batchId: item.batchId,
            productDisplayName: item.productDisplayName || null,
            quantity: item.quantity.toString(),
            isSample: item.isSample,
            cogsPerUnit: item.cogsPerUnit.toString(),
            originalCogsPerUnit: item.originalCogsPerUnit.toString(),
            marginPercent: item.marginPercent.toString(),
            marginDollar: item.marginDollar.toString(),
            isCogsOverridden: item.isCogsOverridden,
            cogsOverrideReason: item.cogsOverrideReason || null,
            isMarginOverridden: item.isMarginOverridden,
            marginSource: item.marginSource,
            unitPrice: item.unitPrice.toString(),
            lineTotal: item.lineTotal.toString(),
          })
        )
      );

      // Log audit entry
      await orderAuditService.logOrderCreation(orderId, userId, {
        orderType: input.orderType,
        clientId: input.clientId,
        lineItemCount: lineItemsWithPrices.length,
        total: totals.finalTotal,
      });

      return {
        orderId,
        orderNumber,
        totals,
        validation,
      };
    }),

  /**
   * Update draft order (enhanced version)
   */
  updateDraftEnhanced: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        version: z.number(), // Optimistic locking
        lineItems: z.array(lineItemInputSchema),
        orderLevelAdjustment: orderAdjustmentSchema.optional(),
        showAdjustmentOnDocument: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get existing order
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!existingOrder) {
        throw new Error("Order not found");
      }

      // Calculate line item prices (same logic as createDraftEnhanced)
      const lineItemsWithPrices = await Promise.all(
        input.lineItems.map(async item => {
          const batch = await db.query.batches.findFirst({
            where: eq(batches.id, item.batchId),
          });

          if (!batch) {
            throw new Error(`Batch ${item.batchId} not found`);
          }

          const originalCogs = parseFloat(batch.unitCogs || "0");
          const cogsPerUnit = item.isCogsOverridden
            ? item.cogsPerUnit
            : originalCogs;

          let marginPercent: number;
          let marginSource: "CUSTOMER_PROFILE" | "DEFAULT" | "MANUAL";

          if (item.isMarginOverridden && item.marginPercent !== undefined) {
            marginPercent = item.marginPercent;
            marginSource = "MANUAL";
          } else {
            const marginResult = await pricingService.getMarginWithFallback(
              existingOrder.clientId,
              "OTHER"
            );
            marginPercent = marginResult.marginPercent || 0;
            marginSource = marginResult.source;
          }

          const unitPrice =
            marginCalculationService.calculatePriceFromMarginPercent(
              cogsPerUnit,
              marginPercent
            );
          const marginDollar = marginCalculationService.calculateMarginDollar(
            cogsPerUnit,
            unitPrice
          );
          const lineTotal = unitPrice * item.quantity;

          return {
            ...item,
            cogsPerUnit,
            originalCogsPerUnit: originalCogs,
            marginPercent,
            marginDollar,
            marginSource,
            unitPrice,
            pricePerUnit: unitPrice, // Alias for LineItemWithPrice interface
            lineTotal,
          };
        })
      );

      // Calculate totals
      const totals = priceCalculationService.calculateOrderTotals(
        lineItemsWithPrices,
        input.orderLevelAdjustment
      );

      // Validate order
      const validation = orderValidationService.validateOrder({
        orderType: existingOrder.orderType as "QUOTE" | "SALE",
        clientId: existingOrder.clientId,
        lineItems: lineItemsWithPrices.map(item => ({
          batchId: item.batchId,
          quantity: item.quantity,
          cogsPerUnit: item.cogsPerUnit,
          pricePerUnit: item.unitPrice,
          marginPercent: item.marginPercent,
          isSample: item.isSample,
        })),
        finalTotal: totals.finalTotal,
        overallMarginPercent: totals.avgMarginPercent,
      });

      // Update order
      await db
        .update(orders)
        .set({
          total: totals.finalTotal.toString(),
          subtotal: totals.subtotal.toString(),
          avgMarginPercent: totals.avgMarginPercent.toString(),
          notes: input.notes,
        })
        .where(eq(orders.id, input.orderId));

      // Delete existing line items
      await db
        .delete(orderLineItems)
        .where(eq(orderLineItems.orderId, input.orderId));

      // Create new line items
      await Promise.all(
        lineItemsWithPrices.map(item =>
          db.insert(orderLineItems).values({
            orderId: input.orderId,
            batchId: item.batchId,
            productDisplayName: item.productDisplayName || null,
            quantity: item.quantity.toString(),
            isSample: item.isSample,
            cogsPerUnit: item.cogsPerUnit.toString(),
            originalCogsPerUnit: item.originalCogsPerUnit.toString(),
            marginPercent: item.marginPercent.toString(),
            marginDollar: item.marginDollar.toString(),
            isCogsOverridden: item.isCogsOverridden,
            cogsOverrideReason: item.cogsOverrideReason || null,
            isMarginOverridden: item.isMarginOverridden,
            marginSource: item.marginSource,
            unitPrice: item.unitPrice.toString(),
            lineTotal: item.lineTotal.toString(),
          })
        )
      );

      // Log audit entry
      await orderAuditService.logOrderUpdate(input.orderId, userId, {
        lineItemCount: lineItemsWithPrices.length,
        total: totals.finalTotal,
      });

      return {
        orderId: input.orderId,
        totals,
        validation,
      };
    }),

  /**
   * Finalize draft order
   */
  finalizeDraft: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        orderId: z.number(),
        version: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get existing order
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!existingOrder) {
        throw new Error("Order not found");
      }

      // Get line items
      const lineItems = await db.query.orderLineItems.findMany({
        where: eq(orderLineItems.orderId, input.orderId),
      });

      // Final validation
      const validation = orderValidationService.validateOrder({
        orderType: existingOrder.orderType as "QUOTE" | "SALE",
        clientId: existingOrder.clientId,
        lineItems: lineItems.map(item => ({
          batchId: item.batchId,
          quantity: parseFloat(item.quantity),
          cogsPerUnit: parseFloat(item.cogsPerUnit),
          pricePerUnit: parseFloat(item.unitPrice),
          marginPercent: parseFloat(item.marginPercent),
          isSample: item.isSample,
        })),
        finalTotal: parseFloat(existingOrder.total),
        overallMarginPercent: parseFloat(existingOrder.avgMarginPercent || "0"),
      });

      if (!validation.isValid) {
        throw new Error(`Cannot finalize: ${validation.errors.join(", ")}`);
      }

      // Update order to finalized
      await db
        .update(orders)
        .set({
          isDraft: false,
          confirmedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId));

      // Log audit entry
      await orderAuditService.logOrderFinalization(input.orderId, userId, {
        finalTotal: parseFloat(existingOrder.total),
        finalizedAt: new Date(),
      });

      return {
        orderId: input.orderId,
        orderNumber: existingOrder.orderNumber,
        validation,
      };
    }),

  /**
   * Get order with line items (enhanced version)
   */
  getOrderWithLineItems: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const lineItems = await db.query.orderLineItems.findMany({
        where: eq(orderLineItems.orderId, input.orderId),
      });

      return {
        order,
        lineItems,
      };
    }),

  // ==========================================================================
  // PRICING & MARGIN OPERATIONS (from ordersEnhancedV2.ts)
  // ==========================================================================

  /**
   * Get margin for product
   * Returns margin with fallback logic
   */
  getMarginForProduct: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number(),
        productCategory: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      return await pricingService.getMarginWithFallback(
        input.clientId,
        input.productCategory
      );
    }),

  /**
   * Calculate price from margin
   */
  calculatePrice: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        cogs: z.number(),
        marginPercent: z.number(),
      })
    )
    .query(({ input }) => {
      const price = marginCalculationService.calculatePriceFromMarginPercent(
        input.cogs,
        input.marginPercent
      );
      const marginDollar = marginCalculationService.calculateMarginDollar(
        input.cogs,
        price
      );

      return {
        price,
        marginDollar,
      };
    }),

  /**
   * Update COGS for line item
   * Triggers COGS change service
   */
  updateLineItemCOGS: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        lineItemId: z.number(),
        batchId: z.number(),
        newCOGS: z.number(),
        reason: z.string(),
        scope: z.enum(["ORDER_ONLY", "FUTURE", "ALL"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get existing line item
      const lineItem = await db.query.orderLineItems.findFirst({
        where: eq(orderLineItems.id, input.lineItemId),
      });

      if (!lineItem) {
        throw new Error("Line item not found");
      }

      const oldCOGS = parseFloat(lineItem.cogsPerUnit);

      // Validate COGS value
      const validation = cogsChangeIntegrationService.validateCOGS(input.newCOGS);
      if (!validation.isValid) {
        throw new Error(`COGS validation failed: ${validation.errors.join(", ")}`);
      }

      // Track COGS override for reporting
      await cogsChangeIntegrationService.trackCOGSOverride(
        input.batchId,
        oldCOGS,
        input.newCOGS,
        input.reason
      );

      // Update line item
      await db
        .update(orderLineItems)
        .set({
          cogsPerUnit: input.newCOGS.toString(),
          isCogsOverridden: true,
          cogsOverrideReason: input.reason,
        })
        .where(eq(orderLineItems.id, input.lineItemId));

      // Log audit entry
      await orderAuditService.logCOGSOverride(
        input.orderId,
        userId,
        input.lineItemId,
        oldCOGS,
        input.newCOGS,
        input.reason
      );

      return {
        success: true,
        oldCOGS,
        newCOGS: input.newCOGS,
      };
    }),

  // ==========================================================================
  // STATUS MANAGEMENT (from orders.ts)
  // ==========================================================================

  /**
   * Update order fulfillment status
   */
  updateOrderStatus: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        newStatus: z.enum(["PENDING", "PACKED", "SHIPPED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await ordersDb.updateOrderStatus({
        ...input,
        userId,
      });
    }),

  /**
   * Get order status history
   */
  getOrderStatusHistory: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      return await ordersDb.getOrderStatusHistory(input.orderId);
    }),

  // ==========================================================================
  // RETURNS MANAGEMENT (from orders.ts)
  // ==========================================================================

  /**
   * Process return
   */
  processReturn: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        items: z.array(
          z.object({
            batchId: z.number(),
            quantity: z.number(),
          })
        ),
        reason: z.enum([
          "DEFECTIVE",
          "WRONG_ITEM",
          "NOT_AS_DESCRIBED",
          "CUSTOMER_CHANGED_MIND",
          "OTHER",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await ordersDb.processReturn({
        ...input,
        userId,
      });
    }),

  /**
   * Get order returns
   */
  getOrderReturns: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      return await ordersDb.getOrderReturns(input.orderId);
    }),

  // ==========================================================================
  // CONVERSION & EXPORT (from orders.ts)
  // ==========================================================================

  /**
   * Convert quote to sale (backward compatibility alias)
   */
  convertToSale: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        quoteId: z.number(),
        paymentTerms: z
          .enum(["NET_7", "NET_15", "NET_30", "COD", "PARTIAL", "CONSIGNMENT"])
          .optional(),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await ordersDb.convertQuoteToSale({
        quoteId: input.quoteId,
        paymentTerms: input.paymentTerms || "NET_30",
        cashPayment: input.cashPayment,
        notes: input.notes,
      });
    }),

  /**
   * Convert quote to sale (full name)
   */
  convertQuoteToSale: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        quoteId: z.number(),
        paymentTerms: z
          .enum(["NET_7", "NET_15", "NET_30", "COD", "PARTIAL", "CONSIGNMENT"])
          .optional(),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await ordersDb.convertQuoteToSale({
        quoteId: input.quoteId,
        paymentTerms: input.paymentTerms || "NET_30",
        cashPayment: input.cashPayment,
        notes: input.notes,
      });
    }),

  /**
   * Export order
   */
  export: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        id: z.number(),
        format: z.enum(["pdf", "clipboard", "image"]),
      })
    )
    .mutation(async ({ input }) => {
      return await ordersDb.exportOrder(input.id, input.format);
    }),

  // ==========================================================================
  // AUDIT LOG (from ordersEnhancedV2.ts)
  // ==========================================================================

  /**
   * Get audit log for order
   */
  getAuditLog: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      return await orderAuditService.getAuditLog(input.orderId);
    }),
});
