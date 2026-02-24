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
import Decimal from "decimal.js";
import { logger } from "../_core/logger";
import { getAccountIdByName, ACCOUNT_NAMES } from "../_core/accountLookup";
import { getFiscalPeriodId } from "../_core/fiscalPeriod";
import { captureException } from "../_core/monitoring";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const listPaymentsSchema = z.object({
  invoiceId: z.number().optional(),
  clientId: z.number().optional(),
  paymentType: z.enum(["RECEIVED", "SENT"]).optional(),
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
      sql`YEAR(${payments.paymentDate}) = ${year} AND MONTH(${payments.paymentDate}) = ${today.getMonth() + 1}`
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

// Tolerance for floating-point rounding in payment comparisons (1 cent)
const OVERPAYMENT_TOLERANCE = new Decimal("0.01");

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

      if (input.paymentType) {
        conditions.push(eq(payments.paymentType, input.paymentType));
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

      if (invoice.status === "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot apply payment to a draft invoice. Invoice must be sent first.",
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

      const amountDueD = new Decimal(invoice.amountDue || "0");
      const inputAmountD = new Decimal(input.amount);

      // TERP-0016: Validate payment amount doesn't exceed amount due
      if (inputAmountD.greaterThan(amountDueD.plus(OVERPAYMENT_TOLERANCE))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment amount (${formatCurrency(input.amount)}) exceeds amount due (${formatCurrency(amountDueD.toNumber())}). Overpayments are not allowed.`,
        });
      }

      // TERP-0016: Cap payment if slightly over due to rounding
      const effectiveAmountD = inputAmountD.greaterThan(amountDueD)
        ? amountDueD
        : inputAmountD;

      // Resolve GL account IDs and fiscal period before the transaction so that
      // missing accounts or periods produce descriptive TRPCErrors rather than a
      // generic INTERNAL_SERVER_ERROR from inside the transaction.
      // getAccountIdByName throws TRPCError(NOT_FOUND) if the chart of accounts
      // is not seeded. getFiscalPeriodId throws TRPCError(NOT_FOUND) if no fiscal
      // period exists for the payment date. Resolving here makes failures explicit.
      const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
      const arAccountId = await getAccountIdByName(
        ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
      );
      const fiscalPeriodId = await getFiscalPeriodId(new Date());

      // REL-003: Wrap transaction in try/catch for Sentry logging
      let txResult;
      try {
        txResult = await db.transaction(async tx => {
          // Generate payment number
          const paymentNumber = await generatePaymentNumber();

          // Create payment record
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
              amount: effectiveAmountD.toFixed(2),
              paymentMethod: input.paymentMethod,
              referenceNumber: input.referenceNumber,
              notes: input.notes,
              createdBy: userId,
            })
            .$returningId();

          const paymentId = payment.id;

          // Update invoice amounts using Decimal-safe math
          const currentPaidD = new Decimal(invoice.amountPaid || "0");
          const newPaidD = currentPaidD.plus(effectiveAmountD);
          const totalAmountD = new Decimal(invoice.totalAmount || "0");
          const newDueD = Decimal.max(0, totalAmountD.minus(newPaidD));

          // Determine new status
          let newStatus: "PARTIAL" | "PAID";
          if (newDueD.lessThanOrEqualTo(OVERPAYMENT_TOLERANCE)) {
            newStatus = "PAID";
          } else {
            newStatus = "PARTIAL";
          }

          await tx
            .update(invoices)
            .set({
              amountPaid: newPaidD.toFixed(2),
              amountDue: newDueD.toFixed(2),
              status: newStatus,
            })
            .where(eq(invoices.id, input.invoiceId));

          // Create GL entries (Cash debit, AR credit)
          const entryNumber = `PMT-${paymentId}`;

          // Debit Cash
          await tx.insert(ledgerEntries).values({
            entryNumber: `${entryNumber}-DR`,
            entryDate: new Date(),
            accountId: cashAccountId,
            debit: effectiveAmountD.toFixed(2),
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
            credit: effectiveAmountD.toFixed(2),
            description: `Payment received - Invoice #${invoice.invoiceNumber}`,
            referenceType: "PAYMENT",
            referenceId: paymentId,
            fiscalPeriodId,
            isManual: false,
            createdBy: userId,
          });

          logger.info({
            msg: "[Payments] Payment recorded successfully",
            paymentId,
            paymentNumber,
            invoiceId: input.invoiceId,
            amount: effectiveAmountD.toNumber(),
            newInvoiceStatus: newStatus,
            newAmountDue: newDueD.toNumber(),
          });

          return {
            paymentId,
            paymentNumber,
            invoiceId: input.invoiceId,
            customerId: invoice.customerId,
            amount: effectiveAmountD.toNumber(),
            invoiceStatus: newStatus,
            amountDue: newDueD.toNumber(),
          };
        });
      } catch (error) {
        // REL-003: Preserve TRPCErrors (validation errors), only wrap unexpected errors
        if (error instanceof TRPCError) {
          throw error;
        }
        logger.error({
          msg: "[Payments] recordPayment transaction failed",
          invoiceId: input.invoiceId,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: "payment_record",
            invoiceId: input.invoiceId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            userId,
          }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            process.env.NODE_ENV === "production"
              ? "Payment recording failed - transaction rolled back"
              : `Payment recording failed - transaction rolled back: ${
                  error instanceof Error ? error.message : String(error)
                }`,
          cause: error,
        });
      }

      // ARCH-002: Sync client balance after transaction to ensure consistency
      // This derives totalOwed from SUM(invoices.amountDue)
      const { syncClientBalance } =
        await import("../services/clientBalanceService");
      await syncClientBalance(txResult.customerId);

      return {
        success: true as const,
        ...txResult,
      };
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
          totalDue: sql<string>`SUM(amountDue)`,
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
        totalAmount: new Decimal(paymentTotals?.totalAmount || "0").toNumber(),
        outstandingBalance: new Decimal(
          outstanding?.totalDue || "0"
        ).toNumber(),
        byMethod: byMethod.map(row => ({
          method: row.method,
          count: Number(row.count),
          total: new Decimal(row.total || "0").toNumber(),
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
            sql`${invoices.status} NOT IN ('PAID', 'VOID', 'DRAFT')`,
            isNull(invoices.deletedAt)
          )
        )
        .orderBy(invoices.dueDate);

      // Add overdue flag
      const today = new Date();
      return results.map(inv => ({
        ...inv,
        totalAmount: new Decimal(String(inv.totalAmount) || "0").toNumber(),
        amountPaid: new Decimal(String(inv.amountPaid) || "0").toNumber(),
        amountDue: new Decimal(String(inv.amountDue) || "0").toNumber(),
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

      // Resolve GL account IDs and fiscal period before the transaction so that
      // missing accounts or periods produce descriptive TRPCErrors rather than a
      // generic INTERNAL_SERVER_ERROR from inside the transaction.
      const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
      const arAccountId = await getAccountIdByName(
        ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
      );
      const fiscalPeriodId = await getFiscalPeriodId(new Date());

      // REL-003: Wrap transaction in try/catch for Sentry logging
      let txResult;
      try {
        txResult = await db.transaction(async tx => {
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
                input.paymentMethod === "CRYPTO"
                  ? "OTHER"
                  : input.paymentMethod,
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

            // Reject DRAFT, PAID, and VOID invoices
            if (invoice.status === "DRAFT") {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Invoice #${invoice.invoiceNumber} is still in DRAFT status. Send it before recording payment.`,
              });
            }
            if (invoice.status === "PAID") {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Invoice #${invoice.invoiceNumber} is already paid in full`,
              });
            }
            if (invoice.status === "VOID") {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Cannot apply payment to voided invoice #${invoice.invoiceNumber}`,
              });
            }

            const allocAmountDueD = new Decimal(
              String(invoice.amountDue) || "0"
            );
            const allocAmountD = new Decimal(allocation.amount);
            if (
              allocAmountD.greaterThan(
                allocAmountDueD.plus(OVERPAYMENT_TOLERANCE)
              )
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Allocation for invoice #${invoice.invoiceNumber} exceeds amount due`,
              });
            }

            // Create invoice_payments record
            await tx.insert(invoicePayments).values({
              paymentId,
              invoiceId: allocation.invoiceId,
              allocatedAmount: allocAmountD.toFixed(2),
              allocatedBy: userId,
            });

            // Update invoice amounts using Decimal-safe math
            const allocCurrentPaidD = new Decimal(
              String(invoice.amountPaid) || "0"
            );
            const allocNewPaidD = allocCurrentPaidD.plus(allocAmountD);
            const allocTotalAmountD = new Decimal(
              String(invoice.totalAmount) || "0"
            );
            const allocNewDueD = Decimal.max(
              0,
              allocTotalAmountD.minus(allocNewPaidD)
            );

            let newStatus: string;
            if (allocNewDueD.lessThanOrEqualTo(OVERPAYMENT_TOLERANCE)) {
              newStatus = "PAID";
            } else if (allocNewPaidD.greaterThan(0)) {
              newStatus = "PARTIAL";
            } else {
              newStatus = invoice.status;
            }

            await tx
              .update(invoices)
              .set({
                amountPaid: allocNewPaidD.toFixed(2),
                amountDue: allocNewDueD.toFixed(2),
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
      } catch (error) {
        // REL-003: Preserve TRPCErrors (validation errors), only wrap unexpected errors
        if (error instanceof TRPCError) {
          throw error;
        }
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: "multi_invoice_payment",
            clientId: input.clientId,
            totalAmount: input.totalAmount,
            allocationCount: input.allocations.length,
            userId,
          }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Multi-invoice payment failed - transaction rolled back",
          cause: error,
        });
      }

      // ARCH-002: Sync client balance after transaction
      const { syncClientBalance } =
        await import("../services/clientBalanceService");
      await syncClientBalance(txResult.clientId);

      return txResult;
    }),

  /**
   * TER-39: Record a wire payment with wire-specific validation
   * Provides enhanced wire payment support with:
   * - Wire confirmation number tracking
   * - Bank routing number validation
   * - Wire transfer date tracking
   */
  recordWirePayment: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(
      z.object({
        invoiceId: z.number(),
        amount: z.number().positive("Amount must be positive"),
        wireConfirmationNumber: z
          .string()
          .min(1, "Wire confirmation number is required"),
        bankRoutingNumber: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        bankName: z.string().optional(),
        wireTransferDate: z.string().optional(), // ISO date string
        notes: z.string().optional(),
        paymentDate: z.string().optional(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      logger.info({
        msg: "[Payments] Recording wire payment",
        invoiceId: input.invoiceId,
        amount: input.amount,
        wireConfirmationNumber: input.wireConfirmationNumber,
      });

      // Validate routing number format if provided (9 digits for US)
      if (input.bankRoutingNumber && !/^\d{9}$/.test(input.bankRoutingNumber)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid bank routing number format. US routing numbers must be 9 digits.",
        });
      }

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

      if (invoice.status === "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invoice is still in DRAFT status. Send it before recording payment.",
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

      const wireAmountDueD = new Decimal(invoice.amountDue || "0");
      const wireInputAmountD = new Decimal(input.amount);

      // Validate payment amount doesn't exceed amount due
      if (
        wireInputAmountD.greaterThan(wireAmountDueD.plus(OVERPAYMENT_TOLERANCE))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Payment amount (${formatCurrency(input.amount)}) exceeds amount due (${formatCurrency(wireAmountDueD.toNumber())}). Overpayments are not allowed.`,
        });
      }

      const wireEffectiveAmountD = wireInputAmountD.greaterThan(wireAmountDueD)
        ? wireAmountDueD
        : wireInputAmountD;

      // Resolve GL account IDs and fiscal period before the transaction so that
      // missing accounts or periods produce descriptive TRPCErrors rather than a
      // generic INTERNAL_SERVER_ERROR from inside the transaction.
      const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
      const arAccountId = await getAccountIdByName(
        ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
      );
      const fiscalPeriodId = await getFiscalPeriodId(new Date());

      // Build wire details for notes
      const wireDetails = [
        `Wire Confirmation: ${input.wireConfirmationNumber}`,
        input.bankName && `Bank: ${input.bankName}`,
        input.bankRoutingNumber && `Routing: ${input.bankRoutingNumber}`,
        input.wireTransferDate && `Transfer Date: ${input.wireTransferDate}`,
        input.notes,
      ]
        .filter(Boolean)
        .join("\n");

      let txResult;
      try {
        txResult = await db.transaction(async tx => {
          // Generate payment number
          const paymentNumber = await generatePaymentNumber();

          // Create payment record
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
              amount: wireEffectiveAmountD.toFixed(2),
              paymentMethod: "WIRE",
              referenceNumber: input.wireConfirmationNumber,
              notes: wireDetails,
              createdBy: userId,
            })
            .$returningId();

          const paymentId = payment.id;

          // Update invoice amounts using Decimal-safe math
          const wireCurrentPaidD = new Decimal(invoice.amountPaid || "0");
          const wireNewPaidD = wireCurrentPaidD.plus(wireEffectiveAmountD);
          const wireTotalAmountD = new Decimal(invoice.totalAmount || "0");
          const wireNewDueD = Decimal.max(
            0,
            wireTotalAmountD.minus(wireNewPaidD)
          );

          // Determine new status
          let newStatus: "PARTIAL" | "PAID";
          if (wireNewDueD.lessThanOrEqualTo(OVERPAYMENT_TOLERANCE)) {
            newStatus = "PAID";
          } else {
            newStatus = "PARTIAL";
          }

          await tx
            .update(invoices)
            .set({
              amountPaid: wireNewPaidD.toFixed(2),
              amountDue: wireNewDueD.toFixed(2),
              status: newStatus,
            })
            .where(eq(invoices.id, input.invoiceId));

          // Create GL entries (Cash debit, AR credit)
          const entryNumber = `PMT-WIRE-${paymentId}`;

          // Debit Cash
          await tx.insert(ledgerEntries).values({
            entryNumber: `${entryNumber}-DR`,
            entryDate: new Date(),
            accountId: cashAccountId,
            debit: wireEffectiveAmountD.toFixed(2),
            credit: "0.00",
            description: `Wire payment received - Invoice #${invoice.invoiceNumber} - Conf: ${input.wireConfirmationNumber}`,
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
            credit: wireEffectiveAmountD.toFixed(2),
            description: `Wire payment received - Invoice #${invoice.invoiceNumber} - Conf: ${input.wireConfirmationNumber}`,
            referenceType: "PAYMENT",
            referenceId: paymentId,
            fiscalPeriodId,
            isManual: false,
            createdBy: userId,
          });

          logger.info({
            msg: "[Payments] Wire payment recorded successfully",
            paymentId,
            paymentNumber,
            wireConfirmationNumber: input.wireConfirmationNumber,
            invoiceId: input.invoiceId,
            amount: wireEffectiveAmountD.toNumber(),
            newInvoiceStatus: newStatus,
          });

          return {
            paymentId,
            paymentNumber,
            invoiceId: input.invoiceId,
            customerId: invoice.customerId,
            amount: wireEffectiveAmountD.toNumber(),
            wireConfirmationNumber: input.wireConfirmationNumber,
            invoiceStatus: newStatus,
            amountDue: wireNewDueD.toNumber(),
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: "wire_payment_record",
            invoiceId: input.invoiceId,
            amount: input.amount,
            wireConfirmationNumber: input.wireConfirmationNumber,
            userId,
          }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Wire payment recording failed - transaction rolled back",
          cause: error,
        });
      }

      // ARCH-002: Sync client balance after transaction
      const { syncClientBalance } =
        await import("../services/clientBalanceService");
      await syncClientBalance(txResult.customerId);

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

      const paymentAmountD = new Decimal(payment.amount || "0");

      // Resolve GL account IDs and fiscal period before the transaction so that
      // missing accounts or periods produce descriptive TRPCErrors rather than a
      // generic INTERNAL_SERVER_ERROR from inside the transaction.
      const fiscalPeriodId = await getFiscalPeriodId(new Date());
      const cashAccountId = await getAccountIdByName(ACCOUNT_NAMES.CASH);
      const arAccountId = await getAccountIdByName(
        ACCOUNT_NAMES.ACCOUNTS_RECEIVABLE
      );

      // REL-003: Wrap transaction in try/catch for Sentry logging
      let txResult;
      try {
        txResult = await db.transaction(async tx => {
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
              const allocatedAmountD = new Decimal(
                allocation.allocatedAmount || "0"
              );

              const [invoice] = await tx
                .select()
                .from(invoices)
                .where(eq(invoices.id, allocation.invoiceId))
                .limit(1);

              if (invoice) {
                const voidCurrentPaidD = new Decimal(invoice.amountPaid || "0");
                const voidNewPaidD = Decimal.max(
                  0,
                  voidCurrentPaidD.minus(allocatedAmountD)
                );
                const voidTotalAmountD = new Decimal(
                  invoice.totalAmount || "0"
                );
                const voidNewDueD = voidTotalAmountD.minus(voidNewPaidD);

                // Determine new status
                const newStatus: "SENT" | "PARTIAL" = voidNewPaidD.greaterThan(
                  0
                )
                  ? "PARTIAL"
                  : "SENT";

                await tx
                  .update(invoices)
                  .set({
                    amountPaid: voidNewPaidD.toFixed(2),
                    amountDue: voidNewDueD.toFixed(2),
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
              const legacyCurrentPaidD = new Decimal(invoice.amountPaid || "0");
              const legacyNewPaidD = Decimal.max(
                0,
                legacyCurrentPaidD.minus(paymentAmountD)
              );
              const legacyTotalAmountD = new Decimal(
                invoice.totalAmount || "0"
              );
              const legacyNewDueD = legacyTotalAmountD.minus(legacyNewPaidD);

              // Determine new status
              const newStatus: "SENT" | "PARTIAL" = legacyNewPaidD.greaterThan(
                0
              )
                ? "PARTIAL"
                : "SENT";

              await tx
                .update(invoices)
                .set({
                  amountPaid: legacyNewPaidD.toFixed(2),
                  amountDue: legacyNewDueD.toFixed(2),
                  status: newStatus,
                })
                .where(eq(invoices.id, payment.invoiceId));
            }
          }

          // Create reversing GL entries
          const reversalNumber = `PMT-REV-${input.id}`;

          // Credit Cash (reverse debit)
          await tx.insert(ledgerEntries).values({
            entryNumber: `${reversalNumber}-CR`,
            entryDate: new Date(),
            accountId: cashAccountId,
            debit: "0.00",
            credit: paymentAmountD.toFixed(2),
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
            debit: paymentAmountD.toFixed(2),
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
            amount: paymentAmountD.toNumber(),
            allocationsReversed: allocations.length,
          });

          return {
            success: true,
            paymentId: input.id,
            customerId: payment.customerId,
          };
        });
      } catch (error) {
        // REL-003: Preserve TRPCErrors (validation errors), only wrap unexpected errors
        if (error instanceof TRPCError) {
          throw error;
        }
        captureException(
          error instanceof Error ? error : new Error(String(error)),
          {
            operation: "payment_void",
            paymentId: input.id,
            reason: input.reason,
            userId,
          }
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment void failed - transaction rolled back",
          cause: error,
        });
      }

      // ARCH-002: Sync client balance after transaction
      if (txResult.customerId) {
        const { syncClientBalance } =
          await import("../services/clientBalanceService");
        await syncClientBalance(txResult.customerId);
      }

      return txResult;
    }),
});
