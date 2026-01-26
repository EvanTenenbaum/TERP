/**
 * Payments Router
 * Handles payment recording and management for the sales workflow
 *
 * Wave 5A: Sales Workflow Completion
 * - Payment recording against invoices
 * - Payment listing and retrieval
 * - Payment application to invoices
 */

import { z } from "zod";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  payments,
  invoices,
  clients,
  users,
  ledgerEntries,
  invoicePayments, // FEAT-007: Multi-invoice payment support
} from "../../drizzle/schema";
import { eq, desc, and, sql, isNull, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";
import { getAccountIdByName, ACCOUNT_NAMES } from "../_core/accountLookup";
import { getFiscalPeriodIdOrDefault } from "../_core/fiscalPeriod";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listPaymentsSchema = z.object({
  invoiceId: z.number().optional(),
  clientId: z.number().optional(),
  paymentMethod: z
    .enum([
      "CASH",
      "CHECK",
      "WIRE",
      "ACH",
      "CREDIT_CARD",
      "DEBIT_CARD",
      "OTHER",
    ])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const recordPaymentSchema = z.object({
  invoiceId: z.number(),
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: z.enum([
    "CASH",
    "CHECK",
    "WIRE",
    "ACH",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "OTHER",
  ]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  paymentDate: z.string().optional(), // ISO date string
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique payment number
 */
async function generatePaymentNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(payments)
    .where(
      sql`YEAR(payment_date) = ${year} AND MONTH(payment_date) = ${today.getMonth() + 1}`
    );

  const count = Number(result[0]?.count || 0) + 1;
  return `PMT-${year}${month}-${String(count).padStart(5, "0")}`;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ============================================================================
// PAYMENTS ROUTER
// ============================================================================

export const paymentsRouter = router({
  /**
   * List payments with optional filters
   */
  list: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(listPaymentsSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [isNull(payments.deletedAt)];

      if (input.invoiceId) {
        conditions.push(eq(payments.invoiceId, input.invoiceId));
      }

      if (input.clientId) {
        conditions.push(eq(payments.customerId, input.clientId));
      }

      if (input.paymentMethod) {
        conditions.push(eq(payments.paymentMethod, input.paymentMethod));
      }

      if (input.startDate) {
        conditions.push(gte(payments.paymentDate, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(payments.paymentDate, new Date(input.endDate)));
      }

      const results = await db
        .select({
          payment: payments,
          invoice: invoices,
          client: clients,
          recordedBy: {
            id: users.id,
            name: users.name,
          },
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .leftJoin(clients, eq(payments.customerId, clients.id))
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(payments.paymentDate))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(payments)
        .where(and(...conditions));

      const total = Number(countResult[0]?.count || 0);

      return {
        items: results.map(row => ({
          ...row.payment,
          invoice: row.invoice,
          client: row.client,
          recordedBy: row.recordedBy,
        })),
        total,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get payment by ID
   */
  getById: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db
        .select({
          payment: payments,
          invoice: invoices,
          client: clients,
          recordedBy: {
            id: users.id,
            name: users.name,
          },
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .leftJoin(clients, eq(payments.customerId, clients.id))
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(and(eq(payments.id, input.id), isNull(payments.deletedAt)))
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      return {
        ...result.payment,
        invoice: result.invoice,
        client: result.client,
        recordedBy: result.recordedBy,
      };
    }),

  /**
   * Record a payment against an invoice
   */
  recordPayment: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(recordPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      logger.info({
        msg: "[Payments] Recording payment",
        invoiceId: input.invoiceId,
        amount: input.amount,
        method: input.paymentMethod,
      });

      // Get invoice
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (invoice.status === "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invoice is already paid in full",
        });
      }

      if (invoice.status === "VOID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot apply payment to a voided invoice",
        });
      }

      const amountDue = parseFloat(invoice.amountDue || "0");

      // TERP-0016: Validate payment amount doesn't exceed amount due
      // Use tolerance (0.01) for floating point comparison consistency
      // This matches the tolerance used in recordMultiInvoicePayment
      if (input.amount > amountDue + 0.01) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment amount (${formatCurrency(input.amount)}) exceeds amount due (${formatCurrency(amountDue)}). Overpayments are not allowed.`,
        });
      }

      // TERP-0016: Warn and cap payment if slightly over due to rounding
      const effectiveAmount =
        input.amount > amountDue ? amountDue : input.amount;

      // Get account IDs for GL entries
      const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
      const arAccountId = await getAccountIdByName(
        ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
      );
      const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);

      // Use transaction for atomicity
      const txResult = await db.transaction(async tx => {
        // Generate payment number
        const paymentNumber = await generatePaymentNumber();

        // Create payment record
        // TERP-0016: Use effectiveAmount which is capped at amountDue
        const [payment] = await tx
          .insert(payments)
          .values({
            paymentNumber,
            paymentType: "RECEIVED",
            invoiceId: input.invoiceId,
            customerId: invoice.customerId,
            paymentDate: input.paymentDate
              ? new Date(input.paymentDate)
              : new Date(),
            amount: effectiveAmount.toFixed(2),
            paymentMethod: input.paymentMethod,
            referenceNumber: input.referenceNumber,
            notes: input.notes,
            createdBy: userId,
          })
          .$returningId();

        const paymentId = payment.id;

        // Update invoice amounts
        // TERP-0016: Use effectiveAmount for calculations
        const currentPaid = parseFloat(invoice.amountPaid || "0");
        const newPaid = currentPaid + effectiveAmount;
        const totalAmount = parseFloat(invoice.totalAmount || "0");
        const newDue = Math.max(0, totalAmount - newPaid);

        // Determine new status
        let newStatus: "PARTIAL" | "PAID";
        if (newDue <= 0.01) {
          // Allow for rounding
          newStatus = "PAID";
        } else {
          newStatus = "PARTIAL";
        }

        await tx
          .update(invoices)
          .set({
            amountPaid: newPaid.toFixed(2),
            amountDue: newDue.toFixed(2),
            status: newStatus,
          })
          .where(eq(invoices.id, input.invoiceId));

        // Create GL entries (Cash debit, AR credit)
        const entryNumber = `PMT-${paymentId}`;

        // Debit Cash
        // TERP-0016: Use effectiveAmount for GL entries
        await tx.insert(ledgerEntries).values({
          entryNumber: `${entryNumber}-DR`,
          entryDate: new Date(),
          accountId: cashAccountId,
          debit: effectiveAmount.toFixed(2),
          credit: "0.00",
          description: `Payment received - Invoice #${invoice.invoiceNumber}`,
          referenceType: "PAYMENT",
          referenceId: paymentId,
          fiscalPeriodId,
          isManual: false,
          createdBy: userId,
        });

        // Credit AR
        await tx.insert(ledgerEntries).values({
          entryNumber: `${entryNumber}-CR`,
          entryDate: new Date(),
          accountId: arAccountId,
          debit: "0.00",
          credit: effectiveAmount.toFixed(2),
          description: `Payment received - Invoice #${invoice.invoiceNumber}`,
          referenceType: "PAYMENT",
          referenceId: paymentId,
          fiscalPeriodId,
          isManual: false,
          createdBy: userId,
        });

        // ARCH-002: Update client totalOwed within transaction for atomicity
        // Note: This is kept for transactional consistency.
        // After the transaction, we sync from invoices to ensure accuracy.
        await tx
          .update(clients)
          .set({
            totalOwed: sql`CAST(${clients.totalOwed} AS DECIMAL(15,2)) - ${effectiveAmount}`,
          })
          .where(eq(clients.id, invoice.customerId));

        logger.info({
          msg: "[Payments] Payment recorded successfully",
          paymentId,
          paymentNumber,
          invoiceId: input.invoiceId,
          amount: effectiveAmount,
          newInvoiceStatus: newStatus,
          newAmountDue: newDue,
        });

        return {
          paymentId,
          paymentNumber,
          invoiceId: input.invoiceId,
          customerId: invoice.customerId,
          amount: effectiveAmount,
          invoiceStatus: newStatus,
          amountDue: newDue,
        };
      });

      // ARCH-002: Sync client balance after transaction to ensure consistency
      // This derives totalOwed from SUM(invoices.amountDue)
      const { syncClientBalance } = await import(
        "../services/clientBalanceService"
      );
      await syncClientBalance(txResult.customerId);

      return txResult;
    }),

  /**
   * Get payments for a specific client
   */
  getByClient: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = await db
        .select({
          payment: payments,
          invoice: invoices,
        })
        .from(payments)
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .where(
          and(
            eq(payments.customerId, input.clientId),
            isNull(payments.deletedAt)
          )
        )
        .orderBy(desc(payments.paymentDate))
        .limit(input.limit);

      return results.map(row => ({
        ...row.payment,
        invoice: row.invoice,
      }));
    }),

  /**
   * Get payment summary for a client
   */
  getClientSummary: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get total payments
      const [paymentTotals] = await db
        .select({
          totalPayments: sql<number>`COUNT(*)`,
          totalAmount: sql<string>`SUM(amount)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.customerId, input.clientId),
            isNull(payments.deletedAt)
          )
        );

      // Get payments by method
      const byMethod = await db
        .select({
          method: payments.paymentMethod,
          count: sql<number>`COUNT(*)`,
          total: sql<string>`SUM(amount)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.customerId, input.clientId),
            isNull(payments.deletedAt)
          )
        )
        .groupBy(payments.paymentMethod);

      // Get outstanding balance
      const [outstanding] = await db
        .select({
          totalDue: sql<string>`SUM(amount_due)`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, input.clientId),
            sql`status NOT IN ('PAID', 'VOID')`,
            isNull(invoices.deletedAt)
          )
        );

      return {
        totalPayments: Number(paymentTotals?.totalPayments || 0),
        totalAmount: parseFloat(paymentTotals?.totalAmount || "0"),
        outstandingBalance: parseFloat(outstanding?.totalDue || "0"),
        byMethod: byMethod.map(row => ({
          method: row.method,
          count: Number(row.count),
          total: parseFloat(row.total || "0"),
        })),
      };
    }),

  /**
   * Get payment history for a specific invoice (FEAT-007)
   */
  getInvoicePaymentHistory: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ invoiceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all payments linked to this invoice via invoicePayments junction table
      const results = await db
        .select({
          allocationId: invoicePayments.id,
          allocatedAmount: invoicePayments.allocatedAmount,
          paymentNumber: payments.paymentNumber,
          paymentDate: payments.paymentDate,
          paymentMethod: payments.paymentMethod,
          referenceNumber: payments.referenceNumber,
          notes: payments.notes,
          recordedBy: users.name,
        })
        .from(invoicePayments)
        .innerJoin(payments, eq(invoicePayments.paymentId, payments.id))
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(
          and(
            eq(invoicePayments.invoiceId, input.invoiceId),
            isNull(payments.deletedAt)
          )
        )
        .orderBy(desc(payments.paymentDate));

      // Also get direct payments (legacy, where payment.invoiceId is set directly)
      const directPayments = await db
        .select({
          allocationId: payments.id,
          allocatedAmount: payments.amount,
          paymentNumber: payments.paymentNumber,
          paymentDate: payments.paymentDate,
          paymentMethod: payments.paymentMethod,
          referenceNumber: payments.referenceNumber,
          notes: payments.notes,
          recordedBy: users.name,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(
          and(
            eq(payments.invoiceId, input.invoiceId),
            isNull(payments.deletedAt)
          )
        )
        .orderBy(desc(payments.paymentDate));

      // Combine and deduplicate by paymentNumber
      const allPayments = [...results, ...directPayments];
      const seen = new Set<string>();
      const uniquePayments = allPayments.filter(p => {
        if (!p.paymentNumber || seen.has(p.paymentNumber)) return false;
        seen.add(p.paymentNumber);
        return true;
      });

      return uniquePayments;
    }),

  /**
   * Get outstanding invoices for a client (FEAT-007)
   */
  getClientOutstandingInvoices: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          invoiceDate: invoices.invoiceDate,
          dueDate: invoices.dueDate,
          totalAmount: invoices.totalAmount,
          amountPaid: invoices.amountPaid,
          amountDue: invoices.amountDue,
          status: invoices.status,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, input.clientId),
            sql`${invoices.status} NOT IN ('PAID', 'VOID')`,
            isNull(invoices.deletedAt)
          )
        )
        .orderBy(invoices.dueDate);

      // Add overdue flag
      const today = new Date();
      return results.map(inv => ({
        ...inv,
        totalAmount: parseFloat(String(inv.totalAmount) || "0"),
        amountPaid: parseFloat(String(inv.amountPaid) || "0"),
        amountDue: parseFloat(String(inv.amountDue) || "0"),
        isOverdue: inv.dueDate ? new Date(inv.dueDate) < today : false,
      }));
    }),

  /**
   * Record payment against multiple invoices (FEAT-007)
   */
  recordMultiInvoicePayment: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(
      z.object({
        clientId: z.number(),
        totalAmount: z.number().positive(),
        allocations: z.array(
          z.object({
            invoiceId: z.number(),
            amount: z.number().positive(),
          })
        ),
        paymentMethod: z.enum([
          "CASH",
          "CHECK",
          "WIRE",
          "ACH",
          "CREDIT_CARD",
          "DEBIT_CARD",
          "CRYPTO",
          "OTHER",
        ]),
        referenceNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Validate allocations sum matches totalAmount
      const allocationsTotal = input.allocations.reduce(
        (sum, a) => sum + a.amount,
        0
      );
      if (Math.abs(allocationsTotal - input.totalAmount) > 0.01) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Allocations total must equal payment amount",
        });
      }

      // Get account IDs for GL entries
      const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
      const arAccountId = await getAccountIdByName(
        ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
      );
      const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);

      const txResult = await db.transaction(async tx => {
        // Generate payment number
        const paymentNumber = await generatePaymentNumber();

        // Create main payment record
        const [payment] = await tx
          .insert(payments)
          .values({
            paymentNumber,
            paymentType: "RECEIVED",
            customerId: input.clientId,
            paymentDate: new Date(),
            amount: input.totalAmount.toFixed(2),
            paymentMethod:
              input.paymentMethod === "CRYPTO" ? "OTHER" : input.paymentMethod,
            referenceNumber: input.referenceNumber,
            notes: input.notes,
            createdBy: userId,
          })
          .$returningId();

        const paymentId = payment.id;

        // Process each invoice allocation
        const invoiceAllocations: {
          invoiceId: number;
          amount: number;
          newStatus: string;
        }[] = [];

        for (const allocation of input.allocations) {
          // Get invoice
          const [invoice] = await tx
            .select()
            .from(invoices)
            .where(eq(invoices.id, allocation.invoiceId))
            .limit(1);

          if (!invoice) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Invoice ${allocation.invoiceId} not found`,
            });
          }

          const amountDue = parseFloat(String(invoice.amountDue) || "0");
          if (allocation.amount > amountDue + 0.01) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Allocation for invoice #${invoice.invoiceNumber} exceeds amount due`,
            });
          }

          // Create invoice_payments record
          await tx.insert(invoicePayments).values({
            paymentId,
            invoiceId: allocation.invoiceId,
            allocatedAmount: allocation.amount.toFixed(2),
            allocatedBy: userId,
          });

          // Update invoice amounts
          const currentPaid = parseFloat(String(invoice.amountPaid) || "0");
          const newPaid = currentPaid + allocation.amount;
          const totalAmount = parseFloat(String(invoice.totalAmount) || "0");
          const newDue = Math.max(0, totalAmount - newPaid);

          let newStatus: string;
          if (newDue <= 0.01) {
            newStatus = "PAID";
          } else if (newPaid > 0) {
            newStatus = "PARTIAL";
          } else {
            newStatus = invoice.status;
          }

          await tx
            .update(invoices)
            .set({
              amountPaid: newPaid.toFixed(2),
              amountDue: newDue.toFixed(2),
              status: newStatus as "PAID" | "PARTIAL",
            })
            .where(eq(invoices.id, allocation.invoiceId));

          invoiceAllocations.push({
            invoiceId: allocation.invoiceId,
            amount: allocation.amount,
            newStatus,
          });
        }

        // Create GL entries
        const entryNumber = `PMT-${paymentId}`;

        // Debit Cash
        await tx.insert(ledgerEntries).values({
          entryNumber: `${entryNumber}-DR`,
          entryDate: new Date(),
          accountId: cashAccountId,
          debit: input.totalAmount.toFixed(2),
          credit: "0.00",
          description: `Multi-invoice payment - ${input.allocations.length} invoices`,
          referenceType: "PAYMENT",
          referenceId: paymentId,
          fiscalPeriodId,
          isManual: false,
          createdBy: userId,
        });

        // Credit AR
        await tx.insert(ledgerEntries).values({
          entryNumber: `${entryNumber}-CR`,
          entryDate: new Date(),
          accountId: arAccountId,
          debit: "0.00",
          credit: input.totalAmount.toFixed(2),
          description: `Multi-invoice payment - ${input.allocations.length} invoices`,
          referenceType: "PAYMENT",
          referenceId: paymentId,
          fiscalPeriodId,
          isManual: false,
          createdBy: userId,
        });

        // ARCH-002: Update client totalOwed within transaction for atomicity
        await tx
          .update(clients)
          .set({
            totalOwed: sql`CAST(${clients.totalOwed} AS DECIMAL(15,2)) - ${input.totalAmount}`,
          })
          .where(eq(clients.id, input.clientId));

        logger.info({
          msg: "[Payments] Multi-invoice payment recorded",
          paymentId,
          paymentNumber,
          clientId: input.clientId,
          totalAmount: input.totalAmount,
          invoiceCount: input.allocations.length,
        });

        return {
          paymentId,
          paymentNumber,
          clientId: input.clientId,
          totalAmount: input.totalAmount,
          invoiceAllocations,
        };
      });

      // ARCH-002: Sync client balance after transaction
      const { syncClientBalance } = await import(
        "../services/clientBalanceService"
      );
      await syncClientBalance(txResult.clientId);

      return txResult;
    }),

  /**
   * Void a payment
   * FEAT-007: Updated to handle multi-invoice payments via invoice_payments junction table
   */
  void: protectedProcedure
    .use(requirePermission("accounting:delete"))
    .input(
      z.object({
        id: z.number(),
        reason: z.string().min(1, "Reason is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, input.id))
        .limit(1);

      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment not found",
        });
      }

      if (payment.deletedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment has already been voided",
        });
      }

      const paymentAmount = parseFloat(payment.amount || "0");

      const txResult = await db.transaction(async tx => {
        // Soft delete the payment
        await tx
          .update(payments)
          .set({
            deletedAt: new Date(),
            notes:
              `${payment.notes || ""}\n[VOIDED]: ${input.reason} on ${new Date().toISOString()}`.trim(),
          })
          .where(eq(payments.id, input.id));

        // FEAT-007: Check for multi-invoice allocations first
        const allocations = await tx
          .select({
            invoiceId: invoicePayments.invoiceId,
            allocatedAmount: invoicePayments.allocatedAmount,
          })
          .from(invoicePayments)
          .where(eq(invoicePayments.paymentId, input.id));

        if (allocations.length > 0) {
          // Handle multi-invoice payment: reverse each allocation
          for (const allocation of allocations) {
            const allocatedAmount = parseFloat(
              allocation.allocatedAmount || "0"
            );

            const [invoice] = await tx
              .select()
              .from(invoices)
              .where(eq(invoices.id, allocation.invoiceId))
              .limit(1);

            if (invoice) {
              const currentPaid = parseFloat(invoice.amountPaid || "0");
              const newPaid = Math.max(0, currentPaid - allocatedAmount);
              const totalAmount = parseFloat(invoice.totalAmount || "0");
              const newDue = totalAmount - newPaid;

              // Determine new status
              const newStatus: "SENT" | "PARTIAL" =
                newPaid > 0 ? "PARTIAL" : "SENT";

              await tx
                .update(invoices)
                .set({
                  amountPaid: newPaid.toFixed(2),
                  amountDue: newDue.toFixed(2),
                  status: newStatus,
                })
                .where(eq(invoices.id, allocation.invoiceId));
            }
          }

          // Soft delete the invoice_payments records
          await tx
            .update(invoicePayments)
            .set({ deletedAt: new Date() })
            .where(eq(invoicePayments.paymentId, input.id));
        } else if (payment.invoiceId) {
          // Handle legacy single-invoice payment
          const [invoice] = await tx
            .select()
            .from(invoices)
            .where(eq(invoices.id, payment.invoiceId))
            .limit(1);

          if (invoice) {
            const currentPaid = parseFloat(invoice.amountPaid || "0");
            const newPaid = Math.max(0, currentPaid - paymentAmount);
            const totalAmount = parseFloat(invoice.totalAmount || "0");
            const newDue = totalAmount - newPaid;

            // Determine new status
            const newStatus: "SENT" | "PARTIAL" =
              newPaid > 0 ? "PARTIAL" : "SENT";

            await tx
              .update(invoices)
              .set({
                amountPaid: newPaid.toFixed(2),
                amountDue: newDue.toFixed(2),
                status: newStatus,
              })
              .where(eq(invoices.id, payment.invoiceId));
          }
        }

        // ARCH-002: Update client totalOwed within transaction for atomicity
        if (payment.customerId) {
          await tx
            .update(clients)
            .set({
              totalOwed: sql`CAST(${clients.totalOwed} AS DECIMAL(15,2)) + ${paymentAmount}`,
            })
            .where(eq(clients.id, payment.customerId));
        }

        // Create reversing GL entries
        const fiscalPeriodId = await getFiscalPeriodIdOrDefault(new Date(), 1);
        const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
        const arAccountId = await getAccountIdByName(
          ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
        );
        const reversalNumber = `PMT-REV-${input.id}`;

        // Credit Cash (reverse debit)
        await tx.insert(ledgerEntries).values({
          entryNumber: `${reversalNumber}-CR`,
          entryDate: new Date(),
          accountId: cashAccountId,
          debit: "0.00",
          credit: paymentAmount.toFixed(2),
          description: `Payment void reversal - ${input.reason}`,
          referenceType: "PAYMENT_VOID",
          referenceId: input.id,
          fiscalPeriodId,
          isManual: false,
          createdBy: userId,
        });

        // Debit AR (reverse credit)
        await tx.insert(ledgerEntries).values({
          entryNumber: `${reversalNumber}-DR`,
          entryDate: new Date(),
          accountId: arAccountId,
          debit: paymentAmount.toFixed(2),
          credit: "0.00",
          description: `Payment void reversal - ${input.reason}`,
          referenceType: "PAYMENT_VOID",
          referenceId: input.id,
          fiscalPeriodId,
          isManual: false,
          createdBy: userId,
        });

        logger.info({
          msg: "[Payments] Payment voided",
          paymentId: input.id,
          reason: input.reason,
          amount: paymentAmount,
          allocationsReversed: allocations.length,
        });

        return { success: true, paymentId: input.id, customerId: payment.customerId };
      });

      // ARCH-002: Sync client balance after transaction
      if (txResult.customerId) {
        const { syncClientBalance } = await import(
          "../services/clientBalanceService"
        );
        await syncClientBalance(txResult.customerId);
      }

      return txResult;
    }),
});
