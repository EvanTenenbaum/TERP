/**
 * Order Orchestrator Service
 *
 * ARCH-001: Central coordination point for order lifecycle management.
 * Coordinates between various order-related services to ensure:
 * - Proper state transitions
 * - Invoice creation timing (ORD-001)
 * - Transaction boundaries (ST-051)
 * - Audit logging
 *
 * @module server/services/orderOrchestrator
 */

import { getDb } from "../db";
import { orders, invoices, clients } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { withRetryableTransaction } from "../_core/dbTransaction";
import { logger } from "../_core/logger";
import {
  canTransition,
  getNextStatuses,
  isTerminalStatus,
  FulfillmentStatus,
} from "./orderStateMachine";
import { validateOrderForTransition } from "./orderValidationService";

// ============================================================================
// TYPES
// ============================================================================

export interface OrderTransitionInput {
  orderId: number;
  toStatus: FulfillmentStatus;
  userId: number;
  notes?: string;
}

export interface OrderTransitionResult {
  success: boolean;
  orderId: number;
  previousStatus: string;
  newStatus: string;
  invoiceCreated?: boolean;
  invoiceId?: number;
  warnings?: string[];
}

// ============================================================================
// ORDER STATE TRANSITIONS
// ============================================================================

/**
 * Transitions an order to a new status with proper validation and side effects.
 *
 * This is the main entry point for order state changes. It ensures:
 * 1. The transition is valid according to the state machine
 * 2. All preconditions are met (e.g., items exist, inventory available)
 * 3. Side effects are executed in a transaction (invoice creation, etc.)
 * 4. Audit logs are created
 *
 * @param input - The transition input containing order ID, target status, and user
 * @returns The result of the transition including any created invoices
 */
export async function transitionOrderStatus(
  input: OrderTransitionInput
): Promise<OrderTransitionResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { orderId, toStatus, userId, notes } = input;

  // 1. Get current order state
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          totalOwed: true,
        },
      },
    },
  });

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Order ${orderId} not found`,
    });
  }

  const previousStatus = order.fulfillmentStatus || order.orderType || "DRAFT";

  // 2. Validate the transition
  if (!canTransition(previousStatus, toStatus)) {
    const validNext = getNextStatuses(previousStatus);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid status transition from ${previousStatus} to ${toStatus}. Valid transitions: ${validNext.join(", ") || "none (terminal state)"}`,
    });
  }

  // 3. Run pre-transition validations
  const validationResult = await validateOrderForTransition({
    orderId,
    fromStatus: previousStatus,
    toStatus,
  });

  if (!validationResult.isValid) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Order validation failed: ${validationResult.errors.join(", ")}`,
    });
  }

  // 4. Execute the transition with side effects in a transaction
  const result = await withRetryableTransaction(async (tx) => {
    const warnings: string[] = [];
    let invoiceCreated = false;
    let invoiceId: number | undefined;

    // Update order status
    await tx
      .update(orders)
      .set({
        fulfillmentStatus: toStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // ORD-001: Create invoice when order is CONFIRMED (not before)
    if (toStatus === "CONFIRMED" && previousStatus !== "CONFIRMED") {
      const invoiceResult = await createInvoiceForOrderInTx(tx, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientId: order.clientId,
        total: order.total,
        subtotal: order.subtotal,
        items: order.items,
        clientTotalOwed: order.client?.totalOwed,
        userId,
      });
      if (invoiceResult.success && invoiceResult.invoiceId) {
        invoiceCreated = true;
        invoiceId = invoiceResult.invoiceId;
      } else if (invoiceResult.warning) {
        warnings.push(invoiceResult.warning);
      }
    }

    // Log the transition
    logger.info({
      orderId,
      previousStatus,
      newStatus: toStatus,
      userId,
      invoiceCreated,
      invoiceId,
    }, `Order ${orderId} transitioned from ${previousStatus} to ${toStatus}`);

    return {
      success: true,
      orderId,
      previousStatus,
      newStatus: toStatus,
      invoiceCreated,
      invoiceId,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  });

  return result;
}

// ============================================================================
// INVOICE CREATION
// ============================================================================

interface CreateInvoiceInput {
  orderId: number;
  orderNumber: string | null;
  clientId: number;
  total: string | null;
  subtotal: string | null;
  items: unknown;
  clientTotalOwed: string | null | undefined;
  userId: number;
}

interface CreateInvoiceResult {
  success: boolean;
  invoiceId?: number;
  invoiceNumber?: string;
  warning?: string;
}

/**
 * Creates an invoice for an order within a transaction context.
 *
 * ORD-001: This function handles the proper timing of invoice creation.
 * Invoices should only be created when an order is CONFIRMED, not before.
 */
async function createInvoiceForOrderInTx(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult> {
  const { orderId, orderNumber, clientId, total, subtotal, items, clientTotalOwed, userId } = input;

  try {
    // Check if invoice already exists for this order using referenceId pattern
    const existingInvoice = await tx
      .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(and(
        eq(invoices.referenceType, "ORDER"),
        eq(invoices.referenceId, orderId)
      ))
      .limit(1);

    if (existingInvoice.length > 0) {
      return {
        success: false,
        warning: `Invoice ${existingInvoice[0].invoiceNumber} already exists for this order`,
      };
    }

    // FIN-001: Generate invoice number with proper locking
    const { getNextSequence } = await import("../sequenceDb");
    const invoiceNumber = await getNextSequence("INVOICE");

    // Calculate due date (default: Net 30)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const totalAmount = parseFloat(total || "0");
    const subtotalAmount = parseFloat(subtotal || "0");
    const taxAmount = totalAmount - subtotalAmount;

    // Create the invoice using the schema's referenceType/referenceId pattern
    const [result] = await tx.insert(invoices).values({
      invoiceNumber,
      customerId: clientId,
      invoiceDate: new Date(),
      dueDate,
      subtotal: subtotalAmount.toFixed(2),
      taxAmount: taxAmount >= 0 ? taxAmount.toFixed(2) : "0.00",
      discountAmount: "0.00",
      totalAmount: totalAmount.toFixed(2),
      amountPaid: "0.00",
      amountDue: totalAmount.toFixed(2),
      status: "DRAFT",
      referenceType: "ORDER",
      referenceId: orderId,
      notes: `Invoice for order ${orderNumber || orderId}`,
      createdBy: userId,
    });

    const invoiceId = Number(result.insertId);

    // Update client's totalOwed
    const currentOwed = parseFloat(clientTotalOwed || "0");
    const newTotalOwed = currentOwed + totalAmount;

    await tx
      .update(clients)
      .set({
        totalOwed: newTotalOwed.toFixed(2),
      })
      .where(eq(clients.id, clientId));

    logger.info({
      invoiceId,
      invoiceNumber,
      orderId,
      total: totalAmount,
      clientId,
      previousOwed: currentOwed,
      newTotalOwed,
    }, `Invoice ${invoiceNumber} created for order ${orderId}`);

    return {
      success: true,
      invoiceId,
      invoiceNumber,
    };
  } catch (error) {
    logger.error({
      orderId,
      error: error instanceof Error ? error.message : String(error),
    }, "Failed to create invoice for order");
    throw error;
  }
}

// ============================================================================
// ORDER LIFECYCLE QUERIES
// ============================================================================

/**
 * Gets the valid next statuses for an order.
 * Useful for UI to show available actions.
 */
export async function getAvailableTransitions(
  orderId: number
): Promise<{ status: FulfillmentStatus; label: string }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    columns: {
      fulfillmentStatus: true,
      orderType: true,
    },
  });

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Order ${orderId} not found`,
    });
  }

  const currentStatus = order.fulfillmentStatus || order.orderType || "DRAFT";
  const { STATUS_LABELS } = await import("./orderStateMachine");
  const nextStatuses = getNextStatuses(currentStatus);

  return nextStatuses.map((status) => ({
    status,
    label: STATUS_LABELS[status],
  }));
}

