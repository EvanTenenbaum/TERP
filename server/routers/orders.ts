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
import { parseMoneyOrZero } from "../utils/money";
import * as ordersDb from "../ordersDb";
import { getDb } from "../db";
import {
  orders,
  orderLineItems,
  orderLineItemAllocations,
  batches,
  lots,
  clients,
  products,
  inventoryMovements,
  orderStatusHistory,
  type Batch,
  type OrderLineItem,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { safeInArray } from "../lib/sqlSafety";
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
import { withTransaction, withRetryableTransaction } from "../dbTransaction";
import { logger } from "../_core/logger";

// ============================================================================
// BUG-502: In-memory rate limiting for confirm endpoint
// Tracks timestamps of confirm calls per user to enforce 10 confirms/minute limit
// ============================================================================
const confirmRateLimitMap = new Map<number, number[]>();
const CONFIRM_RATE_LIMIT = 10; // max confirms per minute
const CONFIRM_RATE_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_ENTRIES = 10000; // Max users to track (prevent memory leak)

function checkConfirmRateLimit(userId: number): void {
  const now = Date.now();
  const userTimestamps = confirmRateLimitMap.get(userId) || [];

  // Filter to only timestamps within the window
  const recentTimestamps = userTimestamps.filter(
    ts => now - ts < CONFIRM_RATE_WINDOW_MS
  );

  if (recentTimestamps.length >= CONFIRM_RATE_LIMIT) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded: maximum ${CONFIRM_RATE_LIMIT} order confirmations per minute`,
    });
  }

  // Add current timestamp and update map
  recentTimestamps.push(now);
  confirmRateLimitMap.set(userId, recentTimestamps);

  // P1-001 FIX: Periodic cleanup to prevent memory leak
  // When map exceeds max size, remove entries with no recent activity
  if (confirmRateLimitMap.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [uid, timestamps] of confirmRateLimitMap) {
      const recent = timestamps.filter(ts => now - ts < CONFIRM_RATE_WINDOW_MS);
      if (recent.length === 0) {
        confirmRateLimitMap.delete(uid);
      }
    }
  }
}

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const lineItemInputSchema = z.object({
  batchId: z.number(),
  productDisplayName: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than 0"),
  isSample: z.boolean().default(false),
  // ORD-002: COGS must be non-negative
  cogsPerUnit: z.number().nonnegative("COGS per unit cannot be negative"),
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
        // TER-251: Require at least one item to prevent $0 orders
        items: z
          .array(
            z.object({
              batchId: z.number(),
              displayName: z.string().optional(),
              // ORD-002: Quantity and prices must be positive/non-negative
              quantity: z.number().positive("Quantity must be greater than 0"),
              unitPrice: z
                .number()
                .nonnegative("Unit price cannot be negative"),
              isSample: z.boolean(),
              overridePrice: z
                .number()
                .nonnegative("Override price cannot be negative")
                .optional(),
              overrideCogs: z
                .number()
                .nonnegative("Override COGS cannot be negative")
                .optional(),
            })
          )
          .min(1, "At least one item is required"),
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
      // TER-252: Verify order exists before deleting
      const existing = await ordersDb.getOrderById(input.id);

      if (!existing || existing.deletedAt !== null) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Order with ID ${input.id} not found`,
        });
      }

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
   * API-013: Simple confirm endpoint
   * Confirms a draft order with minimal input - validates inventory and sets isDraft=false
   *
   * BUG-301: Wrapped in transaction for atomicity
   * BUG-302: Added ownership validation
   * BUG-303: Automatic rollback on failure via transaction
   * BUG-304: Fresh reads within transaction scope
   * BUG-315: NaN validation for parseFloat results
   * BUG-316: Database arithmetic for decimal precision
   * BUG-317: Line item quantity validation
   */
  confirm: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // BUG-502: Rate limit check - 10 confirms per minute per user
      checkConfirmRateLimit(userId);

      // Import sql for database arithmetic (BUG-316)
      const { sql } = await import("drizzle-orm");

      // BUG-301, BUG-303, BUG-304: Wrap entire confirm logic in a transaction
      // BUG-507: Note - MySQL default isolation level is REPEATABLE READ which is adequate
      // for this use case as it prevents dirty reads and non-repeatable reads within the transaction
      // Transaction automatically rolls back on any thrown error
      return await withTransaction(async tx => {
        // BUG-304: Fresh read of order within transaction
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .limit(1);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Order with ID ${input.orderId} not found`,
          });
        }

        // BUG-302: Validate ownership - check order belongs to user or user has admin permission
        // BUG-404: Use permission service instead of hardcoded role check
        const { isSuperAdmin } = await import("../services/permissionService");
        const hasAdminPermission = ctx.user?.openId
          ? await isSuperAdmin(ctx.user.openId)
          : false;
        if (order.createdBy !== userId && !hasAdminPermission) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to confirm this order",
          });
        }

        if (!order.isDraft) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Order is already confirmed",
          });
        }

        // BUG-414: Validate order status allows confirmation
        if (order.saleStatus === "CANCELLED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot confirm a cancelled order",
          });
        }

        // BUG-414: Check fulfillment status allows confirmation
        const nonConfirmableStatuses = ["SHIPPED", "DELIVERED", "RETURNED"];
        if (
          order.fulfillmentStatus &&
          nonConfirmableStatuses.includes(order.fulfillmentStatus)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot confirm order with fulfillment status: ${order.fulfillmentStatus}`,
          });
        }

        // BUG-304, BUG-402: Fresh read of line items within transaction with row lock
        // SELECT FOR UPDATE prevents line items from being modified during confirm
        const lineItems = await tx
          .select()
          .from(orderLineItems)
          .where(eq(orderLineItems.orderId, input.orderId))
          .for("update");

        if (lineItems.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot confirm order with no line items",
          });
        }

        // BUG-317: Validate individual line item quantities
        for (const item of lineItems) {
          const qty = parseMoneyOrZero(item.quantity);
          if (Number.isNaN(qty) || qty <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid quantity for line item ${item.id}: quantity must be a positive number`,
            });
          }
        }

        // BUG-301, BUG-304: SELECT FOR UPDATE to lock batches and prevent race conditions
        // ST-053: Properly typed - lineItems is OrderLineItem[]
        const batchIds = lineItems.map(
          (item: OrderLineItem) => item.batchId as number
        );
        const batchRecords = await tx
          .select()
          .from(batches)
          .where(safeInArray(batches.id, batchIds))
          .for("update");

        const batchMap = new Map<number, Batch>(
          batchRecords.map((b: Batch) => [b.id, b])
        );

        // Check each line item has sufficient inventory
        for (const item of lineItems) {
          const batch = batchMap.get(item.batchId);
          if (!batch) {
            // BUG-509: Log batch context for debugging
            logger.error({
              msg: "Batch not found during order confirmation",
              batchId: item.batchId,
              orderId: input.orderId,
              lineItemId: item.id,
            });
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Batch ${item.batchId} not found`,
            });
          }

          // BUG-315: Handle NaN from parseFloat with explicit checks
          const onHand = parseMoneyOrZero(batch.onHandQty);
          const reserved = parseMoneyOrZero(batch.reservedQty);
          const quarantine = parseMoneyOrZero(batch.quarantineQty);
          const hold = parseMoneyOrZero(batch.holdQty);
          // BUG-501: Parse sampleQty for sample order validation
          const sampleQty = parseMoneyOrZero(batch.sampleQty);

          if (
            Number.isNaN(onHand) ||
            Number.isNaN(reserved) ||
            Number.isNaN(quarantine) ||
            Number.isNaN(hold) ||
            Number.isNaN(sampleQty)
          ) {
            // BUG-509: Log batch context for debugging
            logger.error({
              msg: "Invalid inventory data for batch",
              batchId: batch.id,
              sku: batch.sku,
              productId: batch.productId,
              onHand,
              reserved,
              quarantine,
              hold,
              sampleQty,
            });
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Invalid inventory data for batch ${batch.sku || batch.id}`,
            });
          }

          const requestedQty = parseMoneyOrZero(item.quantity);

          // BUG-315: Check for NaN in requested quantity
          if (Number.isNaN(requestedQty)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid quantity for line item: ${item.quantity}`,
            });
          }

          // BUG-501: Check appropriate quantity based on isSample flag
          if (item.isSample) {
            // For sample orders, check sampleQty
            if (sampleQty < requestedQty) {
              // BUG-509: Log batch context for debugging
              logger.warn({
                msg: "Insufficient sample inventory",
                batchId: batch.id,
                sku: batch.sku,
                productId: batch.productId,
                sampleQty,
                requestedQty,
                orderId: input.orderId,
              });
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient sample inventory for batch ${batch.sku || batch.id}. Available samples: ${sampleQty}, Requested: ${requestedQty}`,
              });
            }
          } else {
            // For regular orders, check available (non-sample) quantity
            const availableQty = Math.max(
              0,
              onHand - reserved - quarantine - hold
            );

            if (availableQty < requestedQty) {
              // BUG-509: Log batch context for debugging
              logger.warn({
                msg: "Insufficient inventory",
                batchId: batch.id,
                sku: batch.sku,
                productId: batch.productId,
                availableQty,
                requestedQty,
                onHand,
                reserved,
                quarantine,
                hold,
                orderId: input.orderId,
              });
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient inventory for batch ${batch.sku || batch.id}. Available: ${availableQty}, Requested: ${requestedQty}`,
              });
            }
          }
        }

        // BUG-316: Use database arithmetic for inventory updates to avoid JS precision issues
        // BUG-501: Decrement sampleQty for sample orders, reservedQty for regular orders
        // BUG-403: Use parsed value consistently for both validation and update
        for (const item of lineItems) {
          const parsedQty = parseMoneyOrZero(item.quantity);
          if (item.isSample) {
            // For sample orders, decrement sampleQty directly
            await tx.execute(sql`
              UPDATE batches
              SET sampleQty = CAST(sampleQty AS DECIMAL(15,4)) - ${parsedQty}
              WHERE id = ${item.batchId}
            `);
          } else {
            // For regular orders, increment reservedQty
            await tx.execute(sql`
              UPDATE batches
              SET reservedQty = CAST(reservedQty AS DECIMAL(15,4)) + ${parsedQty}
              WHERE id = ${item.batchId}
            `);
          }
        }

        // BUG-303: Confirm the order (within transaction - will rollback if this fails)
        await tx
          .update(orders)
          .set({
            isDraft: false,
            confirmedAt: new Date(),
          })
          .where(eq(orders.id, input.orderId));

        logger.info({
          orderId: input.orderId,
          confirmedBy: userId,
          lineItemCount: lineItems.length,
          msg: "Order confirmed via simple confirm endpoint with inventory reservation",
        });

        return {
          success: true,
          orderId: input.orderId,
          orderNumber: order.orderNumber,
        };
      });
    }),

  /**
   * Confirm draft order (with payment terms)
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
              // ORD-002: Quantity and prices must be positive/non-negative
              quantity: z.number().positive("Quantity must be greater than 0"),
              unitPrice: z
                .number()
                .nonnegative("Unit price cannot be negative"),
              isSample: z.boolean(),
              overridePrice: z
                .number()
                .nonnegative("Override price cannot be negative")
                .optional(),
              overrideCogs: z
                .number()
                .nonnegative("Override COGS cannot be negative")
                .optional(),
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

          const originalCogs = parseMoneyOrZero(batch.unitCogs);
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
      // paymentTerms is NOT NULL in the orders table; ensure draft paths always persist a valid value.
      const resolvedPaymentTerms = input.paymentTerms || "NET_30";

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
        paymentTerms: resolvedPaymentTerms,
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

          const originalCogs = parseMoneyOrZero(batch.unitCogs);
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
   * INV-003: Wrapped in retryable transaction with FOR UPDATE locks to prevent race conditions
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
      const userId = getAuthenticatedUserId(ctx);

      // INV-003: Wrap entire finalization in a retryable transaction
      return await withRetryableTransaction(
        async tx => {
          // INV-003: Lock the order row first
          const [existingOrder] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, input.orderId))
            .for("update")
            .limit(1);

          if (!existingOrder) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Order not found",
            });
          }

          // ST-026: Check version for concurrent edit detection
          if (existingOrder.version !== input.version) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `Order was modified by another user. Please refresh and try again.`,
            });
          }

          if (!existingOrder.isDraft) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Order is already finalized",
            });
          }

          // INV-003: Lock line items to prevent modification during finalization
          const lineItems = await tx
            .select()
            .from(orderLineItems)
            .where(eq(orderLineItems.orderId, input.orderId))
            .for("update");

          if (lineItems.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot finalize order with no line items",
            });
          }

          // INV-003: Extract unique batch IDs and lock all batches
          const batchIds = [...new Set(lineItems.map(item => item.batchId))];
          const batchRecords = await tx
            .select()
            .from(batches)
            .where(safeInArray(batches.id, batchIds))
            .for("update");

          const batchMap = new Map(batchRecords.map(b => [b.id, b]));

          // INV-003: Verify inventory availability AFTER acquiring locks
          for (const item of lineItems) {
            const batch = batchMap.get(item.batchId);
            if (!batch) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Batch ${item.batchId} not found`,
              });
            }

            const requestedQty = parseMoneyOrZero(item.quantity);
            const onHand = parseMoneyOrZero(batch.onHandQty);
            const reserved = parseMoneyOrZero(batch.reservedQty);
            const quarantine = parseMoneyOrZero(batch.quarantineQty);
            const hold = parseMoneyOrZero(batch.holdQty);
            const sampleQty = parseMoneyOrZero(batch.sampleQty);

            const availableQty = item.isSample
              ? sampleQty
              : Math.max(0, onHand - reserved - quarantine - hold);

            if (availableQty < requestedQty) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient inventory for batch ${batch.sku || batch.id}. Available: ${availableQty}, Required: ${requestedQty}`,
              });
            }
          }

          // Final validation
          const validation = orderValidationService.validateOrder({
            orderType: existingOrder.orderType as "QUOTE" | "SALE",
            clientId: existingOrder.clientId,
            lineItems: lineItems.map(item => ({
              batchId: item.batchId,
              quantity: parseMoneyOrZero(item.quantity),
              cogsPerUnit: parseMoneyOrZero(item.cogsPerUnit),
              pricePerUnit: parseMoneyOrZero(item.unitPrice),
              marginPercent: parseMoneyOrZero(item.marginPercent),
              isSample: item.isSample,
            })),
            finalTotal: parseMoneyOrZero(existingOrder.total),
            overallMarginPercent: parseMoneyOrZero(
              existingOrder.avgMarginPercent
            ),
          });

          if (!validation.isValid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot finalize: ${validation.errors.join(", ")}`,
            });
          }

          // INV-003: Reserve inventory by incrementing reservedQty
          const { sql: sqlFn } = await import("drizzle-orm");
          for (const item of lineItems) {
            const qty = parseMoneyOrZero(item.quantity);
            if (item.isSample) {
              // Decrement sample quantity directly
              await tx.execute(sqlFn`
              UPDATE batches
              SET sampleQty = CAST(sampleQty AS DECIMAL(15,4)) - ${qty}
              WHERE id = ${item.batchId}
            `);
            } else {
              // Increment reserved quantity to prevent overselling
              await tx.execute(sqlFn`
              UPDATE batches
              SET reservedQty = CAST(reservedQty AS DECIMAL(15,4)) + ${qty}
              WHERE id = ${item.batchId}
            `);
            }
          }

          // ST-026: Update order to finalized with version increment
          await tx
            .update(orders)
            .set({
              isDraft: false,
              confirmedAt: new Date(),
              fulfillmentStatus: "PENDING",
              version: sqlFn`version + 1`,
            })
            .where(eq(orders.id, input.orderId));

          // Log audit entry (outside transaction is fine - non-critical)
          await orderAuditService.logOrderFinalization(input.orderId, userId, {
            finalTotal: parseMoneyOrZero(existingOrder.total),
            finalizedAt: new Date(),
          });

          logger.info({
            msg: "INV-003: Draft order finalized with inventory reservation",
            orderId: input.orderId,
            lineItemCount: lineItems.length,
          });

          return {
            orderId: input.orderId,
            orderNumber: existingOrder.orderNumber,
            validation,
          };
        },
        { maxRetries: 3 }
      );
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

      const oldCOGS = parseMoneyOrZero(lineItem.cogsPerUnit);

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
        // ORD-003: Added CANCELLED for order cancellation before shipping
        newStatus: z.enum(["PENDING", "PACKED", "SHIPPED", "CANCELLED"]),
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
   * ARCH-001: Uses OrderOrchestrator for transactional integrity
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

      // ARCH-001: Delegate to OrderOrchestrator for transactional integrity
      const { orderOrchestrator } =
        await import("../services/orderOrchestrator");

      const result = await orderOrchestrator.processReturn({
        orderId: input.orderId,
        items: input.items,
        reason: input.reason,
        notes: input.notes,
        actorId: userId,
      });

      return { success: true, returnId: result.returnId };
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
   * INV-003: Wrapped in transaction with FOR UPDATE locks to prevent race conditions
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
      // INV-003: Wrap entire confirm logic in a retryable transaction
      // This prevents race conditions when multiple users confirm orders simultaneously
      return await withRetryableTransaction(
        async tx => {
          // INV-003: Lock the order row first to prevent concurrent confirmations
          const [order] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, input.id))
            .for("update")
            .limit(1);

          if (!order) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Order not found",
            });
          }

          if (order.orderType !== "SALE") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Only SALE orders can be confirmed",
            });
          }

          if (
            order.saleStatus !== "PENDING" &&
            order.fulfillmentStatus !== "PENDING"
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Order cannot be confirmed. Current status: ${order.saleStatus || order.fulfillmentStatus}`,
            });
          }

          // Parse and verify inventory
          let orderItems: Array<{
            batchId: number;
            quantity: number;
            isSample?: boolean;
          }>;
          try {
            orderItems =
              typeof order.items === "string"
                ? JSON.parse(order.items)
                : order.items;
          } catch {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to parse order items - data may be corrupted",
            });
          }

          // INV-003: Extract unique batch IDs
          const batchIds = [...new Set(orderItems.map(item => item.batchId))];

          if (batchIds.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Order has no items to confirm",
            });
          }

          // INV-003: Lock all batch rows with FOR UPDATE to prevent concurrent modifications
          const batchRecords = await tx
            .select()
            .from(batches)
            .where(safeInArray(batches.id, batchIds))
            .for("update");

          const batchMap = new Map(batchRecords.map(b => [b.id, b]));

          // INV-003: Verify quantity is still available AFTER acquiring locks
          for (const item of orderItems) {
            const batch = batchMap.get(item.batchId);

            if (!batch) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: `Batch ${item.batchId} not found`,
              });
            }

            // Calculate available quantity accounting for all allocations
            const onHand = parseMoneyOrZero(batch.onHandQty);
            const reserved = parseMoneyOrZero(batch.reservedQty);
            const quarantine = parseMoneyOrZero(batch.quarantineQty);
            const hold = parseMoneyOrZero(batch.holdQty);
            const sampleQty = parseMoneyOrZero(batch.sampleQty);

            const availableQty = item.isSample
              ? sampleQty
              : Math.max(0, onHand - reserved - quarantine - hold);

            if (availableQty < item.quantity) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  `Insufficient inventory for batch ${batch.sku || batch.id}. ` +
                  `Available: ${availableQty}, Required: ${item.quantity}`,
              });
            }
          }

          // INV-003: Reserve inventory by incrementing reservedQty
          const { sql: sqlFn } = await import("drizzle-orm");
          for (const item of orderItems) {
            if (item.isSample) {
              // Decrement sample quantity directly
              await tx.execute(sqlFn`
              UPDATE batches
              SET sampleQty = CAST(sampleQty AS DECIMAL(15,4)) - ${item.quantity}
              WHERE id = ${item.batchId}
            `);
            } else {
              // Increment reserved quantity to prevent overselling
              await tx.execute(sqlFn`
              UPDATE batches
              SET reservedQty = CAST(reservedQty AS DECIMAL(15,4)) + ${item.quantity}
              WHERE id = ${item.batchId}
            `);
            }
          }

          // Update order to confirmed
          await tx
            .update(orders)
            .set({
              confirmedAt: new Date(),
              fulfillmentStatus: "PENDING",
              notes: input.notes
                ? `${order.notes || ""}\n[Confirmed]: ${input.notes}`.trim()
                : order.notes,
            })
            .where(eq(orders.id, input.id));

          logger.info({
            msg: "INV-003: Order confirmed with inventory reservation",
            orderId: input.id,
            itemCount: orderItems.length,
          });

          return { success: true, orderId: input.id };
        },
        { maxRetries: 3 }
      );
    }),

  /**
   * Fulfill order items with pick quantities
   * Records picked quantities and updates inventory
   * ARCH-001: Uses OrderOrchestrator for transactional integrity
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
      const userId = getAuthenticatedUserId(ctx);

      // ARCH-001: Delegate to OrderOrchestrator for transactional integrity
      const { orderOrchestrator } =
        await import("../services/orderOrchestrator");

      const result = await orderOrchestrator.fulfillOrder({
        orderId: input.id,
        items: input.items,
        actorId: userId,
      });

      return {
        success: true,
        orderId: result.id,
        status: result.status,
        allFullyPicked: result.status === "PACKED",
        pickedItems: input.items.length,
      };
    }),

  /**
   * Ship an order
   * Records shipping details and updates status to SHIPPED
   * INV-001: Releases reserved inventory and creates inventory movement records
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
      const userId = getAuthenticatedUserId(ctx);

      return await withTransaction(async tx => {
        // Get the order with FOR UPDATE lock
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, input.id))
          .for("update")
          .limit(1);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }

        // ARCH-003: Use state machine for transition validation
        const { validateTransition } =
          await import("../services/orderStateMachine");
        validateTransition(order.fulfillmentStatus, "SHIPPED", input.id);

        // INV-001: Get all line items for this order
        const lineItems = await tx
          .select({ id: orderLineItems.id })
          .from(orderLineItems)
          .where(eq(orderLineItems.orderId, input.id));

        // INV-001: Get all allocations for this order's line items
        const lineItemIds = lineItems.map((li: { id: number }) => li.id);
        let allocations: Array<{
          id: number;
          orderLineItemId: number;
          batchId: number;
          quantityAllocated: string;
        }> = [];

        if (lineItemIds.length > 0) {
          allocations = await tx
            .select({
              id: orderLineItemAllocations.id,
              orderLineItemId: orderLineItemAllocations.orderLineItemId,
              batchId: orderLineItemAllocations.batchId,
              quantityAllocated: orderLineItemAllocations.quantityAllocated,
            })
            .from(orderLineItemAllocations)
            .where(
              safeInArray(orderLineItemAllocations.orderLineItemId, lineItemIds)
            );
        }

        // INV-001: Release reserved quantities and create inventory movement records
        const inventoryMovementRecords: Array<{
          batchId: number;
          quantity: number;
          batchSku: string | null;
        }> = [];

        for (const allocation of allocations) {
          const allocatedQty = parseMoneyOrZero(allocation.quantityAllocated);
          if (allocatedQty <= 0) continue;

          // Lock the batch row for update
          const [batch] = await tx
            .select()
            .from(batches)
            .where(eq(batches.id, allocation.batchId))
            .for("update")
            .limit(1);

          if (!batch) {
            logger.warn({
              msg: "Batch not found during ship - skipping",
              batchId: allocation.batchId,
              orderId: input.id,
            });
            continue;
          }

          const currentReserved = parseMoneyOrZero(batch.reservedQty);
          const currentOnHand = parseMoneyOrZero(batch.onHandQty);

          // TER-259: Release reservation AND decrement onHandQty atomically on shipment.
          // reservedQty was incremented at confirmation (soft lock); now we release it
          // and record the actual physical deduction against onHandQty.
          const newReserved = Math.max(0, currentReserved - allocatedQty);
          const newOnHand = Math.max(0, currentOnHand - allocatedQty);

          await tx
            .update(batches)
            .set({
              reservedQty: newReserved.toString(),
              onHandQty: newOnHand.toString(),
            })
            .where(eq(batches.id, allocation.batchId));

          // INV-001: Create inventory movement record for the shipment
          await tx.insert(inventoryMovements).values({
            batchId: allocation.batchId,
            inventoryMovementType: "SALE",
            quantityChange: `-${allocatedQty}`,
            quantityBefore: currentOnHand.toString(),
            quantityAfter: newOnHand.toString(),
            referenceType: "ORDER_SHIPMENT",
            referenceId: input.id,
            notes: `Order shipped — reservation released, onHandQty decremented. Reserved: ${currentReserved} → ${newReserved}`,
            performedBy: userId,
          });

          inventoryMovementRecords.push({
            batchId: allocation.batchId,
            quantity: allocatedQty,
            batchSku: batch.sku,
          });
        }

        // Build shipping notes
        let shippingNotes = "";
        if (input.carrier) shippingNotes += `Carrier: ${input.carrier}\n`;
        if (input.trackingNumber)
          shippingNotes += `Tracking: ${input.trackingNumber}\n`;
        if (input.notes) shippingNotes += input.notes;

        // Update order status to SHIPPED
        await tx
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
        await tx.insert(orderStatusHistory).values({
          orderId: input.id,
          fulfillmentStatus: "SHIPPED",
          changedBy: userId,
          notes: shippingNotes
            ? `${shippingNotes}\nINV-001: Released ${allocations.length} batch reservations`
            : `INV-001: Released ${allocations.length} batch reservations`,
        });

        logger.info({
          msg: "INV-001: Order shipped with inventory release",
          orderId: input.id,
          allocationsReleased: allocations.length,
          inventoryMovements: inventoryMovementRecords.length,
        });

        return {
          success: true,
          orderId: input.id,
          status: "SHIPPED",
          trackingNumber: input.trackingNumber,
          carrier: input.carrier,
          inventoryReleased: inventoryMovementRecords,
        };
      });
    }),

  /**
   * Mark order as delivered
   * Final step in fulfillment workflow
   * ST-051: Wrapped in transaction for atomicity
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
      const userId = getAuthenticatedUserId(ctx);

      // ST-051: Wrap in transaction to ensure order update and status history are atomic
      return await withTransaction(async tx => {
        // Get the order with row lock
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, input.id))
          .for("update")
          .limit(1);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }

        // ARCH-003: Use state machine for transition validation
        const { validateTransition } =
          await import("../services/orderStateMachine");
        validateTransition(order.fulfillmentStatus, "DELIVERED", input.id);

        // Build delivery notes
        let deliveryNotes = `Delivered: ${input.deliveredAt || new Date().toISOString()}\n`;
        if (input.signature) deliveryNotes += `Signature: ${input.signature}\n`;
        if (input.notes) deliveryNotes += input.notes;

        // WSQA-003: Now using proper DELIVERED status
        await tx
          .update(orders)
          .set({
            fulfillmentStatus: "DELIVERED",
            notes: `${order.notes || ""}\n[Delivered]: ${deliveryNotes}`.trim(),
            updatedAt: new Date(),
          })
          .where(eq(orders.id, input.id));

        // Log to status history (within same transaction)
        await tx.insert(orderStatusHistory).values({
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
      });
    }),

  // WSQA-003: Mark order as returned
  // ST-051: Wrapped in transaction for atomicity
  markAsReturned: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        returnReason: z.string().min(1, "Return reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);

      // ST-051: Wrap in transaction to ensure order update and status history are atomic
      return await withTransaction(async tx => {
        // Get order with row lock
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, input.orderId))
          .for("update")
          .limit(1);

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }

        // ARCH-003: Use state machine for transition validation
        const { validateTransition } =
          await import("../services/orderStateMachine");
        try {
          validateTransition(
            order.fulfillmentStatus,
            "RETURNED",
            input.orderId
          );
        } catch (err) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err instanceof Error ? err.message : "Invalid transition",
          });
        }

        // Update order status
        await tx
          .update(orders)
          .set({
            fulfillmentStatus: "RETURNED",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, input.orderId));

        // Log status change (within same transaction)
        await tx.insert(orderStatusHistory).values({
          orderId: input.orderId,
          fulfillmentStatus: "RETURNED",
          changedBy: userId,
          notes: input.returnReason,
        });

        logger.info({
          msg: "ST-051: Order marked as returned within transaction",
          orderId: input.orderId,
          returnReason: input.returnReason,
          userId,
        });

        return { success: true };
      });
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

  getVendorReturnOptions: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [order] = await db
        .select({ id: orders.id, fulfillmentStatus: orders.fulfillmentStatus })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const lineItems = await db
        .select({ id: orderLineItems.id, batchId: orderLineItems.batchId })
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, input.orderId));

      const lineItemIds = lineItems.map(item => item.id);
      const allocationBatches =
        lineItemIds.length > 0
          ? await db
              .select({ batchId: orderLineItemAllocations.batchId })
              .from(orderLineItemAllocations)
              .where(
                safeInArray(
                  orderLineItemAllocations.orderLineItemId,
                  lineItemIds
                )
              )
          : [];

      const batchIds = new Set<number>();
      for (const item of lineItems) {
        if (item.batchId) batchIds.add(item.batchId);
      }
      for (const alloc of allocationBatches) {
        batchIds.add(alloc.batchId);
      }

      const batchIdList = Array.from(batchIds);
      if (batchIdList.length === 0) {
        return {
          orderStatus: order.fulfillmentStatus,
          items: [] as Array<{ id: number; label: string }>,
        };
      }

      const batchRows = await db
        .select({ lotId: batches.lotId })
        .from(batches)
        .where(safeInArray(batches.id, batchIdList));

      const lotIds = Array.from(new Set(batchRows.map(batch => batch.lotId)));
      if (lotIds.length === 0) {
        return {
          orderStatus: order.fulfillmentStatus,
          items: [] as Array<{ id: number; label: string }>,
        };
      }

      const lotRows = await db
        .select({
          vendorId: lots.vendorId,
          supplierClientId: lots.supplierClientId,
        })
        .from(lots)
        .where(safeInArray(lots.id, lotIds));

      const vendorIds = new Set<number>();
      for (const lot of lotRows) {
        if (lot.vendorId) vendorIds.add(lot.vendorId);
        if (lot.supplierClientId) vendorIds.add(lot.supplierClientId);
      }

      const vendorIdList = Array.from(vendorIds);
      if (vendorIdList.length === 0) {
        return {
          orderStatus: order.fulfillmentStatus,
          items: [] as Array<{ id: number; label: string }>,
        };
      }

      const vendorRows = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(safeInArray(clients.id, vendorIdList));

      return {
        orderStatus: order.fulfillmentStatus,
        items: vendorRows.map(vendor => ({
          id: vendor.id,
          label: vendor.name || `Vendor #${vendor.id}`,
        })),
      };
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
            const currentReserved = parseMoneyOrZero(batch.reservedQty);
            const allocatedQty = parseMoneyOrZero(existing.quantityAllocated);
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
        const lineItemQty = parseMoneyOrZero(lineItem.quantity);

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
          const onHand = parseMoneyOrZero(batch.onHandQty);
          const reserved = parseMoneyOrZero(batch.reservedQty);
          const quarantine = parseMoneyOrZero(batch.quarantineQty);
          const hold = parseMoneyOrZero(batch.holdQty);
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

          const unitCost = parseMoneyOrZero(batch.unitCogs);

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
        quantity: parseMoneyOrZero(alloc.quantityAllocated),
        unitCost: parseMoneyOrZero(alloc.unitCost),
        allocatedAt: alloc.allocatedAt,
      }));
    }),
});
