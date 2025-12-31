/**
 * WS-014: Vendor Harvest Reminders Router
 * Tracks vendor harvest dates and sends reminders for outreach
 */

import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import { db } from "../db";
import { vendors, vendorHarvestReminders, users } from "../../drizzle/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export const vendorRemindersRouter = router({
  /**
   * Set expected harvest date for a vendor
   */
  setHarvestDate: adminProcedure
    .input(z.object({
      vendorId: z.number(),
      expectedHarvestDate: z.date(),
      strain: z.string().optional(),
      estimatedQuantity: z.number().optional(),
      notes: z.string().optional(),
      reminderDaysBefore: z.number().default(7), // Days before harvest to remind
    }))
    .mutation(async ({ input, ctx }) => {
      // Calculate reminder date
      const reminderDate = new Date(input.expectedHarvestDate);
      reminderDate.setDate(reminderDate.getDate() - input.reminderDaysBefore);

      const [reminder] = await db.insert(vendorHarvestReminders).values({
        vendorId: input.vendorId,
        expectedHarvestDate: input.expectedHarvestDate,
        reminderDate,
        strain: input.strain,
        estimatedQuantity: input.estimatedQuantity ? String(input.estimatedQuantity) : null,
        notes: input.notes,
        status: 'PENDING',
        createdBy: ctx.user.id,
        createdAt: new Date(),
      });

      return {
        reminderId: reminder.insertId,
        reminderDate,
        success: true,
      };
    }),

  /**
   * Get upcoming harvest reminders
   */
  getUpcoming: adminProcedure
    .input(z.object({
      days: z.number().default(14), // Look ahead days
    }))
    .query(async ({ input }) => {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.days);

      const reminders = await db
        .select({
          id: vendorHarvestReminders.id,
          vendorId: vendorHarvestReminders.vendorId,
          vendorName: vendors.name,
          expectedHarvestDate: vendorHarvestReminders.expectedHarvestDate,
          reminderDate: vendorHarvestReminders.reminderDate,
          strain: vendorHarvestReminders.strain,
          estimatedQuantity: vendorHarvestReminders.estimatedQuantity,
          notes: vendorHarvestReminders.notes,
          status: vendorHarvestReminders.status,
        })
        .from(vendorHarvestReminders)
        .leftJoin(vendors, eq(vendorHarvestReminders.vendorId, vendors.id))
        .where(and(
          eq(vendorHarvestReminders.status, 'PENDING'),
          lte(vendorHarvestReminders.reminderDate, futureDate)
        ))
        .orderBy(vendorHarvestReminders.reminderDate);

      return reminders.map(r => ({
        id: r.id,
        vendorId: r.vendorId,
        vendorName: r.vendorName || 'Unknown',
        expectedHarvestDate: r.expectedHarvestDate,
        reminderDate: r.reminderDate,
        strain: r.strain,
        estimatedQuantity: r.estimatedQuantity ? parseFloat(r.estimatedQuantity as string) : null,
        notes: r.notes,
        status: r.status,
        isDue: r.reminderDate ? new Date(r.reminderDate) <= now : false,
      }));
    }),

  /**
   * Mark reminder as contacted
   */
  markContacted: adminProcedure
    .input(z.object({
      reminderId: z.number(),
      contactNotes: z.string().optional(),
      newExpectedDate: z.date().optional(), // If vendor gives new date
    }))
    .mutation(async ({ input, ctx }) => {
      await db
        .update(vendorHarvestReminders)
        .set({
          status: 'CONTACTED',
          contactedAt: new Date(),
          contactedBy: ctx.user.id,
          contactNotes: input.contactNotes,
        })
        .where(eq(vendorHarvestReminders.id, input.reminderId));

      // If new date provided, create a new reminder
      if (input.newExpectedDate) {
        const [oldReminder] = await db
          .select()
          .from(vendorHarvestReminders)
          .where(eq(vendorHarvestReminders.id, input.reminderId));

        if (oldReminder) {
          const reminderDate = new Date(input.newExpectedDate);
          reminderDate.setDate(reminderDate.getDate() - 7);

          await db.insert(vendorHarvestReminders).values({
            vendorId: oldReminder.vendorId,
            expectedHarvestDate: input.newExpectedDate,
            reminderDate,
            strain: oldReminder.strain,
            notes: `Follow-up from reminder #${input.reminderId}`,
            status: 'PENDING',
            createdBy: ctx.user.id,
            createdAt: new Date(),
          });
        }
      }

      return { success: true };
    }),

  /**
   * Mark reminder as completed (harvest received)
   */
  markCompleted: adminProcedure
    .input(z.object({
      reminderId: z.number(),
      actualQuantity: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db
        .update(vendorHarvestReminders)
        .set({
          status: 'COMPLETED',
          completedAt: new Date(),
          actualQuantity: input.actualQuantity ? String(input.actualQuantity) : null,
          completionNotes: input.notes,
        })
        .where(eq(vendorHarvestReminders.id, input.reminderId));

      return { success: true };
    }),

  /**
   * Get vendor harvest history
   */
  getVendorHistory: adminProcedure
    .input(z.object({
      vendorId: z.number(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const history = await db
        .select({
          id: vendorHarvestReminders.id,
          expectedHarvestDate: vendorHarvestReminders.expectedHarvestDate,
          strain: vendorHarvestReminders.strain,
          estimatedQuantity: vendorHarvestReminders.estimatedQuantity,
          actualQuantity: vendorHarvestReminders.actualQuantity,
          status: vendorHarvestReminders.status,
          completedAt: vendorHarvestReminders.completedAt,
        })
        .from(vendorHarvestReminders)
        .where(eq(vendorHarvestReminders.vendorId, input.vendorId))
        .orderBy(desc(vendorHarvestReminders.expectedHarvestDate))
        .limit(input.limit);

      return history.map(h => ({
        id: h.id,
        expectedHarvestDate: h.expectedHarvestDate,
        strain: h.strain,
        estimatedQuantity: h.estimatedQuantity ? parseFloat(h.estimatedQuantity as string) : null,
        actualQuantity: h.actualQuantity ? parseFloat(h.actualQuantity as string) : null,
        status: h.status,
        completedAt: h.completedAt,
      }));
    }),

  /**
   * Get reminder stats for dashboard
   */
  getStats: adminProcedure.query(async () => {
    const now = new Date();

    // Count due reminders
    const dueReminders = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vendorHarvestReminders)
      .where(and(
        eq(vendorHarvestReminders.status, 'PENDING'),
        lte(vendorHarvestReminders.reminderDate, now)
      ));

    // Count upcoming reminders (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingReminders = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vendorHarvestReminders)
      .where(and(
        eq(vendorHarvestReminders.status, 'PENDING'),
        gte(vendorHarvestReminders.reminderDate, now),
        lte(vendorHarvestReminders.reminderDate, nextWeek)
      ));

    // Count total pending
    const totalPending = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vendorHarvestReminders)
      .where(eq(vendorHarvestReminders.status, 'PENDING'));

    return {
      dueNow: dueReminders[0]?.count || 0,
      upcomingThisWeek: upcomingReminders[0]?.count || 0,
      totalPending: totalPending[0]?.count || 0,
    };
  }),
});
