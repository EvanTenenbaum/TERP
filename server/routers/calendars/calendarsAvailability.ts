import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  calendarAvailability,
  calendarBlockedDates,
  calendarUserAccess,
  calendarEvents,
  appointmentTypes,
  timeOffRequests,
} from "../../../drizzle/schema";
import { and, eq, gte, lte, isNull } from "drizzle-orm";

/**
 * Calendars Availability Router
 * CAL-002: Availability, blocked dates, and slot management
 * Extracted from calendarsManagement.ts for better maintainability
 */
export const calendarsAvailabilityRouter = router({
  // List availability rules for a calendar
  listAvailability: protectedProcedure
    .input(z.object({ calendarId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Access denied to this calendar");
      }

      const availability = await db
        .select()
        .from(calendarAvailability)
        .where(eq(calendarAvailability.calendarId, input.calendarId));

      return availability;
    }),

  // Set availability for a day of week
  setAvailability: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        dayOfWeek: z.number().min(0).max(6),
        slots: z.array(
          z.object({
            startTime: z.string().regex(/^\d{2}:\d{2}$/),
            endTime: z.string().regex(/^\d{2}:\d{2}$/),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check edit access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0 || access[0].accessLevel === "view") {
        throw new Error("Edit access required to update availability");
      }

      // Delete existing slots for this day
      await db
        .delete(calendarAvailability)
        .where(
          and(
            eq(calendarAvailability.calendarId, input.calendarId),
            eq(calendarAvailability.dayOfWeek, input.dayOfWeek)
          )
        );

      // Insert new slots
      if (input.slots.length > 0) {
        await db.insert(calendarAvailability).values(
          input.slots.map((slot) => ({
            calendarId: input.calendarId,
            dayOfWeek: input.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          }))
        );
      }

      return { success: true };
    }),

  // List blocked dates
  listBlockedDates: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Access denied to this calendar");
      }

      const conditions = [eq(calendarBlockedDates.calendarId, input.calendarId)];
      if (input.startDate) {
        conditions.push(gte(calendarBlockedDates.date, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(calendarBlockedDates.date, new Date(input.endDate)));
      }

      const blocked = await db
        .select()
        .from(calendarBlockedDates)
        .where(and(...conditions));

      return blocked;
    }),

  // Add a blocked date
  addBlockedDate: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        date: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check edit access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0 || access[0].accessLevel === "view") {
        throw new Error("Edit access required to add blocked dates");
      }

      const [blocked] = await db
        .insert(calendarBlockedDates)
        .values({
          calendarId: input.calendarId,
          date: new Date(input.date),
          reason: input.reason || null,
        })
        .$returningId();

      return { id: blocked.id };
    }),

  // Remove a blocked date
  removeBlockedDate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the blocked date
      const [blocked] = await db
        .select()
        .from(calendarBlockedDates)
        .where(eq(calendarBlockedDates.id, input.id))
        .limit(1);

      if (!blocked) {
        throw new Error("Blocked date not found");
      }

      // Check edit access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, blocked.calendarId),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0 || access[0].accessLevel === "view") {
        throw new Error("Edit access required to remove blocked dates");
      }

      await db
        .delete(calendarBlockedDates)
        .where(eq(calendarBlockedDates.id, input.id));

      return { success: true };
    }),

  // Get available slots for booking (CAL-002)
  getSlots: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        appointmentTypeId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        slotIntervalMinutes: z.number().min(5).max(60).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get appointment type
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

      // Get availability rules
      const availabilityRules = await db
        .select()
        .from(calendarAvailability)
        .where(eq(calendarAvailability.calendarId, input.calendarId));

      if (availabilityRules.length === 0) {
        return {};
      }

      // Get blocked dates
      const blockedDates = await db
        .select()
        .from(calendarBlockedDates)
        .where(
          and(
            eq(calendarBlockedDates.calendarId, input.calendarId),
            gte(calendarBlockedDates.date, new Date(input.startDate)),
            lte(calendarBlockedDates.date, new Date(input.endDate))
          )
        );

      const blockedDateSet = new Set(
        blockedDates.map((b) => b.date instanceof Date ? b.date.toISOString().split("T")[0] : String(b.date))
      );

      // Get existing events
      const existingEvents = await db
        .select({
          startDate: calendarEvents.startDate,
          startTime: calendarEvents.startTime,
          endDate: calendarEvents.endDate,
          endTime: calendarEvents.endTime,
        })
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.calendarId, input.calendarId),
            gte(calendarEvents.startDate, new Date(input.startDate)),
            lte(calendarEvents.endDate, new Date(input.endDate)),
            isNull(calendarEvents.deletedAt)
          )
        );

      // CAL-04-05: Get approved time-off to block availability
      const approvedTimeOff = await db
        .select({
          userId: timeOffRequests.userId,
          startDate: timeOffRequests.startDate,
          endDate: timeOffRequests.endDate,
          startTime: timeOffRequests.startTime,
          endTime: timeOffRequests.endTime,
          isFullDay: timeOffRequests.isFullDay,
        })
        .from(timeOffRequests)
        .where(
          and(
            eq(timeOffRequests.status, "approved"),
            lte(timeOffRequests.startDate, new Date(input.endDate)),
            gte(timeOffRequests.endDate, new Date(input.startDate))
          )
        );

      // Convert time-off to blocked time ranges per date
      const timeOffByDate: Map<string, Array<{ start: number; end: number }>> = new Map();
      for (const timeOff of approvedTimeOff) {
        const toStartDate = timeOff.startDate instanceof Date
          ? timeOff.startDate
          : new Date(timeOff.startDate);
        const toEndDate = timeOff.endDate instanceof Date
          ? timeOff.endDate
          : new Date(timeOff.endDate);

        for (let d = new Date(toStartDate); d <= toEndDate; d.setDate(d.getDate() + 1)) {
          const dStr = d.toISOString().split("T")[0];

          if (!timeOffByDate.has(dStr)) {
            timeOffByDate.set(dStr, []);
          }

          if (timeOff.isFullDay) {
            timeOffByDate.get(dStr)!.push({ start: 0, end: 1440 });
          } else if (timeOff.startTime && timeOff.endTime) {
            const [startHr, startMn] = timeOff.startTime.split(":").map(Number);
            const [endHr, endMn] = timeOff.endTime.split(":").map(Number);
            timeOffByDate.get(dStr)!.push({
              start: startHr * 60 + startMn,
              end: endHr * 60 + endMn,
            });
          }
        }
      }

      // Build availability map by day of week
      const availabilityByDay: Map<number, Array<{ start: string; end: string }>> = new Map();
      for (const rule of availabilityRules) {
        const day = rule.dayOfWeek;
        if (!availabilityByDay.has(day)) {
          availabilityByDay.set(day, []);
        }
        availabilityByDay.get(day)!.push({
          start: rule.startTime,
          end: rule.endTime,
        });
      }

      // Calculate minimum booking time
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + appointmentType.minNoticeHours * 60 * 60 * 1000);

      // Calculate maximum booking date
      const maxBookingDate = new Date(now);
      maxBookingDate.setDate(maxBookingDate.getDate() + appointmentType.maxAdvanceDays);

      // Total slot duration including buffers
      const totalDuration = appointmentType.bufferBefore + appointmentType.duration + appointmentType.bufferAfter;

      // Generate slots
      const slots: Record<string, string[]> = {};
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Limit query to max 3 months
      const maxEndDate = new Date(startDate);
      maxEndDate.setMonth(maxEndDate.getMonth() + 3);
      if (endDate > maxEndDate) {
        throw new Error("Date range cannot exceed 3 months");
      }

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split("T")[0];

        if (blockedDateSet.has(dateStr)) continue;
        if (date > maxBookingDate) continue;

        const dayOfWeek = date.getDay();
        const dayAvailability = availabilityByDay.get(dayOfWeek);

        if (!dayAvailability || dayAvailability.length === 0) continue;

        const daySlots: string[] = [];

        for (const window of dayAvailability) {
          const [startHour, startMinute] = window.start.split(":").map(Number);
          const [endHour, endMinute] = window.end.split(":").map(Number);

          const windowStartMinutes = startHour * 60 + startMinute;
          const windowEndMinutes = endHour * 60 + endMinute;

          for (
            let slotStart = windowStartMinutes;
            slotStart + totalDuration <= windowEndMinutes;
            slotStart += input.slotIntervalMinutes
          ) {
            const slotHour = Math.floor(slotStart / 60);
            const slotMinute = slotStart % 60;
            const slotTime = `${slotHour.toString().padStart(2, "0")}:${slotMinute.toString().padStart(2, "0")}`;

            const slotDateTime = new Date(date);
            slotDateTime.setHours(slotHour, slotMinute, 0, 0);

            if (slotDateTime < minBookingTime) continue;

            const slotEndMinutes = slotStart + totalDuration;
            let hasConflict = false;

            // Check event conflicts
            for (const event of existingEvents) {
              const eventDateStr = event.startDate instanceof Date
                ? event.startDate.toISOString().split("T")[0]
                : String(event.startDate);

              if (eventDateStr !== dateStr) continue;

              if (!event.startTime || !event.endTime) {
                hasConflict = true;
                break;
              }

              const [eventStartHour, eventStartMin] = event.startTime.split(":").map(Number);
              const [eventEndHour, eventEndMin] = event.endTime.split(":").map(Number);

              const eventStartMinutes = eventStartHour * 60 + eventStartMin;
              const eventEndMinutes = eventEndHour * 60 + eventEndMin;

              if (slotStart < eventEndMinutes && slotEndMinutes > eventStartMinutes) {
                hasConflict = true;
                break;
              }
            }

            // CAL-04-05: Check time-off conflicts
            if (!hasConflict) {
              const dateTimeOff = timeOffByDate.get(dateStr);
              if (dateTimeOff) {
                for (const block of dateTimeOff) {
                  if (slotStart < block.end && slotEndMinutes > block.start) {
                    hasConflict = true;
                    break;
                  }
                }
              }
            }

            if (!hasConflict) {
              daySlots.push(slotTime);
            }
          }
        }

        if (daySlots.length > 0) {
          slots[dateStr] = daySlots;
        }
      }

      return slots;
    }),
});
