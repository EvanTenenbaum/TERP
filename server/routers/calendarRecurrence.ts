import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as calendarDb from "../calendarDb";
import InstanceGenerationService from "../_core/instanceGenerationService";

/**
 * Calendar Recurrence Router
 * Recurrence pattern management and instance generation
 * Version 2.0 - Post-Adversarial QA
 */

export const calendarRecurrenceRouter = router({
  // Get recurrence rule for event
  getRecurrenceRule: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      return await calendarDb.getRecurrenceRule(input.eventId);
    }),

  // Get instances for recurring event
  getInstances: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
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
        eventId: z.number(),
        instanceDate: z.string(),
        modifications: z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
          assignedTo: z.number().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Check user has EDIT permission

      const userId = ctx.user?.id || 1;

      await InstanceGenerationService.modifyInstance(
        input.eventId,
        input.instanceDate,
        input.modifications,
        userId
      );

      return { success: true };
    }),

  // Cancel a specific instance
  cancelInstance: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        instanceDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Check user has EDIT permission

      await InstanceGenerationService.cancelInstance(
        input.eventId,
        input.instanceDate
      );

      return { success: true };
    }),

  // Regenerate instances (admin/background job)
  regenerateInstances: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        daysAhead: z.number().default(90),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Check admin permission

      const count = await InstanceGenerationService.generateInstances(
        input.eventId,
        input.daysAhead
      );

      return { count };
    }),

  // Regenerate all instances (admin/background job)
  regenerateAllInstances: publicProcedure
    .input(
      z.object({
        daysAhead: z.number().default(90),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Check admin permission

      const count = await InstanceGenerationService.regenerateAllInstances(
        input.daysAhead
      );

      return { count };
    }),
});