/**
 * Checks if an order can have an invoice created.
 */
export async function canCreateInvoice(orderId: number): Promise<{
  canCreate: boolean;
  reason?: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if order exists and is confirmed
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    columns: {
      fulfillmentStatus: true,
      orderType: true,
    },
  });

  if (!order) {
    return { canCreate: false, reason: "Order not found" };
  }

  const status = order.fulfillmentStatus || order.orderType || "DRAFT";
  if (status !== "CONFIRMED" && status !== "SALE") {
    return {
      canCreate: false,
      reason: `Order must be CONFIRMED to create invoice. Current status: ${status}`,
    };
  }

  // Check if invoice already exists using referenceType/referenceId pattern
  const existingInvoice = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(
      eq(invoices.referenceType, "ORDER"),
      eq(invoices.referenceId, orderId)
    ))
    .limit(1);

  if (existingInvoice.length > 0) {
    return { canCreate: false, reason: "Invoice already exists for this order" };
  }

  return { canCreate: true };
}

/**
 * Gets the complete order lifecycle status including invoice and payment info.
 */
export async function getOrderLifecycleStatus(orderId: number): Promise<{
  order: {
    id: number;
    status: string;
    isTerminal: boolean;
    availableTransitions: FulfillmentStatus[];
  };
  invoice: {
    exists: boolean;
    id?: number;
    number?: string;
    status?: string;
  };
  client: {
    id: number;
    name: string;
    totalOwed: number;
  } | null;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      client: {
        columns: {
          id: true,
          name: true,
          totalOwed: true,
        },
      },
    },
  });

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Order ${orderId} not found`,
    });
  }

  const status = order.fulfillmentStatus || order.orderType || "DRAFT";

  // Get invoice info using referenceType/referenceId pattern
  const invoice = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
    })
    .from(invoices)
    .where(and(
      eq(invoices.referenceType, "ORDER"),
      eq(invoices.referenceId, orderId)
    ))
    .limit(1);

  return {
    order: {
      id: order.id,
      status,
      isTerminal: isTerminalStatus(status),
      availableTransitions: getNextStatuses(status),
    },
    invoice: invoice.length > 0
      ? {
          exists: true,
          id: invoice[0].id,
          number: invoice[0].invoiceNumber || undefined,
          status: invoice[0].status || undefined,
        }
      : { exists: false },
    client: order.client
      ? {
          id: order.client.id,
          name: order.client.name,
          totalOwed: parseFloat(order.client.totalOwed || "0"),
        }
      : null,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FulfillmentStatus,
  canTransition,
  getNextStatuses,
  isTerminalStatus,
} from "./orderStateMachine";
