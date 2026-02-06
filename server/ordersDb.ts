/**
 * Orders Data Access Layer
 * Handles all database operations for the unified Quote/Sales system
 */

import { eq, and, desc, sql, type SQL } from "drizzle-orm";
import { safeInArray } from "./lib/sqlSafety";
import { getDb } from "./db";
import {
  orders,
  batches,
  clients,
  sampleInventoryLog,
  orderLineItems,
  orderLineItemAllocations,
  type Order,
} from "../drizzle/schema";
import { calculateCogs, calculateDueDate } from "./cogsCalculator";
import {
  createInvoiceFromOrder,
  recordOrderCashPayment,
  updateClientCreditExposure,
  restoreInventoryFromOrderTx,
  reverseOrderAccountingEntriesTx,
} from "./services/orderAccountingService";
import { syncClientBalance } from "./services/clientBalanceService";
import { calculateAvailableQty } from "./inventoryUtils";
// MEET-005: Import payables service for tracking vendor payables when inventory is sold
import * as payablesService from "./services/payablesService";
// ST-053: Import DbTransaction type for proper typing
import type { DbTransaction } from "./_core/dbTransaction";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;

  // COGS
  unitCogs: number;
  cogsMode: "FIXED" | "RANGE";
  cogsSource: "FIXED" | "MIDPOINT" | "CLIENT_ADJUSTMENT" | "RULE" | "MANUAL";
  appliedRule?: string;

  // Profit
  unitMargin: number;
  marginPercent: number;

  // Totals
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;

  // Overrides
  overridePrice?: number;
  overrideCogs?: number;
}

export interface CreateOrderInput {
  orderType: "QUOTE" | "SALE";
  isDraft?: boolean; // NEW: Support draft orders
  clientId: number;
  items: {
    batchId: number;
    displayName?: string;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
    overridePrice?: number;
    overrideCogs?: number;
  }[];

  // Draft-specific
  validUntil?: string;

  // Confirmed order-specific
  paymentTerms?:
    | "NET_7"
    | "NET_15"
    | "NET_30"
    | "COD"
    | "PARTIAL"
    | "CONSIGNMENT";
  cashPayment?: number;

  notes?: string;
  createdBy: number;
}

export interface ConvertQuoteToSaleInput {
  quoteId: number;
  paymentTerms:
    | "NET_7"
    | "NET_15"
    | "NET_30"
    | "COD"
    | "PARTIAL"
    | "CONSIGNMENT";
  cashPayment?: number;
  notes?: string;
}

// ============================================================================
// CREATE ORDER
// ============================================================================

/**
 * Create a new order (quote or sale)
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Extract actor ID from input (already validated by router using ctx.user.id)
  const actorId = input.createdBy;

  // ORD-002: Validate positive quantities and non-negative prices
  for (const item of input.items) {
    if (item.quantity <= 0) {
      throw new Error(
        `Invalid quantity ${item.quantity} for batch ${item.batchId}. Quantity must be greater than 0.`
      );
    }
    if (item.unitPrice < 0) {
      throw new Error(
        `Invalid unit price ${item.unitPrice} for batch ${item.batchId}. Price cannot be negative.`
      );
    }
    // Non-sample items should have a positive price (samples can be free)
    if (!item.isSample && item.unitPrice === 0) {
      throw new Error(
        `Unit price cannot be zero for non-sample item (batch ${item.batchId}). Use isSample=true for free items.`
      );
    }
    if (item.overridePrice !== undefined && item.overridePrice < 0) {
      throw new Error(
        `Invalid override price ${item.overridePrice} for batch ${item.batchId}. Price cannot be negative.`
      );
    }
    if (item.overrideCogs !== undefined && item.overrideCogs < 0) {
      throw new Error(
        `Invalid override COGS ${item.overrideCogs} for batch ${item.batchId}. COGS cannot be negative.`
      );
    }
  }

  return await db.transaction(async tx => {
    // 1. Get client for COGS calculation
    const client = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .limit(1)
      .then(rows => rows[0]);

    if (!client) {
      throw new Error(`Client ${input.clientId} not found`);
    }

    // 2. Process each item and calculate COGS
    // IMPORTANT: Lock batches with FOR UPDATE to prevent race conditions
    const processedItems: OrderItem[] = [];

    for (const item of input.items) {
      // Get batch details with row-level lock to prevent concurrent modifications
      const batch = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, item.batchId))
        .limit(1)
        .for("update") // Row-level lock - prevents race conditions
        .then(rows => rows[0]);

      if (!batch) {
        throw new Error(`Batch ${item.batchId} not found`);
      }

      // Verify sufficient inventory BEFORE processing order
      // This check happens AFTER locking, ensuring accuracy
      // Uses calculateAvailableQty which accounts for reserved, quarantine, and hold quantities
      const requestedQty = item.quantity;
      const availableQty = item.isSample
        ? parseFloat(batch.sampleQty || "0")
        : calculateAvailableQty(batch);

      if (availableQty < requestedQty) {
        const qtyType = item.isSample ? "sample" : "available";
        throw new Error(
          `Insufficient ${qtyType} inventory for batch ${batch.sku || batch.id}. ` +
            `Available: ${availableQty}, Requested: ${requestedQty}`
        );
      }

      // Calculate COGS (unless overridden)
      let cogsResult;
      if (item.overrideCogs !== undefined) {
        // Manual override
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
        // Calculate using COGS calculator
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
            paymentTerms: input.paymentTerms,
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

    // 3. Calculate totals
    const subtotal = processedItems.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
    const totalCogs = processedItems.reduce(
      (sum, item) => sum + item.lineCogs,
      0
    );
    const totalMargin = subtotal - totalCogs;
    const avgMarginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;

    // 4. Determine if draft (support both old and new API)
    const isDraft =
      input.isDraft !== undefined ? input.isDraft : input.orderType === "QUOTE";

    // 5. Generate order number
    const orderNumber = isDraft ? `D-${Date.now()}` : `O-${Date.now()}`;

    // 6. Calculate due date for confirmed orders
    let dueDate: Date | undefined;
    if (!isDraft && input.paymentTerms) {
      dueDate = calculateDueDate(input.paymentTerms);
    }

    // 7. Create order record
    await tx.insert(orders).values({
      orderNumber,
      orderType: input.orderType,
      isDraft,
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
      paymentTerms: input.paymentTerms,
      cashPayment: input.cashPayment?.toString() || "0",
      dueDate: dueDate,
      saleStatus:
        !isDraft && input.orderType === "SALE" ? "PENDING" : undefined,
      fulfillmentStatus: !isDraft ? "PENDING" : undefined,
      notes: input.notes,
      createdBy: actorId,
    });

    // Get the created order by orderNumber
    const order = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1)
      .then(rows => rows[0]);

    // 8. If confirmed order (not draft), reduce inventory
    // Batches are already locked from step 2, so updates are safe
    if (!isDraft) {
      for (const item of processedItems) {
        // Re-fetch with lock to ensure we have latest quantity
        // (though we already locked earlier, this ensures consistency)
        const lockedBatch = await tx
          .select()
          .from(batches)
          .where(eq(batches.id, item.batchId))
          .limit(1)
          .for("update")
          .then(rows => rows[0]);

        if (!lockedBatch) {
          throw new Error(
            `Batch ${item.batchId} not found during inventory update`
          );
        }

        // Final inventory verification (defensive check)
        // Uses calculateAvailableQty to account for quarantine/hold/reserved quantities
        const currentQty = item.isSample
          ? parseFloat(lockedBatch.sampleQty || "0")
          : calculateAvailableQty(lockedBatch);

        if (currentQty < item.quantity) {
          const qtyType = item.isSample ? "sample" : "available";
          throw new Error(
            `Insufficient ${qtyType} inventory detected during update for batch ${lockedBatch.sku || lockedBatch.id}. ` +
              `Current: ${currentQty}, Requested: ${item.quantity}`
          );
        }

        if (item.isSample) {
          // Reduce sample_qty
          await tx
            .update(batches)
            .set({
              sampleQty: sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) - ${item.quantity}`,
            })
            .where(eq(batches.id, item.batchId));

          // Log sample consumption
          await tx.insert(sampleInventoryLog).values({
            batchId: item.batchId,
            orderId: order.id,
            quantity: item.quantity.toString(),
            action: "CONSUMED",
            createdBy: actorId,
          });
        } else {
          // Reduce onHandQty
          await tx
            .update(batches)
            .set({
              onHandQty: sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) - ${item.quantity}`,
            })
            .where(eq(batches.id, item.batchId));

          // ST-050: MEET-005 payables tracking - errors now propagate to rollback transaction
          // If payables update fails, the entire order creation is rolled back
          // This ensures financial consistency between orders and payables
          await payablesService.updatePayableOnSale(
            item.batchId,
            item.quantity
          );
          await payablesService.checkInventoryZeroThreshold(item.batchId);
        }
      }

      // ORD-001: Invoice creation moved to fulfillment (updateOrderStatus when SHIPPED)
      // Invoices are now created AFTER fulfillment is complete, not at order confirmation.
      // This ensures invoice amounts match actual fulfilled quantities.
      // Cash payments and credit exposure updates also happen at fulfillment time.
    }

    // 8. Return the created order
    if (!order) {
      throw new Error("Failed to create order");
    }

    return order;
  });
}

// ============================================================================
// READ ORDERS
// ============================================================================

/**
 * Get order by ID
 */
