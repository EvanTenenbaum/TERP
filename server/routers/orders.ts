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
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import * as ordersDb from "../ordersDb";
import { getDb } from "../db";
import {
  orders,
  orderLineItems,
  orderLineItemAllocations,
  batches,
  products,
} from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { softDelete, restoreDeleted } from "../utils/softDelete";
import { pricingService } from "../services/pricingService";
import { onOrderCreated } from "../services/notificationTriggers";
import { marginCalculationService } from "../services/marginCalculationService";
import { priceCalculationService } from "../services/priceCalculationService";
import { orderValidationService } from "../services/orderValidationService";
import { orderAuditService } from "../services/orderAuditService";
import { cogsChangeIntegrationService } from "../services/cogsChangeIntegrationService";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { withTransaction } from "../dbTransaction";
import { logger } from "../_core/logger";

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
      const order = await ordersDb.createOrder({
        ...input,
        createdBy: userId,
      });

      // Trigger notification for new order
      onOrderCreated({
        id: order.id,
        orderNumber: order.orderNumber,
        clientId: order.clientId,
        total: order.total,
        orderType: order.orderType,
      }).catch(error => {
        // Don't fail the mutation if notification fails
        console.error("Failed to send order created notification:", error);
      });

      return order;
    }),

  /**
   * Get order by ID
   * BUG-082: Added proper error handling with try-catch wrapper
   */
  getById: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });
        }

        const order = await ordersDb.getOrderById(input.id);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Order with ID ${input.id} not found`,
          });
        }

        return order;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        logger.error({ error, orderId: input.id }, "Failed to get order by ID");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch order details",
          cause: error,
        });
      }
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
      const orders = await ordersDb.getAllOrders(input);

      // BUG-034: Standardized pagination response
      const limit = input?.limit || 50;
      const offset = input?.offset || 0;

      return createSafeUnifiedResponse(orders, -1, limit, offset);
    }),

  /**
   * Update order
   */
  update: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        version: z.number().optional(), // ST-026: Optional for backward compatibility
        notes: z.string().optional(),
        validUntil: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, version, ...updates } = input;
      // ST-026: Pass version to updateOrder for optimistic locking
      return await ordersDb.updateOrder(id, updates, version);
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
    .mutation(async ({ input, ctx }) => {
      const deletedBy = getAuthenticatedUserId(ctx);
      return await ordersDb.deleteDraftOrder({
        orderId: input.orderId,
        deletedBy,
      });
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

      const userId = getAuthenticatedUserId(ctx);

      // Calculate line item prices and totals
      const lineItemsWithPrices = await Promise.all(
        input.lineItems.map(async item => {
          // Get batch info for COGS
          const batch = await db.query.batches.findFirst({
            where: eq(batches.id, item.batchId),
          });

          if (!batch) {
            throw new Error(`Batch ${item.batchId} not found`);
          }

          // Get product info for category lookup
          const product = await db.query.products.findFirst({
            where: eq(products.id, batch.productId),
            columns: { category: true },
          });

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
            // Try to get margin using product category or fallback to "OTHER"
            const productCategory = product?.category || "OTHER";
            const marginResult = await pricingService.getMarginWithFallback(
              input.clientId,
              productCategory
            );

            // If no margin found after all fallbacks, use 30% as last resort
            // This ensures orders can still be created while alerting the user
            if (marginResult.marginPercent === null) {
              console.warn(
                `[orders.create] No pricing default found for category "${productCategory}". ` +
                  `Using 30% fallback margin. Please seed pricing_defaults table.`
              );
              marginPercent = 30; // Safe default margin
              marginSource = "MANUAL";
            } else {
              marginPercent = marginResult.marginPercent;
              marginSource = marginResult.source;
            }
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
        items: JSON.stringify(
          lineItemsWithPrices.map(item => ({
            batchId: item.batchId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            isSample: item.isSample,
          }))
        ),
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

      const userId = getAuthenticatedUserId(ctx);

      // ST-026: Check version for concurrent edit detection
      const { checkVersion } = await import("../_core/optimisticLocking");
      await checkVersion(db, orders, "Order", input.orderId, input.version);

      // Get full existing order
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

          // BUG-086 FIX: Get product category like createDraftEnhanced does
          const product = batch.productId
            ? await db.query.products.findFirst({
                where: eq(products.id, batch.productId),
                columns: { category: true },
              })
            : null;

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
            // BUG-086 FIX: Use actual product category, not hardcoded "OTHER"
            const productCategory = product?.category || "OTHER";
            const marginResult = await pricingService.getMarginWithFallback(
              existingOrder.clientId,
              productCategory
            );

            // BUG-086 FIX: Use 30% fallback with warning instead of 0%
            if (marginResult.marginPercent === null) {
              console.warn(
                `[orders.update] No pricing default found for category "${productCategory}". ` +
                  `Using 30% fallback margin. Please seed pricing_defaults table.`
              );
              marginPercent = 30; // Safe default margin
              marginSource = "MANUAL";
            } else {
              marginPercent = marginResult.marginPercent;
              marginSource = marginResult.source;
            }
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

      // ST-026: Update order with line items in transaction to prevent orphaned records
      const { sql } = await import("drizzle-orm");
      await withTransaction(async tx => {
        // Update order with version increment
        await tx
          .update(orders)
          .set({
            total: totals.finalTotal.toString(),
            subtotal: totals.subtotal.toString(),
            avgMarginPercent: totals.avgMarginPercent.toString(),
            notes: input.notes,
            version: sql`version + 1`,
          })
          .where(eq(orders.id, input.orderId));

        // Delete existing line items
        await tx
          .delete(orderLineItems)
          .where(eq(orderLineItems.orderId, input.orderId));

        // Create new line items
        await Promise.all(
          lineItemsWithPrices.map(item =>
            tx.insert(orderLineItems).values({
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
      });

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

      const userId = getAuthenticatedUserId(ctx);

      // ST-026: Check version for concurrent edit detection
      const { checkVersion } = await import("../_core/optimisticLocking");
      await checkVersion(db, orders, "Order", input.orderId, input.version);

      // Get full existing order
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

      // ST-026: Update order to finalized with version increment
      const { sql } = await import("drizzle-orm");
      await db
        .update(orders)
        .set({
          isDraft: false,
          confirmedAt: new Date(),
          version: sql`version + 1`,
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
      const validation = cogsChangeIntegrationService.validateCOGS(
        input.newCOGS
      );
      if (!validation.isValid) {
        throw new Error(
          `COGS validation failed: ${validation.errors.join(", ")}`
        );
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

      return await orderAuditService.getAuditLog(input.orderId);
    }),

  // ==========================================================================
  // ORDER FULFILLMENT WORKFLOW (Wave 5A: Sales Workflow)
  // ==========================================================================

  /**
   * Confirm a pending order
   * Validates inventory and transitions order to confirmed state
   */
  confirmOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.id))
        .limit(1);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.orderType !== "SALE") {
        throw new Error("Only SALE orders can be confirmed");
      }

      if (
        order.saleStatus !== "PENDING" &&
        order.fulfillmentStatus !== "PENDING"
      ) {
        throw new Error(
          `Order cannot be confirmed. Current status: ${order.saleStatus || order.fulfillmentStatus}`
        );
      }

      // Parse and verify inventory
      let orderItems;
      try {
        orderItems =
          typeof order.items === "string"
            ? JSON.parse(order.items)
            : order.items;
      } catch {
        throw new Error("Failed to parse order items - data may be corrupted");
      }

      // FIXED: Batch query instead of N+1 individual queries
      const batchIds = orderItems.map(
        (item: { batchId: number }) => item.batchId
      );
      const batchRecords = await db
        .select()
        .from(batches)
        .where(inArray(batches.id, batchIds));

      const batchMap = new Map(batchRecords.map(b => [b.id, b]));

      for (const item of orderItems) {
        const batch = batchMap.get(item.batchId);

        if (!batch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Batch ${item.batchId} not found`,
          });
        }

        const availableQty = item.isSample
          ? parseFloat(batch.sampleQty || "0")
          : parseFloat(batch.onHandQty || "0");

        if (availableQty < item.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              `Insufficient inventory for batch ${batch.sku || batch.id}. ` +
              `Available: ${availableQty}, Required: ${item.quantity}`,
          });
        }
      }

      // Update order to confirmed
      await db
        .update(orders)
        .set({
          confirmedAt: new Date(),
          notes: input.notes
            ? `${order.notes || ""}\n[Confirmed]: ${input.notes}`.trim()
            : order.notes,
        })
        .where(eq(orders.id, input.id));

      return { success: true, orderId: input.id };
    }),

  /**
   * Fulfill order items with pick quantities
   * Records picked quantities and updates inventory
   */
  fulfillOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        items: z.array(
          z.object({
            batchId: z.number(),
            pickedQuantity: z.number().min(0),
            locationId: z.number().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get the order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.id))
        .limit(1);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.fulfillmentStatus === "SHIPPED") {
        throw new Error("Cannot fulfill a shipped order");
      }

      // Parse order items
      let orderItems;
      try {
        orderItems =
          typeof order.items === "string"
            ? JSON.parse(order.items)
            : order.items;
      } catch {
        throw new Error("Failed to parse order items - data may be corrupted");
      }

      // Type for picked items
      interface PickedItem {
        batchId: number;
        pickedQuantity: number;
        locationId?: number;
        pickedNotes?: string;
        pickedAt: string;
        pickedBy: number;
        [key: string]: unknown; // Allow additional properties from orderItem spread
      }

      // Validate and track picked items
      const pickedItems: PickedItem[] = [];
      let allFullyPicked = true;

      for (const pickItem of input.items) {
        const orderItem = orderItems.find(
          (oi: { batchId: number }) => oi.batchId === pickItem.batchId
        );

        if (!orderItem) {
          throw new Error(`Batch ${pickItem.batchId} is not in this order`);
        }

        if (pickItem.pickedQuantity > orderItem.quantity) {
          throw new Error(
            `Picked quantity (${pickItem.pickedQuantity}) exceeds ordered quantity (${orderItem.quantity}) for batch ${pickItem.batchId}`
          );
        }

        if (pickItem.pickedQuantity < orderItem.quantity) {
          allFullyPicked = false;
        }

        pickedItems.push({
          ...orderItem,
          pickedQuantity: pickItem.pickedQuantity,
          locationId: pickItem.locationId,
          pickedNotes: pickItem.notes,
          pickedAt: new Date().toISOString(),
          pickedBy: userId,
        });
      }

      // Update order with picked items info
      const newStatus = allFullyPicked ? "PACKED" : "PENDING";
      const updatedItems = orderItems.map((item: { batchId: number }) => {
        const picked = pickedItems.find(
          (p: { batchId: number }) => p.batchId === item.batchId
        );
        return picked || item;
      });

      await db
        .update(orders)
        .set({
          items: JSON.stringify(updatedItems),
          fulfillmentStatus: newStatus,
          packedAt: allFullyPicked ? new Date() : null,
          packedBy: allFullyPicked ? userId : null,
        })
        .where(eq(orders.id, input.id));

      return {
        success: true,
        orderId: input.id,
        status: newStatus,
        allFullyPicked,
        pickedItems: pickedItems.length,
      };
    }),

  /**
   * Ship an order
   * Records shipping details and updates status to SHIPPED
   */
  shipOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        trackingNumber: z.string().optional(),
        carrier: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get the order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.id))
        .limit(1);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.fulfillmentStatus === "SHIPPED") {
        throw new Error("Order is already shipped");
      }

      // Should be PACKED before shipping (but allow PENDING for flexibility)
      if (!["PENDING", "PACKED"].includes(order.fulfillmentStatus || "")) {
        throw new Error(
          `Order cannot be shipped. Current status: ${order.fulfillmentStatus}`
        );
      }

      // Build shipping notes
      let shippingNotes = "";
      if (input.carrier) shippingNotes += `Carrier: ${input.carrier}\n`;
      if (input.trackingNumber)
        shippingNotes += `Tracking: ${input.trackingNumber}\n`;
      if (input.notes) shippingNotes += input.notes;

      await db
        .update(orders)
        .set({
          fulfillmentStatus: "SHIPPED",
          shippedAt: new Date(),
          shippedBy: userId,
          notes: shippingNotes
            ? `${order.notes || ""}\n[Shipped]: ${shippingNotes}`.trim()
            : order.notes,
        })
        .where(eq(orders.id, input.id));

      // Log to status history
      const { orderStatusHistory } = await import("../../drizzle/schema");
      await db.insert(orderStatusHistory).values({
        orderId: input.id,
        fulfillmentStatus: "SHIPPED",
        changedBy: userId,
        notes: shippingNotes || undefined,
      });

      return {
        success: true,
        orderId: input.id,
        status: "SHIPPED",
        trackingNumber: input.trackingNumber,
        carrier: input.carrier,
      };
    }),

  /**
   * Mark order as delivered
   * Final step in fulfillment workflow
   */
  deliverOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        signature: z.string().optional(),
        notes: z.string().optional(),
        deliveredAt: z.string().optional(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get the order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.id))
        .limit(1);

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.fulfillmentStatus !== "SHIPPED") {
        throw new Error("Order must be shipped before marking as delivered");
      }

      // Build delivery notes
      let deliveryNotes = `Delivered: ${input.deliveredAt || new Date().toISOString()}\n`;
      if (input.signature) deliveryNotes += `Signature: ${input.signature}\n`;
      if (input.notes) deliveryNotes += input.notes;

      // WSQA-003: Now using proper DELIVERED status
      await db
        .update(orders)
        .set({
          fulfillmentStatus: "DELIVERED",
          notes: `${order.notes || ""}\n[Delivered]: ${deliveryNotes}`.trim(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.id));

      // Log to status history
      const { orderStatusHistory } = await import("../../drizzle/schema");
      await db.insert(orderStatusHistory).values({
        orderId: input.id,
        fulfillmentStatus: "DELIVERED",
        changedBy: userId,
        notes: deliveryNotes,
      });

      return {
        success: true,
        orderId: input.id,
        deliveredAt: input.deliveredAt || new Date().toISOString(),
      };
    }),

  // WSQA-003: Mark order as returned
  markAsReturned: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        returnReason: z.string().min(1, "Return reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Import state machine
      const { canTransition } = await import("../services/orderStateMachine");

      // Get order
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Validate transition
      if (!canTransition(order.fulfillmentStatus || "PENDING", "RETURNED")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot mark order as returned from ${order.fulfillmentStatus} status. Order must be SHIPPED or DELIVERED.`,
        });
      }

      // Update order status
      await db
        .update(orders)
        .set({
          fulfillmentStatus: "RETURNED",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId));

      // Log status change
      const { orderStatusHistory } = await import("../../drizzle/schema");
      await db.insert(orderStatusHistory).values({
        orderId: input.orderId,
        fulfillmentStatus: "RETURNED",
        changedBy: userId,
        notes: input.returnReason,
      });

      logger.info({
        msg: "WSQA-003: Order marked as returned",
        orderId: input.orderId,
        returnReason: input.returnReason,
        userId,
      });

      return { success: true };
    }),

  // WSQA-003: Process restock - return items to inventory
  processRestock: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);

      const { processRestock } = await import("../services/returnProcessing");
      await processRestock(input.orderId, userId);

      return { success: true };
    }),

  // WSQA-003: Process vendor return
  processVendorReturn: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        vendorId: z.number(),
        returnReason: z.string().min(1, "Return reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);

      const { processVendorReturn } =
        await import("../services/returnProcessing");
      const vendorReturnId = await processVendorReturn(
        input.orderId,
        input.vendorId,
        input.returnReason,
        userId
      );

      return { vendorReturnId };
    }),

  // WSQA-003: Get valid next statuses for an order
  getNextStatuses: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [order] = await db
        .select({ fulfillmentStatus: orders.fulfillmentStatus })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const { getNextStatuses, STATUS_LABELS } =
        await import("../services/orderStateMachine");
      const nextStatuses = getNextStatuses(
        order.fulfillmentStatus || "PENDING"
      );

      return nextStatuses.map(status => ({
        status,
        label: STATUS_LABELS[status],
      }));
    }),

  // WSQA-002: Allocate specific batches to an order line item (Flexible Lot Selection)
  allocateBatchesToLineItem: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        lineItemId: z.number(),
        allocations: z.array(
          z.object({
            batchId: z.number(),
            quantity: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);

      return await withTransaction(async tx => {
        // 1. Validate line item exists and order is in editable state
        const [lineItem] = await tx
          .select()
          .from(orderLineItems)
          .where(eq(orderLineItems.id, input.lineItemId))
          .limit(1);

        if (!lineItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Line item not found",
          });
        }

        // Get order to check status
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, lineItem.orderId))
          .limit(1);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }

        // Only allow allocation for draft orders or orders awaiting fulfillment
        const editableStatuses = [
          "DRAFT",
          "PENDING",
          "PROCESSING",
          "CONFIRMED",
        ];
        if (!editableStatuses.includes(order.fulfillmentStatus || "")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot allocate batches for order in ${order.fulfillmentStatus} status`,
          });
        }

        // 2. Clear existing allocations for this line item
        // QA-001 FIX: First release reservedQty from existing allocations
        const existingAllocations = await tx
          .select({
            batchId: orderLineItemAllocations.batchId,
            quantityAllocated: orderLineItemAllocations.quantityAllocated,
          })
          .from(orderLineItemAllocations)
          .where(
            eq(orderLineItemAllocations.orderLineItemId, input.lineItemId)
          );

        // Release reserved quantities from existing allocations
        for (const existing of existingAllocations) {
          const [batch] = await tx
            .select({ reservedQty: batches.reservedQty })
            .from(batches)
            .where(eq(batches.id, existing.batchId))
            .for("update")
            .limit(1);

          if (batch) {
            const currentReserved = parseFloat(
              String(batch.reservedQty || "0")
            );
            const allocatedQty = parseFloat(
              String(existing.quantityAllocated || "0")
            );
            const newReserved = Math.max(0, currentReserved - allocatedQty);

            await tx
              .update(batches)
              .set({ reservedQty: newReserved.toString() })
              .where(eq(batches.id, existing.batchId));
          }
        }

        // Now delete the allocation records
        await tx
          .delete(orderLineItemAllocations)
          .where(
            eq(orderLineItemAllocations.orderLineItemId, input.lineItemId)
          );

        // 3. Validate total quantity matches line item quantity
        const totalAllocated = input.allocations.reduce(
          (sum, a) => sum + a.quantity,
          0
        );
        const lineItemQty = parseFloat(String(lineItem.quantity || "0"));

        if (Math.abs(totalAllocated - lineItemQty) > 0.01) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Allocated quantity (${totalAllocated}) must match line item quantity (${lineItemQty})`,
          });
        }

        // 4. Create new allocations with validation
        const createdAllocations = [];
        let totalCost = 0;

        for (const alloc of input.allocations) {
          // Lock batch row to prevent concurrent allocation
          const [batch] = await tx
            .select()
            .from(batches)
            .where(eq(batches.id, alloc.batchId))
            .for("update")
            .limit(1);

          if (!batch) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Batch ${alloc.batchId} not found`,
            });
          }

          // Calculate available quantity
          const onHand = parseFloat(String(batch.onHandQty || "0"));
          const reserved = parseFloat(String(batch.reservedQty || "0"));
          const quarantine = parseFloat(String(batch.quarantineQty || "0"));
          const hold = parseFloat(String(batch.holdQty || "0"));
          const availableQty = Math.max(
            0,
            onHand - reserved - quarantine - hold
          );

          if (availableQty < alloc.quantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Insufficient quantity in batch ${batch.sku || batch.id}. Available: ${availableQty}, Requested: ${alloc.quantity}`,
            });
          }

          const unitCost = batch.unitCogs
            ? parseFloat(String(batch.unitCogs))
            : 0;

          // Insert allocation record
          await tx.insert(orderLineItemAllocations).values({
            orderLineItemId: input.lineItemId,
            batchId: alloc.batchId,
            quantityAllocated: alloc.quantity.toString(),
            unitCost: unitCost.toFixed(4),
            allocatedBy: userId,
          });

          // QA-001 FIX: Update reservedQty to prevent double-selling
          // This ensures concurrent allocations see the reduced available quantity
          const newReserved = reserved + alloc.quantity;
          await tx
            .update(batches)
            .set({ reservedQty: newReserved.toString() })
            .where(eq(batches.id, alloc.batchId));

          createdAllocations.push({
            batchId: alloc.batchId,
            batchSku: batch.sku,
            quantity: alloc.quantity,
            unitCost,
          });

          totalCost += alloc.quantity * unitCost;
        }

        // Calculate weighted average COGS
        const weightedAvgCogs =
          totalAllocated > 0 ? totalCost / totalAllocated : 0;

        // 5. Update line item COGS if allocations changed it
        await tx
          .update(orderLineItems)
          .set({
            cogsPerUnit: weightedAvgCogs.toFixed(2),
          })
          .where(eq(orderLineItems.id, input.lineItemId));

        logger.info({
          msg: "WSQA-002: Batch allocations saved",
          lineItemId: input.lineItemId,
          orderId: order.id,
          allocationCount: createdAllocations.length,
          totalCost,
          weightedAvgCogs,
        });

        return {
          lineItemId: input.lineItemId,
          allocations: createdAllocations,
          totalCogs: totalCost,
          weightedAverageCost: weightedAvgCogs,
        };
      });
    }),

  // WSQA-002: Get allocations for an order line item
  getLineItemAllocations: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        lineItemId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const allocations = await db
        .select({
          id: orderLineItemAllocations.id,
          batchId: orderLineItemAllocations.batchId,
          quantityAllocated: orderLineItemAllocations.quantityAllocated,
          unitCost: orderLineItemAllocations.unitCost,
          allocatedAt: orderLineItemAllocations.allocatedAt,
          batchSku: batches.sku,
          batchCode: batches.code,
          batchGrade: batches.grade,
        })
        .from(orderLineItemAllocations)
        .leftJoin(batches, eq(orderLineItemAllocations.batchId, batches.id))
        .where(eq(orderLineItemAllocations.orderLineItemId, input.lineItemId));

      return allocations.map(alloc => ({
        id: alloc.id,
        batchId: alloc.batchId,
        batchSku: alloc.batchSku,
        batchCode: alloc.batchCode,
        batchGrade: alloc.batchGrade,
        quantity: parseFloat(String(alloc.quantityAllocated || "0")),
        unitCost: parseFloat(String(alloc.unitCost || "0")),
        allocatedAt: alloc.allocatedAt,
      }));
    }),
});
