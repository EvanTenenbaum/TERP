/**
 * Client Ledger Router (FEAT-009 / MEET-010)
 *
 * Provides a unified ledger view for all client transactions.
 * Uses real-time query approach (NOT materialized view) for always-current data.
 *
 * Data Sources:
 * - Orders (completed) -> SALE debit
 * - Payments received -> PAYMENT_RECEIVED credit
 * - Payments sent -> PAYMENT_SENT debit
 * - Purchase orders (from client as supplier) -> PURCHASE credit
 * - Manual adjustments -> CREDIT/DEBIT
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  clients,
  orders,
  payments,
  purchaseOrders,
  clientLedgerAdjustments,
  users,
} from "../../drizzle/schema";
import { eq, and, lte, gte, inArray, desc, asc, sql, isNull } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Transaction types for the ledger
 * Direction: Debit (+) = increases what they owe, Credit (-) = decreases what they owe
 */
type LedgerTransactionType =
  | "SALE"              // Debit (+) - from orders
  | "PURCHASE"          // Credit (-) - from purchase_orders
  | "PAYMENT_RECEIVED"  // Credit (-) - from payments (received from client)
  | "PAYMENT_SENT"      // Debit (+) - from payments (sent to client as supplier)
  | "CREDIT"            // Credit (-) - manual credit adjustment
  | "DEBIT";            // Debit (+) - manual debit adjustment

interface LedgerTransaction {
  id: string;            // Unique identifier (source_type:id format)
  date: Date;
  type: LedgerTransactionType;
  description: string;
  referenceType?: string;
  referenceId?: number;
  debitAmount?: number;
  creditAmount?: number;
  runningBalance: number;
  createdBy: string;
}

interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  netChange: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format balance as plain language description
 */
function getBalanceDescription(balance: number): string {
  if (balance > 0) {
    return `They owe you $${Math.abs(balance).toFixed(2)}`;
  } else if (balance < 0) {
    return `You owe them $${Math.abs(balance).toFixed(2)}`;
  }
  return "Balance is even";
}

/**
 * Format currency for CSV export
 */
function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "";
  return amount.toFixed(2);
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

// ============================================================================
// Router
// ============================================================================

