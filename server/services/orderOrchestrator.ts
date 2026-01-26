/**
 * ARCH-001: OrderOrchestrator Service
 *
 * Consolidated order business logic with transactional guarantees.
 * This service handles all order lifecycle operations atomically:
 * - Create orders (draft and confirmed)
 * - Confirm draft orders
 * - Ship orders
 * - Deliver orders
 * - Cancel orders
 * - Process returns
 *
 * Key features:
 * - All operations are atomic within single transactions
 * - Uses state machine for all status transitions
 * - Integrates with accounting service for GL entries
 * - Proper inventory management with row-level locking
 * - Actor attribution from authenticated context
 *
 * @module server/services/orderOrchestrator
 */

import { eq, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  orders,
  batches,
  clients,
  invoices,
  ledgerEntries,
  orderStatusHistory,
  sampleInventoryLog,
  inventoryMovements,
} from "../../drizzle/schema";
import { withTransaction, withRetryableTransaction } from "../dbTransaction";
import { logger } from "../_core/logger";
import { calculateCogs, calculateDueDate } from "../cogsCalculator";
import { calculateAvailableQty } from "../inventoryUtils";
import {
  canTransition,
  isTerminalStatus,
  type FulfillmentStatus,
} from "./orderStateMachine";
import { getFiscalPeriodIdOrDefault } from "../_core/fiscalPeriod";
import { getAccountIdByName, ACCOUNT_NAMES } from "../_core/accountLookup";
import * as payablesService from "./payablesService";

// ============================================================================
// TYPES
// ============================================================================

export type PaymentTerms =
  | "NET_7"
  | "NET_15"
  | "NET_30"
  | "COD"
  | "PARTIAL"
  | "CONSIGNMENT";
export type OrderType = "QUOTE" | "SALE";
export type SaleStatus =
  | "PENDING"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export interface OrderItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  unitCogs: number;
  cogsMode: "FIXED" | "RANGE";
  cogsSource: "FIXED" | "MIDPOINT" | "CLIENT_ADJUSTMENT" | "RULE" | "MANUAL";
  appliedRule?: string;
  unitMargin: number;
  marginPercent: number;
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;
  overridePrice?: number;
  overrideCogs?: number;
}

export interface CreateSaleOrderInput {
  clientId: number;
  items: Array<{
    batchId: number;
    displayName?: string;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
    overridePrice?: number;
    overrideCogs?: number;
  }>;
  paymentTerms: PaymentTerms;
  cashPayment?: number;
  notes?: string;
  /** User ID from authenticated context (ctx.user.id) */
  actorId: number;
}

export interface CreateDraftOrderInput {
  orderType: OrderType;
  clientId: number;
  items: Array<{
    batchId: number;
    displayName?: string;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
    overridePrice?: number;
    overrideCogs?: number;
  }>;
  validUntil?: string;
  notes?: string;
  /** User ID from authenticated context (ctx.user.id) */
  actorId: number;
}

export interface ConfirmOrderInput {
  orderId: number;
  paymentTerms: PaymentTerms;
  cashPayment?: number;
  notes?: string;
  /** User ID from authenticated context (ctx.user.id) */
  actorId: number;
}

export interface ShipOrderInput {
  orderId: number;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  /** User ID from authenticated context (ctx.user.id) */
  actorId: number;
}

export interface DeliverOrderInput {
  orderId: number;
  signature?: string;
  notes?: string;
  deliveredAt?: string;
  /** User ID from authenticated context (ctx.user.id) */
  actorId: number;
}

export interface CancelOrderInput {
  orderId: number;
  reason: string;
  /** User ID from authenticated context (ctx.user.id) */
  actorId: number;
}

export interface ProcessReturnInput {
  orderId: number;
  items: Array<{ batchId: number; quantity: number }>;
  reason:
    | "DEFECTIVE"
    | "WRONG_ITEM"
    | "NOT_AS_DESCRIBED"
    | "CUSTOMER_CHANGED_MIND"
    | "OTHER";
  notes?: string;
  /** User ID from authenticated context (ctx.user.id) */
  actorId: number;
}

