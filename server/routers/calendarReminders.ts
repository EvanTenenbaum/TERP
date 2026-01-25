import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import * as calendarDb from "../calendarDb";
import PermissionService from "../_core/permissionService";
import { getDb } from "../db";
import { calendarReminders } from "../../drizzle/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";
import { idSchema } from "../_core/validationSchemas";

/**
 * Calendar Reminders Router
 * Reminder management for calendar events
 * Version 2.1 - QUAL-002 Validation Improvements
 * PRODUCTION-READY - No placeholders
 */

// Reminder method enum for type safety
const reminderMethodSchema = z.enum(["IN_APP", "EMAIL", "BOTH"]);

// Relative minutes validation (reasonable range: 0 to 1 week in minutes)
const relativeMinutesSchema = z.number()
  .int("Minutes must be a whole number")
  .min(0, "Minutes cannot be negative")
  .max(10080, "Reminder cannot be more than 1 week before event");

export const calendarRemindersRouter = router({
  // Get reminders for an event
  getReminders: protectedProcedure
    .input(z.object({ eventId: idSchema }))
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        userId,
        input.eventId,
        "VIEW"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      return await calendarDb.getEventReminders(input.eventId);
    }),

  // Create reminder
  createReminder: protectedProcedure
    .input(
      z.object({
        eventId: idSchema,
        relativeMinutes: relativeMinutesSchema,
        method: reminderMethodSchema.default("IN_APP"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        userId,
        input.eventId,
        "VIEW"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Get event to calculate reminder time
      const event = await calendarDb.getEventById(input.eventId);
      if (!event) throw new Error("Event not found");

      // Calculate absolute reminder time
      const eventDateTime = new Date(`${event.startDate}T${event.startTime || "00:00:00"}`);
      const reminderTime = new Date(eventDateTime);
      reminderTime.setMinutes(reminderTime.getMinutes() - input.relativeMinutes);

      // Create reminder
      const reminder = await calendarDb.createReminder({
        eventId: input.eventId,
        userId,
        reminderTime,
        relativeMinutes: input.relativeMinutes,
        method: input.method,
        status: "PENDING",
      });

      return reminder;
    }),

  // Delete reminder
  deleteReminder: protectedProcedure
    .input(z.object({ reminderId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Delete reminder
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      await db
        .delete(calendarReminders)
        .where(eq(calendarReminders.id, input.reminderId));

      return { success: true };
    }),

  // Get pending reminders (for background job)
  getPendingReminders: protectedProcedure.query(async () => {
    const now = new Date();
    return await calendarDb.getPendingReminders(now);
  }),

  // Mark reminder as sent (for background job)
  markSent: protectedProcedure
    .input(z.object({ reminderId: idSchema }))
    .mutation(async ({ input }) => {
      return await calendarDb.updateReminderStatus(input.reminderId, "SENT");
    }),

  // Mark reminder as failed (for background job)
  markFailed: protectedProcedure
    .input(
      z.object({
        reminderId: idSchema,
        failureReason: z.string().min(1, "Failure reason is required").max(500, "Failure reason too long"),
      })
    )
    .mutation(async ({ input }) => {
      return await calendarDb.updateReminderStatus(
        input.reminderId,
        "FAILED",
        input.failureReason
      );
    }),

  // Get user's upcoming reminders
  getMyUpcomingReminders: protectedProcedure
    .input(
      z.object({
        hoursAhead: z.number().int().min(1, "Hours must be at least 1").max(168, "Cannot look more than 1 week ahead").default(24),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const now = new Date();
      const future = new Date();
      future.setHours(future.getHours() + input.hoursAhead);

      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const reminders = await db
        .select()
        .from(calendarReminders)
        .where(
          and(
            eq(calendarReminders.userId, userId),
            eq(calendarReminders.status, "PENDING"),
            gte(calendarReminders.reminderTime, now),
            lte(calendarReminders.reminderTime, future)
          )
        );

      return reminders;
    }),
});
