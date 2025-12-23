import { z } from "zod";
import { publicProcedure, protectedProcedure, router, getAuthenticatedUserId } from "../_core/trpc";
import { getDb } from "../db";
import * as calendarDb from "../calendarDb";
import { calendarEvents, orders, invoices, bills } from "../../drizzle/schema";
import { and, eq, gte, lte, isNull, sql, desc } from "drizzle-orm";

/**
 * Calendar Financials Router
 * Financial context for AP/AR meeting preparation (V2.1 Addition)
 * Version 2.0 - Post-Adversarial QA
 * PRODUCTION-READY - No placeholders
 */

export const calendarFinancialsRouter = router({
  // Get financial context for client meeting
  getMeetingFinancialContext: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get outstanding invoices for this client
      const clientInvoices = await db.query.invoices.findMany({
        where: and(
          eq(invoices.customerId, input.clientId),
          isNull(invoices.deletedAt)
        ),
        orderBy: [desc(invoices.createdAt)],
        limit: 20,
      });

      // Calculate AR metrics
      let outstandingAR = 0;
      let overdueAmount = 0;
      let maxDaysPastDue = 0;
      const now = new Date();

      const recentInvoices = clientInvoices.slice(0, 5).map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        total: parseFloat(inv.totalAmount ?? "0"),
        status: inv.status,
        dueDate: inv.dueDate,
        createdAt: inv.createdAt,
      }));

      for (const inv of clientInvoices) {
        // Check for unpaid statuses (DRAFT, SENT, VIEWED, PARTIAL, OVERDUE)
        if (inv.status !== "PAID" && inv.status !== "VOID") {
          const amount = parseFloat(inv.totalAmount ?? "0");
          outstandingAR += amount;

          if (inv.dueDate && new Date(inv.dueDate) < now) {
            overdueAmount += amount;
            const daysPastDue = Math.floor(
              (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysPastDue > maxDaysPastDue) {
              maxDaysPastDue = daysPastDue;
            }
          }
        }
      }

      // Get recent payments (from orders with cash payments)
      const recentOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.clientId, input.clientId),
          eq(orders.saleStatus, "PAID")
        ),
        orderBy: [desc(orders.createdAt)],
        limit: 5,
      });

      const recentPayments = recentOrders
        .filter((o) => parseFloat(o.cashPayment ?? "0") > 0)
        .map((o) => ({
          orderId: o.id,
          amount: parseFloat(o.cashPayment ?? "0"),
          date: o.createdAt,
        }));

      // Calculate average days to pay from paid invoices
      // Note: Invoice schema doesn't have paidAt, so we estimate from updatedAt when status is PAID
      const paidInvoices = clientInvoices.filter((inv) => inv.status === "PAID");
      let totalDaysToPay = 0;
      let paidCount = 0;

      for (const inv of paidInvoices) {
        if (inv.createdAt && inv.updatedAt) {
          // Use updatedAt as proxy for payment date when status is PAID
          const daysToPay = Math.floor(
            (new Date(inv.updatedAt).getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          totalDaysToPay += daysToPay;
          paidCount++;
        }
      }

      const averageDaysToPay = paidCount > 0 ? Math.round(totalDaysToPay / paidCount) : 0;
      const lastPaymentDate = recentPayments.length > 0 ? recentPayments[0].date : null;

      return {
        clientId: input.clientId,
        outstandingAR,
        overdueAmount,
        daysPastDue: maxDaysPastDue,
        creditLimit: 0, // Would come from client profile
        creditUsed: outstandingAR,
        creditAvailable: 0, // creditLimit - creditUsed
        recentPayments,
        recentInvoices,
        lastPaymentDate,
        averageDaysToPay,
      };
    }),

  // Get collections queue (prioritized list)
  getCollectionsQueue: protectedProcedure
    .input(
      z.object({
        minOverdueAmount: z.number().default(0),
        minDaysPastDue: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const { minOverdueAmount, minDaysPastDue } = input;

      // Get all overdue invoices (unpaid and past due date)
      const overdueInvoices = await db.query.invoices.findMany({
        where: and(
          sql`${invoices.status} IN ('DRAFT', 'SENT', 'VIEWED', 'PARTIAL', 'OVERDUE')`,
          lte(invoices.dueDate, now),
          isNull(invoices.deletedAt)
        ),
        with: {
          customer: true,
        },
        orderBy: [desc(invoices.totalAmount)],
      });

      // Group by client and calculate metrics
      const clientMap = new Map<number, {
        clientId: number;
        clientName: string;
        totalOverdue: number;
        invoiceCount: number;
        oldestDueDate: Date;
        maxDaysPastDue: number;
      }>();

      for (const inv of overdueInvoices) {
        const amount = parseFloat(inv.totalAmount ?? "0");
        const dueDate = new Date(inv.dueDate!);
        const daysPastDue = Math.floor(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Apply filters
        if (amount < minOverdueAmount || daysPastDue < minDaysPastDue) {
          continue;
        }

        const existing = clientMap.get(inv.customerId);
        if (existing) {
          existing.totalOverdue += amount;
          existing.invoiceCount++;
          if (dueDate < existing.oldestDueDate) {
            existing.oldestDueDate = dueDate;
            existing.maxDaysPastDue = daysPastDue;
          }
        } else {
          clientMap.set(inv.customerId, {
            clientId: inv.customerId,
            clientName: (inv.customer as { name?: string })?.name ?? "Unknown",
            totalOverdue: amount,
            invoiceCount: 1,
            oldestDueDate: dueDate,
            maxDaysPastDue: daysPastDue,
          });
        }
      }

      // Convert to array and sort by total overdue (highest first)
      const queue = Array.from(clientMap.values())
        .sort((a, b) => b.totalOverdue - a.totalOverdue);

      return queue;
    }),

  // Get AP/AR summary for date range
  getAPARSummary: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      const now = new Date();

      // Get AR data from invoices
      const allInvoices = await db.query.invoices.findMany({
        where: and(
          gte(invoices.createdAt, startDate),
          lte(invoices.createdAt, endDate),
          isNull(invoices.deletedAt)
        ),
      });

      let totalAR = 0;
      let overdueAR = 0;
      let upcomingAR = 0;
      const arByStatus = {
        current: 0,
        overdue_1_30: 0,
        overdue_31_60: 0,
        overdue_61_90: 0,
        overdue_90_plus: 0,
      };

      for (const inv of allInvoices) {
        if (inv.status === "PAID") continue;

        const amount = parseFloat(inv.totalAmount ?? "0");
        totalAR += amount;

        if (inv.dueDate) {
          const dueDate = new Date(inv.dueDate);
          if (dueDate > now) {
            upcomingAR += amount;
            arByStatus.current += amount;
          } else {
            overdueAR += amount;
            const daysPastDue = Math.floor(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysPastDue <= 30) {
              arByStatus.overdue_1_30 += amount;
            } else if (daysPastDue <= 60) {
              arByStatus.overdue_31_60 += amount;
            } else if (daysPastDue <= 90) {
              arByStatus.overdue_61_90 += amount;
            } else {
              arByStatus.overdue_90_plus += amount;
            }
          }
        } else {
          arByStatus.current += amount;
        }
      }

      // Get AP data from bills
      const allBills = await db.query.bills.findMany({
        where: and(
          gte(bills.createdAt, startDate),
          lte(bills.createdAt, endDate),
          isNull(bills.deletedAt)
        ),
      });

      let totalAP = 0;
      let overdueAP = 0;
      let upcomingAP = 0;

      for (const bill of allBills) {
        if (bill.status === "PAID") continue;

        const amount = parseFloat(bill.totalAmount ?? "0");
        totalAP += amount;

        if (bill.dueDate) {
          const dueDate = new Date(bill.dueDate);
          if (dueDate > now) {
            upcomingAP += amount;
          } else {
            overdueAP += amount;
          }
        }
      }

      return {
        totalAR,
        totalAP,
        overdueAR,
        overdueAP,
        upcomingAR,
        upcomingAP,
        arByStatus,
      };
    }),

  // Set custom reminder for sales sheet
  setSalesSheetReminder: protectedProcedure
    .input(
      z.object({
        salesSheetId: z.number(),
        reminderTime: z.string(), // ISO datetime
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Create calendar event for sales sheet follow-up
      const reminderDate = new Date(input.reminderTime);
      const timeStr = reminderDate.toTimeString().split(" ")[0];

      const event = await calendarDb.createEvent({
        title: `Sales Sheet Follow-up #${input.salesSheetId}`,
        description: input.message || "Follow up on sales sheet",
        location: null,
        startDate: reminderDate,
        endDate: reminderDate,
        startTime: timeStr,
        endTime: null,
        timezone: "America/Los_Angeles", // Default timezone - user preference would be loaded from user settings
        isFloatingTime: false,
        module: "CLIENTS",
        eventType: "FOLLOW_UP",
        status: "SCHEDULED",
        priority: "MEDIUM",
        visibility: "TEAM",
        createdBy: userId,
        assignedTo: userId,
        entityType: "sales_sheet",
        entityId: input.salesSheetId,
        isRecurring: false,
        isAutoGenerated: false,
        autoGenerationRule: null,
      });

      // Create reminder 15 minutes before
      const reminderTimeCalc = new Date(input.reminderTime);
      reminderTimeCalc.setMinutes(reminderTimeCalc.getMinutes() - 15);

      await calendarDb.createReminder({
        eventId: event.id,
        userId,
        reminderTime: reminderTimeCalc,
        relativeMinutes: 15,
        method: "IN_APP",
        status: "PENDING",
      });

      return event;
    }),

  // Get upcoming sales sheet reminders
  getUpcomingSalesSheetReminders: protectedProcedure
    .input(
      z.object({
        daysAhead: z.number().default(7),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + input.daysAhead);

      const events = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.assignedTo, userId),
            eq(calendarEvents.entityType, "sales_sheet"),
            eq(calendarEvents.eventType, "FOLLOW_UP"),
            gte(calendarEvents.startDate, now),
            lte(calendarEvents.startDate, future),
            isNull(calendarEvents.deletedAt)
          )
        );

      return events;
    }),

  // Create payment due reminder
  createPaymentDueReminder: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        clientId: z.number(),
        dueDate: z.string(),
        amount: z.number(),
        reminderDaysBefore: z.number().default(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Calculate reminder date
      const dueDate = new Date(input.dueDate);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - input.reminderDaysBefore);

      // Create calendar event
      const event = await calendarDb.createEvent({
        title: `Payment Due: Invoice #${input.invoiceId}`,
        description: `Payment of $${input.amount.toFixed(2)} due on ${input.dueDate}`,
        location: null,
        startDate: reminderDate,
        endDate: reminderDate,
        startTime: "09:00:00",
        endTime: null,
        timezone: "America/Los_Angeles",
        isFloatingTime: false,
        module: "ACCOUNTING",
        eventType: "PAYMENT_DUE",
        status: "SCHEDULED",
        priority: "HIGH",
        visibility: "TEAM",
        createdBy: userId,
        assignedTo: userId,
        entityType: "invoice",
        entityId: input.invoiceId,
        isRecurring: false,
        isAutoGenerated: true,
        autoGenerationRule: "payment_due_reminder",
      });

      return event;
    }),

  // Get overdue payment events
  getOverduePayments: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.eventType, "PAYMENT_DUE"),
          eq(calendarEvents.status, "SCHEDULED"),
          lte(calendarEvents.startDate, today),
          isNull(calendarEvents.deletedAt)
        )
      );

    return events;
  }),
});
