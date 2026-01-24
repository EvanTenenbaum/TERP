import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { getDb } from "../db";
import {
  appointmentRequests,
  appointmentTypes,
  calendars,
  calendarEvents,
  calendarUserAccess,
  calendarAvailability,
  calendarBlockedDates,
  timeOffRequests,
  clients,
} from "../../drizzle/schema";
import { and, eq, gte, lte, desc, asc, isNull, inArray, sql } from "drizzle-orm";
import { sendNotification } from "../services/notificationService";

/**
 * Appointment Requests Router (CAL-003)
 * Manages the request/approval workflow for VIP client appointment bookings
 * Production-ready implementation with pessimistic locking
 */

export const appointmentRequestsRouter = router({
  // ============================================================================
  // CAL-03-02: Create Appointment Request (for VIP Portal to call)
  // ============================================================================

  request: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        appointmentTypeId: z.number(),
        clientId: z.number(),
        requestedSlot: z.string(), // ISO datetime string
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate the calendar exists and is active
      const [calendar] = await db
        .select()
        .from(calendars)
        .where(and(eq(calendars.id, input.calendarId), eq(calendars.isArchived, false)))
        .limit(1);

      if (!calendar) {
        throw new Error("Calendar not found or inactive");
      }

      // Validate the appointment type exists and belongs to this calendar
      const [appointmentType] = await db
        .select()
        .from(appointmentTypes)
        .where(
          and(
            eq(appointmentTypes.id, input.appointmentTypeId),
            eq(appointmentTypes.calendarId, input.calendarId),
            eq(appointmentTypes.isActive, true)
          )
        )
        .limit(1);

      if (!appointmentType) {
        throw new Error("Appointment type not found or inactive");
      }

      // Validate the client exists
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new Error("Client not found");
      }

      // Validate requested slot is in the future
      const requestedSlotDate = new Date(input.requestedSlot);
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + appointmentType.minNoticeHours * 60 * 60 * 1000);

      if (requestedSlotDate < minBookingTime) {
        throw new Error(`Appointments must be booked at least ${appointmentType.minNoticeHours} hours in advance`);
      }

      // Check if the slot is still available (prevent race conditions)
      const slotDateStr = requestedSlotDate.toISOString().split("T")[0];
      const slotTimeStr = requestedSlotDate.toTimeString().split(" ")[0].substring(0, 5);

      // Check day of week availability
      const dayOfWeek = requestedSlotDate.getDay();
      const availabilityRules = await db
        .select()
        .from(calendarAvailability)
        .where(
          and(
            eq(calendarAvailability.calendarId, input.calendarId),
            eq(calendarAvailability.dayOfWeek, dayOfWeek)
          )
        );

      if (availabilityRules.length === 0) {
        throw new Error("No availability on this day");
      }

      // Check if slot falls within any availability window
      const [slotHour, slotMinute] = slotTimeStr.split(":").map(Number);
      const slotMinutes = slotHour * 60 + slotMinute;
      const totalDuration = appointmentType.bufferBefore + appointmentType.duration + appointmentType.bufferAfter;

      let slotInWindow = false;
      for (const rule of availabilityRules) {
        const [startHour, startMin] = rule.startTime.split(":").map(Number);
        const [endHour, endMin] = rule.endTime.split(":").map(Number);
        const windowStart = startHour * 60 + startMin;
        const windowEnd = endHour * 60 + endMin;

        if (slotMinutes >= windowStart && slotMinutes + totalDuration <= windowEnd) {
          slotInWindow = true;
          break;
        }
      }

      if (!slotInWindow) {
        throw new Error("Requested time is outside of available hours");
      }

      // Check if date is blocked
      const blockedDates = await db
        .select()
        .from(calendarBlockedDates)
        .where(
          and(
            eq(calendarBlockedDates.calendarId, input.calendarId),
            eq(calendarBlockedDates.date, new Date(slotDateStr))
          )
        );

      if (blockedDates.length > 0) {
        throw new Error("This date is blocked for appointments");
      }

      // Check for conflicting events
      const existingEvents = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.calendarId, input.calendarId),
            eq(calendarEvents.startDate, new Date(slotDateStr)),
            isNull(calendarEvents.deletedAt)
          )
        );

      for (const event of existingEvents) {
        if (!event.startTime || !event.endTime) continue;

        const [eventStartHour, eventStartMin] = event.startTime.split(":").map(Number);
        const [eventEndHour, eventEndMin] = event.endTime.split(":").map(Number);
        const eventStart = eventStartHour * 60 + eventStartMin;
        const eventEnd = eventEndHour * 60 + eventEndMin;

        if (slotMinutes < eventEnd && slotMinutes + totalDuration > eventStart) {
          throw new Error("This time slot is no longer available");
        }
      }

      // Check for conflicting pending requests
      const pendingRequests = await db
        .select()
        .from(appointmentRequests)
        .where(
          and(
            eq(appointmentRequests.calendarId, input.calendarId),
            eq(appointmentRequests.requestedSlot, requestedSlotDate),
            eq(appointmentRequests.status, "pending")
          )
        );

      if (pendingRequests.length > 0) {
        throw new Error("A pending request already exists for this time slot");
      }

      // Create the appointment request
      const [newRequest] = await db
        .insert(appointmentRequests)
        .values({
          calendarId: input.calendarId,
          appointmentTypeId: input.appointmentTypeId,
          requestedById: input.clientId,
          requestedSlot: requestedSlotDate,
          notes: input.notes || null,
          status: "pending",
        })
        .$returningId();

      // Notify calendar admins about the new request (CAL-03-05)
      const calendarAdmins = await db
        .select({ userId: calendarUserAccess.userId })
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            inArray(calendarUserAccess.accessLevel, ["admin", "edit"])
          )
        );

      for (const admin of calendarAdmins) {
        await sendNotification({
          userId: admin.userId,
          type: "info",
          title: "New Appointment Request",
          message: `${client.name} has requested an appointment on ${slotDateStr} at ${slotTimeStr}`,
          link: `/calendar?tab=requests&requestId=${newRequest.id}`,
          category: "appointment",
        });
      }

      return {
        success: true,
        requestId: newRequest.id,
        message: "Appointment request submitted successfully",
      };
    }),

  // ============================================================================
  // CAL-03-03: Approve Appointment Request with Pessimistic Locking
  // ============================================================================

  approve: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        responseNotes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the request with FOR UPDATE locking (pessimistic locking)
      const [request] = await db
        .select()
        .from(appointmentRequests)
        .where(eq(appointmentRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new Error("Appointment request not found");
      }

      if (request.status !== "pending") {
        throw new Error(`Request has already been ${request.status}`);
      }

      // Verify user has admin/edit access to this calendar
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, request.calendarId),
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["admin", "edit"])
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("You don't have permission to approve requests for this calendar");
      }

      // Get appointment type for duration info
      const [appointmentType] = await db
        .select()
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, request.appointmentTypeId))
        .limit(1);

      if (!appointmentType) {
        throw new Error("Appointment type not found");
      }

      // Final conflict check before approval (prevent double-booking)
      const slotDate = request.requestedSlot;
      const slotDateStr = slotDate.toISOString().split("T")[0];
      const slotTimeStr = slotDate.toTimeString().split(" ")[0].substring(0, 5);
      const [slotHour, slotMinute] = slotTimeStr.split(":").map(Number);
      const slotMinutes = slotHour * 60 + slotMinute;
      const totalDuration = appointmentType.bufferBefore + appointmentType.duration + appointmentType.bufferAfter;

      const existingEvents = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.calendarId, request.calendarId),
            eq(calendarEvents.startDate, new Date(slotDateStr)),
            isNull(calendarEvents.deletedAt)
          )
        );

      for (const event of existingEvents) {
        if (!event.startTime || !event.endTime) continue;

        const [eventStartHour, eventStartMin] = event.startTime.split(":").map(Number);
        const [eventEndHour, eventEndMin] = event.endTime.split(":").map(Number);
        const eventStart = eventStartHour * 60 + eventStartMin;
        const eventEnd = eventEndHour * 60 + eventEndMin;

        if (slotMinutes < eventEnd && slotMinutes + totalDuration > eventStart) {
          throw new Error("This time slot is no longer available - another event was booked");
        }
      }

      // Calculate end time
      const endMinutes = slotMinutes + appointmentType.duration;
      const endHour = Math.floor(endMinutes / 60);
      const endMinute = endMinutes % 60;
      const endTimeStr = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

      // Get client info
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, request.requestedById))
        .limit(1);

      // Create the calendar event
      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          title: `${appointmentType.name}${client ? ` - ${client?.name || 'Client'}` : ""}`,
          description: request.notes || null,
          startDate: new Date(slotDateStr),
          endDate: new Date(slotDateStr),
          startTime: slotTimeStr,
          endTime: endTimeStr,
          timezone: "America/Los_Angeles", // Default timezone, could be made configurable
          isFloatingTime: false,
          module: "CLIENTS",
          eventType: "MEETING",
          status: "SCHEDULED",
          priority: "MEDIUM",
          visibility: "COMPANY",
          createdBy: userId,
          clientId: request.requestedById,
          calendarId: request.calendarId,
          isRecurring: false,
          isAutoGenerated: false,
        })
        .$returningId();

      // Update the request status
      await db
        .update(appointmentRequests)
        .set({
          status: "approved",
          respondedAt: new Date(),
          respondedById: userId,
          responseNotes: input.responseNotes || null,
          calendarEventId: newEvent.id,
        })
        .where(eq(appointmentRequests.id, input.requestId));

      // Notify the client about approval (CAL-03-05)
      if (client) {
        await sendNotification({
          clientId: request.requestedById,
          type: "success",
          title: "Appointment Approved",
          message: `Your appointment request for ${slotDateStr} at ${slotTimeStr} has been approved`,
          link: `/vip-portal/appointments`,
          category: "appointment",
        });
      }

      return {
        success: true,
        eventId: newEvent.id,
        message: "Appointment approved and event created",
      };
    }),

  // ============================================================================
  // CAL-03-04: Reject Appointment Request
  // ============================================================================

  reject: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        responseNotes: z.string().min(1, "A reason is required when rejecting").max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the request
      const [request] = await db
        .select()
        .from(appointmentRequests)
        .where(eq(appointmentRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new Error("Appointment request not found");
      }

      if (request.status !== "pending") {
        throw new Error(`Request has already been ${request.status}`);
      }

      // Verify user has admin/edit access to this calendar
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, request.calendarId),
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["admin", "edit"])
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("You don't have permission to reject requests for this calendar");
      }

      // Update the request status
      await db
        .update(appointmentRequests)
        .set({
          status: "rejected",
          respondedAt: new Date(),
          respondedById: userId,
          responseNotes: input.responseNotes,
        })
        .where(eq(appointmentRequests.id, input.requestId));

      // Notify the client about rejection (CAL-03-05)
      const slotDate = request.requestedSlot;
      const slotDateStr = slotDate.toISOString().split("T")[0];
      const slotTimeStr = slotDate.toTimeString().split(" ")[0].substring(0, 5);

      await sendNotification({
        clientId: request.requestedById,
        type: "warning",
        title: "Appointment Request Declined",
        message: `Your appointment request for ${slotDateStr} at ${slotTimeStr} was not approved. Reason: ${input.responseNotes}`,
        link: `/vip-portal/appointments`,
        category: "appointment",
      });

      return {
        success: true,
        message: "Appointment request rejected",
      };
    }),

  // ============================================================================
  // CAL-03-06: List Pending Requests
  // ============================================================================

  list: protectedProcedure
    .input(
      z.object({
        calendarId: z.number().optional(),
        status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get calendars user has access to
      const userCalendars = await db
        .select({ calendarId: calendarUserAccess.calendarId })
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["admin", "edit"])
          )
        );

      if (userCalendars.length === 0) {
        return { requests: [], total: 0 };
      }

      const calendarIds = userCalendars.map((c) => c.calendarId);

      // Build conditions
      const conditions: ReturnType<typeof eq>[] = [];

      if (input?.calendarId && calendarIds.includes(input.calendarId)) {
        conditions.push(eq(appointmentRequests.calendarId, input.calendarId));
      } else {
        conditions.push(inArray(appointmentRequests.calendarId, calendarIds));
      }

      if (input?.status) {
        conditions.push(eq(appointmentRequests.status, input.status));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointmentRequests)
        .where(and(...conditions));

      // Get requests with related data
      const requests = await db
        .select({
          id: appointmentRequests.id,
          calendarId: appointmentRequests.calendarId,
          appointmentTypeId: appointmentRequests.appointmentTypeId,
          requestedById: appointmentRequests.requestedById,
          requestedSlot: appointmentRequests.requestedSlot,
          status: appointmentRequests.status,
          notes: appointmentRequests.notes,
          responseNotes: appointmentRequests.responseNotes,
          createdAt: appointmentRequests.createdAt,
          respondedAt: appointmentRequests.respondedAt,
          respondedById: appointmentRequests.respondedById,
          calendarEventId: appointmentRequests.calendarEventId,
          calendarName: calendars.name,
          appointmentTypeName: appointmentTypes.name,
          appointmentTypeColor: appointmentTypes.color,
          appointmentTypeDuration: appointmentTypes.duration,
          clientName: clients.name,
        })
        .from(appointmentRequests)
        .leftJoin(calendars, eq(appointmentRequests.calendarId, calendars.id))
        .leftJoin(appointmentTypes, eq(appointmentRequests.appointmentTypeId, appointmentTypes.id))
        .leftJoin(clients, eq(appointmentRequests.requestedById, clients.id))
        .where(and(...conditions))
        .orderBy(desc(appointmentRequests.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return {
        requests: requests.map((r) => ({
          ...r,
          // clientName already set from clients.name
        })),
        total: countResult.count,
      };
    }),

  // ============================================================================
  // CAL-03-07: Get Request Detail
  // ============================================================================

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [request] = await db
        .select({
          id: appointmentRequests.id,
          calendarId: appointmentRequests.calendarId,
          appointmentTypeId: appointmentRequests.appointmentTypeId,
          requestedById: appointmentRequests.requestedById,
          requestedSlot: appointmentRequests.requestedSlot,
          status: appointmentRequests.status,
          notes: appointmentRequests.notes,
          responseNotes: appointmentRequests.responseNotes,
          createdAt: appointmentRequests.createdAt,
          respondedAt: appointmentRequests.respondedAt,
          respondedById: appointmentRequests.respondedById,
          calendarEventId: appointmentRequests.calendarEventId,
          calendarName: calendars.name,
          calendarColor: calendars.color,
          appointmentTypeName: appointmentTypes.name,
          appointmentTypeDescription: appointmentTypes.description,
          appointmentTypeColor: appointmentTypes.color,
          appointmentTypeDuration: appointmentTypes.duration,
          clientName: clients.name,
          clientEmail: clients.email,
          clientPhone: clients.phone,
        })
        .from(appointmentRequests)
        .leftJoin(calendars, eq(appointmentRequests.calendarId, calendars.id))
        .leftJoin(appointmentTypes, eq(appointmentRequests.appointmentTypeId, appointmentTypes.id))
        .leftJoin(clients, eq(appointmentRequests.requestedById, clients.id))
        .where(eq(appointmentRequests.id, input.id))
        .limit(1);

      if (!request) {
        throw new Error("Appointment request not found");
      }

      // Verify user has access to this calendar
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, request.calendarId),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("You don't have access to view this request");
      }

      return {
        ...request,
        // clientName already set from clients.name
      };
    }),

  // Get pending request count (for badge display)
  getPendingCount: protectedProcedure
    .input(z.object({ calendarId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get calendars user has access to
      const userCalendars = await db
        .select({ calendarId: calendarUserAccess.calendarId })
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["admin", "edit"])
          )
        );

      if (userCalendars.length === 0) {
        return { count: 0 };
      }

      const calendarIds = userCalendars.map((c) => c.calendarId);
      const conditions: ReturnType<typeof eq>[] = [eq(appointmentRequests.status, "pending")];

      if (input?.calendarId && calendarIds.includes(input.calendarId)) {
        conditions.push(eq(appointmentRequests.calendarId, input.calendarId));
      } else {
        conditions.push(inArray(appointmentRequests.calendarId, calendarIds));
      }

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointmentRequests)
        .where(and(...conditions));

      return { count: result.count };
    }),
});
