/**
 * Returns Router
 * API endpoints for order return processing
 *
 * Wave 5C Enhancement: Full returns workflow with approval, receiving, and processing stages
 * Includes credit issuance integration
 */

import { z } from "zod";
import {
  protectedProcedure,
  router,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { getDb } from "../db";
import {
  returns,
  batches,
  inventoryMovements,
  clients,
  orders,
  credits,
  ledgerEntries,
  orderLineItems,
  users,
} from "../../drizzle/schema";
import { eq, desc, sql, and, ne, isNull } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";
import { logger } from "../_core/logger";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { TRPCError } from "@trpc/server";
import * as creditsDb from "../creditsDb";
import { reverseGLEntries, GLPostingError } from "../accountingHooks";
import { invoices } from "../../drizzle/schema";

// Extended return reason enum for API input (includes values that map to database values)
const returnReasonInputEnum = z.enum([
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "CUSTOMER_CHANGED_MIND",
  "DAMAGED_IN_TRANSIT", // Maps to DEFECTIVE
  "QUALITY_ISSUE", // Maps to DEFECTIVE
  "OTHER",
]);

// Database-compatible return reason type
type DbReturnReason =
  | "DEFECTIVE"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "CUSTOMER_CHANGED_MIND"
  | "OTHER";

// Map extended reasons to database-compatible values
function mapReturnReason(
  reason: z.infer<typeof returnReasonInputEnum>
): DbReturnReason {
  switch (reason) {
    case "DAMAGED_IN_TRANSIT":
    case "QUALITY_ISSUE":
      return "DEFECTIVE";
    default:
      return reason;
  }
}

// Return item condition enum
const itemConditionEnum = z.enum([
  "SELLABLE",
  "DAMAGED",
  "DESTROYED",
  "QUARANTINE",
]);

// Return status enum
const returnStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RECEIVED",
  "PROCESSED",
  "CANCELLED",
]);

interface ReturnInvoiceCandidate {
  id: number;
  status: string;
  hasLedgerEntries: number;
}

interface ReturnItemQuantity {
  batchId: number;
  quantity: string;
}

interface ReceivedReturnItemQuantity {
  batchId: number;
  receivedQuantity: string;
}

export function pickReturnAccountingInvoice<T extends ReturnInvoiceCandidate>(
  candidates: T[]
): T | undefined {
  return (
    candidates.find(
      candidate =>
        candidate.status !== "DRAFT" && Boolean(candidate.hasLedgerEntries)
    ) ??
    candidates.find(candidate => candidate.status !== "DRAFT") ??
    candidates[0]
  );
}

export function validateReceivedReturnQuantities(
  originalItems: ReturnItemQuantity[],
  receivedItems: ReceivedReturnItemQuantity[]
): void {
  if (originalItems.length === 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Return item data is invalid; cannot receive items safely.",
    });
  }

  const maxReturnQtyByBatch = new Map<number, number>();
  for (const item of originalItems) {
    const qty = parseFloat(item.quantity || "0");
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Return item data is invalid; cannot receive items safely.",
      });
    }

    maxReturnQtyByBatch.set(
      item.batchId,
      (maxReturnQtyByBatch.get(item.batchId) || 0) + qty
    );
  }

  const requestedQtyByBatch = new Map<number, number>();
  for (const item of receivedItems) {
    const receivedQty = parseFloat(item.receivedQuantity);
    if (!Number.isFinite(receivedQty) || receivedQty <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Received quantity for batch #${item.batchId} must be a positive number.`,
      });
    }

    const maxAllowed = maxReturnQtyByBatch.get(item.batchId);
    if (maxAllowed === undefined || maxAllowed <= 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Batch #${item.batchId} is not part of this return.`,
      });
    }

    const nextRequested =
      (requestedQtyByBatch.get(item.batchId) || 0) + receivedQty;
    if (nextRequested > maxAllowed) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Received quantity for batch #${item.batchId} cannot exceed the original return quantity (${maxAllowed}).`,
      });
    }

    requestedQtyByBatch.set(item.batchId, nextRequested);
  }
}