export const clientLedgerRouter = router({
  /**
   * Get client ledger with all transactions
   * Real-time query joining orders, payments, purchase orders, and adjustments
   */
  getLedger: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        clientId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        transactionTypes: z.array(z.string()).optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      logger.info({ msg: "[ClientLedger] Getting ledger", clientId: input.clientId });

      // Get client info
      const [client] = await db
        .select({
          id: clients.id,
          name: clients.name,
          teriCode: clients.teriCode,
        })
        .from(clients)
        .where(eq(clients.id, input.clientId));

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Build date filter conditions
      const startDateStr = input.startDate ? formatDateISO(input.startDate) : null;
      const endDateStr = input.endDate ? formatDateISO(input.endDate) : null;

      // Collect all transactions from different sources
      const allTransactions: LedgerTransaction[] = [];

      // 1. Orders (SALE - Debit) - completed sales to the client
      const ordersQuery = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          total: orders.total,
          createdAt: orders.createdAt,
          confirmedAt: orders.confirmedAt,
          createdByName: users.name,
        })
        .from(orders)
        .leftJoin(users, eq(orders.createdBy, users.id))
        .where(
          and(
            eq(orders.clientId, input.clientId),
            eq(orders.orderType, "SALE"),
            isNull(orders.deletedAt),
            // Only include confirmed/completed orders
            inArray(orders.saleStatus, ["CONFIRMED", "INVOICED", "PAID", "PARTIAL", "SHIPPED", "DELIVERED"])
          )
        );

      for (const order of ordersQuery) {
        const orderDate = order.confirmedAt || order.createdAt || new Date();
        const dateStr = formatDateISO(orderDate);

        // Apply date filters
        if (startDateStr && dateStr < startDateStr) continue;
        if (endDateStr && dateStr > endDateStr) continue;

        allTransactions.push({
          id: `ORDER:${order.id}`,
          date: new Date(orderDate),
          type: "SALE",
          description: `Order #${order.orderNumber}`,
          referenceType: "ORDER",
          referenceId: order.id,
          debitAmount: Number(order.total),
          creditAmount: undefined,
          runningBalance: 0, // Will be calculated later
          createdBy: order.createdByName || "System",
        });
      }

      // 2. Payments Received (PAYMENT_RECEIVED - Credit) - payments from the client
      const paymentsReceivedQuery = await db
        .select({
          id: payments.id,
          paymentNumber: payments.paymentNumber,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentMethod: payments.paymentMethod,
          createdByName: users.name,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(
          and(
            eq(payments.customerId, input.clientId),
            eq(payments.paymentType, "RECEIVED"),
            isNull(payments.deletedAt)
          )
        );

      for (const payment of paymentsReceivedQuery) {
        const dateStr = formatDateISO(payment.paymentDate);

        if (startDateStr && dateStr < startDateStr) continue;
        if (endDateStr && dateStr > endDateStr) continue;

        allTransactions.push({
          id: `PAYMENT_RECV:${payment.id}`,
          date: new Date(payment.paymentDate),
          type: "PAYMENT_RECEIVED",
          description: `Payment #${payment.paymentNumber} (${payment.paymentMethod})`,
          referenceType: "PAYMENT",
          referenceId: payment.id,
          debitAmount: undefined,
          creditAmount: Number(payment.amount),
          runningBalance: 0,
          createdBy: payment.createdByName || "System",
        });
      }

      // 3. Payments Sent (PAYMENT_SENT - Debit) - payments to the client (as supplier)
      const paymentsSentQuery = await db
        .select({
          id: payments.id,
          paymentNumber: payments.paymentNumber,
          amount: payments.amount,
          paymentDate: payments.paymentDate,
          paymentMethod: payments.paymentMethod,
          createdByName: users.name,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(
          and(
            eq(payments.vendorId, input.clientId),
            eq(payments.paymentType, "SENT"),
            isNull(payments.deletedAt)
          )
        );

      for (const payment of paymentsSentQuery) {
        const dateStr = formatDateISO(payment.paymentDate);

        if (startDateStr && dateStr < startDateStr) continue;
        if (endDateStr && dateStr > endDateStr) continue;

        allTransactions.push({
          id: `PAYMENT_SENT:${payment.id}`,
          date: new Date(payment.paymentDate),
          type: "PAYMENT_SENT",
          description: `Payment sent #${payment.paymentNumber} (${payment.paymentMethod})`,
          referenceType: "PAYMENT",
          referenceId: payment.id,
          debitAmount: Number(payment.amount),
          creditAmount: undefined,
          runningBalance: 0,
          createdBy: payment.createdByName || "System",
        });
      }

      // 4. Purchase Orders (PURCHASE - Credit) - purchases from client as supplier
      const purchaseOrdersQuery = await db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          total: purchaseOrders.total,
          orderDate: purchaseOrders.orderDate,
          confirmedAt: purchaseOrders.confirmedAt,
          createdByName: users.name,
        })
        .from(purchaseOrders)
        .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
        .where(
          and(
            eq(purchaseOrders.supplierClientId, input.clientId),
            // Only include confirmed/received purchase orders
            inArray(purchaseOrders.purchaseOrderStatus, ["CONFIRMED", "RECEIVING", "RECEIVED"])
          )
        );

      for (const po of purchaseOrdersQuery) {
        const poDate = po.confirmedAt || po.orderDate;
        const dateStr = formatDateISO(poDate);

        if (startDateStr && dateStr < startDateStr) continue;
        if (endDateStr && dateStr > endDateStr) continue;

        allTransactions.push({
          id: `PO:${po.id}`,
          date: new Date(poDate),
          type: "PURCHASE",
          description: `Purchase Order #${po.poNumber}`,
          referenceType: "PURCHASE_ORDER",
          referenceId: po.id,
          debitAmount: undefined,
          creditAmount: Number(po.total || 0),
          runningBalance: 0,
          createdBy: po.createdByName || "System",
        });
      }

      // 5. Manual Adjustments (CREDIT/DEBIT)
      const adjustmentsQuery = await db
        .select({
          id: clientLedgerAdjustments.id,
          transactionType: clientLedgerAdjustments.transactionType,
          amount: clientLedgerAdjustments.amount,
          description: clientLedgerAdjustments.description,
          effectiveDate: clientLedgerAdjustments.effectiveDate,
          createdByName: users.name,
        })
        .from(clientLedgerAdjustments)
        .leftJoin(users, eq(clientLedgerAdjustments.createdBy, users.id))
        .where(eq(clientLedgerAdjustments.clientId, input.clientId));

      for (const adj of adjustmentsQuery) {
        const dateStr = formatDateISO(adj.effectiveDate);

        if (startDateStr && dateStr < startDateStr) continue;
        if (endDateStr && dateStr > endDateStr) continue;

        const isDebit = adj.transactionType === "DEBIT";
        allTransactions.push({
          id: `ADJ:${adj.id}`,
          date: new Date(adj.effectiveDate),
          type: adj.transactionType as LedgerTransactionType,
          description: adj.description,
          referenceType: "ADJUSTMENT",
          referenceId: adj.id,
          debitAmount: isDebit ? Number(adj.amount) : undefined,
          creditAmount: !isDebit ? Number(adj.amount) : undefined,
          runningBalance: 0,
          createdBy: adj.createdByName || "System",
        });
      }

      // Apply transaction type filters
      let filteredTransactions = allTransactions;
      if (input.transactionTypes && input.transactionTypes.length > 0) {
        filteredTransactions = allTransactions.filter(t =>
          input.transactionTypes!.includes(t.type)
        );
      }

      // Sort by date (oldest first for running balance calculation)
      filteredTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      let runningBalance = 0;
      for (const transaction of filteredTransactions) {
        // Debits increase balance (they owe more)
        // Credits decrease balance (they owe less)
        if (transaction.debitAmount) {
          runningBalance += transaction.debitAmount;
        }
        if (transaction.creditAmount) {
          runningBalance -= transaction.creditAmount;
        }
        transaction.runningBalance = runningBalance;
      }

      // Calculate summary from ALL filtered transactions (before pagination)
      const summary: LedgerSummary = {
        totalDebits: filteredTransactions.reduce((sum, t) => sum + (t.debitAmount || 0), 0),
        totalCredits: filteredTransactions.reduce((sum, t) => sum + (t.creditAmount || 0), 0),
        netChange: runningBalance,
      };

      // Total count before pagination
      const totalCount = filteredTransactions.length;

      // Now reverse for display (newest first) and apply pagination
      filteredTransactions.reverse();
      const paginatedTransactions = filteredTransactions.slice(
        input.offset,
        input.offset + input.limit
      );

      return {
        clientId: client.id,
        clientName: client.name,
        currentBalance: runningBalance,
        balanceDescription: getBalanceDescription(runningBalance),
        transactions: paginatedTransactions,
        totalCount,
        summary,
      };
    }),

  /**
   * Get balance as of a specific date (for dispute resolution)
   */
  getBalanceAsOf: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        clientId: z.number(),
        asOfDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      logger.info({
        msg: "[ClientLedger] Getting balance as of date",
        clientId: input.clientId,
        asOfDate: input.asOfDate
      });

      // Get client info
      const [client] = await db
        .select({
          id: clients.id,
          name: clients.name,
        })
        .from(clients)
        .where(eq(clients.id, input.clientId));

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const asOfDateStr = formatDateISO(input.asOfDate);
      let balance = 0;

      // Sum up orders (SALE - Debit)
      const ordersSum = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${orders.total} AS DECIMAL(15,2))), 0)`,
        })
        .from(orders)
        .where(
          and(
            eq(orders.clientId, input.clientId),
            eq(orders.orderType, "SALE"),
            isNull(orders.deletedAt),
            inArray(orders.saleStatus, ["CONFIRMED", "INVOICED", "PAID", "PARTIAL", "SHIPPED", "DELIVERED"]),
            sql`DATE(COALESCE(${orders.confirmedAt}, ${orders.createdAt})) <= ${asOfDateStr}`
          )
        );
      balance += Number(ordersSum[0]?.total || 0);

      // Sum up payments received (Credit - subtract)
      const paymentsReceivedSum = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL(15,2))), 0)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.customerId, input.clientId),
            eq(payments.paymentType, "RECEIVED"),
            isNull(payments.deletedAt),
            sql`${payments.paymentDate} <= ${asOfDateStr}`
          )
        );
      balance -= Number(paymentsReceivedSum[0]?.total || 0);

      // Sum up payments sent (Debit - add)
      const paymentsSentSum = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${payments.amount} AS DECIMAL(15,2))), 0)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.vendorId, input.clientId),
            eq(payments.paymentType, "SENT"),
            isNull(payments.deletedAt),
            sql`${payments.paymentDate} <= ${asOfDateStr}`
          )
        );
      balance += Number(paymentsSentSum[0]?.total || 0);

      // Sum up purchase orders (Credit - subtract)
      const poSum = await db
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${purchaseOrders.total} AS DECIMAL(15,2))), 0)`,
        })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.supplierClientId, input.clientId),
            inArray(purchaseOrders.purchaseOrderStatus, ["CONFIRMED", "RECEIVING", "RECEIVED"]),
            sql`DATE(COALESCE(${purchaseOrders.confirmedAt}, ${purchaseOrders.orderDate})) <= ${asOfDateStr}`
          )
        );
      balance -= Number(poSum[0]?.total || 0);

      // Sum up adjustments
      const adjustmentsResult = await db
        .select({
          transactionType: clientLedgerAdjustments.transactionType,
          total: sql<number>`SUM(CAST(${clientLedgerAdjustments.amount} AS DECIMAL(15,2)))`,
        })
        .from(clientLedgerAdjustments)
        .where(
          and(
            eq(clientLedgerAdjustments.clientId, input.clientId),
            sql`${clientLedgerAdjustments.effectiveDate} <= ${asOfDateStr}`
          )
        )
        .groupBy(clientLedgerAdjustments.transactionType);

      for (const adj of adjustmentsResult) {
        if (adj.transactionType === "DEBIT") {
          balance += Number(adj.total || 0);
        } else {
          balance -= Number(adj.total || 0);
        }
      }

      return {
        clientId: client.id,
        clientName: client.name,
        asOfDate: input.asOfDate,
        balance,
        balanceDescription: getBalanceDescription(balance),
      };
    }),

  /**
   * Add manual ledger adjustment (credit or debit)
   */
  addLedgerAdjustment: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(
      z.object({
        clientId: z.number(),
        transactionType: z.enum(["CREDIT", "DEBIT"]),
        amount: z.number().positive("Amount must be positive"),
        description: z.string().min(1, "Description is required").max(1000),
        effectiveDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      logger.info({
        msg: "[ClientLedger] Adding adjustment",
        clientId: input.clientId,
        type: input.transactionType,
        amount: input.amount,
        userId: ctx.user.id,
      });

      // Verify client exists
      const [client] = await db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(eq(clients.id, input.clientId));

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Insert the adjustment
      const effectiveDate = input.effectiveDate || new Date();
      const result = await db.insert(clientLedgerAdjustments).values({
        clientId: input.clientId,
        transactionType: input.transactionType,
        amount: input.amount.toFixed(2),
        description: input.description,
        effectiveDate: formatDateISO(effectiveDate),
        createdBy: ctx.user.id,
      });

      const adjustmentId = Number(result[0].insertId);

      return {
        id: adjustmentId,
        clientId: input.clientId,
        clientName: client.name,
        transactionType: input.transactionType,
        amount: input.amount,
        description: input.description,
        effectiveDate,
        createdBy: ctx.user.id,
      };
    }),

  /**
   * Export ledger to CSV format
   */
  exportLedger: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        clientId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        transactionTypes: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      logger.info({ msg: "[ClientLedger] Exporting ledger", clientId: input.clientId });

      // Get client info
      const [client] = await db
        .select({
          id: clients.id,
          name: clients.name,
          teriCode: clients.teriCode,
        })
        .from(clients)
        .where(eq(clients.id, input.clientId));

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Reuse getLedger logic with a high limit to get all transactions
      const ledgerData = await clientLedgerRouter.createCaller(ctx).getLedger({
        clientId: input.clientId,
        startDate: input.startDate,
        endDate: input.endDate,
        transactionTypes: input.transactionTypes,
        limit: 10000, // High limit for export
        offset: 0,
      });

      // Build CSV content
      const headers = [
        "Date",
        "Type",
        "Description",
        "Reference Type",
        "Reference ID",
        "Debit",
        "Credit",
        "Running Balance",
        "Created By",
      ];

      // Reverse transactions back to chronological order for export
      const sortedTransactions = [...ledgerData.transactions].reverse();

      const rows = sortedTransactions.map(t => [
        formatDateISO(t.date),
        t.type,
        `"${t.description.replace(/"/g, '""')}"`, // Escape quotes in description
        t.referenceType || "",
        t.referenceId?.toString() || "",
        formatCurrency(t.debitAmount),
        formatCurrency(t.creditAmount),
        formatCurrency(t.runningBalance),
        t.createdBy,
      ]);

      // Add summary rows
      rows.push([]);
      rows.push(["SUMMARY"]);
      rows.push(["Total Debits", "", "", "", "", formatCurrency(ledgerData.summary.totalDebits), "", "", ""]);
      rows.push(["Total Credits", "", "", "", "", "", formatCurrency(ledgerData.summary.totalCredits), "", ""]);
      rows.push(["Current Balance", "", "", "", "", "", "", formatCurrency(ledgerData.currentBalance), ""]);
      rows.push(["", "", ledgerData.balanceDescription, "", "", "", "", "", ""]);

      const csvContent = [
        `Client Ledger: ${client.name} (${client.teriCode})`,
        `Generated: ${new Date().toISOString()}`,
        input.startDate ? `Start Date: ${formatDateISO(input.startDate)}` : "",
        input.endDate ? `End Date: ${formatDateISO(input.endDate)}` : "",
        "",
        headers.join(","),
        ...rows.map(row => row.join(",")),
      ].filter(line => line !== "" || line === "").join("\n");

      return {
        filename: `ledger_${client.teriCode}_${formatDateISO(new Date())}.csv`,
        content: csvContent,
        mimeType: "text/csv",
        clientName: client.name,
        totalTransactions: ledgerData.totalCount,
        currentBalance: ledgerData.currentBalance,
        balanceDescription: ledgerData.balanceDescription,
      };
    }),

  /**
   * Get list of available transaction types for filtering
   */
  getTransactionTypes: protectedProcedure
    .use(requirePermission("clients:read"))
    .query(async () => {
      return [
        { value: "SALE", label: "Sale", direction: "Debit (+)", source: "Orders" },
        { value: "PURCHASE", label: "Purchase", direction: "Credit (-)", source: "Purchase Orders" },
        { value: "PAYMENT_RECEIVED", label: "Payment Received", direction: "Credit (-)", source: "Payments" },
        { value: "PAYMENT_SENT", label: "Payment Sent", direction: "Debit (+)", source: "Payments" },
        { value: "CREDIT", label: "Credit Adjustment", direction: "Credit (-)", source: "Manual Adjustment" },
        { value: "DEBIT", label: "Debit Adjustment", direction: "Debit (+)", source: "Manual Adjustment" },
      ];
    }),
});
