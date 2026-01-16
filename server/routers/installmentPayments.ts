/**
 * Installment Payments Router (MEET-036)
 * Sprint 5 Track D.8: Installment Payments
 *
 * Payment installment plans:
 * - Define installment schedule
 * - Track partial payments
 * - Auto-calculate remaining balance
 * - Overdue installment alerts
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { clients, invoices, orders, payments } from "../../drizzle/schema";
import {
  installmentPlans,
  installments,
} from "../../drizzle/schema-sprint5-trackd";
import { eq, and, sql, isNull, desc, lte, asc } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Constants
// ============================================================================

const FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly", days: 7 },
  { value: "BIWEEKLY", label: "Bi-weekly", days: 14 },
  { value: "MONTHLY", label: "Monthly", days: 30 },
  { value: "CUSTOM", label: "Custom", days: null },
] as const;

type Frequency = typeof FREQUENCIES[number]["value"];

// ============================================================================
// Helper Functions
// ============================================================================

function calculateInstallmentDates(
  firstPaymentDate: Date,
  numberOfInstallments: number,
  frequency: Frequency,
  customIntervalDays?: number
): Date[] {
  const dates: Date[] = [];
  const freqConfig = FREQUENCIES.find(f => f.value === frequency);
  const intervalDays = frequency === "CUSTOM" ? (customIntervalDays || 30) : (freqConfig?.days || 30);

  for (let i = 0; i < numberOfInstallments; i++) {
    const date = new Date(firstPaymentDate);
    if (frequency === "MONTHLY") {
      date.setMonth(date.getMonth() + i);
    } else {
      date.setDate(date.getDate() + (intervalDays * i));
    }
    dates.push(date);
  }

  return dates;
}

function calculateInstallmentAmount(
  totalAmount: number,
  downPaymentAmount: number,
  numberOfInstallments: number,
  interestRate: number
): number {
  const principal = totalAmount - downPaymentAmount;

  if (interestRate > 0) {
    // Simple interest calculation
    const totalWithInterest = principal * (1 + interestRate / 100);
    return Math.ceil((totalWithInterest / numberOfInstallments) * 100) / 100;
  }

  return Math.ceil((principal / numberOfInstallments) * 100) / 100;
}

// ============================================================================
// Input Schemas
// ============================================================================

const createPlanSchema = z.object({
  clientId: z.number(),
  invoiceId: z.number().optional(),
  orderId: z.number().optional(),
  planName: z.string().optional(),
  totalAmount: z.number().positive(),
  numberOfInstallments: z.number().min(2).max(60),
  frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
  customIntervalDays: z.number().min(1).max(365).optional(),
  firstPaymentDate: z.string(),
  downPaymentAmount: z.number().min(0).default(0),
  interestRate: z.number().min(0).max(50).default(0),
  lateFeeAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const recordInstallmentPaymentSchema = z.object({
  installmentId: z.number(),
  amountPaid: z.number().positive(),
  paymentId: z.number().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const installmentPaymentsRouter = router({
  /**
   * Get frequency options
   */
  getFrequencies: protectedProcedure
    .use(requirePermission("payments:read"))
    .query(async () => {
      return FREQUENCIES;
    }),

  /**
   * Create installment plan
   */
  createPlan: protectedProcedure
    .use(requirePermission("payments:create"))
    .input(createPlanSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);

      // Verify client exists
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Calculate installment amounts
      const installmentAmount = calculateInstallmentAmount(
        input.totalAmount,
        input.downPaymentAmount,
        input.numberOfInstallments,
        input.interestRate
      );

      const remainingBalance = input.totalAmount - input.downPaymentAmount;

      // Create the plan
      const planResult = await db.insert(installmentPlans).values({
        clientId: input.clientId,
        invoiceId: input.invoiceId,
        orderId: input.orderId,
        planName: input.planName || `Installment Plan - ${new Date().toISOString().split("T")[0]}`,
        totalAmount: input.totalAmount.toFixed(2),
        numberOfInstallments: input.numberOfInstallments,
        frequency: input.frequency,
        firstPaymentDate: new Date(input.firstPaymentDate),
        downPaymentAmount: input.downPaymentAmount.toFixed(2),
        totalPaid: input.downPaymentAmount.toFixed(2), // Down payment counts as paid
        remainingBalance: remainingBalance.toFixed(2),
        interestRate: input.interestRate.toFixed(2),
        lateFeeAmount: input.lateFeeAmount.toFixed(2),
        notes: input.notes,
        createdBy: userId,
      });

      const planId = Number(planResult[0].insertId);

      // Calculate installment dates
      const firstPaymentDate = new Date(input.firstPaymentDate);
      const installmentDates = calculateInstallmentDates(
        firstPaymentDate,
        input.numberOfInstallments,
        input.frequency,
        input.customIntervalDays
      );

      // Create individual installments
      for (let i = 0; i < input.numberOfInstallments; i++) {
        // Last installment might be slightly different to account for rounding
        let amountDue = installmentAmount;
        if (i === input.numberOfInstallments - 1) {
          const previousTotal = installmentAmount * (input.numberOfInstallments - 1);
          amountDue = Math.round((remainingBalance - previousTotal + remainingBalance * input.interestRate / 100) * 100) / 100;
          if (amountDue < 0) amountDue = installmentAmount; // Fallback
        }

        await db.insert(installments).values({
          planId,
          installmentNumber: i + 1,
          dueDate: installmentDates[i],
          amountDue: amountDue.toFixed(2),
          status: i === 0 ? "PENDING" : "SCHEDULED",
        });
      }

      logger.info({
        msg: "[InstallmentPayments] Created installment plan",
        planId,
        clientId: input.clientId,
        totalAmount: input.totalAmount,
        numberOfInstallments: input.numberOfInstallments,
      });

      return {
        id: planId,
        totalAmount: input.totalAmount,
        numberOfInstallments: input.numberOfInstallments,
        installmentAmount,
        firstPaymentDate: input.firstPaymentDate,
      };
    }),

  /**
   * Get installment plan by ID
   */
  getPlanById: protectedProcedure
    .use(requirePermission("payments:read"))
    .input(z.object({ planId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [plan] = await db
        .select({
          plan: installmentPlans,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(installmentPlans)
        .leftJoin(clients, eq(installmentPlans.clientId, clients.id))
        .where(eq(installmentPlans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      // Get installments
      const installmentList = await db
        .select()
        .from(installments)
        .where(eq(installments.planId, input.planId))
        .orderBy(asc(installments.installmentNumber));

      return {
        ...plan.plan,
        client: plan.client,
        installments: installmentList,
      };
    }),

  /**
   * List installment plans
   */
  listPlans: protectedProcedure
    .use(requirePermission("payments:read"))
    .input(z.object({
      clientId: z.number().optional(),
      status: z.enum(["ACTIVE", "COMPLETED", "DEFAULTED", "CANCELLED"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [isNull(installmentPlans.deletedAt)];

      if (input.clientId) {
        conditions.push(eq(installmentPlans.clientId, input.clientId));
      }

      if (input.status) {
        conditions.push(eq(installmentPlans.status, input.status));
      }

      const plans = await db
        .select({
          plan: installmentPlans,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(installmentPlans)
        .leftJoin(clients, eq(installmentPlans.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(installmentPlans.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(installmentPlans)
        .where(and(...conditions));

      return {
        items: plans.map(p => ({
          ...p.plan,
          client: p.client,
        })),
        total: Number(countResult?.count || 0),
      };
    }),

  /**
   * Record payment for an installment
   */
  recordPayment: protectedProcedure
    .use(requirePermission("payments:update"))
    .input(recordInstallmentPaymentSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get installment
      const [installment] = await db
        .select()
        .from(installments)
        .where(eq(installments.id, input.installmentId))
        .limit(1);

      if (!installment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Installment not found" });
      }

      const currentPaid = parseFloat(installment.amountPaid || "0");
      const amountDue = parseFloat(installment.amountDue || "0");
      const newPaid = currentPaid + input.amountPaid;
      const isFullyPaid = newPaid >= amountDue;

      // Update installment
      await db
        .update(installments)
        .set({
          amountPaid: newPaid.toFixed(2),
          paidDate: isFullyPaid ? new Date() : null,
          paymentId: input.paymentId,
          status: isFullyPaid ? "PAID" : "PARTIAL",
          notes: input.notes,
        })
        .where(eq(installments.id, input.installmentId));

      // Update plan totals
      const [plan] = await db
        .select()
        .from(installmentPlans)
        .where(eq(installmentPlans.id, installment.planId))
        .limit(1);

      if (plan) {
        const planTotalPaid = parseFloat(plan.totalPaid || "0") + input.amountPaid;
        const planRemainingBalance = parseFloat(plan.totalAmount || "0") - planTotalPaid;

        const planStatus = planRemainingBalance <= 0 ? "COMPLETED" : "ACTIVE";

        await db
          .update(installmentPlans)
          .set({
            totalPaid: planTotalPaid.toFixed(2),
            remainingBalance: Math.max(0, planRemainingBalance).toFixed(2),
            status: planStatus,
          })
          .where(eq(installmentPlans.id, installment.planId));

        // If this installment is paid, activate next one
        if (isFullyPaid) {
          const nextInstallment = await db
            .select()
            .from(installments)
            .where(
              and(
                eq(installments.planId, installment.planId),
                eq(installments.status, "SCHEDULED")
              )
            )
            .orderBy(asc(installments.installmentNumber))
            .limit(1);

          if (nextInstallment.length > 0) {
            await db
              .update(installments)
              .set({ status: "PENDING" })
              .where(eq(installments.id, nextInstallment[0].id));
          }
        }
      }

      logger.info({
        msg: "[InstallmentPayments] Recorded payment",
        installmentId: input.installmentId,
        amountPaid: input.amountPaid,
        isFullyPaid,
      });

      return { success: true, isFullyPaid, newBalance: newPaid };
    }),

  /**
   * Get overdue installments (alerts)
   */
  getOverdueInstallments: protectedProcedure
    .use(requirePermission("payments:read"))
    .input(z.object({
      clientId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all pending/partial installments that are past due
      const conditions = [
        lte(installments.dueDate, today),
        sql`${installments.status} IN ('PENDING', 'PARTIAL')`,
      ];

      const overdueList = await db
        .select({
          installment: installments,
          plan: installmentPlans,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(installments)
        .innerJoin(installmentPlans, eq(installments.planId, installmentPlans.id))
        .leftJoin(clients, eq(installmentPlans.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(asc(installments.dueDate));

      // Update status to OVERDUE for these installments
      const overdueIds = overdueList.map(o => o.installment.id);
      if (overdueIds.length > 0) {
        await db
          .update(installments)
          .set({ status: "OVERDUE" })
          .where(
            and(
              sql`id IN (${sql.join(overdueIds.map(id => sql`${id}`), sql`, `)})`,
              sql`status != 'OVERDUE'`
            )
          );
      }

      // Filter by client if specified
      let filteredList = overdueList;
      if (input?.clientId) {
        filteredList = overdueList.filter(o => o.client?.id === input.clientId);
      }

      return filteredList.map(o => {
        const dueDate = new Date(o.installment.dueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amountDue = parseFloat(o.installment.amountDue || "0");
        const amountPaid = parseFloat(o.installment.amountPaid || "0");

        return {
          installmentId: o.installment.id,
          planId: o.plan.id,
          planName: o.plan.planName,
          clientId: o.client?.id,
          clientName: o.client?.name,
          teriCode: o.client?.teriCode,
          installmentNumber: o.installment.installmentNumber,
          dueDate: o.installment.dueDate,
          daysOverdue,
          amountDue,
          amountPaid,
          amountRemaining: amountDue - amountPaid,
          lateFee: parseFloat(o.plan.lateFeeAmount || "0"),
        };
      });
    }),

  /**
   * Apply late fees to overdue installments
   */
  applyLateFees: protectedProcedure
    .use(requirePermission("payments:update"))
    .input(z.object({ installmentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get installment with plan
      const [result] = await db
        .select({
          installment: installments,
          plan: installmentPlans,
        })
        .from(installments)
        .innerJoin(installmentPlans, eq(installments.planId, installmentPlans.id))
        .where(eq(installments.id, input.installmentId))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Installment not found" });
      }

      const lateFee = parseFloat(result.plan.lateFeeAmount || "0");
      const currentLateFee = parseFloat(result.installment.lateFeeApplied || "0");

      if (lateFee <= 0) {
        return { success: true, lateFeeApplied: 0 };
      }

      // Apply late fee
      const newLateFee = currentLateFee + lateFee;
      const newAmountDue = parseFloat(result.installment.amountDue || "0") + lateFee;

      await db
        .update(installments)
        .set({
          lateFeeApplied: newLateFee.toFixed(2),
          amountDue: newAmountDue.toFixed(2),
        })
        .where(eq(installments.id, input.installmentId));

      // Update plan remaining balance
      const planRemaining = parseFloat(result.plan.remainingBalance || "0") + lateFee;
      await db
        .update(installmentPlans)
        .set({
          remainingBalance: planRemaining.toFixed(2),
          totalAmount: (parseFloat(result.plan.totalAmount || "0") + lateFee).toFixed(2),
        })
        .where(eq(installmentPlans.id, result.plan.id));

      logger.info({
        msg: "[InstallmentPayments] Applied late fee",
        installmentId: input.installmentId,
        lateFee,
      });

      return { success: true, lateFeeApplied: lateFee };
    }),

  /**
   * Cancel installment plan
   */
  cancelPlan: protectedProcedure
    .use(requirePermission("payments:delete"))
    .input(z.object({
      planId: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Update plan status
      await db
        .update(installmentPlans)
        .set({
          status: "CANCELLED",
          notes: input.reason ? `Cancelled: ${input.reason}` : "Cancelled",
        })
        .where(eq(installmentPlans.id, input.planId));

      // Cancel all scheduled installments
      await db
        .update(installments)
        .set({ status: "CANCELLED" })
        .where(
          and(
            eq(installments.planId, input.planId),
            sql`status IN ('SCHEDULED', 'PENDING')`
          )
        );

      logger.info({
        msg: "[InstallmentPayments] Cancelled plan",
        planId: input.planId,
        reason: input.reason,
      });

      return { success: true };
    }),

  /**
   * Get installment schedule preview
   */
  previewSchedule: protectedProcedure
    .use(requirePermission("payments:read"))
    .input(z.object({
      totalAmount: z.number().positive(),
      numberOfInstallments: z.number().min(2).max(60),
      frequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
      customIntervalDays: z.number().min(1).max(365).optional(),
      firstPaymentDate: z.string(),
      downPaymentAmount: z.number().min(0).default(0),
      interestRate: z.number().min(0).max(50).default(0),
    }))
    .query(async ({ input }) => {
      const installmentAmount = calculateInstallmentAmount(
        input.totalAmount,
        input.downPaymentAmount,
        input.numberOfInstallments,
        input.interestRate
      );

      const firstPaymentDate = new Date(input.firstPaymentDate);
      const dates = calculateInstallmentDates(
        firstPaymentDate,
        input.numberOfInstallments,
        input.frequency,
        input.customIntervalDays
      );

      const remaining = input.totalAmount - input.downPaymentAmount;
      const totalWithInterest = remaining * (1 + input.interestRate / 100);

      return {
        downPayment: input.downPaymentAmount,
        installmentAmount,
        numberOfInstallments: input.numberOfInstallments,
        totalWithInterest: Math.round(totalWithInterest * 100) / 100,
        interestTotal: Math.round((totalWithInterest - remaining) * 100) / 100,
        schedule: dates.map((date, i) => ({
          installmentNumber: i + 1,
          dueDate: date.toISOString().split("T")[0],
          amount: i === input.numberOfInstallments - 1
            ? Math.round((totalWithInterest - installmentAmount * (input.numberOfInstallments - 1)) * 100) / 100
            : installmentAmount,
        })),
      };
    }),

  /**
   * Get plan statistics
   */
  getStats: protectedProcedure
    .use(requirePermission("payments:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [stats] = await db
        .select({
          totalPlans: sql<number>`COUNT(*)`,
          activePlans: sql<number>`SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END)`,
          completedPlans: sql<number>`SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END)`,
          defaultedPlans: sql<number>`SUM(CASE WHEN status = 'DEFAULTED' THEN 1 ELSE 0 END)`,
          totalAmount: sql<string>`SUM(CAST(total_amount AS DECIMAL(15,2)))`,
          totalPaid: sql<string>`SUM(CAST(total_paid AS DECIMAL(15,2)))`,
          totalRemaining: sql<string>`SUM(CAST(remaining_balance AS DECIMAL(15,2)))`,
        })
        .from(installmentPlans)
        .where(isNull(installmentPlans.deletedAt));

      const [overdueStats] = await db
        .select({
          count: sql<number>`COUNT(*)`,
          amount: sql<string>`SUM(CAST(amount_due AS DECIMAL(15,2)) - CAST(COALESCE(amount_paid, 0) AS DECIMAL(15,2)))`,
        })
        .from(installments)
        .where(eq(installments.status, "OVERDUE"));

      return {
        plans: {
          total: Number(stats?.totalPlans || 0),
          active: Number(stats?.activePlans || 0),
          completed: Number(stats?.completedPlans || 0),
          defaulted: Number(stats?.defaultedPlans || 0),
        },
        amounts: {
          totalAmount: parseFloat(stats?.totalAmount || "0"),
          totalPaid: parseFloat(stats?.totalPaid || "0"),
          totalRemaining: parseFloat(stats?.totalRemaining || "0"),
        },
        overdue: {
          count: Number(overdueStats?.count || 0),
          amount: parseFloat(overdueStats?.amount || "0"),
        },
      };
    }),
});