export async function getOrderById(id: number): Promise<Order | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)
    .then(rows => rows[0] || null);

  if (!order) return null;

  // Parse items JSON string to array
  // ST-050: Error propagation - JSON parsing errors now throw instead of silently returning empty array
  // This surfaces data corruption issues immediately rather than masking them
  let parsedItems: OrderItem[] = [];
  if (order.items) {
    try {
      parsedItems =
        typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    } catch (e) {
      console.error(`Failed to parse items for order ${order.id}:`, e);
      throw new Error(
        `Data corruption detected: Cannot parse items for order ${order.id}. ` +
          `This order requires data remediation. Original error: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return {
    ...order,
    items: parsedItems,
  } as Order;
}

/**
 * Get orders by client
 * @param clientId - The client ID to get orders for
 * @param orderType - Optional filter by order type ('QUOTE' or 'SALE')
 * @param limit - Maximum number of orders to return (default 100, max 500)
 */
export async function getOrdersByClient(
  clientId: number,
  orderType?: "QUOTE" | "SALE",
  limit: number = 100
): Promise<Order[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Ensure limit is within bounds to prevent unbounded queries (BUG-088 fix)
  const safeLimit = Math.min(Math.max(limit, 1), 500);

  const conditions: SQL<unknown>[] = [eq(orders.clientId, clientId)];

  if (orderType) {
    conditions.push(eq(orders.orderType, orderType));
  }

  const results = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(safeLimit);

  // Parse items JSON string to array for each order
  // ST-050: Error propagation - JSON parsing errors now throw instead of silently returning empty array
  return results.map(order => {
    let parsedItems: OrderItem[] = [];
    if (order.items) {
      try {
        parsedItems =
          typeof order.items === "string"
            ? JSON.parse(order.items)
            : order.items;
      } catch (e) {
        console.error(`Failed to parse items for order ${order.id}:`, e);
        throw new Error(
          `Data corruption detected: Cannot parse items for order ${order.id}. ` +
            `This order requires data remediation. Original error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
    return {
      ...order,
      items: parsedItems,
    };
  }) as Order[];
}

/**
 * Get all orders with optional filters
 */
