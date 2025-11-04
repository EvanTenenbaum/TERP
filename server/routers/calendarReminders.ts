import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as calendarDb from "../calendarDb";

/**
 * Calendar Reminders Router
 * Reminder management for calendar events
 * Version 2.0 - Post-Adversarial QA
 */

export const calendarRemindersRouter = router({
  // Get reminders for an event
  getReminders: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      return await calendarDb.getEventReminders(input.eventId);
    }),

  // Create reminder
  createReminder: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        relativeMinutes: z.number(), // Minutes before event
        method: z.enum(["IN_APP", "EMAIL", "BOTH"]).default("IN_APP"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Calculate absolute reminder time from event start time
      // TODO: Validate user has permission to create reminders

      const userId = ctx.user?.id || 1;

      // For now, use a placeholder reminder time
      const reminderTime = new Date();
      reminderTime.setMinutes(reminderTime.getMinutes() + input.relativeMinutes);

      return await calendarDb.createReminder({
        eventId: input.eventId,
        userId,
        reminderTime,
        relativeMinutes: input.relativeMinutes,
        method: input.method,
        status: "PENDING",
      });
    }),

  // Get pending reminders (for background job)
  getPendingReminders: publicProcedure.query(async () => {
    const now = new Date();
    return await calendarDb.getPendingReminders(now);
  }),

  // Mark reminder as sent (for background job)
  markSent: publicProcedure
    .input(z.object({ reminderId: z.number() }))
    .mutation(async ({ input }) => {
      return await calendarDb.updateReminderStatus(input.reminderId, "SENT");
    }),

  // Mark reminder as failed (for background job)
  markFailed: publicProcedure
    .input(
      z.object({
        reminderId: z.number(),
        failureReason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await calendarDb.updateReminderStatus(
        input.reminderId,
        "FAILED",
        input.failureReason
      );
    }),
});
