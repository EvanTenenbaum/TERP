import { z } from "zod";
import { publicProcedure, router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import * as calendarDb from "../calendarDb";
import InstanceGenerationService from "../_core/instanceGenerationService";
import PermissionService from "../_core/permissionService";
import { requirePermission } from "../_core/permissionMiddleware";
import { idSchema, dateStringSchema, nameSchema, descriptionSchema } from "../_core/validationSchemas";

/**
 * Calendar Recurrence Router
 * Recurrence pattern management and instance generation
 * Version 2.1 - QUAL-002 Validation Improvements
 * PRODUCTION-READY - No placeholders
 */

// Recurrence frequency enum
const recurrenceFrequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);

// Days ahead validation (reasonable range: 1 to 365 days)
const daysAheadSchema = z.number()
  .int("Days must be a whole number")
  .min(1, "Days ahead must be at least 1")
  .max(365, "Cannot generate instances more than 1 year ahead")
  .default(90);

// Instance modifications schema
const instanceModificationsSchema = z.object({
  title: nameSchema.optional(),
  description: descriptionSchema,
  location: z.string().max(500, "Location too long").optional(),
  assignedTo: idSchema.optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format").optional(),
});

// Recurrence rule updates schema
const recurrenceRuleUpdatesSchema = z.object({
  frequency: recurrenceFrequencySchema.optional(),
  interval: z.number().int().min(1, "Interval must be at least 1").max(99, "Interval too large").optional(),
  byDay: z.array(z.number().int().min(0).max(6)).optional(),
  byMonthDay: z.array(z.number().int().min(1).max(31)).optional(),
  endDate: dateStringSchema.optional(),
  count: z.number().int().min(1, "Count must be at least 1").max(999, "Count too large").optional(),
});

export const calendarRecurrenceRouter = router({
  // Get recurrence rule for event
  getRecurrenceRule: publicProcedure
    .input(z.object({ eventId: idSchema }))
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(userId, input.eventId, "VIEW");

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      return await calendarDb.getRecurrenceRule(input.eventId);
    }),

  // Get instances for recurring event
  getInstances: publicProcedure
    .input(
      z.object({
        eventId: idSchema,
        startDate: dateStringSchema.optional(),
        endDate: dateStringSchema.optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(userId, input.eventId, "VIEW");

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      return await calendarDb.getInstancesByEvent(
        input.eventId,
        input.startDate,
        input.endDate
      );
    }),

  // Modify a specific instance
  modifyInstance: publicProcedure
    .input(
      z.object({
        eventId: idSchema,
        instanceDate: dateStringSchema,
        modifications: instanceModificationsSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(userId, input.eventId, "EDIT");

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Modify instance
      await InstanceGenerationService.modifyInstance(
        input.eventId,
        input.instanceDate,
        input.modifications,
        userId
      );

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: userId,
        changeType: "UPDATED",
        fieldChanged: "recurrence_instance",
        previousValue: null,
        newValue: `Modified instance on ${input.instanceDate}`,
        changeReason: JSON.stringify(input.modifications),
      });

      return { success: true };
    }),

  // Cancel a specific instance
  cancelInstance: publicProcedure
    .input(
      z.object({
        eventId: idSchema,
        instanceDate: dateStringSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(userId, input.eventId, "EDIT");

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Cancel instance
      await InstanceGenerationService.cancelInstance(
        input.eventId,
        input.instanceDate
      );

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: userId,
        changeType: "UPDATED",
        fieldChanged: "recurrence_instance",
        previousValue: null,
        newValue: `Cancelled instance on ${input.instanceDate}`,
        changeReason: null,
      });

      return { success: true };
    }),

  // Regenerate instances (admin/background job)
  regenerateInstances: publicProcedure
    .input(
      z.object({
        eventId: idSchema,
        daysAhead: daysAheadSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(userId, input.eventId, "MANAGE");

      if (!hasPermission) {
        throw new Error("Permission denied - requires MANAGE permission");
      }

      // Regenerate instances
      const count = await InstanceGenerationService.generateInstances(
        input.eventId,
        input.daysAhead
      );

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: userId,
        changeType: "UPDATED",
        fieldChanged: "recurrence_instances",
        previousValue: null,
        newValue: `Regenerated ${count} instances`,
        changeReason: `Days ahead: ${input.daysAhead}`,
      });

      return { count };
    }),

  // Regenerate all instances (admin/background job)
  regenerateAllInstances: protectedProcedure
    .use(requirePermission("calendar:admin"))
    .input(
      z.object({
        daysAhead: daysAheadSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Regenerate all instances
      const count = await InstanceGenerationService.regenerateAllInstances(
        input.daysAhead
      );

      return { count };
    }),

  // Update recurrence rule
  updateRecurrenceRule: publicProcedure
    .input(
      z.object({
        eventId: idSchema,
        updates: recurrenceRuleUpdatesSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(userId, input.eventId, "EDIT");

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Convert string dates to Date objects for database
      const dbUpdates: Record<string, unknown> = { ...input.updates };
      if (input.updates.endDate) {
        dbUpdates.endDate = new Date(input.updates.endDate);
      }

      // Update recurrence rule
      await calendarDb.updateRecurrenceRule(input.eventId, dbUpdates as Parameters<typeof calendarDb.updateRecurrenceRule>[1]);

      // Regenerate instances with new rule
      await InstanceGenerationService.generateInstances(input.eventId, 90);

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: userId,
        changeType: "UPDATED",
        fieldChanged: "recurrence_rule",
        previousValue: null,
        newValue: "Recurrence rule updated",
        changeReason: JSON.stringify(input.updates),
      });

      return { success: true };
    }),

  // Delete recurrence rule (convert to single event)
  deleteRecurrenceRule: publicProcedure
    .input(z.object({ eventId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(userId, input.eventId, "EDIT");

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Delete recurrence rule
      await calendarDb.deleteRecurrenceRule(input.eventId);

      // Delete all instances
      await calendarDb.deleteInstancesByEvent(input.eventId);

      // Update event to mark as non-recurring
      await calendarDb.updateEvent(input.eventId, { isRecurring: false });

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: userId,
        changeType: "UPDATED",
        fieldChanged: "recurrence_rule",
        previousValue: "Recurring",
        newValue: "Single event",
        changeReason: "Recurrence rule deleted",
      });

      return { success: true };
    }),
});
