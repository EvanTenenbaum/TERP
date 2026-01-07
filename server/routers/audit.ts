/**
 * WS-005: Audit Router
 * Provides "No Black Box" audit trail for all calculated fields
 */

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import {
  clients,
  orders,
  orderLineItems,
  payments,
  bills,
  batches,
  inventoryMovements,
  users,
  vendors,
} from "../../drizzle/schema";
import { adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";

export const auditRouter = router({
  /**
   * Get client tab balance breakdown
   * Shows all transactions that contribute to the current balance
   */
  getClientTabBreakdown: adminProcedure
    .input(
      z.object({
        clientId: z.number(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { clientId, dateFrom, dateTo, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      // Get client info
      const [client] = await db
        .select({
          id: clients.id,
          name: clients.name,
          totalOwed: clients.totalOwed,
        })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Build date filter
      const dateFilter = [];
      if (dateFrom) dateFilter.push(gte(orders.createdAt, dateFrom));
      if (dateTo) dateFilter.push(lte(orders.createdAt, dateTo));

      // Get all orders for this client
      const clientOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          total: orders.total,
          createdAt: orders.createdAt,
          createdByName: users.name,
        })
        .from(orders)
        .leftJoin(users, eq(orders.createdBy, users.id))
        .where(
          and(
            eq(orders.clientId, clientId),
            eq(orders.isDraft, false),
            ...dateFilter
          )
        )
        .orderBy(desc(orders.createdAt));

      // Get all payments for this client
      const clientPayments = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          paymentDate: payments.paymentDate,
          createdByName: users.name,
          reference: payments.referenceNumber,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(eq(payments.customerId, clientId))
        .orderBy(desc(payments.paymentDate));

      // Combine and sort all transactions
      type Transaction = {
        id: number;
        type: "ORDER" | "PAYMENT" | "CREDIT" | "REFUND" | "ADJUSTMENT";
        description: string;
        amount: number;
        date: Date;
        createdBy: string;
        reference: string;
      };

      const transactions: Transaction[] = [];

      // Add orders (positive - increases balance)
      for (const order of clientOrders) {
        transactions.push({
          id: order.id,
          type: "ORDER",
          description: `Order ${order.orderNumber}`,
          amount: parseFloat(order.total || "0"),
          date: order.createdAt || new Date(),
          createdBy: order.createdByName || "System",
          reference: order.orderNumber || `ORD-${order.id}`,
        });
      }

      // Add payments (negative - decreases balance)
      for (const payment of clientPayments) {
        transactions.push({
          id: payment.id,
          type: "PAYMENT",
          description: `Payment via ${payment.paymentMethod || "Unknown"}`,
          amount: -parseFloat(payment.amount || "0"),
          date: payment.paymentDate
            ? new Date(payment.paymentDate)
            : new Date(),
          createdBy: payment.createdByName || "System",
          reference: payment.reference || `PAY-${payment.id}`,
        });
      }

      // Sort by date descending
      transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Calculate running balance (from oldest to newest)
      const sortedAsc = [...transactions].reverse();
      let runningBalance = 0;
      const withRunningBalance = sortedAsc.map(t => {
        runningBalance += t.amount;
        return { ...t, runningBalance };
      });

      // Reverse back to descending order
      withRunningBalance.reverse();

      // Paginate
      const paginatedTransactions = withRunningBalance.slice(
        offset,
        offset + pageSize
      );

      return {
        clientName: client.name,
        currentBalance: parseFloat(client.totalOwed || "0"),
        formula: "Sum(Orders) - Sum(Payments) + Sum(Credits) - Sum(Refunds)",
        totalTransactions: transactions.length,
        page,
        pageSize,
        transactions: paginatedTransactions,
        summary: {
          totalOrders: clientOrders.reduce(
            (sum, o) => sum + parseFloat(o.total || "0"),
            0
          ),
          totalPayments: clientPayments.reduce(
            (sum, p) => sum + parseFloat(p.amount || "0"),
            0
          ),
        },
      };
    }),

  /**
   * Get inventory quantity breakdown
   * Shows all movements that contribute to current quantity
   */
  getInventoryBreakdown: adminProcedure
    .input(
      z.object({
        batchId: z.number(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { batchId, dateFrom, dateTo, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      // Get batch info
      const [batch] = await db
        .select({
          id: batches.id,
          code: batches.code,
          onHandQty: batches.onHandQty,
          reservedQty: batches.reservedQty,
        })
        .from(batches)
        .where(eq(batches.id, batchId))
        .limit(1);

      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      // Build date filter
      const dateFilter = [];
      if (dateFrom)
        dateFilter.push(gte(inventoryMovements.createdAt, dateFrom));
      if (dateTo) dateFilter.push(lte(inventoryMovements.createdAt, dateTo));

      // Get all movements for this batch
      const movements = await db
        .select({
          id: inventoryMovements.id,
          movementType: inventoryMovements.inventoryMovementType,
          quantity: inventoryMovements.quantityChange,
          reason: inventoryMovements.reason,
          createdAt: inventoryMovements.createdAt,
          createdByName: users.name,
          referenceId: inventoryMovements.referenceId,
          referenceType: inventoryMovements.referenceType,
        })
        .from(inventoryMovements)
        .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
        .where(and(eq(inventoryMovements.batchId, batchId), ...dateFilter))
        .orderBy(desc(inventoryMovements.createdAt));

      // Calculate running total
      const sortedAsc = [...movements].reverse();
      let runningTotal = 0;
      const withRunningTotal = sortedAsc.map(m => {
        const qty = parseFloat(m.quantity || "0");
        runningTotal += qty;
        return {
          id: m.id,
          type: m.movementType || "UNKNOWN",
          description: m.reason || `${m.movementType} movement`,
          quantity: qty,
          runningTotal,
          date: m.createdAt || new Date(),
          createdBy: m.createdByName || "System",
          reference: m.referenceId
            ? `${m.referenceType}-${m.referenceId}`
            : `MOV-${m.id}`,
        };
      });

      // Reverse back to descending
      withRunningTotal.reverse();

      // Paginate
      const paginatedMovements = withRunningTotal.slice(
        offset,
        offset + pageSize
      );

      return {
        batchName: batch.code,
        currentQuantity: parseFloat(batch.onHandQty || "0"),
        reservedQuantity: parseFloat(batch.reservedQty || "0"),
        availableQuantity:
          parseFloat(batch.onHandQty || "0") -
          parseFloat(batch.reservedQty || "0"),
        formula: "Sum(Intake) - Sum(Sold) - Sum(Adjustments) + Sum(Returns)",
        totalMovements: movements.length,
        page,
        pageSize,
        movements: paginatedMovements,
      };
    }),

  /**
   * Get order total breakdown
   * Shows line items, discounts, payments
   */
  getOrderBreakdown: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const { orderId } = input;

      // Get order info
      const [order] = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          subtotal: orders.subtotal,
          discount: orders.discount,
          total: orders.total,
          createdAt: orders.createdAt,
          createdByName: users.name,
          clientName: clients.name,
        })
        .from(orders)
        .leftJoin(users, eq(orders.createdBy, users.id))
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Get line items from orderLineItems table
      const lineItems = await db
        .select({
          id: orderLineItems.id,
          productName: orderLineItems.productDisplayName,
          quantity: orderLineItems.quantity,
          unitPrice: orderLineItems.cogsPerUnit,
          lineTotal: orderLineItems.lineTotal,
        })
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, orderId));

      // Note: Payments are linked via invoices, not directly to orders
      // For now, we return an empty payments array until invoice linking is implemented
      const orderPayments: {
        id: number;
        amount: string;
        paymentMethod: string | null;
        paymentDate: Date;
        createdByName: string | null;
      }[] = [];

      const subtotal = parseFloat(order.subtotal || "0");
      const discount = parseFloat(order.discount || "0");
      const total = parseFloat(order.total || "0");
      const amountPaid = orderPayments.reduce(
        (sum, p) => sum + parseFloat(p.amount || "0"),
        0
      );

      return {
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        createdAt: order.createdAt,
        createdBy: order.createdByName || "System",
        calculation: {
          subtotal,
          discount,
          total,
          amountPaid,
          balanceDue: total - amountPaid,
        },
        formula:
          "Sum(Line Items) - Sum(Discounts) = Total; Total - Payments = Balance Due",
        lineItems: lineItems.map(li => ({
          id: li.id,
          productName: li.productName,
          quantity: parseFloat(li.quantity || "0"),
          unitPrice: parseFloat(li.unitPrice || "0"),
          lineTotal: parseFloat(li.lineTotal || "0"),
          discount: 0, // Discount is at order level, not line item level
        })),
        payments: orderPayments.map(p => ({
          id: p.id,
          amount: parseFloat(p.amount || "0"),
          method: p.paymentMethod,
          date: p.paymentDate,
          createdBy: p.createdByName || "System",
        })),
      };
    }),

  /**
   * Get vendor balance breakdown
   * Shows all bills and payments
   */
  getVendorBalanceBreakdown: adminProcedure
    .input(
      z.object({
        vendorId: z.number(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { vendorId, dateFrom, dateTo, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      // Get vendor info
      const [vendor] = await db
        .select({
          id: vendors.id,
          name: vendors.name,
        })
        .from(vendors)
        .where(eq(vendors.id, vendorId))
        .limit(1);

      if (!vendor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
      }

      // Build date filter for bills
      const billDateFilter = [];
      if (dateFrom) billDateFilter.push(gte(bills.billDate, dateFrom));
      if (dateTo) billDateFilter.push(lte(bills.billDate, dateTo));

      // Get all bills for this vendor
      const vendorBills = await db
        .select({
          id: bills.id,
          billNumber: bills.billNumber,
          amount: bills.totalAmount,
          billDate: bills.billDate,
          createdByName: users.name,
        })
        .from(bills)
        .leftJoin(users, eq(bills.createdBy, users.id))
        .where(and(eq(bills.vendorId, vendorId), ...billDateFilter))
        .orderBy(desc(bills.billDate));

      // Build date filter for payments
      const paymentDateFilter = [];
      if (dateFrom) paymentDateFilter.push(gte(payments.paymentDate, dateFrom));
      if (dateTo) paymentDateFilter.push(lte(payments.paymentDate, dateTo));

      // Get all payments to this vendor
      const vendorPayments = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          paymentDate: payments.paymentDate,
          createdByName: users.name,
          reference: payments.referenceNumber,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(and(eq(payments.vendorId, vendorId), ...paymentDateFilter))
        .orderBy(desc(payments.paymentDate));

      // Combine transactions
      type Transaction = {
        id: number;
        type: "BILL" | "PAYMENT";
        description: string;
        amount: number;
        date: Date;
        createdBy: string;
        reference: string;
      };

      const transactions: Transaction[] = [];

      // Add bills (positive - increases what we owe)
      for (const bill of vendorBills) {
        transactions.push({
          id: bill.id,
          type: "BILL",
          description: `Bill ${bill.billNumber}`,
          amount: parseFloat(bill.amount || "0"),
          date: bill.billDate || new Date(),
          createdBy: bill.createdByName || "System",
          reference: bill.billNumber || `BILL-${bill.id}`,
        });
      }

      // Add payments (negative - decreases what we owe)
      for (const payment of vendorPayments) {
        transactions.push({
          id: payment.id,
          type: "PAYMENT",
          description: `Payment via ${payment.paymentMethod || "Unknown"}`,
          amount: -parseFloat(payment.amount || "0"),
          date: payment.paymentDate
            ? new Date(payment.paymentDate)
            : new Date(),
          createdBy: payment.createdByName || "System",
          reference: payment.reference || `PAY-${payment.id}`,
        });
      }

      // Sort by date descending
      transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Calculate running balance
      const sortedAsc = [...transactions].reverse();
      let runningBalance = 0;
      const withRunningBalance = sortedAsc.map(t => {
        runningBalance += t.amount;
        return { ...t, runningBalance };
      });

      withRunningBalance.reverse();

      // Paginate
      const paginatedTransactions = withRunningBalance.slice(
        offset,
        offset + pageSize
      );

      // Calculate current balance
      const totalBills = vendorBills.reduce(
        (sum, b) => sum + parseFloat(b.amount || "0"),
        0
      );
      const totalPayments = vendorPayments.reduce(
        (sum, p) => sum + parseFloat(p.amount || "0"),
        0
      );

      return {
        vendorName: vendor.name,
        currentBalance: totalBills - totalPayments,
        formula: "Sum(Bills) - Sum(Payments)",
        totalTransactions: transactions.length,
        page,
        pageSize,
        transactions: paginatedTransactions,
        summary: {
          totalBills,
          totalPayments,
        },
      };
    }),

  /**
   * Get account balance breakdown (for accounting module)
   * Note: This is a placeholder - full journal entry support requires additional schema
   */
  getAccountBalanceBreakdown: adminProcedure
    .input(
      z.object({
        accountId: z.number(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const { accountId, page, pageSize } = input;

      // Return placeholder response - journal entries table not yet implemented
      return {
        accountId,
        currentBalance: 0,
        formula: "Sum(Debits) - Sum(Credits)",
        totalEntries: 0,
        page,
        pageSize,
        entries: [],
        summary: {
          totalDebits: 0,
          totalCredits: 0,
        },
        note: "Journal entry audit trail will be available in a future update",
      };
    }),

  /**
   * Get entity history (UI-002: Generic audit trail for any entity)
   * Returns audit logs for a specific entity type and ID
   */
  getEntityHistory: adminProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        fieldName: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const {
        entityType,
        entityId,
        fieldName: _fieldName,
        page,
        pageSize,
      } = input;
      const offset = (page - 1) * pageSize;

      // For now, return activity-based history from different sources based on entity type
      // This can be expanded to use a dedicated audit_logs table in the future

      // BUG-060: Added proper logging and error handling instead of silent return
      logger.info(
        { operation: 'getEntityHistory', entityType, entityId, page, pageSize },
        '[Audit] Fetching entity history'
      );

      try {
        const database = await db;
        if (!database) {
          logger.error(
            { operation: 'getEntityHistory', entityType, entityId },
            '[Audit] Database not available'
          );
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database not available',
          });
        }

        // Query based on entity type
        if (entityType === "client") {
          // Get client-related activities from orders and payments
          const clientOrders = await database
            .select({
              id: orders.id,
              action: sql<string>`'ORDER_CREATED'`,
              createdAt: orders.createdAt,
              details: orders.orderNumber,
            })
            .from(orders)
            .where(eq(orders.clientId, entityId))
            .orderBy(desc(orders.createdAt))
            .limit(pageSize)
            .offset(offset);

          logger.debug(
            { operation: 'getEntityHistory', entityType, entityId, count: clientOrders.length },
            '[Audit] Retrieved client order history'
          );

          return clientOrders.map(o => ({
            id: o.id,
            action: o.action,
            activityType: "ORDER",
            createdAt: o.createdAt,
            details: `Order ${o.details}`,
          }));
        }

        if (entityType === "transaction" || entityType === "order") {
          // Note: Payments are linked via invoices, not directly to orders
          // Return empty array until invoice linking is implemented
          logger.debug(
            { operation: 'getEntityHistory', entityType, entityId },
            '[Audit] Transaction/order history not yet implemented'
          );
          return [];
        }

        if (entityType === "batch" || entityType === "inventory") {
          // Get inventory movement history
          const movements = await database
            .select({
              id: inventoryMovements.id,
              action: inventoryMovements.inventoryMovementType,
              createdAt: inventoryMovements.createdAt,
              quantity: inventoryMovements.quantityChange,
              reason: inventoryMovements.reason,
            })
            .from(inventoryMovements)
            .where(eq(inventoryMovements.batchId, entityId))
            .orderBy(desc(inventoryMovements.createdAt))
            .limit(pageSize)
            .offset(offset);

          logger.debug(
            { operation: 'getEntityHistory', entityType, entityId, count: movements.length },
            '[Audit] Retrieved inventory movement history'
          );

          return movements.map(m => ({
            id: m.id,
            action: m.action,
            activityType: "INVENTORY_MOVEMENT",
            createdAt: m.createdAt,
            details: `${m.action}: ${m.quantity} units${m.reason ? ` - ${m.reason}` : ""}`,
          }));
        }

        // Default: return empty array for unsupported entity types
        logger.debug(
          { operation: 'getEntityHistory', entityType, entityId },
          '[Audit] Unsupported entity type - returning empty array'
        );
        return [];
      } catch (error) {
        // BUG-060: Changed from silent catch to proper error handling
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(
          { operation: 'getEntityHistory', entityType, entityId, error: errorMessage },
          '[Audit] Error fetching entity history'
        );

        // Re-throw TRPCErrors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Wrap other errors in TRPCError
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch audit history',
          cause: error,
        });
      }
    }),
});
