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
  orderItems,
  payments,
  bills,
  inventory,
  inventoryMovements,
  users,
  vendors,
  journalEntries,
  journalEntryLines,
} from "../../drizzle/schema";
import { adminProcedure, router } from "../trpc";

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
        return { error: "Client not found" };
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
          createdAt: payments.createdAt,
          createdByName: users.name,
          reference: payments.reference,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(eq(payments.clientId, clientId))
        .orderBy(desc(payments.createdAt));

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
          date: payment.createdAt || new Date(),
          createdBy: payment.createdByName || "System",
          reference: payment.reference || `PAY-${payment.id}`,
        });
      }

      // Sort by date descending
      transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Calculate running balance (from oldest to newest)
      const sortedAsc = [...transactions].reverse();
      let runningBalance = 0;
      const withRunningBalance = sortedAsc.map((t) => {
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
          id: inventory.id,
          strainName: inventory.strainName,
          quantity: inventory.quantity,
          reservedQuantity: inventory.reservedQuantity,
        })
        .from(inventory)
        .where(eq(inventory.id, batchId))
        .limit(1);

      if (!batch) {
        return { error: "Batch not found" };
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
          movementType: inventoryMovements.movementType,
          quantity: inventoryMovements.quantity,
          reason: inventoryMovements.reason,
          createdAt: inventoryMovements.createdAt,
          createdByName: users.name,
          referenceId: inventoryMovements.referenceId,
          referenceType: inventoryMovements.referenceType,
        })
        .from(inventoryMovements)
        .leftJoin(users, eq(inventoryMovements.createdBy, users.id))
        .where(and(eq(inventoryMovements.batchId, batchId), ...dateFilter))
        .orderBy(desc(inventoryMovements.createdAt));

      // Calculate running total
      const sortedAsc = [...movements].reverse();
      let runningTotal = 0;
      const withRunningTotal = sortedAsc.map((m) => {
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
        batchName: batch.strainName,
        currentQuantity: parseFloat(batch.quantity || "0"),
        reservedQuantity: parseFloat(batch.reservedQuantity || "0"),
        availableQuantity:
          parseFloat(batch.quantity || "0") -
          parseFloat(batch.reservedQuantity || "0"),
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
        return { error: "Order not found" };
      }

      // Get line items
      const lineItems = await db
        .select({
          id: orderItems.id,
          productName: orderItems.productName,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          lineTotal: orderItems.lineTotal,
          discount: orderItems.discount,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // Get payments for this order
      const orderPayments = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          createdAt: payments.createdAt,
          createdByName: users.name,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(eq(payments.orderId, orderId));

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
        formula: "Sum(Line Items) - Sum(Discounts) = Total; Total - Payments = Balance Due",
        lineItems: lineItems.map((li) => ({
          id: li.id,
          productName: li.productName,
          quantity: parseFloat(li.quantity || "0"),
          unitPrice: parseFloat(li.unitPrice || "0"),
          lineTotal: parseFloat(li.lineTotal || "0"),
          discount: parseFloat(li.discount || "0"),
        })),
        payments: orderPayments.map((p) => ({
          id: p.id,
          amount: parseFloat(p.amount || "0"),
          method: p.paymentMethod,
          date: p.createdAt,
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
          totalOwed: vendors.totalOwed,
        })
        .from(vendors)
        .where(eq(vendors.id, vendorId))
        .limit(1);

      if (!vendor) {
        return { error: "Vendor not found" };
      }

      // Build date filter for bills
      const billDateFilter = [];
      if (dateFrom) billDateFilter.push(gte(bills.createdAt, dateFrom));
      if (dateTo) billDateFilter.push(lte(bills.createdAt, dateTo));

      // Get all bills for this vendor
      const vendorBills = await db
        .select({
          id: bills.id,
          billNumber: bills.billNumber,
          amount: bills.amount,
          createdAt: bills.createdAt,
          createdByName: users.name,
        })
        .from(bills)
        .leftJoin(users, eq(bills.createdBy, users.id))
        .where(and(eq(bills.vendorId, vendorId), ...billDateFilter))
        .orderBy(desc(bills.createdAt));

      // Get all payments to this vendor
      const vendorPayments = await db
        .select({
          id: payments.id,
          amount: payments.amount,
          paymentMethod: payments.paymentMethod,
          createdAt: payments.createdAt,
          createdByName: users.name,
          reference: payments.reference,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(eq(payments.vendorId, vendorId))
        .orderBy(desc(payments.createdAt));

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

      // Add bills (positive - increases amount owed)
      for (const bill of vendorBills) {
        transactions.push({
          id: bill.id,
          type: "BILL",
          description: `Bill ${bill.billNumber}`,
          amount: parseFloat(bill.amount || "0"),
          date: bill.createdAt || new Date(),
          createdBy: bill.createdByName || "System",
          reference: bill.billNumber || `BILL-${bill.id}`,
        });
      }

      // Add payments (negative - decreases amount owed)
      for (const payment of vendorPayments) {
        transactions.push({
          id: payment.id,
          type: "PAYMENT",
          description: `Payment via ${payment.paymentMethod || "Unknown"}`,
          amount: -parseFloat(payment.amount || "0"),
          date: payment.createdAt || new Date(),
          createdBy: payment.createdByName || "System",
          reference: payment.reference || `PAY-${payment.id}`,
        });
      }

      // Sort by date descending
      transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Calculate running balance
      const sortedAsc = [...transactions].reverse();
      let runningBalance = 0;
      const withRunningBalance = sortedAsc.map((t) => {
        runningBalance += t.amount;
        return { ...t, runningBalance };
      });

      withRunningBalance.reverse();

      // Paginate
      const paginatedTransactions = withRunningBalance.slice(
        offset,
        offset + pageSize
      );

      return {
        vendorName: vendor.name,
        currentBalance: parseFloat(vendor.totalOwed || "0"),
        formula: "Sum(Bills) - Sum(Payments)",
        totalTransactions: transactions.length,
        page,
        pageSize,
        transactions: paginatedTransactions,
        summary: {
          totalBills: vendorBills.reduce(
            (sum, b) => sum + parseFloat(b.amount || "0"),
            0
          ),
          totalPayments: vendorPayments.reduce(
            (sum, p) => sum + parseFloat(p.amount || "0"),
            0
          ),
        },
      };
    }),

  /**
   * Get account balance breakdown (for accounting module)
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
      const { accountId, dateFrom, dateTo, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      // Build date filter
      const dateFilter = [];
      if (dateFrom) dateFilter.push(gte(journalEntries.entryDate, dateFrom));
      if (dateTo) dateFilter.push(lte(journalEntries.entryDate, dateTo));

      // Get all journal entry lines for this account
      const entries = await db
        .select({
          id: journalEntryLines.id,
          entryId: journalEntryLines.journalEntryId,
          debit: journalEntryLines.debit,
          credit: journalEntryLines.credit,
          description: journalEntryLines.description,
          entryDate: journalEntries.entryDate,
          entryDescription: journalEntries.description,
          createdByName: users.name,
        })
        .from(journalEntryLines)
        .innerJoin(
          journalEntries,
          eq(journalEntryLines.journalEntryId, journalEntries.id)
        )
        .leftJoin(users, eq(journalEntries.createdBy, users.id))
        .where(and(eq(journalEntryLines.accountId, accountId), ...dateFilter))
        .orderBy(desc(journalEntries.entryDate));

      // Calculate running balance
      const sortedAsc = [...entries].reverse();
      let runningBalance = 0;
      const withRunningBalance = sortedAsc.map((e) => {
        const debit = parseFloat(e.debit || "0");
        const credit = parseFloat(e.credit || "0");
        runningBalance += debit - credit;
        return {
          id: e.id,
          entryId: e.entryId,
          type: debit > 0 ? "DEBIT" : "CREDIT",
          description: e.description || e.entryDescription,
          debit,
          credit,
          net: debit - credit,
          runningBalance,
          date: e.entryDate,
          createdBy: e.createdByName || "System",
          reference: `JE-${e.entryId}`,
        };
      });

      withRunningBalance.reverse();

      // Paginate
      const paginatedEntries = withRunningBalance.slice(
        offset,
        offset + pageSize
      );

      const totalDebits = entries.reduce(
        (sum, e) => sum + parseFloat(e.debit || "0"),
        0
      );
      const totalCredits = entries.reduce(
        (sum, e) => sum + parseFloat(e.credit || "0"),
        0
      );

      return {
        currentBalance: totalDebits - totalCredits,
        formula: "Sum(Debits) - Sum(Credits)",
        totalEntries: entries.length,
        page,
        pageSize,
        entries: paginatedEntries,
        summary: {
          totalDebits,
          totalCredits,
        },
      };
    }),
});
