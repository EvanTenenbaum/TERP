import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import * as calendarDb from "../calendarDb";
import PermissionService from "../_core/permissionService";
import { requirePermission } from "../_core/permissionMiddleware";
import { calendarLogger } from "../_core/logger";
import { idSchema } from "../_core/validationSchemas";

/**
 * Calendar Participants Router
 * Participant management for calendar events
 * Version 2.1 - QUAL-002 Validation Improvements
 * PRODUCTION-READY - No placeholders
 */

// Participant role enum for type safety
const participantRoleSchema = z.enum(["ORGANIZER", "REQUIRED", "OPTIONAL", "OBSERVER"]);

// Response status enum for type safety
const responseStatusSchema = z.enum(["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"]);

export const calendarParticipantsRouter = router({
  // Get participants for an event
  getParticipants: protectedProcedure
    .input(z.object({ eventId: idSchema }))
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Check permission to view event
      const hasPermission = await PermissionService.hasPermission(
        userId,
        input.eventId,
        "VIEW"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      return await calendarDb.getEventParticipants(input.eventId);
    }),

  // Add participant to event
  addParticipant: protectedProcedure
    .input(
      z.object({
        eventId: idSchema,
        userId: idSchema,
        role: participantRoleSchema.default("REQUIRED"),
        notifyOnCreation: z.boolean().default(true),
        notifyOnUpdate: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const currentUserId = getAuthenticatedUserId(ctx);

      // Check permission to edit event
      const hasPermission = await PermissionService.hasPermission(
        currentUserId,
        input.eventId,
        "EDIT"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Add participant
      const participant = await calendarDb.addParticipant({
        eventId: input.eventId,
        userId: input.userId,
        role: input.role,
        responseStatus: "PENDING",
        notifyOnCreation: input.notifyOnCreation,
        notifyOnUpdate: input.notifyOnUpdate,
        addedBy: currentUserId,
      });

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: currentUserId,
        changeType: "UPDATED",
        fieldChanged: "participants",
        previousValue: null,
        newValue: `Added participant: User ${input.userId} as ${input.role}`,
        changeReason: null,
      });

      // Send notification if requested
      if (input.notifyOnCreation) {
        // Get event details for notification
        const event = await calendarDb.getEventById(input.eventId);
        if (event) {
          const { sendNotification } = await import("../services/notificationService");
          await sendNotification({
            userId: input.userId,
            type: "info",
            title: "Calendar Invitation",
            message: `You've been invited to "${event.title}" on ${new Date(event.startDate).toLocaleDateString()}`,
            metadata: {
              eventId: input.eventId,
              type: "calendar_invitation",
              startTime: event.startDate.toISOString(),
              role: input.role,
            },
            category: "appointment",
          });
        }
        
        calendarLogger.operationSuccess("addParticipant", {
          userId: input.userId,
          eventId: input.eventId,
          role: input.role,
          notificationSent: true,
        });
      }

      return participant;
    }),

  // Update participant response (RSVP)
  updateResponse: protectedProcedure
    .input(
      z.object({
        eventId: idSchema,
        responseStatus: responseStatusSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      // Update response
      await calendarDb.updateParticipantResponse(
        input.eventId,
        userId,
        input.responseStatus
      );

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: userId,
        changeType: "UPDATED",
        fieldChanged: "participant_response",
        previousValue: null,
        newValue: `User ${userId} responded: ${input.responseStatus}`,
        changeReason: null,
      });

      return { success: true };
    }),

  // Remove participant from event
  removeParticipant: protectedProcedure
    .input(
      z.object({
        eventId: idSchema,
        userId: idSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const currentUserId = getAuthenticatedUserId(ctx);

      // Check permission to edit event
      const hasPermission = await PermissionService.hasPermission(
        currentUserId,
        input.eventId,
        "EDIT"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Remove participant
      await calendarDb.removeParticipant(input.eventId, input.userId);

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: currentUserId,
        changeType: "UPDATED",
        fieldChanged: "participants",
        previousValue: null,
        newValue: `Removed participant: User ${input.userId}`,
        changeReason: null,
      });

      return { success: true };
    }),

  // Bulk add participants
  addParticipants: protectedProcedure
    .input(
      z.object({
        eventId: idSchema,
        userIds: z.array(idSchema).min(1, "At least one user ID is required").max(100, "Cannot add more than 100 participants at once"),
        role: participantRoleSchema.default("REQUIRED"),
        notifyOnCreation: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const currentUserId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        currentUserId,
        input.eventId,
        "EDIT"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Add all participants
      const participants = await Promise.all(
        input.userIds.map((userId) =>
          calendarDb.addParticipant({
            eventId: input.eventId,
            userId,
            role: input.role,
            responseStatus: "PENDING",
            notifyOnCreation: input.notifyOnCreation,
            notifyOnUpdate: true,
            addedBy: currentUserId,
          })
        )
      );

      // Log to event history
      await calendarDb.addHistoryEntry({
        eventId: input.eventId,
        changedBy: currentUserId,
        changeType: "UPDATED",
        fieldChanged: "participants",
        previousValue: null,
        newValue: `Added ${input.userIds.length} participants as ${input.role}`,
        changeReason: null,
      });

      return participants;
    }),
});
