import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as calendarDb from "../calendarDb";

/**
 * Calendar Participants Router
 * Participant management for calendar events
 * Version 2.0 - Post-Adversarial QA
 */

export const calendarParticipantsRouter = router({
  // Get participants for an event
  getParticipants: publicProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      return await calendarDb.getEventParticipants(input.eventId);
    }),

  // Add participant to event
  addParticipant: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        userId: z.number(),
        role: z
          .enum(["ORGANIZER", "REQUIRED", "OPTIONAL", "OBSERVER"])
          .default("REQUIRED"),
        notifyOnCreation: z.boolean().default(true),
        notifyOnUpdate: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Check user has EDIT permission on event
      // TODO: Validate user exists
      // TODO: Send notification if requested

      return await calendarDb.addParticipant({
        eventId: input.eventId,
        userId: input.userId,
        role: input.role,
        responseStatus: "PENDING",
        notifyOnCreation: input.notifyOnCreation,
        notifyOnUpdate: input.notifyOnUpdate,
        addedBy: ctx.user?.id || 1,
      });
    }),

  // Update participant response (RSVP)
  updateResponse: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        responseStatus: z.enum(["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Get userId from context
      const userId = ctx.user?.id || 1;

      return await calendarDb.updateParticipantResponse(
        input.eventId,
        userId,
        input.responseStatus
      );
    }),

  // Remove participant from event
  removeParticipant: publicProcedure
    .input(
      z.object({
        eventId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Check user has EDIT permission on event
      // TODO: Send notification

      return await calendarDb.removeParticipant(input.eventId, input.userId);
    }),
});