// SM-003: Return status state machine
// Defines valid transitions for return status workflow
// Exported for unit testing
export const RETURN_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["RECEIVED", "CANCELLED"],
  REJECTED: [], // Terminal state
  RECEIVED: ["PROCESSED", "CANCELLED"],
  PROCESSED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * CRIT-2: Sanitize user-provided text before appending to return notes.
 * Prevents injection of status markers like [CANCELLED, [PROCESSED etc.
 * that would corrupt the notes-based state machine.
 */
function sanitizeNotesText(text: string): string {
  return text.replace(/\[/g, "(");
}

/**
 * SM-003: Extract current status from return notes (legacy fallback)
 * DISC-RET-002: Prefer the dedicated `status` column when available.
 * Notes-based extraction retained for backward compatibility with pre-migration rows.
 * Exported for unit testing
 */
export function extractReturnStatus(notes: string | null): string {
  if (!notes) return "PENDING";

  // Check for status markers - terminal states first, then reverse workflow order
  // Terminal states (CANCELLED, REJECTED, PROCESSED) take precedence since they're final
  if (notes.includes("[CANCELLED")) return "CANCELLED";
  if (notes.includes("[PROCESSED")) return "PROCESSED";
  if (notes.includes("[REJECTED")) return "REJECTED";
  // Non-terminal states in reverse workflow order
  if (notes.includes("[RECEIVED")) return "RECEIVED";
  if (notes.includes("[APPROVED")) return "APPROVED";

  return "PENDING";
}

/**
 * SM-003: Validate return status transition
 * Exported for unit testing
 */
export function isValidReturnStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions = RETURN_STATUS_TRANSITIONS[currentStatus];
  if (!validTransitions) return false;
  return validTransitions.includes(newStatus);
}

/**
 * SM-003: Get error message for invalid transition
 * Exported for unit testing
 */
export function getReturnTransitionError(
  currentStatus: string,
  newStatus: string
): string {
  const validTransitions = RETURN_STATUS_TRANSITIONS[currentStatus] || [];
  if (validTransitions.length === 0) {
    return `Cannot change return status from ${currentStatus} - this is a terminal state`;
  }
  return `Invalid return status transition: ${currentStatus} -> ${newStatus}. Valid transitions: ${validTransitions.join(", ")}`;
}

// Return item schema for creating returns
const returnItemSchema = z.object({
  batchId: z.number(),
  quantity: z.string(),
  reason: z.string().optional(),
  expectedCondition: itemConditionEnum.optional(),
});

export const returnsRouter = router({
  // List returns with filtering and pagination
  list: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        status: returnStatusEnum.optional(),
        orderId: z.number().optional(),
        clientId: z.number().optional(),
        searchTerm: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      logger.info({ msg: "[Returns] Listing returns", filters: input });

      const conditions = [];

      if (input.orderId) {
        conditions.push(eq(returns.orderId, input.orderId));
      }

      // DISC-RET-002: Filter by dedicated status column
      if (input.status) {
        conditions.push(eq(returns.status, input.status));
      }

      let query = db
        .select({
          id: returns.id,
          orderId: returns.orderId,
          items: returns.items,
          returnReason: returns.returnReason,
          status: returns.status,
          notes: returns.notes,
          processedBy: returns.processedBy,
          processedAt: returns.processedAt,
        })
        .from(returns);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      query = query.orderBy(desc(returns.processedAt)) as typeof query;
      query = query.limit(input.limit).offset(input.offset) as typeof query;

      const returnList = await query;

      // Get total count
      const countConditions =
        conditions.length > 0 ? and(...conditions) : undefined;
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(returns)
        .where(countConditions);

      return createSafeUnifiedResponse(
        returnList,
        Number(countResult[0]?.count || 0),
        input.limit,
        input.offset
      );
    }),

  // Get all returns (legacy endpoint)
  getAll: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z
        .object({
          orderId: z.number().optional(),
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

      let query = db
        .select({
          id: returns.id,
          orderId: returns.orderId,
          items: returns.items,
          returnReason: returns.returnReason,
          status: returns.status,
          notes: returns.notes,
          processedBy: returns.processedBy,
          processedByName: users.name,
          processedAt: returns.processedAt,
        })
        .from(returns)
        .leftJoin(users, eq(returns.processedBy, users.id))
        .orderBy(desc(returns.processedAt))
        .limit(limit)
        .offset(offset);

      if (input?.orderId) {
        query = query.where(eq(returns.orderId, input.orderId)) as typeof query;
      }

      return await query;
    }),

  // Get return by ID
  getById: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // Get order details
      const [order] = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          clientId: orders.clientId,
          total: orders.total,
        })
        .from(orders)
        .where(
          and(eq(orders.id, returnRecord.orderId), isNull(orders.deletedAt))
        );

      // Get client details if order exists
      let client = null;
      if (order?.clientId) {
        const [clientResult] = await db
          .select({
            id: clients.id,
            name: clients.name,
          })
          .from(clients)
          .where(eq(clients.id, order.clientId));
        client = clientResult;
      }

      return {
        ...returnRecord,
        order,
        client,
      };
    }),

  // Create a return request
  create: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        orderId: z.number(),
        items: z.array(returnItemSchema).min(1),
        reason: returnReasonInputEnum,
        notes: z.string().optional(),
        restockInventory: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      logger.info({
        msg: "[Returns] Creating return",
        orderId: input.orderId,
        itemCount: input.items.length,
      });

      // Wrap in transaction to ensure atomicity
      const result = await db.transaction(async tx => {
        const userId = getAuthenticatedUserId(ctx);

        // Verify order exists
        const [order] = await tx
          .select()
          .from(orders)
          .where(and(eq(orders.id, input.orderId), isNull(orders.deletedAt)));

        if (!order) {
          throw new Error("Order not found");
        }

        // Validate return quantities against order line items
        const lineItems = await tx
          .select({
            batchId: orderLineItems.batchId,
            quantity: orderLineItems.quantity,
          })
          .from(orderLineItems)
          .where(eq(orderLineItems.orderId, input.orderId));

        // Build map of ordered quantities per batch
        const orderedQtyByBatch = new Map<number, number>();
        for (const li of lineItems) {
          const qty = parseFloat(li.quantity);
          orderedQtyByBatch.set(
            li.batchId,
            (orderedQtyByBatch.get(li.batchId) || 0) + qty
          );
        }

        // Get previously returned quantities for this order
        const previousReturns = await tx
          .select({ items: returns.items })
          .from(returns)
          .where(eq(returns.orderId, input.orderId));

        const previouslyReturnedByBatch = new Map<number, number>();
        for (const prev of previousReturns) {
          const prevItems = prev.items as Array<{
            batchId: number;
            quantity: string;
          }>;
          if (Array.isArray(prevItems)) {
            for (const pi of prevItems) {
              const qty = parseFloat(pi.quantity || "0");
              if (qty > 0) {
                previouslyReturnedByBatch.set(
                  pi.batchId,
                  (previouslyReturnedByBatch.get(pi.batchId) || 0) + qty
                );
              }
            }
          }
        }

        // Validate each return item
        for (const item of input.items) {
          const returnQty = parseFloat(item.quantity);
          if (!Number.isFinite(returnQty) || returnQty <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Return quantity for batch #${item.batchId} must be a positive number.`,
            });
          }

          const orderedQty = orderedQtyByBatch.get(item.batchId);
          if (orderedQty === undefined) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Batch #${item.batchId} was not part of order #${input.orderId}.`,
            });
          }

          const alreadyReturned =
            previouslyReturnedByBatch.get(item.batchId) || 0;
          if (alreadyReturned + returnQty > orderedQty) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Return quantity for batch #${item.batchId} exceeds remaining returnable quantity. Ordered: ${orderedQty}, already returned: ${alreadyReturned}, requested: ${returnQty}.`,
            });
          }
        }

        // Create return record - map extended reasons to database-compatible values
        const mappedReason = mapReturnReason(input.reason);
        const [returnRecord] = await tx.insert(returns).values({
          orderId: input.orderId,
          items: input.items as unknown,
          returnReason: mappedReason,
          notes: input.notes ? sanitizeNotesText(input.notes) : null,
          processedBy: userId,
        });

        // If restocking inventory, create inventory movements
        if (input.restockInventory) {
          for (const item of input.items) {
            // Get current batch quantity
            const [batch] = await tx
              .select()
              .from(batches)
              .where(
                and(eq(batches.id, item.batchId), isNull(batches.deletedAt))
              )
              .for("update"); // Row-level lock

            if (!batch) {
              throw new Error(`Batch ${item.batchId} not found`);
            }

            const currentQty = parseFloat(batch.onHandQty || "0");
            const returnQty = parseFloat(item.quantity);
            const newQty = currentQty + returnQty;

            // Update batch quantity
            await tx
              .update(batches)
              .set({ onHandQty: newQty.toString() })
              .where(eq(batches.id, item.batchId));

            // Record inventory movement
            await tx.insert(inventoryMovements).values({
              batchId: item.batchId,
              inventoryMovementType: "RETURN",
              quantityChange: `+${returnQty}`,
              quantityBefore: currentQty.toString(),
              quantityAfter: newQty.toString(),
              referenceType: "RETURN",
              referenceId: returnRecord.insertId,
              notes: item.reason || input.notes,
              performedBy: userId,
            });
          }
        }

        // ACC-003: Calculate return value from order items
        // Parse order items to get unit prices
        let orderItems: Array<{
          batchId: number;
          unitPrice: number;
          quantity: number;
        }> = [];
        try {
          orderItems =
            typeof order.items === "string"
              ? JSON.parse(order.items)
              : (order.items as typeof orderItems) || [];
        } catch {
          logger.warn({
            msg: "[Returns] Could not parse order items",
            orderId: input.orderId,
          });
        }

        // Map batch IDs to unit prices from original order
        const batchPriceMap = new Map<number, number>();
        for (const item of orderItems) {
          batchPriceMap.set(item.batchId, item.unitPrice || 0);
        }

        // Calculate return value using original order prices
        const returnValue = input.items.reduce((total, item) => {
          const unitPrice = batchPriceMap.get(item.batchId) || 0;
          return total + parseFloat(item.quantity) * unitPrice;
        }, 0);

        // ACC-003: Prefer the most recent non-DRAFT invoice with posted ledger
        // entries. Fall back to the newest non-DRAFT invoice, then the newest
        // non-VOID invoice only when no better accounting target exists.
        const orderInvoices = await tx
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.referenceType, "ORDER"),
              eq(invoices.referenceId, input.orderId),
              ne(invoices.status, "VOID"),
              isNull(invoices.deletedAt)
            )
          )
          .orderBy(desc(invoices.createdAt));
        // H-6: Correctly awaiting Promise.all to avoid fire-and-forget async map
        // H-6: Correctly awaiting Promise.all to avoid fire-and-forget async map
        const orderInvoice = pickReturnAccountingInvoice(
          await Promise.all(
            orderInvoices.map(async invoice => {
              const [postedEntry] = await tx
                .select({ id: ledgerEntries.id })
                .from(ledgerEntries)
                .where(
                  and(
                    eq(ledgerEntries.referenceType, "INVOICE"),
                    eq(ledgerEntries.referenceId, invoice.id)
                  )
                )
                .limit(1);

              return {
                ...invoice,
                hasLedgerEntries: postedEntry ? 1 : 0,
              };
            })
          )
        );

        let creditId: number | undefined;

        // ACC-003: Create credit memo if there was an invoice and return has value
        if (orderInvoice && returnValue > 0) {
          const creditNumber = await creditsDb.generateCreditNumber(
            "CR-RTN",
            tx
          );
          const creditAmount = returnValue.toFixed(2);
          const credit = await creditsDb.createCredit(
            {
              creditNumber,
              clientId: order.clientId,
              creditAmount,
              amountRemaining: creditAmount,
              creditReason: "RETURN",
              transactionId: orderInvoice.id,
              notes: `Return for order #${order.orderNumber || order.id}: ${input.notes || input.reason}`,
              createdBy: userId,
            },
            tx
          );
          creditId = credit.id;

          logger.info({
            msg: "[Returns] Credit memo created for return",
            creditId,
            creditNumber,
            amount: returnValue,
            returnId: returnRecord.insertId,
          });

          // ACC-003: Create reversing GL entries
          try {
            await reverseGLEntries(
              "INVOICE",
              orderInvoice.id,
              `Return: ${input.reason}`,
              userId
            );
            logger.info({
              msg: "[Returns] GL entries reversed for return",
              invoiceId: orderInvoice.id,
              returnId: returnRecord.insertId,
            });
          } catch (error) {
            if (
              error instanceof GLPostingError &&
              error.code === "NO_ENTRIES_TO_REVERSE"
            ) {
              logger.warn({
                msg: "[Returns] No GL entries to reverse (may be draft invoice)",
                invoiceId: orderInvoice.id,
              });
            } else {
              throw error;
            }
          }

          // ACC-003: Update client totalOwed (reduce AR balance)
          await tx.execute(sql`
            UPDATE clients
            SET totalOwed = GREATEST(0, CAST(totalOwed AS DECIMAL(15,2)) - ${returnValue})
            WHERE id = ${order.clientId}
          `);

          logger.info({
            msg: "[Returns] Client AR balance reduced for return",
            clientId: order.clientId,
            amountReduced: returnValue,
          });
        }

        logger.info({
          msg: "[Returns] Return created",
          returnId: returnRecord.insertId,
          creditId,
          glEntriesReversed: !!orderInvoice,
        });

        return { id: returnRecord.insertId, creditId };
      });

      return result;
    }),

  // Approve a return (updates status from PENDING to APPROVED)
  approve: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        approvalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      logger.info({ msg: "[Returns] Approving return", returnId: input.id });

      // Get the return
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // SM-003: Validate status transition (DISC-RET-002: use column, fallback to notes)
      const currentStatus =
        returnRecord.status ?? extractReturnStatus(returnRecord.notes);
      if (!isValidReturnStatusTransition(currentStatus, "APPROVED")) {
        throw new Error(getReturnTransitionError(currentStatus, "APPROVED"));
      }

      // Update notes with approval info
      const updatedNotes = [
        returnRecord.notes,
        `[APPROVED by User #${userId} at ${new Date().toISOString()}]`,
        input.approvalNotes
          ? `Approval notes: ${sanitizeNotesText(input.approvalNotes)}`
          : null,
      ]
        .filter(Boolean)
        .join(" | ");

      // DISC-RET-002: Set status column alongside notes audit trail
      await db
        .update(returns)
        .set({ status: "APPROVED", notes: updatedNotes })
        .where(eq(returns.id, input.id));

      logger.info({ msg: "[Returns] Return approved", returnId: input.id });

      return { success: true, returnId: input.id };
    }),

  // Reject a return
  reject: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        rejectionReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      logger.info({ msg: "[Returns] Rejecting return", returnId: input.id });

      // Get the return
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // SM-003: Validate status transition (DISC-RET-002: use column, fallback to notes)
      const currentStatus =
        returnRecord.status ?? extractReturnStatus(returnRecord.notes);
      if (!isValidReturnStatusTransition(currentStatus, "REJECTED")) {
        throw new Error(getReturnTransitionError(currentStatus, "REJECTED"));
      }

      // Update notes with rejection info
      const updatedNotes = [
        returnRecord.notes,
        `[REJECTED by User #${userId} at ${new Date().toISOString()}]`,
        `Rejection reason: ${sanitizeNotesText(input.rejectionReason)}`,
      ]
        .filter(Boolean)
        .join(" | ");

      // DISC-RET-002: Set status column alongside notes audit trail
      await db
        .update(returns)
        .set({ status: "REJECTED", notes: updatedNotes })
        .where(eq(returns.id, input.id));

      logger.info({ msg: "[Returns] Return rejected", returnId: input.id });

      return { success: true, returnId: input.id };
    }),

  // Receive items from a return
  receive: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        receivedItems: z.array(
          z.object({
            batchId: z.number(),
            receivedQuantity: z.string(),
            actualCondition: itemConditionEnum,
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      logger.info({
        msg: "[Returns] Receiving return items",
        returnId: input.id,
      });

      // Get the return
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, input.id));

      if (!returnRecord) {
        throw new Error("Return not found");
      }

      // SM-003: Validate status transition (DISC-RET-002: use column, fallback to notes)
      const currentStatus =
        returnRecord.status ?? extractReturnStatus(returnRecord.notes);
      if (!isValidReturnStatusTransition(currentStatus, "RECEIVED")) {
        throw new Error(getReturnTransitionError(currentStatus, "RECEIVED"));
      }

      let originalReturnItems: ReturnItemQuantity[] = [];
      try {
        originalReturnItems =
          typeof returnRecord.items === "string"
            ? JSON.parse(returnRecord.items)
            : (returnRecord.items as ReturnItemQuantity[]) || [];
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Return item data is invalid; cannot receive items safely.",
        });
      }
      validateReceivedReturnQuantities(
        originalReturnItems,
        input.receivedItems
      );

      // Process each received item
      await db.transaction(async tx => {
        // CRIT-3: Check which batches were actually restocked by returns.create
        // to avoid draining inventory that was never added
        const priorRestockMovements = await tx
          .select({
            batchId: inventoryMovements.batchId,
            quantityChange: inventoryMovements.quantityChange,
          })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.inventoryMovementType, "RETURN"),
              eq(inventoryMovements.referenceType, "RETURN"),
              eq(inventoryMovements.referenceId, input.id),
              isNull(inventoryMovements.deletedAt)
            )
          );

        const batchesRestockedByCreate = new Set(
          priorRestockMovements
            .filter(m => parseFloat(m.quantityChange || "0") > 0)
            .map(m => m.batchId)
        );

        for (const item of input.receivedItems) {
          const receivedQty = parseFloat(item.receivedQuantity);

          // If sellable, ensure inventory was restored
          if (item.actualCondition === "SELLABLE" && receivedQty > 0) {
            // Get current batch quantity
            const [batch] = await tx
              .select()
              .from(batches)
              .where(
                and(eq(batches.id, item.batchId), isNull(batches.deletedAt))
              )
              .for("update");

            if (batch) {
              const currentQty = parseFloat(batch.onHandQty || "0");

              // Record inventory movement for condition verification
              await tx.insert(inventoryMovements).values({
                batchId: item.batchId,
                inventoryMovementType: "ADJUSTMENT",
                quantityChange: "0",
                quantityBefore: currentQty.toString(),
                quantityAfter: currentQty.toString(),
                referenceType: "RETURN_RECEIVE",
                referenceId: input.id,
                notes: `Return received - Condition: ${item.actualCondition}. ${item.notes || ""}`,
                performedBy: userId,
              });

              logger.info({
                msg: "[Returns] Item received",
                returnId: input.id,
                batchId: item.batchId,
                condition: item.actualCondition,
              });
            }
          } else if (
            item.actualCondition === "QUARANTINE" &&
            batchesRestockedByCreate.has(item.batchId)
          ) {
            // CRIT-3: Only move from onHandQty if create actually restocked this batch
            const [batch] = await tx
              .select()
              .from(batches)
              .where(
                and(eq(batches.id, item.batchId), isNull(batches.deletedAt))
              )
              .for("update");

            if (batch) {
              const currentOnHand = parseFloat(batch.onHandQty || "0");
              const currentQuarantine = parseFloat(batch.quarantineQty || "0");

              // Move quantity from onHand to quarantine
              const newOnHand = Math.max(0, currentOnHand - receivedQty);
              const newQuarantine = currentQuarantine + receivedQty;

              await tx
                .update(batches)
                .set({
                  onHandQty: newOnHand.toString(),
                  quarantineQty: newQuarantine.toString(),
                  // If all inventory is now quarantined, update status
                  ...(newOnHand === 0 && newQuarantine > 0
                    ? { batchStatus: "QUARANTINED" }
                    : {}),
                })
                .where(eq(batches.id, item.batchId));

              await tx.insert(inventoryMovements).values({
                batchId: item.batchId,
                inventoryMovementType: "QUARANTINE",
                quantityChange: `-${receivedQty}`,
                quantityBefore: currentOnHand.toString(),
                quantityAfter: newOnHand.toString(),
                referenceType: "RETURN_RECEIVE",
                referenceId: input.id,
                notes: `Return received - Item quarantined. ${item.notes || ""}`,
                performedBy: userId,
              });

              logger.info({
                msg: "[Returns] Item quarantined",
                returnId: input.id,
                batchId: item.batchId,
                quantityQuarantined: receivedQty,
              });
            }
          } else if (
            (item.actualCondition === "DAMAGED" ||
              item.actualCondition === "DESTROYED") &&
            batchesRestockedByCreate.has(item.batchId)
          ) {
            // CRIT-3: Only reverse inventory if create actually restocked this batch
            const [batch] = await tx
              .select()
              .from(batches)
              .where(
                and(eq(batches.id, item.batchId), isNull(batches.deletedAt))
              )
              .for("update");

            if (batch) {
              const currentQty = parseFloat(batch.onHandQty || "0");
              const newQty = Math.max(0, currentQty - receivedQty);

              await tx
                .update(batches)
                .set({ onHandQty: newQty.toString() })
                .where(eq(batches.id, item.batchId));

              await tx.insert(inventoryMovements).values({
                batchId: item.batchId,
                inventoryMovementType: "DISPOSAL",
                quantityChange: `-${receivedQty}`,
                quantityBefore: currentQty.toString(),
                quantityAfter: newQty.toString(),
                referenceType: "RETURN_RECEIVE",
                referenceId: input.id,
                notes: `Return received - Item ${item.actualCondition.toLowerCase()}. ${item.notes || ""}`,
                performedBy: userId,
              });

              logger.info({
                msg: "[Returns] Damaged item - inventory adjusted",
                returnId: input.id,
                batchId: item.batchId,
                quantityRemoved: receivedQty,
              });
            }
          }
        }

        // Update return notes with receiving info
        const receivingDetails = input.receivedItems
          .map(
            item =>
              `Batch #${item.batchId}: ${item.receivedQuantity} units (${item.actualCondition})`
          )
          .join(", ");

        const updatedNotes = [
          returnRecord.notes,
          `[RECEIVED by User #${userId} at ${new Date().toISOString()}]`,
          `Received items: ${receivingDetails}`,
        ]
          .filter(Boolean)
          .join(" | ");

        // DISC-RET-002: Set status column alongside notes audit trail
        await tx
          .update(returns)
          .set({ status: "RECEIVED", notes: updatedNotes })
          .where(eq(returns.id, input.id));
      });

      logger.info({
        msg: "[Returns] Return items received",
        returnId: input.id,
      });

      return { success: true, returnId: input.id };
    }),

  // Process a return and optionally issue credit
  process: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number(),
        issueCredit: z.boolean().default(true),
        creditAmount: z.number().optional(),
        creditNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      logger.info({
        msg: "[Returns] Processing return",
        returnId: input.id,
        issueCredit: input.issueCredit,
      });

      // Wrap in transaction with row lock to prevent concurrent double-credit (QA #4)
      const { creditId: resultCreditId } = await db.transaction(async tx => {
        // Lock the return row to serialize concurrent process calls
        const [returnRecord] = await tx
          .select()
          .from(returns)
          .where(eq(returns.id, input.id))
          .for("update");

        if (!returnRecord) {
          throw new Error("Return not found");
        }

        // SM-003: Validate status transition (DISC-RET-002: use column, fallback to notes)
        const currentStatus =
          returnRecord.status ?? extractReturnStatus(returnRecord.notes);
        if (!isValidReturnStatusTransition(currentStatus, "PROCESSED")) {
          throw new Error(getReturnTransitionError(currentStatus, "PROCESSED"));
        }

        // Get order to find client
        const [order] = await tx
          .select({
            id: orders.id,
            clientId: orders.clientId,
            total: orders.total,
          })
          .from(orders)
          .where(
            and(eq(orders.id, returnRecord.orderId), isNull(orders.deletedAt))
          );

        if (!order) {
          throw new Error("Order not found for this return");
        }

        if (!order.clientId) {
          throw new Error("Order has no client associated");
        }

        let creditId: number | null = null;

        // DISC-RET-001: Guard against double credit issuance.
        // returns.create auto-issues credit (linked via transactionId → invoice).
        // If a RETURN credit already exists for this order's invoice, skip.
        // IMP-2: Exclude VOID invoices — voided invoices should not generate credits.
        // Prefer the most recent posted invoice rather than whichever invoice was
        // created last, so we match the actual financial posting when drafts or
        // reissued invoices coexist on the same order.
        const orderInvoices = await tx
          .select({ id: invoices.id, status: invoices.status })
          .from(invoices)
          .where(
            and(
              eq(invoices.referenceType, "ORDER"),
              eq(invoices.referenceId, returnRecord.orderId),
              ne(invoices.status, "VOID"),
              isNull(invoices.deletedAt)
            )
          )
          .orderBy(desc(invoices.createdAt));
        const orderInvoice = pickReturnAccountingInvoice(
          await Promise.all(
            orderInvoices.map(async invoice => {
              const [postedEntry] = await tx
                .select({ id: ledgerEntries.id })
                .from(ledgerEntries)
                .where(
                  and(
                    eq(ledgerEntries.referenceType, "INVOICE"),
                    eq(ledgerEntries.referenceId, invoice.id)
                  )
                )
                .limit(1);

              return {
                ...invoice,
                hasLedgerEntries: postedEntry ? 1 : 0,
              };
            })
          )
        );

        let creditAlreadyExists = false;
        if (orderInvoice) {
          const [existing] = await tx
            .select({ id: credits.id })
            .from(credits)
            .where(
              and(
                eq(credits.clientId, order.clientId),
                eq(credits.creditReason, "RETURN"),
                eq(credits.transactionId, orderInvoice.id)
              )
            )
            .limit(1);

          if (existing) {
            creditAlreadyExists = true;
            creditId = existing.id;
            logger.warn({
              msg: "[Returns] DISC-RET-001: Credit already issued at return creation — skipping duplicate",
              returnId: input.id,
              existingCreditId: existing.id,
              invoiceId: orderInvoice.id,
            });
          }
        }

        // Issue credit if requested AND not already issued
        if (input.issueCredit && !creditAlreadyExists) {
          // Calculate credit amount based on returned items
          let calculatedAmount = input.creditAmount;

          if (!calculatedAmount) {
            // Calculate from items - this is a simplified calculation
            const items = returnRecord.items as Array<{ quantity: string }>;
            const totalQty = items.reduce(
              (sum, item) => sum + parseFloat(item.quantity || "0"),
              0
            );
            const orderTotal = parseFloat(order.total || "0");
            // Proportional calculation (simplified)
            calculatedAmount =
              orderTotal > 0 ? Math.min(orderTotal, totalQty * 10) : 0;
          }

          if (calculatedAmount > 0) {
            // Generate credit number
            const creditNumber = await creditsDb.generateCreditNumber("CR", tx);

            // Create the credit — include transactionId when invoice exists
            // so the creditAlreadyExists guard can catch duplicates (IMP-3)
            const credit = await creditsDb.createCredit(
              {
                creditNumber,
                clientId: order.clientId,
                creditAmount: calculatedAmount.toFixed(2),
                amountRemaining: calculatedAmount.toFixed(2),
                amountUsed: "0",
                creditReason: "RETURN",
                transactionId: orderInvoice?.id,
                notes: input.creditNotes || `Credit for return #${input.id}`,
                createdBy: userId,
                creditStatus: "ACTIVE",
              },
              tx
            );

            creditId = credit.id;

            logger.info({
              msg: "[Returns] Credit issued for return",
              returnId: input.id,
              creditId: credit.id,
              creditAmount: calculatedAmount,
            });
          }
        }

        // Update return notes with processing info
        const updatedNotes = [
          returnRecord.notes,
          `[PROCESSED by User #${userId} at ${new Date().toISOString()}]`,
          creditId ? `Credit issued: Credit #${creditId}` : "No credit issued",
          input.creditNotes ? sanitizeNotesText(input.creditNotes) : null,
        ]
          .filter(Boolean)
          .join(" | ");

        // DISC-RET-002: Set status column alongside notes audit trail
        await tx
          .update(returns)
          .set({ status: "PROCESSED", notes: updatedNotes })
          .where(eq(returns.id, input.id));

        return { creditId };
      });

      logger.info({
        msg: "[Returns] Return processed",
        returnId: input.id,
        creditId: resultCreditId,
      });

      return {
        success: true,
        returnId: input.id,
        creditId: resultCreditId,
      };
    }),

  // Get returns by order
  getByOrder: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      return await db
        .select()
        .from(returns)
        .where(eq(returns.orderId, input.orderId))
        .orderBy(desc(returns.processedAt));
    }),

  // Get return statistics
  getStats: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // IMP-4: DAMAGED_IN_TRANSIT and QUALITY_ISSUE are mapped to DEFECTIVE
      // by mapReturnReason before storage, so they never appear in the DB.
      // The defectiveCount includes all three mapped reasons.
      const stats = await db
        .select({
          totalReturns: sql<number>`COUNT(*)`,
          defectiveCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'DEFECTIVE' THEN 1 ELSE 0 END)`,
          wrongItemCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'WRONG_ITEM' THEN 1 ELSE 0 END)`,
          notAsDescribedCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'NOT_AS_DESCRIBED' THEN 1 ELSE 0 END)`,
          customerChangedMindCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'CUSTOMER_CHANGED_MIND' THEN 1 ELSE 0 END)`,
          otherCount: sql<number>`SUM(CASE WHEN ${returns.returnReason} = 'OTHER' THEN 1 ELSE 0 END)`,
        })
        .from(returns);

      // Get returns by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyStats = await db
        .select({
          month: sql<string>`DATE_FORMAT(${returns.processedAt}, '%Y-%m')`,
          count: sql<number>`COUNT(*)`,
        })
        .from(returns)
        .where(sql`${returns.processedAt} >= ${sixMonthsAgo}`)
        .groupBy(sql`DATE_FORMAT(${returns.processedAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${returns.processedAt}, '%Y-%m')`);

      return {
        totalReturns: Number(stats[0]?.totalReturns || 0),
        defectiveCount: Number(stats[0]?.defectiveCount || 0),
        wrongItemCount: Number(stats[0]?.wrongItemCount || 0),
        notAsDescribedCount: Number(stats[0]?.notAsDescribedCount || 0),
        customerChangedMindCount: Number(
          stats[0]?.customerChangedMindCount || 0
        ),
        otherCount: Number(stats[0]?.otherCount || 0),
        byReason: {
          DEFECTIVE: Number(stats[0]?.defectiveCount || 0),
          WRONG_ITEM: Number(stats[0]?.wrongItemCount || 0),
          NOT_AS_DESCRIBED: Number(stats[0]?.notAsDescribedCount || 0),
          CUSTOMER_CHANGED_MIND: Number(
            stats[0]?.customerChangedMindCount || 0
          ),
          OTHER: Number(stats[0]?.otherCount || 0),
        },
        monthly: monthlyStats.map(m => ({
          month: m.month,
          count: Number(m.count),
        })),
      };
    }),

  // Get returns summary for dashboard
  getSummary: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      logger.info({ msg: "[Returns] Getting returns summary" });

      // Get total counts
      const [totalCounts] = await db
        .select({
          totalReturns: sql<number>`COUNT(*)`,
        })
        .from(returns);

      // Get returns from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [recentCounts] = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(returns)
        .where(sql`${returns.processedAt} >= ${thirtyDaysAgo}`);

      // Get top return reasons
      const topReasons = await db
        .select({
          reason: returns.returnReason,
          count: sql<number>`COUNT(*)`,
        })
        .from(returns)
        .groupBy(returns.returnReason)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(5);

      return {
        totalReturns: Number(totalCounts?.totalReturns || 0),
        returnsLast30Days: Number(recentCounts?.count || 0),
        topReasons: topReasons.map(r => ({
          reason: r.reason,
          count: Number(r.count),
        })),
      };
    }),
});
