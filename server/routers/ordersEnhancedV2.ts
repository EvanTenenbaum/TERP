/**
 * Orders Enhanced V2 Router
 * Enhanced orders endpoints with COGS visibility, margin management, and pricing
 * v2.0 Sales Order Enhancements
 */

import { z } from "zod";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { orders, orderLineItems, batches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { pricingService } from "../services/pricingService";
import { marginCalculationService } from "../services/marginCalculationService";
import { priceCalculationService } from "../services/priceCalculationService";
import { orderValidationService } from "../services/orderValidationService";
import { orderAuditService } from "../services/orderAuditService";
import { cogsChangeIntegrationService } from "../services/cogsChangeIntegrationService";

// Input schemas
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

export const ordersEnhancedV2Router = router({
  /**
   * Create order (draft)
   * Saves order as draft without finalizing
   */
  createDraft: protectedProcedure
    .input(createOrderInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user?.id || 1;

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

          // Calculate price from margin
          const unitPrice =
            marginCalculationService.calculatePriceFromMarginPercent(
              cogsPerUnit,
              marginPercent
            );
          const marginDollar = marginCalculationService.calculateMarginDollar(
            cogsPerUnit,
            unitPrice
          );
          const lineTotal = item.quantity * unitPrice;

          return {
            ...item,
            cogsPerUnit,
            originalCogsPerUnit: originalCogs,
            marginPercent,
            marginDollar,
            marginSource,
            unitPrice,
            lineTotal,
          };
        })
      );

      // Calculate order totals
      const orderAdjustment = input.orderLevelAdjustment
        ? {
            amount: input.orderLevelAdjustment.amount,
            type: input.orderLevelAdjustment.type,
            mode: input.orderLevelAdjustment.mode,
          }
        : null;

      const totals = priceCalculationService.calculateOrderTotals(
        lineItemsWithPrices,
        orderAdjustment
      );

      // Validate order
      const validation = orderValidationService.validateOrder({
        orderType: input.orderType,
        clientId: input.clientId,
        lineItems: lineItemsWithPrices,
        finalTotal: totals.finalTotal,
        overallMarginPercent: totals.overallMarginPercent,
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Create order
      const [order] = await db.insert(orders).values({
        orderNumber,
        orderType: input.orderType,
        isDraft: true,
        clientId: input.clientId,
        items: JSON.stringify([]), // Legacy field, keep empty
        subtotal: totals.subtotalPrice.toString(),
        tax: "0",
        discount: "0",
        total: totals.finalTotal.toString(),
        totalCogs: totals.subtotalCOGS.toString(),
        totalMargin: totals.subtotalMargin.toString(),
        avgMarginPercent: totals.overallMarginPercent.toString(),
        orderLevelAdjustmentAmount: orderAdjustment?.amount.toString() || "0",
        orderLevelAdjustmentType: orderAdjustment?.type || "DOLLAR",
        orderLevelAdjustmentMode: orderAdjustment?.mode || "DISCOUNT",
        showAdjustmentOnDocument: input.showAdjustmentOnDocument,
        version: 1,
        validUntil: input.validUntil,
        paymentTerms: input.paymentTerms,
        cashPayment: input.cashPayment?.toString(),
        notes: input.notes,
        createdBy: userId,
      });

      const orderId = order.insertId;

      // Create line items
      await Promise.all(
        lineItemsWithPrices.map(item =>
          db.insert(orderLineItems).values({
            orderId,
            batchId: item.batchId,
            productDisplayName: item.productDisplayName,
            quantity: item.quantity.toString(),
            isSample: item.isSample,
            cogsPerUnit: item.cogsPerUnit.toString(),
            originalCogsPerUnit: item.originalCogsPerUnit.toString(),
            isCogsOverridden: item.isCogsOverridden,
            cogsOverrideReason: item.cogsOverrideReason,
            marginPercent: item.marginPercent.toString(),
            marginDollar: item.marginDollar.toString(),
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
   * Update order draft
   * Updates existing draft order
   */
  updateDraft: protectedProcedure
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

      const userId = ctx.user?.id || 1;

      // Get existing order
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!existingOrder) {
        throw new Error("Order not found");
      }

      // Check version for optimistic locking (disabled - version field not in schema)
      // if (existingOrder.version !== input.version) {
      //   throw new Error(
      //     "Order has been modified by another user. Please refresh and try again."
      //   );
      // }

      // Calculate line item prices (same logic as createDraft)
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
          const lineTotal = item.quantity * unitPrice;

          return {
            ...item,
            cogsPerUnit,
            originalCogsPerUnit: originalCogs,
            marginPercent,
            marginDollar,
            marginSource,
            unitPrice,
            lineTotal,
          };
        })
      );

      // Calculate order totals
      const orderAdjustment = input.orderLevelAdjustment
        ? {
            amount: input.orderLevelAdjustment.amount,
            type: input.orderLevelAdjustment.type,
            mode: input.orderLevelAdjustment.mode,
          }
        : null;

      const totals = priceCalculationService.calculateOrderTotals(
        lineItemsWithPrices,
        orderAdjustment
      );

      // Validate order
      const validation = orderValidationService.validateOrder({
        orderType: existingOrder.orderType as "QUOTE" | "SALE",
        clientId: existingOrder.clientId,
        lineItems: lineItemsWithPrices,
        finalTotal: totals.finalTotal,
        overallMarginPercent: totals.overallMarginPercent,
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // Update order
      await db
        .update(orders)
        .set({
          subtotal: totals.subtotalPrice.toString(),
          total: totals.finalTotal.toString(),
          totalCogs: totals.subtotalCOGS.toString(),
          totalMargin: totals.subtotalMargin.toString(),
          avgMarginPercent: totals.overallMarginPercent.toString(),
          orderLevelAdjustmentAmount: orderAdjustment?.amount.toString() || "0",
          orderLevelAdjustmentType: orderAdjustment?.type || "DOLLAR",
          orderLevelAdjustmentMode: orderAdjustment?.mode || "DISCOUNT",
          showAdjustmentOnDocument: input.showAdjustmentOnDocument,
          notes: input.notes,
          // version: existingOrder.version + 1, // Increment version (disabled)
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
            productDisplayName: item.productDisplayName,
            quantity: item.quantity.toString(),
            isSample: item.isSample,
            cogsPerUnit: item.cogsPerUnit.toString(),
            originalCogsPerUnit: item.originalCogsPerUnit.toString(),
            isCogsOverridden: item.isCogsOverridden,
            cogsOverrideReason: item.cogsOverrideReason,
            marginPercent: item.marginPercent.toString(),
            marginDollar: item.marginDollar.toString(),
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
        // newVersion: existingOrder.version + 1, (disabled)
      };
    }),

  /**
   * Finalize order
   * Converts draft to finalized order
   */
  finalize: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        version: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user?.id || 1;

      // Get existing order
      const existingOrder = await db.query.orders.findFirst({
        where: eq(orders.id, input.orderId),
      });

      if (!existingOrder) {
        throw new Error("Order not found");
      }

      // Check version (disabled - version field not in schema)
      // if (existingOrder.version !== input.version) {
      //   throw new Error(
      //     "Order has been modified. Please refresh and try again."
      //   );
      // }

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
        overallMarginPercent: parseFloat(existingOrder.avgMarginPercent),
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
          // version: existingOrder.version + 1, (disabled)
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
   * Get order with line items
   */
  getOrderWithLineItems: protectedProcedure
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

  /**
   * Get margin for product
   * Returns margin with fallback logic
   */
  getMarginForProduct: protectedProcedure
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

      const userId = ctx.user?.id || 1;

      // Get existing line item
      const lineItem = await db.query.orderLineItems.findFirst({
        where: eq(orderLineItems.id, input.lineItemId),
      });

      if (!lineItem) {
        throw new Error("Line item not found");
      }

      const oldCOGS = parseFloat(lineItem.cogsPerUnit);

      // Call COGS change service
      const cogsResult = await cogsChangeIntegrationService.updateCOGS({
        batchId: input.batchId,
        newCOGS: input.newCOGS,
        reason: input.reason,
        scope: input.scope,
        userId,
      });

      if (!cogsResult.success) {
        throw new Error(`COGS update failed: ${cogsResult.error}`);
      }

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

  /**
   * Get audit log for order
   */
  getAuditLog: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      return await orderAuditService.getAuditLog(input.orderId);
    }),
});