export async function getAllOrders(filters?: {
  orderType?: "QUOTE" | "SALE";
  isDraft?: boolean;
  quoteStatus?: string;
  saleStatus?: string;
  fulfillmentStatus?: string;
  limit?: number;
  offset?: number;
}): Promise<Order[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    orderType,
    isDraft,
    quoteStatus,
    saleStatus,
    fulfillmentStatus,
    limit = 50,
    offset = 0,
  } = filters || {};

  const conditions: ReturnType<typeof eq>[] = [];

  if (orderType) {
    conditions.push(eq(orders.orderType, orderType));
  }

  if (isDraft !== undefined) {
    // FIX: MySQL stores boolean as TINYINT (0/1), so we need to handle both
    // When isDraft is false, match both false and 0
    // When isDraft is true, match both true and 1
    if (isDraft === false) {
      conditions.push(sql`${orders.isDraft} = 0`);
    } else {
      conditions.push(sql`${orders.isDraft} = 1`);
    }
  }

  if (quoteStatus) {
    // Type assertion needed because filter input is string but schema expects enum
    const validQuoteStatuses = [
      "DRAFT",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CONVERTED",
    ] as const;
    if (
      validQuoteStatuses.includes(
        quoteStatus as (typeof validQuoteStatuses)[number]
      )
    ) {
      conditions.push(
        eq(
          orders.quoteStatus,
          quoteStatus as (typeof validQuoteStatuses)[number]
        )
      );
    }
  }

  if (saleStatus) {
    const validSaleStatuses = [
      "PENDING",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "CANCELLED",
    ] as const;
    if (
      validSaleStatuses.includes(
        saleStatus as (typeof validSaleStatuses)[number]
      )
    ) {
      conditions.push(
        eq(orders.saleStatus, saleStatus as (typeof validSaleStatuses)[number])
      );
    }
  }

  if (fulfillmentStatus) {
    const validFulfillmentStatuses = ["PENDING", "PACKED", "SHIPPED"] as const;
    if (
      validFulfillmentStatuses.includes(
        fulfillmentStatus as (typeof validFulfillmentStatuses)[number]
      )
    ) {
      conditions.push(
        eq(
          orders.fulfillmentStatus,
          fulfillmentStatus as (typeof validFulfillmentStatuses)[number]
        )
      );
    }
  }

  // BUG-078: Explicitly select columns from both tables to avoid ambiguous column names
  // When using leftJoin, bare .select() causes MySQL column name conflicts (both tables have 'id', 'created_at', etc.)
  // This fix ensures result structure is { orders: {...}, clients: {...} }
  let results;

  if (conditions.length > 0) {
    results = await db
      .select({
        orders: orders,
        clients: clients,
      })
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    results = await db
      .select({
        orders: orders,
        clients: clients,
      })
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Transform results to include client data and parse JSON items
  // ST-050: Error propagation - JSON parsing errors now throw instead of silently returning empty array
  const transformed: Order[] = results.map(row => {
    // Parse items JSON string to array
    let parsedItems: OrderItem[] = [];
    if (row.orders.items) {
      try {
        parsedItems =
          typeof row.orders.items === "string"
            ? JSON.parse(row.orders.items)
            : row.orders.items;
      } catch (e) {
        console.error(`Failed to parse items for order ${row.orders.id}:`, e);
        throw new Error(
          `Data corruption detected: Cannot parse items for order ${row.orders.id}. ` +
            `This order requires data remediation. Original error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return {
      ...row.orders,
      items: parsedItems,
      client: row.clients,
    } as Order;
  });

  return transformed;
}

// ============================================================================
// UPDATE ORDER
// ============================================================================

/**
 * Update an existing order
 * ST-026: Added version parameter for optimistic locking
 */
export async function updateOrder(
  id: number,
  updates: Partial<CreateOrderInput>,
  expectedVersion?: number
): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ST-026: Check version if provided
  if (expectedVersion !== undefined) {
    const { checkVersion } = await import("./_core/optimisticLocking");
    await checkVersion(db, orders, "Order", id, expectedVersion);
  }

  // Get existing order
  const existingOrder = await getOrderById(id);
  if (!existingOrder) {
    throw new Error(`Order ${id} not found`);
  }

  // If it's a SALE, don't allow modifications (business rule)
  if (existingOrder.orderType === "SALE") {
    throw new Error(
      "Cannot modify a sale order. Create a new sale or cancel this one."
    );
  }

  // For quotes, allow updates
  const updateData: Record<string, unknown> = {};

  if (updates.notes !== undefined) {
    updateData.notes = updates.notes;
  }

  if (updates.validUntil !== undefined) {
    updateData.validUntil = updates.validUntil;
  }

  // ST-026: Increment version if version checking was used
  if (expectedVersion !== undefined) {
    updateData.version = sql`version + 1`;
  }

  // Note: Items updates require recalculating COGS, totals, etc.
  // This is handled by updateDraftOrder() for draft orders.
  // For non-draft orders, items cannot be modified (business rule).

  await db.update(orders).set(updateData).where(eq(orders.id, id));

  const updatedOrder = await getOrderById(id);
  if (!updatedOrder) {
    throw new Error(`Failed to retrieve updated order ${id}`);
  }

  return updatedOrder;
}

// ============================================================================
// DELETE ORDER
// ============================================================================

/**
 * Delete/cancel an order
 * ST-051: Wrapped in transaction for atomicity - all steps succeed or all fail
 * @param id - Order ID to delete/cancel
 * @param cancelledBy - Required: User ID performing the cancellation (for audit trail)
 */
export async function deleteOrder(
  id: number,
  cancelledBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const order = await getOrderById(id);
  if (!order) {
    throw new Error(`Order ${id} not found`);
  }

  // If it's a SALE, mark as cancelled instead of deleting
  if (order.orderType === "SALE") {
    // SM-002: Validate sale status allows cancellation
    const currentSaleStatus = order.saleStatus || "PENDING";
    if (!isValidStatusTransition("sale", currentSaleStatus, "CANCELLED")) {
      throw new Error(
        `Cannot cancel order: invalid transition from ${currentSaleStatus} to CANCELLED. ` +
          `Orders with status ${currentSaleStatus} cannot be cancelled.`
      );
    }

    // ST-051: Wrap all cancellation steps in a transaction for atomicity
    // If any step fails, the entire cancellation is rolled back
    await db.transaction(async tx => {
      // Step 1: Update order status to CANCELLED
      await tx
        .update(orders)
        .set({ saleStatus: "CANCELLED" })
        .where(eq(orders.id, id));

      // Step 2: Restore inventory (critical - must succeed)
      const orderItems =
        typeof order.items === "string" ? JSON.parse(order.items) : order.items;

      if (Array.isArray(orderItems) && orderItems.length > 0) {
        await restoreInventoryFromOrderTx(tx, {
          items: orderItems,
          orderId: id,
        });
      }

      // Step 3: INV-004: Release any reserved quantities from allocations
      const lineItems = await tx
        .select({ id: orderLineItems.id })
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, id));

      if (lineItems.length > 0) {
        const lineItemIds = lineItems.map((li: { id: number }) => li.id);

        // Get all allocations for the order's line items
        const allocations = await tx
          .select({
            batchId: orderLineItemAllocations.batchId,
            quantityAllocated: orderLineItemAllocations.quantityAllocated,
          })
          .from(orderLineItemAllocations)
          .where(
            safeInArray(orderLineItemAllocations.orderLineItemId, lineItemIds)
          );

        // Release reserved quantities for each allocation
        for (const allocation of allocations) {
          const allocatedQty = parseFloat(allocation.quantityAllocated || "0");
          if (allocatedQty > 0) {
            // Lock batch row and release reservation
            const [batch] = await tx
              .select({ reservedQty: batches.reservedQty })
              .from(batches)
              .where(eq(batches.id, allocation.batchId))
              .for("update")
              .limit(1);

            if (batch) {
              const currentReserved = parseFloat(batch.reservedQty || "0");
              const newReserved = Math.max(0, currentReserved - allocatedQty);

              await tx
                .update(batches)
                .set({ reservedQty: newReserved.toString() })
                .where(eq(batches.id, allocation.batchId));
            }
          }
        }

        console.info(
          `[ST-051] Released ${allocations.length} batch reservations for cancelled order ${id}`
        );
      }

      // Step 4: Reverse accounting entries if invoice exists
      // Note: This is critical for financial integrity - must succeed or rollback
      if (order.invoiceId) {
        await reverseOrderAccountingEntriesTx(tx, {
          invoiceId: order.invoiceId,
          orderId: id,
          reason: "Order cancelled",
          reversedBy: cancelledBy,
        });
      }
    });
  } else {
    // For quotes, use soft delete (per CLAUDE.md - never hard delete)
    await db
      .update(orders)
      .set({
        deletedAt: new Date(),
        quoteStatus: "REJECTED",
      })
      .where(eq(orders.id, id));
  }
}

// ============================================================================
// CONVERT QUOTE TO SALE
// ============================================================================

/**
 * Convert a quote to a sale
 */
export async function convertQuoteToSale(
  input: ConvertQuoteToSaleInput
): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async tx => {
    // 1. Get the quote
    const quote = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.quoteId))
      .limit(1)
      .then(rows => rows[0]);

    if (!quote) {
      throw new Error(`Quote ${input.quoteId} not found`);
    }

    if (quote.orderType !== "QUOTE") {
      throw new Error(`Order ${input.quoteId} is not a quote`);
    }

    // SM-001: Validate quote status allows conversion
    const currentStatus = quote.quoteStatus || "DRAFT";
    if (!isValidStatusTransition("quote", currentStatus, "CONVERTED")) {
      throw new Error(
        `Cannot convert quote: invalid transition from ${currentStatus} to CONVERTED. ` +
          `Only ACCEPTED quotes can be converted. Current status: ${currentStatus}`
      );
    }

    // Check if quote has expired
    if (quote.validUntil) {
      const expirationDate = new Date(quote.validUntil);
      const now = new Date();
      if (expirationDate < now) {
        throw new Error(
          `Quote has expired on ${expirationDate.toLocaleDateString()}. ` +
            `Please request a new quote with current pricing.`
        );
      }
    }

    // 2. Parse quote items
    const quoteItems = JSON.parse(quote.items as string) as OrderItem[];

    // 3. Calculate due date
    const dueDate = calculateDueDate(input.paymentTerms);

    // 4. Generate sale number
    const saleNumber = `S-${Date.now()}`;

    // 5. Create sale order
    await tx.insert(orders).values({
      orderNumber: saleNumber,
      orderType: "SALE",
      clientId: quote.clientId,
      items: quote.items,
      subtotal: quote.subtotal,
      tax: quote.tax,
      discount: quote.discount,
      total: quote.total,
      totalCogs: quote.totalCogs,
      totalMargin: quote.totalMargin,
      avgMarginPercent: quote.avgMarginPercent,
      paymentTerms: input.paymentTerms,
      cashPayment: input.cashPayment?.toString() || "0",
      dueDate: dueDate,
      saleStatus: "PENDING",
      notes: input.notes || quote.notes,
      createdBy: quote.createdBy,
      convertedFromOrderId: quote.id,
    });

    // Get the created sale by orderNumber
    const sale = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, saleNumber))
      .limit(1)
      .then(rows => rows[0]);

    // 6. Reduce inventory with row-level locking to prevent race conditions
    for (const item of quoteItems) {
      // Lock batch row to prevent concurrent modifications
      const batch = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, item.batchId))
        .limit(1)
        .for("update") // Row-level lock
        .then(rows => rows[0]);

      if (!batch) {
        throw new Error(`Batch ${item.batchId} not found`);
      }

      // Verify sufficient inventory
      // Uses calculateAvailableQty to account for quarantine/hold/reserved quantities
      const requestedQty = item.quantity;
      const availableQty = item.isSample
        ? parseFloat(batch.sampleQty || "0")
        : calculateAvailableQty(batch);

      if (availableQty < requestedQty) {
        const qtyType = item.isSample ? "sample" : "available";
        throw new Error(
          `Insufficient ${qtyType} inventory for batch ${batch.sku || batch.id}. ` +
            `Available: ${availableQty}, Requested: ${requestedQty}`
        );
      }

      if (item.isSample) {
        await tx
          .update(batches)
          .set({
            sampleQty: sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) - ${item.quantity}`,
          })
          .where(eq(batches.id, item.batchId));

        await tx.insert(sampleInventoryLog).values({
          batchId: item.batchId,
          orderId: sale?.id,
          quantity: item.quantity.toString(),
          action: "CONSUMED",
          createdBy: quote.createdBy,
        });
      } else {
        await tx
          .update(batches)
          .set({
            onHandQty: sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) - ${item.quantity}`,
          })
          .where(eq(batches.id, item.batchId));

        // ST-050: MEET-005 payables tracking - errors now propagate to rollback transaction
        // If payables update fails, the entire quote-to-sale conversion is rolled back
        // This ensures financial consistency between orders and payables
        await payablesService.updatePayableOnSale(item.batchId, item.quantity);
        await payablesService.checkInventoryZeroThreshold(item.batchId);
      }
    }

    // 7. Update quote status
    await tx
      .update(orders)
      .set({
        quoteStatus: "CONVERTED",
        convertedAt: new Date(),
      })
      .where(eq(orders.id, input.quoteId));

    // ORD-001: Invoice creation moved to fulfillment (updateOrderStatus when SHIPPED)
    // Invoices are now created AFTER fulfillment is complete, not at quote-to-sale conversion.
    // This ensures invoice amounts match actual fulfilled quantities.
    // Cash payments and credit exposure updates also happen at fulfillment time.

    // 8. Return the sale
    if (!sale) {
      throw new Error("Failed to create sale order");
    }

    return sale;
  });
}

// ============================================================================
// EXPORT ORDER
// ============================================================================

/**
 * Export order to various formats
 */
export async function exportOrder(
  id: number,
  format: "pdf" | "clipboard" | "image"
): Promise<string> {
  const order = await getOrderById(id);
  if (!order) {
    throw new Error(`Order ${id} not found`);
  }

  // Parse items
  const items =
    typeof order.items === "string" ? JSON.parse(order.items) : order.items;

  // Build export data
  const exportData = {
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.isDraft
      ? "DRAFT"
      : (order.saleStatus ?? order.quoteStatus ?? "UNKNOWN"),
    clientId: order.clientId,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    tax: order.tax,
    total: order.total,
    items: Array.isArray(items)
      ? items.map((item: OrderItem) => ({
          displayName: item.displayName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        }))
      : [],
  };

  switch (format) {
    case "clipboard": {
      // Return formatted text for clipboard
      const lines = [
        `Order: ${exportData.orderNumber}`,
        `Type: ${exportData.orderType}`,
        `Status: ${exportData.status}`,
        `Date: ${exportData.createdAt?.toLocaleDateString() ?? "N/A"}`,
        "",
        "Items:",
        ...exportData.items.map(
          (item: {
            displayName: string;
            quantity: number;
            unitPrice: number;
            lineTotal: number;
          }) =>
            `  - ${item.displayName}: ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.lineTotal.toFixed(2)}`
        ),
        "",
        `Subtotal: $${parseFloat(exportData.subtotal ?? "0").toFixed(2)}`,
        `Tax: $${parseFloat(exportData.tax ?? "0").toFixed(2)}`,
        `Total: $${parseFloat(exportData.total ?? "0").toFixed(2)}`,
      ];
      return lines.join("\n");
    }

    case "pdf":
      // Return JSON data that can be used by a PDF generator on the client
      return JSON.stringify({
        type: "pdf",
        data: exportData,
        template: "order",
      });

    case "image":
      // Return JSON data that can be used by an image generator on the client
      return JSON.stringify({
        type: "image",
        data: exportData,
        template: "order",
      });

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// NEW FUNCTIONS TO ADD TO ordersDb.ts

// ============================================================================
// CONFIRM DRAFT ORDER
// ============================================================================

/**
 * Confirm a draft order (convert to confirmed order)
 */
export async function confirmDraftOrder(input: {
  orderId: number;
  paymentTerms:
    | "NET_7"
    | "NET_15"
    | "NET_30"
    | "COD"
    | "PARTIAL"
    | "CONSIGNMENT";
  cashPayment?: number;
  notes?: string;
  confirmedBy: number;
}): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Extract actor ID from input (already validated by router using ctx.user.id)
  const confirmActorId = input.confirmedBy;

  return await db.transaction(async tx => {
    // 1. Get the draft order
    const draft = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);

    if (!draft) {
      throw new Error(`Order ${input.orderId} not found`);
    }

    if (!draft.isDraft) {
      throw new Error(`Order ${input.orderId} is not a draft`);
    }

    // 2. Parse draft items
    const draftItems = JSON.parse(draft.items as string) as OrderItem[];

    // INV-002: Get unique batch IDs and lock all batches upfront to prevent race conditions
    const batchIds = [...new Set(draftItems.map(item => item.batchId))];

    // BUG-115: Early return if no items to process (prevents empty array crash)
    if (batchIds.length === 0) {
      throw new Error("Cannot confirm order with no line items");
    }

    // INV-002: Lock all batch rows with FOR UPDATE to prevent concurrent modifications
    // This ensures that if two confirmations happen simultaneously, one will wait for the other
    // BUG-115: Use safeInArray to prevent crash if batchIds is somehow empty
    const lockedBatches = await tx
      .select()
      .from(batches)
      .where(safeInArray(batches.id, batchIds))
      .for("update");

    // Create a map for quick lookup
    const batchMap = new Map(lockedBatches.map(b => [b.id, b]));

    // 3. Check inventory availability with locked rows
    // Uses calculateAvailableQty to account for quarantine/hold/reserved quantities
    for (const item of draftItems) {
      const batch = batchMap.get(item.batchId);

      if (!batch) {
        throw new Error(`Batch ${item.batchId} not found`);
      }

      const availableQty = item.isSample
        ? parseFloat(batch.sampleQty as string)
        : calculateAvailableQty(batch);

      if (availableQty < item.quantity) {
        throw new Error(
          `Insufficient inventory for ${item.displayName}. ` +
            `Available: ${availableQty}, Required: ${item.quantity}`
        );
      }
    }

    // 4. Calculate due date
    const dueDate = calculateDueDate(input.paymentTerms);

    // 5. Determine payment status
    const cashPayment = input.cashPayment || 0;
    const total = parseFloat(draft.total as string);
    const saleStatus =
      cashPayment >= total ? "PAID" : cashPayment > 0 ? "PARTIAL" : "PENDING";

    // 6. Update order to confirmed
    await tx
      .update(orders)
      .set({
        isDraft: false,
        orderType: "SALE",
        paymentTerms: input.paymentTerms,
        cashPayment: cashPayment.toString(),
        dueDate: dueDate,
        saleStatus: saleStatus,
        fulfillmentStatus: "PENDING",
        notes: input.notes || draft.notes,
        confirmedAt: new Date(),
      })
      .where(eq(orders.id, input.orderId));

    // 7. Reduce inventory
    for (const item of draftItems) {
      if (item.isSample) {
        await tx
          .update(batches)
          .set({
            sampleQty: sql`CAST(${batches.sampleQty} AS DECIMAL(15,4)) - ${item.quantity}`,
          })
          .where(eq(batches.id, item.batchId));

        await tx.insert(sampleInventoryLog).values({
          batchId: item.batchId,
          orderId: input.orderId,
          quantity: item.quantity.toString(),
          action: "CONSUMED",
          createdBy: confirmActorId,
        });
      } else {
        await tx
          .update(batches)
          .set({
            onHandQty: sql`CAST(${batches.onHandQty} AS DECIMAL(15,4)) - ${item.quantity}`,
          })
          .where(eq(batches.id, item.batchId));

        // ST-050: MEET-005 payables tracking - errors now propagate to rollback transaction
        // If payables update fails, the entire order confirmation is rolled back
        // This ensures financial consistency between orders and payables
        await payablesService.updatePayableOnSale(item.batchId, item.quantity);
        await payablesService.checkInventoryZeroThreshold(item.batchId);
      }
    }

    // 7. Get the confirmed order
    const confirmed = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);

    if (!confirmed) {
      throw new Error("Failed to confirm order");
    }

    return confirmed;
  });
}

// ============================================================================
// UPDATE DRAFT ORDER
// ============================================================================

/**
 * Update a draft order (items, pricing, notes)
 */
export async function updateDraftOrder(input: {
  orderId: number;
  items?: {
    batchId: number;
    displayName?: string;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
    overridePrice?: number;
    overrideCogs?: number;
  }[];
  validUntil?: string;
  notes?: string;
}): Promise<Order> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ORD-002: Validate positive quantities and non-negative prices
  if (input.items) {
    for (const item of input.items) {
      if (item.quantity <= 0) {
        throw new Error(
          `Invalid quantity ${item.quantity} for batch ${item.batchId}. Quantity must be greater than 0.`
        );
      }
      if (item.unitPrice < 0) {
        throw new Error(
          `Invalid unit price ${item.unitPrice} for batch ${item.batchId}. Price cannot be negative.`
        );
      }
      // Non-sample items should have a positive price (samples can be free)
      if (!item.isSample && item.unitPrice === 0) {
        throw new Error(
          `Unit price cannot be zero for non-sample item (batch ${item.batchId}). Use isSample=true for free items.`
        );
      }
      if (item.overridePrice !== undefined && item.overridePrice < 0) {
        throw new Error(
          `Invalid override price ${item.overridePrice} for batch ${item.batchId}. Price cannot be negative.`
        );
      }
      if (item.overrideCogs !== undefined && item.overrideCogs < 0) {
        throw new Error(
          `Invalid override COGS ${item.overrideCogs} for batch ${item.batchId}. COGS cannot be negative.`
        );
      }
    }
  }

  return await db.transaction(async tx => {
    // 1. Get the draft order
    const draft = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);

    if (!draft) {
      throw new Error(`Order ${input.orderId} not found`);
    }

    if (!draft.isDraft) {
      throw new Error(
        `Order ${input.orderId} is not a draft and cannot be edited`
      );
    }

    // 2. If items are being updated, recalculate everything
    if (input.items) {
      // Get client for COGS calculation
      const client = await tx
        .select()
        .from(clients)
        .where(eq(clients.id, draft.clientId))
        .limit(1)
        .then(rows => rows[0]);

      if (!client) {
        throw new Error(`Client ${draft.clientId} not found`);
      }

      // Process each item and calculate COGS
      const processedItems: OrderItem[] = [];

      for (const item of input.items) {
        // Get batch details
        const batch = await tx
          .select()
          .from(batches)
          .where(eq(batches.id, item.batchId))
          .limit(1)
          .then(rows => rows[0]);

        if (!batch) {
          throw new Error(`Batch ${item.batchId} not found`);
        }

        // Calculate COGS (unless overridden)
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

      // Calculate totals
      const subtotal = processedItems.reduce(
        (sum, item) => sum + item.lineTotal,
        0
      );
      const totalCogs = processedItems.reduce(
        (sum, item) => sum + item.lineCogs,
        0
      );
      const totalMargin = subtotal - totalCogs;
      const avgMarginPercent =
        subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;

      // Update order with new items and totals
      await tx
        .update(orders)
        .set({
          items: JSON.stringify(processedItems),
          subtotal: subtotal.toString(),
          total: subtotal.toString(),
          totalCogs: totalCogs.toString(),
          totalMargin: totalMargin.toString(),
          avgMarginPercent: avgMarginPercent.toString(),
          validUntil: input.validUntil
            ? new Date(input.validUntil)
            : draft.validUntil,
          notes: input.notes || draft.notes,
        })
        .where(eq(orders.id, input.orderId));
    } else {
      // Just update notes and validUntil
      const updateData: Record<string, unknown> = {};
      if (input.validUntil) updateData.validUntil = new Date(input.validUntil);
      if (input.notes) updateData.notes = input.notes;

      await tx
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, input.orderId));
    }

    // 3. Return updated order
    const updated = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);

    if (!updated) {
      throw new Error("Failed to update draft order");
    }

    return updated;
  });
}

/**
 * Delete a draft order (soft delete)
 * Only draft orders can be deleted
 * @param input.orderId - The order ID to delete
 * @param input.deletedBy - Required: User ID performing the deletion (for audit trail)
 */
export async function deleteDraftOrder(input: {
  orderId: number;
  deletedBy: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async tx => {
    // 1. Get the draft order
    const draft = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1)
      .then(rows => rows[0]);

    if (!draft) {
      throw new Error(`Order ${input.orderId} not found`);
    }

    if (!draft.isDraft) {
      throw new Error(
        `Order ${input.orderId} is not a draft and cannot be deleted`
      );
    }

    // 2. Soft delete the draft order (per CLAUDE.md - never hard delete)
    await tx
      .update(orders)
      .set({
        deletedAt: new Date(),
        quoteStatus: "REJECTED",
      })
      .where(eq(orders.id, input.orderId));
  });
}

// ============================================================================
// ORDER STATE MACHINE - TERP-0016
// ============================================================================

/**
 * Valid status transitions for fulfillment status
 * TERP-0016: Business logic guardrails for orders
 */
// ORD-003: Consistent fulfillment status transitions
const FULFILLMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PACKED", "SHIPPED", "CANCELLED"], // Can pack, ship directly, or cancel
  PACKED: ["SHIPPED", "CANCELLED"], // Can ship or cancel (ORD-003: removed PENDING - no reverting)
  SHIPPED: [], // Terminal state - no further transitions allowed
  CANCELLED: [], // Terminal state
};

/**
 * Valid status transitions for sale status
 * TERP-0016: Business logic guardrails for orders
 */
const SALE_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PARTIAL", "PAID", "OVERDUE", "CANCELLED"],
  PARTIAL: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PARTIAL", "PAID", "CANCELLED"],
  PAID: [], // Terminal state - cannot change a paid order status
  CANCELLED: [], // Terminal state - cannot change a cancelled order status
};

/**
 * Valid status transitions for quote status
 * TERP-0016: Business logic guardrails for orders
 */
const QUOTE_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["CONVERTED"], // Only accepted quotes can be converted
  REJECTED: [], // Terminal state
  EXPIRED: [], // Terminal state
  CONVERTED: [], // Terminal state
};

/**
 * Validate a status transition is allowed
 * @param statusType - The type of status being checked
 * @param currentStatus - The current status value
 * @param newStatus - The proposed new status value
 * @returns true if transition is valid, false otherwise
 */
export function isValidStatusTransition(
  statusType: "fulfillment" | "sale" | "quote",
  currentStatus: string,
  newStatus: string
): boolean {
  const transitions =
    statusType === "fulfillment"
      ? FULFILLMENT_STATUS_TRANSITIONS
      : statusType === "sale"
        ? SALE_STATUS_TRANSITIONS
        : QUOTE_STATUS_TRANSITIONS;

  const allowedTransitions = transitions[currentStatus];
  if (!allowedTransitions) {
    return false; // Unknown current status
  }

  return allowedTransitions.includes(newStatus);
}

/**
 * Get validation error message for invalid status transition
 */
export function getTransitionError(
  statusType: "fulfillment" | "sale" | "quote",
  currentStatus: string,
  newStatus: string
): string {
  const transitions =
    statusType === "fulfillment"
      ? FULFILLMENT_STATUS_TRANSITIONS
      : statusType === "sale"
        ? SALE_STATUS_TRANSITIONS
        : QUOTE_STATUS_TRANSITIONS;

  const allowedTransitions = transitions[currentStatus] || [];

  if (allowedTransitions.length === 0) {
    return `Cannot change ${statusType} status from ${currentStatus} - this is a terminal state`;
  }

  return `Invalid ${statusType} status transition: ${currentStatus} -> ${newStatus}. Valid transitions from ${currentStatus}: ${allowedTransitions.join(", ")}`;
}

/**
 * Get valid transitions for a sale status
 * SM-002: Helper for error messages and UI display
 */
export function getValidSaleStatusTransitions(currentStatus: string): string[] {
  return SALE_STATUS_TRANSITIONS[currentStatus] || [];
}

// ============================================================================
// FULFILLMENT STATUS MANAGEMENT
// ============================================================================

/**
 * Update order fulfillment status
 * Handles status transitions and inventory decrements
 */
export async function updateOrderStatus(input: {
  orderId: number;
  // ORD-003: Added CANCELLED as valid status for order cancellation before shipping
  newStatus: "PENDING" | "PACKED" | "SHIPPED" | "CANCELLED";
  notes?: string;
  userId: number;
  expectedVersion?: number; // DATA-005: Optimistic locking support
}): Promise<{ success: boolean; newStatus: string; version?: number }> {
  const { orderId, newStatus, userId } = input;

  // Sanitize notes input
  const sanitizedNotes = input.notes
    ? input.notes.trim().substring(0, 5000)
    : undefined;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async tx => {
    // Get current order
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    if (!order) {
      throw new Error("Order not found");
    }

    // DATA-005: Optimistic locking check
    if (
      input.expectedVersion !== undefined &&
      order.version !== input.expectedVersion
    ) {
      const { OptimisticLockError } = await import("./_core/optimisticLocking");
      throw new OptimisticLockError(
        "Order",
        orderId,
        input.expectedVersion,
        order.version
      );
    }

    const oldStatus = order.fulfillmentStatus || "PENDING";

    // TERP-0016: Validate status transition using state machine
    if (!isValidStatusTransition("fulfillment", oldStatus, newStatus)) {
      throw new Error(getTransitionError("fulfillment", oldStatus, newStatus));
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      fulfillmentStatus: newStatus,
    };
    if (newStatus === "PACKED") {
      updateData.packedAt = new Date();
      updateData.packedBy = userId;
    }
    if (newStatus === "SHIPPED") {
      updateData.shippedAt = new Date();
      updateData.shippedBy = userId;

      // Check inventory availability before shipping
      // Uses calculateAvailableQty to account for quarantine/hold/reserved quantities
      const orderItems = order.items as Array<{
        batchId: number;
        quantity: number;
        isSample?: boolean;
      }>;
      for (const item of orderItems) {
        if (item.isSample) continue; // Skip samples

        const [batch] = await tx
          .select()
          .from(batches)
          .where(eq(batches.id, item.batchId));
        if (!batch) {
          throw new Error(`Batch ${item.batchId} not found`);
        }

        const available = calculateAvailableQty(batch);
        if (available < item.quantity) {
          throw new Error(
            `Insufficient inventory for batch ${item.batchId}. ` +
              `Required: ${item.quantity}, Available: ${available}`
          );
        }
      }

      // Decrement inventory when shipped
      const orderItemsForDecrement = (
        typeof order.items === "string" ? JSON.parse(order.items) : order.items
      ) as OrderItem[];
      await decrementInventoryForOrder(
        tx,
        orderId,
        orderItemsForDecrement,
        userId
      );

      // ORD-001: Create invoice AFTER fulfillment is complete
      // This ensures invoice amounts match actual fulfilled quantities
      // ST-050: Accounting errors now propagate and fail the transaction
      // This prevents "shipped but not invoiced" scenarios that break financial consistency
      // If invoice creation fails, the entire SHIPPED status update is rolled back
      // Calculate totals from fulfilled items
      const fulfilledItems = orderItemsForDecrement.filter(
        item => !item.isSample
      );
      const subtotal = fulfilledItems.reduce(
        (sum, item) => sum + (item.lineTotal || 0),
        0
      );
      const tax = parseFloat(order.tax ?? "0");
      const total = subtotal + tax;

      const invoiceId = await createInvoiceFromOrder({
        orderId: orderId,
        orderNumber: order.orderNumber,
        clientId: order.clientId,
        items: orderItemsForDecrement,
        subtotal,
        tax,
        total,
        dueDate: order.dueDate ? new Date(order.dueDate) : undefined,
        createdBy: userId,
      });

      // Update order with invoice reference
      updateData.invoiceId = invoiceId;

      // Record cash payment if applicable
      const cashPayment = parseFloat(order.cashPayment ?? "0");
      if (cashPayment > 0) {
        await recordOrderCashPayment({
          invoiceId,
          amount: cashPayment,
          createdBy: userId,
        });
      }

      // Keep stored client balance aligned with canonical invoice amounts.
      await syncClientBalance(order.clientId);

      // Update credit exposure
      await updateClientCreditExposure(order.clientId);
    }

    // Update order status with version increment (DATA-005)
    updateData.version = sql`version + 1`;
    await tx.update(orders).set(updateData).where(eq(orders.id, orderId));

    // Log status change in history
    const { orderStatusHistory } = await import("../drizzle/schema");
    // Map status to valid fulfillmentStatus enum values
    const validStatus =
      newStatus === "PENDING" ||
      newStatus === "PACKED" ||
      newStatus === "SHIPPED"
        ? newStatus
        : "PENDING"; // Default to PENDING for unsupported statuses
    await tx.insert(orderStatusHistory).values({
      orderId,
      fulfillmentStatus: validStatus,
      changedBy: userId,
      notes: sanitizedNotes,
    });

    // Get updated version for response
    const [updatedOrder] = await tx
      .select({ version: orders.version })
      .from(orders)
      .where(eq(orders.id, orderId));
    return { success: true, newStatus, version: updatedOrder?.version };
  });
}

/**
 * Get order status history
 */
export async function getOrderStatusHistory(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orderStatusHistory, users } = await import("../drizzle/schema");

  return await db
    .select({
      id: orderStatusHistory.id,
      orderId: orderStatusHistory.orderId,
      fulfillmentStatus: orderStatusHistory.fulfillmentStatus,
      changedBy: orderStatusHistory.changedBy,
      changedByName: users.name,
      changedAt: orderStatusHistory.changedAt,
      notes: orderStatusHistory.notes,
    })
    .from(orderStatusHistory)
    .leftJoin(users, eq(orderStatusHistory.changedBy, users.id))
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(orderStatusHistory.changedAt);
}

// ============================================================================
// SM-002: SALE STATUS MANAGEMENT
// ============================================================================

/**
 * Update order sale status with state machine validation
 * SM-002: Ensures only valid transitions are allowed
 * ST-051: Wrapped in transaction to prevent race conditions and ensure atomicity
 */
export async function updateSaleStatus(input: {
  orderId: number;
  newStatus: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
  notes?: string;
  userId: number;
}): Promise<{ success: boolean; newStatus: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ST-051: Wrap in transaction to lock order row and ensure atomicity
  return await db.transaction(async tx => {
    // Get current order with row lock
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");

    if (!order) {
      throw new Error(`Order ${input.orderId} not found`);
    }

    if (order.orderType !== "SALE") {
      throw new Error("Only SALE orders have sale status");
    }

    const currentStatus = order.saleStatus || "PENDING";

    // Validate transition using state machine
    if (!isValidStatusTransition("sale", currentStatus, input.newStatus)) {
      const validTransitions = getValidSaleStatusTransitions(currentStatus);
      throw new Error(
        `Invalid sale status transition: ${currentStatus} -> ${input.newStatus}. ` +
          `Valid transitions from ${currentStatus}: ${validTransitions.join(", ") || "none"}`
      );
    }

    // Update status
    await tx
      .update(orders)
      .set({ saleStatus: input.newStatus })
      .where(eq(orders.id, input.orderId));

    return { success: true, newStatus: input.newStatus };
  });
}

// ============================================================================
// INVENTORY HELPERS
// ============================================================================

/**
 * Decrement inventory for order items when shipped
 * Uses row-level locking to prevent race conditions
 * @param tx - Database transaction
 * @param orderId - Order ID for reference
 * @param items - Order items to decrement inventory for
 * @param performedBy - User ID who performed the action (for audit trail)
 */
async function decrementInventoryForOrder(
  tx: DbTransaction,
  orderId: number,
  items: OrderItem[],
  performedBy: number
) {
  const { inventoryMovements } = await import("../drizzle/schema");

  for (const item of items) {
    if (!item.batchId || item.isSample) continue; // Skip samples

    // Get current batch quantity before update (for audit trail)
    const [batch] = await tx
      .select({ onHandQty: batches.onHandQty })
      .from(batches)
      .where(eq(batches.id, item.batchId))
      .for("update");

    const quantityBefore = parseFloat(batch?.onHandQty || "0");
    const quantityAfter = quantityBefore - item.quantity;

    // Decrement batch quantity
    await tx
      .update(batches)
      .set({ onHandQty: String(quantityAfter) })
      .where(eq(batches.id, item.batchId));

    // Log inventory movement
    await tx.insert(inventoryMovements).values({
      batchId: item.batchId,
      inventoryMovementType: "SALE",
      quantityChange: String(-item.quantity),
      quantityBefore: String(quantityBefore),
      quantityAfter: String(quantityAfter),
      referenceType: "ORDER",
      referenceId: orderId,
      notes: `Shipped order #${orderId}`,
      performedBy: performedBy,
    });
  }
}