interface OrderResult {
  id: number;
  orderNumber: string;
  status: string;
  invoiceId?: number;
}

// ============================================================================
// ORDER ORCHESTRATOR CLASS
// ============================================================================

/**
 * OrderOrchestrator handles all order lifecycle operations atomically.
 * All methods use database transactions to ensure consistency.
 */
export class OrderOrchestrator {
  /**
   * Create a confirmed sale order with all accounting entries.
   * This is an atomic operation that:
   * 1. Creates the order record
   * 2. Allocates inventory (with locks)
   * 3. Creates invoice
   * 4. Creates GL entries (AR debit, Revenue credit)
   * 5. Records cash payment if applicable
   */
  async createSaleOrder(input: CreateSaleOrderInput): Promise<OrderResult> {
    // Extract actorId from validated input (passed from authenticated context)
    const actorId = input.actorId;
    logger.info(
      { clientId: input.clientId, itemCount: input.items.length },
      "Creating sale order"
    );

    return await withRetryableTransaction(async tx => {
      // 1. Get client for COGS calculation
      const [client] = await tx
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new Error(`Client ${input.clientId} not found`);
      }

      // 2. Process items with inventory locking
      const processedItems = await this.processOrderItems(
        tx,
        input.items,
        client,
        input.paymentTerms
      );

      // 3. Calculate totals
      const { subtotal, totalCogs, totalMargin, avgMarginPercent } =
        this.calculateTotals(processedItems);

      // 4. Generate order number and calculate due date
      const orderNumber = `S-${Date.now()}`;
      const dueDate = calculateDueDate(input.paymentTerms);

      // 5. Determine initial sale status
      const cashPayment = input.cashPayment || 0;
      const saleStatus: SaleStatus =
        cashPayment >= subtotal
          ? "PAID"
          : cashPayment > 0
            ? "PARTIAL"
            : "PENDING";

      // 6. Create order record
      const [orderResult] = await tx.insert(orders).values({
        orderNumber,
        orderType: "SALE",
        isDraft: false,
        clientId: input.clientId,
        items: JSON.stringify(processedItems),
        subtotal: subtotal.toString(),
        tax: "0",
        discount: "0",
        total: subtotal.toString(),
        totalCogs: totalCogs.toString(),
        totalMargin: totalMargin.toString(),
        avgMarginPercent: avgMarginPercent.toString(),
        paymentTerms: input.paymentTerms,
        cashPayment: cashPayment.toString(),
        dueDate,
        saleStatus,
        fulfillmentStatus: "PENDING",
        notes: input.notes,
        createdBy: actorId,
        confirmedAt: new Date(),
      });

      const orderId = Number(orderResult.insertId);

      // 7. Decrement inventory
      await this.decrementInventory(tx, processedItems, orderId, actorId);

      // 8. Create invoice and GL entries
      const invoiceId = await this.createInvoiceWithGL(
        tx,
        orderId,
        orderNumber,
        input.clientId,
        processedItems,
        subtotal,
        dueDate,
        actorId
      );

      // 9. Record cash payment if applicable
      if (cashPayment > 0 && invoiceId) {
        await this.recordCashPaymentWithGL(tx, invoiceId, cashPayment, actorId);
      }

      // 10. Update payables tracking
      await this.updatePayablesTracking(processedItems);

      // 11. Log status history
      await tx.insert(orderStatusHistory).values({
        orderId,
        fulfillmentStatus: "PENDING",
        changedBy: actorId,
        notes: "Order created",
      });

      logger.info(
        { orderId, orderNumber, invoiceId, total: subtotal },
        "Sale order created successfully"
      );

      return {
        id: orderId,
        orderNumber,
        status: "PENDING",
        invoiceId,
      };
    });
  }

  /**
   * Create a draft order (quote or sale).
   * Draft orders do not decrement inventory or create accounting entries.
   */
  async createDraftOrder(input: CreateDraftOrderInput): Promise<OrderResult> {
    // Extract actorId from validated input (passed from authenticated context)
    const actorId = input.actorId;
    logger.info(
      { clientId: input.clientId, orderType: input.orderType },
      "Creating draft order"
    );

    return await withTransaction(async tx => {
      // 1. Get client for COGS calculation
      const [client] = await tx
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new Error(`Client ${input.clientId} not found`);
      }

      // 2. Process items (no inventory decrement for drafts)
      const processedItems = await this.processOrderItems(
        tx,
        input.items,
        client,
        undefined,
        false
      );

      // 3. Calculate totals
      const { subtotal, totalCogs, totalMargin, avgMarginPercent } =
        this.calculateTotals(processedItems);

      // 4. Generate order number
      const orderNumber = `D-${Date.now()}`;

      // 5. Create order record
      const [orderResult] = await tx.insert(orders).values({
        orderNumber,
        orderType: input.orderType,
        isDraft: true,
        clientId: input.clientId,
        items: JSON.stringify(processedItems),
        subtotal: subtotal.toString(),
        tax: "0",
        discount: "0",
        total: subtotal.toString(),
        totalCogs: totalCogs.toString(),
        totalMargin: totalMargin.toString(),
        avgMarginPercent: avgMarginPercent.toString(),
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        quoteStatus: input.orderType === "QUOTE" ? "DRAFT" : undefined,
        notes: input.notes,
        createdBy: actorId,
      });

      const orderId = Number(orderResult.insertId);

      logger.info({ orderId, orderNumber }, "Draft order created");

      return {
        id: orderId,
        orderNumber,
        status: "DRAFT",
      };
    });
  }

  /**
   * Confirm a draft order, converting it to a sale.
   * This operation:
   * 1. Validates inventory availability
   * 2. Decrements inventory
   * 3. Creates invoice and GL entries
   * 4. Updates order status
   */
  async confirmOrder(input: ConfirmOrderInput): Promise<OrderResult> {
    // Extract actorId from validated input (passed from authenticated context)
    const actorId = input.actorId;
    logger.info({ orderId: input.orderId }, "Confirming order");

    return await withRetryableTransaction(async tx => {
      // 1. Get and lock the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update")
        .limit(1);

      if (!order) {
        throw new Error(`Order ${input.orderId} not found`);
      }

      if (!order.isDraft) {
        throw new Error(`Order ${input.orderId} is already confirmed`);
      }

      // 2. Parse order items
      const orderItems = this.parseOrderItems(order.items);

      // 3. Verify inventory availability and lock batches
      await this.verifyAndLockInventory(tx, orderItems);

      // 4. Calculate due date and payment status
      const dueDate = calculateDueDate(input.paymentTerms);
      const cashPayment = input.cashPayment || 0;
      const total = parseFloat(order.total || "0");
      const saleStatus: SaleStatus =
        cashPayment >= total ? "PAID" : cashPayment > 0 ? "PARTIAL" : "PENDING";

      // 5. Update order to confirmed
      await tx
        .update(orders)
        .set({
          isDraft: false,
          orderType: "SALE",
          paymentTerms: input.paymentTerms,
          cashPayment: cashPayment.toString(),
          dueDate,
          saleStatus,
          fulfillmentStatus: "PENDING",
          notes: input.notes || order.notes,
          confirmedAt: new Date(),
          version: sql`version + 1`,
        })
        .where(eq(orders.id, input.orderId));

      // 6. Decrement inventory
      await this.decrementInventory(tx, orderItems, input.orderId, actorId);

      // 7. Create invoice and GL entries
      const invoiceId = await this.createInvoiceWithGL(
        tx,
        input.orderId,
        order.orderNumber || `S-${Date.now()}`,
        order.clientId,
        orderItems,
        total,
        dueDate,
        actorId
      );

      // 8. Record cash payment if applicable
      if (cashPayment > 0 && invoiceId) {
        await this.recordCashPaymentWithGL(tx, invoiceId, cashPayment, actorId);
      }

      // 9. Update payables tracking
      await this.updatePayablesTracking(orderItems);

      // 10. Log status history
      await tx.insert(orderStatusHistory).values({
        orderId: input.orderId,
        fulfillmentStatus: "PENDING",
        changedBy: actorId,
        notes: "Order confirmed",
      });

      logger.info(
        { orderId: input.orderId, invoiceId, saleStatus },
        "Order confirmed successfully"
      );

      return {
        id: input.orderId,
        orderNumber: order.orderNumber || "",
        status: "PENDING",
        invoiceId,
      };
    });
  }

  /**
   * Ship an order.
   * Uses state machine to validate transition.
   */
  async shipOrder(input: ShipOrderInput): Promise<OrderResult> {
    // Extract actorId from validated input (passed from authenticated context)
    const actorId = input.actorId;
    logger.info({ orderId: input.orderId }, "Shipping order");

    return await withTransaction(async tx => {
      // 1. Get and lock the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update")
        .limit(1);

      if (!order) {
        throw new Error(`Order ${input.orderId} not found`);
      }

      // 2. Validate state transition
      const currentStatus = (order.fulfillmentStatus ||
        "PENDING") as FulfillmentStatus;
      if (!canTransition(currentStatus, "SHIPPED")) {
        throw new Error(
          `Cannot ship order from ${currentStatus} status. ` +
            `Valid transitions: PENDING → PACKED → SHIPPED`
        );
      }

      // 3. Build shipping notes
      let shippingNotes = "";
      if (input.carrier) shippingNotes += `Carrier: ${input.carrier}\n`;
      if (input.trackingNumber)
        shippingNotes += `Tracking: ${input.trackingNumber}\n`;
      if (input.notes) shippingNotes += input.notes;

      // 4. Update order status
      await tx
        .update(orders)
        .set({
          fulfillmentStatus: "SHIPPED",
          shippedAt: new Date(),
          shippedBy: actorId,
          notes: shippingNotes
            ? `${order.notes || ""}\n[Shipped]: ${shippingNotes}`.trim()
            : order.notes,
          version: sql`version + 1`,
        })
        .where(eq(orders.id, input.orderId));

      // 5. Log status history
      await tx.insert(orderStatusHistory).values({
        orderId: input.orderId,
        fulfillmentStatus: "SHIPPED",
        changedBy: actorId,
        notes: shippingNotes || undefined,
      });

      logger.info(
        { orderId: input.orderId, carrier: input.carrier },
        "Order shipped"
      );

      return {
        id: input.orderId,
        orderNumber: order.orderNumber || "",
        status: "SHIPPED",
      };
    });
  }

  /**
   * Mark an order as delivered.
   * Uses state machine to validate transition.
   */
  async deliverOrder(input: DeliverOrderInput): Promise<OrderResult> {
    // Extract actorId from validated input (passed from authenticated context)
    const actorId = input.actorId;
    logger.info({ orderId: input.orderId }, "Delivering order");

    return await withTransaction(async tx => {
      // 1. Get and lock the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update")
        .limit(1);

      if (!order) {
        throw new Error(`Order ${input.orderId} not found`);
      }

      // 2. Validate state transition
      const currentStatus = (order.fulfillmentStatus ||
        "PENDING") as FulfillmentStatus;
      if (!canTransition(currentStatus, "DELIVERED")) {
        throw new Error(
          `Cannot mark order as delivered from ${currentStatus} status. ` +
            `Order must be SHIPPED first.`
        );
      }

      // 3. Build delivery notes
      const deliveredAt = input.deliveredAt || new Date().toISOString();
      let deliveryNotes = `Delivered: ${deliveredAt}\n`;
      if (input.signature) deliveryNotes += `Signature: ${input.signature}\n`;
      if (input.notes) deliveryNotes += input.notes;

      // 4. Update order status
      await tx
        .update(orders)
        .set({
          fulfillmentStatus: "DELIVERED",
          notes: `${order.notes || ""}\n[Delivered]: ${deliveryNotes}`.trim(),
          version: sql`version + 1`,
        })
        .where(eq(orders.id, input.orderId));

      // 5. Log status history
      await tx.insert(orderStatusHistory).values({
        orderId: input.orderId,
        fulfillmentStatus: "DELIVERED",
        changedBy: actorId,
        notes: deliveryNotes,
      });

      logger.info({ orderId: input.orderId, deliveredAt }, "Order delivered");

      return {
        id: input.orderId,
        orderNumber: order.orderNumber || "",
        status: "DELIVERED",
      };
    });
  }

  /**
   * Cancel an order.
   * This operation:
   * 1. Validates the order can be cancelled
   * 2. Restores inventory if order was confirmed
   * 3. Reverses GL entries if invoice exists
   * 4. Updates order status
   */
  async cancelOrder(input: CancelOrderInput): Promise<OrderResult> {
    // Extract actorId from validated input (passed from authenticated context)
    const actorId = input.actorId;
    logger.info(
      { orderId: input.orderId, reason: input.reason },
      "Cancelling order"
    );

    return await withRetryableTransaction(async tx => {
      // 1. Get and lock the order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update")
        .limit(1);

      if (!order) {
        throw new Error(`Order ${input.orderId} not found`);
      }

      // 2. Check if order can be cancelled
      const currentStatus = (order.fulfillmentStatus ||
        order.saleStatus ||
        "PENDING") as FulfillmentStatus;
      if (isTerminalStatus(currentStatus)) {
        throw new Error(
          `Cannot cancel order in ${currentStatus} status - it is a terminal state`
        );
      }

      // 3. Parse order items
      const orderItems = this.parseOrderItems(order.items);

      // 4. Restore inventory if order was confirmed
      if (!order.isDraft && orderItems.length > 0) {
        await this.restoreInventory(tx, orderItems, input.orderId);
      }

      // 5. Reverse GL entries if invoice exists
      if (order.invoiceId) {
        await this.reverseGLEntries(
          tx,
          order.invoiceId,
          input.orderId,
          input.reason,
          actorId
        );
      }

      // 6. Update order status
      await tx
        .update(orders)
        .set({
          saleStatus: "CANCELLED",
          fulfillmentStatus: "CANCELLED",
          notes: `${order.notes || ""}\n[Cancelled]: ${input.reason}`.trim(),
          version: sql`version + 1`,
        })
        .where(eq(orders.id, input.orderId));

      // 7. Log status history
      await tx.insert(orderStatusHistory).values({
        orderId: input.orderId,
        fulfillmentStatus: "CANCELLED",
        changedBy: actorId,
        notes: input.reason,
      });

      logger.info({ orderId: input.orderId }, "Order cancelled");

      return {
        id: input.orderId,
        orderNumber: order.orderNumber || "",
        status: "CANCELLED",
      };
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Process order items: validate batches, calculate COGS, and optionally verify inventory.
   */
  private async processOrderItems(
    tx: ReturnType<typeof getDb> extends Promise<infer T> ? T : never,
    items: CreateSaleOrderInput["items"],
    client: {
      id: number;
      cogsAdjustmentType?: "NONE" | "PERCENTAGE" | "FIXED_AMOUNT" | null;
      cogsAdjustmentValue?: string | null;
    },
    paymentTerms?: PaymentTerms,
    verifyInventory: boolean = true
  ): Promise<OrderItem[]> {
    const processedItems: OrderItem[] = [];

    for (const item of items) {
      // Get batch with row-level lock
      const [batch] = await (
        tx as NonNullable<Awaited<ReturnType<typeof getDb>>>
      )
        .select()
        .from(batches)
        .where(eq(batches.id, item.batchId))
        .for("update")
        .limit(1);

      if (!batch) {
        throw new Error(`Batch ${item.batchId} not found`);
      }

      // Verify inventory if required
      if (verifyInventory) {
        const availableQty = item.isSample
          ? parseFloat(batch.sampleQty || "0")
          : calculateAvailableQty(batch);

        if (availableQty < item.quantity) {
          const qtyType = item.isSample ? "sample" : "available";
          throw new Error(
            `Insufficient ${qtyType} inventory for batch ${batch.sku || batch.id}. ` +
              `Available: ${availableQty}, Requested: ${item.quantity}`
          );
        }
      }

      // Calculate COGS
      let cogsResult;
      if (item.overrideCogs !== undefined) {
        const finalPrice = item.overridePrice || item.unitPrice;
        const unitMargin = finalPrice - item.overrideCogs;
        const marginPercent =
          finalPrice > 0 ? (unitMargin / finalPrice) * 100 : 0;

        cogsResult = {
          unitCogs: item.overrideCogs,
          cogsSource: "MANUAL" as const,
          unitMargin,
          marginPercent,
        };
      } else {
        cogsResult = calculateCogs({
          batch: {
            id: batch.id,
            cogsMode: batch.cogsMode,
            unitCogs: batch.unitCogs,
            unitCogsMin: batch.unitCogsMin,
            unitCogsMax: batch.unitCogsMax,
          },
          client: {
            id: client.id,
            cogsAdjustmentType: client.cogsAdjustmentType || "NONE",
            cogsAdjustmentValue: client.cogsAdjustmentValue || "0",
          },
          context: {
            quantity: item.quantity,
            salePrice: item.overridePrice || item.unitPrice,
            paymentTerms,
          },
        });
      }

      const finalPrice = item.overridePrice || item.unitPrice;
      const lineTotal = item.quantity * finalPrice;
      const lineCogs = item.quantity * cogsResult.unitCogs;
      const lineMargin = lineTotal - lineCogs;

      processedItems.push({
        batchId: item.batchId,
        displayName: item.displayName || batch.sku,
        originalName: batch.sku,
        quantity: item.quantity,
        unitPrice: finalPrice,
        isSample: item.isSample,
        unitCogs: cogsResult.unitCogs,
        cogsMode: batch.cogsMode,
        cogsSource: cogsResult.cogsSource,
        appliedRule: cogsResult.appliedRule,
        unitMargin: cogsResult.unitMargin,
        marginPercent: cogsResult.marginPercent,
        lineTotal,
        lineCogs,
        lineMargin,
        overridePrice: item.overridePrice,
        overrideCogs: item.overrideCogs,
      });
    }

    return processedItems;
  }

  /**
   * Calculate order totals from processed items.
   */
  private calculateTotals(items: OrderItem[]): {
    subtotal: number;
    totalCogs: number;
    totalMargin: number;
    avgMarginPercent: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalCogs = items.reduce((sum, item) => sum + item.lineCogs, 0);
    const totalMargin = subtotal - totalCogs;
    const avgMarginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;

    return { subtotal, totalCogs, totalMargin, avgMarginPercent };
  }

  /**
   * Parse order items from JSON storage.
   */
  private parseOrderItems(items: unknown): OrderItem[] {
    if (!items) return [];
    if (typeof items === "string") {
      try {
        return JSON.parse(items);
      } catch {
        logger.error({ items }, "Failed to parse order items JSON");
        return [];
      }
    }
    return items as OrderItem[];
  }

  /**
   * Verify inventory availability and lock batches.
   */
  private async verifyAndLockInventory(
    tx: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    items: OrderItem[]
  ): Promise<void> {
    const batchIds = items.map(item => item.batchId);
    const lockedBatches = await tx
      .select()
      .from(batches)
      .where(inArray(batches.id, batchIds))
      .for("update");

    const batchMap = new Map(lockedBatches.map(b => [b.id, b]));

    for (const item of items) {
      const batch = batchMap.get(item.batchId);
      if (!batch) {
        throw new Error(`Batch ${item.batchId} not found`);
      }

      const availableQty = item.isSample
        ? parseFloat(batch.sampleQty || "0")
        : calculateAvailableQty(batch);

      if (availableQty < item.quantity) {
        throw new Error(
          `Insufficient inventory for ${item.displayName}. ` +
            `Available: ${availableQty}, Required: ${item.quantity}`
        );
      }
    }
  }

  /**
   * Decrement inventory for confirmed order items.
   */
  private async decrementInventory(
    tx: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    items: OrderItem[],
    orderId: number,
    performedBy: number
  ): Promise<void> {
    for (const item of items) {
      if (item.isSample) {
        // Decrement sample quantity
        await tx.execute(sql`
          UPDATE batches
          SET sampleQty = CAST(sampleQty AS DECIMAL(15,4)) - ${item.quantity}
          WHERE id = ${item.batchId}
        `);

        // Log sample consumption
        await tx.insert(sampleInventoryLog).values({
          batchId: item.batchId,
          orderId,
          quantity: item.quantity.toString(),
          action: "CONSUMED",
          createdBy: performedBy,
        });
      } else {
        // Get current batch quantity for audit trail
        const [currentBatch] = await (
          tx as NonNullable<Awaited<ReturnType<typeof getDb>>>
        )
          .select({ onHandQty: batches.onHandQty })
          .from(batches)
          .where(eq(batches.id, item.batchId))
          .limit(1);

        const quantityBefore = parseFloat(currentBatch?.onHandQty || "0");
        const quantityAfter = quantityBefore - item.quantity;

        // Decrement on-hand quantity
        await tx.execute(sql`
          UPDATE batches
          SET onHandQty = CAST(onHandQty AS DECIMAL(15,4)) - ${item.quantity}
          WHERE id = ${item.batchId}
        `);

        // Log inventory movement
        await (tx as NonNullable<Awaited<ReturnType<typeof getDb>>>)
          .insert(inventoryMovements)
          .values({
            batchId: item.batchId,
            inventoryMovementType: "SALE",
            quantityChange: (-item.quantity).toString(),
            quantityBefore: quantityBefore.toString(),
            quantityAfter: quantityAfter.toString(),
            referenceType: "ORDER",
            referenceId: orderId,
            notes: `Sale order #${orderId}`,
            performedBy,
          });
      }
    }
  }

  /**
   * Restore inventory for cancelled order items.
   */
  private async restoreInventory(
    tx: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    items: OrderItem[],
    orderId: number
  ): Promise<void> {
    for (const item of items) {
      if (item.isSample) {
        await tx.execute(sql`
          UPDATE batches
          SET sampleQty = CAST(sampleQty AS DECIMAL(15,4)) + ${item.quantity}
          WHERE id = ${item.batchId}
        `);
      } else {
        await tx.execute(sql`
          UPDATE batches
          SET onHandQty = CAST(onHandQty AS DECIMAL(15,4)) + ${item.quantity}
          WHERE id = ${item.batchId}
        `);
      }
    }

    logger.info(
      { orderId, itemCount: items.length },
      "Inventory restored for cancelled order"
    );
  }

  /**
   * Create invoice with GL entries (AR debit, Revenue credit).
   */
  private async createInvoiceWithGL(
    tx: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    orderId: number,
    orderNumber: string,
    clientId: number,
    items: OrderItem[],
    total: number,
    dueDate: Date | undefined,
    createdBy: number
  ): Promise<number> {
    // Get account IDs and fiscal period
    const arAccountId = await getAccountIdByName(
      ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
    );
    const revenueAccountId = await getAccountIdByName(
      ACCOUNT_NAMES.SALES_REVENUE
    );
    const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);

    const invoiceNumber = `INV-${orderNumber.replace(/^[A-Z]-/, "")}`;
    const invoiceDate = new Date();
    const dueDateValue =
      dueDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create invoice
    const [invoiceResult] = await tx.insert(invoices).values({
      invoiceNumber,
      customerId: clientId,
      invoiceDate,
      dueDate: dueDateValue,
      subtotal: total.toFixed(2),
      taxAmount: "0.00",
      discountAmount: "0.00",
      totalAmount: total.toFixed(2),
      amountPaid: "0.00",
      amountDue: total.toFixed(2),
      status: "SENT",
      referenceType: "ORDER",
      referenceId: orderId,
      createdBy,
    });

    const invoiceId = Number(invoiceResult.insertId);
    const entryNumber = `SALE-${invoiceNumber}`;

    // Create GL entries - AR debit
    await tx.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-DR`,
      entryDate: new Date(),
      accountId: arAccountId,
      debit: total.toFixed(2),
      credit: "0.00",
      description: `Sale - Invoice ${invoiceNumber}`,
      referenceType: "INVOICE",
      referenceId: invoiceId,
      fiscalPeriodId,
      isManual: false,
      createdBy,
    });

    // Create GL entries - Revenue credit
    await tx.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-CR`,
      entryDate: new Date(),
      accountId: revenueAccountId,
      debit: "0.00",
      credit: total.toFixed(2),
      description: `Sale - Invoice ${invoiceNumber}`,
      referenceType: "INVOICE",
      referenceId: invoiceId,
      fiscalPeriodId,
      isManual: false,
      createdBy,
    });

    return invoiceId;
  }

  /**
   * Record cash payment with GL entries (Cash debit, AR credit).
   */
  private async recordCashPaymentWithGL(
    tx: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    invoiceId: number,
    amount: number,
    createdBy: number
  ): Promise<void> {
    if (amount <= 0) return;

    // Get account IDs and fiscal period
    const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
    const arAccountId = await getAccountIdByName(
      ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
    );
    const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);

    // Get invoice to update
    const [invoice] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const currentPaid = parseFloat(invoice.amountPaid ?? "0");
    const newPaid = currentPaid + amount;
    const totalAmount = parseFloat(invoice.totalAmount ?? "0");
    const newDue = Math.max(0, totalAmount - newPaid);
    const newStatus = newDue <= 0.01 ? "PAID" : "PARTIAL";

    // Update invoice
    await tx
      .update(invoices)
      .set({
        amountPaid: newPaid.toFixed(2),
        amountDue: newDue.toFixed(2),
        status: newStatus,
      })
      .where(eq(invoices.id, invoiceId));

    // Create GL entries
    const entryNumber = `PMT-${Date.now()}`;

    // Cash debit
    await tx.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-DR`,
      entryDate: new Date(),
      accountId: cashAccountId,
      debit: amount.toFixed(2),
      credit: "0.00",
      description: `Payment received - Invoice #${invoiceId}`,
      referenceType: "PAYMENT",
      referenceId: invoiceId,
      fiscalPeriodId,
      isManual: false,
      createdBy,
    });

    // AR credit
    await tx.insert(ledgerEntries).values({
      entryNumber: `${entryNumber}-CR`,
      entryDate: new Date(),
      accountId: arAccountId,
      debit: "0.00",
      credit: amount.toFixed(2),
      description: `Payment received - Invoice #${invoiceId}`,
      referenceType: "PAYMENT",
      referenceId: invoiceId,
      fiscalPeriodId,
      isManual: false,
      createdBy,
    });
  }

  /**
   * Reverse GL entries for cancelled order.
   */
  private async reverseGLEntries(
    tx: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    invoiceId: number,
    orderId: number,
    reason: string,
    reversedBy: number
  ): Promise<void> {
    const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);
    const reversalNumber = `REV-${Date.now()}`;

    // Get original GL entries for this invoice
    const originalEntries = await tx
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.referenceId, invoiceId));

    // Create reversing entries (swap debit and credit)
    for (const entry of originalEntries) {
      await tx.insert(ledgerEntries).values({
        entryNumber: `${reversalNumber}-${entry.id}`,
        entryDate: new Date(),
        accountId: entry.accountId,
        debit: entry.credit, // Swap
        credit: entry.debit, // Swap
        description: `Reversal: ${reason} (Original: ${entry.entryNumber})`,
        referenceType: "REVERSAL",
        referenceId: orderId,
        fiscalPeriodId,
        isManual: false,
        createdBy: reversedBy,
      });
    }

    // Void the invoice
    await tx
      .update(invoices)
      .set({
        status: "VOID",
        notes: `Voided: ${reason} on ${new Date().toISOString()}`,
      })
      .where(eq(invoices.id, invoiceId));
  }

  /**
   * Update payables tracking when inventory is sold.
   */
  private async updatePayablesTracking(items: OrderItem[]): Promise<void> {
    for (const item of items) {
      if (!item.isSample) {
        try {
          await payablesService.updatePayableOnSale(
            item.batchId,
            item.quantity
          );
          await payablesService.checkInventoryZeroThreshold(item.batchId);
        } catch (error) {
          // Log but don't fail - payables can be reconciled later
          logger.warn(
            { batchId: item.batchId, error },
            "Payables update error (non-fatal)"
          );
        }
      }
    }
  }
}

// Export singleton instance for convenience
export const orderOrchestrator = new OrderOrchestrator();