// ============================================================================
// RETURNS MANAGEMENT
// ============================================================================

/**
 * Process a return for an order
 * Automatically restocks inventory
 */
export async function processReturn(input: {
  orderId: number;
  items: Array<{ batchId: number; quantity: number }>;
  reason:
    | "DEFECTIVE"
    | "WRONG_ITEM"
    | "NOT_AS_DESCRIBED"
    | "CUSTOMER_CHANGED_MIND"
    | "OTHER";
  notes?: string;
  userId: number;
}): Promise<{ success: boolean; returnId: number }> {
  const { orderId, items, reason, userId } = input;

  // Sanitize notes input to prevent XSS
  const sanitizedNotes = input.notes
    ? input.notes.trim().substring(0, 5000)
    : undefined;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async tx => {
    // Verify order exists
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    if (!order) {
      throw new Error("Order not found");
    }

    // Validate return quantities
    const orderItems = order.items as Array<{
      batchId: number;
      quantity: number;
    }>;

    // Get existing returns for this order
    const { returns } = await import("../drizzle/schema");
    const existingReturns = await tx
      .select()
      .from(returns)
      .where(eq(returns.orderId, orderId));

    // Calculate total returned per batch
    const returnedByBatch = new Map<number, number>();
    for (const existingReturn of existingReturns) {
      const returnItems = JSON.parse(existingReturn.items as string) as Array<{
        batchId: number;
        quantity: number;
      }>;
      for (const item of returnItems) {
        returnedByBatch.set(
          item.batchId,
          (returnedByBatch.get(item.batchId) || 0) + item.quantity
        );
      }
    }

    // Validate each return item
    for (const returnItem of items) {
      const orderItem = orderItems.find(i => i.batchId === returnItem.batchId);
      if (!orderItem) {
        throw new Error(
          `Batch ${returnItem.batchId} not found in original order`
        );
      }

      const alreadyReturned = returnedByBatch.get(returnItem.batchId) || 0;
      const totalReturning = alreadyReturned + returnItem.quantity;

      if (totalReturning > orderItem.quantity) {
        throw new Error(
          `Cannot return ${returnItem.quantity} units of batch ${returnItem.batchId}. ` +
            `Original order: ${orderItem.quantity}, already returned: ${alreadyReturned}, ` +
            `maximum returnable: ${orderItem.quantity - alreadyReturned}`
        );
      }

      if (returnItem.quantity <= 0) {
        throw new Error("Return quantity must be greater than zero");
      }
    }

    // Create return record (returns already imported above)
    const [returnRecord] = await tx
      .insert(returns)
      .values({
        orderId,
        items: JSON.stringify(items),
        returnReason: reason as
          | "DEFECTIVE"
          | "WRONG_ITEM"
          | "NOT_AS_DESCRIBED"
          | "CUSTOMER_CHANGED_MIND"
          | "OTHER",
        notes: sanitizedNotes,
        processedBy: userId,
      })
      .$returningId();

    // Restock inventory for each returned item
    const { inventoryMovements } = await import("../drizzle/schema");
    for (const item of items) {
      // Get current batch quantity
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, item.batchId));
      if (!batch) continue;

      const quantityBefore = parseFloat(batch.onHandQty);
      const quantityAfter = quantityBefore + item.quantity;

      // Increment batch quantity
      await tx.execute(sql`
        UPDATE batches 
        SET onHandQty = CAST(onHandQty AS DECIMAL(15,4)) + ${item.quantity}
        WHERE id = ${item.batchId}
      `);

      // Log inventory movement
      await tx.insert(inventoryMovements).values({
        batchId: item.batchId,
        inventoryMovementType: "RETURN",
        quantityChange: item.quantity.toString(),
        quantityBefore: quantityBefore.toString(),
        quantityAfter: quantityAfter.toString(),
        referenceType: "RETURN",
        referenceId: returnRecord.id,
        notes: `Return from order #${orderId}: ${reason}`,
        performedBy: userId,
      });
    }

    return { success: true, returnId: returnRecord.id };
  });
}

/**
 * Get all returns for an order
 */
export async function getOrderReturns(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { returns, users } = await import("../drizzle/schema");

  return await db
    .select({
      id: returns.id,
      orderId: returns.orderId,
      items: returns.items,
      returnReason: returns.returnReason,
      notes: returns.notes,
      processedBy: returns.processedBy,
      processedByName: users.name,
      processedAt: returns.processedAt,
    })
    .from(returns)
    .leftJoin(users, eq(returns.processedBy, users.id))
    .where(eq(returns.orderId, orderId))
    .orderBy(desc(returns.processedAt));
}

/**
 * Generates a unique order number.
 * @param orderType - The type of order ('QUOTE' or 'SALE')
 * @param isDraft - Whether the order is a draft
 */
export async function generateOrderNumber(
  orderType: "QUOTE" | "SALE",
  isDraft: boolean = false
): Promise<string> {
  if (isDraft) {
    return `D-${Date.now()}`;
  }

  const prefix = orderType === "QUOTE" ? "Q" : "S";
  return `${prefix}-${Date.now()}`;
}
